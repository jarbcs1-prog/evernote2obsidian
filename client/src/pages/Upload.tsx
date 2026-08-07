import { useState, useRef } from "react";
import { Upload as UploadIcon, File, AlertCircle, CheckCircle2, Loader2, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

interface UploadedFile {
  file: File;
  status: "pending" | "converting" | "completed" | "error";
  error?: string;
  zipUrl?: string;
}

interface ConversionResult {
  totalNotes: number;
  totalAttachments: number;
  errors: { type: string; message: string; noteTitle?: string }[];
  zipUrl: string;
  zipKey: string;
}

export default function Upload() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, toggleTheme } = useTheme();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.name.endsWith(".enex"));
    setUploadedFiles((prev) => [...prev, ...files.map((file) => ({ file, status: "pending" as const }))]);
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.currentTarget.files || []);
    setUploadedFiles((prev) => [...prev, ...files.map((file) => ({ file, status: "pending" as const }))]);
  };
  const handleRemove = (file: File) => setUploadedFiles((prev) => prev.filter((f) => f.file !== file));
  const handleClear = () => setUploadedFiles([]);

  const handleDownload = (zipUrl: string, fileName: string) => {
    const a = document.createElement("a");
    a.href = zipUrl;
    a.download = `${fileName.replace(/\.enex$/i, "")}-converted.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleConvert = async () => {
    if (uploadedFiles.length === 0) {
      toast.error("Please select at least one ENEX file");
      return;
    }
    for (const uploadedFile of uploadedFiles) {
      if (uploadedFile.status !== "pending") continue;
      try {
        setUploadedFiles((prev) =>
          prev.map((f) => f.file === uploadedFile.file ? { ...f, status: "converting" as const } : f)
        );
        const content = await uploadedFile.file.text();
        const response = await fetch("/api/convert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileContent: content, fileName: uploadedFile.file.name }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `Server error ${response.status}`);
        }
        const result: ConversionResult = await response.json();
        setUploadedFiles((prev) =>
          prev.map((f) => f.file === uploadedFile.file ? { ...f, status: "completed" as const, zipUrl: result.zipUrl } : f)
        );
        const errCount = result.errors.length;
        toast.success(
          `Converted ${uploadedFile.file.name}: ${result.totalNotes} notes, ${result.totalAttachments} attachments${errCount ? `, ${errCount} warning(s)` : ""}`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Conversion failed";
        setUploadedFiles((prev) =>
          prev.map((f) => f.file === uploadedFile.file ? { ...f, status: "error" as const, error: msg } : f)
        );
        toast.error(msg);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Convert Evernote to Obsidian</h1>
            <p className="text-lg text-muted-foreground">
              Transform your Evernote exports into beautiful Markdown notes with attachments
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-lg border border-border hover:bg-accent transition-colors"
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-xl transition-all cursor-pointer p-12 text-center ${
            isDragging
              ? "border-blue-500 bg-blue-500/10"
              : "border-border hover:border-muted-foreground bg-card"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <UploadIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Drag and drop your ENEX files here</h2>
          <p className="text-muted-foreground mb-4">or click to browse your computer</p>
          <p className="text-sm text-muted-foreground/70">Supported format: .enex (Evernote export files)</p>
          <input ref={fileInputRef} type="file" multiple accept=".enex" onChange={handleFileSelect} className="hidden" />
        </div>

        {/* File List */}
        {uploadedFiles.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Files to convert ({uploadedFiles.length})</h3>
              {uploadedFiles.some((f) => f.status === "pending") && (
                <Button variant="ghost" size="sm" onClick={handleClear}>Clear all</Button>
              )}
            </div>

            <div className="space-y-3">
              {uploadedFiles.map((f, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <File className="w-5 h-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{f.file.name}</p>
                        <p className="text-sm text-muted-foreground">{(f.file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {f.status === "pending" && (
                        <Button variant="ghost" size="sm" onClick={() => handleRemove(f.file)}>Remove</Button>
                      )}
                      {f.status === "converting" && (
                        <span className="flex items-center gap-2 text-blue-500 text-sm">
                          <Loader2 className="w-4 h-4 animate-spin" />Converting...
                        </span>
                      )}
                      {f.status === "completed" && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <Button size="sm" onClick={() => handleDownload(f.zipUrl!, f.file.name)}>
                            Download ZIP
                          </Button>
                        </div>
                      )}
                      {f.status === "error" && (
                        <div className="flex items-center gap-2 text-red-500">
                          <AlertCircle className="w-5 h-5" /><span className="text-sm">Error</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {f.status === "error" && f.error && (
                    <Alert className="mt-3 bg-red-500/10 border-red-500/30">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <AlertDescription className="text-red-500">{f.error}</AlertDescription>
                    </Alert>
                  )}
                </Card>
              ))}
            </div>

            <Button
              onClick={handleConvert}
              disabled={uploadedFiles.length === 0 || uploadedFiles.every((f) => f.status !== "pending")}
              className="mt-6 w-full"
            >
              {uploadedFiles.some((f) => f.status === "converting") ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Converting...</>
              ) : (
                "Convert Files"
              )}
            </Button>
          </div>
        )}

        {/* Info */}
        <Alert className="mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            ENEX files are converted to Markdown with YAML frontmatter, organized by notebook, and packaged with attachments in a ZIP.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}