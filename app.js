// Instrument legend mirrors instruments.txt (id, name, color).
const INSTRUMENTS = [
  { type: "1a", label: "1a", color: "#e6194b" },
  { type: "2a", label: "2a", color: "#3cb44b" },
  { type: "3a", label: "3a", color: "#4363d8" },
  { type: "snare", label: "Snare", color: "#f58231" },
  { type: "repi", label: "Repi", color: "#911eb4" },
  { type: "tamborim", label: "Tamborim", color: "#0e9aa7" },
  { type: "shaker", label: "Shaker", color: "#c724b1" },
  { type: "timba", label: "Timba", color: "#6a9e08" },
  { type: "dans", label: "Dans", color: "#008080" },
  { type: "aanzwaaier", label: "Aanzwaaier", color: "#9a6324" },
];

const instrumentsByType = Object.fromEntries(INSTRUMENTS.map((i) => [i.type, i]));

// Must match the .tile width/height in style.css so on-screen layout and PNG export agree.
const TILE_SIZE = 72;
// Used by alignRows(): horizontal gap between tiles in a row, and the vertical
// tolerance for treating two tiles as being "in the same row".
const TILE_GAP_PX = 14;
const ROW_GAP_PX = 10;

const board = document.getElementById("board");
const palette = document.getElementById("palette");
const ghost = document.getElementById("ghost");
const alignBtn = document.getElementById("align-btn");
const exportBtn = document.getElementById("export-btn");
const exportPngBtn = document.getElementById("export-png-btn");
const importInput = document.getElementById("import-input");
const clearBtn = document.getElementById("clear-btn");
const titleInput = document.getElementById("layout-title");

let tiles = []; // { uid, type, x, y } x/y are % of board size
let uidCounter = 0;
const nextUid = () => `t${++uidCounter}`;

