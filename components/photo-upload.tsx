"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { compressImage } from "@/lib/compress-image";

interface PhotoUploadProps {
  label: string;
  name: string;
  onFileChange: (file: File | null) => void;
  hint?: string;
}

const ACCEPT = "image/jpeg,image/png,image/webp";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Drag-and-drop photo field with preview. Optional — analysis works without photos. */
export function PhotoUpload({ label, name, onFileChange, hint }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const clear = useCallback(() => {
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setFileName(null);
    setFileSize(null);
    onFileChange(null);
  }, [onFileChange]);

  const pick = useCallback(
    async (file: File | null) => {
      setError(null);
      if (!file) {
        clear();
        return;
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setError("Only JPG, PNG or WebP images are supported.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("Image must be 10 MB or smaller.");
        return;
      }
      // Downscale in the browser: Vercel rejects request bodies over ~4.5 MB
      // (HTTP 413) before our code runs, and re-encoding strips EXIF data.
      setCompressing(true);
      try {
        const compressed = await compressImage(file);
        setPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(compressed);
        });
        setFileName(compressed.name);
        setFileSize(formatBytes(compressed.size));
        onFileChange(compressed);
      } finally {
        setCompressing(false);
      }
    },
    [clear, onFileChange],
  );

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Upload photo for ${name}`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files?.[0] ?? null);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-accent/50",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
        {compressing ? (
          <>
            <span className="text-3xl" aria-hidden="true">⏳</span>
            <p className="text-sm font-medium">Compressing photo…</p>
            <p className="text-xs text-muted-foreground">
              Downscaling for upload &amp; stripping metadata
            </p>
          </>
        ) : preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt={`Photo preview for ${name}`}
              className="h-32 w-32 rounded-full object-cover ring-2 ring-primary/30"
            />
            <p className="max-w-full truncate text-xs text-muted-foreground">
              {fileName}
              {fileSize ? ` · ${fileSize}` : ""}
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clear();
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="text-xs font-medium text-destructive underline"
            >
              Remove photo
            </button>
          </>
        ) : (
          <>
            <span className="text-3xl" aria-hidden="true">📷</span>
            <p className="text-sm font-medium">Drop a photo here, or click to choose</p>
            <p className="text-xs text-muted-foreground">
              JPG / PNG / WebP · max 10 MB · auto-compressed on upload · optional
              {hint ? ` · ${hint}` : ""}
            </p>
          </>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
