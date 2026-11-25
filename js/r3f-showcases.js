/* ─── js/r3f-showcases.js — Persistent 3D Interior Showcase Renderer (React 19 + htm + Three.js + R3F) ─── */
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import htm from 'htm';

const html = htm.bind(React.createElement);

/* ── Error Boundary ── */
class ShowcaseErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || '3D Showcase WebGL failed to initialize.'
    };
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
            padding: '1rem',
            color: '#94a3b8',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.75rem',
            textAlign: 'center',
            gap: '0.35rem'
          }}
        >
          <span style=${{ color: '#ef4444', fontWeight: 600 }}>3D PREVIEW UNAVAILABLE</span>
          <span>${this.state.message}</span>
        </div>
      `;
    }
    return this.props.children;
  }
}

/* ── Procedural Textures (Created Once per Exhibit, Disposed on Unmount) ── */
function makeScanlineTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#071b29';
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 4) {
    ctx.fillStyle = y % 8 === 0 ? 'rgba(56,189,248,0.28)' : 'rgba(14,165,233,0.08)';
    ctx.fillRect(0, y, 256, 2);
  }
  ctx.fillStyle = '#bae6fd';
  ctx.fillRect(28, 52, 132, 12);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(28, 78, 92, 8);
  ctx.fillRect(28, 98, 168, 8);
  ctx.fillStyle = 'rgba(244,114,182,0.7)';
  ctx.fillRect(28, 134, 68, 42);
  ctx.fillStyle = 'rgba(56,189,248,0.5)';
  ctx.fillRect(108, 134, 110, 42);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeVinylTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#090a0f';
  ctx.fillRect(0, 0, 512, 512);

  for (let r = 82; r < 248; r += 5) {
    ctx.strokeStyle = r % 15 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.045)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(256, 256, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  /* Specular groove accent mark to show spin cleanly */
  ctx.fillStyle = 'rgba(245,158,11,0.38)';
  ctx.fillRect(350, 252, 82, 5);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ── 1. GlyphLens Exhibit: Capture Frame + OCR Laser + Floating Cube Glyphs + Lens Prism ── */
function GlyphLensExhibit({ reducedMotion }) {
  const prismRef = useRef(null);
  const laserRef = useRef(null);
  const glyphRefs = useRef([]);

  const glyphOffsets = useMemo(
    () => [
      { angle: 0.0, radius: 1.05, y: 0.35, speed: 1.1 },
      { angle: 1.05, radius: 1.15, y: -0.28, speed: 0.9 },
      { angle: 2.1, radius: 0.98, y: 0.42, speed: 1.25 },
      { angle: 3.14, radius: 1.12, y: -0.35, speed: 1.0 },
      { angle: 4.2, radius: 1.02, y: 0.22, speed: 1.15 },
      { angle: 5.25, radius: 1.16, y: -0.18, speed: 0.95 }
    ],
    []
  );

  const res = useMemo(() => {
    const paneGeo = new THREE.PlaneGeometry(2.1, 1.45);
    const barHGeo = new THREE.BoxGeometry(0.42, 0.022, 0.03);
    const barVGeo = new THREE.BoxGeometry(0.022, 0.42, 0.03);
    const laserGeo = new THREE.BoxGeometry(2.02, 0.018, 0.04);
    const prismGeo = new THREE.OctahedronGeometry(0.5, 0);
    const prismWireGeo = new THREE.OctahedronGeometry(0.62, 0);
    const cubeGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);

    const paneMat = new THREE.MeshLambertMaterial({
      color: '#ef4444',
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide
    });
    const cornerMat = new THREE.MeshLambertMaterial({
      color: '#f87171',
      emissive: '#ef4444',
      emissiveIntensity: 1.25
    });
    const laserMat = new THREE.MeshLambertMaterial({
      color: '#fecaca',
      emissive: '#ef4444',
      emissiveIntensity: 2.2
    });
    const prismMat = new THREE.MeshLambertMaterial({
      color: '#e2e8f0',
      emissive: '#ef4444',
      emissiveIntensity: 0.55
    });
    const prismWireMat = new THREE.MeshLambertMaterial({
      color: '#fca5a5',
      emissive: '#ef4444',
      emissiveIntensity: 0.85,
      wireframe: true
    });
    const glyphMat = new THREE.MeshLambertMaterial({
      color: '#fca5a5',
      emissive: '#dc2626',
      emissiveIntensity: 0.95
    });

    return {
      paneGeo, barHGeo, barVGeo, laserGeo, prismGeo, prismWireGeo, cubeGeo,
      paneMat, cornerMat, laserMat, prismMat, prismWireMat, glyphMat
    };
  }, []);

  useEffect(() => {
    return () => {
      Object.values(res).forEach(d => d.dispose());
    };
  }, [res]);

  useFrame(({ clock }) => {
    const t = reducedMotion ? 0 : clock.getElapsedTime();
    if (prismRef.current) {
      prismRef.current.rotation.y = t * 0.85;
      prismRef.current.rotation.x = Math.sin(t * 0.9) * 0.25;
    }
    if (laserRef.current) {
      laserRef.current.position.y = Math.sin(t * 1.9) * 0.64;
    }
    for (let i = 0; i < glyphOffsets.length; i++) {
      const m = glyphRefs.current[i];
      if (!m) continue;
      const g = glyphOffsets[i];
      const ang = g.angle + t * 0.42 * g.speed;
      m.position.set(
        Math.cos(ang) * g.radius,
        g.y + Math.sin(t * 2.1 + i) * 0.12,
        Math.sin(ang) * 0.48
      );
      m.rotation.x = t * 1.1 + i;
      m.rotation.y = t * 1.4 - i;
    }
  });

  const corners = [
    [-0.9, 0.6, 1, -1],
    [0.9, 0.6, -1, -1],
    [-0.9, -0.6, 1, 1],
    [0.9, -0.6, -1, 1]
  ];

  return html`
    <group position=${[0, 0.1, 0]}>
      <mesh geometry=${res.paneGeo} material=${res.paneMat} />
      ${corners.map(([cx, cy, sx, sy], idx) => html`
        <group key=${idx} position=${[cx, cy, 0]}>
          <mesh geometry=${res.barHGeo} material=${res.cornerMat} position=${[sx * 0.18, sy * -0.15, 0]} />
          <mesh geometry=${res.barVGeo} material=${res.cornerMat} position=${[sx * -0.02, sy * 0.04, 0]} />
        </group>
      `)}
      <mesh ref=${laserRef} geometry=${res.laserGeo} material=${res.laserMat} position=${[0, 0, 0.06]} />
      <group ref=${prismRef}>
        <mesh geometry=${res.prismGeo} material=${res.prismMat} />
        <mesh geometry=${res.prismWireGeo} material=${res.prismWireMat} />
      </group>
      ${glyphOffsets.map((_, idx) => html`
        <mesh
          key=${idx}
          ref=${el => { glyphRefs.current[idx] = el; }}
          geometry=${res.cubeGeo}
          material=${res.glyphMat}
        />
      `)}
    </group>
  `;
}

/* ── 2. Arcus Exhibit: Chrome Barbell + Dynamic Cyan Bumper Plates (1..4 per side) + Kinetic Ring ── */
function ArcusExhibit({ arcusDoneCount, reducedMotion }) {
  const ringRef = useRef(null);
  const barbellRef = useRef(null);
  const plateCount = Math.max(1, Math.min(4, Number(arcusDoneCount || 1)));

  const res = useMemo(() => {
    const shaftGeo = new THREE.CylinderGeometry(0.042, 0.042, 2.75, 16);
    const sleeveGeo = new THREE.CylinderGeometry(0.078, 0.078, 0.52, 16);
    const plateGeo = new THREE.CylinderGeometry(0.56, 0.56, 0.085, 24);
    const plateRimGeo = new THREE.TorusGeometry(0.56, 0.016, 10, 32);
    const arcRingGeo = new THREE.TorusGeometry(1.48, 0.02, 10, 56, Math.PI * 1.45);
    const outerHaloGeo = new THREE.TorusGeometry(1.64, 0.014, 8, 56);

    const chromeMat = new THREE.MeshLambertMaterial({ color: '#e2e8f0' });
    const bumperMat = new THREE.MeshLambertMaterial({ color: '#0f172a' });
    const cyanGlowMat = new THREE.MeshLambertMaterial({
      color: '#38bdf8',
      emissive: '#0284c7',
      emissiveIntensity: 1.7
    });
    const arcMat = new THREE.MeshLambertMaterial({
      color: '#bae6fd',
      emissive: '#38bdf8',
      emissiveIntensity: 1.5
    });

    return {
      shaftGeo, sleeveGeo, plateGeo, plateRimGeo, arcRingGeo, outerHaloGeo,
      chromeMat, bumperMat, cyanGlowMat, arcMat
    };
  }, []);

  useEffect(() => {
    return () => {
      Object.values(res).forEach(d => d.dispose());
    };
  }, [res]);

  useFrame(({ clock }) => {
    const t = reducedMotion ? 0 : clock.getElapsedTime();
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.75;
      ringRef.current.rotation.y = Math.sin(t * 0.6) * 0.25;
    }
    if (barbellRef.current && !reducedMotion) {
      barbellRef.current.position.y = Math.sin(t * 1.7) * 0.06;
      barbellRef.current.rotation.z = Math.sin(t * 0.85) * 0.04;
    }
  });

  const plates = [];
  for (let i = 0; i < plateCount; i++) {
    const scale = 1 - i * 0.1;
    const offset = 0.78 + i * 0.135;
    plates.push({ side: -1, x: -offset, scale, key: `L${i}` });
    plates.push({ side: 1, x: offset, scale, key: `R${i}` });
  }

  return html`
    <group position=${[0, 0.1, 0]}>
      <group ref=${barbellRef}>
        <mesh geometry=${res.shaftGeo} material=${res.chromeMat} rotation=${[0, 0, Math.PI / 2]} />
        <mesh geometry=${res.sleeveGeo} material=${res.chromeMat} position=${[-1.02, 0, 0]} rotation=${[0, 0, Math.PI / 2]} />
        <mesh geometry=${res.sleeveGeo} material=${res.chromeMat} position=${[1.02, 0, 0]} rotation=${[0, 0, Math.PI / 2]} />

        ${plates.map(p => html`
          <group key=${p.key} position=${[p.x, 0, 0]} scale=${[1, p.scale, p.scale]}>
            <mesh geometry=${res.plateGeo} material=${res.bumperMat} rotation=${[0, 0, Math.PI / 2]} />
            <mesh geometry=${res.plateRimGeo} material=${res.cyanGlowMat} rotation=${[0, Math.PI / 2, 0]} />
          </group>
        `)}
      </group>

      <group ref=${ringRef}>
        <mesh geometry=${res.arcRingGeo} material=${res.arcMat} />
        <mesh geometry=${res.outerHaloGeo} material=${res.cyanGlowMat} rotation=${[0.35, 0.2, 0]} />
      </group>
    </group>
  `;
}

/* ── 3. About Exhibit: Crimson Wireframe Icosahedron + Dark Glass Octahedron + 5 Tech Satellites ── */
function AboutExhibit({ reducedMotion }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const satRefs = useRef([]);

  const satColors = useMemo(
    () => ['#ef4444', '#38bdf8', '#f59e0b', '#f472b6', '#10b981'],
    []
  );

  const res = useMemo(() => {
    const outerGeo = new THREE.IcosahedronGeometry(1.12, 0);
    const innerGeo = new THREE.OctahedronGeometry(0.62, 0);
    const satGeo = new THREE.OctahedronGeometry(0.14, 0);

    const outerMat = new THREE.MeshLambertMaterial({
      color: '#ef4444',
      emissive: '#dc2626',
      emissiveIntensity: 1.15,
      wireframe: true
    });
    const innerMat = new THREE.MeshLambertMaterial({
      color: '#090b12',
      emissive: '#1e1b4b',
      emissiveIntensity: 0.45
    });
    const satMats = satColors.map(hex =>
      new THREE.MeshLambertMaterial({
        color: hex,
        emissive: hex,
        emissiveIntensity: 0.95
      })
    );

    return { outerGeo, innerGeo, satGeo, outerMat, innerMat, satMats };
  }, [satColors]);

  useEffect(() => {
    return () => {
      res.outerGeo.dispose();
      res.innerGeo.dispose();
      res.satGeo.dispose();
      res.outerMat.dispose();
      res.innerMat.dispose();
      res.satMats.forEach(m => m.dispose());
    };
  }, [res]);

  useFrame(({ clock }) => {
    const t = reducedMotion ? 0 : clock.getElapsedTime();
    if (outerRef.current) {
      outerRef.current.rotation.y = t * 0.4;
      outerRef.current.rotation.x = t * 0.22;
    }
    if (innerRef.current) {
      innerRef.current.rotation.y = -t * 0.65;
      innerRef.current.rotation.z = t * 0.3;
    }
    for (let i = 0; i < 5; i++) {
      const sat = satRefs.current[i];
      if (!sat) continue;
      const ang = t * (0.75 + i * 0.1) + (i * Math.PI * 2) / 5;
      const tilt = (i - 2) * 0.32;
      const rad = 1.48;
      sat.position.set(
        Math.cos(ang) * rad,
        Math.sin(ang) * Math.sin(tilt) * rad + Math.cos(t + i) * 0.12,
        Math.sin(ang) * Math.cos(tilt) * rad
      );
      sat.rotation.y = t * 1.5;
    }
  });

  return html`
    <group position=${[0, 0.1, 0]}>
      <mesh ref=${outerRef} geometry=${res.outerGeo} material=${res.outerMat} />
      <mesh ref=${innerRef} geometry=${res.innerGeo} material=${res.innerMat} />
      ${res.satMats.map((mat, idx) => html`
        <mesh
          key=${idx}
          ref=${el => { satRefs.current[idx] = el; }}
          geometry=${res.satGeo}
          material=${mat}
        />
      `)}
    </group>
  `;
}

/* ── 4. Rewatch Films Exhibit: Spinning Crimson Cinema Reel Pair + Lens Beam Cone ── */
function FilmsExhibit({ reducedMotion }) {
  const reelARef = useRef(null);
  const reelBRef = useRef(null);

  const res = useMemo(() => {
    const bodyGeo = new THREE.BoxGeometry(1.15, 0.54, 0.42);
    const hairlineGeo = new THREE.BoxGeometry(1.17, 0.02, 0.44);
    const lensGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.34, 16);
    const beamGeo = new THREE.ConeGeometry(0.68, 1.8, 20, 1, true);
    const reelRimGeo = new THREE.TorusGeometry(0.46, 0.02, 10, 32);
    const reelHubGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.08, 16);
    const spokeGeo = new THREE.BoxGeometry(0.88, 0.022, 0.024);

    const chassisMat = new THREE.MeshLambertMaterial({ color: '#141724' });
    const crimsonMat = new THREE.MeshLambertMaterial({
      color: '#ef4444',
      emissive: '#dc2626',
      emissiveIntensity: 1.45
    });
    const beamMat = new THREE.MeshBasicMaterial({
      color: '#fca5a5',
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    return { bodyGeo, hairlineGeo, lensGeo, beamGeo, reelRimGeo, reelHubGeo, spokeGeo, chassisMat, crimsonMat, beamMat };
  }, []);

  useEffect(() => {
    return () => {
      Object.values(res).forEach(d => d.dispose());
    };
  }, [res]);

  useFrame(({ clock }) => {
    const t = reducedMotion ? 0 : clock.getElapsedTime();
    if (reelARef.current) reelARef.current.rotation.z = -t * 1.9;
    if (reelBRef.current) reelBRef.current.rotation.z = -t * 1.9;
  });

  const renderReel = (ref, pos) => html`
    <group ref=${ref} position=${pos}>
      <mesh geometry=${res.reelRimGeo} material=${res.crimsonMat} />
      <mesh geometry=${res.reelHubGeo} material=${res.chassisMat} rotation=${[Math.PI / 2, 0, 0]} />
      <mesh geometry=${res.spokeGeo} material=${res.crimsonMat} />
      <mesh geometry=${res.spokeGeo} material=${res.crimsonMat} rotation=${[0, 0, Math.PI / 3]} />
      <mesh geometry=${res.spokeGeo} material=${res.crimsonMat} rotation=${[0, 0, -Math.PI / 3]} />
    </group>
  `;

  return html`
    <group position=${[-0.25, -0.05, 0]} rotation=${[0, -0.22, 0]}>
      <mesh geometry=${res.bodyGeo} material=${res.chassisMat} position=${[0, -0.1, 0]} />
      <mesh geometry=${res.hairlineGeo} material=${res.crimsonMat} position=${[0, 0.15, 0]} />
      <mesh geometry=${res.lensGeo} material=${res.chassisMat} position=${[0.7, -0.05, 0]} rotation=${[0, 0, Math.PI / 2]} />
      <mesh geometry=${res.beamGeo} material=${res.beamMat} position=${[1.65, -0.05, 0]} rotation=${[0, 0, Math.PI / 2]} />
      ${renderReel(reelARef, [-0.46, 0.56, 0])}
      ${renderReel(reelBRef, [0.48, 0.56, 0])}
    </group>
  `;
}

/* ── 5. Rewatch Series Exhibit: Levitating Holographic CRT Monitor Cube + Dual Orbital Rings ── */
function SeriesExhibit({ reducedMotion }) {
  const crtRef = useRef(null);
  const ring1Ref = useRef(null);
  const ring2Ref = useRef(null);

  const res = useMemo(() => {
    const scanTex = makeScanlineTexture();
    const housingGeo = new THREE.BoxGeometry(1.36, 1.04, 0.92);
    const wireFrameGeo = new THREE.BoxGeometry(1.42, 1.1, 0.98);
    const backGeo = new THREE.BoxGeometry(0.84, 0.66, 0.36);
    const screenGeo = new THREE.PlaneGeometry(1.16, 0.84);
    const ringGeo = new THREE.TorusGeometry(1.24, 0.02, 10, 52);

    const housingMat = new THREE.MeshLambertMaterial({ color: '#111827' });
    const wireMat = new THREE.MeshLambertMaterial({
      color: '#38bdf8',
      emissive: '#0284c7',
      emissiveIntensity: 0.7,
      wireframe: true
    });
    const screenMat = new THREE.MeshBasicMaterial({ map: scanTex });
    const cyanRingMat = new THREE.MeshLambertMaterial({
      color: '#38bdf8',
      emissive: '#0284c7',
      emissiveIntensity: 1.65
    });
    const pinkRingMat = new THREE.MeshLambertMaterial({
      color: '#f472b6',
      emissive: '#db2777',
      emissiveIntensity: 1.35
    });

    return {
      scanTex, housingGeo, wireFrameGeo, backGeo, screenGeo, ringGeo,
      housingMat, wireMat, screenMat, cyanRingMat, pinkRingMat
    };
  }, []);

  useEffect(() => {
    return () => {
      res.scanTex.dispose();
      res.housingGeo.dispose();
      res.wireFrameGeo.dispose();
      res.backGeo.dispose();
      res.screenGeo.dispose();
      res.ringGeo.dispose();
      res.housingMat.dispose();
      res.wireMat.dispose();
      res.screenMat.dispose();
      res.cyanRingMat.dispose();
      res.pinkRingMat.dispose();
    };
  }, [res]);

  useFrame(({ clock }) => {
    const t = reducedMotion ? 0 : clock.getElapsedTime();
    if (crtRef.current) {
      crtRef.current.position.y = Math.sin(t * 1.8) * 0.09;
      crtRef.current.rotation.y = Math.sin(t * 0.7) * 0.18;
    }
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z = t * 0.65;
      ring1Ref.current.rotation.x = 1.08;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z = -t * 0.52;
      ring2Ref.current.rotation.y = 0.78;
    }
  });

  return html`
    <group position=${[0, 0.1, 0]}>
      <group ref=${crtRef}>
        <mesh geometry=${res.housingGeo} material=${res.housingMat} />
        <mesh geometry=${res.wireFrameGeo} material=${res.wireMat} />
        <mesh geometry=${res.backGeo} material=${res.housingMat} position=${[0, 0, -0.56]} />
        <mesh geometry=${res.screenGeo} material=${res.screenMat} position=${[0, 0, 0.47]} />
      </group>
      <mesh ref=${ring1Ref} geometry=${res.ringGeo} material=${res.cyanRingMat} />
      <mesh ref=${ring2Ref} geometry=${res.ringGeo} material=${res.pinkRingMat} />
    </group>
  `;
}

/* ── 6. Rewatch Albums Exhibit: Sleek Vinyl Turntable + Spinning Record + Tonearm + Album Cover Label ── */
function AlbumsExhibit({ albumCoverUrl, reducedMotion }) {
  const platterRef = useRef(null);
  const coverUrl =
    albumCoverUrl ||
    window.ANSH_DATA?.rewatchCorners?.rewatch_albums?.items?.[0]?.img ||
    '';

  const res = useMemo(() => {
    const vinylTex = makeVinylTexture();
    const plinthGeo = new THREE.BoxGeometry(2.35, 0.22, 1.82);
    const trimGeo = new THREE.BoxGeometry(2.39, 0.02, 1.86);
    const recordGeo = new THREE.CylinderGeometry(0.76, 0.76, 0.032, 36);
    const labelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.04, 24);
    const spindleGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.1, 10);
    const pivotGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.16, 14);
    const armGeo = new THREE.CylinderGeometry(0.016, 0.016, 1.05, 10);
    const headGeo = new THREE.BoxGeometry(0.08, 0.04, 0.15);

    const plinthMat = new THREE.MeshLambertMaterial({ color: '#11131d' });
    const amberMat = new THREE.MeshLambertMaterial({
      color: '#f59e0b',
      emissive: '#d97706',
      emissiveIntensity: 1.3
    });
    const labelMat = new THREE.MeshLambertMaterial({
      color: '#f59e0b',
      emissive: '#d97706',
      emissiveIntensity: 1.15
    });
    const recordMat = new THREE.MeshLambertMaterial({
      map: vinylTex,
      color: '#e2e8f0'
    });
    const chromeMat = new THREE.MeshLambertMaterial({ color: '#cbd5e1' });

    return {
      vinylTex, plinthGeo, trimGeo, recordGeo, labelGeo, spindleGeo, pivotGeo, armGeo, headGeo,
      plinthMat, amberMat, labelMat, recordMat, chromeMat
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loadedTex = null;

    const resetFallback = () => {
      res.labelMat.map = null;
      res.labelMat.color.set('#f59e0b');
      res.labelMat.emissive.set('#d97706');
      res.labelMat.emissiveIntensity = 1.15;
      res.labelMat.needsUpdate = true;
    };

    resetFallback();

    if (coverUrl) {
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin('anonymous');
      loader.load(
        coverUrl,
        tex => {
          if (cancelled) {
            tex.dispose();
            return;
          }
          tex.colorSpace = THREE.SRGBColorSpace;
          loadedTex = tex;
          res.labelMat.map = tex;
          res.labelMat.color.set('#ffffff');
          res.labelMat.emissive.set('#000000');
          res.labelMat.emissiveIntensity = 0;
          res.labelMat.needsUpdate = true;
        },
        undefined,
        () => {
          if (!cancelled) resetFallback();
        }
      );
    }

    return () => {
      cancelled = true;
      if (loadedTex) {
        if (res.labelMat.map === loadedTex) {
          resetFallback();
        }
        loadedTex.dispose();
        loadedTex = null;
      }
    };
  }, [coverUrl, res]);

  useEffect(() => {
    return () => {
      Object.values(res).forEach(d => d.dispose());
    };
  }, [res]);

  useFrame((_, delta) => {
    if (!reducedMotion && platterRef.current) {
      platterRef.current.rotation.y += delta * 2.1;
    }
  });

  return html`
    <group position=${[0, -0.05, 0]} rotation=${[0.36, -0.25, 0]}>
      <mesh geometry=${res.plinthGeo} material=${res.plinthMat} />
      <mesh geometry=${res.trimGeo} material=${res.amberMat} position=${[0, -0.08, 0]} />

      <group ref=${platterRef} position=${[-0.22, 0.14, 0.02]}>
        <mesh geometry=${res.recordGeo} material=${res.recordMat} />
        <mesh geometry=${res.labelGeo} material=${res.labelMat} position=${[0, 0.005, 0]} />
        <mesh geometry=${res.spindleGeo} material=${res.chromeMat} position=${[0, 0.04, 0]} />
      </group>

      {/* Tonearm Assembly */}
      <group position=${[0.84, 0.2, -0.52]}>
        <mesh geometry=${res.pivotGeo} material=${res.chromeMat} />
        <group rotation=${[0, -0.34, 0]}>
          <mesh geometry=${res.armGeo} material=${res.chromeMat} position=${[-0.14, 0.06, 0.48]} rotation=${[Math.PI / 2, 0, 0.25]} />
          <mesh geometry=${res.headGeo} material=${res.amberMat} position=${[-0.28, 0.03, 0.98]} rotation=${[0, 0.25, 0]} />
        </group>
      </group>
    </group>
  `;
}

/* ── 7. Rewatch Songs Exhibit: 16-Bar Circular Pink EQ Audio Visualizer Tower ── */
function SongsExhibit({ audioPlaying, reducedMotion }) {
  const towerRef = useRef(null);
  const barRefs = useRef([]);
  const BAR_COUNT = 16;

  const res = useMemo(() => {
    const baseGeo = new THREE.CylinderGeometry(1.12, 1.24, 0.14, 32);
    const baseRingGeo = new THREE.TorusGeometry(0.82, 0.018, 8, 44);
    const coreGeo = new THREE.CylinderGeometry(0.22, 0.22, 1.2, 18);
    const barGeo = new THREE.BoxGeometry(0.09, 1.0, 0.09);

    const baseMat = new THREE.MeshLambertMaterial({ color: '#141724' });
    const coreMat = new THREE.MeshLambertMaterial({
      color: '#fbcfe8',
      emissive: '#f472b6',
      emissiveIntensity: 1.5
    });
    const barMat = new THREE.MeshLambertMaterial({
      color: '#f472b6',
      emissive: '#ec4899',
      emissiveIntensity: 1.7
    });

    const ringItems = [];
    for (let i = 0; i < BAR_COUNT; i++) {
      const ang = (i / BAR_COUNT) * Math.PI * 2;
      ringItems.push({
        x: Math.cos(ang) * 0.82,
        z: Math.sin(ang) * 0.82,
        ang
      });
    }

    return { baseGeo, baseRingGeo, coreGeo, barGeo, baseMat, coreMat, barMat, ringItems };
  }, []);

  useEffect(() => {
    return () => {
      res.baseGeo.dispose();
      res.baseRingGeo.dispose();
      res.coreGeo.dispose();
      res.barGeo.dispose();
      res.baseMat.dispose();
      res.coreMat.dispose();
      res.barMat.dispose();
    };
  }, [res]);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    if (towerRef.current && !reducedMotion) {
      towerRef.current.rotation.y += delta * (audioPlaying ? 0.65 : 0.2);
    }

    for (let i = 0; i < BAR_COUNT; i++) {
      const bar = barRefs.current[i];
      if (!bar) continue;
      let targetH;
      if (reducedMotion) {
        targetH = 0.45 + 0.25 * Math.sin(i * 0.9);
      } else if (audioPlaying) {
        const h1 = Math.sin(t * 7.8 + i * 0.65) * 0.5 + 0.5;
        const h2 = Math.cos(t * 11.4 - i * 1.1) * 0.5 + 0.5;
        targetH = 0.22 + (h1 * 0.65 + h2 * 0.35) * 1.35;
      } else {
        targetH = 0.28 + (Math.sin(t * 2.1 + i * 0.5) * 0.5 + 0.5) * 0.32;
      }
      bar.scale.y += (targetH - bar.scale.y) * Math.min(1, delta * 14);
      bar.position.y = -0.5 + bar.scale.y * 0.5;
    }
  });

  return html`
    <group ref=${towerRef} position=${[0, 0.1, 0]}>
      <mesh geometry=${res.baseGeo} material=${res.baseMat} position=${[0, -0.58, 0]} />
      <mesh geometry=${res.baseRingGeo} material=${res.coreMat} position=${[0, -0.5, 0]} rotation=${[Math.PI / 2, 0, 0]} />
      <mesh geometry=${res.coreGeo} material=${res.coreMat} position=${[0, 0.05, 0]} />
      ${res.ringItems.map((it, idx) => html`
        <mesh
          key=${idx}
          ref=${el => { barRefs.current[idx] = el; }}
          geometry=${res.barGeo}
          material=${res.barMat}
          position=${[it.x, -0.25, it.z]}
          rotation=${[0, -it.ang, 0]}
          scale=${[1, 0.5, 1]}
        />
      `)}
    </group>
  `;
}

/* ── 8. Contact Exhibit: Pink Encrypted Data Crystal + Orthogonal Gyro Rings ── */
function ContactExhibit({ transmitting, reducedMotion }) {
  const crystalRef = useRef(null);
  const ringARef = useRef(null);
  const ringBRef = useRef(null);
  const ringCRef = useRef(null);

  const res = useMemo(() => {
    const coreGeo = new THREE.OctahedronGeometry(0.56, 0);
    const shellGeo = new THREE.OctahedronGeometry(0.76, 0);
    const ringGeo = new THREE.TorusGeometry(1.16, 0.02, 10, 52);

    const coreMat = new THREE.MeshLambertMaterial({
      color: '#fbcfe8',
      emissive: '#f472b6',
      emissiveIntensity: 1.85
    });
    const shellMat = new THREE.MeshLambertMaterial({
      color: '#f472b6',
      emissive: '#db2777',
      emissiveIntensity: 0.85,
      wireframe: true
    });
    const ringMat = new THREE.MeshLambertMaterial({
      color: '#f9a8d4',
      emissive: '#ec4899',
      emissiveIntensity: 1.45
    });

    return { coreGeo, shellGeo, ringGeo, coreMat, shellMat, ringMat };
  }, []);

  useEffect(() => {
    return () => {
      Object.values(res).forEach(d => d.dispose());
    };
  }, [res]);

  useFrame(({ clock }, delta) => {
    if (reducedMotion) return;
    const mult = transmitting ? 3.2 : 1.0;
    const t = clock.getElapsedTime();

    if (crystalRef.current) {
      crystalRef.current.rotation.y += delta * 0.9 * mult;
      crystalRef.current.position.y = Math.sin(t * 2.2) * 0.07;
    }
    if (ringARef.current) ringARef.current.rotation.x += delta * 0.85 * mult;
    if (ringBRef.current) ringBRef.current.rotation.y += delta * 1.05 * mult;
    if (ringCRef.current) ringCRef.current.rotation.z += delta * 0.72 * mult;
  });

  return html`
    <group position=${[0, 0.1, 0]}>
      <group ref=${crystalRef}>
        <mesh geometry=${res.coreGeo} material=${res.coreMat} />
        <mesh geometry=${res.shellGeo} material=${res.shellMat} />
      </group>
      <mesh ref=${ringARef} geometry=${res.ringGeo} material=${res.ringMat} rotation=${[0.4, 0, 0]} />
      <mesh ref=${ringBRef} geometry=${res.ringGeo} material=${res.ringMat} rotation=${[0, 0.9, Math.PI / 2]} />
      <mesh ref=${ringCRef} geometry=${res.ringGeo} material=${res.ringMat} rotation=${[Math.PI / 2, 0.4, 0]} />
    </group>
  `;
}

const DEFAULT_ORBIT = { theta: 0.22, phi: 1.24, radius: 4.35 };

/* ── Spherical Pointer Orbit & Auto-Rotate Rig ── */
function ShowcaseCameraRig({ orbitRef, reducedMotion, onResetOrbit }) {
  const { camera, gl } = useThree();
  const target = useMemo(() => new THREE.Vector3(0, 0.05, 0), []);
  const draggingRef = useRef(false);

  useEffect(() => {
    const dom = gl.domElement;
    if (!dom) return;

    let lastX = 0;
    let lastY = 0;

    const onDown = e => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      draggingRef.current = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onMove = e => {
      if (!draggingRef.current) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      orbitRef.current.theta -= dx * 0.0085;
      orbitRef.current.phi = Math.max(0.55, Math.min(2.2, orbitRef.current.phi - dy * 0.0075));
    };

    const onUp = () => {
      draggingRef.current = false;
    };

    const onDblClick = () => {
      onResetOrbit?.();
    };

    dom.addEventListener('pointerdown', onDown);
    dom.addEventListener('dblclick', onDblClick);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    return () => {
      dom.removeEventListener('pointerdown', onDown);
      dom.removeEventListener('dblclick', onDblClick);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [gl, orbitRef, onResetOrbit]);

  useFrame((_, delta) => {
    if (!reducedMotion && !draggingRef.current) {
      orbitRef.current.theta += delta * 0.28;
    }

    const r = orbitRef.current.radius;
    const phi = orbitRef.current.phi;
    const theta = orbitRef.current.theta;

    const sinPhi = Math.sin(phi);
    camera.position.set(
      r * sinPhi * Math.sin(theta),
      r * Math.cos(phi) + 0.15,
      r * sinPhi * Math.cos(theta)
    );
    camera.lookAt(target);
  });

  return null;
}

/* ── Exhibit Switcher Stage ── */
function ExhibitStage({ sceneId, props, osReducedMotion, orbitRef, onResetOrbit }) {
  const reducedMotion = Boolean(props?.reducedMotion || osReducedMotion);

  const renderExhibit = () => {
    switch (sceneId) {
      case 'glyphlens':
        return html`<${GlyphLensExhibit} reducedMotion=${reducedMotion} />`;
      case 'arcus':
        return html`<${ArcusExhibit} arcusDoneCount=${props?.arcusDoneCount} reducedMotion=${reducedMotion} />`;
      case 'about':
        return html`<${AboutExhibit} reducedMotion=${reducedMotion} />`;
      case 'rewatch_films':
        return html`<${FilmsExhibit} reducedMotion=${reducedMotion} />`;
      case 'rewatch_series':
        return html`<${SeriesExhibit} reducedMotion=${reducedMotion} />`;
      case 'rewatch_albums':
        return html`<${AlbumsExhibit} albumCoverUrl=${props?.albumCoverUrl} reducedMotion=${reducedMotion} />`;
      case 'rewatch_songs':
        return html`<${SongsExhibit} audioPlaying=${Boolean(props?.audioPlaying)} reducedMotion=${reducedMotion} />`;
      case 'contact':
        return html`<${ContactExhibit} transmitting=${Boolean(props?.transmitting)} reducedMotion=${reducedMotion} />`;
      default:
        return html`<${AboutExhibit} reducedMotion=${reducedMotion} />`;
    }
  };

  return html`
    <ambientLight intensity=${0.95} color="#cbd5e1" />
    <hemisphereLight args=${['#38bdf8', '#1e1b2e', 0.85]} />
    <directionalLight position=${[3, 5, 4]} intensity=${1.75} color="#ffffff" />

    ${renderExhibit()}
    <${ShowcaseCameraRig} orbitRef=${orbitRef} reducedMotion=${reducedMotion} onResetOrbit=${onResetOrbit} />
  `;
}

/* ── Persistent Showcase Application ── */
function ShowcaseApp({ controller }) {
  const [state, setState] = useState(controller.state);
  const [osReducedMotion, setOsReducedMotion] = useState(() =>
    Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  );
  const orbitRef = useRef({ ...DEFAULT_ORBIT });
  const reducedMotion = Boolean(state.props?.reducedMotion || osReducedMotion);
  const isEco = Boolean(state.props?.eco || state.props?.effectiveEco);

  const resetOrbit = useMemo(
    () => () => {
      orbitRef.current.theta = DEFAULT_ORBIT.theta;
      orbitRef.current.phi = DEFAULT_ORBIT.phi;
      orbitRef.current.radius = DEFAULT_ORBIT.radius;
    },
    []
  );

  useEffect(() => {
    controller.subscribe = setState;
    controller.resetOrbit = resetOrbit;
    return () => {
      if (controller.subscribe === setState) controller.subscribe = null;
      if (controller.resetOrbit === resetOrbit) controller.resetOrbit = null;
    };
  }, [controller, resetOrbit]);

  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = e => setOsReducedMotion(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    /* Reset framing gently when switching exhibit */
    resetOrbit();
  }, [state.sceneId, resetOrbit]);

  const handleCreated = ({ gl }) => {
    gl.domElement.addEventListener('webglcontextlost', e => {
      e.preventDefault();
    });
  };

  return html`
    <${ShowcaseErrorBoundary}>
      <${Canvas}
        dpr=${reducedMotion || isEco ? 1 : [1, 1.5]}
        shadows=${false}
        frameloop=${state.active ? 'always' : 'never'}
        gl=${{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping
        }}
        camera=${{ position: [0, 1.3, 4.2], fov: 42 }}
        onCreated=${handleCreated}
      >
        <${ExhibitStage}
          sceneId=${state.sceneId}
          props=${state.props}
          osReducedMotion=${osReducedMotion}
          orbitRef=${orbitRef}
          onResetOrbit=${resetOrbit}
        />
      <//>
    <//>
  `;
}

/* ── Single Persistent Host & Public window.AnshShowcase3D API ── */
const controller = {
  root: null,
  hostEl: null,
  parkContainer: null,
  subscribe: null,
  resetOrbit: null,
  state: {
    active: false,
    sceneId: 'about',
    props: {}
  }
};

function emitState() {
  if (typeof controller.subscribe === 'function') {
    controller.subscribe({ ...controller.state });
  }
}

function ensureInitialized() {
  if (controller.root) return;

  const parkBox = document.createElement('div');
  parkBox.setAttribute('aria-hidden', 'true');
  parkBox.style.cssText = 'position:fixed;left:-9999px;top:0;width:420px;height:225px;visibility:hidden;overflow:hidden;pointer-events:none;';
  document.body.appendChild(parkBox);
  controller.parkContainer = parkBox;

  const host = document.createElement('div');
  host.className = 'ansh-r3f-showcase-host';
  host.style.cssText = 'width:100%;height:100%;position:relative;touch-action:none;';
  parkBox.appendChild(host);
  controller.hostEl = host;

  controller.root = createRoot(host);
  controller.root.render(html`<${ShowcaseApp} controller=${controller} />`);
}

window.AnshShowcase3D = {
  mountInto(targetEl, sceneId, props = {}) {
    ensureInitialized();
    if (targetEl && controller.hostEl && controller.hostEl.parentNode !== targetEl) {
      targetEl.appendChild(controller.hostEl);
    }
    controller.state = {
      active: true,
      sceneId: sceneId || 'about',
      props: { ...(props || {}) }
    };
    emitState();
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  },

  updateProps(props = {}) {
    if (!props || typeof props !== 'object') return;
    controller.state = {
      ...controller.state,
      props: { ...controller.state.props, ...props }
    };
    emitState();
  },

  resetView() {
    controller.resetOrbit?.();
  },

  park() {
    if (!controller.root) return;
    controller.state = { ...controller.state, active: false };
    emitState();
    if (controller.parkContainer && controller.hostEl && controller.hostEl.parentNode !== controller.parkContainer) {
      controller.parkContainer.appendChild(controller.hostEl);
    }
  }
};
