import { parseStringPromise } from 'xml2js';

export interface ParsedNote {
  title: string;
  content: string;
  created: number;
  updated: number;
  tags: string[];
  resources: Resource[];
  author?: string;
  sourceUrl?: string;
  latitude?: number;
  longitude?: number;
  altitude?: number;
}

export interface Resource {
  data: Buffer;
  mime: string;
  hash?: string;
  filename?: string;
  width?: number;
  height?: number;
}

export interface ParsedEnex {
  notes: ParsedNote[];
  exportDate?: string;
  application?: string;
  version?: string;
}

/**
 * Parse ENEX XML content and extract notes with resources
 */
export async function parseEnexFile(
  enexContent: string,
  notebookName?: string
): Promise<ParsedEnex> {
  try {
    const parsed = await parseStringPromise(enexContent, {
      explicitArray: false,
      mergeAttrs: true,
      charkey: 'value',
    });

    const enExport = parsed['en-export'];
    if (!enExport) {
      throw new Error('Invalid ENEX file: missing en-export root element');
    }

    const notes: ParsedNote[] = [];
    const noteElements = Array.isArray(enExport.note) ? enExport.note : [enExport.note];

    for (const noteEl of noteElements) {
      if (!noteEl) continue;

      const note = parseNote(noteEl);
      if (note) {
        notes.push(note);
      }
    }

    return {
      notes,
      exportDate: enExport['export-date'],
      application: enExport.application,
      version: enExport.version,
    };
  } catch (error) {
    throw new Error(
      `Failed to parse ENEX file: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Parse individual note element
 */
function parseNote(noteEl: any): ParsedNote | null {
  try {
    const title = noteEl.title?.value || noteEl.title || 'Untitled';
    const content = noteEl.content?.value || noteEl.content || '';
    const created = parseTimestamp(noteEl.created);
    const updated = parseTimestamp(noteEl.updated);

    // Parse tags
    const tags: string[] = [];
    const tagElements = Array.isArray(noteEl.tag) ? noteEl.tag : noteEl.tag ? [noteEl.tag] : [];
    for (const tag of tagElements) {
      const tagValue = tag?.value || tag;
      if (tagValue && typeof tagValue === 'string') {
        tags.push(tagValue);
      }
    }

    // Parse resources (attachments)
    const resources: Resource[] = [];
    const resourceElements = Array.isArray(noteEl.resource)
      ? noteEl.resource
      : noteEl.resource
        ? [noteEl.resource]
        : [];

    for (const resource of resourceElements) {
      const parsed = parseResource(resource);
      if (parsed) {
        resources.push(parsed);
      }
    }

    // Parse note attributes
    const attrs = noteEl['note-attributes'] || {};
    const author = attrs.author?.value || attrs.author;
    const sourceUrl = attrs['source-url']?.value || attrs['source-url'];
    const latitude = attrs.latitude ? parseFloat(attrs.latitude) : undefined;
    const longitude = attrs.longitude ? parseFloat(attrs.longitude) : undefined;
    const altitude = attrs.altitude ? parseFloat(attrs.altitude) : undefined;

    return {
      title: String(title),
      content: String(content),
      created,
      updated,
      tags,
      resources,
      ...(author && { author: String(author) }),
      ...(sourceUrl && { sourceUrl: String(sourceUrl) }),
      ...(latitude && { latitude }),
      ...(longitude && { longitude }),
      ...(altitude && { altitude }),
    };
  } catch (error) {
    console.error('Failed to parse note:', error);
    return null;
  }
}

/**
 * Parse resource (attachment) element
 */
function parseResource(resourceEl: any): Resource | null {
  try {
    const dataEl = resourceEl.data;
    if (!dataEl) return null;

    const base64Data = dataEl.value || dataEl;
    if (!base64Data) return null;

    const buffer = Buffer.from(String(base64Data), 'base64');
    const mime = resourceEl.mime?.value || resourceEl.mime || 'application/octet-stream';
    const hash = resourceEl['resource-attributes']?.['file-name'] || resourceEl.hash;

    const attrs = resourceEl['resource-attributes'] || {};
    const filename = attrs['file-name']?.value || attrs['file-name'];
    const width = attrs.width ? parseInt(attrs.width) : undefined;
    const height = attrs.height ? parseInt(attrs.height) : undefined;

    return {
      data: buffer,
      mime: String(mime),
      hash: hash ? String(hash) : undefined,
      filename: filename ? String(filename) : undefined,
      width,
      height,
    };
  } catch (error) {
    console.error('Failed to parse resource:', error);
    return null;
  }
}

/**
 * Parse timestamp from ENEX format (Unix epoch in milliseconds)
 */
function parseTimestamp(timestamp: any): number {
  if (!timestamp) return Date.now();

  const value = timestamp?.value || timestamp;
  if (typeof value === 'number') return value;

  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? Date.now() : parsed;
}

/**
 * Extract notebook and stack information from filename
 * Supports Stack@@@Notebook.enex format
 */
export function extractNotebookInfo(filename: string): { stack?: string; notebook: string } {
  const nameWithoutExt = filename.replace(/\.enex$/i, '');

  if (nameWithoutExt.includes('@@@')) {
    const [stack, notebook] = nameWithoutExt.split('@@@');
    return {
      stack: sanitizeFileName(stack),
      notebook: sanitizeFileName(notebook),
    };
  }

  return {
    notebook: sanitizeFileName(nameWithoutExt),
  };
}

/**
 * Sanitize filename to be filesystem-safe
 */
export function sanitizeFileName(filename: string): string {
  return filename
    .replace(/[<>:"|?*\\/]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 255);
}

/**
 * Calculate MD5 hash of buffer for deduplication
 */
export function calculateHash(buffer: Buffer): string {
  const crypto = require('crypto');
  return crypto.createHash('md5').update(buffer).digest('hex');
}
