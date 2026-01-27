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
- `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`) - Virtual file tree state
- `ChatContext` (`src/lib/contexts/chat-context.tsx`) - Messages and streaming state

### AI Integration
- Provider: `src/lib/provider.ts` (Claude Haiku 4.5, falls back to mock without API key)
- System prompt: `src/lib/prompts/generation.tsx`
- Tools: `src/lib/tools/str-replace.ts`, `src/lib/tools/file-manager.ts`

### Database
SQLite with Prisma. Two models:
- `User` - email, hashed password, projects relation
- `Project` - name, messages (JSON string), data (serialized file system)

## Environment Variables

- `ANTHROPIC_API_KEY` - Optional; without it, mock provider returns static code
- `JWT_SECRET` - Optional; defaults to development key

## Testing

Vitest with jsdom. Tests colocated in `__tests__/` directories. Use React Testing Library for component tests.
