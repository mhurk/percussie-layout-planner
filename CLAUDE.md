# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page web app for planning the physical layout of a percussion ensemble (samba/bateria style: shakers, snares, repi, tamborim, timba, dans, aanzwaaier, and sectioned players 1a/2a/3a). Users drag instrument tiles from a palette onto a board to arrange player positions, optionally title the layout, then export/import it as JSON or export a PNG snapshot.

Plain HTML/CSS/JS, no build step, no framework, no dependencies. It's also an installable PWA (see below) — that's the "Android app" story: no native/Capacitor project, no Android SDK involved.

## Running

Open `index.html` directly, or serve it (recommended — the service worker requires http(s)/localhost and won't register at all under `file://`):

```
python -m http.server 8791
```

then visit `http://localhost:8791`.

To try it as an installed app on a phone, the dev machine and phone need to be on the same network and the phone browses to `http://<dev-machine-LAN-IP>:8791` (not `localhost`); for anything beyond local testing, deploy the static files to any static host (GitHub Pages, Netlify, etc.) — no server-side code required.

There is no test suite, linter, or build/bundle step.

## PWA / "Android app"

Installability comes from three files, all static and hand-written (no `npx`/CLI-generated boilerplate to keep in sync):

- `manifest.json` — name, icons, `display: standalone`, `theme_color`/`background_color`. Referenced from `index.html` via `<link rel="manifest">`.
- `icons/icon-192.png` / `icons/icon-512.png` — generated with ImageMagick (`magick -size 512x512 xc:'#f4f1ea' -fill ... -draw 'roundrectangle ...' ...`), not checked-in source art; regenerate with the same tile-cluster motif (the four palette colors) if the icon needs to change, no editor required.
- `sw.js` — a cache-first service worker caching the app shell (`APP_SHELL` array); bump `CACHE_NAME` whenever any cached file's contents change, or returning visitors keep the stale version. Registered from `app.js` (`navigator.serviceWorker.register("./sw.js")`, gated on `"serviceWorker" in navigator`).

On Android/Chrome, visiting the hosted URL prompts "Add to Home Screen" (or use the menu); the installed app opens `display: standalone` (no browser chrome) and keeps working offline via the service worker cache. There is no `.apk` and no Play Store listing — if that's ever needed, wrapping this same static site with Capacitor is the natural next step, but it requires installing the Android SDK/Gradle/a JDK 17+ locally (none of that is set up in this repo or assumed by it today).

The header toolbar wraps (`flex-wrap: wrap` on `.toolbar`) specifically because phone-width viewports are narrower than the `#palette`'s existing `700px` mobile breakpoint accounts for — without it the buttons overflowed the screen instead of wrapping to a second line.

## Architecture

No modules/bundler:

- `index.html` — page shell: header/toolbar, `#board-wrap` (holds the `#layout-title` text input and `#board` canvas), `#palette` (sidebar), plus a `#ghost` element used while dragging from the palette. Also carries the PWA `<link rel="manifest">`/`theme-color`/icon tags.
- `style.css` — all styling, including the `.tile` (placed instrument) and `.palette-item` (source item) visuals, and the drag ghost. Note `.tile` itself has no `overflow: hidden` — that lives on the inner `.tile-content` wrapper instead, so the `.tile-remove` (×) button, which is deliberately positioned partway outside the tile's box (`top:-8px; right:-8px`), stays fully visible and clickable instead of being clipped by the tile's own bounds.
- `app.js` — all behavior. Key pieces:
  - `INSTRUMENTS` — the instrument legend (type id, display label, color). This mirrors `instruments.txt` and is the single source of truth the rest of the app reads from (palette rendering, tile coloring/labeling, import validation).
  - `tiles` — in-memory app state: an array of `{ uid, type, x, y }`, where `x`/`y` are percentages of the board's dimensions (not pixels), so layouts stay valid across board/window resizes.
  - `titleInput` (`#layout-title`) — free-text layout title, read directly from the DOM rather than mirrored into a JS variable. Flows into JSON export/import (`data.title`), the PNG title bar, and export filenames (via `exportBaseName()`/`slugify()`).
  - `TILE_SIZE` (72px) — all tiles are rendered at this fixed square size (set in both `style.css`'s `.tile` and here) regardless of label length; long labels wrap instead of growing the tile. Keep these two in sync if you change it.
  - Dragging is implemented with Pointer Events, not the HTML5 Drag-and-drop API — this covers both mouse and touch uniformly:
    - Dragging a palette item shows the `#ghost` element following the pointer; dropping over `#board` appends a new tile to `tiles` at that position.
    - Dragging an existing `.tile` updates its `x`/`y` in place (uses `setPointerCapture` so the drag tracks correctly outside the tile's bounds).
  - `renderBoard()` fully re-renders `#board` from `tiles` on every state change (add/move/remove/import/align) — there's no incremental DOM diffing, which is fine at this scale.
  - `alignRows()` — tidies up an existing hand-placed layout without relocating it to a full-board grid: clusters tiles into rows by proximity in `y` (tolerance `TILE_SIZE + ROW_GAP_PX`, in `%`), then re-lays the rows out as a stack with equal vertical distance between every row (`TILE_SIZE + ROW_GAP_PX` gap, centered on the original average row position) and every row's tiles evenly spaced (`TILE_SIZE + TILE_GAP_PX` gap) around one shared horizontal center line (the average `x` across *all* tiles) — so rows line up with each other rather than each keeping its own center.
  - Export/Import round-trips `tiles` and `title` as JSON (`{ version, title, tiles: [{ uid, type, x, y }] }`) via a downloaded file and a hidden file input; import re-validates each tile's `type` against `INSTRUMENTS` and clamps `x`/`y` into `[0, 100]`, discarding anything that doesn't match, and restores the title verbatim.
  - `exportPNG()` — renders the current board to an off-screen `<canvas>` at 2x scale (optional title bar when `titleInput` is non-empty, background grid, rounded-rect tiles, wrapped labels via `wrapText()`/`drawRoundedRect()`) and downloads it. This is a from-scratch redraw mirroring the CSS, not a screenshot of the DOM (no `html2canvas`-style dependency) — if tile visuals change in CSS, mirror the change here too. The canvas is sized to the tiles' own bounding box plus `PNG_PADDING_PX`, not the full (often much larger, mostly-empty) `#board` element — so the export frames the instruments tightly and the title, drawn at `canvas.width / 2`, ends up centered over them rather than over empty board space.

## Source data

- `instruments.txt` — the original numbered instrument legend that `INSTRUMENTS` in `app.js` mirrors. If instrument types change, update both.
- `layout.jpeg` — reference photo of a hand-arranged paper layout (the physical version of what this app replaces).

When adding a new instrument type, update `INSTRUMENTS` in `app.js` (and ideally `instruments.txt` to keep it as the canonical legend).
