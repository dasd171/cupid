import { motion } from "framer-motion";
import type { FinalReport } from "@/types/analysis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RelationshipScore } from "@/components/relationship-score";
import { CompatibilityChart } from "@/components/compatibility-chart";

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

function Section({
  title,
  icon,
  children,
  delay = 0,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div {...fadeUp} transition={{ duration: 0.5, delay }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <span aria-hidden="true">{icon}</span> {title}
          </CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
  );
}

/** Full Cupid report view for the result page. */
export function RelationshipReport({ report }: { report: FinalReport }) {
  const confidenceColor =
    report.confidence === "high"
      ? "default"
      : report.confidence === "medium"
        ? "secondary"
        : "outline";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="pt-8 text-center"
      >
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          💘 Your Cupid Report
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {report.personA} &amp; {report.personB} · analyzed from{" "}
          {report.stats.totalMessages} messages
        </p>
        <div className="mx-auto mt-4 max-w-xl rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs font-medium text-amber-800 dark:text-amber-200">
          AI-based relationship analysis, not a scientific prediction.
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.15 }}
      >
        <Card className="overflow-hidden">
          <CardContent className="flex flex-col items-center gap-8 px-6 pt-8 sm:px-10">
            <RelationshipScore
              score={report.overallScore}
              directionLabel={report.directionLabel}
            />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Confidence</span>
              <Badge variant={confidenceColor}>{report.confidence}</Badge>
            </div>
            <div className="w-full">
              <CompatibilityChart
                scores={report.scores}
                fallbackDimensions={report.fallbackDimensions}
              />
            </div>
            <p className="pb-2 text-center text-xs italic text-muted-foreground">
              This score is an AI-generated heuristic, not a scientific
              probability.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <Section title="What Cupid Sees" icon="🔮">
        <p className="whitespace-pre-line leading-relaxed">{report.summary}</p>
        {report.visualContext && (
          <p className="mt-3 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Photo context: </span>
            {report.visualContext}
          </p>
        )}
      </Section>

      <Section title="Positive Signals" icon="💚" delay={0.05}>
        {report.positiveSignals.length > 0 ? (
          <ul className="space-y-2">
            {report.positiveSignals.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                <span className="text-green-600" aria-hidden="true">✓</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No strong positive signals stood out in this conversation.
          </p>
        )}
      </Section>

      <Section title="Potential Risks" icon="⚠️" delay={0.1}>
        {report.riskSignals.length > 0 ? (
          <ul className="space-y-2">
            {report.riskSignals.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                <span className="text-amber-600" aria-hidden="true">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No notable risk signals were detected.
          </p>
        )}
      </Section>

      {report.evidence.length > 0 && (
        <Section title="Evidence" icon="🔍" delay={0.15}>
          <ul className="space-y-3">
            {report.evidence.map((e, i) => (
              <li key={i} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {e.type.replace(/_/g, " ")}
                  </Badge>
                  {e.claim && <span className="font-medium">{e.claim}</span>}
                </div>
                <p className="mt-1.5 leading-relaxed text-muted-foreground">
                  {e.description}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {report.recommendations.length > 0 && (
        <Section title="Suggestions" icon="💡" delay={0.2}>
          <ul className="space-y-2">
            {report.recommendations.map((r, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                <span className="font-bold text-primary" aria-hidden="true">
                  {i + 1}.
                </span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <motion.div {...fadeUp}>
        <Card className="border-dashed">
          <CardContent className="pt-6 text-sm leading-relaxed text-muted-foreground">
            <Separator className="mb-4" />
            <p>
              Cupid provides AI-generated relationship insights for
              entertainment and self-reflection.
            </p>
            <p className="mt-2">
              It cannot predict the future or determine whether two people will
              definitely become a couple.
            </p>
            <p className="mt-2 font-medium text-foreground">
              Do not use Cupid&apos;s analysis as the sole basis for important
              personal decisions.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
