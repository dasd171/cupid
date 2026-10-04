import { activeModelName, activeProviderName } from "@/lib/ai/factory";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

interface EnvRow {
  name: string;
  description: string;
  secret: boolean;
}

const ENV_VARS: EnvRow[] = [
  { name: "AI_PROVIDER", description: "Which provider to use: openai, compat, ollama or gemini.", secret: false },
  { name: "OPENAI_API_KEY", description: "API key for OpenAI.", secret: true },
  { name: "OPENAI_MODEL", description: "Model name, e.g. gpt-4o-mini.", secret: false },
  { name: "OPENAI_BASE_URL", description: "Optional override of the OpenAI API base URL.", secret: false },
  { name: "AI_BASE_URL", description: "Base URL for any OpenAI-compatible API (AI_PROVIDER=compat).", secret: false },
  { name: "AI_API_KEY", description: "API key for the OpenAI-compatible endpoint.", secret: true },
  { name: "AI_MODEL", description: "Model name for the OpenAI-compatible endpoint.", secret: false },
  { name: "OLLAMA_BASE_URL", description: "Ollama server URL. In Docker, use http://host.docker.internal:11434 for the host.", secret: false },
  { name: "OLLAMA_MODEL", description: "Local model name, e.g. llama3.1 or llava for vision.", secret: false },
  { name: "GEMINI_API_KEY", description: "Google AI Studio API key.", secret: true },
  { name: "GEMINI_MODEL", description: "Gemini model name.", secret: false },
  { name: "STORE_ANALYSIS", description: "Reserved for future persistent storage. Reports currently live in memory only.", secret: false },
];

function isSet(name: string): boolean {
  const v = process.env[name];
  return !!v && v.trim().length > 0;
}

export default function SettingsPage() {
  const provider = activeProviderName();
  const model = activeModelName();

  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Cupid is configured with environment variables — usually via your{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.env</code>{" "}
        file. Secret values are never displayed here.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Active provider</CardTitle>
          <CardDescription>Read from AI_PROVIDER at server startup.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Badge className="text-sm">{provider}</Badge>
          <span className="text-sm text-muted-foreground">
            model: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{model}</code>
          </span>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Environment variables</CardTitle>
          <CardDescription>
            Only the variable names and whether they are set are shown — never
            their values.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {ENV_VARS.map((row) => {
              const set = isSet(row.name);
              return (
                <li key={row.name} className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">
                      {row.name}
                    </code>
                    {row.secret && (
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        secret
                      </Badge>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">{row.description}</p>
                  </div>
                  <Badge variant={set ? "default" : "outline"}>
                    {set ? "set" : "not set"}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Using Ollama (local AI)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Run everything on your own machine with Ollama:</p>
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs text-foreground">
{`ollama pull llama3.1
ollama pull llava   # vision-capable model for photo context`}
          </pre>
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs text-foreground">
{`AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1`}
          </pre>
          <p>
            When Cupid runs in Docker and Ollama runs on the host, set{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              OLLAMA_BASE_URL=http://host.docker.internal:11434
            </code>
            .
          </p>
          <Separator />
          <p className="text-xs">
            Reports are held in server memory for 10 minutes after analysis and
            then discarded — they are never written to disk.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
