"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface PhotoUploadProps {
  label: string;
  name: string;
  onFileChange: (file: File | null) => void;
  hint?: string;
}

const ACCEPT = "image/jpeg,image/png,image/webp";

/** Drag-and-drop photo field with preview. Optional — analysis works without photos. */
export function PhotoUpload({ label, name, onFileChange, hint }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = useCallback(
    (file: File | null) => {
      setError(null);
      if (!file) {
        setPreview(null);
        setFileName(null);
        onFileChange(null);
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
      setPreview(URL.createObjectURL(file));
      setFileName(file.name);
      onFileChange(file);
    },
    [onFileChange],
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
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt={`Photo preview for ${name}`}
              className="h-32 w-32 rounded-full object-cover ring-2 ring-primary/30"
            />
            <p className="max-w-full truncate text-xs text-muted-foreground">{fileName}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                pick(null);
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
              JPG / PNG / WebP · max 10 MB · optional{hint ? ` · ${hint}` : ""}
            </p>
          </>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
