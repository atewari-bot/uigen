# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. Users describe components in chat, Claude generates React/JSX code using tools, and the result renders in a live preview iframe. All code lives in a virtual file system (no disk writes).

## Commands

```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Run all tests (Vitest)
npm run setup        # Install deps + Prisma generate + migrations
npm run db:reset     # Reset database (destructive)
```

Run a single test file:
```bash
npx vitest src/lib/__tests__/file-system.test.ts
```

## Architecture

### Core Flow
1. User describes component in chat interface
2. `/api/chat` endpoint streams Claude's response using Vercel AI SDK
3. Claude uses two tools (`str_replace_editor`, `file_manager`) to create/edit files
4. Files stored in `VirtualFileSystem` (in-memory tree structure)
5. JSX transformed via Babel standalone, rendered in preview iframe
6. Authenticated users get projects persisted to SQLite via Prisma

### Key Directories
- `src/app/` - Next.js App Router pages and API routes
- `src/components/` - React components (chat/, editor/, preview/, auth/, ui/)
- `src/lib/` - Core logic: file system, AI tools, contexts, prompts, transforms
- `src/actions/` - Server Actions for auth and projects
- `prisma/` - Database schema and migrations

### State Management
- `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`) - Virtual file tree state; exposes `handleToolCall()` which processes AI tool results and increments `refreshTrigger` to force dependent component re-renders
- `ChatContext` (`src/lib/contexts/chat-context.tsx`) - Wraps Vercel AI SDK `useChat()`; sends serialized file system in every request body; calls `handleToolCall()` on each tool result

### AI Integration
- Provider: `src/lib/provider.ts` — uses `claude-haiku-4-5`; falls back to `MockLanguageModel` when `ANTHROPIC_API_KEY` is absent. The mock generates deterministic components (Counter, ContactForm, Card) by simulating multi-step tool calls, making full local dev possible without an API key.
- System prompt: `src/lib/prompts/generation.tsx` — instructs Claude to always create `/App.jsx` as the entry point, use `@/` imports, and style exclusively with Tailwind
- Tools: `src/lib/tools/str-replace.ts` (`view`, `create`, `str_replace`, `insert`), `src/lib/tools/file-manager.ts` (`rename`, `delete`)
- `/api/chat` allows up to 40 tool steps (4 for mock) and applies Anthropic prompt caching (`ephemeral`) on the system prompt

### Preview Rendering
`PreviewFrame.tsx` detects the entry point via fallback chain (`/App.jsx` → `/App.tsx` → `/index.jsx` → first `.jsx`), transforms JSX with Babel standalone, generates an import map using esm.sh CDN for external packages and blob URLs for local files, then writes a full HTML document into a sandboxed iframe.

### SSR Boundary
`main-content-wrapper.tsx` uses `next/dynamic` with `ssr: false` to prevent hydration mismatches — the virtual file system is entirely client-side state.

### Database
The database schema is defined in `prisma/schema.prisma`. Reference it anytime you need to understand the structure of data stored in the database. SQLite with Prisma. Two models:
- `User` - email, hashed password, projects relation
- `Project` - name, messages (JSON string), data (serialized file system); `userId` is optional to support anonymous project snapshots

### Authentication
JWT (HS256, 7-day expiry) stored in httpOnly cookies. `src/lib/auth.ts` handles session creation/verification. Middleware (`src/middleware.ts`) protects `/api/projects` and `/api/filesystem` routes.

## Environment Variables

- `ANTHROPIC_API_KEY` - Optional; without it, mock provider returns static code
- `JWT_SECRET` - Optional; defaults to development key

## Code Style

- Use comments sparingly. Only comment complex code.
- Use camelCase for class names.

## Testing

Vitest with jsdom. Tests colocated in `__tests__/` directories. Use React Testing Library for component tests. `src/lib/__tests__/file-system.test.ts` is the most comprehensive suite.

## Key Extension Points

- **New AI tool**: Add builder to `src/lib/tools/`, register in `src/app/api/chat/route.ts`, handle in `FileSystemContext.handleToolCall()`
- **UI layout**: `src/app/main-content.tsx` owns the `react-resizable-panels` three-way split
- **System prompt changes**: `src/lib/prompts/generation.tsx`
