/* ─── js/r3f-world.js — 3D Cyberpunk Town Renderer (React 19 + htm + Three.js + R3F) ─── */
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import htm from 'htm';

const html = htm.bind(React.createElement);

const COLS = 42;
const ROWS = 26;
const T = 32;

const FLAGSTONE_TILES = new Set([
  'P', 'U', 'N', 'V', 'L', 'S', 'M', 'G', 'Z', 'Y', 'X',
  'J', 'Q', 'I', 'O', '3', '4', '5', '6'
]);

const ACCENT_HEX = {
  crimson: '#ef4444',
  blue: '#38bdf8',
  amber: '#f59e0b',
  pink: '#f472b6',
  emerald: '#10b981'
};

const MOOD_PRESETS = {
  midnight: {
    bg: '#06080f',
    fog: '#070a12',
    fogDensity: 0.022,
    ambientColor: '#94a3b8',
    hemiSky: '#38bdf8',
    hemiGround: '#1e1b2e',
    keyColor: '#e2e8f0',
    rimColor: '#f472b6',
    waterPrimary: '#ef4444',
    waterSecondary: '#38bdf8',
    waterAmber: '#f59e0b',
    waterBase: '#040a16',
    moonTint: '#dbeafe'
  },
  bloodmoon: {
    bg: '#110408',
    fog: '#17050b',
    fogDensity: 0.024,
    ambientColor: '#fca5a5',
    hemiSky: '#ef4444',
    hemiGround: '#1c080f',
    keyColor: '#fee2e2',
    rimColor: '#ef4444',
    waterPrimary: '#ef4444',
    waterSecondary: '#fb923c',
    waterAmber: '#f59e0b',
    waterBase: '#120307',
    moonTint: '#fecaca'
  },
  sakura: {
    bg: '#100714',
    fog: '#15091b',
    fogDensity: 0.021,
    ambientColor: '#f5d0fe',
    hemiSky: '#f472b6',
    hemiGround: '#24102b',
    keyColor: '#fdf2f8',
    rimColor: '#ec4899',
    waterPrimary: '#f472b6',
    waterSecondary: '#a855f7',
    waterAmber: '#fda4af',
    waterBase: '#100617',
    moonTint: '#fce7f3'
  },
  matrix: {
    bg: '#030d08',
    fog: '#04120b',
    fogDensity: 0.023,
    ambientColor: '#86efac',
    hemiSky: '#10b981',
    hemiGround: '#051a10',
    keyColor: '#d1fae5',
    rimColor: '#22c55e',
    waterPrimary: '#10b981',
    waterSecondary: '#34d399',
    waterAmber: '#84cc16',
    waterBase: '#020d07',
    moonTint: '#bbf7d0'
  }
};

const DIR_YAW = {
  down: 0,
  right: Math.PI / 2,
  up: Math.PI,
  left: -Math.PI / 2
};

const tileToWorldX = (c, cols = COLS) => c - cols / 2 + 0.5;
const tileToWorldZ = (r, rows = ROWS) => r - rows / 2 + 0.5;
const pxToWorldX = (x, t = T, cols = COLS) => (x / t) - cols / 2;
const pxToWorldZ = (y, t = T, rows = ROWS) => (y / t) - rows / 2;

const hash2D = (a, b) => Math.abs(Math.sin(a * 127.1 + b * 311.7) * 43758.5453) % 1;

function lerpAngle(current, target, alpha) {
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * alpha;
}

function getInteractableWorldPos(obj, t = T, cols = COLS, rows = ROWS) {
  if (!obj) return null;
  if (obj.x !== undefined && obj.y !== undefined) {
    return [pxToWorldX(obj.x, t, cols), pxToWorldZ(obj.y, t, rows)];
  }
  if (obj.hitBox && (obj.kind === 'building' || obj.kind === 'board' || obj.id === 'shrine_stone')) {
    const cx = (obj.hitBox.x1 + obj.hitBox.x2) * 0.5;
    const cy = (obj.hitBox.y1 + obj.hitBox.y2) * 0.5;
    return [pxToWorldX(cx, t, cols), pxToWorldZ(cy, t, rows)];
  }
  return [
    pxToWorldX(obj.tx * t + t * 0.5, t, cols),
    pxToWorldZ(obj.ty * t + t * 0.5, t, rows)
  ];
}

function findTileSpan(map, ch, cols, rows) {
  let minC = cols;
  let maxC = -1;
  let minR = rows;
  let maxR = -1;
  for (let r = 0; r < rows; r++) {
    const rowStr = map[r] || '';
    for (let c = 0; c < cols; c++) {
      if (rowStr[c] === ch) {
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
      }
    }
  }
  return maxC >= 0 ? { minC, maxC, minR, maxR } : null;
}

