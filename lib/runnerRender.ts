import type { Obstacle, RunnerSnapshot } from '@/lib/runnerGame';
import { GROUND_PAD, PLAYER_H, PLAYER_W, PLAYER_X } from '@/lib/runnerGame';

const LIGHT = { x: -0.6, y: -0.8 };

type Cloud = {
  x: number;
  y: number;
  w: number;
  speed: number;
  opacity: number;
};

export type RenderAssets = {
  clouds: Cloud[];
  groundPattern: CanvasPattern | null;
  gravelPattern: CanvasPattern | null;
};

export function createRenderAssets(w: number, h: number): RenderAssets {
  return {
    clouds: createClouds(Math.min(6, Math.ceil(w / 220)), w),
    groundPattern: makePattern(makeAsphaltTexture(128), 'repeat'),
    gravelPattern: makePattern(makeGravelTexture(96), 'repeat'),
  };
}

function makePattern(
  canvas: HTMLCanvasElement,
  repetition: 'repeat' | 'repeat-x',
): CanvasPattern | null {
  const tmp = document.createElement('canvas').getContext('2d');
  return tmp?.createPattern(canvas, repetition) ?? null;
}

function createClouds(count: number, w: number): Cloud[] {
  const clouds: Cloud[] = [];
  for (let i = 0; i < count; i++) {
    clouds.push({
      x: Math.random() * w,
      y: 24 + Math.random() * 90,
      w: 90 + Math.random() * 140,
      speed: 0.08 + Math.random() * 0.18,
      opacity: 0.35 + Math.random() * 0.4,
    });
  }
  return clouds;
}

function makeAsphaltTexture(size: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = '#3f3c38';
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < size * 8; i++) {
    const v = 70 + Math.random() * 50;
    g.fillStyle = `rgba(${v},${v - 4},${v - 8},${0.15 + Math.random() * 0.35})`;
    g.fillRect(
      Math.random() * size,
      Math.random() * size,
      1 + Math.random() * 2,
      1,
    );
  }
  for (let i = 0; i < 12; i++) {
    g.strokeStyle = `rgba(55,52,48,${0.2 + Math.random() * 0.3})`;
    g.lineWidth = 0.5;
    g.beginPath();
    g.moveTo(Math.random() * size, 0);
    g.lineTo(Math.random() * size, size);
    g.stroke();
  }
  return c;
}

function makeGravelTexture(size: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = '#5c5348';
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < size * 5; i++) {
    const r = 1 + Math.random() * 2.5;
    const v = 90 + Math.random() * 60;
    g.fillStyle = `rgb(${v},${v - 10},${v - 18})`;
    g.beginPath();
    g.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

export function drawRunnerFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  snap: RunnerSnapshot,
  assets: RenderAssets,
  t: number,
) {
  const groundY = h - GROUND_PAD;
  const floorY = groundY - GROUND_PAD;

  ctx.clearRect(0, 0, w, h);

  drawAtmosphericHaze(ctx, w, floorY);
  drawClouds(ctx, w, assets.clouds, t);

  drawGrassVerge(ctx, w, floorY);
  drawPath(ctx, w, h, floorY, groundY, snap.speed, t, assets);
  drawRoadMarkings(ctx, w, floorY, groundY, snap.speed, t);

  for (const o of snap.obstacles) {
    const ox = o.x;
    const baseY = floorY;
    const oy = o.kind === 'drone' ? baseY - o.floatY - o.h : baseY - o.h;
    drawContactShadow(ctx, ox, oy, o.w, o.h, floorY);
    drawObstacle(ctx, o, floorY, t);
  }

  if (snap.phase !== 'ready') {
    const px = PLAYER_X;
    const py = floorY - snap.playerY - PLAYER_H;
    drawContactShadow(ctx, px, py, PLAYER_W, PLAYER_H, floorY);
    drawRunner(ctx, snap, floorY, t);
    if (snap.phase === 'playing' && snap.playerY < 3) {
      drawKickDust(ctx, px, floorY, t, snap.speed);
    }
  }

  drawHorizonGlow(ctx, w, floorY);
}

