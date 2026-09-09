<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef } from 'vue';
import { withBase } from 'vitepress';
import { POTE_FACES } from '../faces';

type Actor = {
  id: number;
  face: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  spin: number;
  spinSpeed: number;
  opacity: number;
  phase: number;
  wobble: number;
};

const VISIBLE = 6;
const MIN_SIZE = 200;
const MAX_SIZE = 380;
const GAP = 28;

function seeded(i: number) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const nextFaceIndex = shallowRef(0);
const actors = shallowRef<Actor[]>([]);
let raf = 0;
let lastTs = 0;
let viewW = 1280;
let viewH = 800;

function takeNextFace(active: Set<string>) {
  for (let n = 0; n < POTE_FACES.length; n++) {
    const idx = (nextFaceIndex.value + n) % POTE_FACES.length;
    const face = POTE_FACES[idx];
    if (!active.has(face)) {
      nextFaceIndex.value = (idx + 1) % POTE_FACES.length;
      return face;
    }
  }
  const face = POTE_FACES[nextFaceIndex.value % POTE_FACES.length];
  nextFaceIndex.value = (nextFaceIndex.value + 1) % POTE_FACES.length;
  return face;
}

function randomSize(i: number) {
  return Math.round(MIN_SIZE + seeded(i + 31) * (MAX_SIZE - MIN_SIZE));
}

function spawnOutside(actor: Actor, faceSeed: number) {
  const edge = Math.floor(seeded(faceSeed + 3) * 4);
  const size = actor.size;
  if (edge === 0) {
    actor.x = -size - 20;
    actor.y = seeded(faceSeed + 5) * (viewH - size);
    actor.vx = 12 + seeded(faceSeed + 7) * 18;
    actor.vy = (seeded(faceSeed + 9) - 0.5) * 22;
  } else if (edge === 1) {
    actor.x = viewW + 20;
    actor.y = seeded(faceSeed + 5) * (viewH - size);
    actor.vx = -(12 + seeded(faceSeed + 7) * 18);
    actor.vy = (seeded(faceSeed + 9) - 0.5) * 22;
  } else if (edge === 2) {
    actor.x = seeded(faceSeed + 5) * (viewW - size);
    actor.y = -size - 20;
    actor.vx = (seeded(faceSeed + 7) - 0.5) * 22;
    actor.vy = 12 + seeded(faceSeed + 9) * 18;
  } else {
    actor.x = seeded(faceSeed + 5) * (viewW - size);
    actor.y = viewH + 20;
    actor.vx = (seeded(faceSeed + 7) - 0.5) * 22;
    actor.vy = -(12 + seeded(faceSeed + 9) * 18);
  }
}

function createActor(id: number, face: string): Actor {
  const size = randomSize(id);
  const actor: Actor = {
    id,
    face,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    size,
    spin: (seeded(id + 23) - 0.5) * 40,
    spinSpeed: (seeded(id + 29) - 0.5) * 8,
    opacity: 0.1 + seeded(id + 61) * 0.1,
    phase: seeded(id + 7) * Math.PI * 2,
    wobble: 0.25 + seeded(id + 13) * 0.35,
  };
  // Stagger initial positions across the field without stacking.
  const col = id % 3;
  const row = Math.floor(id / 3);
  actor.x = (viewW / 3) * (col + 0.2) + seeded(id + 2) * 40;
  actor.y = (viewH / 2) * (row + 0.15) + seeded(id + 4) * 40;
  actor.vx = (seeded(id + 11) - 0.5) * 30;
  actor.vy = (seeded(id + 17) - 0.5) * 30;
  return actor;
}