function slugify(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function exportBaseName() {
  const slug = slugify(titleInput.value);
  return slug || "percussie-layout";
}

function renderPalette() {
  const hint = document.createElement("p");
  hint.className = "palette-hint";
  hint.textContent = "Drag an instrument onto the board.";
  palette.appendChild(hint);

  for (const instrument of INSTRUMENTS) {
    const item = document.createElement("div");
    item.className = "palette-item";
    item.dataset.type = instrument.type;

    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.background = instrument.color;

    const label = document.createElement("span");
    label.textContent = instrument.label;

    item.append(swatch, label);
    item.addEventListener("pointerdown", (e) => startPaletteDrag(e, instrument.type));
    palette.appendChild(item);
  }
}

function tileLabelFor(uid, type) {
  const sameType = tiles.filter((t) => t.type === type);
  const index = sameType.findIndex((t) => t.uid === uid);
  return sameType.length > 1 ? `${instrumentsByType[type].label} ${index + 1}` : instrumentsByType[type].label;
}

function renderBoard() {
  board.innerHTML = "";
  for (const tile of tiles) {
    const instrument = instrumentsByType[tile.type];
    const el = document.createElement("div");
    el.className = "tile";
    el.style.left = `${tile.x}%`;
    el.style.top = `${tile.y}%`;
    el.style.background = instrument.color;
    el.dataset.uid = tile.uid;

    const content = document.createElement("div");
    content.className = "tile-content";
    const labelEl = document.createElement("span");
    labelEl.className = "tile-label";
    labelEl.textContent = tileLabelFor(tile.uid, tile.type);
    content.appendChild(labelEl);
    el.appendChild(content);

    const removeBtn = document.createElement("button");
    removeBtn.className = "tile-remove";
    removeBtn.type = "button";
    removeBtn.textContent = "×";
    removeBtn.setAttribute("aria-label", "Remove tile");
    removeBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
    removeBtn.addEventListener("click", () => {
      tiles = tiles.filter((t) => t.uid !== tile.uid);
      renderBoard();
    });
    el.appendChild(removeBtn);

    el.addEventListener("pointerdown", (e) => startTileDrag(e, tile.uid));
    board.appendChild(el);
  }
}

function clampPercent(value) {
  return Math.min(100, Math.max(0, value));
}

function boardPercentFromClient(clientX, clientY) {
  const rect = board.getBoundingClientRect();
  return {
    x: clampPercent(((clientX - rect.left) / rect.width) * 100),
    y: clampPercent(((clientY - rect.top) / rect.height) * 100),
  };
}

function isOverBoard(clientX, clientY) {
  const rect = board.getBoundingClientRect();
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

function startPaletteDrag(e, type) {
  e.preventDefault();
  const instrument = instrumentsByType[type];
  ghost.hidden = false;
  ghost.style.background = instrument.color;
  ghost.textContent = instrument.label;
  moveGhost(e.clientX, e.clientY);

  function onMove(ev) {
    moveGhost(ev.clientX, ev.clientY);
    board.classList.toggle("drag-over", isOverBoard(ev.clientX, ev.clientY));
  }

  function onUp(ev) {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    ghost.hidden = true;
    board.classList.remove("drag-over");
    if (isOverBoard(ev.clientX, ev.clientY)) {
      const { x, y } = boardPercentFromClient(ev.clientX, ev.clientY);
      tiles.push({ uid: nextUid(), type, x, y });
      renderBoard();
    }
  }

  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
}

function moveGhost(clientX, clientY) {
  ghost.style.left = `${clientX}px`;
  ghost.style.top = `${clientY}px`;
}

function startTileDrag(e, uid) {
  e.preventDefault();
  const tileEl = e.currentTarget;
  tileEl.setPointerCapture(e.pointerId);

  function onMove(ev) {
    const { x, y } = boardPercentFromClient(ev.clientX, ev.clientY);
    const tile = tiles.find((t) => t.uid === uid);
    tile.x = x;
    tile.y = y;
    tileEl.style.left = `${x}%`;
    tileEl.style.top = `${y}%`;
  }

  function onUp() {
    tileEl.releasePointerCapture(e.pointerId);
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
  }

  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
}

// Groups tiles that are already roughly in a row, then lays the rows out as a
// clean stack: equal vertical distance between rows, and every row horizontally
// centered on the same shared center line (not each row's own center) — kept
// around the layout's existing position rather than spread across the board.
function alignRows() {
  if (tiles.length === 0) return;
  const rect = board.getBoundingClientRect();
  const spacingXPct = ((TILE_SIZE + TILE_GAP_PX) / rect.width) * 100;
  const spacingYPct = ((TILE_SIZE + ROW_GAP_PX) / rect.height) * 100;

  const sortedByY = [...tiles].sort((a, b) => a.y - b.y);
  const rows = [];
  for (const tile of sortedByY) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(tile.y - row.avgY) <= spacingYPct) {
      row.tiles.push(tile);
      row.avgY = row.tiles.reduce((sum, t) => sum + t.y, 0) / row.tiles.length;
    } else {
      rows.push({ tiles: [tile], avgY: tile.y });
    }
  }

  const centerX = tiles.reduce((sum, t) => sum + t.x, 0) / tiles.length;
  const centerY = rows.reduce((sum, r) => sum + r.avgY, 0) / rows.length;
  const startY = centerY - ((rows.length - 1) * spacingYPct) / 2;

  rows.forEach((row, rowIndex) => {
    const y = clampPercent(startY + rowIndex * spacingYPct);
    const rowTiles = [...row.tiles].sort((a, b) => a.x - b.x);
    const totalWidth = (rowTiles.length - 1) * spacingXPct;
    const startX = centerX - totalWidth / 2;
    rowTiles.forEach((tile, i) => {
      tile.x = clampPercent(startX + i * spacingXPct);
      tile.y = y;
    });
  });

  renderBoard();
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Padding (unscaled CSS px) kept around the tiles' bounding box, so the export
// frames the instruments tightly instead of the board's full (mostly empty) area.
const PNG_PADDING_PX = 32;

function exportPNG() {
  if (tiles.length === 0) {
    alert("Add instruments to the board before exporting a PNG.");
    return;
  }

  const rect = board.getBoundingClientRect();
  const scale = 2; // render at 2x for crisper output
  const title = titleInput.value.trim();

  // Bounding box of the tiles themselves (in unscaled board CSS px), padded out.
  const xsPx = tiles.map((t) => (t.x / 100) * rect.width);
  const ysPx = tiles.map((t) => (t.y / 100) * rect.height);
  const halfTile = TILE_SIZE / 2;
  const minX = Math.min(...xsPx) - halfTile - PNG_PADDING_PX;
  const maxX = Math.max(...xsPx) + halfTile + PNG_PADDING_PX;
  const minY = Math.min(...ysPx) - halfTile - PNG_PADDING_PX;
  const maxY = Math.max(...ysPx) + halfTile + PNG_PADDING_PX;

  const boardWidthPx = Math.round((maxX - minX) * scale);
  const boardHeightPx = Math.round((maxY - minY) * scale);
  const titleBarHeight = title ? Math.round(56 * scale) : 0;

  const canvas = document.createElement("canvas");
  canvas.width = boardWidthPx;
  canvas.height = boardHeightPx + titleBarHeight;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (title) {
    ctx.fillStyle = "#2b2a27";
    ctx.font = `700 ${20 * scale}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(title, canvas.width / 2, titleBarHeight / 2);
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath();
    ctx.moveTo(0, titleBarHeight);
    ctx.lineTo(canvas.width, titleBarHeight);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(0,0,0,0.06)";
  ctx.lineWidth = 1;
  const gridSize = 40 * scale;
  for (let gx = 0; gx <= canvas.width; gx += gridSize) {
    ctx.beginPath();
    ctx.moveTo(gx, titleBarHeight);
    ctx.lineTo(gx, canvas.height);
    ctx.stroke();
  }
  for (let gy = titleBarHeight; gy <= canvas.height; gy += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(canvas.width, gy);
    ctx.stroke();
  }

  const tileSizePx = TILE_SIZE * scale;
  const lineHeight = 13 * scale;
  for (const tile of tiles) {
    const instrument = instrumentsByType[tile.type];
    const cx = ((tile.x / 100) * rect.width - minX) * scale;
    const cy = titleBarHeight + ((tile.y / 100) * rect.height - minY) * scale;

    drawRoundedRect(ctx, cx - tileSizePx / 2, cy - tileSizePx / 2, tileSizePx, tileSizePx, 10 * scale);
    ctx.fillStyle = instrument.color;
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = `600 ${12 * scale}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = tileLabelFor(tile.uid, tile.type);
    const lines = wrapText(ctx, label, tileSizePx - 10 * scale);
    const startY = cy - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, i) => ctx.fillText(line, cx, startY + i * lineHeight));
  }

  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportBaseName()}-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