/* ── Procedural Texture Helpers (Created Once, Disposed on Unmount) ── */
function makeMarqueeTexture(title, subtitle, accentHex, isArcus = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#06070d';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 496, 112);

  if (isArcus) {
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(64, 76, 26, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = accentHex;
    ctx.fillRect(36, 76, 56, 6);
  } else {
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 5;
    ctx.strokeRect(38, 36, 46, 46);
    ctx.fillStyle = '#fecaca';
    ctx.fillRect(55, 53, 12, 12);
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = isArcus ? '#f0f9ff' : '#ffe4e6';
  ctx.font = '700 48px "Bebas Neue", "Segoe UI", sans-serif';
  ctx.fillText(title, 110, 68);

  ctx.fillStyle = accentHex;
  ctx.font = '600 19px "JetBrains Mono", monospace';
  ctx.fillText(subtitle, 112, 98);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeIntroBoardTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#090a10';
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 492, 236);

  /* Pixel portrait frame */
  ctx.fillStyle = '#181a24';
  ctx.fillRect(30, 32, 120, 192);
  ctx.strokeStyle = 'rgba(245,158,11,0.5)';
  ctx.lineWidth = 3;
  ctx.strokeRect(30, 32, 120, 192);

  /* Stylized pixel avatar */
  ctx.fillStyle = '#fca5a5';
  ctx.fillRect(62, 68, 56, 62);
  ctx.fillStyle = '#18181b';
  ctx.fillRect(56, 52, 68, 28);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(54, 48, 72, 14);
  ctx.fillStyle = '#09090b';
  ctx.fillRect(74, 92, 10, 12);
  ctx.fillRect(98, 92, 10, 12);
  ctx.fillStyle = '#e4e4e7';
  ctx.fillRect(54, 134, 72, 68);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(54, 134, 72, 14);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#f59e0b';
  ctx.font = '600 22px "JetBrains Mono", monospace';
  ctx.fillText('INTRO BOARD // 00', 178, 78);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 84px "Bebas Neue", "Segoe UI", sans-serif';
  ctx.fillText('ANSH.', 176, 158);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 20px "JetBrains Mono", monospace';
  ctx.fillText('CREATIVE ENGINEER · LUCKNOW', 178, 198);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeSignTexture(line1, line2, accentHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#090b12';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 244, 116);
  ctx.fillStyle = accentHex;
  ctx.fillRect(14, 14, 228, 10);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 28px "JetBrains Mono", monospace';
  ctx.fillText(line1, 128, 66);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 20px "JetBrains Mono", monospace';
  ctx.fillText(line2, 128, 100);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeCrescentMoonTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  /* Soft atmospheric night halo */
  const halo = ctx.createRadialGradient(256, 256, 36, 256, 256, 245);
  halo.addColorStop(0, 'rgba(224,242,254,0.45)');
  halo.addColorStop(0.32, 'rgba(56,189,248,0.18)');
  halo.addColorStop(0.65, 'rgba(244,114,182,0.06)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 512, 512);

  /* Crisp cyberpunk crescent disc on offscreen buffer */
  const moonCanvas = document.createElement('canvas');
  moonCanvas.width = 512;
  moonCanvas.height = 512;
  const mctx = moonCanvas.getContext('2d');

  const discGrad = mctx.createLinearGradient(160, 160, 340, 340);
  discGrad.addColorStop(0, '#f8fafc');
  discGrad.addColorStop(0.55, '#bae6fd');
  discGrad.addColorStop(1, '#7dd3fc');
  mctx.fillStyle = discGrad;
  mctx.beginPath();
  mctx.arc(256, 256, 92, 0, Math.PI * 2);
  mctx.fill();

  mctx.globalCompositeOperation = 'destination-out';
  mctx.beginPath();
  mctx.arc(296, 232, 78, 0, Math.PI * 2);
  mctx.fill();
  mctx.globalCompositeOperation = 'source-over';

  /* Subtle dark-side cyber rim */
  ctx.strokeStyle = 'rgba(186,230,253,0.16)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(256, 256, 92, 0, Math.PI * 2);
  ctx.stroke();

  ctx.drawImage(moonCanvas, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeParticleTexture(isRain) {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = isRain ? 64 : 32;
  const ctx = canvas.getContext('2d');
  if (isRain) {
    const grad = ctx.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, 'rgba(186,230,253,0)');
    grad.addColorStop(0.45, 'rgba(186,230,253,0.95)');
    grad.addColorStop(1, 'rgba(224,242,254,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(13, 2, 6, 60);
  } else {
    ctx.fillStyle = 'rgba(249,168,212,0.95)';
    ctx.beginPath();
    ctx.ellipse(16, 16, 11, 6, Math.PI / 5, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeLightPoolTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255,255,255,0.62)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.24)');
  grad.addColorStop(0.7, 'rgba(255,255,255,0.06)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ── Error Boundary ── */
class WebGLErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'WebGL context could not be initialized.'
    };
  }

  componentDidCatch(error) {
    if (typeof this.props.onError === 'function') {
      this.props.onError(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return html`
        <div
          style=${{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            padding: '1.5rem',
            background: '#06080f',
            color: '#e2e8f0',
            fontFamily: '"JetBrains Mono", monospace',
            textAlign: 'center',
            fontSize: '0.82rem'
          }}
        >
          <div style=${{ color: '#ef4444', fontWeight: 600, letterSpacing: '0.08em' }}>
            3D ENGINE FALLBACK // WEBGL UNAVAILABLE
          </div>
          <div style=${{ color: '#94a3b8', maxWidth: '38ch' }}>
            ${this.state.message}
          </div>
        </div>
      `;
    }
    return this.props.children;
  }
}

/* ── Instanced Static Town Geometry ── */
function InstancedTown({ world, bloom }) {
  const { MAP, COLS: cols, ROWS: rows } = world;

  const assets = useMemo(() => {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    const grassCoords = [];
    const flagCoords = [];
    const roadCoords = [];
    const stripeCoords = [];
    const bridgeCoords = [];
    const bridgeRailCoords = [];
    const bridgeLanternCoords = [];
    const puddleCoords = [];
    const pineCoords = [];
    const lampCoords = [];
    const fenceCoords = [];

    for (let r = 0; r < rows; r++) {
      const rowStr = MAP[r] || '';
      for (let c = 0; c < cols; c++) {
        const ch = rowStr[c];
        const wx = tileToWorldX(c, cols);
        const wz = tileToWorldZ(r, rows);

        if (ch !== 'W' && ch !== '=' && ch !== '|' && ch !== 'R' && !FLAGSTONE_TILES.has(ch)) {
          grassCoords.push({ c, r, wx, wz });
        }
        if (FLAGSTONE_TILES.has(ch)) {
          flagCoords.push({ c, r, wx, wz });
        }
        if (ch === 'R') {
          roadCoords.push({ c, r, wx, wz });
          if (c % 2 === 0) stripeCoords.push({ c, r, wx, wz });
        }
        if (ch === '=') {
          bridgeCoords.push({ c, r, wx, wz });
        }
        if (ch === '|') {
          bridgeRailCoords.push({ c, r, wx, wz });
          if (r === 11 || r === 13) bridgeLanternCoords.push({ c, r, wx, wz });
        }
        if (ch === 'U') {
          puddleCoords.push({ c, r, wx, wz });
        }
        if (ch === 'T') {
          pineCoords.push({ c, r, wx, wz });
        }
        if (ch === 'L') {
          lampCoords.push({ c, r, wx, wz });
        }
        if (ch === 'F') {
          fenceCoords.push({ c, r, wx, wz });
        }
      }
    }

    const makeInstanced = (geo, mat, count) => {
      const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, count));
      mesh.count = count;
      mesh.frustumCulled = false;
      return mesh;
    };

    /* Geometries & Materials */
    const tileGeo = new THREE.BoxGeometry(0.98, 0.08, 0.98);
    const grassTileGeo = new THREE.BoxGeometry(1.0, 0.06, 1.0);
    const stripeGeo = new THREE.BoxGeometry(0.56, 0.02, 0.08);
    const bridgeGeo = new THREE.BoxGeometry(0.98, 0.16, 0.98);
    const railBlockGeo = new THREE.BoxGeometry(0.32, 0.42, 0.98);
    const lanternGeo = new THREE.BoxGeometry(0.28, 0.34, 0.28);
    const puddleGeo = new THREE.CylinderGeometry(0.36, 0.39, 0.02, 16);

    const pineTrunkGeo = new THREE.CylinderGeometry(0.11, 0.16, 0.7, 7);
    const pineCrownGeo = new THREE.IcosahedronGeometry(0.55, 1);

    const lampPoleGeo = new THREE.CylinderGeometry(0.06, 0.09, 1.9, 8);
    const lampCapGeo = new THREE.BoxGeometry(0.34, 0.1, 0.34);
    const lampBulbGeo = new THREE.BoxGeometry(0.24, 0.28, 0.24);

    const fencePostGeo = new THREE.BoxGeometry(0.14, 0.56, 0.14);
    const fenceRailGeo = new THREE.BoxGeometry(1.0, 0.09, 0.08);

    const grassMat = new THREE.MeshLambertMaterial({ color: '#ffffff' });
    const flagMat = new THREE.MeshLambertMaterial({ color: '#ffffff' });
    const roadMat = new THREE.MeshLambertMaterial({ color: '#0d1017' });
    const stripeMat = new THREE.MeshLambertMaterial({
      color: '#f59e0b',
      emissive: '#b45309',
      emissiveIntensity: 0.45
    });
    const bridgeMat = new THREE.MeshLambertMaterial({ color: '#2b2e40' });
    const railBlockMat = new THREE.MeshLambertMaterial({ color: '#373b52' });
    const lanternMat = new THREE.MeshLambertMaterial({
      color: '#ef4444',
      emissive: '#ef4444',
      emissiveIntensity: 1.5
    });
    const puddleMat = new THREE.MeshLambertMaterial({
      color: '#ffffff'
    });
    const pineTrunkMat = new THREE.MeshLambertMaterial({ color: '#261b18' });
    const pineCrownLowMat = new THREE.MeshLambertMaterial({ color: '#0d2621' });
    const pineCrownHighMat = new THREE.MeshLambertMaterial({ color: '#194037' });

    const lampPoleMat = new THREE.MeshLambertMaterial({ color: '#222534' });
    const lampCapMat = new THREE.MeshLambertMaterial({ color: '#33384d' });
    const lampBulbMat = new THREE.MeshLambertMaterial({
      color: '#fef3c7',
      emissive: '#f59e0b',
      emissiveIntensity: 2.1
    });

    const fencePostMat = new THREE.MeshLambertMaterial({ color: '#272733' });
    const fenceRailMat = new THREE.MeshLambertMaterial({ color: '#452b25' });

    /* Build InstancedMeshes */
    const grassMesh = makeInstanced(grassTileGeo, grassMat, grassCoords.length);
    grassCoords.forEach((it, idx) => {
      dummy.position.set(it.wx, -0.03, it.wz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      grassMesh.setMatrixAt(idx, dummy.matrix);
      color.set((it.r + it.c) % 2 === 0 ? '#0b1016' : '#0f161f');
      grassMesh.setColorAt(idx, color);
    });

    const flagMesh = makeInstanced(tileGeo, flagMat, flagCoords.length);
    const stonePalette = ['#181925', '#1b1d2b', '#151722', '#1f2130'];
    flagCoords.forEach((it, idx) => {
      dummy.position.set(it.wx, 0.0, it.wz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      flagMesh.setMatrixAt(idx, dummy.matrix);
      const sIdx = Math.floor(hash2D(it.c, it.r) * stonePalette.length);
      color.set(stonePalette[sIdx]);
      flagMesh.setColorAt(idx, color);
    });

    const roadMesh = makeInstanced(tileGeo, roadMat, roadCoords.length);
    roadCoords.forEach((it, idx) => {
      dummy.position.set(it.wx, -0.015, it.wz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      roadMesh.setMatrixAt(idx, dummy.matrix);
    });

    const stripeMesh = makeInstanced(stripeGeo, stripeMat, stripeCoords.length);
    stripeCoords.forEach((it, idx) => {
      dummy.position.set(it.wx, 0.03, it.wz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      stripeMesh.setMatrixAt(idx, dummy.matrix);
    });

    const bridgeMesh = makeInstanced(bridgeGeo, bridgeMat, bridgeCoords.length);
    bridgeCoords.forEach((it, idx) => {
      dummy.position.set(it.wx, 0.03, it.wz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      bridgeMesh.setMatrixAt(idx, dummy.matrix);
    });

    const bridgeRailMesh = makeInstanced(railBlockGeo, railBlockMat, bridgeRailCoords.length);
    bridgeRailCoords.forEach((it, idx) => {
      dummy.position.set(it.wx, 0.24, it.wz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      bridgeRailMesh.setMatrixAt(idx, dummy.matrix);
    });

    const bridgeLanternMesh = makeInstanced(lanternGeo, lanternMat, bridgeLanternCoords.length);
    bridgeLanternCoords.forEach((it, idx) => {
      dummy.position.set(it.wx, 0.62, it.wz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      bridgeLanternMesh.setMatrixAt(idx, dummy.matrix);
    });

    const puddleMesh = makeInstanced(puddleGeo, puddleMat, puddleCoords.length);
    puddleCoords.forEach((it, idx) => {
      dummy.position.set(it.wx, 0.042, it.wz);
      dummy.rotation.set(0, hash2D(it.c, it.r) * Math.PI, 0);
      dummy.scale.set(1, 1, 0.85);
      dummy.updateMatrix();
      puddleMesh.setMatrixAt(idx, dummy.matrix);
      color.set(it.c < 17 ? '#3b1520' : it.c > 23 ? '#10293d' : '#182436');
      puddleMesh.setColorAt(idx, color);
    });

    const pineTrunkMesh = makeInstanced(pineTrunkGeo, pineTrunkMat, pineCoords.length);
    const pineCrownLowMesh = makeInstanced(pineCrownGeo, pineCrownLowMat, pineCoords.length);
    const pineCrownHighMesh = makeInstanced(pineCrownGeo, pineCrownHighMat, pineCoords.length);
    pineCoords.forEach((it, idx) => {
      const hScale = 0.86 + hash2D(it.c, it.r) * 0.34;
      const rotY = hash2D(it.r, it.c) * Math.PI * 2;
      dummy.position.set(it.wx, 0.35, it.wz);
      dummy.rotation.set(0, rotY, 0);
      dummy.scale.set(1, hScale, 1);
      dummy.updateMatrix();
      pineTrunkMesh.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(it.wx, 0.94 * hScale, it.wz);
      dummy.rotation.set(0, rotY, 0);
      dummy.scale.set(1.04, 0.95 * hScale, 1.04);
      dummy.updateMatrix();
      pineCrownLowMesh.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(it.wx, 1.44 * hScale, it.wz);
      dummy.rotation.set(0, rotY + 0.85, 0);
      dummy.scale.set(0.76, 0.86 * hScale, 0.76);
      dummy.updateMatrix();
      pineCrownHighMesh.setMatrixAt(idx, dummy.matrix);
    });

    const lampPoleMesh = makeInstanced(lampPoleGeo, lampPoleMat, lampCoords.length);
    const lampCapMesh = makeInstanced(lampCapGeo, lampCapMat, lampCoords.length);
    const lampBulbMesh = makeInstanced(lampBulbGeo, lampBulbMat, lampCoords.length);
    lampCoords.forEach((it, idx) => {
      dummy.position.set(it.wx, 0.98, it.wz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      lampPoleMesh.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(it.wx, 2.04, it.wz);
      dummy.updateMatrix();
      lampCapMesh.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(it.wx, 1.85, it.wz);
      dummy.updateMatrix();
      lampBulbMesh.setMatrixAt(idx, dummy.matrix);
    });

    const fencePostMesh = makeInstanced(fencePostGeo, fencePostMat, fenceCoords.length * 2);
    const fenceRailMesh = makeInstanced(fenceRailGeo, fenceRailMat, fenceCoords.length * 2);
    fenceCoords.forEach((it, idx) => {
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);

      dummy.position.set(it.wx - 0.36, 0.3, it.wz);
      dummy.updateMatrix();
      fencePostMesh.setMatrixAt(idx * 2, dummy.matrix);

      dummy.position.set(it.wx + 0.36, 0.3, it.wz);
      dummy.updateMatrix();
      fencePostMesh.setMatrixAt(idx * 2 + 1, dummy.matrix);

      dummy.position.set(it.wx, 0.44, it.wz);
      dummy.updateMatrix();
      fenceRailMesh.setMatrixAt(idx * 2, dummy.matrix);

      dummy.position.set(it.wx, 0.24, it.wz);
      dummy.updateMatrix();
      fenceRailMesh.setMatrixAt(idx * 2 + 1, dummy.matrix);
    });

    const meshes = [
      grassMesh, flagMesh, roadMesh, stripeMesh, bridgeMesh,
      bridgeRailMesh, bridgeLanternMesh, puddleMesh,
      pineTrunkMesh, pineCrownLowMesh, pineCrownHighMesh,
      lampPoleMesh, lampCapMesh, lampBulbMesh,
      fencePostMesh, fenceRailMesh
    ];

    meshes.forEach(m => {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    });

    return {
      meshes,
      lampBulbMat,
      lanternMat,
      stripeMat,
      disposables: [
        tileGeo, grassTileGeo, stripeGeo, bridgeGeo, railBlockGeo, lanternGeo, puddleGeo,
        pineTrunkGeo, pineCrownGeo,
        lampPoleGeo, lampCapGeo, lampBulbGeo,
        fencePostGeo, fenceRailGeo,
        grassMat, flagMat, roadMat, stripeMat, bridgeMat, railBlockMat, lanternMat, puddleMat,
        pineTrunkMat, pineCrownLowMat, pineCrownHighMat,
        lampPoleMat, lampCapMat, lampBulbMat,
        fencePostMat, fenceRailMat
      ]
    };
  }, [MAP, cols, rows]);

  useEffect(() => {
    const mult = bloom ? 1 : 0.3;
    assets.lampBulbMat.emissiveIntensity = 2.1 * mult;
    assets.lanternMat.emissiveIntensity = 1.5 * mult;
    assets.stripeMat.emissiveIntensity = 0.45 * mult;
  }, [bloom, assets]);

  useEffect(() => {
    return () => {
      assets.disposables.forEach(d => d.dispose());
    };
  }, [assets]);

  return html`
    <group>
      ${assets.meshes.map((mesh, i) => html`<primitive key=${i} object=${mesh} />`)}
    </group>
  `;
}

/* ── Distant Cyberpunk Skyline Horizon + Crescent Moon ── */
function CyberpunkSkyline({ bloom, mood, reducedMotion, effectiveEco }) {
  const assets = useMemo(() => {
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();

    const towers = [];
    /* 16 north horizon towers (z: -34..-18) */
    for (let i = 0; i < 16; i++) {
      const t = i / 15;
      const x = -33 + t * 66 + (hash2D(i, 3.1) - 0.5) * 2.4;
      const z = -18.5 - hash2D(i, 7.4) * 15.0;
      const w = 2.6 + hash2D(i, 11.2) * 2.2;
      const d = 2.6 + hash2D(i, 13.8) * 2.2;
      const h = 11 + hash2D(i, 17.5) * 16.5;
      towers.push({ x, z, w, d, h, side: 'north', idx: i });
    }
    /* 6 west horizon towers (x: -34..-26) */
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      const x = -26.5 - hash2D(i + 20, 4.3) * 7.2;
      const z = -18 + t * 29 + (hash2D(i + 20, 8.1) - 0.5) * 1.8;
      const w = 2.6 + hash2D(i + 20, 12.6) * 2.0;
      const d = 2.6 + hash2D(i + 20, 15.4) * 2.0;
      const h = 10 + hash2D(i + 20, 19.2) * 14.5;
      towers.push({ x, z, w, d, h, side: 'west', idx: 16 + i });
    }
    /* 6 east horizon towers (x: 26..34) */
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      const x = 26.5 + hash2D(i + 40, 5.7) * 7.2;
      const z = -18 + t * 29 + (hash2D(i + 40, 9.3) - 0.5) * 1.8;
      const w = 2.6 + hash2D(i + 40, 14.1) * 2.0;
      const d = 2.6 + hash2D(i + 40, 16.9) * 2.0;
      const h = 10 + hash2D(i + 40, 21.7) * 14.5;
      towers.push({ x, z, w, d, h, side: 'east', idx: 22 + i });
    }

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const ribGeo = new THREE.BoxGeometry(0.11, 1, 0.11);
    const spireGeo = new THREE.BoxGeometry(0.08, 1, 0.08);
    const beaconGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);

    const towerMat = new THREE.MeshLambertMaterial({ color: '#ffffff' });
    const ribMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const spireMat = new THREE.MeshLambertMaterial({ color: '#1e293b' });
    const beaconMat = new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false });

    const towerMesh = new THREE.InstancedMesh(boxGeo, towerMat, towers.length);
    const ribMesh = new THREE.InstancedMesh(ribGeo, ribMat, towers.length * 2);
    towerMesh.frustumCulled = false;
    ribMesh.frustumCulled = false;

    const towerShades = ['#070a12', '#0a0e1a', '#0c111e', '#080c17'];
    const ribPalette = ['#ef4444', '#38bdf8', '#f59e0b', '#f472b6'];

    towers.forEach((tw, i) => {
      dummy.position.set(tw.x, tw.h * 0.5 - 0.5, tw.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(tw.w, tw.h, tw.d);
      dummy.updateMatrix();
      towerMesh.setMatrixAt(i, dummy.matrix);
      col.set(towerShades[i % towerShades.length]);
      towerMesh.setColorAt(i, col);

      /* Two vertical neon accent ribs on the town-facing facade */
      const ribH = tw.h * (0.72 + hash2D(i, 29.3) * 0.2);
      const ribY = ribH * 0.5 - 0.2;
      const ribHex = ribPalette[i % ribPalette.length];
      col.set(ribHex);

      for (let r = 0; r < 2; r++) {
        const offset = r === 0 ? -0.32 : 0.32;
        if (tw.side === 'north') {
          dummy.position.set(tw.x + tw.w * offset, ribY, tw.z + tw.d * 0.5 + 0.04);
        } else if (tw.side === 'west') {
          dummy.position.set(tw.x + tw.w * 0.5 + 0.04, ribY, tw.z + tw.d * offset);
        } else {
          dummy.position.set(tw.x - tw.w * 0.5 - 0.04, ribY, tw.z + tw.d * offset);
        }
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, ribH, 1);
        dummy.updateMatrix();
        ribMesh.setMatrixAt(i * 2 + r, dummy.matrix);
        ribMesh.setColorAt(i * 2 + r, col);
      }
    });

    towerMesh.instanceMatrix.needsUpdate = true;
    if (towerMesh.instanceColor) towerMesh.instanceColor.needsUpdate = true;
    ribMesh.instanceMatrix.needsUpdate = true;
    if (ribMesh.instanceColor) ribMesh.instanceColor.needsUpdate = true;

    /* Highest spires get antenna masts + blinking red aviation beacons */
    const spireTowers = [...towers].sort((a, b) => b.h - a.h).slice(0, 12);
    const spireMesh = new THREE.InstancedMesh(spireGeo, spireMat, spireTowers.length);
    const beaconMesh = new THREE.InstancedMesh(beaconGeo, beaconMat, spireTowers.length);
    spireMesh.frustumCulled = false;
    beaconMesh.frustumCulled = false;

    const beaconData = spireTowers.map((tw, i) => {
      const spireH = 1.8 + hash2D(tw.idx, 41.7) * 1.4;
      const topY = tw.h - 0.5;
      dummy.position.set(tw.x, topY + spireH * 0.5, tw.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, spireH, 1);
      dummy.updateMatrix();
      spireMesh.setMatrixAt(i, dummy.matrix);

      const by = topY + spireH + 0.14;
      dummy.position.set(tw.x, by, tw.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      beaconMesh.setMatrixAt(i, dummy.matrix);
      col.set('#ef4444');
      beaconMesh.setColorAt(i, col);

      return { phase: i * 1.13 };
    });

    spireMesh.instanceMatrix.needsUpdate = true;
    beaconMesh.instanceMatrix.needsUpdate = true;
    if (beaconMesh.instanceColor) beaconMesh.instanceColor.needsUpdate = true;

    const moonTex = makeCrescentMoonTexture();
    const moonMat = new THREE.SpriteMaterial({
      map: moonTex,
      color: '#dbeafe',
      transparent: true,
      opacity: 0.94,
      fog: false,
      depthWrite: false
    });

    return {
      towerMesh,
      ribMesh,
      spireMesh,
      beaconMesh,
      beaconData,
      ribMat,
      moonTex,
      moonMat,
      tempColor: new THREE.Color(),
      disposables: [
        boxGeo, ribGeo, spireGeo, beaconGeo,
        towerMat, ribMat, spireMat, beaconMat,
        moonTex, moonMat
      ]
    };
  }, []);

  useEffect(() => {
    assets.ribMat.color.set(bloom ? '#ffffff' : '#64748b');
  }, [bloom, assets]);

  useEffect(() => {
    assets.moonMat.color.set(mood.moonTint || '#dbeafe');
  }, [mood, assets]);

  useEffect(() => {
    return () => {
      assets.disposables.forEach(d => d.dispose());
    };
  }, [assets]);

  useFrame(({ clock }) => {
    if (reducedMotion || effectiveEco) return;
    const t = clock.getElapsedTime();
    const { beaconMesh, beaconData, tempColor } = assets;
    const mult = bloom ? 1.0 : 0.45;
    for (let i = 0; i < beaconData.length; i++) {
      const cycle = (t * 0.9 + beaconData[i].phase) % 2.4;
      const on = (cycle < 0.35 || (cycle > 0.55 && cycle < 0.8)) ? 1.0 : 0.16;
      tempColor.setRGB(on * mult, on * 0.08 * mult, on * 0.09 * mult);
      beaconMesh.setColorAt(i, tempColor);
    }
    if (beaconMesh.instanceColor) beaconMesh.instanceColor.needsUpdate = true;
  });

  return html`
    <group>
      <primitive object=${assets.towerMesh} />
      <primitive object=${assets.ribMesh} />
      <primitive object=${assets.spireMesh} />
      <primitive object=${assets.beaconMesh} />
      <sprite material=${assets.moonMat} position=${[-25, 19, -46]} scale=${[15, 15, 1]} />
    </group>
  `;
}

/* ── Animated Canal Water Shader ('W' rows 11..13) + 3 Neon Koi + Patrol Drone ── */
const WATER_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const WATER_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform vec3 uPrimaryColor;
  uniform vec3 uSecondaryColor;
  uniform vec3 uAmberColor;
  uniform vec3 uBaseColor;
  uniform float uBloom;

  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    float x = vWorldPos.x;
    float flow = x * 1.4 - uTime * 1.45;
    float wave1 = sin(flow + sin(vUv.y * 14.0 + uTime * 1.7) * 0.9);
    float wave2 = sin(x * 2.9 + uTime * 2.15 + vUv.y * 20.0);
    float ripple = smoothstep(0.05, 0.95, (wave1 * 0.55 + wave2 * 0.45) * 0.5 + 0.5);

    /* District neon reflection bands: West (Crimson/Primary), Bridge (Amber), East (Cyan/Secondary) */
    float westMask = 1.0 - smoothstep(-10.0, -2.5, x);
    float eastMask = smoothstep(0.0, 8.5, x);
    float centerMask = clamp(1.0 - westMask - eastMask, 0.0, 1.0);

    vec3 neonBand = uPrimaryColor * westMask + uAmberColor * centerMask + uSecondaryColor * eastMask;

    /* Horizontal streaky neon reflection ribbons */
    float streak1 = smoothstep(0.45, 0.98, sin(vUv.y * 26.0 + wave1 * 1.35 + uTime * 1.3) * 0.5 + 0.5);
    float streak2 = smoothstep(0.55, 0.99, sin(x * 0.85 - uTime * 0.9 + vUv.y * 12.0) * 0.5 + 0.5);
    float reflectionStrength = (0.22 + 0.48 * ripple) * (0.35 + 0.65 * streak1) * (0.65 + 0.35 * streak2);

    /* Specular rain shimmer micro-glints */
    float r1 = sin(x * 11.5 + uTime * 5.2) * cos(vWorldPos.z * 15.0 - uTime * 4.4);
    float r2 = sin(x * 19.0 - uTime * 6.4 + 1.3) * sin(vWorldPos.z * 21.0 + uTime * 5.6);
    float rainSparkle = pow(max(0.0, r1 * 0.5 + r2 * 0.5), 5.0);

    /* Subtle dark margin near canal stone walls */
    float bankEdge = smoothstep(0.0, 0.13, vUv.y) * smoothstep(1.0, 0.87, vUv.y);

    vec3 col = uBaseColor;
    col += neonBand * reflectionStrength * (0.52 + 0.48 * uBloom) * bankEdge;
    col += mix(vec3(0.75, 0.9, 1.0), neonBand, 0.4) * rainSparkle * (0.55 + 0.45 * uBloom) * bankEdge;

    gl_FragColor = vec4(col, 0.86);
  }
`;

function CanalWater({ cols, bloom, mood, reducedMotion, effectiveEco }) {
  const koiRefs = useRef([]);
  const koiTailRefs = useRef([]);
  const droneRef = useRef(null);
  const rotorRefs = useRef([]);

  const res = useMemo(() => {
    const waterGeo = new THREE.PlaneGeometry(cols - 2, 3.0, 48, 4);
    const waterMat = new THREE.ShaderMaterial({
      vertexShader: WATER_VERTEX_SHADER,
      fragmentShader: WATER_FRAGMENT_SHADER,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uPrimaryColor: { value: new THREE.Color(mood.waterPrimary) },
        uSecondaryColor: { value: new THREE.Color(mood.waterSecondary) },
        uAmberColor: { value: new THREE.Color(mood.waterAmber) },
        uBaseColor: { value: new THREE.Color(mood.waterBase) },
        uBloom: { value: bloom ? 1.0 : 0.45 }
      }
    });

    const wallGeo = new THREE.BoxGeometry(cols - 2, 0.24, 0.14);
    const wallMat = new THREE.MeshLambertMaterial({ color: '#1b1f2e' });

    /* Shared Neon Koi Geometries & Materials */
    const koiBodyGeo = new THREE.SphereGeometry(0.11, 10, 8);
    const koiTailGeo = new THREE.ConeGeometry(0.1, 0.24, 4);
    const koiFinGeo = new THREE.BoxGeometry(0.19, 0.014, 0.08);
    const koiMats = [
      new THREE.MeshLambertMaterial({
        color: '#fb923c', emissive: '#ef4444', emissiveIntensity: 1.85
      }),
      new THREE.MeshLambertMaterial({
        color: '#7dd3fc', emissive: '#38bdf8', emissiveIntensity: 1.85
      }),
      new THREE.MeshLambertMaterial({
        color: '#f9a8d4', emissive: '#f472b6', emissiveIntensity: 1.85
      })
    ];
    const koiPaths = [
      { cx: -11.4, rx: 6.2, rz: 0.72, speed: 0.42, phase: 0.0 },
      { cx: 10.6, rx: 6.5, rz: 0.72, speed: 0.37, phase: 2.15 },
      { cx: -0.5, rx: 16.0, rz: 0.64, speed: 0.22, phase: 4.3 }
    ];

    /* Autonomous Patrol Drone Geometries & Materials */
    const droneBodyGeo = new THREE.BoxGeometry(0.42, 0.13, 0.5);
    const droneArmGeo = new THREE.BoxGeometry(0.56, 0.035, 0.045);
    const rotorRingGeo = new THREE.TorusGeometry(0.15, 0.018, 8, 18);
    const rotorBladeGeo = new THREE.BoxGeometry(0.24, 0.012, 0.035);
    const droneEyeGeo = new THREE.SphereGeometry(0.068, 10, 8);
    const scanConeGeo = new THREE.ConeGeometry(0.62, 2.8, 16, 1, true);

    const droneHullMat = new THREE.MeshLambertMaterial({ color: '#111827' });
    const droneCyanMat = new THREE.MeshLambertMaterial({
      color: '#bae6fd', emissive: '#38bdf8', emissiveIntensity: 2.0
    });
    const scanConeMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.045,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    return {
      waterGeo, waterMat, wallGeo, wallMat,
      koiBodyGeo, koiTailGeo, koiFinGeo, koiMats, koiPaths,
      droneBodyGeo, droneArmGeo, rotorRingGeo, rotorBladeGeo, droneEyeGeo, scanConeGeo,
      droneHullMat, droneCyanMat, scanConeMat
    };
  }, [cols]);

  useEffect(() => {
    const u = res.waterMat.uniforms;
    u.uPrimaryColor.value.set(mood.waterPrimary);
    u.uSecondaryColor.value.set(mood.waterSecondary);
    u.uAmberColor.value.set(mood.waterAmber);
    u.uBaseColor.value.set(mood.waterBase);
    u.uBloom.value = bloom ? 1.0 : 0.45;
    res.scanConeMat.opacity = bloom ? 0.045 : 0.025;
    res.droneCyanMat.emissiveIntensity = bloom ? 2.0 : 0.8;
    res.koiMats.forEach(m => { m.emissiveIntensity = bloom ? 1.85 : 0.85; });
  }, [mood, bloom, res]);

  useEffect(() => {
    return () => {
      res.waterGeo.dispose();
      res.waterMat.dispose();
      res.wallGeo.dispose();
      res.wallMat.dispose();
      res.koiBodyGeo.dispose();
      res.koiTailGeo.dispose();
      res.koiFinGeo.dispose();
      res.koiMats.forEach(m => m.dispose());
      res.droneBodyGeo.dispose();
      res.droneArmGeo.dispose();
      res.rotorRingGeo.dispose();
      res.rotorBladeGeo.dispose();
      res.droneEyeGeo.dispose();
      res.scanConeGeo.dispose();
      res.droneHullMat.dispose();
      res.droneCyanMat.dispose();
      res.scanConeMat.dispose();
    };
  }, [res]);

  useFrame(({ clock }) => {
    const t = reducedMotion ? 0 : clock.getElapsedTime();
    res.waterMat.uniforms.uTime.value = t;

    /* Swim 3 glowing Neon Koi smoothly along curved canal paths */
    for (let i = 0; i < res.koiPaths.length; i++) {
      const koi = koiRefs.current[i];
      if (!koi) continue;
      const p = res.koiPaths[i];
      const a = t * p.speed + p.phase;
      const x = p.cx + Math.sin(a) * p.rx;
      const z = -0.5 + Math.sin(2 * a) * p.rz;
      const dx = Math.cos(a) * p.rx * p.speed;
      const dz = 2 * Math.cos(2 * a) * p.rz * p.speed;
      koi.position.set(x, -0.15 + Math.sin(t * 2.4 + i) * 0.015, z);
      koi.rotation.y = Math.atan2(dx, dz);

      const tail = koiTailRefs.current[i];
      if (tail) {
        tail.rotation.y = Math.sin(t * 7.8 + i * 2.1) * 0.42;
      }
    }

    /* Autonomous Patrol Drone hovering gently above central canal bridge (skipped in Eco) */
    if (!reducedMotion && !effectiveEco) {
      if (droneRef.current) {
        const dx = Math.sin(t * 0.65) * 1.65;
        const dz = Math.cos(t * 0.85) * 0.95;
        const dy = Math.sin(t * 2.2) * 0.14;
        droneRef.current.position.set(-1.5 + dx, 3.25 + dy, -0.5 + dz);
        droneRef.current.rotation.z = -Math.cos(t * 0.65) * 0.11;
        droneRef.current.rotation.x = -Math.sin(t * 0.85) * 0.09;
        droneRef.current.rotation.y = Math.sin(t * 0.4) * 0.35;
      }
      for (let i = 0; i < 4; i++) {
        const rot = rotorRefs.current[i];
        if (rot) rot.rotation.y = t * (i % 2 === 0 ? 18 : -18);
      }
    }
  });

  const rotorOffsets = [
    [-0.36, 0.04, -0.36],
    [0.36, 0.04, -0.36],
    [-0.36, 0.04, 0.36],
    [0.36, 0.04, 0.36]
  ];

  return html`
    <group>
      <mesh
        geometry=${res.waterGeo}
        material=${res.waterMat}
        position=${[0, -0.13, -0.5]}
        rotation=${[-Math.PI / 2, 0, 0]}
      />
      <mesh geometry=${res.wallGeo} material=${res.wallMat} position=${[0, -0.05, -2.02]} />
      <mesh geometry=${res.wallGeo} material=${res.wallMat} position=${[0, -0.05, 1.02]} />

      {/* 3 Glowing 3D Neon Koi */}
      ${res.koiPaths.map((p, idx) => html`
        <group
          key=${`koi_${idx}`}
          ref=${el => { koiRefs.current[idx] = el; }}
          position=${[p.cx, -0.15, -0.5]}
        >
          <mesh geometry=${res.koiBodyGeo} material=${res.koiMats[idx]} scale=${[0.85, 0.65, 2.2]} />
          <mesh geometry=${res.koiFinGeo} material=${res.koiMats[idx]} position=${[0, 0, 0.04]} />
          <group ref=${el => { koiTailRefs.current[idx] = el; }} position=${[0, 0, -0.22]}>
            <mesh
              geometry=${res.koiTailGeo}
              material=${res.koiMats[idx]}
              position=${[0, 0, -0.1]}
              rotation=${[Math.PI / 2, 0, 0]}
              scale=${[0.35, 1, 1.3]}
            />
          </group>
        </group>
      `)}

      {/* Autonomous 3D Patrol Drone over Central Canal Bridge */}
      <group ref=${droneRef} position=${[-1.5, 3.25, -0.5]}>
        <mesh geometry=${res.droneBodyGeo} material=${res.droneHullMat} />
        <mesh geometry=${res.droneArmGeo} material=${res.droneHullMat} rotation=${[0, Math.PI / 4, 0]} scale=${[1.8, 1, 1]} />
        <mesh geometry=${res.droneArmGeo} material=${res.droneHullMat} rotation=${[0, -Math.PI / 4, 0]} scale=${[1.8, 1, 1]} />
        <mesh geometry=${res.droneEyeGeo} material=${res.droneCyanMat} position=${[0, -0.02, 0.24]} />

        ${rotorOffsets.map((pos, idx) => html`
          <group key=${`rot_${idx}`} position=${pos}>
            <mesh geometry=${res.rotorRingGeo} material=${res.droneCyanMat} rotation=${[Math.PI / 2, 0, 0]} />
            <mesh
              ref=${el => { rotorRefs.current[idx] = el; }}
              geometry=${res.rotorBladeGeo}
              material=${res.droneHullMat}
            />
          </group>
        `)}

        <mesh geometry=${res.scanConeGeo} material=${res.scanConeMat} position=${[0, -1.62, 0]} />
      </group>
    </group>
  `;
}

/* ── Swaying Cherry Blossom Trees ('K') ── */
function SakuraTrees({ sakuras, cols, rows, reducedMotion, effectiveEco }) {
  const canopyRefs = useRef([]);

  const shared = useMemo(() => {
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.19, 0.9, 7);
    const lobeGeo = new THREE.IcosahedronGeometry(0.55, 1);
    const trunkMat = new THREE.MeshLambertMaterial({ color: '#331e1b' });
    const matDark = new THREE.MeshLambertMaterial({ color: '#9d174d' });
    const matMid = new THREE.MeshLambertMaterial({ color: '#ec4899' });
    const matLight = new THREE.MeshLambertMaterial({
      color: '#fbcfe8',
      emissive: '#be185d',
      emissiveIntensity: 0.16
    });
    return { trunkGeo, lobeGeo, trunkMat, matDark, matMid, matLight };
  }, []);

  useEffect(() => {
    return () => {
      shared.trunkGeo.dispose();
      shared.lobeGeo.dispose();
      shared.trunkMat.dispose();
      shared.matDark.dispose();
      shared.matMid.dispose();
      shared.matLight.dispose();
    };
  }, [shared]);

  useFrame(({ clock }) => {
    if (reducedMotion || effectiveEco) return;
    const t = clock.getElapsedTime();
    for (let i = 0; i < sakuras.length; i++) {
      const grp = canopyRefs.current[i];
      if (!grp) continue;
      const phase = sakuras[i].c * 0.7 + sakuras[i].r * 0.4;
      grp.rotation.z = Math.sin(t * 1.4 + phase) * 0.055;
      grp.rotation.x = Math.cos(t * 1.1 + phase) * 0.04;
    }
  });

  return html`
    <group>
      ${sakuras.map((sk, idx) => {
        const wx = tileToWorldX(sk.c, cols);
        const wz = tileToWorldZ(sk.r, rows);
        return html`
          <group key=${`${sk.c}_${sk.r}`} position=${[wx, 0, wz]}>
            <mesh geometry=${shared.trunkGeo} material=${shared.trunkMat} position=${[0, 0.45, 0]} />
            <group ref=${el => { canopyRefs.current[idx] = el; }} position=${[0, 1.05, 0]}>
              <mesh geometry=${shared.lobeGeo} material=${shared.matDark} position=${[-0.25, 0.05, 0.15]} scale=${[0.9, 0.76, 0.9]} />
              <mesh geometry=${shared.lobeGeo} material=${shared.matMid} position=${[0.24, 0.12, -0.14]} scale=${[0.84, 0.72, 0.84]} />
              <mesh geometry=${shared.lobeGeo} material=${shared.matMid} position=${[0, 0.34, 0.04]} scale=${[0.94, 0.7, 0.94]} />
              <mesh geometry=${shared.lobeGeo} material=${shared.matLight} position=${[-0.08, 0.48, -0.06]} scale=${[0.62, 0.54, 0.62]} />
            </group>
          </group>
        `;
      })}
    </group>
  `;
}

/* ── Pre-baked Radial Light-Pool Floor Decals (Zero pointLights) ── */
function LightPoolDecals({ world, spans, visible }) {
  const { MAP, COLS: cols, ROWS: rows } = world;

  const assets = useMemo(() => {
    const pools = [];
    const addBuildingPool = (span, color) => {
      if (!span) return;
      const d = span.maxR - span.minR + 1;
      const cx = tileToWorldX((span.minC + span.maxC) * 0.5, cols);
      const cz = tileToWorldZ((span.minR + span.maxR) * 0.5, rows);
      pools.push({ x: cx, z: cz + d * 0.5 + 0.85, sx: 6.2, sz: 4.6, color });
    };

    addBuildingPool(spans.b1, '#ef4444');
    addBuildingPool(spans.b2, '#38bdf8');

    if (spans.shrine) {
      pools.push({
        x: tileToWorldX((spans.shrine.minC + spans.shrine.maxC) * 0.5, cols),
        z: tileToWorldZ(spans.shrine.minR, rows) + 0.35,
        sx: 5.2,
        sz: 5.2,
        color: '#f472b6'
      });
    }
    if (spans.board) {
      pools.push({
        x: tileToWorldX((spans.board.minC + spans.board.maxC) * 0.5, cols),
        z: tileToWorldZ((spans.board.minR + spans.board.maxR) * 0.5, rows) + 0.55,
        sx: 4.6,
        sz: 3.8,
        color: '#f59e0b'
      });
    }
    if (spans.mail) {
      pools.push({
        x: tileToWorldX(spans.mail.minC, cols),
        z: tileToWorldZ(spans.mail.minR, rows) + 0.25,
        sx: 3.0,
        sz: 3.0,
        color: '#f472b6'
      });
    }

    for (let r = 0; r < rows; r++) {
      const rowStr = MAP[r] || '';
      for (let c = 0; c < cols; c++) {
        if (rowStr[c] === 'L') {
          pools.push({
            x: tileToWorldX(c, cols),
            z: tileToWorldZ(r, rows),
            sx: 3.1,
            sz: 3.1,
            color: '#fbbf24'
          });
        }
      }
    }

    const poolTex = makeLightPoolTexture();
    const poolGeo = new THREE.PlaneGeometry(1, 1);
    const poolMat = new THREE.MeshBasicMaterial({
      map: poolTex,
      color: '#ffffff',
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const mesh = new THREE.InstancedMesh(poolGeo, poolMat, Math.max(1, pools.length));
    mesh.count = pools.length;
    mesh.frustumCulled = false;

    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    pools.forEach((p, idx) => {
      dummy.position.set(p.x, 0.045, p.z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(p.sx, p.sz, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
      col.set(p.color);
      mesh.setColorAt(idx, col);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    return { mesh, poolTex, poolGeo, poolMat };
  }, [MAP, cols, rows, spans]);

  useEffect(() => {
    return () => {
      assets.poolGeo.dispose();
      assets.poolMat.dispose();
      assets.poolTex.dispose();
    };
  }, [assets]);

  return html`<primitive object=${assets.mesh} visible=${visible} />`;
}

/* ── Detailed Landmarks: GlyphLens, Arcus, Shrine, Intro Board, Mail, Kiosks, Props ── */
function Landmarks({ world, bloom, reducedMotion, effectiveEco }) {
  const { MAP, COLS: cols, ROWS: rows, PROPS } = world;

  const glyphReticleRef = useRef(null);
  const arcusHaloRef = useRef(null);
  const fanRefs = useRef([]);
  const mailCrystalRef = useRef(null);
  const filmCubeRef = useRef(null);
  const seriesCubeRef = useRef(null);
  const vinylDiscRef = useRef(null);
  const eqBarRefs = useRef([]);

  const spans = useMemo(() => ({
    b1: findTileSpan(MAP, '1', cols, rows),
    d1: findTileSpan(MAP, 'A', cols, rows),
    b2: findTileSpan(MAP, '2', cols, rows),
    d2: findTileSpan(MAP, 'D', cols, rows),
    shrine: findTileSpan(MAP, 'H', cols, rows),
    board: findTileSpan(MAP, 'B', cols, rows),
    mail: findTileSpan(MAP, 'M', cols, rows),
    films: findTileSpan(MAP, '3', cols, rows),
    series: findTileSpan(MAP, '4', cols, rows),
    albums: findTileSpan(MAP, '5', cols, rows),
    songs: findTileSpan(MAP, '6', cols, rows)
  }), [MAP, cols, rows]);

  const signsList = useMemo(() => {
    const defs = [
      { ch: 'S', l1: 'DIR // TOWN', l2: 'CENTRAL PLAZA', hex: '#f59e0b' },
      { ch: 'G', l1: '01 // LAB', l2: 'GLYPHLENS', hex: '#ef4444' },
      { ch: 'Z', l1: '02 // STUDIO', l2: 'ARCUS', hex: '#38bdf8' },
      { ch: 'Y', l1: 'CANAL', l2: 'BRIDGE', hex: '#f59e0b' },
      { ch: 'X', l1: 'NORTH', l2: 'SAKURA SHRINE', hex: '#f472b6' },
      { ch: 'J', l1: '← GLYPHLENS', l2: '↑ SHRINE', hex: '#ef4444' },
      { ch: 'Q', l1: 'ARCUS →', l2: '↑ SHRINE', hex: '#38bdf8' },
      { ch: 'I', l1: '↑ INTRO', l2: 'BRIDGE ↗', hex: '#f59e0b' },
      { ch: 'O', l1: '↑ MAIL', l2: '← BRIDGE', hex: '#f472b6' }
    ];
    const items = [];
    for (const def of defs) {
      const sp = findTileSpan(MAP, def.ch, cols, rows);
      if (sp) items.push({ ...def, wx: tileToWorldX(sp.minC, cols), wz: tileToWorldZ(sp.minR, rows) });
    }
    return items;
  }, [MAP, cols, rows]);

  const res = useMemo(() => {
    const glyphTex = makeMarqueeTexture('GLYPHLENS', 'OCR TRANSLATOR LAB', '#ef4444', false);
    const arcusTex = makeMarqueeTexture('ARCUS', 'LOCAL-FIRST STUDIO', '#38bdf8', true);
    const boardTex = makeIntroBoardTexture();

    const signTextures = {};
    const signMaterials = {};
    signsList.forEach(s => {
      const tx = makeSignTexture(s.l1, s.l2, s.hex);
      signTextures[s.ch] = tx;
      signMaterials[s.ch] = new THREE.MeshBasicMaterial({ map: tx });
    });

    const buildingBodyMat = new THREE.MeshLambertMaterial({ color: '#141724' });
    const roofDeckMat = new THREE.MeshLambertMaterial({ color: '#1d2133' });
    const darkMetalMat = new THREE.MeshLambertMaterial({ color: '#0b0d14' });
    const fanBladeMat = new THREE.MeshLambertMaterial({ color: '#94a3b8' });

    const crimsonNeonMat = new THREE.MeshLambertMaterial({
      color: '#ef4444', emissive: '#ef4444', emissiveIntensity: 1.9
    });
    const azureNeonMat = new THREE.MeshLambertMaterial({
      color: '#38bdf8', emissive: '#38bdf8', emissiveIntensity: 1.9
    });
    const amberWindowMat = new THREE.MeshLambertMaterial({
      color: '#fed7aa', emissive: '#fb923c', emissiveIntensity: 1.4
    });
    const cyanWindowMat = new THREE.MeshLambertMaterial({
      color: '#bae6fd', emissive: '#38bdf8', emissiveIntensity: 1.4
    });
    const pinkNeonMat = new THREE.MeshLambertMaterial({
      color: '#f472b6', emissive: '#f472b6', emissiveIntensity: 1.8
    });
    const amberNeonMat = new THREE.MeshLambertMaterial({
      color: '#f59e0b', emissive: '#f59e0b', emissiveIntensity: 1.7
    });

    const glyphMarqueeMat = new THREE.MeshBasicMaterial({ map: glyphTex });
    const arcusMarqueeMat = new THREE.MeshBasicMaterial({ map: arcusTex });
    const boardFaceMat = new THREE.MeshBasicMaterial({ map: boardTex });

    const toriiVermilionMat = new THREE.MeshLambertMaterial({ color: '#dc2626' });
    const toriiDarkMat = new THREE.MeshLambertMaterial({ color: '#7f1d1d' });
    const stoneMat = new THREE.MeshLambertMaterial({ color: '#272a36' });

    const woodMat = new THREE.MeshLambertMaterial({ color: '#5c2f22' });
    const kioskBodyMat = new THREE.MeshLambertMaterial({ color: '#121521' });
    const vinylMat = new THREE.MeshLambertMaterial({ color: '#0b0d12' });

    /* Shared Geometries */
    const acBoxGeo = new THREE.BoxGeometry(0.9, 0.34, 0.7);
    const fanBladeGeo = new THREE.BoxGeometry(0.46, 0.04, 0.09);
    const winGeo = new THREE.BoxGeometry(1.45, 0.95, 0.12);
    const doorGeo = new THREE.BoxGeometry(0.95, 1.35, 0.16);
    const reticleGeo = new THREE.OctahedronGeometry(0.42, 0);
    const haloGeo = new THREE.TorusGeometry(0.55, 0.08, 12, 28);

    const benchSeatGeo = new THREE.BoxGeometry(0.84, 0.1, 0.42);
    const benchBackGeo = new THREE.BoxGeometry(0.84, 0.28, 0.08);
    const benchLegGeo = new THREE.BoxGeometry(0.1, 0.24, 0.38);

    const vendBodyGeo = new THREE.BoxGeometry(0.68, 1.15, 0.54);
    const vendScreenGeo = new THREE.BoxGeometry(0.48, 0.46, 0.06);

    const kioskPedestalGeo = new THREE.BoxGeometry(0.76, 0.74, 0.66);
    const kioskTrimGeo = new THREE.BoxGeometry(0.8, 0.08, 0.7);
    const smallCubeGeo = new THREE.BoxGeometry(0.36, 0.36, 0.36);
    const crtGeo = new THREE.BoxGeometry(0.48, 0.36, 0.34);
    const vinylGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.04, 24);
    const vinylLabelGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16);
    const eqBarGeo = new THREE.BoxGeometry(0.1, 0.44, 0.1);

    const signPostGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.72, 6);
    const signBoardGeo = new THREE.BoxGeometry(0.88, 0.46, 0.08);
    const signFaceGeo = new THREE.PlaneGeometry(0.82, 0.4);

    return {
      glyphTex, arcusTex, boardTex, signTextures, signMaterials,
      buildingBodyMat, roofDeckMat, darkMetalMat, fanBladeMat,
      crimsonNeonMat, azureNeonMat, amberWindowMat, cyanWindowMat, pinkNeonMat, amberNeonMat,
      glyphMarqueeMat, arcusMarqueeMat, boardFaceMat,
      toriiVermilionMat, toriiDarkMat, stoneMat, woodMat, kioskBodyMat, vinylMat,
      acBoxGeo, fanBladeGeo, winGeo, doorGeo, reticleGeo, haloGeo,
      benchSeatGeo, benchBackGeo, benchLegGeo, vendBodyGeo, vendScreenGeo,
      kioskPedestalGeo, kioskTrimGeo, smallCubeGeo, crtGeo, vinylGeo, vinylLabelGeo, eqBarGeo,
      signPostGeo, signBoardGeo, signFaceGeo
    };
  }, [signsList]);

  useEffect(() => {
    const mult = bloom ? 1 : 0.32;
    res.crimsonNeonMat.emissiveIntensity = 1.9 * mult;
    res.azureNeonMat.emissiveIntensity = 1.9 * mult;
    res.amberWindowMat.emissiveIntensity = 1.4 * mult;
    res.cyanWindowMat.emissiveIntensity = 1.4 * mult;
    res.pinkNeonMat.emissiveIntensity = 1.8 * mult;
    res.amberNeonMat.emissiveIntensity = 1.7 * mult;
  }, [bloom, res]);

  useEffect(() => {
    return () => {
      Object.values(res.signTextures).forEach(t => t.dispose());
      Object.values(res.signMaterials).forEach(m => m.dispose());
      [
        res.glyphTex, res.arcusTex, res.boardTex,
        res.buildingBodyMat, res.roofDeckMat, res.darkMetalMat, res.fanBladeMat,
        res.crimsonNeonMat, res.azureNeonMat, res.amberWindowMat, res.cyanWindowMat,
        res.pinkNeonMat, res.amberNeonMat, res.glyphMarqueeMat, res.arcusMarqueeMat,
        res.boardFaceMat, res.toriiVermilionMat, res.toriiDarkMat, res.stoneMat,
        res.woodMat, res.kioskBodyMat, res.vinylMat,
        res.acBoxGeo, res.fanBladeGeo, res.winGeo, res.doorGeo, res.reticleGeo, res.haloGeo,
        res.benchSeatGeo, res.benchBackGeo, res.benchLegGeo, res.vendBodyGeo, res.vendScreenGeo,
        res.kioskPedestalGeo, res.kioskTrimGeo, res.smallCubeGeo, res.crtGeo,
        res.vinylGeo, res.vinylLabelGeo, res.eqBarGeo,
        res.signPostGeo, res.signBoardGeo, res.signFaceGeo
      ].forEach(d => d.dispose());
    };
  }, [res]);

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = clock.getElapsedTime();

    if (glyphReticleRef.current) {
      glyphReticleRef.current.rotation.y = t * 1.4;
      glyphReticleRef.current.position.y = 3.7 + Math.sin(t * 2.2) * 0.16;
    }
    if (arcusHaloRef.current) {
      arcusHaloRef.current.rotation.y = -t * 1.25;
      arcusHaloRef.current.rotation.x = Math.sin(t * 1.1) * 0.35 + 0.4;
      arcusHaloRef.current.position.y = 3.7 + Math.cos(t * 2.0) * 0.15;
    }
    if (mailCrystalRef.current) {
      mailCrystalRef.current.rotation.y = t * 1.6;
      mailCrystalRef.current.position.y = 1.42 + Math.sin(t * 2.6) * 0.08;
    }

    if (effectiveEco) return;

    for (let i = 0; i < fanRefs.current.length; i++) {
      const f = fanRefs.current[i];
      if (f) f.rotation.y = t * (i % 2 === 0 ? 5.5 : -5.5);
    }
    if (filmCubeRef.current) {
      filmCubeRef.current.rotation.y = t * 1.3;
      filmCubeRef.current.rotation.x = t * 0.7;
      filmCubeRef.current.position.y = 1.28 + Math.sin(t * 2.4) * 0.07;
    }
    if (seriesCubeRef.current) {
      seriesCubeRef.current.rotation.y = -t * 1.1;
      seriesCubeRef.current.position.y = 1.28 + Math.cos(t * 2.3) * 0.07;
    }
    if (vinylDiscRef.current) {
      vinylDiscRef.current.rotation.y = t * 3.1;
    }
    for (let i = 0; i < 4; i++) {
      const bar = eqBarRefs.current[i];
      if (!bar) continue;
      const sy = 0.4 + 0.85 * (0.5 + 0.5 * Math.sin(t * 6.5 + i * 1.35));
      bar.scale.y = sy;
      bar.position.y = 1.0 + sy * 0.22;
    }
  });

  const renderHeroBuilding = (span, doorSpan, isArcus) => {
    if (!span) return null;
    const w = span.maxC - span.minC + 1;
    const d = span.maxR - span.minR + 1;
    const cx = tileToWorldX((span.minC + span.maxC) * 0.5, cols);
    const cz = tileToWorldZ((span.minR + span.maxR) * 0.5, rows);
    const doorX = doorSpan ? tileToWorldX((doorSpan.minC + doorSpan.maxC) * 0.5, cols) - cx : 0;
    const neonMat = isArcus ? res.azureNeonMat : res.crimsonNeonMat;
    const winMat = isArcus ? res.cyanWindowMat : res.amberWindowMat;
    const marqueeMat = isArcus ? res.arcusMarqueeMat : res.glyphMarqueeMat;
    const fanOffsetIdx = isArcus ? 2 : 0;

    return html`
      <group position=${[cx, 0, cz]}>
        {/* Main Brutalist Body */}
        <mesh material=${res.buildingBodyMat} position=${[0, 1.25, 0]}>
          <boxGeometry args=${[w - 0.15, 2.5, d - 0.15]} />
        </mesh>
        {/* Rooftop Deck Rim */}
        <mesh material=${res.roofDeckMat} position=${[0, 2.58, 0]}>
          <boxGeometry args=${[w + 0.12, 0.18, d + 0.12]} />
        </mesh>
        {/* Glowing Neon Roof Trim */}
        <mesh material=${neonMat} position=${[0, 2.68, d * 0.5 - 0.02]}>
          <boxGeometry args=${[w - 0.2, 0.07, 0.08]} />
        </mesh>

        {/* Rooftop AC Units + Rotating Turbine Fans */}
        <group position=${[-1.6, 2.84, -0.7]}>
          <mesh geometry=${res.acBoxGeo} material=${res.roofDeckMat} />
          <mesh
            ref=${el => { fanRefs.current[fanOffsetIdx] = el; }}
            geometry=${res.fanBladeGeo}
            material=${res.fanBladeMat}
            position=${[0, 0.21, 0]}
          />
        </group>
        <group position=${[1.6, 2.84, -0.7]}>
          <mesh geometry=${res.acBoxGeo} material=${res.roofDeckMat} />
          <mesh
            ref=${el => { fanRefs.current[fanOffsetIdx + 1] = el; }}
            geometry=${res.fanBladeGeo}
            material=${res.fanBladeMat}
            position=${[0, 0.21, 0]}
          />
        </group>

        {/* Glowing Marquee Signboard */}
        <mesh material=${res.darkMetalMat} position=${[0, 2.15, d * 0.5 - 0.02]}>
          <boxGeometry args=${[w - 1.1, 0.85, 0.18]} />
        </mesh>
        <mesh material=${marqueeMat} position=${[0, 2.15, d * 0.5 + 0.08]}>
          <planeGeometry args=${[w - 1.25, 0.72]} />
        </mesh>

        {/* Illuminated Windows */}
        <mesh geometry=${res.winGeo} material=${winMat} position=${[-2.05, 0.92, d * 0.5 - 0.06]} />
        <mesh geometry=${res.winGeo} material=${winMat} position=${[2.05, 0.92, d * 0.5 - 0.06]} />

        {/* Recessed Entrance Door */}
        <mesh geometry=${res.doorGeo} material=${res.darkMetalMat} position=${[doorX, 0.68, d * 0.5 - 0.04]} />
        <mesh material=${neonMat} position=${[doorX, 1.38, d * 0.5 + 0.04]}>
          <boxGeometry args=${[1.08, 0.08, 0.1]} />
        </mesh>

        {/* Floating Rotating Landmark Beacon */}
        ${isArcus
          ? html`<mesh ref=${arcusHaloRef} geometry=${res.haloGeo} material=${res.azureNeonMat} position=${[0, 3.7, 0]} />`
          : html`<mesh ref=${glyphReticleRef} geometry=${res.reticleGeo} material=${res.crimsonNeonMat} position=${[0, 3.7, 0]} />`}
      </group>
    `;
  };

  return html`
    <group>
      {/* 0. Soft Pre-baked Radial Light-Pool Floor Decals */}
      <${LightPoolDecals} world=${world} spans=${spans} visible=${Boolean(bloom && !effectiveEco)} />

      {/* 1. GlyphLens Lab & Arcus Studio */}
      ${renderHeroBuilding(spans.b1, spans.d1, false)}
      ${renderHeroBuilding(spans.b2, spans.d2, true)}

      {/* 2. North Sakura Shrine ('H') */}
      ${spans.shrine && html`
        <group
          position=${[
            tileToWorldX((spans.shrine.minC + spans.shrine.maxC) * 0.5, cols),
            0,
            tileToWorldZ(spans.shrine.minR, rows)
          ]}
        >
          {/* Torii Pillars */}
          <mesh material=${res.toriiDarkMat} position=${[-1.05, 1.1, 0]}>
            <cylinderGeometry args=${[0.12, 0.14, 2.2, 10]} />
          </mesh>
          <mesh material=${res.toriiDarkMat} position=${[1.05, 1.1, 0]}>
            <cylinderGeometry args=${[0.12, 0.14, 2.2, 10]} />
          </mesh>
          {/* Dual Crossbeams */}
          <mesh material=${res.toriiVermilionMat} position=${[0, 2.22, 0]}>
            <boxGeometry args=${[2.9, 0.2, 0.26]} />
          </mesh>
          <mesh material=${res.toriiVermilionMat} position=${[0, 1.72, 0]}>
            <boxGeometry args=${[2.35, 0.14, 0.18]} />
          </mesh>
          {/* Glowing Stone Monument */}
          <mesh material=${res.stoneMat} position=${[0, 0.55, 0.1]}>
            <boxGeometry args=${[0.72, 1.0, 0.42]} />
          </mesh>
          <mesh material=${res.pinkNeonMat} position=${[0, 0.62, 0.32]}>
            <boxGeometry args=${[0.24, 0.52, 0.04]} />
          </mesh>
          {/* Stylized Shrine Cat */}
          <group position=${[1.42, 0.22, 0.28]}>
            <mesh material=${res.stoneMat} position=${[0, 0, 0]}>
              <boxGeometry args=${[0.22, 0.22, 0.26]} />
            </mesh>
            <mesh material=${res.pinkNeonMat} position=${[-0.07, 0.15, 0.06]}>
              <coneGeometry args=${[0.05, 0.1, 4]} />
            </mesh>
            <mesh material=${res.pinkNeonMat} position=${[0.07, 0.15, 0.06]}>
              <coneGeometry args=${[0.05, 0.1, 4]} />
            </mesh>
          </group>
        </group>
      `}

      {/* 3. Intro Billboard ('B') */}
      ${spans.board && html`
        <group
          position=${[
            tileToWorldX((spans.board.minC + spans.board.maxC) * 0.5, cols),
            0,
            tileToWorldZ((spans.board.minR + spans.board.maxR) * 0.5, rows)
          ]}
        >
          <mesh material=${res.darkMetalMat} position=${[-0.95, 0.6, 0]}>
            <boxGeometry args=${[0.22, 1.2, 0.22]} />
          </mesh>
          <mesh material=${res.darkMetalMat} position=${[0.95, 0.6, 0]}>
            <boxGeometry args=${[0.22, 1.2, 0.22]} />
          </mesh>
          <mesh material=${res.darkMetalMat} position=${[0, 1.35, 0]}>
            <boxGeometry args=${[2.78, 1.48, 0.26]} />
          </mesh>
          <mesh material=${res.amberNeonMat} position=${[0, 2.1, 0]}>
            <boxGeometry args=${[2.82, 0.06, 0.28]} />
          </mesh>
          <mesh material=${res.boardFaceMat} position=${[0, 1.35, 0.14]}>
            <planeGeometry args=${[2.64, 1.32]} />
          </mesh>
        </group>
      `}

      {/* 4. Mail Terminal ('M') */}
      ${spans.mail && html`
        <group
          position=${[
            tileToWorldX(spans.mail.minC, cols),
            0,
            tileToWorldZ(spans.mail.minR, rows)
          ]}
        >
          <mesh material=${res.darkMetalMat} position=${[0, 0.42, 0]}>
            <boxGeometry args=${[0.64, 0.84, 0.58]} />
          </mesh>
          <mesh material=${res.pinkNeonMat} position=${[0, 0.86, 0]}>
            <boxGeometry args=${[0.7, 0.08, 0.64]} />
          </mesh>
          <mesh
            ref=${mailCrystalRef}
            material=${res.pinkNeonMat}
            position=${[0, 1.42, 0]}
            scale=${[1.2, 0.85, 0.5]}
          >
            <octahedronGeometry args=${[0.28, 0]} />
          </mesh>
        </group>
      `}

      {/* 5. Rewatch Corner Kiosks ('3', '4', '5', '6') */}
      ${spans.films && html`
        <group position=${[tileToWorldX(spans.films.minC, cols), 0, tileToWorldZ(spans.films.minR, rows)]}>
          <mesh geometry=${res.kioskPedestalGeo} material=${res.kioskBodyMat} position=${[0, 0.37, 0]} />
          <mesh geometry=${res.kioskTrimGeo} material=${res.crimsonNeonMat} position=${[0, 0.76, 0]} />
          <mesh ref=${filmCubeRef} geometry=${res.smallCubeGeo} material=${res.crimsonNeonMat} position=${[0, 1.28, 0]} />
        </group>
      `}
      ${spans.series && html`
        <group position=${[tileToWorldX(spans.series.minC, cols), 0, tileToWorldZ(spans.series.minR, rows)]}>
          <mesh geometry=${res.kioskPedestalGeo} material=${res.kioskBodyMat} position=${[0, 0.37, 0]} />
          <mesh geometry=${res.kioskTrimGeo} material=${res.azureNeonMat} position=${[0, 0.76, 0]} />
          <mesh ref=${seriesCubeRef} geometry=${res.crtGeo} material=${res.cyanWindowMat} position=${[0, 1.28, 0]} />
        </group>
      `}
      ${spans.albums && html`
        <group position=${[tileToWorldX(spans.albums.minC, cols), 0, tileToWorldZ(spans.albums.minR, rows)]}>
          <mesh geometry=${res.kioskPedestalGeo} material=${res.kioskBodyMat} position=${[0, 0.37, 0]} />
          <mesh geometry=${res.kioskTrimGeo} material=${res.amberNeonMat} position=${[0, 0.76, 0]} />
          <group ref=${vinylDiscRef} position=${[0, 1.05, 0]} rotation=${[0.35, 0, 0]}>
            <mesh geometry=${res.vinylGeo} material=${res.vinylMat} />
            <mesh geometry=${res.vinylLabelGeo} material=${res.amberNeonMat} position=${[0, 0.01, 0]} />
          </group>
        </group>
      `}
      ${spans.songs && html`
        <group position=${[tileToWorldX(spans.songs.minC, cols), 0, tileToWorldZ(spans.songs.minR, rows)]}>
          <mesh geometry=${res.kioskPedestalGeo} material=${res.kioskBodyMat} position=${[0, 0.37, 0]} />
          <mesh geometry=${res.kioskTrimGeo} material=${res.pinkNeonMat} position=${[0, 0.76, 0]} />
          ${[0, 1, 2, 3].map(idx => html`
            <mesh
              key=${idx}
              ref=${el => { eqBarRefs.current[idx] = el; }}
              geometry=${res.eqBarGeo}
              material=${res.pinkNeonMat}
              position=${[-0.24 + idx * 0.16, 1.12, 0]}
            />
          `)}
        </group>
      `}

      {/* 6. Vending Machines ('V') */}
      ${PROPS.vendors.map(v => {
        const isWest = v.c < 20;
        const wx = tileToWorldX(v.c, cols);
        const wz = tileToWorldZ(v.r, rows);
        return html`
          <group key=${`v_${v.c}_${v.r}`} position=${[wx, 0, wz]}>
            <mesh geometry=${res.vendBodyGeo} material=${res.kioskBodyMat} position=${[0, 0.58, 0]} />
            <mesh
              geometry=${res.vendScreenGeo}
              material=${isWest ? res.crimsonNeonMat : res.azureNeonMat}
              position=${[0, 0.72, 0.26]}
            />
            <mesh material=${res.pinkNeonMat} position=${[0, 1.18, 0]}>
              <boxGeometry args=${[0.7, 0.05, 0.56]} />
            </mesh>
          </group>
        `;
      })}

      {/* 7. Plaza Benches ('N') */}
      ${PROPS.benches.map(b => {
        const wx = tileToWorldX(b.c, cols);
        const wz = tileToWorldZ(b.r, rows);
        return html`
          <group key=${`n_${b.c}_${b.r}`} position=${[wx, 0, wz]}>
            <mesh geometry=${res.benchLegGeo} material=${res.darkMetalMat} position=${[-0.3, 0.12, 0]} />
            <mesh geometry=${res.benchLegGeo} material=${res.darkMetalMat} position=${[0.3, 0.12, 0]} />
            <mesh geometry=${res.benchSeatGeo} material=${res.woodMat} position=${[0, 0.27, 0.02]} />
            <mesh geometry=${res.benchBackGeo} material=${res.woodMat} position=${[0, 0.44, -0.17]} />
          </group>
        `;
      })}

      {/* 8. Dialog Signs & Direction Posters */}
      ${signsList.map(s => html`
        <group key=${s.ch} position=${[s.wx, 0, s.wz]}>
          <mesh geometry=${res.signPostGeo} material=${res.darkMetalMat} position=${[0, 0.36, 0]} />
          <mesh geometry=${res.signBoardGeo} material=${res.kioskBodyMat} position=${[0, 0.78, 0]} />
          <mesh geometry=${res.signFaceGeo} material=${res.signMaterials[s.ch]} position=${[0, 0.78, 0.045]} />
        </group>
      `)}
    </group>
  `;
}

/* ── Articulated 3D Cyberpunk Ansh Character + Guide Ren NPC ── */
function Characters({ world, reducedMotion }) {
  const { COLS: cols, ROWS: rows, T: tSize, INTERACTABLES } = world;
  const playerGroupRef = useRef(null);
  const torsoRef = useRef(null);
  const leftLegRef = useRef(null);
  const rightLegRef = useRef(null);
  const leftArmRef = useRef(null);
  const rightArmRef = useRef(null);
  const currentYawRef = useRef(Math.PI);

  const npcGroupRef = useRef(null);
  const npcHeadRef = useRef(null);

  const npcObj = useMemo(
    () => INTERACTABLES.find(i => i.id === 'npc_guide') || null,
    [INTERACTABLES]
  );

  const npcPos = useMemo(() => {
    if (!npcObj) return [0, 0, 0];
    const [wx, wz] = getInteractableWorldPos(npcObj, tSize, cols, rows);
    return [wx, 0, wz];
  }, [npcObj, tSize, cols, rows]);

  const mats = useMemo(() => ({
    shadow: new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.45 }),
    boots: new THREE.MeshLambertMaterial({ color: '#3f3f46' }),
    shirt: new THREE.MeshLambertMaterial({ color: '#e4e4e7' }),
    jacket: new THREE.MeshLambertMaterial({ color: '#18181b' }),
    scarf: new THREE.MeshLambertMaterial({
      color: '#ef4444', emissive: '#991b1b', emissiveIntensity: 0.35
    }),
    face: new THREE.MeshLambertMaterial({ color: '#f4f4f5' }),
    visor: new THREE.MeshLambertMaterial({
      color: '#09090b', emissive: '#38bdf8', emissiveIntensity: 0.35
    }),
    cap: new THREE.MeshLambertMaterial({ color: '#dc2626' }),
    capBrim: new THREE.MeshLambertMaterial({ color: '#991b1b' }),
    npcJacket: new THREE.MeshLambertMaterial({
      color: '#ec4899', emissive: '#831843', emissiveIntensity: 0.3
    }),
    npcHair: new THREE.MeshLambertMaterial({ color: '#1e1b4b' })
  }), []);

  useEffect(() => {
    return () => {
      Object.values(mats).forEach(m => m.dispose());
    };
  }, [mats]);

  useFrame(({ clock }, delta) => {
    const P = window.AnshPlayer;
    if (!P || !P.state || !playerGroupRef.current) return;

    const st = P.state;
    const px = pxToWorldX(st.x, tSize, cols);
    const pz = pxToWorldZ(st.y, tSize, rows);
    playerGroupRef.current.position.set(px, 0, pz);

    const targetYaw = st.moveAngle !== undefined ? st.moveAngle : (DIR_YAW[st.dir] ?? 0);
    const rotAlpha = Math.min(1, delta * 14);
    currentYawRef.current = lerpAngle(currentYawRef.current, targetYaw, rotAlpha);
    playerGroupRef.current.rotation.y = currentYawRef.current;

    const time = clock.getElapsedTime();
    if (st.sitting) {
      if (leftLegRef.current) {
        leftLegRef.current.position.y = 0.32 - 0.16;
        leftLegRef.current.rotation.x = -1.35;
      }
      if (rightLegRef.current) {
        rightLegRef.current.position.y = 0.32 - 0.16;
        rightLegRef.current.rotation.x = -1.35;
      }
      if (leftArmRef.current) leftArmRef.current.rotation.x = -0.28;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -0.28;
      if (torsoRef.current) torsoRef.current.position.y = 0.52 - 0.16;
    } else if (st.moving && !reducedMotion) {
      const freq = st.sprinting ? 14 : 9.5;
      const swing = Math.sin(st.walkTime * freq) * (st.sprinting ? 0.72 : 0.52);
      const bob = Math.abs(Math.cos(st.walkTime * freq)) * 0.055;
      if (leftLegRef.current) {
        leftLegRef.current.position.y = 0.32;
        leftLegRef.current.rotation.x = swing;
      }
      if (rightLegRef.current) {
        rightLegRef.current.position.y = 0.32;
        rightLegRef.current.rotation.x = -swing;
      }
      if (leftArmRef.current) leftArmRef.current.rotation.x = -swing * 0.7;
      if (rightArmRef.current) rightArmRef.current.rotation.x = swing * 0.7;
      if (torsoRef.current) torsoRef.current.position.y = 0.52 + bob;
    } else {
      const idleBob = reducedMotion ? 0 : Math.sin(time * 2.4) * 0.018;
      if (leftLegRef.current) {
        leftLegRef.current.position.y = 0.32;
        leftLegRef.current.rotation.x *= 0.8;
      }
      if (rightLegRef.current) {
        rightLegRef.current.position.y = 0.32;
        rightLegRef.current.rotation.x *= 0.8;
      }
      if (leftArmRef.current) leftArmRef.current.rotation.x *= 0.8;
      if (rightArmRef.current) rightArmRef.current.rotation.x *= 0.8;
      if (torsoRef.current) torsoRef.current.position.y = 0.52 + idleBob;
    }

    if (npcGroupRef.current && !reducedMotion) {
      npcGroupRef.current.position.y = Math.sin(time * 2.1 + 1.1) * 0.015;
      if (npcHeadRef.current) {
        const dx = px - npcPos[0];
        const dz = pz - npcPos[2];
        const distSq = dx * dx + dz * dz;
        if (distSq < 16) {
          const lookYaw = Math.atan2(dx, dz);
          npcHeadRef.current.rotation.y = lerpAngle(npcHeadRef.current.rotation.y, lookYaw, Math.min(1, delta * 5));
        } else {
          npcHeadRef.current.rotation.y = lerpAngle(npcHeadRef.current.rotation.y, Math.sin(time * 0.8) * 0.25, Math.min(1, delta * 3));
        }
      }
    }
  });

  return html`
    <group>
      {/* Articulated Cyberpunk Ansh */}
      <group ref=${playerGroupRef}>
        <mesh material=${mats.shadow} position=${[0, 0.046, 0]} rotation=${[-Math.PI / 2, 0, 0]}>
          <circleGeometry args=${[0.32, 16]} />
        </mesh>

        {/* Animated Legs */}
        <group ref=${leftLegRef} position=${[-0.1, 0.32, 0]}>
          <mesh material=${mats.boots} position=${[0, -0.15, 0]}>
            <boxGeometry args=${[0.14, 0.3, 0.16]} />
          </mesh>
        </group>
        <group ref=${rightLegRef} position=${[0.1, 0.32, 0]}>
          <mesh material=${mats.boots} position=${[0, -0.15, 0]}>
            <boxGeometry args=${[0.14, 0.3, 0.16]} />
          </mesh>
        </group>

        {/* Torso + Jacket + Scarf + Arms + Head */}
        <group ref=${torsoRef} position=${[0, 0.52, 0]}>
          <mesh material=${mats.shirt} position=${[0, 0.0, 0]}>
            <boxGeometry args=${[0.36, 0.38, 0.22]} />
          </mesh>
          <mesh material=${mats.jacket} position=${[0, 0.01, 0.02]}>
            <boxGeometry args=${[0.3, 0.34, 0.23]} />
          </mesh>
          {/* Crimson Collar / Scarf */}
          <mesh material=${mats.scarf} position=${[0, 0.18, 0]}>
            <boxGeometry args=${[0.4, 0.1, 0.26]} />
          </mesh>
          <mesh material=${mats.scarf} position=${[-0.14, 0.05, -0.14]} rotation=${[0.2, 0, 0.15]}>
            <boxGeometry args=${[0.1, 0.28, 0.06]} />
          </mesh>

          {/* Arms */}
          <group ref=${leftArmRef} position=${[-0.24, 0.12, 0]}>
            <mesh material=${mats.jacket} position=${[0, -0.13, 0]}>
              <boxGeometry args=${[0.1, 0.3, 0.12]} />
            </mesh>
          </group>
          <group ref=${rightArmRef} position=${[0.24, 0.12, 0]}>
            <mesh material=${mats.jacket} position=${[0, -0.13, 0]}>
              <boxGeometry args=${[0.1, 0.3, 0.12]} />
            </mesh>
          </group>

          {/* Head + Visor + Crimson Cap */}
          <group position=${[0, 0.38, 0]}>
            <mesh material=${mats.face}>
              <boxGeometry args=${[0.32, 0.3, 0.28]} />
            </mesh>
            <mesh material=${mats.visor} position=${[0, 0.01, 0.145]}>
              <boxGeometry args=${[0.26, 0.09, 0.03]} />
            </mesh>
            <mesh material=${mats.cap} position=${[0, 0.16, 0]}>
              <boxGeometry args=${[0.36, 0.12, 0.32]} />
            </mesh>
            <mesh material=${mats.capBrim} position=${[0, 0.11, 0.17]}>
              <boxGeometry args=${[0.34, 0.04, 0.14]} />
            </mesh>
          </group>
        </group>
      </group>

      {/* Guide Ren NPC */}
      ${npcObj && html`
        <group position=${npcPos}>
          <mesh material=${mats.shadow} position=${[0, 0.046, 0]} rotation=${[-Math.PI / 2, 0, 0]}>
            <circleGeometry args=${[0.3, 16]} />
          </mesh>
          <group ref=${npcGroupRef}>
            <mesh material=${mats.boots} position=${[-0.09, 0.16, 0]}>
              <boxGeometry args=${[0.13, 0.3, 0.15]} />
            </mesh>
            <mesh material=${mats.boots} position=${[0.09, 0.16, 0]}>
              <boxGeometry args=${[0.13, 0.3, 0.15]} />
            </mesh>
            <mesh material=${mats.npcJacket} position=${[0, 0.52, 0]}>
              <boxGeometry args=${[0.35, 0.38, 0.22]} />
            </mesh>
            <group ref=${npcHeadRef} position=${[0, 0.89, 0]}>
              <mesh material=${mats.face}>
                <boxGeometry args=${[0.3, 0.28, 0.26]} />
              </mesh>
              <mesh material=${mats.visor} position=${[0, 0.01, 0.135]}>
                <boxGeometry args=${[0.24, 0.08, 0.03]} />
              </mesh>
              <mesh material=${mats.npcHair} position=${[0, 0.15, -0.02]}>
                <boxGeometry args=${[0.34, 0.12, 0.3]} />
              </mesh>
            </group>
          </group>
        </group>
      `}
    </group>
  `;
}

/* ── Glowing Proximity Halo Ring around Active Interactable ── */
function ProximityHalo({ activeObj, world, reducedMotion }) {
  const ringRef = useRef(null);
  const innerRef = useRef(null);

  const ringMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#ef4444', transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
    []
  );
  const innerMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#ef4444', transparent: true, opacity: 0.28, side: THREE.DoubleSide }),
    []
  );

  useEffect(() => {
    return () => {
      ringMat.dispose();
      innerMat.dispose();
    };
  }, [ringMat, innerMat]);

  useFrame(({ clock }) => {
    if (!ringRef.current || !innerRef.current) return;
    if (!activeObj) {
      ringRef.current.visible = false;
      innerRef.current.visible = false;
      return;
    }

    const pos = getInteractableWorldPos(activeObj, world.T, world.COLS, world.ROWS);
    if (!pos) return;

    const hex = ACCENT_HEX[activeObj.accent] || '#ef4444';
    ringMat.color.set(hex);
    innerMat.color.set(hex);

    const t = clock.getElapsedTime();
    const pulse = reducedMotion ? 1 : 1 + Math.sin(t * 4.5) * 0.1;

    ringRef.current.visible = true;
    innerRef.current.visible = true;
    ringRef.current.position.set(pos[0], 0.06, pos[1]);
    innerRef.current.position.set(pos[0], 0.055, pos[1]);

    const radiusScale = activeObj.kind === 'building' ? 1.55 : activeObj.kind === 'board' ? 1.35 : 0.92;
    ringRef.current.scale.set(radiusScale * pulse, radiusScale * pulse, 1);
    innerRef.current.scale.set(radiusScale * 0.86, radiusScale * 0.86, 1);
    if (!reducedMotion) {
      ringRef.current.rotation.z = t * 0.9;
    }
  });

  return html`
    <group>
      <mesh ref=${ringRef} material=${ringMat} rotation=${[-Math.PI / 2, 0, 0]} visible=${false}>
        <ringGeometry args=${[0.58, 0.72, 24]} />
      </mesh>
      <mesh ref=${innerRef} material=${innerMat} rotation=${[-Math.PI / 2, 0, 0]} visible=${false}>
        <circleGeometry args=${[0.56, 24]} />
      </mesh>
    </group>
  `;
}

/* ── Volumetric 3D Rain (340 / 85 Eco) + Drifting Sakura Petals (56 / 20 Eco) ── */
function WeatherParticles({ rainMode, reducedMotion, effectiveEco }) {
  const rainPointsRef = useRef(null);
  const petalPointsRef = useRef(null);

  const RAIN_COUNT = 340;
  const RAIN_ECO_COUNT = 85;
  const PETAL_COUNT = 56;
  const PETAL_ECO_COUNT = 20;

  const activeRainCount = rainMode === 'off'
    ? 0
    : effectiveEco
      ? (rainMode === 'light' ? 50 : RAIN_ECO_COUNT)
      : (rainMode === 'light' ? 140 : RAIN_COUNT);
  const activePetalCount = effectiveEco ? PETAL_ECO_COUNT : PETAL_COUNT;

  const assets = useMemo(() => {
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(RAIN_COUNT * 3);
    const rainSpd = new Float32Array(RAIN_COUNT);
    for (let i = 0; i < RAIN_COUNT; i++) {
      rainPos[i * 3] = (hash2D(i, 1.3) - 0.5) * 44;
      rainPos[i * 3 + 1] = hash2D(i, 2.7) * 16;
      rainPos[i * 3 + 2] = (hash2D(i, 4.1) - 0.5) * 28;
      rainSpd[i] = 14 + hash2D(i, 7.9) * 8;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));

    const rainTex = makeParticleTexture(true);
    const rainMat = new THREE.PointsMaterial({
      size: 0.42,
      map: rainTex,
      color: '#bae6fd',
      transparent: true,
      opacity: 0.48,
      depthWrite: false
    });

    const petalGeo = new THREE.BufferGeometry();
    const petalPos = new Float32Array(PETAL_COUNT * 3);
    const petalMeta = new Float32Array(PETAL_COUNT * 3);
    for (let i = 0; i < PETAL_COUNT; i++) {
      petalPos[i * 3] = (hash2D(i, 11.1) - 0.5) * 40;
      petalPos[i * 3 + 1] = 0.3 + hash2D(i, 13.7) * 8.5;
      petalPos[i * 3 + 2] = (hash2D(i, 17.3) - 0.5) * 24;
      petalMeta[i * 3] = 0.6 + hash2D(i, 19.1) * 0.7;
      petalMeta[i * 3 + 1] = 0.7 + hash2D(i, 23.3) * 0.6;
      petalMeta[i * 3 + 2] = i * 0.61;
    }
    petalGeo.setAttribute('position', new THREE.BufferAttribute(petalPos, 3));

    const petalTex = makeParticleTexture(false);
    const petalMat = new THREE.PointsMaterial({
      size: 0.22,
      map: petalTex,
      color: '#f9a8d4',
      transparent: true,
      opacity: 0.75,
      depthWrite: false
    });

    return {
      rainGeo, rainPos, rainSpd, rainTex, rainMat,
      petalGeo, petalPos, petalMeta, petalTex, petalMat
    };
  }, []);

  useEffect(() => {
    assets.rainGeo.setDrawRange(0, activeRainCount);
    assets.petalGeo.setDrawRange(0, activePetalCount);
  }, [activeRainCount, activePetalCount, assets]);

  useEffect(() => {
    return () => {
      assets.rainGeo.dispose();
      assets.rainMat.dispose();
      assets.rainTex.dispose();
      assets.petalGeo.dispose();
      assets.petalMat.dispose();
      assets.petalTex.dispose();
    };
  }, [assets]);

  useFrame(({ clock }, delta) => {
    if (reducedMotion) return;
    const dt = Math.min(delta, 0.05);
    const t = clock.getElapsedTime();

    if (activeRainCount > 0 && rainPointsRef.current) {
      const pos = assets.rainPos;
      const spd = assets.rainSpd;
      for (let i = 0; i < activeRainCount; i++) {
        const idx = i * 3;
        pos[idx + 1] -= spd[i] * dt;
        pos[idx] -= 1.6 * dt;
        if (pos[idx + 1] < 0) {
          pos[idx + 1] = 15.5;
          pos[idx] = (hash2D(i, t * 0.01 + 1.3) - 0.5) * 44;
        }
      }
      assets.rainGeo.attributes.position.needsUpdate = true;
    }

    if (petalPointsRef.current) {
      const pPos = assets.petalPos;
      const pMeta = assets.petalMeta;
      for (let i = 0; i < activePetalCount; i++) {
        const idx = i * 3;
        const vx = pMeta[idx];
        const vy = pMeta[idx + 1];
        const phase = pMeta[idx + 2];
        pPos[idx] += (vx + Math.sin(t * 1.4 + phase) * 0.45) * dt;
        pPos[idx + 1] -= vy * dt;
        pPos[idx + 2] += (0.55 + Math.cos(t * 1.1 + phase) * 0.25) * dt;

        if (pPos[idx + 1] < 0.1 || pPos[idx] > 21 || pPos[idx + 2] > 13) {
          pPos[idx] = -20 + ((i * 7) % 36);
          pPos[idx + 1] = 6.5 + (i % 4) * 0.8;
          pPos[idx + 2] = -12 + ((i * 5) % 22);
        }
      }
      assets.petalGeo.attributes.position.needsUpdate = true;
    }
  });

  return html`
    <group>
      <points
        ref=${rainPointsRef}
        geometry=${assets.rainGeo}
        material=${assets.rainMat}
        visible=${rainMode !== 'off'}
        frustumCulled=${false}
      />
      <points
        ref=${petalPointsRef}
        geometry=${assets.petalGeo}
        material=${assets.petalMat}
        frustumCulled=${false}
      />
    </group>
  `;
}

/* ── Smooth Chase Cam & Aerial Isometric Overview Controller ── */
function CameraRig({ cameraMode, orbitRef, world, controller }) {
  const { camera, gl } = useThree();
  const targetVec = useMemo(() => new THREE.Vector3(), []);
  const desiredPos = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const dom = gl.domElement;
    if (!dom) return;

    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const onPointerDown = e => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onPointerMove = e => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      orbitRef.current.yaw -= dx * 0.0055;
      orbitRef.current.pitch = Math.max(0.28, Math.min(1.25, orbitRef.current.pitch + dy * 0.0045));
      controller.cameraYaw = orbitRef.current.yaw;
    };

    const onPointerUp = () => {
      dragging = false;
    };

    const onWheel = e => {
      orbitRef.current.dist = Math.max(6.5, Math.min(24, orbitRef.current.dist + e.deltaY * 0.01));
    };

    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: true });

    return () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
    };
  }, [gl, orbitRef]);

  useFrame((_, delta) => {
    const P = window.AnshPlayer;
    const px = P?.state ? pxToWorldX(P.state.x, world.T, world.COLS) : 0;
    const pz = P?.state ? pxToWorldZ(P.state.y, world.T, world.ROWS) : 4;

    const { yaw, pitch, dist } = orbitRef.current;
    controller.cameraYaw = yaw;

    if (cameraMode === 'overview') {
      const zoomScale = dist / 13.5;
      const cx = px * 0.35 + Math.sin(yaw) * 24 * zoomScale;
      const cz = pz * 0.35 + Math.cos(yaw) * 22 * zoomScale;
      const cy = 23 * zoomScale;
      desiredPos.set(cx, cy, cz);
      targetVec.set(px * 0.35, 0, pz * 0.35);
    } else {
      const horiz = Math.cos(pitch) * dist;
      const vert = Math.sin(pitch) * dist;
      desiredPos.set(px + Math.sin(yaw) * horiz, vert, pz + Math.cos(yaw) * horiz);
      targetVec.set(px, 0.75, pz);
    }

    const alpha = Math.min(1, delta * 7.5);
    camera.position.lerp(desiredPos, alpha);
    camera.lookAt(targetVec);
  });

  return null;
}

/* ── Rolling FPS Monitor Hook (~2.5s below 34fps triggers onAutoEco) ── */
function useAutoEcoMonitor(active, effectiveEco, reducedMotion, onAutoEco) {
  const onAutoEcoRef = useRef(onAutoEco);
  onAutoEcoRef.current = onAutoEco;

  const statsRef = useRef({ accTime: 0, frames: 0, lowTime: 0, fired: false });

  useEffect(() => {
    statsRef.current.accTime = 0;
    statsRef.current.frames = 0;
    statsRef.current.lowTime = 0;
    if (!effectiveEco) {
      statsRef.current.fired = false;
    }
  }, [active, effectiveEco, reducedMotion]);

  useFrame((_, delta) => {
    const st = statsRef.current;
    if (!active || effectiveEco || reducedMotion || st.fired) return;
    if (delta <= 0 || delta > 0.25) return;

    st.accTime += delta;
    st.frames += 1;
    if (st.accTime >= 0.5) {
      const avgFps = st.frames / st.accTime;
      if (avgFps < 34) {
        st.lowTime += st.accTime;
        if (st.lowTime >= 2.5) {
          st.fired = true;
          onAutoEcoRef.current?.();
        }
      } else {
        st.lowTime = 0;
      }
      st.accTime = 0;
      st.frames = 0;
    }
  });
}

/* ── Root 3D Town Scene ── */
function TownScene({ settings, active, activeObj, cameraMode, orbitRef, osReducedMotion, onReady, controller }) {
  const world = window.AnshWorld;
  const { gl, scene, camera } = useThree();
  const reducedMotion = Boolean(settings.reducedMotion || osReducedMotion);
  const effectiveEco = Boolean(settings.effectiveEco);
  const moodPreset = MOOD_PRESETS[settings.mood] || MOOD_PRESETS.midnight;

  const fogRef = useRef(null);
  const hemiRef = useRef(null);
  const dirRef = useRef(null);

  const initialBgArgs = useMemo(() => [moodPreset.bg], []);
  const initialFogArgs = useMemo(() => [moodPreset.fog, moodPreset.fogDensity], []);
  const moodColors = useMemo(() => ({
    bg: new THREE.Color(),
    fog: new THREE.Color(),
    sky: new THREE.Color(),
    ground: new THREE.Color(),
    key: new THREE.Color()
  }), []);

  useEffect(() => {
    controller.renderContext = { gl, scene, camera };
    return () => {
      if (controller.renderContext?.gl === gl) {
        controller.renderContext = null;
      }
    };
  }, [gl, scene, camera, controller]);

  useEffect(() => {
    onReady();
  }, [onReady]);

  useAutoEcoMonitor(active, effectiveEco, reducedMotion, settings.onAutoEco);

  useFrame((_, delta) => {
    const alpha = Math.min(1, delta * 3.5);
    if (scene.background?.isColor) {
      moodColors.bg.set(moodPreset.bg);
      scene.background.lerp(moodColors.bg, alpha);
    }
    if (fogRef.current) {
      moodColors.fog.set(moodPreset.fog);
      fogRef.current.color.lerp(moodColors.fog, alpha);
      fogRef.current.density += (moodPreset.fogDensity - fogRef.current.density) * alpha;
    }
    if (hemiRef.current) {
      moodColors.sky.set(moodPreset.hemiSky);
      moodColors.ground.set(moodPreset.hemiGround);
      hemiRef.current.color.lerp(moodColors.sky, alpha);
      hemiRef.current.groundColor.lerp(moodColors.ground, alpha);
    }
    if (dirRef.current) {
      moodColors.key.set(moodPreset.keyColor);
      dirRef.current.color.lerp(moodColors.key, alpha);
    }
  });

  if (!world) return null;

  return html`
    <color attach="background" args=${initialBgArgs} />
    <fogExp2 ref=${fogRef} attach="fog" args=${initialFogArgs} />

    <hemisphereLight ref=${hemiRef} args=${[moodPreset.hemiSky, moodPreset.hemiGround, 0.95]} />
    <directionalLight ref=${dirRef} position=${[14, 24, 16]} intensity=${1.65} color=${moodPreset.keyColor} />

    <${InstancedTown} world=${world} bloom=${settings.bloom} />
    <${CyberpunkSkyline}
      bloom=${settings.bloom}
      mood=${moodPreset}
      reducedMotion=${reducedMotion}
      effectiveEco=${effectiveEco}
    />
    <${CanalWater}
      cols=${world.COLS}
      bloom=${settings.bloom}
      mood=${moodPreset}
      reducedMotion=${reducedMotion}
      effectiveEco=${effectiveEco}
    />
    <${SakuraTrees}
      sakuras=${world.PROPS.sakuras}
      cols=${world.COLS}
      rows=${world.ROWS}
      reducedMotion=${reducedMotion}
      effectiveEco=${effectiveEco}
    />
    <${Landmarks}
      world=${world}
      bloom=${settings.bloom}
      reducedMotion=${reducedMotion}
      effectiveEco=${effectiveEco}
    />
    <${Characters} world=${world} reducedMotion=${reducedMotion} />
    <${ProximityHalo} activeObj=${activeObj} world=${world} reducedMotion=${reducedMotion} />
    <${WeatherParticles}
      rainMode=${reducedMotion ? 'off' : settings.rain}
      reducedMotion=${reducedMotion}
      effectiveEco=${effectiveEco}
    />
    <${CameraRig} cameraMode=${cameraMode} orbitRef=${orbitRef} world=${world} controller=${controller} />
  `;
}

/* ── Application Wrapper Component ── */
function WorldApp({ controller }) {
  const [state, setState] = useState(controller.state);
  const [osReducedMotion, setOsReducedMotion] = useState(() =>
    Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  );
  const orbitRef = useRef({ yaw: 0, pitch: 0.66, dist: 13.5 });
  const isEco = Boolean(state.settings.effectiveEco);

  useEffect(() => {
    controller.subscribe = setState;
    return () => {
      if (controller.subscribe === setState) controller.subscribe = null;
    };
  }, [controller]);

  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = e => setOsReducedMotion(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  const handleCreated = ({ gl }) => {
    controller.ready = true;
    gl.domElement.addEventListener('webglcontextlost', e => {
      e.preventDefault();
    });
  };

  return html`
    <div
      style=${{
        width: '100%',
        height: '100%',
        position: 'relative',
        visibility: state.active ? 'visible' : 'hidden',
        pointerEvents: state.active ? 'auto' : 'none',
        touchAction: 'none'
      }}
    >
      <${WebGLErrorBoundary} onError=${() => { controller.ready = false; }}>
        <${Canvas}
          dpr=${isEco ? 1 : [1, 1.5]}
          frameloop=${state.active ? 'always' : 'never'}
          gl=${{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.15
          }}
          camera=${{ fov: 50, near: 0.2, far: 160, position: [0, 14, 15] }}
          onCreated=${handleCreated}
        >
          <${TownScene}
            settings=${state.settings}
            active=${state.active}
            activeObj=${state.activeObj}
            cameraMode=${state.cameraMode}
            orbitRef=${orbitRef}
            osReducedMotion=${osReducedMotion}
            onReady=${() => { controller.ready = true; }}
            controller=${controller}
          />
        <//>
      <//>
    </div>
  `;
}

/* ── Public window.Ansh3D Controller ── */
const controller = {
  root: null,
  hostEl: null,
  ready: false,
  cameraYaw: 0,
  renderContext: null,
  subscribe: null,
  state: {
    active: false,
    cameraMode: 'chase',
    activeObj: null,
    settings: {
      rain: 'normal',
      bloom: true,
      reducedMotion: false,
      mood: 'midnight',
      effectiveEco: false,
      onAutoEco: null
    }
  }
};

function emitState() {
  if (typeof controller.subscribe === 'function') {
    controller.subscribe({ ...controller.state });
  }
}

function ensureMounted(containerEl) {
  if (controller.root) return;
  const target =
    containerEl ||
    document.getElementById('world3dMount') ||
    document.querySelector('.game-root') ||
    document.body;

  const host = document.createElement('div');
  host.className = 'ansh-r3f-world-host';
  host.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:1;';
  target.appendChild(host);

  controller.hostEl = host;
  controller.root = createRoot(host);
  controller.root.render(html`<${WorldApp} controller=${controller} />`);
}

window.Ansh3D = {
  mount(containerEl) {
    ensureMounted(containerEl);
  },

  setActive(bool) {
    const next = Boolean(bool);
    if (next && !controller.root) {
      ensureMounted(null);
    }
    controller.state = { ...controller.state, active: next };
    emitState();
  },

  toggleCameraMode() {
    const nextMode = controller.state.cameraMode === 'chase' ? 'overview' : 'chase';
    controller.state = { ...controller.state, cameraMode: nextMode };
    emitState();
    return nextMode;
  },

  getCameraMode() {
    return controller.state.cameraMode;
  },

  getCameraYaw() {
    return controller.cameraYaw || 0;
  },

  isReady() {
    return controller.ready;
  },

  syncSettings(settings) {
    if (!settings || typeof settings !== 'object') return;
    const prev = controller.state.settings;
    controller.state = {
      ...controller.state,
      settings: {
        rain: settings.rain ?? prev.rain,
        bloom: settings.bloom !== undefined ? Boolean(settings.bloom) : prev.bloom,
        reducedMotion: settings.reducedMotion !== undefined
          ? Boolean(settings.reducedMotion)
          : prev.reducedMotion,
        mood: settings.mood ?? prev.mood,
        effectiveEco: settings.effectiveEco !== undefined
          ? Boolean(settings.effectiveEco)
          : prev.effectiveEco,
        onAutoEco: settings.onAutoEco !== undefined ? settings.onAutoEco : prev.onAutoEco
      }
    };
    emitState();
  },

  setActiveObj(obj) {
    if (controller.state.activeObj === obj) return;
    controller.state = { ...controller.state, activeObj: obj || null };
    emitState();
  },

  capturePNG() {
    const ctx = controller.renderContext;
    if (!ctx || !ctx.gl || !ctx.scene || !ctx.camera) return null;
    try {
      ctx.gl.render(ctx.scene, ctx.camera);
      return ctx.gl.domElement.toDataURL('image/png');
    } catch {
      return null;
    }
  }
};
