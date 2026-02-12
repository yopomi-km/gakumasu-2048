const SIZE = 4;

const gridEl = document.getElementById("grid");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const overlayEl = document.getElementById("overlay");
const overlayTextEl = document.getElementById("overlayText");
const newGameBtn = document.getElementById("newGame");
const restartBtn = document.getElementById("restart");
const modeKBtn = document.getElementById("modeK");
const modeGBtn = document.getElementById("modeG");
const shareBtn = document.getElementById("shareScore");

let tiles = [];
let gridValues = [];
let score = 0;
let best = Number(localStorage.getItem("best2048")) || 0;
let moving = false;
let tileId = 1;
let layoutReady = false;
let imagePrefix = "k";
const imageVersion = "20260212";

const colors = {
  2: "#2a4d8f",
  4: "#2c6aa1",
  8: "#2f86b0",
  16: "#3a9ca6",
  32: "#45b38e",
  64: "#5ac36f",
  128: "#b0c553",
  256: "#d2b743",
  512: "#e29a3c",
  1024: "#e2753f",
  2048: "#d94f48",
};

function init() {
  tiles = [];
  gridValues = emptyGrid();
  score = 0;
  updateScore(0);
  overlayEl.classList.add("hidden");
  syncGridMetrics();
  addRandomTile();
  addRandomTile();
  render();
}

function emptyGrid() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function updateScore(delta) {
  score += delta;
  scoreEl.textContent = score;
  if (score > best) {
    best = score;
    localStorage.setItem("best2048", best);
  }
  bestEl.textContent = best;
}

function addRandomTile() {
  const empty = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (gridValues[r][c] === 0) empty.push([r, c]);
    }
  }
  if (!empty.length) return false;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const value = Math.random() < 0.9 ? 2 : 4;
  const tile = createTile(value, r, c);
  tile.isNew = true;
  tiles.push(tile);
  gridValues[r][c] = value;
  return true;
}

function createTile(value, row, col) {
  return {
    id: tileId++,
    value,
    row,
    col,
    prevRow: row,
    prevCol: col,
    remove: false,
    isNew: false,
  };
}

function render() {
  if (!layoutReady) syncGridMetrics();
  let gridBg = gridEl.querySelector(".grid-bg");
  let tileLayer = gridEl.querySelector(".tile-layer");
  if (!gridBg) {
    gridEl.innerHTML = "";
    gridBg = document.createElement("div");
    gridBg.className = "grid-bg";
    for (let i = 0; i < SIZE * SIZE; i++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      gridBg.appendChild(cell);
    }
    tileLayer = document.createElement("div");
    tileLayer.className = "tile-layer";
    gridEl.appendChild(gridBg);
    gridEl.appendChild(tileLayer);
  }
  tileLayer.innerHTML = "";

  const elements = [];
  for (const tile of tiles) {
    const tileEl = document.createElement("div");
    tileEl.className = "tile";
    if (tile.isNew) tileEl.classList.add("spawn");
    tileEl.textContent = "";
    tileEl.style.backgroundImage = `url(\"images/${imagePrefix}_${tile.value}.png?v=${imageVersion}\")`;
    tileEl.style.setProperty("--row", tile.prevRow ?? tile.row);
    tileEl.style.setProperty("--col", tile.prevCol ?? tile.col);
    tileLayer.appendChild(tileEl);
    elements.push([tileEl, tile]);
  }

  requestAnimationFrame(() => {
    for (const [tileEl, tile] of elements) {
      tileEl.style.setProperty("--row", tile.row);
      tileEl.style.setProperty("--col", tile.col);
    }
  });

  for (const tile of tiles) {
    tile.isNew = false;
    tile.prevRow = tile.row;
    tile.prevCol = tile.col;
  }
}

function syncGridMetrics() {
  const gapValue = getComputedStyle(gridEl).getPropertyValue("--gap");
  const gap = parseFloat(gapValue) || 10;
  const width = gridEl.clientWidth;
  if (width === 0) return;
  const cell = (width - gap * 3) / 4;
  gridEl.style.setProperty("--cell", `${cell}px`);
  gridEl.style.setProperty("--gap", `${gap}px`);
  layoutReady = true;
}

function getLinePositions(dir, index) {
  const positions = [];
  for (let i = 0; i < SIZE; i++) {
    if (dir === "left") positions.push([index, i]);
    if (dir === "right") positions.push([index, SIZE - 1 - i]);
    if (dir === "up") positions.push([i, index]);
    if (dir === "down") positions.push([SIZE - 1 - i, index]);
  }
  return positions;
}

