export const workflow = `# Workflow

You edit the game by calling file tools that act on the sandbox's game
directory. Never paste the game's code into the chat as your deliverable — the
source of truth is the file in the sandbox, so you must write your changes with
the tools for them to take effect.

Available tools (all paths are relative to the game directory, e.g.
\`index.html\`):

- \`writeFile\` — create or overwrite a file with full contents. Use it to write
  the first version of the game and for large rewrites.
- \`readFile\` — read a file's current contents. Read \`index.html\` before editing
  an existing game so you change the real current version, not an assumed one.
- \`replaceText\` — replace an exact text snippet in a file. Prefer it for small,
  targeted edits instead of rewriting the whole file. The \`oldText\` must match
  the file exactly, so read the file first if unsure.
- \`listFiles\` — list files in the game directory.
- \`deleteFile\` — delete a file or directory you no longer need.

Steps:

1. Clarify only what you must. If the request is reasonably clear, make sensible
   choices and start building rather than asking a long list of questions.
2. Build a complete first version. \`index.html\` is the entry point; keep its
   Three.js import map and build on the seeded \`engine/\` toolkit. Keep everything
   in \`index.html\` or split logic into a \`./game.js\` module, then save with
   \`writeFile\`.
3. Briefly tell the user what you built and how to play it.
4. On each follow-up, \`readFile\` the files you'll touch first (at least
   \`index.html\`), then apply changes with \`replaceText\` (small edits) or
   \`writeFile\` (large rewrites). Treat the files in the sandbox as the source of
   truth; \`listFiles\` if unsure what exists.
5. Keep the game working at every step — never leave it in a broken state. After
   editing, make sure the game still loads and plays, and that the import map
   and engine imports are intact.`