function recycle(actor: Actor) {
  const active = new Set(
    actors.value.filter((a) => a.id !== actor.id).map((a) => a.face),
  );
  const face = takeNextFace(active);
  actor.face = face;
  actor.size = randomSize(actor.id + nextFaceIndex.value);
  actor.opacity = 0.1 + seeded(actor.id + nextFaceIndex.value) * 0.1;
  actor.spinSpeed = (seeded(actor.id + nextFaceIndex.value + 8) - 0.5) * 8;
  spawnOutside(actor, actor.id + nextFaceIndex.value * 11);
}

function separate(list: Actor[]) {
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      const ax = a.x + a.size / 2;
      const ay = a.y + a.size / 2;
      const bx = b.x + b.size / 2;
      const by = b.y + b.size / 2;
      const dx = ax - bx;
      const dy = ay - by;
      const minDist = (a.size + b.size) / 2 + GAP;
      const dist = Math.hypot(dx, dy) || 0.01;
      if (dist < minDist) {
        const push = ((minDist - dist) / dist) * 0.5;
        const ox = dx * push;
        const oy = dy * push;
        a.x += ox;
        a.y += oy;
        b.x -= ox;
        b.y -= oy;
        a.vx += ox * 0.35;
        a.vy += oy * 0.35;
        b.vx -= ox * 0.35;
        b.vy -= oy * 0.35;
      }
    }
  }
}

function isFarOutside(actor: Actor) {
  const m = actor.size + 48;
  return (
    actor.x < -m || actor.y < -m || actor.x > viewW + m || actor.y > viewH + m
  );
}

function tick(ts: number) {
  if (!lastTs) lastTs = ts;
  const dt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;

  const list = actors.value;
  for (const actor of list) {
    actor.phase += dt * actor.wobble;

    // Curved / spacey steering: layered sines + mild velocity damping.
    const ax =
      Math.sin(actor.phase * 1.3) * 14 +
      Math.cos(actor.phase * 0.47 + actor.id) * 10;
    const ay =
      Math.cos(actor.phase * 1.1) * 12 +
      Math.sin(actor.phase * 0.63 + actor.id * 1.7) * 10;

    actor.vx += ax * dt;
    actor.vy += ay * dt;

    // Soft speed cap so they drift instead of zip.
    const speed = Math.hypot(actor.vx, actor.vy);
    const maxSpeed = 28 + actor.id * 3;
    if (speed > maxSpeed) {
      actor.vx = (actor.vx / speed) * maxSpeed;
      actor.vy = (actor.vy / speed) * maxSpeed;
    }

    actor.x += actor.vx * dt;
    actor.y += actor.vy * dt;
    actor.spin += actor.spinSpeed * dt * 0.45;

    if (isFarOutside(actor)) recycle(actor);
  }

  separate(list);
  actors.value = list.slice();
  raf = requestAnimationFrame(tick);
}

function bootstrap() {
  viewW = window.innerWidth || 1280;
  viewH = window.innerHeight || 800;
  const active = new Set<string>();
  const list: Actor[] = [];
  for (let i = 0; i < VISIBLE; i++) {
    const face = takeNextFace(active);
    active.add(face);
    list.push(createActor(i, face));
  }
  separate(list);
  actors.value = list;
}

function onResize() {
  viewW = window.innerWidth || 1280;
  viewH = window.innerHeight || 800;
}

onMounted(() => {
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;
  bootstrap();
  window.addEventListener('resize', onResize);
  if (!reduceMotion) {
    raf = requestAnimationFrame(tick);
  }
});

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf);
  window.removeEventListener('resize', onResize);
});
</script>

<template>
  <div class="pote-parade" aria-hidden="true">
    <img
      v-for="item in actors"
      :key="item.id"
      class="pote-parade__face"
      :src="withBase(`/${item.face}`)"
      width="220"
      height="220"
      alt=""
      decoding="async"
      :style="{
        width: `${item.size}px`,
        height: `${item.size}px`,
        opacity: item.opacity,
        transform: `translate3d(${item.x}px, ${item.y}px, 0) rotate(${item.spin}deg)`,
      }"
    />
  </div>
</template>
