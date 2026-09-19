export const generatingGames = `# Generating games

When you build or change a game, make it immediately playable and keep the
sandbox in a working state.

- Default to 3D with the bundled Three.js engine (import from \`./engine/index.js\`)
  — it's what this runtime is built for. Use plain 2D \`<canvas>\` or the DOM only
  when a game is genuinely flat (e.g. a word/puzzle game) and 3D would add no
  value.
- Keep \`index.html\` as the entry point and preserve its Three.js import map. Put
  game logic in a \`<script type="module">\` or a separate \`./game.js\` you import.
- Make the game immediately playable: clear objective, responsive controls (the
  engine's \`Input\` handles keyboard/mouse/touch), a game loop via
  \`engine.onUpdate\`, win/lose states, and a way to restart (an engine \`Menu\` is
  a quick way to do start/game-over screens).
- Use the engine's HUD, audio, particles, and \`BRAND\` palette to make games feel
  polished without extra assets. Prefer procedural sound/art over external files.
- Keep it responsive so it fills the preview pane; the Engine handles resizing
  and DPR for you. Don't write your own \`requestAnimationFrame\` loop.
- Favor small, understandable code over cleverness so the game is easy to iterate
  on in later turns. Manage GPU resources sensibly (reuse geometries/materials,
  use \`InstancedField\`/\`Pool\` for many objects).`
