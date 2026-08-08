/**
 * Convert ENML (Evernote Markup Language) to GitHub-flavored Markdown
 */
export function enmlToMarkdown(enmlContent: string): string {
  try {
    // Remove CDATA wrappers if present
    let content = enmlContent.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');

    // Wrap in a root element if needed
    if (!content.trim().startsWith('<')) {
      content = `<div>${content}</div>`;
    }

    // Convert HTML-like ENML to Markdown
    let markdown = convertEnmlToMarkdown(content);

    // Clean up excessive whitespace
    markdown = markdown
      .replace(/\n\n\n+/g, '\n\n')
      .trim();

    return markdown + '\n';
  } catch (error) {
    console.error('Failed to convert ENML to Markdown:', error);
    return enmlContent;
  }
}

/**
 * Convert ENML HTML-like structure to Markdown
 */
function convertEnmlToMarkdown(enml: string): string {
  // Convert headings
  let md = enml
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1');

  // Convert bold
  md = md.replace(/<(?:strong|b)[^>]*>(.*?)<\/(?:strong|b)>/gi, '**$1**');

  // Convert italic
  md = md.replace(/<(?:em|i)[^>]*>(.*?)<\/(?:em|i)>/gi, '*$1*');

  // Convert strikethrough
  md = md.replace(/<(?:del|s|strike)[^>]*>(.*?)<\/(?:del|s|strike)>/gi, '~~$1~~');

  // Convert links
  md = md.replace(/<a\s+href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');

  // Convert blockquotes
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, (match, content) => {
    return content
      .split('\n')
      .map((line: string) => `> ${line}`)
      .join('\n');
  });

  // Convert code blocks
  md = md.replace(/<pre[^>]*>(.*?)<\/pre>/gi, (match, content) => {
    const code = stripHtmlTags(content).trim();
    return `\`\`\`\n${code}\n\`\`\``;
  });

  // Convert inline code
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');

  // Convert unordered lists
  md = md.replace(/<ul[^>]*>(.*?)<\/ul>/gi, (match, content) => {
    return content
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1')
      .trim();
  });

  // Convert ordered lists
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_match, content) => {
    const items: string[] = [];
    const liMatches = content.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
    for (const liMatch of liMatches) {
      const liContent = liMatch.replace(/<\/?li[^>]*>/gi, '').trim();
      if (liContent) {
        items.push(liContent);
      }
    }
    return items.map((item, idx) => `${idx + 1}. ${item}`).join('\n');
  });

  // Convert tables
  md = md.replace(/<table[^>]*>(.*?)<\/table>/gi, (match, content) => {
    return convertTableToMarkdown(content);
  });

  // Convert line breaks
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<hr\s*\/?>/gi, '---');

  // Handle en-media (embedded resources)
  md = md.replace(/<en-media[^>]*type=["']([^"']*)["'][^>]*hash=["']([^"']*)["'][^>]*\/>/gi, (match, type, hash) => {
    if (type.startsWith('image/')) {
      return `![attachment](/_resources/${hash})`;
    }
    return `[attachment](/_resources/${hash})`;
  });

  // Remove remaining HTML tags
  md = stripHtmlTags(md);

  // Unescape HTML entities
  md = unescapeHtml(md);

  return md;
}

/**
 * Convert HTML table to Markdown table
 */
function convertTableToMarkdown(tableContent: string): string {
  const rows: string[][] = [];

  // Extract rows
  const rowMatches = tableContent.match(/<tr[^>]*>(.*?)<\/tr>/gi) || [];

  for (const row of rowMatches) {
    const cells: string[] = [];
    const cellMatches = row.match(/<(?:td|th)[^>]*>(.*?)<\/(?:td|th)>/gi) || [];

    for (const cell of cellMatches) {
      const content = cell
        .replace(/<(?:td|th)[^>]*>(.*?)<\/(?:td|th)>/i, '$1')
        .trim();
      cells.push(stripHtmlTags(content));
    }

    if (cells.length > 0) {
      rows.push(cells);
    }
  }

  if (rows.length === 0) return '';

  // Build Markdown table
  const header = rows[0];
  const separator = header.map(() => '---').join(' | ');
  const headerRow = header.join(' | ');

  let table = `| ${headerRow} |\n| ${separator} |\n`;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const paddedRow = row.concat(Array(header.length - row.length).fill(''));
    table += `| ${paddedRow.join(' | ')} |\n`;
  }

  return table.trim();
}

/**
 * Strip HTML tags from text
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/&/g, '&')
    .replace(/"/g, '"')
    .replace(/'/g, "'")
    .replace(/&apos;/g, "'");
}

/**
 * Unescape HTML entities
 */
function unescapeHtml(text: string): string {
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '<': '<',
    '>': '>',
    '&': '&',
    '"': '"',
    ''': "'",
    '&apos;': "'",
  };

  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, 'g'), char);
  }

  // Handle numeric entities
  result = result.replace(/&#(\d+);/g, (match, code) => {
    return String.fromCharCode(parseInt(code, 10));
  });

  result = result.replace(/&#x([0-9a-f]+);/gi, (match, code) => {
    return String.fromCharCode(parseInt(code, 16));
  });

  return result;
}

/**
 * Generate YAML frontmatter for a note
 */
export function generateFrontmatter(
  title: string,
  tags: string[],
  created: number,
  updated: number,
  additionalFields?: Record<string, any>
): string {
  const createdDate = new Date(created).toISOString();
  const updatedDate = new Date(updated).toISOString();

  let frontmatter = '---\n';
  frontmatter += `title: ${escapeYamlValue(title)}\n`;
  frontmatter += `tags: [${tags.map(t => escapeYamlValue(t)).join(', ')}]\n`;
  frontmatter += `created: ${createdDate}\n`;
  frontmatter += `updated: ${updatedDate}\n`;

  if (additionalFields) {
    if (additionalFields.author) {
      frontmatter += `author: ${escapeYamlValue(additionalFields.author)}\n`;
    }
    if (additionalFields.sourceUrl) {
      frontmatter += `sourceUrl: ${escapeYamlValue(additionalFields.sourceUrl)}\n`;
    }
    if (additionalFields.location) {
      const loc = additionalFields.location;
      frontmatter += `location:\n`;
      frontmatter += `  latitude: ${loc.latitude}\n`;
      frontmatter += `  longitude: ${loc.longitude}\n`;
      if (loc.altitude) {
        frontmatter += `  altitude: ${loc.altitude}\n`;
      }
    }
  }

  frontmatter += '---\n\n';
  return frontmatter;
}

/**
 * Escape special YAML characters
 */
function escapeYamlValue(value: string): string {
  if (typeof value !== 'string') {
    return String(value);
  }

  // If value contains special characters, wrap in quotes
  if (/[:"'#@&*\[\]{}|>!%\\,]/.test(value) || value.includes('\n')) {
    return `"${value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')}"`;
  }

  return value;
}

/**
 * Escape Markdown special characters
 */
export function escapeMarkdown(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/#/g, '\\#')
    .replace(/\./g, '\\.')
    .replace(/!/g, '\\!')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/`/g, '\\`')
    .replace(/\|/g, '\\|')
    .replace(/\^/g, '\\^')
    .replace(/~/g, '\\~')
    .replace(/>/g, '\\>')
    .replace(/</g, '\\<')
    .replace(/\+/g, '\\+')
    .replace(/=/g, '\\=');
}