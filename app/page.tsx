"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CupidLogo } from "@/components/cupid-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const BADGES = [
  { icon: "🔒", label: "Privacy First" },
  { icon: "🤖", label: "AI Powered" },
  { icon: "🏠", label: "Self Hosted" },
  { icon: "🌐", label: "Open Source" },
];

const STEPS = [
  {
    title: "Upload",
    text: "Add photos of the two people and your conversation history (TXT, JSON, CSV, HTML — or just paste it).",
  },
  {
    title: "Analyze",
    text: "Your own AI provider reads communication patterns: initiative, responsiveness, emotional engagement, future plans.",
  },
  {
    title: "Reflect",
    text: "Get a Relationship Score, direction verdict, positive & risk signals, and evidence-backed insights.",
  },
];

export default function HomePage() {
  return (
    <div className="container flex flex-col items-center py-12 sm:py-20">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center text-center"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        >
          <CupidLogo className="h-20 w-20 sm:h-24 sm:w-24" />
        </motion.div>
        <h1 className="mt-6 bg-gradient-to-r from-rose-500 to-pink-600 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl">
          💘 Cupid
        </h1>
        <p className="mt-3 text-xl font-medium text-muted-foreground sm:text-2xl">
          AI Relationship Analyzer
        </p>
        <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
          Upload your conversations and photos.
          <br />
          Let AI help you understand the relationship.
        </p>
        <div className="mt-8">
          <Button asChild size="lg" className="px-10 text-base">
            <Link href="/analyze">Start Analysis</Link>
          </Button>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {BADGES.map((b, i) => (
            <motion.span
              key={b.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3.5 py-1.5 text-sm font-medium"
            >
              <span aria-hidden="true">{b.icon}</span> {b.label}
            </motion.span>
          ))}
        </div>
      </motion.div>

      <div className="mt-16 grid w-full max-w-4xl gap-4 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12, duration: 0.5 }}
          >
            <Card className="h-full">
              <CardContent className="pt-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
                  {i + 1}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {s.text}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mt-12 w-full max-w-4xl"
      >
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            <p className="font-medium text-foreground">🔒 Privacy by design</p>
            <p className="mt-2 leading-relaxed">
              Your photos, chats and API keys are processed in memory on your
              own server and deleted when the analysis finishes. Nothing is
              stored, nothing is logged — only “Analysis started / completed /
              failed” ever reaches the logs.
            </p>
            <p className="mt-3 text-xs italic">
              AI-based relationship analysis, not a scientific prediction.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