function move(dir) {
  if (moving) return;
  moving = true;

  for (const tile of tiles) {
    tile.prevRow = tile.row;
    tile.prevCol = tile.col;
    tile.remove = false;
  }

  let moved = false;
  const animTiles = [];
  const mergedTiles = [];
  const tileMap = new Map();
  for (const tile of tiles) {
    tileMap.set(`${tile.row},${tile.col}`, tile);
  }

  for (let index = 0; index < SIZE; index++) {
    const positions = getLinePositions(dir, index);
    const lineTiles = positions
      .map(([r, c]) => tileMap.get(`${r},${c}`))
      .filter(Boolean);

    let target = 0;
    for (let i = 0; i < lineTiles.length; i++) {
      const current = lineTiles[i];
      const next = lineTiles[i + 1];

      if (next && current.value === next.value) {
        const [tr, tc] = positions[target];
        current.row = tr;
        current.col = tc;
        current.remove = true;
        next.row = tr;
        next.col = tc;
        next.remove = true;
        animTiles.push(current, next);

        const merged = createTile(current.value * 2, tr, tc);
        merged.isNew = true;
        mergedTiles.push(merged);
        updateScore(merged.value);
        moved = true;
        i++;
        target++;
      } else {
        const [tr, tc] = positions[target];
        if (current.row !== tr || current.col !== tc) moved = true;
        current.row = tr;
        current.col = tc;
        animTiles.push(current);
        target++;
      }
    }
  }

  if (!moved) {
    moving = false;
    return;
  }

  tiles = animTiles;
  render();
  setTimeout(() => {
    tiles = tiles.filter((tile) => !tile.remove).concat(mergedTiles);
    gridValues = emptyGrid();
    for (const tile of tiles) {
      gridValues[tile.row][tile.col] = tile.value;
    }
    addRandomTile();
    render();

    if (!movesAvailable()) {
      overlayTextEl.textContent = "Game Over";
      overlayEl.classList.remove("hidden");
    }
    if (has2048()) {
      overlayTextEl.textContent = "You Win!";
      overlayEl.classList.remove("hidden");
    }
    moving = false;
  }, 160);
}

function movesAvailable() {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (gridValues[r][c] === 0) return true;
      if (c < SIZE - 1 && gridValues[r][c] === gridValues[r][c + 1]) return true;
      if (r < SIZE - 1 && gridValues[r][c] === gridValues[r + 1][c]) return true;
    }
  }
  return false;
}

function has2048() {
  return gridValues.some((row) => row.some((n) => n === 2048));
}

function handleKey(e) {
  const key = e.key.toLowerCase();
  if (["arrowleft", "a"].includes(key)) move("left");
  if (["arrowright", "d"].includes(key)) move("right");
  if (["arrowup", "w"].includes(key)) move("up");
  if (["arrowdown", "s"].includes(key)) move("down");
}

let touchStart = null;
function handleTouchStart(e) {
  const t = e.touches[0];
  touchStart = { x: t.clientX, y: t.clientY };
}
function handleTouchMove(e) {
  if (!touchStart) return;
  e.preventDefault();
}
function handleTouchEnd(e) {
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (Math.max(absX, absY) < 20) return;
  if (absX > absY) move(dx > 0 ? "right" : "left");
  else move(dy > 0 ? "down" : "up");
  touchStart = null;
}

newGameBtn.addEventListener("click", init);
restartBtn.addEventListener("click", init);
shareBtn.addEventListener("click", () => {
  const modeLabel = imagePrefix === "k" ? "好印象" : "やる気";
  const text = `学マス2048でスコア ${score} を達成！モード: ${modeLabel} #学マス2048`;
  const url = "https://yopomi-km.github.io/gakumasu-2048/";
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    text
  )}&url=${encodeURIComponent(url)}`;
  window.open(shareUrl, "_blank", "noopener,noreferrer");
});
modeKBtn.addEventListener("click", () => {
  imagePrefix = "k";
  modeKBtn.classList.add("active");
  modeGBtn.classList.remove("active");
  render();
});
modeGBtn.addEventListener("click", () => {
  imagePrefix = "g";
  modeGBtn.classList.add("active");
  modeKBtn.classList.remove("active");
  render();
});
window.addEventListener("keydown", handleKey);
gridEl.addEventListener("touchstart", handleTouchStart, { passive: true });
gridEl.addEventListener("touchmove", handleTouchMove, { passive: false });
gridEl.addEventListener("touchend", handleTouchEnd, { passive: true });
window.addEventListener("resize", () => {
  layoutReady = false;
  syncGridMetrics();
  render();
});

init();
