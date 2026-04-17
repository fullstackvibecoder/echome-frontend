"use client";
import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";

interface Props {
  onUpload: (url: string) => void;
}

export default function ImageUploader({ onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { url } = await api.adminEmails.uploadImage(file);
      onUpload(url);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleFile}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground hover:bg-muted disabled:opacity-50"
      >
        {uploading ? <Loader2 size={13} className="animate-spin" /> : null}
        Image
      </button>
      {error && <span className="ml-2 text-xs text-destructive">{error}</span>}
    </>
  );
}