function exportLayout() {
  const data = {
    version: 1,
    title: titleInput.value.trim(),
    tiles: tiles.map(({ uid, type, x, y }) => ({ uid, type, x, y })),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${exportBaseName()}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importLayout(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.tiles)) throw new Error("Invalid file: missing tiles array");
      const valid = data.tiles.filter((t) => instrumentsByType[t.type] && Number.isFinite(t.x) && Number.isFinite(t.y));
      tiles = valid.map((t) => ({ uid: nextUid(), type: t.type, x: clampPercent(t.x), y: clampPercent(t.y) }));
      titleInput.value = typeof data.title === "string" ? data.title : "";
      renderBoard();
    } catch (err) {
      alert(`Could not import layout: ${err.message}`);
    }
  };
  reader.readAsText(file);
}

alignBtn.addEventListener("click", alignRows);
exportBtn.addEventListener("click", exportLayout);
exportPngBtn.addEventListener("click", exportPNG);
importInput.addEventListener("change", () => {
  const file = importInput.files[0];
  if (file) importLayout(file);
  importInput.value = "";
});
clearBtn.addEventListener("click", () => {
  if (tiles.length === 0 || confirm("Clear all tiles from the board?")) {
    tiles = [];
    renderBoard();
  }
});

renderPalette();
renderBoard();

// Registering from ./sw.js (relative, not "/sw.js") keeps this working when the
// app is served from a subpath (e.g. GitHub Pages project sites). Requires
// http(s)/localhost — silently no-ops under file://, where service workers
// aren't available at all.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((err) => console.warn("Service worker registration failed:", err));
  });
}
