import { parseStringPromise } from 'xml2js';

export interface EnexResource {
  filename: string;
  mimeType: string;
  data: string; // base64 encoded
}

export interface EnexNote {
  title: string;
  content: string;
  created: string;
  updated: string;
  tags: string[];
  resources: EnexResource[];
}

export interface EnexNotebook {
  name: string;
  notes: EnexNote[];
}

export async function parseEnex(xml: string): Promise<EnexNotebook[]> {
  const result = await parseStringPromise(xml, {
    explicitArray: false,
    mergeAttrs: true,
  });

  const root = result?.enex || result?.['en-export'] || result;
  
  if (!root) {
    throw new Error('Invalid ENEX file: no root element found');
  }

  const notebooks: Map<string, EnexNote[]> = new Map();

  const notesData = root.note;
  if (!notesData) {
    return [];
  }

  const notes = Array.isArray(notesData) 
    ? notesData 
    : [notesData].filter(Boolean);

  for (const note of notes) {
    const notebookName = note.notebook || 'Default';
    const content = note.content?.['#'] || note.content || '';
    
    const tags = note.tag || [];
    const tagArray = Array.isArray(tags) ? tags : [tags].filter(Boolean);

    const resources: EnexResource[] = [];
    const resourcesData = note.resource;
    if (resourcesData) {
      const resourceList = Array.isArray(resourcesData) 
        ? resourcesData 
        : [resourcesData].filter(Boolean);
      
      for (const res of resourceList) {
        const mimeType = res.mime || 'application/octet-stream';
        let data = res.data?.['#'] || res.data;
        
        if (typeof data === 'string') {
          data = data.replace(/\s/g, '');
        } else if (typeof data === 'number') {
          data = data.toString();
        } else {
          data = '';
        }
        
        const fileName = res['file-name'] || `attachment_${Math.random().toString(36).substr(2, 9)}`;
        
        if (data && data.length > 0) {
          resources.push({
            filename: fileName,
            mimeType: mimeType,
            data: data,
          });
        }
      }
    }

    const enexNote: EnexNote = {
      title: note.title || 'Untitled',
      content: content,
      created: note.created || '',
      updated: note.updated || '',
      tags: tagArray.map((t: string) => t.name || t).filter(Boolean),
      resources: resources,
    };

    if (!notebooks.has(notebookName)) {
      notebooks.set(notebookName, []);
    }
    notebooks.get(notebookName)!.push(enexNote);
  }

  return Array.from(notebooks.entries()).map(([name, notes]) => ({
    name,
    notes,
  }));
}