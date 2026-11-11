(function (global) {
  'use strict';

  const HookeLab = (global.HookeLab = global.HookeLab || {});

  function createStudioEnvMap(renderer) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();

    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x050b1a);

    // Overhead bright studio softbox panels for crisp metallic & plastic speculars
    const topLightGeo = new THREE.PlaneGeometry(14, 14);
    const topLightMat = new THREE.MeshBasicMaterial({ color: 0xdff4ff, side: THREE.DoubleSide });
    const topPanel = new THREE.Mesh(topLightGeo, topLightMat);
    topPanel.position.set(0, 12, 0);
    topPanel.rotation.x = Math.PI / 2;
    envScene.add(topPanel);

    // Cyan left rim strip
    const stripGeo = new THREE.PlaneGeometry(3, 14);
    const cyanStrip = new THREE.Mesh(
      stripGeo,
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide })
    );
    cyanStrip.position.set(-10, 4, 3);
    cyanStrip.lookAt(0, 4, 0);
    envScene.add(cyanStrip);

    // Indigo/violet right rim strip
    const violetStrip = new THREE.Mesh(
      stripGeo,
      new THREE.MeshBasicMaterial({ color: 0x6b7cff, side: THREE.DoubleSide })
    );
    violetStrip.position.set(10, 5, -2);
    violetStrip.lookAt(0, 4, 0);
    envScene.add(violetStrip);

    // Warm key accent for golden rubber band highlights
    const warmPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 5),
      new THREE.MeshBasicMaterial({ color: 0xffeed0, side: THREE.DoubleSide })
    );
    warmPanel.position.set(6, 9, 8);
    warmPanel.lookAt(0, 4, 0);
    envScene.add(warmPanel);

    const envRT = pmrem.fromScene(envScene, 0.04);
    pmrem.dispose();
    return envRT.texture;
  }

  function createLabGridTexture() {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#060c1b';
    ctx.fillRect(0, 0, size, size);

    // Minor grid
    ctx.strokeStyle = 'rgba(42, 168, 220, 0.12)';
    ctx.lineWidth = 1;
    const stepMinor = size / 16;
    for (let i = 0; i <= 16; i++) {
      const p = i * stepMinor;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }

    // Major grid
    ctx.strokeStyle = 'rgba(56, 224, 255, 0.28)';
    ctx.lineWidth = 2;
    const stepMajor = size / 4;
    for (let i = 0; i <= 4; i++) {
      const p = i * stepMajor;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }

    // Plus crosshairs at major intersections
    ctx.strokeStyle = 'rgba(130, 240, 255, 0.55)';
    ctx.lineWidth = 2;
    for (let ix = 0; ix <= 4; ix++) {
      for (let iy = 0; iy <= 4; iy++) {
        const cx = ix * stepMajor;
        const cy = iy * stepMajor;
        ctx.beginPath();
        ctx.moveTo(cx - 8, cy);
        ctx.lineTo(cx + 8, cy);
        ctx.moveTo(cx, cy - 8);
        ctx.lineTo(cx, cy + 8);
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(16, 16);
    tex.anisotropy = 8;
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function createPedestalTexture() {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const c = size / 2;

    // Brushed radial metal base
    const grad = ctx.createRadialGradient(c, c, 40, c, c, c);
    grad.addColorStop(0, '#13203b');
    grad.addColorStop(0.55, '#0d172c');
    grad.addColorStop(0.92, '#091020');
    grad.addColorStop(1, '#102542');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Concentric observatory target rings
    const radii = [120, 220, 340, 445, 485];
    radii.forEach((r, idx) => {
      ctx.beginPath();
      ctx.arc(c, c, r, 0, Math.PI * 2);
      ctx.strokeStyle = idx === 3 ? 'rgba(34, 230, 255, 0.55)' : 'rgba(56, 189, 248, 0.22)';
      ctx.lineWidth = idx === 3 ? 3 : 1.5;
      if (idx === 1 || idx === 2) ctx.setLineDash([12, 10]);
      else ctx.setLineDash([]);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // Degree tick marks around outer ring
    for (let deg = 0; deg < 360; deg += 5) {
      const rad = (deg * Math.PI) / 180;
      const inner = deg % 30 === 0 ? 426 : deg % 15 === 0 ? 434 : 439;
      const outer = 445;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(rad) * inner, c + Math.sin(rad) * inner);
      ctx.lineTo(c + Math.cos(rad) * outer, c + Math.sin(rad) * outer);
      ctx.strokeStyle = deg % 30 === 0 ? 'rgba(34, 230, 255, 0.7)' : 'rgba(34, 230, 255, 0.25)';
      ctx.lineWidth = deg % 30 === 0 ? 2.5 : 1;
      ctx.stroke();
    }

    // Center shadow target crosshairs
    ctx.strokeStyle = 'rgba(34, 230, 255, 0.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(c - 180, c);
    ctx.lineTo(c + 180, c);
    ctx.moveTo(c, c - 180);
    ctx.lineTo(c, c + 180);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 8;
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  /**
   * High-DPI 3D Holographic Ruler Scale Texture.
   * Aligns precisely with world Y coordinates:
   *   Ruler Plane Height = 5.40 (from y=6.85 top to y=1.45 bottom)
   *   0 cm tick sits exactly at y = 6.40 (REST_BOTTOM_Y)
   */
  function createRulerScaleTexture(rulerTopY, rulerHeight) {
    const w = 512;
    const h = 2048;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const CFG = HookeLab.CONFIG;

    // Semi-transparent deep cyan glass backdrop
    const bg = ctx.createLinearGradient(0, 0, w, 0);
    bg.addColorStop(0, 'rgba(6, 22, 48, 0.86)');
    bg.addColorStop(0.5, 'rgba(9, 30, 62, 0.74)');
    bg.addColorStop(1, 'rgba(6, 22, 48, 0.86)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Border glow lines
    ctx.strokeStyle = 'rgba(34, 230, 255, 0.7)';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, w - 12, h - 12);

    function worldYToPx(worldY) {
      const fracFromTop = (rulerTopY - worldY) / rulerHeight;
      return fracFromTop * h;
    }

    // Elastic limit hazard zone (> 12.0 cm)
    const yLimitPx = worldYToPx(CFG.REST_BOTTOM_Y - 12.0 * CFG.CM_TO_WORLD);
    const yBottomZonePx = worldYToPx(CFG.REST_BOTTOM_Y - 15.2 * CFG.CM_TO_WORLD);
    const hazGrad = ctx.createLinearGradient(0, yLimitPx, 0, yBottomZonePx);
    hazGrad.addColorStop(0, 'rgba(255, 51, 85, 0.34)');
    hazGrad.addColorStop(1, 'rgba(255, 51, 85, 0.08)');
    ctx.fillStyle = hazGrad;
    ctx.fillRect(10, yLimitPx, w - 20, yBottomZonePx - yLimitPx);

    // Header label
    ctx.fillStyle = '#38e8ff';
    ctx.font = 'bold 28px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXTENSION (cm)', w / 2, 54);
    ctx.font = '600 22px "Noto Sans Kannada", "Nirmala UI", sans-serif';
    ctx.fillStyle = '#a6d9f7';
    ctx.fillText('ಹಿಗ್ಗುವಿಕೆ (ಸೆಂ.ಮೀ)', w / 2, 90);

    // Tick marks from 0.0 cm to 15.0 cm in 0.1 cm increments
    for (let mm = 0; mm <= 150; mm++) {
      const cm = mm / 10;
      const worldY = CFG.REST_BOTTOM_Y - cm * CFG.CM_TO_WORLD;
      const py = worldYToPx(worldY);
      const isMajor = mm % 10 === 0;
      const isHalf = mm % 5 === 0 && !isMajor;
      const isLimit = cm >= 12.0;

      let tickLen = 28;
      let lw = 2;
      let col = isLimit ? 'rgba(255, 110, 130, 0.55)' : 'rgba(56, 224, 255, 0.45)';

      if (isHalf) {
        tickLen = 58;
        lw = 3;
        col = isLimit ? 'rgba(255, 130, 150, 0.85)' : 'rgba(110, 238, 255, 0.8)';
      }
      if (isMajor) {
        tickLen = 96;
        lw = 4.5;
        col = cm === 12 ? '#ff4466' : cm === 0 ? '#22f59a' : isLimit ? '#ff6b85' : '#ffffff';
      }

      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(16, py);
      ctx.lineTo(16 + tickLen, py);
      ctx.stroke();

      if (isMajor) {
        ctx.fillStyle = cm === 12 ? '#ff6b85' : cm === 0 ? '#22f59a' : '#e6f9ff';
        ctx.font = 'bold 42px Orbitron, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(String(cm), 126, py + 14);

        if (cm === 0) {
          ctx.fillStyle = '#22f59a';
          ctx.font = 'bold 22px Orbitron, sans-serif';
          ctx.fillText('ORIGIN', 218, py + 9);
        } else if (cm === 12) {
          ctx.fillStyle = '#ff6b85';
          ctx.font = 'bold 21px Orbitron, sans-serif';
          ctx.fillText('ELASTIC LIMIT', 218, py + 9);
        } else {
          ctx.fillStyle = 'rgba(147, 172, 201, 0.72)';
          ctx.font = '600 24px Orbitron, sans-serif';
          ctx.fillText('cm', 202, py + 10);
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 8;
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  /**
   * Real-time glowing digital HUD badge attached to the 3D ruler's sliding cursor.
   */
  class DigitalHudTexture {
    constructor() {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 512;
      this.canvas.height = 256;
      this.ctx = this.canvas.getContext('2d');
      this.texture = new THREE.CanvasTexture(this.canvas);
      this.texture.encoding = THREE.sRGBEncoding;
      this.texture.anisotropy = 4;
      this.lastKey = '';
      this.update(0, 0, 'normal');
    }

    update(extCm, clipCount, mode) {
      const rounded = extCm.toFixed(1);
      const key = `${rounded}|${clipCount}|${mode}`;
      if (key === this.lastKey) return;
      this.lastKey = key;

      const { ctx, canvas } = this;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const accent =
        mode === 'snapped' ? '#ff3355' : mode === 'warning' ? '#ffb020' : '#22e6ff';
      const bgTint =
        mode === 'snapped'
          ? 'rgba(55, 8, 22, 0.92)'
          : mode === 'warning'
          ? 'rgba(42, 24, 6, 0.9)'
          : 'rgba(5, 22, 48, 0.9)';

      // Rounded HUD card
      ctx.fillStyle = bgTint;
      roundRect(ctx, 12, 12, w - 24, h - 24, 24);
      ctx.fill();

      ctx.strokeStyle = accent;
      ctx.lineWidth = 6;
      roundRect(ctx, 12, 12, w - 24, h - 24, 24);
      ctx.stroke();

      // Pointer triangle on left edge
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(20, h / 2 - 18);
      ctx.lineTo(20, h / 2 + 18);
      ctx.closePath();
      ctx.fill();

      // Kicker
      ctx.fillStyle = accent;
      ctx.font = 'bold 26px Orbitron, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(
        mode === 'snapped' ? 'ELASTIC LIMIT BREAK' : 'LIVE EXTENSION Δx',
        38,
        58
      );

      // Main Glowing Digital Readout
      ctx.shadowColor = accent;
      ctx.shadowBlur = 22;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 82px Orbitron, sans-serif';
      const mainStr = mode === 'snapped' ? 'SNAPPED!' : `${extCm.toFixed(1)} cm`;
      ctx.fillText(mainStr, 36, 152);
      ctx.shadowBlur = 0;

      // Sub line
      ctx.fillStyle = '#a6d9f7';
      ctx.font = '600 26px Inter, "Noto Sans Kannada", sans-serif';
      const weightG = (clipCount * HookeLab.CONFIG.CLIP_MASS_G).toFixed(0);
      ctx.fillText(
        mode === 'snapped'
          ? `Overload: ${clipCount} clips (${weightG} g)`
          : `${clipCount} Clips • ${weightG} g • ${(clipCount * HookeLab.CONFIG.FORCE_PER_CLIP_N).toFixed(3)} N`,
        38,
        208
      );

      this.texture.needsUpdate = true;
    }
  }

  function createCupLabelTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(130, 238, 255, 0.72)';
    ctx.fillStyle = 'rgba(190, 246, 255, 0.85)';
    ctx.font = 'bold 24px Orbitron, sans-serif';
    ctx.textAlign = 'left';

    const marks = [
      { y: 390, label: '10 g' },
      { y: 300, label: '20 g' },
      { y: 210, label: '30 g' },
      { y: 120, label: '40 g MAX' }
    ];
    marks.forEach((m) => {
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(450, m.y);
      ctx.lineTo(500, m.y);
      ctx.stroke();
      ctx.fillText(m.label, 512, m.y + 8);
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 4;
    return tex;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  HookeLab.textures = {
    createStudioEnvMap,
    createLabGridTexture,
    createPedestalTexture,
    createRulerScaleTexture,
    DigitalHudTexture,
    createCupLabelTexture
  };
})(window);
