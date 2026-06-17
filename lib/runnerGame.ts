export type ObstacleKind = 'plasma' | 'spire' | 'drone';

export type Obstacle = {
  id: number;
  x: number;
  w: number;
  h: number;
  kind: ObstacleKind;
  /** Height above ground (drones only). */
  floatY: number;
};

export type GamePhase = 'ready' | 'playing' | 'dead';

export type RunnerSnapshot = {
  phase: GamePhase;
  /** Meters traveled (display score). */
  distance: number;
  speed: number;
  playerY: number;
  playerVy: number;
  obstacles: Obstacle[];
  spawnTimer: number;
  best: number;
};

const GRAVITY = 2200;
const JUMP_V = 720;
const PLAYER_X = 108;
const PLAYER_W = 56;
const PLAYER_H = 48;
const GROUND_PAD = 88;

let obstacleId = 0;

export function playerBox(s: RunnerSnapshot, groundY: number) {
  const x = PLAYER_X;
  const y = groundY - GROUND_PAD - s.playerY - PLAYER_H;
  return { x, y, w: PLAYER_W, h: PLAYER_H };
}

export function createRunner(best = 0): RunnerSnapshot {
  return {
    phase: 'ready',
    distance: 0,
    speed: 320,
    playerY: 0,
    playerVy: 0,
    obstacles: [],
    spawnTimer: 0.9,
    best,
  };
}

export function startRun(s: RunnerSnapshot): RunnerSnapshot {
  return { ...createRunner(s.best), phase: 'playing', best: s.best };
}

export function tryJump(s: RunnerSnapshot): RunnerSnapshot {
  if (s.phase !== 'playing' || s.playerY > 2) return s;
  return { ...s, playerVy: JUMP_V };
}

function spawnObstacle(s: RunnerSnapshot, canvasW: number): Obstacle {
  const roll = Math.random();
  if (roll > 0.82) {
    return {
      id: obstacleId++,
      x: canvasW + 40,
      w: 36,
      h: 28,
      kind: 'drone',
      floatY: 52 + Math.random() * 28,
    };
  }
  if (roll > 0.55) {
    return {
      id: obstacleId++,
      x: canvasW + 40,
      w: 22,
      h: 64 + Math.random() * 36,
      kind: 'spire',
      floatY: 0,
    };
  }
  return {
    id: obstacleId++,
    x: canvasW + 40,
    w: 28 + Math.random() * 22,
    h: 38 + Math.random() * 22,
    kind: 'plasma',
    floatY: 0,
  };
}

function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export function tickRunner(
  s: RunnerSnapshot,
  dt: number,
  canvasW: number,
  canvasH: number,
): RunnerSnapshot {
  if (s.phase !== 'playing') return s;

  const groundY = canvasH - GROUND_PAD;
  let next: RunnerSnapshot = { ...s };

  next.speed = Math.min(920, s.speed + dt * 14);
  next.distance = s.distance + (s.speed * dt) / 100;
  next.spawnTimer = s.spawnTimer - dt;

  let vy = s.playerVy - GRAVITY * dt;
  let py = s.playerY + vy * dt;
  if (py <= 0) {
    py = 0;
    vy = 0;
  }
  next.playerY = py;
  next.playerVy = vy;

  let obstacles = s.obstacles
    .map((o) => ({ ...o, x: o.x - s.speed * dt }))
    .filter((o) => o.x + o.w > -60);

  if (next.spawnTimer <= 0) {
    obstacles.push(spawnObstacle(s, canvasW));
    const gap = 0.55 + Math.random() * (0.95 - Math.min(0.35, s.distance / 8000));
    next.spawnTimer = gap;
  }
  next.obstacles = obstacles;

  const pb = playerBox(next, groundY);
  const hit = obstacles.some((o) => {
    const ox = o.x;
    const oy =
      o.kind === 'drone'
        ? groundY - GROUND_PAD - o.floatY - o.h
        : groundY - GROUND_PAD - o.h;
    const shrink = 6;
    return rectsOverlap(
      {
        x: pb.x + shrink,
        y: pb.y + shrink,
        w: pb.w - shrink * 2,
        h: pb.h - shrink * 2,
      },
      { x: ox + 4, y: oy + 4, w: o.w - 8, h: o.h - 8 },
    );
  });

  if (hit) {
    const best = Math.max(s.best, Math.floor(s.distance));
    return { ...next, phase: 'dead', best };
  }

  return next;
}

export { PLAYER_X, PLAYER_W, PLAYER_H, GROUND_PAD };