function drawAtmosphericHaze(
  ctx: CanvasRenderingContext2D,
  w: number,
  pathTop: number,
) {
  const g = ctx.createLinearGradient(0, 0, 0, pathTop);
  g.addColorStop(0, 'rgba(12, 18, 28, 0.08)');
  g.addColorStop(0.55, 'rgba(80, 70, 60, 0.04)');
  g.addColorStop(1, 'rgba(30, 28, 24, 0.22)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, pathTop);
}

function drawHorizonGlow(
  ctx: CanvasRenderingContext2D,
  w: number,
  pathTop: number,
) {
  const g = ctx.createLinearGradient(0, pathTop - 48, 0, pathTop + 8);
  g.addColorStop(0, 'rgba(255, 248, 230, 0)');
  g.addColorStop(0.7, 'rgba(255, 235, 200, 0.12)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0.08)');
  ctx.fillStyle = g;
  ctx.fillRect(0, pathTop - 48, w, 56);
}

function drawClouds(
  ctx: CanvasRenderingContext2D,
  w: number,
  clouds: Cloud[],
  t: number,
) {
  for (const c of clouds) {
    const cx = ((c.x - t * c.speed * 28) % (w + c.w * 1.2)) - c.w * 0.1;
    drawRealisticCloud(ctx, cx, c.y, c.w, c.opacity);
  }
}

function drawRealisticCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  opacity: number,
) {
  const blobs = [
    { dx: 0, dy: 0, r: w * 0.22 },
    { dx: w * 0.22, dy: -w * 0.06, r: w * 0.2 },
    { dx: w * 0.45, dy: 0, r: w * 0.18 },
    { dx: w * 0.62, dy: -w * 0.04, r: w * 0.16 },
  ];
  for (const b of blobs) {
    const g = ctx.createRadialGradient(
      x + b.dx,
      y + b.dy,
      0,
      x + b.dx,
      y + b.dy,
      b.r,
    );
    g.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
    g.addColorStop(0.55, `rgba(245, 248, 252, ${opacity * 0.65})`);
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x + b.dx, y + b.dy, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGrassVerge(
  ctx: CanvasRenderingContext2D,
  w: number,
  pathTop: number,
) {
  const band = 36;
  const g = ctx.createLinearGradient(0, pathTop - band, 0, pathTop);
  g.addColorStop(0, '#4a6340');
  g.addColorStop(0.4, '#3d5534');
  g.addColorStop(1, '#2e4228');
  ctx.fillStyle = g;
  ctx.fillRect(0, pathTop - band, w, band);

  ctx.strokeStyle = 'rgba(20, 40, 18, 0.25)';
  ctx.lineWidth = 1;
  for (let i = 0; i < w; i += 14) {
    const blade = pathTop - band + 8 + (i % 20);
    ctx.beginPath();
    ctx.moveTo(i, pathTop);
    ctx.quadraticCurveTo(i + 3, blade, i + 1, blade - 10);
    ctx.stroke();
  }
}

function drawPath(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pathTop: number,
  groundY: number,
  speed: number,
  t: number,
  assets: RenderAssets,
) {
  const pathH = h - pathTop;
  const scroll = (t * speed * 0.42) % 128;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, pathTop, w, pathH);
  ctx.clip();

  if (assets.groundPattern) {
    ctx.fillStyle = assets.groundPattern;
    ctx.fillRect(-scroll, pathTop, w + 256, pathH);
  } else {
    ctx.fillStyle = '#3f3c38';
    ctx.fillRect(0, pathTop, w, pathH);
  }

  if (assets.gravelPattern) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = assets.gravelPattern;
    ctx.fillRect(-scroll * 0.7, pathTop + 4, w + 200, 18);
    ctx.globalAlpha = 1;
  }

  const edge = ctx.createLinearGradient(0, pathTop, 0, pathTop + 14);
  edge.addColorStop(0, 'rgba(0,0,0,0.18)');
  edge.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, pathTop, w, 14);

  ctx.restore();
}

