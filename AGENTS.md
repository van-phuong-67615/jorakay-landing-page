# Project instructions

- Always read docs/PROJECT_CONTEXT.md before changes and docs/design.md before UI changes.
- Follow architecture and naming conventions. Keep TypeScript strict.
- Use React Hook Form + Zod; do not add unnecessary dependencies.
- Phase 2 was approved by the user on 2026-10-20. Use the server API → signed Apps Script → customer-owned Sheet flow; do not introduce unrelated integrations.
- Never log personal data or secrets. Show success only after a matching saved/duplicate receipt. Preserve idempotency IDs when retrying uncertain submissions.
- Update documentation after significant changes; avoid unrelated modifications.
- Run lint, typecheck and production build before declaring completion.
- graphify: when the user invokes /graphify, read the graphify skill first and follow its workflow. Query an existing graph before codebase exploration when applicable.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
