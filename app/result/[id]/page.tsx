import Link from "next/link";
import { getReport } from "@/lib/store";
import { RelationshipReport } from "@/components/relationship-report";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function ResultPage({ params }: { params: { id: string } }) {
  const report = getReport(params.id);

  if (!report) {
    return (
      <div className="container flex min-h-[60vh] items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center pt-8 text-center">
            <span className="text-5xl" aria-hidden="true">💔</span>
            <h1 className="mt-4 text-xl font-bold">Report not found</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              This report may have expired — reports are kept in memory for
              only 10 minutes and never stored, to protect your privacy.
            </p>
            <Button asChild className="mt-6">
              <Link href="/analyze">Start a new analysis</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <RelationshipReport report={report} />
      <div className="mx-auto flex max-w-3xl justify-center gap-3 pb-8">
        <Button asChild variant="outline">
          <Link href="/analyze">Analyze another conversation</Link>
        </Button>
      </div>
    </div>
  );
}
