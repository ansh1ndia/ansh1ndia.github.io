/* ─── js/player.js — Responsive 4-Way Movement, Collision & Sprite ─── */
window.AnshPlayer = (() => {
  const { T, isSolid, INTERACTABLES } = window.AnshWorld;

  const state = {
    x: 20 * T + 16,
    y: 19 * T + 16,
    w: 16,
    h: 14,
    speed: 155,
    sprintSpeed: 240,
    sprinting: false,
    sitting: false,
    standingPos: null,
    dir: 'up',
    moveAngle: Math.PI,
    moving: false,
    walkTime: 0,
    idleTime: 0,
    stepPhase: 0,
    targetPoint: null,
    pendingTarget: null,
    ripples: []
  };

  const collides = (nx, ny) => {
    const hw = state.w / 2;
    const hh = state.h / 2;
    const corners = [
      [nx - hw, ny - hh],
      [nx + hw, ny - hh],
      [nx - hw, ny + hh],
      [nx + hw, ny + hh]
    ];
    for (const [cx, cy] of corners) {
      if (isSolid(Math.floor(cx / T), Math.floor(cy / T))) return true;
    }

    const npc = INTERACTABLES.find(i => i.id === 'npc_guide');
    if (npc && Math.abs(nx - npc.x) < 18 && Math.abs(ny - npc.y) < 16) return true;

    return false;
  };

  const moveToPoint = (x, y, interactTarget = null) => {
    state.targetPoint = { x, y };
    state.pendingTarget = interactTarget;
  };

  const cancelAutoMove = () => {
    state.targetPoint = null;
    state.pendingTarget = null;
  };

  const sitOnBench = benchObj => {
    if (!benchObj) return;
    if (!state.sitting) {
      state.standingPos = { x: state.x, y: state.y };
      state.x = benchObj.benchX ?? (benchObj.tx * T + 16);
      state.y = (benchObj.benchY ?? (benchObj.ty * T + 16)) - 2;
      state.dir = 'down';
      state.sitting = true;
      state.moving = false;
    }
  };

  const standUp = () => {
    if (!state.sitting) return;
    if (state.standingPos) {
      state.x = state.standingPos.x;
      state.y = state.standingPos.y;
    }
    state.standingPos = null;
    state.sitting = false;
  };

  const update = (dt, inputKeys, blocked, onArrive, cameraYaw = 0) => {
    if (blocked) {
      state.moving = false;
      state.idleTime += dt;
      return null;
    }

    let dx = 0;
    let dy = 0;
    if (inputKeys.left)  dx -= 1;
    if (inputKeys.right) dx += 1;
    if (inputKeys.up)    dy -= 1;
    if (inputKeys.down)  dy += 1;

    if (state.sitting) {
      if (dx !== 0 || dy !== 0) {
        standUp();
      } else {
        state.moving = false;
        state.idleTime += dt;
        return null;
      }
    }

    if (dx !== 0 || dy !== 0) {
      cancelAutoMove();
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      if (cameraYaw) {
        const sinY = Math.sin(cameraYaw);
        const cosY = Math.cos(cameraYaw);
        const fwd = -dy;
        const rgt = dx;
        dx = -sinY * fwd + cosY * rgt;
        dy = -cosY * fwd - sinY * rgt;
      }
    } else if (state.targetPoint) {
      const tx = state.targetPoint.x - state.x;
      const ty = state.targetPoint.y - state.y;
      const dist = Math.hypot(tx, ty);
      if (dist <= 6) {
        const doneObj = state.pendingTarget;
        cancelAutoMove();
        state.moving = false;
        if (doneObj && typeof onArrive === 'function') onArrive(doneObj);
      } else {
        dx = tx / dist;
        dy = ty / dist;
      }
    }

    state.moving = dx !== 0 || dy !== 0;
    state.sprinting = Boolean(state.moving && inputKeys.shift);

    /* Age ground puddle ripples */
    for (let i = state.ripples.length - 1; i >= 0; i--) {
      state.ripples[i].age += dt * 1.9;
      if (state.ripples[i].age >= 1) state.ripples.splice(i, 1);
    }

    if (state.moving) {
      state.moveAngle = Math.atan2(dx, dy);
      if (Math.abs(dx) >= Math.abs(dy)) state.dir = dx < 0 ? 'left' : 'right';
      else state.dir = dy < 0 ? 'up' : 'down';

      const activeSpeed = state.sprinting ? state.sprintSpeed : state.speed;
      const step = activeSpeed * dt;
      const nx = state.x + dx * step;
      const ny = state.y + dy * step;

      let moved = false;
      if (!collides(nx, state.y)) { state.x = nx; moved = true; }
      if (!collides(state.x, ny)) { state.y = ny; moved = true; }

      if (!moved && state.targetPoint) {
        /* If click-to-walk gets blocked by a wall, clear auto-walk */
        cancelAutoMove();
      }

      const cadence = state.sprinting ? 1.45 : 1;
      state.walkTime += dt * cadence;
      const nextPhase = Math.floor(state.walkTime * 6.5);
      if (nextPhase !== state.stepPhase) {
        state.stepPhase = nextPhase;
        const c = Math.floor(state.x / T);
        const r = Math.floor(state.y / T);
        const onPuddle = window.AnshWorld.MAP[r]?.[c] === 'U';
        if (onPuddle || state.sprinting) {
          state.ripples.push({
            x: state.x,
            y: state.y + 8,
            age: 0,
            water: onPuddle
          });
          if (state.ripples.length > 16) state.ripples.shift();
        }
        window.AnshAudio.playStep(onPuddle, state.sprinting);
      }
    } else {
      state.idleTime += dt;
    }

    /* Detect nearest interactable within proximity */
    let best = null;
    let bestDist = 54;
    for (const obj of INTERACTABLES) {
      const ox = obj.x !== undefined ? obj.x : obj.tx * T + 16;
      const oy = obj.y !== undefined ? obj.y : obj.ty * T + 16;
      const d = Math.hypot(state.x - ox, state.y - oy);
      if (d < bestDist) {
        bestDist = d;
        best = obj;
      }
    }
    return best;
  };

  const draw = ctx => {
    /* Draw puddle/sprint step rings behind character */
    state.ripples.forEach(rp => {
      const a = Math.max(0, (1 - rp.age) * (rp.water ? 0.52 : 0.25));
      const rad = 3 + rp.age * (rp.water ? 12 : 7);
      ctx.strokeStyle = rp.water ? `rgba(56,189,248,${a.toFixed(2)})` : `rgba(239,68,68,${a.toFixed(2)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(Math.round(rp.x), Math.round(rp.y), rad, rad * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
    });

    const px = Math.round(state.x);
    const py = Math.round(state.y);
    const walkFrame = state.moving ? Math.floor(state.walkTime * 9) % 4 : 0;
    const bob = state.moving
      ? (walkFrame === 1 || walkFrame === 3 ? -2 : 0)
      : Math.round(Math.sin(state.idleTime * 2.4) * 0.6);

    const legOffset = state.moving
      ? (walkFrame === 1 ? 2 : walkFrame === 3 ? -2 : 0)
      : 0;

    /* Faint wet reflection beneath character */
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#09090d';
    ctx.fillRect(px - 6, py + 11, 12, 8);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(px - 6, py + 12, 12, 3);
    ctx.restore();

    /* Ground contact shadow */
    ctx.fillStyle = 'rgba(0,0,0,0.52)';
    ctx.fillRect(px - 8, py + 7, 16, 4);

    if (state.sitting) {
      /* Seated relaxed chill pose on bench */
      const sb = Math.round(Math.sin(state.idleTime * 1.8) * 0.5);
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(px - 6, py + 3, 5, 4);
      ctx.fillRect(px + 1, py + 3, 5, 4);
      ctx.fillStyle = '#e4e4e7';
      ctx.fillRect(px - 7, py - 5 + sb, 14, 10);
      ctx.fillStyle = '#18181b';
      ctx.fillRect(px - 5, py - 2 + sb, 10, 6);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(px - 7, py - 5 + sb, 14, 3);
      ctx.fillStyle = '#f4f4f5';
      ctx.fillRect(px - 6, py - 15 + sb, 12, 10);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(px - 7, py - 18 + sb, 14, 5);
      ctx.fillStyle = '#09090b';
      ctx.fillRect(px - 4, py - 10 + sb, 2, 2);
      ctx.fillRect(px + 2, py - 10 + sb, 2, 2);
      return;
    }

    /* Boots */
    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(px - 6, py + 4 + (legOffset > 0 ? -1 : 0), 5, 5);
    ctx.fillRect(px + 1, py + 4 + (legOffset < 0 ? -1 : 0), 5, 5);

    /* Jacket (dark cyber-techwear + crisp crimson collar/scarf) */
    ctx.fillStyle = '#e4e4e7';
    ctx.fillRect(px - 7, py - 7 + bob, 14, 12);
    ctx.fillStyle = '#18181b';
    ctx.fillRect(px - 5, py - 4 + bob, 10, 8);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(px - 7, py - 7 + bob, 14, 3);

    /* Trailing scarf edge */
    if (state.dir === 'left') ctx.fillRect(px + 5, py - 5 + bob, 3, 6);
    if (state.dir === 'right') ctx.fillRect(px - 8, py - 5 + bob, 3, 6);

    /* Head & Hair / Cap */
    ctx.fillStyle = '#f4f4f5';
    ctx.fillRect(px - 6, py - 17 + bob, 12, 10);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(px - 7, py - 20 + bob, 14, 5);
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(px - 7, py - 16 + bob, 14, 1);

    /* Directional visor/eyes */
    ctx.fillStyle = '#09090b';
    if (state.dir === 'down') {
      ctx.fillRect(px - 4, py - 12 + bob, 2, 3);
      ctx.fillRect(px + 2, py - 12 + bob, 2, 3);
    } else if (state.dir === 'left') {
      ctx.fillRect(px - 5, py - 12 + bob, 2, 3);
    } else if (state.dir === 'right') {
      ctx.fillRect(px + 3, py - 12 + bob, 2, 3);
    }
  };

  return {
    state,
    update,
    draw,
    moveToPoint,
    cancelAutoMove,
    sitOnBench,
    standUp
  };
})();
