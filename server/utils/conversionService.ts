import archiver from "archiver";
import crypto from "crypto";
import { createReadStream, createWriteStream } from "fs";
import { mkdir, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { parseEnexFile, extractNotebookInfo, sanitizeFileName } from "./enexParser.js";
import { enmlToMarkdown, generateFrontmatter } from "./enmlToMarkdown.js";
import { STORAGE_DIR } from "./storage";

export interface ConversionResult {
  totalNotes: number;
  totalAttachments: number;
  errors: { type: string; message: string; noteTitle?: string }[];
  zipUrl: string;
  zipKey: string;
}

export async function convertEnexToObsidian(
  enexContent: string,
  enexFilename: string
): Promise<ConversionResult> {
  const errors: { type: string; message: string; noteTitle?: string }[] = [];
  const notes: { path: string; content: string }[] = [];
  const attachments: { path: string; buffer: Buffer }[] = [];
  let attachmentCount = 0;
  const seenHashes = new Set<string>();

  const { notes: parsedNotes } = await parseEnexFile(
    enexContent,
    extractNotebookInfo(enexFilename).notebook
  );

  const { stack, notebook } = extractNotebookInfo(enexFilename);
  const notebookPath = stack ? `${stack}/${notebook}` : notebook;

  for (const note of parsedNotes) {
    try {
      const markdown = enmlToMarkdown(note.content);
      const frontmatter = generateFrontmatter(
        note.title,
        note.tags,
        note.created,
        note.updated,
        {
          ...(note.author && { author: note.author }),
          ...(note.sourceUrl && { sourceUrl: note.sourceUrl }),
          ...(note.latitude &&
            note.longitude && {
              location: {
                latitude: note.latitude,
                longitude: note.longitude,
                ...(note.altitude && { altitude: note.altitude }),
              },
            }),
        }
      );

      notes.push({
        path: `${notebookPath}/${sanitizeFileName(note.title)}.md`,
        content: frontmatter + markdown,
      });

      for (const resource of note.resources) {
        try {
          const hash = crypto.createHash("md5").update(resource.data).digest("hex");
          if (seenHashes.has(hash)) continue;
          seenHashes.add(hash);

          const ext = getExtensionFromMime(resource.mime);
          const filename = resource.filename || `attachment_${hash.substring(0, 8)}.${ext}`;
          attachments.push({
            path: `${notebookPath}/_resources/${sanitizeFileName(filename)}`,
            buffer: resource.data,
          });
          attachmentCount++;
        } catch (err) {
          errors.push({
            type: "attachment_error",
            message: `Failed to process attachment: ${(err as Error).message}`,
            noteTitle: note.title,
          });
        }
      }
    } catch (err) {
      errors.push({
        type: "note_conversion_error",
        message: `Failed to convert note: ${(err as Error).message}`,
        noteTitle: note.title,
      });
    }
  }

  const zipKey = await createZip(notes, attachments);
  return {
    totalNotes: notes.length,
    totalAttachments: attachmentCount,
    errors,
    zipUrl: `/storage/${zipKey}`,
    zipKey,
  };
}

async function createZip(
  notes: { path: string; content: string }[],
  attachments: { path: string; buffer: Buffer }[]
): Promise<string> {
  const tempDir = path.join(tmpdir(), `evernote-convert-${Date.now()}`);
  const zipPath = path.join(tempDir, "conversion.zip");
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const key = `conversions/${hash}.zip`;

  await mkdir(tempDir, { recursive: true });

  const output = createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  await new Promise<void>((resolve, reject) => {
    archive.on("error", reject);
    output.on("error", reject);
    output.on("close", () => setTimeout(resolve, 50));
    archive.pipe(output);
    for (const note of notes) archive.append(note.content, { name: note.path });
    for (const att of attachments) archive.append(att.buffer, { name: att.path });
    archive.finalize();
  });

  await new Promise((r) => setTimeout(r, 100));

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    createReadStream(zipPath)
      .on("data", (chunk: any) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
      .on("end", resolve)
      .on("error", reject);
  });

  await mkdir(path.join(STORAGE_DIR, "conversions"), { recursive: true });
  await writeFile(path.join(STORAGE_DIR, key), Buffer.concat(chunks));

  try {
    await rm(tempDir, { recursive: true, force: true });
  } catch (_) {}

  return key;
}

function getExtensionFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "application/pdf": "pdf",
    "text/plain": "txt",
    "text/html": "html",
    "application/json": "json",
    "application/zip": "zip",
    "application/x-zip-compressed": "zip",
  };
  return map[mime] || "bin";
}