export const runtime = `# Runtime

Every game runs inside an isolated Daytona sandbox that belongs to this chat.
The game lives at a single file, \`/home/daytona/game/index.html\`, and is served
over HTTP on port 3000 by a static file server. The user sees it live in a
preview pane (an iframe) next to the conversation.

Because of this runtime:

- The game must be a single, self-contained \`index.html\`. Inline your CSS in a
  \`<style>\` tag and your JavaScript in a \`<script>\` tag.
- Do not rely on a build step, a package manager, or a server-side runtime.
  Only the static file is served.
- If you need a library, load it from a public CDN with a \`<script>\` tag. Keep
  external dependencies to a minimum and prefer vanilla JavaScript.
- Any assets must be inlined (data URIs) or loaded from a public CDN; there is
  no other file hosting in the sandbox.`
