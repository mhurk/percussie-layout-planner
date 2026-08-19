# Percussie Layout Planner

A drag-and-drop web app for planning the physical layout of a percussion ensemble (samba/bateria style: shakers, snares, repi, tamborim, timba, dans, aanzwaaier, and sectioned players 1a/2a/3a).

**Live app:** https://mhurk.github.io/percussie-layout-planner/

Works as an installable PWA — open the link above in Chrome on Android and use "Add to Home Screen" for a full-screen, offline-capable app icon.

## Features

- Drag instruments from the palette onto the board to arrange player positions
- Drag existing tiles to reposition them; remove with the × button
- **Align rows** — tidies up a hand-placed layout: rows get equal vertical spacing and share one horizontal center, without relocating the layout to a full-board grid
- Give the layout a title (shown on the board and in exports)
- **Export JSON** — save a layout to a file, **Import JSON** to load it back
- **Export PNG** — a cropped snapshot of just the instruments, titled, ready to share

## Running locally

No build step — plain HTML/CSS/JS. Serve the folder (a plain static server is enough; the service worker needs http(s)/localhost and won't register under `file://`):

```
python -m http.server 8791
```

then visit `http://localhost:8791`.

## Deploying

Static files only — push to any static host. This repo deploys via GitHub Pages from the `main` branch root.
