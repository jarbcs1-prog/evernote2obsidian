import { useState, useRef } from 'react';
import { Toaster, toast } from 'sonner';

interface ConvertResult {
  success: boolean;
  notebooks: {
    name: string;
    files: { filename: string; content: string }[];
    attachments: { filename: string; data: string }[];
  }[];
  totalNotes: number;
}

function App() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.enex')) {
      toast.error('Please upload a .enex file');
      return;
    }

    setLoading(true);
    setResult(null);
    setDownloadUrl(null);

    const formData = new FormData();
    formData.append('enex', file);

    try {
      const response = await fetch('http://localhost:3000/api/convert', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Conversion failed');
      }

      const data: ConvertResult = await response.json();
      setResult(data);

      // Create zip file
      const zip = await import('jszip');
      const zipObj = new zip.default();

      for (const notebook of data.notebooks) {
        const folder = zipObj.folder(notebook.name);
        if (folder) {
          for (const file of notebook.files) {
            folder.file(file.filename, file.content);
          }
          
          const attachmentsFolder = folder.folder('attachments');
          if (attachmentsFolder && notebook.attachments) {
            for (const att of notebook.attachments) {
              try {
                const binary = atob(att.data);
                const array = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                  array[i] = binary.charCodeAt(i);
                }
                attachmentsFolder.file(att.filename, array);
              } catch (e) {
                console.warn('Skipping invalid attachment:', att.filename);
              }
            }
          }
        }
      }

      const content = await zipObj.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      setDownloadUrl(url);
      toast.success(`Converted ${data.totalNotes} notes successfully!`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to convert file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header>
        <h1>Evernote to Obsidian Converter</h1>
        <p>Upload an .enex file to convert it to Obsidian markdown</p>
      </header>

      <main>
        <div className="upload-section">
          <input
            type="file"
            accept=".enex"
            onChange={handleUpload}
            ref={fileInputRef}
            disabled={loading}
          />
          
          {loading && <div className="loading">Converting...</div>}

          {result && (
            <div className="result">
              <p>Converted <strong>{result.totalNotes}</strong> notes from <strong>{result.notebooks.length}</strong> notebook(s)</p>
              
              <ul className="notebook-list">
                {result.notebooks.map((nb, i) => {
                  const totalAttachments = nb.attachments?.length || 0;
                  return (
                    <li key={i}>
                      <strong>{nb.name}</strong> - {nb.files.length} notes
                      {totalAttachments > 0 && `, ${totalAttachments} attachments`}
                    </li>
                  );
                })}
              </ul>

              {downloadUrl && (
                <a href={downloadUrl} download="obsidian-export.zip" className="download-btn">
                  Download as ZIP
                </a>
              )}
            </div>
          )}
        </div>
      </main>
      <Toaster />
    </div>
  );
}

export default App;