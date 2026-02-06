# Hackathon Starter

Minimal Next.js fullstack app demonstrating Claude Agent SDK running in Moru sandboxes. Features a chat UI and workspace file explorer adapted from [maru.moru.io](https://maru.moru.io).

## Prerequisites

- **Node.js 20+** and **pnpm** — [nodejs.org](https://nodejs.org), install pnpm via `npm install -g pnpm`
- **PostgreSQL** — local instance or a hosted provider (Neon, Supabase, Railway, etc.)
- **Moru API key** — sign up at [moru.io/dashboard](https://moru.io/dashboard)
- **Anthropic API key** — get one at [console.anthropic.com](https://console.anthropic.com)
- **ngrok** — required for local development so sandbox callbacks can reach your machine. Get it at [ngrok.com](https://ngrok.com)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (e.g. `postgresql://postgres:postgres@localhost:5432/hackathon`) |
| `MORU_API_KEY` | Moru API key for sandbox creation and volume file operations |
| `ANTHROPIC_API_KEY` | Anthropic API key — embedded in the agent template via `.credentials.json` |
| `BASE_URL` | Callback URL for sandbox → your app. Local dev: your ngrok URL. Production: your deployed URL |

Copy the example and fill in your values:

```bash
cp .env.example .env
```

## Local Development

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up the database

```bash
pnpm db:push
```

### 3. Build the agent template

The agent runs inside a Moru sandbox. You need to build and push the Docker template to Moru. This does **not** require Docker locally — Moru builds it remotely.

```bash
pnpm build:template
```

This uploads the `agent/Dockerfile` to Moru and registers it as the `hackathon-ts-agent` template.

> **Note:** A pre-built `hackathon-ts-agent` template is also available on Moru, so you can skip this step if you don't need to customize the agent.

### 4. Start ngrok

In a separate terminal, expose your local server:

```bash
ngrok http 3000
```

Copy the forwarding URL (e.g. `https://abc123.ngrok-free.app`) and set it as `BASE_URL` in your `.env`.

### 5. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy (Vercel)

### 1. Set up a PostgreSQL database

Use any PostgreSQL provider — [Neon](https://neon.tech), [Supabase](https://supabase.com), [Railway](https://railway.com), or any other. Copy the connection string.

### 2. Deploy to Vercel

```bash
npm i -g vercel
vercel login
vercel
```

### 3. Configure environment variables

```bash
vercel env add DATABASE_URL production
vercel env add MORU_API_KEY production
vercel env add ANTHROPIC_API_KEY production
vercel env add BASE_URL production   # Your production URL, e.g. https://your-app.vercel.app
```

### 4. Push the database schema

```bash
DATABASE_URL="your-connection-string" npx prisma db push
```

### 5. Deploy to production

```bash
vercel --prod
```

## Project Structure

```
hackathon-starter/
├── app/
│   ├── page.tsx                        # Main chat + workspace UI
│   └── api/conversations/              # API routes
├── agent/
│   ├── src/agent.ts                    # Agent entry point (Claude Agent SDK)
│   ├── template.ts                     # Builds Docker image on Moru
│   └── Dockerfile                      # Agent container definition
├── components/
│   ├── chat/                           # Message display, prompt form
│   └── workspace/                      # File explorer, file viewer
├── lib/
│   ├── moru.ts                         # Moru SDK helpers (Volume, Sandbox, files)
│   ├── db.ts                           # Prisma client
│   ├── types.ts                        # TypeScript types
│   └── session-parser.ts              # Parse Claude Code JSONL sessions
├── prisma/
│   └── schema.prisma                   # Conversation model
└── package.json
```

## Customizing the Agent

The agent code lives in `agent/src/agent.ts`. The main customization point is the `query()` call:

```typescript
for await (const message of query({
  prompt,
  options: {
    allowedTools: ["Read", "Write", "Edit", "Bash", "Grep", "Glob"],
    permissionMode: "bypassPermissions",
    allowDangerouslySkipPermissions: true,
    cwd: workspace,
    resume: sessionIdToResume,
  },
})) {
  // ...
}
```

### Changing allowed tools

Modify the `allowedTools` array to control what the agent can do:

```typescript
allowedTools: ["Read", "Write", "Edit", "Bash", "Grep", "Glob"]
```

Remove `"Bash"` to prevent shell access, or remove `"Write"` and `"Edit"` for read-only mode.

### Adding a system prompt

Add a `systemPrompt` option to give the agent custom instructions:

```typescript
options: {
  systemPrompt: "You are a Python specialist. Always write tests for your code.",
  // ...
}
```

Or extend the default Claude Code prompt:

```typescript
options: {
  systemPrompt: {
    type: "preset",
    preset: "claude_code",
    append: "Always explain your reasoning before making changes.",
  },
  // ...
}
```

### Other useful options

| Option | Description |
|--------|-------------|
| `model` | Model to use (e.g. `"claude-sonnet-4-5-20250929"`) |
| `maxTurns` | Limit the number of conversation turns |
| `maxBudgetUsd` | Set a max cost budget in USD |
| `agents` | Define named subagents with their own prompts and tools |
| `mcpServers` | Connect MCP servers for additional tool capabilities |

See the full [Claude Agent SDK docs](https://platform.claude.com/docs/en/agent-sdk/typescript) for all options.

## Agent Credentials

The agent running inside the Moru sandbox needs Anthropic credentials. There are two approaches:

### Option A: `.credentials.json` (baked into template)

The Dockerfile copies `agent/.credentials.json` into the image. To generate this file, run `claude login` locally and copy `~/.claude/.credentials.json` to `agent/.credentials.json`. Then rebuild the template with `pnpm build:template`.

### Option B: `ANTHROPIC_API_KEY` environment variable

Set the API key as an environment variable when creating the sandbox. This avoids baking credentials into the Docker image. Pass it through the sandbox environment in `lib/moru.ts`.

## Troubleshooting

**"Can't reach database server"**
- Verify your `DATABASE_URL` is correct and the database is running
- For hosted providers (Supabase, Neon), make sure you're using the correct connection string format — Supabase requires the pooler/transaction URL for serverless

**Agent callback fails (ECONNREFUSED)**
- Your `BASE_URL` must be reachable from the Moru sandbox. For local dev, use ngrok — `http://localhost:3000` won't work since the sandbox runs remotely
- Make sure ngrok is running and the URL in `.env` matches the current ngrok session

**Workspace panel shows no files**
- The agent may still be running — files appear after the agent writes them
- Check that the conversation has a `volumeId` in the database

**"MORU_API_KEY not set"**
- Add the variable to your `.env` for local dev or `vercel env add` for production
- Redeploy after adding environment variables on Vercel

**Template build fails**
- Ensure `MORU_API_KEY` is set in your `.env`
- Check that `agent/src/agent.ts` exists and compiles without errors

**Vercel shows authentication page instead of your app**
- Use the production alias URL (e.g. `your-app.vercel.app`), not the deployment-specific URL with a random hash
