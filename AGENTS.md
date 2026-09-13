<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Drizzle schema changes

This project is in active development and does not need backwards-compatible database migrations.

- Apply schema changes with `npm run db:push` (`drizzle-kit push`).
- Do not run `drizzle-kit migrate`, `npm run db:migrate`, or `drizzle-kit generate`.
- Do not create or commit a `drizzle/` migrations folder.

When a change replaces a table outright (drop one, add another), db:push cannot tell a new table from a rename and stops on an interactive prompt that needs a TTY. Drop the obseletes table first, then push -that removes the ambiguity and push runs unattended.
