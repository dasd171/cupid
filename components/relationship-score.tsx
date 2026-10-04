"use client";

import { motion } from "framer-motion";

interface RelationshipScoreProps {
  score: number;
  directionLabel: string;
}

const RADIUS = 84;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function colorFor(score: number): string {
  if (score >= 75) return "#e11d48";
  if (score >= 55) return "#f59e0b";
  if (score >= 35) return "#8b5cf6";
  return "#64748b";
}

/** Animated circular score gauge — the hero of the result page. */
export function RelationshipScore({ score, directionLabel }: RelationshipScoreProps) {
  const color = colorFor(score);
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-56 w-56">
        <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
          <circle
            cx="100"
            cy="100"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="14"
            className="text-muted"
            opacity={0.35}
          />
          <motion.circle
            cx="100"
            cy="100"
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - score / 100) }}
            transition={{ duration: 1.6, ease: "easeOut", delay: 0.3 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="text-5xl font-extrabold tabular-nums"
          >
            {score}
          </motion.span>
          <span className="text-sm text-muted-foreground">/ 100</span>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="mt-4 text-center"
      >
        <p className="text-sm uppercase tracking-widest text-muted-foreground">
          Relationship Score
        </p>
        <p className="mt-1 text-2xl font-bold" style={{ color }}>
          {directionLabel}
        </p>
      </motion.div>
    </div>
  );
}
