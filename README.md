# 💘 Cupid

**AI Relationship Analyzer**

Cupid analyzes conversations and optional photos to provide AI-generated relationship insights.

Self-hosted. Privacy-first. Open source.

> **AI-based relationship analysis, not a scientific prediction.**
> Cupid is an AI-powered relationship *reflection* tool — it explores
> communication patterns and offers food for thought. It cannot predict the
> future or determine whether two people will become a couple, and its
> output should never be the sole basis for important personal decisions.

---

## Features

- 📸 **Photo upload** (optional) — used only as auxiliary scene context for
  multimodal models; never to judge appearance or romantic suitability.
- 💬 **Chat import** — TXT, JSON, CSV, HTML exports, or paste text directly.
- 🧠 **Pluggable AI providers** — OpenAI, any OpenAI-compatible API
  (OpenRouter, local servers…), Ollama (fully local), Google Gemini.
- 📊 **Relationship Score (0–100)** with six weighted dimensions,
  direction verdict (romantic / potential romantic / friendship / unclear /
  cooling down), positive & risk signals, evidence-backed insights.
- 🔒 **Privacy first** — files are processed in memory on your server and
  deleted when the analysis finishes; reports live in server memory for
  10 minutes only and are never written to disk.
- 🌙 **Dark mode**, mobile-friendly UI, animated report.

## Demo

Run it locally (see Installation) and open http://localhost:3000.

## Installation

Requirements: Node.js ≥ 18.18, npm. For Docker: Docker + Docker Compose.

```bash
git clone https://github.com/example/cupid.git
cd cupid
cp .env.example .env
# edit .env — set AI_PROVIDER and your provider credentials
npm install
npm run dev
```

Open http://localhost:3000.

## Docker

One-command deployment:

```bash
git clone https://github.com/example/cupid.git
cd cupid
cp .env.example .env   # fill in your AI provider settings
docker compose up -d --build
```

Then open http://localhost:3000.

Useful commands:

```bash
docker compose logs -f cupid   # follow logs
docker compose down            # stop
```

## Environment Variables

| Variable | Description |
|---|---|
| `AI_PROVIDER` | `openai` · `compat` · `ollama` · `gemini` (default: `openai`) |
| `OPENAI_API_KEY` | API key for OpenAI |
| `OPENAI_MODEL` | Model name (default: `gpt-4o-mini`) |
| `OPENAI_BASE_URL` | Optional API base URL override |
| `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` | Generic OpenAI-compatible endpoint (`AI_PROVIDER=compat`), e.g. OpenRouter or a local server |
| `OLLAMA_BASE_URL` | Ollama URL (default `http://localhost:11434`) |
| `OLLAMA_MODEL` | Local model name |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Google Gemini credentials |
| `STORE_ANALYSIS` | Reserved for future persistent storage; currently reports are memory-only regardless |

API keys are read **only on the server** and are never sent to the browser.
The Settings page shows variable *names* and whether they are set — never values.

## AI Providers

### OpenAI

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

### OpenAI-compatible (OpenRouter, local servers, …)

```env
AI_PROVIDER=compat
AI_BASE_URL=https://openrouter.ai/api/v1
AI_API_KEY=...
AI_MODEL=...
```

### Ollama

Run fully offline on your own machine:

```bash
ollama pull llama3.1
ollama pull llava   # vision-capable model, for photo context
```

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1
```

No model names are hard-coded — any chat/vision model served by Ollama works.
When Cupid runs in Docker and Ollama runs on the host machine, use:

```env
OLLAMA_BASE_URL=http://host.docker.internal:11434
```

### Gemini

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-1.5-flash
```

The provider layer (`lib/ai/`) exposes a single `AIProvider` interface —
business logic never imports a vendor SDK directly, so adding a new provider
means implementing one interface in `lib/ai/` and wiring it in `lib/ai/factory.ts`.

## Development

```bash
npm run dev        # start dev server
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm run test       # vitest
npm run build      # production build
```

Project layout:

```
app/            Next.js App Router pages + Route Handlers
components/     UI (shadcn-style ui/ + feature components)
lib/ai/         AI provider interface + implementations + factory
lib/analysis/   chat parser, stats, scoring, report builder
lib/privacy/    temp-file cleanup
prompts/        AI prompt templates (loaded at runtime)
types/          shared types + zod schemas for AI output
tests/          vitest suites
```

## Privacy

- `STORE_ANALYSIS=false` by default. **Reports are held in server memory for
  10 minutes and never written to disk.**
- Uploaded photos and chat files live in a per-request temp directory that is
  deleted in a `finally` block when the analysis finishes — success or failure.
- Photos are downscaled in the browser before upload (max 1280px, JPEG)
  and stripped of EXIF metadata before being sent to the AI provider.
  This also keeps uploads under the ~4.5 MB request-body cap enforced by
  serverless hosts like Vercel (HTTP 413 otherwise).
- Logs contain only `Analysis started` / `Analysis completed` /
  `Analysis failed`. Chat content, file paths, and API keys are never logged.
- API keys exist only as server-side environment variables.

## Security

- File type + MIME whitelist (images: JPG/PNG/WebP; chats: TXT/JSON/CSV/HTML).
- Size limits: images 10 MB, chat files 20 MB, request body 64 MB.
- Randomized temp filenames (`crypto.randomUUID()`); temp dirs confined to
  the OS temp directory (path-traversal guard).
- In-memory sliding-window rate limiting: 5 analyses/minute/IP on
  `/api/analyze`.
- AI output is strictly validated with a zod schema (with one retry);
  disallowed certainty claims (“100% certain”, “soulmate”, …) are rejected.
- No chain-of-thought is ever exposed — the UI shows staged progress only.

## How the score works

```
Communication        20%
Emotional Engagement 20%
Mutual Interest      20%
Consistency          15%
Conflict Resolution  15%
Future Orientation   10%
```

The overall score is the weighted sum of the six dimensions. Dimensions the
AI could not assess fall back to conservative rule-based estimates computed
from deterministic conversation statistics (message balance, reply latency,
initiation ratio, …) and are labeled “estimated” in the report.

> This score is an AI-generated heuristic, not a scientific probability.

## Contributing

Issues and pull requests are welcome. Please:

1. Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`
   before submitting.
2. Keep privacy guarantees intact — never persist user data or log user content.
3. Add tests for new parsing/scoring logic.

## License

MIT — see [LICENSE](LICENSE).
