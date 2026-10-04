"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ChatUploadProps {
  onFileChange: (file: File | null) => void;
  onTextChange: (text: string) => void;
  personA: string;
  personB: string;
}

interface Preview {
  totalMessages: number;
  countA: number;
  countB: number;
  countUnknown: number;
  format: string;
}

const ACCEPT = ".txt,.json,.csv,.html,text/plain,application/json,text/csv,text/html";

/** Chat history upload: file (TXT/JSON/CSV/HTML) and/or pasted text, with a live preview. */
export function ChatUpload({ onFileChange, onTextChange, personA, personB }: ChatUploadProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const requestPreview = async (file: File) => {
    setPreviewLoading(true);
    setPreview(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("personA", personA || "A");
      fd.append("personB", personB || "B");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Could not preview this file.");
      }
      setPreview((await res.json()) as Preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not preview this file.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const pick = (file: File | null) => {
    setError(null);
    setPreview(null);
    if (!file) {
      setFileName(null);
      onFileChange(null);
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("Chat file must be 20 MB or smaller.");
      return;
    }
    setFileName(file.name);
    onFileChange(file);
    void requestPreview(file);
  };

  return (
    <div className="space-y-3">
      <Label>Conversation History</Label>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload chat export file"
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
        <span className="text-3xl" aria-hidden="true">💬</span>
        {fileName ? (
          <>
            <p className="max-w-full truncate text-sm font-medium">{fileName}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                pick(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="text-xs font-medium text-destructive underline"
            >
              Remove file
            </button>
          </>
        ) : (
          <>
            <p className="text-sm font-medium">Drop your chat export here, or click to choose</p>
            <p className="text-xs text-muted-foreground">TXT · JSON · CSV · HTML · max 20 MB</p>
          </>
        )}
      </div>

      {previewLoading && (
        <p className="text-xs text-muted-foreground">Reading preview…</p>
      )}
      {preview && (
        <div className="rounded-lg border bg-card p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">
            ✓ Detected {preview.totalMessages} messages ({preview.format.toUpperCase()})
          </p>
          <p className="mt-1">
            {personA || "Person A"}: {preview.countA} · {personB || "Person B"}:{" "}
            {preview.countB}
            {preview.countUnknown > 0 && ` · unattributed: ${preview.countUnknown}`}
          </p>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or paste directly</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <Textarea
        placeholder={"Alice: Hey, how was your day?\nBob: Pretty good! Want to grab dinner tomorrow?\nAlice: I'd love to 😊"}
        onChange={(e) => onTextChange(e.target.value)}
        className="min-h-[160px] font-mono text-xs"
        aria-label="Paste chat history"
      />
      <p className="text-xs text-muted-foreground">
        Tip: name each speaker like “Name: message”. Enter the two names above
        so Cupid can tell who is who.
      </p>
    </div>
  );
}
