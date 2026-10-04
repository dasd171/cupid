"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { CupidLogo } from "@/components/cupid-logo";

const STAGES = [
  "Cupid is reading the conversation…",
  "Analyzing communication…",
  "Analyzing emotional engagement…",
  "Analyzing mutual interest…",
  "Analyzing relationship patterns…",
  "Generating your Cupid Report…",
];

const STAGE_MS = 2600;

/**
 * Staged progress UX (spec §23). Shows phase status only —
 * never the model's internal reasoning.
 */
export function AnalysisProgress() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (stage >= STAGES.length - 1) return;
    const timer = setTimeout(() => setStage((s) => s + 1), STAGE_MS);
    return () => clearTimeout(timer);
  }, [stage]);

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardContent className="flex flex-col items-center pt-8">
        <motion.div
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
        >
          <CupidLogo className="h-14 w-14" />
        </motion.div>
        <h2 className="mt-4 text-xl font-bold">💘 Cupid is working…</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This usually takes 20–60 seconds. Your data stays on this server.
        </p>
        <ul className="mt-6 w-full space-y-3">
          <AnimatePresence>
            {STAGES.map((label, i) => {
              const done = i < stage;
              const active = i === stage;
              if (i > stage) return null;
              return (
                <motion.li
                  key={label}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 text-sm"
                >
                  <span
                    className={
                      done
                        ? "flex h-6 w-6 items-center justify-center rounded-full bg-green-500/15 text-green-600"
                        : "flex h-6 w-6 items-center justify-center"
                    }
                    aria-hidden="true"
                  >
                    {done ? (
                      "✓"
                    ) : (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    )}
                  </span>
                  <span className={active ? "font-medium" : "text-muted-foreground"}>
                    {label}
                  </span>
                  {done && <span className="text-green-600">✓</span>}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </CardContent>
    </Card>
  );
}
