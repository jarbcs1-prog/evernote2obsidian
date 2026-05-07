import { parseEnex, EnexNotebook, EnexNote, EnexResource } from './enex-parser.js';

function cleanContent(html: string, noteHash: string): string {
  if (!html) return '';
  
  let text = html;
  
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<p[^>]*>/gi, '\n');
  text = text.replace(/<\/p>/gi, '');
  text = text.replace(/<div[^>]*>/gi, '\n');
  text = text.replace(/<\/div>/gi, '');
  text = text.replace(/<li[^>]*>/gi, '\n- ');
  text = text.replace(/<\/li>/gi, '');
  text = text.replace(/<ul[^>]*>/gi, '\n');
  text = text.replace(/<\/ul>/gi, '');
  text = text.replace(/<ol[^>]*>/gi, '\n');
  text = text.replace(/<\/ol>/gi, '');
  text = text.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n## $1\n');
  text = text.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  text = text.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  text = text.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  text = text.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  text = text.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, `![$2](attachments/${noteHash}_$2)`);
  text = text.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, `![](attachments/${noteHash}_image)`);
  text = text.replace(/<en-media[^>]*type="([^"]*)"[^>]*hash="([^"]*)"[^>]*\/>/gi, (match, mimeType, hash) => {
    const ext = getExtensionFromMime(mimeType);
    return `[](attachments/${noteHash}_${hash}.${ext})`;
  });
  text = text.replace(/<hr\s*\/?>/gi, '\n---\n');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  
  text = text.replace(/\n\s*\n/g, '\n\n');
  text = text.replace(/^[ \t]+/gm, '');
  text = text.trim();
  
  return text;
}

function getExtensionFromMime(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'text/plain': 'txt',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'video/mp4': 'mp4',
  };
  return mimeMap[mimeType] || 'bin';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  } catch {
    return dateStr;
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '-').trim();
}

function createFrontmatter(note: EnexNote): string {
  const lines = ['---'];
  lines.push(`title: "${note.title.replace(/"/g, '\\"')}"`);
  lines.push(`created: ${formatDate(note.created)}`);
  lines.push(`updated: ${formatDate(note.updated)}`);
  
  if (note.tags.length > 0) {
    lines.push(`tags:`);
    for (const tag of note.tags) {
      lines.push(`  - "${tag}"`);
    }
  }
  
  lines.push('---');
  return lines.join('\n');
}

function convertNoteToMarkdown(note: EnexNote, noteHash: string): string {
  const frontmatter = createFrontmatter(note);
  const content = cleanContent(note.content, noteHash);
  return `${frontmatter}\n\n${content}`;
}

export interface ConvertResult {
  success: boolean;
  notebooks: {
    name: string;
    files: { filename: string; content: string }[];
    attachments: { filename: string; data: string }[];
  }[];
  totalNotes: number;
}

export async function convertEnexToObsidian(enexXml: string): Promise<ConvertResult> {
  const notebooks = await parseEnex(enexXml);
  
  const result: ConvertResult = {
    success: true,
    notebooks: [],
    totalNotes: 0,
  };

  for (const notebook of notebooks) {
    const folderName = sanitizeFilename(notebook.name);
    
    const allFiles: { filename: string; content: string }[] = [];
    const allAttachments: { filename: string; data: string }[] = [];

    for (const note of notebook.notes) {
      const noteHash = Math.random().toString(36).substr(2, 9);
      const mdFilename = `${sanitizeFilename(note.title)}.md`;
      const content = convertNoteToMarkdown(note, noteHash);
      allFiles.push({ filename: mdFilename, content });

      for (let i = 0; i < note.resources.length; i++) {
        const res = note.resources[i];
        const ext = getExtensionFromMime(res.mimeType);
        const attachmentFilename = `${noteHash}_${i}.${ext}`;
        allAttachments.push({
          filename: attachmentFilename,
          data: res.data,
        });
      }
    }

    result.notebooks.push({
      name: folderName,
      files: allFiles,
      attachments: allAttachments,
    });
    result.totalNotes += notebook.notes.length;
  }

  return result;
}