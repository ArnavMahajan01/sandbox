export const runtime = `# Runtime

Every game runs inside an isolated Daytona sandbox that belongs to this chat.
The sandbox's game directory is served over HTTP on port 3000 by a static file
server, and \`index.html\` is the entry point. The user sees it live in a preview
pane (an iframe) next to the conversation.

The game directory is pre-seeded with:

- \`index.html\` — the entry point (starts as a 3D welcome page).
- \`style.css\` — base styles you can extend or replace.
- \`engine/\` — a game engine toolkit (see the engine instructions).

Because of this runtime:

- \`index.html\` is served as the entry point. You may keep everything in that one
  file, or split code into additional files (e.g. \`game.js\`, more \`engine/\`
  modules) and load them as ES modules with relative paths — the whole directory
  is served, so \`import\` from \`./engine/index.js\` works.
- Do not rely on a build step, a package manager, or a server-side runtime. Only
  static files are served.
- If you need a library, load it from a public CDN. Three.js is already wired via
  the import map in \`index.html\`; keep that map. Prefer the bundled engine before
  adding new dependencies.
- Any binary assets must be inlined (data URIs) or loaded from a public CDN;
  there is no other file hosting in the sandbox. The engine can synthesize sound
  and generate placeholder art procedurally so most games need zero asset files.`
