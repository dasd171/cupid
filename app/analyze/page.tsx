"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PhotoUpload } from "@/components/photo-upload";
import { ChatUpload } from "@/components/chat-upload";
import { AnalysisProgress } from "@/components/analysis-progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const STEP_TITLES = ["Person A", "Person B", "Conversation"];

/** Turn raw HTTP/API failures into messages a human can act on. */
function toFriendlyError(res: Response, data: { error?: string } | null): string {
  if (res.status === 413) {
    return (
      "Upload rejected: the request was too large for the server. " +
      "Photos are auto-compressed before upload, but if this keeps happening, " +
      "try smaller photos — or skip them entirely, analysis works fine without photos."
    );
  }
  if (res.status === 429) {
    return "Too many requests — please wait a minute and try again.";
  }
  if (data?.error) return data.error;
  return `Analysis failed (HTTP ${res.status}). Please try again.`;
}

export default function AnalyzePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [personA, setPersonA] = useState("");
  const [personB, setPersonB] = useState("");
  const [photoA, setPhotoA] = useState<File | null>(null);
  const [photoB, setPhotoB] = useState<File | null>(null);
  const [chatFile, setChatFile] = useState<File | null>(null);
  const [chatText, setChatText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canNextStep0 = personA.trim().length > 0;
  const canNextStep1 = personB.trim().length > 0;
  const canAnalyze = chatFile !== null || chatText.trim().length >= 20;

  const startAnalysis = async () => {
    setError(null);
    setAnalyzing(true);
    try {
      const fd = new FormData();
      fd.append("personA", personA.trim());
      fd.append("personB", personB.trim());
      if (photoA) fd.append("photoA", photoA);
      if (photoB) fd.append("photoB", photoB);
      if (chatFile) fd.append("chatFile", chatFile);
      if (chatText.trim()) fd.append("chatText", chatText.trim());
      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      const data = (await res.json().catch(() => null)) as { id?: string; error?: string } | null;
      if (!res.ok || !data?.id) {
        throw new Error(toFriendlyError(res, data));
      }
      router.push(`/result/${data.id}`);
    } catch (err) {
      setAnalyzing(false);
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    }
  };

  if (analyzing) {
    return (
      <div className="container flex min-h-[60vh] items-center justify-center py-12">
        <AnalysisProgress />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-10">
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between text-sm">
          {STEP_TITLES.map((t, i) => (
            <span
              key={t}
              className={cn(
                "font-medium",
                i === step ? "text-primary" : i < step ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {i + 1}. {t}
            </span>
          ))}
        </div>
        <Progress value={((step + 1) / STEP_TITLES.length) * 100} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25 }}
        >
          {step === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Person A</CardTitle>
                <CardDescription>
                  Who is the first person? A photo is optional — it only gives
                  the AI scene context, never a judgment of appearance.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="personA">Name or nickname *</Label>
                  <Input
                    id="personA"
                    placeholder="e.g. Alex"
                    value={personA}
                    onChange={(e) => setPersonA(e.target.value)}
                    maxLength={80}
                    autoComplete="off"
                  />
                </div>
                <PhotoUpload label="Upload Photo (optional)" name="Person A" onFileChange={setPhotoA} />
                <div className="flex justify-end">
                  <Button onClick={() => setStep(1)} disabled={!canNextStep0}>
                    Continue →
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Person B</CardTitle>
                <CardDescription>
                  Who is the second person? Same deal — photo optional.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="personB">Name or nickname *</Label>
                  <Input
                    id="personB"
                    placeholder="e.g. Sam"
                    value={personB}
                    onChange={(e) => setPersonB(e.target.value)}
                    maxLength={80}
                    autoComplete="off"
                  />
                </div>
                <PhotoUpload label="Upload Photo (optional)" name="Person B" onFileChange={setPhotoB} />
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(0)}>
                    ← Back
                  </Button>
                  <Button onClick={() => setStep(2)} disabled={!canNextStep1}>
                    Continue →
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Conversation History</CardTitle>
                <CardDescription>
                  Upload a chat export or paste the conversation between{" "}
                  {personA || "Person A"} and {personB || "Person B"}.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <ChatUpload
                  onFileChange={setChatFile}
                  onTextChange={setChatText}
                  personA={personA}
                  personB={personB}
                />
                {error && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    ← Back
                  </Button>
                  <Button onClick={startAnalysis} disabled={!canAnalyze} size="lg">
                    💘 Analyze Relationship
                  </Button>
                </div>
                {!canAnalyze && (
                  <p className="text-right text-xs text-muted-foreground">
                    Add a chat file or paste at least a few messages to continue.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        🔒 Files are processed in memory on this server and deleted after
        analysis. Nothing is stored.
      </p>
    </div>
  );
}