function drawRoadMarkings(
  ctx: CanvasRenderingContext2D,
  w: number,
  pathTop: number,
  groundY: number,
  speed: number,
  t: number,
) {
  const y = pathTop + (groundY - pathTop) * 0.55;
  const off = (t * speed * 0.42) % 48;
  ctx.strokeStyle = 'rgba(220, 210, 180, 0.45)';
  ctx.lineWidth = 2;
  ctx.setLineDash([18, 22]);
  ctx.lineDashOffset = -off;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(w, y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawContactShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  groundY: number,
) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, groundY + 2, w * 0.42, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawObstacle(
  ctx: CanvasRenderingContext2D,
  o: Obstacle,
  pathTop: number,
  t: number,
) {
  const x = o.x;
  const y = o.kind === 'drone' ? pathTop - o.floatY - o.h : pathTop - o.h;

  if (o.kind === 'drone') {
    drawBird(ctx, x, y, o.w, o.h, t, o.id);
    return;
  }
  if (o.kind === 'spire') {
    drawLog(ctx, x, y, o.w, o.h);
    return;
  }
  drawBoulder(ctx, x, y, o.w, o.h);
}

function drawBoulder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const g = ctx.createRadialGradient(
    cx + w * LIGHT.x * 0.15,
    cy + h * LIGHT.y * 0.15,
    w * 0.08,
    cx,
    cy,
    w * 0.55,
  );
  g.addColorStop(0, '#9a958c');
  g.addColorStop(0.45, '#6e6860');
  g.addColorStop(0.85, '#4a4540');
  g.addColorStop(1, '#35312c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.2, cy - h * 0.1);
  ctx.lineTo(cx + w * 0.15, cy + h * 0.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.05, cy - h * 0.25);
  ctx.lineTo(cx + w * 0.25, cy);
  ctx.stroke();
}

function drawLog(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const body = ctx.createLinearGradient(x, y, x + w, y + h);
  body.addColorStop(0, '#4a3728');
  body.addColorStop(0.35, '#6b4f35');
  body.addColorStop(0.7, '#5a4030');
  body.addColorStop(1, '#3d2d22');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(x, y + h * 0.15, w, h * 0.7, 4);
  ctx.fill();

  ctx.strokeStyle = 'rgba(30, 20, 12, 0.45)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const ly = y + h * (0.22 + i * 0.14);
    ctx.beginPath();
    ctx.moveTo(x + 2, ly);
    ctx.lineTo(x + w - 2, ly + (i % 2 ? 2 : -2));
    ctx.stroke();
  }

  const endG = ctx.createRadialGradient(
    x + w / 2,
    y + h * 0.15,
    0,
    x + w / 2,
    y + h * 0.15,
    w * 0.35,
  );
  endG.addColorStop(0, '#c4a574');
  endG.addColorStop(0.6, '#8b6b45');
  endG.addColorStop(1, '#5c4530');
  ctx.fillStyle = endG;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.15, w * 0.38, h * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBird(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
  id: number,
) {
  const flap = Math.sin(t * 14 + id) * 0.35;
  const cx = x + w / 2;
  const cy = y + h / 2;

  ctx.save();
  ctx.translate(cx, cy);

  const bodyG = ctx.createRadialGradient(-2, 0, 1, 0, 0, w * 0.35);
  bodyG.addColorStop(0, '#5a4a3a');
  bodyG.addColorStop(1, '#2a2420');
  ctx.fillStyle = bodyG;
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.38, h * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  const wingG = ctx.createLinearGradient(-w, 0, w, 0);
  wingG.addColorStop(0, '#3d4a5c');
  wingG.addColorStop(0.5, '#6a7a8a');
  wingG.addColorStop(1, '#2a3038');
  ctx.fillStyle = wingG;

  ctx.save();
  ctx.rotate(-0.4 + flap);
  ctx.beginPath();
  ctx.moveTo(-4, 0);
  ctx.quadraticCurveTo(-w * 0.55, -h * 0.9, -w * 0.85, -h * 0.2);
  ctx.lineTo(-w * 0.5, h * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.rotate(0.4 - flap);
  ctx.beginPath();
  ctx.moveTo(4, 0);
  ctx.quadraticCurveTo(w * 0.55, -h * 0.9, w * 0.85, -h * 0.2);
  ctx.lineTo(w * 0.5, h * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#1a1816';
  ctx.beginPath();
  ctx.moveTo(w * 0.32, -h * 0.05);
  ctx.lineTo(w * 0.48, h * 0.02);
  ctx.lineTo(w * 0.3, h * 0.08);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawRunner(
  ctx: CanvasRenderingContext2D,
  snap: RunnerSnapshot,
  pathTop: number,
  t: number,
) {
  const x = PLAYER_X;
  const y = pathTop - snap.playerY - PLAYER_H;
  const onGround = snap.playerY < 2;
  const stride = onGround && Math.floor(t * 11) % 2 === 0;

  ctx.save();
  ctx.translate(x, y);

  const lean = Math.max(-0.12, Math.min(0.18, -snap.playerVy / 1400));
  ctx.translate(PLAYER_W / 2, PLAYER_H / 2);
  ctx.rotate(lean);
  ctx.translate(-PLAYER_W / 2, -PLAYER_H / 2);

  drawLeg(ctx, 14, PLAYER_H - 4, stride, true);
  drawLeg(ctx, 30, PLAYER_H - 4, !stride, false);

  const torso = ctx.createLinearGradient(10, 8, 36, 28);
  torso.addColorStop(0, '#4a6a8a');
  torso.addColorStop(0.5, '#2f4f6f');
  torso.addColorStop(1, '#1e3548');
  ctx.fillStyle = torso;
  ctx.beginPath();
  ctx.roundRect(12, 10, 24, 18, 4);
  ctx.fill();

  const armSwing = stride ? -6 : 5;
  ctx.strokeStyle = '#c4a882';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(16, 16);
  ctx.lineTo(8, 22 + armSwing);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(32, 16);
  ctx.lineTo(40, 22 - armSwing);
  ctx.stroke();

  const headG = ctx.createRadialGradient(22, 6, 1, 22, 8, 9);
  headG.addColorStop(0, '#f0d5c4');
  headG.addColorStop(0.7, '#d4b59e');
  headG.addColorStop(1, '#b8957e');
  ctx.fillStyle = headG;
  ctx.beginPath();
  ctx.ellipse(22, 8, 8, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2a2420';
  ctx.beginPath();
  ctx.ellipse(26, 7, 2.5, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawLeg(
  ctx: CanvasRenderingContext2D,
  hipX: number,
  footY: number,
  forward: boolean,
  isBack: boolean,
) {
  const kneeY = footY - (forward ? 10 : 14);
  const footX = hipX + (forward ? 6 : -3);
  const footEndY = footY - (forward ? 0 : 2);

  ctx.strokeStyle = '#2a3540';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hipX, 26);
  ctx.lineTo(hipX + (forward ? 2 : -2), kneeY);
  ctx.lineTo(footX, footEndY);
  ctx.stroke();

  const shoeG = ctx.createLinearGradient(
    footX - 6,
    footEndY,
    footX + 8,
    footEndY + 4,
  );
  shoeG.addColorStop(0, '#e8e4dc');
  shoeG.addColorStop(0.5, '#ffffff');
  shoeG.addColorStop(1, '#a8a49c');
  ctx.fillStyle = shoeG;
  ctx.beginPath();
  ctx.roundRect(footX - 7, footEndY - 3, 14, 6, 2);
  ctx.fill();

  if (isBack) ctx.globalAlpha = 0.85;
  ctx.globalAlpha = 1;
}

function drawKickDust(
  ctx: CanvasRenderingContext2D,
  px: number,
  pathTop: number,
  t: number,
  speed: number,
) {
  const intensity = Math.min(1, speed / 700);
  for (let i = 0; i < 4; i++) {
    const age = (t * 6 + i * 0.7) % 1;
    const dx = px - 8 - age * 22;
    const dy = pathTop + 2 - age * 6;
    ctx.fillStyle = `rgba(180, 165, 140, ${(1 - age) * 0.35 * intensity})`;
    ctx.beginPath();
    ctx.arc(dx, dy, 2 + age * 4, 0, Math.PI * 2);
    ctx.fill();
  }
}
