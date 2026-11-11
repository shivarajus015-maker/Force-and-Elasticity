(function (global) {
  'use strict';

  const HookeLab = (global.HookeLab = global.HookeLab || {});

  function showFatalError(msg) {
    const el = document.getElementById('error-overlay');
    const txt = document.getElementById('error-message');
    if (el && txt) {
      txt.innerHTML = msg;
      el.classList.remove('hidden');
    }
  }

  function init() {
    if (typeof THREE === 'undefined' || typeof THREE.OrbitControls === 'undefined') {
      showFatalError(
        '<strong>3D Engine Load Error:</strong> Could not load Three.js from CDN. Please verify internet access and reload.'
      );
      return;
    }

    const container = document.getElementById('canvas-container');
    const CFG = HookeLab.CONFIG;

    // 1. Renderer
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance'
      });
    } catch (err) {
      showFatalError('<strong>WebGL Error:</strong> Your browser could not initialize WebGL.');
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    container.appendChild(renderer.domElement);

    // 2. Scene & Environment
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040814);
    scene.fog = new THREE.FogExp2(0x040814, 0.034);
    scene.environment = HookeLab.textures.createStudioEnvMap(renderer);

    // 3. Camera & OrbitControls
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0.3, 5.2, 11.8);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.target.set(0.4, 4.3, 0);
    controls.minDistance = 3.2;
    controls.maxDistance = 18.0;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.update();

    // 4. Observatory Lighting Rig (Key Shadow Caster + Spot + Ambient + Rim)
    const hemiLight = new THREE.HemisphereLight(0x90ccff, 0x0a1530, 0.75);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xf4f9ff, 2.3);
    keyLight.position.set(4.2, 13.5, 5.2);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 1.0;
    keyLight.shadow.camera.far = 26.0;
    keyLight.shadow.camera.left = -5.5;
    keyLight.shadow.camera.right = 5.5;
    keyLight.shadow.camera.top = 11.5;
    keyLight.shadow.camera.bottom = -2.0;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const overheadSpot = new THREE.SpotLight(0x5ae6ff, 1.3, 20, Math.PI * 0.28, 0.65, 1.2);
    overheadSpot.position.set(0, 11.2, 0);
    scene.add(overheadSpot);

    const cyanRim = new THREE.DirectionalLight(0x22e6ff, 0.9);
    cyanRim.position.set(-6.5, 5.0, -5.0);
    scene.add(cyanRim);

    const violetAccent = new THREE.PointLight(0x6d68ff, 1.15, 18);
    violetAccent.position.set(5.5, 4.2, -4.5);
    scene.add(violetAccent);

    // 5. Build 3D Observatory Models
    const envAnim = HookeLab.models.buildLabEnvironment(scene);
    const gantry = HookeLab.models.buildGantry(scene);
    const rubberBand = new HookeLab.models.RubberBand3D(scene);
    const cupAssembly = HookeLab.models.buildCupAssembly(scene);
    const ruler = HookeLab.models.buildRulerAssembly(scene);

    const sim = new HookeLab.PhysicsSimulation(scene, {
      gantry,
      rubberBand,
      cupAssembly,
      ruler,
      createPaperclipMesh: HookeLab.models.createPaperclipMesh
    });

    // 6. Floating 3D Hologram Line Graph
    const graph3D = new HookeLab.HologramGraph3D(
      document.getElementById('graph-canvas'),
      document.getElementById('graph-3d-wrap'),
      document.getElementById('graph-readout')
    );

    // 7. DOM Elements
    const elWeight = document.getElementById('val-weight');
    const elForce = document.getElementById('val-force');
    const elClips = document.getElementById('val-clips');
    const elExtension = document.getElementById('val-extension');
    const elStatusBadge = document.getElementById('status-badge');
    const elLawRatio = document.getElementById('val-law-ratio');
    const meterSegs = Array.from(document.querySelectorAll('#clip-meter .meter-seg'));

    const btnAdd = document.getElementById('btn-add-clip');
    const btnRemove = document.getElementById('btn-remove-clip');
    const btnReset = document.getElementById('btn-reset-lab');
    const btnBannerRepair = document.getElementById('btn-banner-repair');
    const snapBanner = document.getElementById('snap-banner');

    const chkSlowMo = document.getElementById('chk-slowmo');
    const chkLaser = document.getElementById('chk-laser');
    const btnSound = document.getElementById('btn-sound');
    const btnToggleHud = document.getElementById('btn-toggle-hud');

    const controlsBody = document.getElementById('controls-body');
    const lockBadge = document.getElementById('lock-badge');
    const btnChallenge = document.getElementById('btn-challenge');

    let controlsLocked = false;

    function syncControlButtons() {
      const snapped = sim.isSnapped;
      btnAdd.disabled = controlsLocked || snapped;
      btnRemove.disabled = controlsLocked || snapped || sim.committedClips <= 0;
      btnReset.disabled = controlsLocked;

      const resetMain = btnReset.querySelector('.sec-main');
      const resetKn = btnReset.querySelector('.sec-kn');
      if (snapped) {
        btnReset.classList.add('sec-repair-highlight');
        resetMain.textContent = 'Repair Band';
        resetKn.textContent = 'ಬ್ಯಾಂಡ್ ಸರಿಪಡಿಸಿ';
      } else {
        btnReset.classList.remove('sec-repair-highlight');
        resetMain.textContent = 'Reset Lab';
        resetKn.textContent = 'ಮರುಹೊಂದಿಸಿ';
      }
    }

    function updateTelemetryUI(t) {
      elWeight.textContent = t.weightG.toFixed(1);
      elForce.textContent = `Force (ಬಲ): ${t.forceN.toFixed(3)} N`;
      elClips.textContent = String(t.clips);
      elExtension.textContent = t.isSnapped ? 'SNAP!' : t.extCm.toFixed(2);

      // Meter segments (0..7 safe, 8 snap danger)
      meterSegs.forEach((seg, idx) => {
        seg.classList.remove('filled', 'warn');
        if (idx < 8 && idx < t.clips) {
          seg.classList.add('filled');
          if (t.clips >= 7) seg.classList.add('warn');
        } else if (idx === 8 && t.isSnapped) {
          seg.classList.add('filled');
        }
      });

      // Status badge
      const statusMeta = HookeLab.STATUS_TEXT[t.mode];
      elStatusBadge.textContent = statusMeta.badge;
      elStatusBadge.className = `status-badge state-${t.mode}`;

      if (t.isSnapped) {
        elLawRatio.textContent = 'Elastic limit exceeded (> 8 clips)';
      } else if (t.clips > 0) {
        const ratio = (t.forceN / (t.targetExtCm * 0.01)).toFixed(2);
        elLawRatio.textContent = `Hooke's Law: F = k · Δx  |  k = ${ratio} N/m`;
      } else {
        elLawRatio.textContent = `Hooke's Law: F = k · Δx  |  k = ${CFG.SPRING_K_N_PER_M.toFixed(2)} N/m`;
      }

      syncControlButtons();
    }

    sim.onTelemetryChange = updateTelemetryUI;

    sim.onClipCommitted = (clips) => {
      graph3D.setState(clips, false);
    };

    sim.onSnapTriggered = (clips) => {
      graph3D.setState(clips, true);
      snapBanner.classList.remove('hidden');
      syncControlButtons();
    };

    // 8. User Actions
    btnAdd.addEventListener('click', () => {
      if (controlsLocked || sim.isSnapped) return;
      sim.addPaperclip();
    });

    btnRemove.addEventListener('click', () => {
      if (controlsLocked || sim.isSnapped) return;
      sim.removePaperclip();
    });

    function handleReset() {
      if (controlsLocked) return;
      snapBanner.classList.add('hidden');
      sim.reset();
      graph3D.setState(0, false);
      syncControlButtons();
    }

    btnReset.addEventListener('click', handleReset);
    btnBannerRepair.addEventListener('click', handleReset);

    chkLaser.addEventListener('change', () => {
      ruler.setLaserVisible(chkLaser.checked);
    });

    btnSound.addEventListener('click', () => {
      const next = !HookeLab.audio.enabled;
      HookeLab.audio.setEnabled(next);
      btnSound.classList.toggle('active', next);
      document.getElementById('sound-wave-1').style.opacity = next ? '1' : '0.15';
      document.getElementById('sound-wave-2').style.opacity = next ? '1' : '0.15';
    });

    btnToggleHud.addEventListener('click', () => {
      document.body.classList.toggle('hud-panels-collapsed');
    });

    // 9. Camera Preset Smooth Transitions
    const CAM_PRESETS = {
      overview: { pos: new THREE.Vector3(0.3, 5.2, 11.8), target: new THREE.Vector3(0.4, 4.3, 0) },
      ruler: { pos: new THREE.Vector3(1.6, 4.9, 5.4), target: new THREE.Vector3(1.1, 4.6, 0) },
      cup: { pos: new THREE.Vector3(-1.1, 3.2, 4.9), target: new THREE.Vector3(0.0, 2.8, 0) }
    };
    let camAnim = null;
    const camButtons = Array.from(document.querySelectorAll('.camera-presets .pill-btn'));

    camButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-cam');
        const preset = CAM_PRESETS[key];
        if (!preset) return;
        camButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        camAnim = {
          startPos: camera.position.clone(),
          endPos: preset.pos.clone(),
          startTarget: controls.target.clone(),
          endTarget: preset.target.clone(),
          t: 0
        };
      });
    });

    controls.addEventListener('start', () => {
      // Cancel preset tween immediately if user manually grabs OrbitControls
      camAnim = null;
    });

    // 10. Challenge Mode Controller (Locks Controls & Opens Holographic Quiz)
    const challenge = new HookeLab.ChallengeController((locked) => {
      controlsLocked = locked;
      controlsBody.classList.toggle('is-locked', locked);
      lockBadge.classList.toggle('hidden', !locked);
      syncControlButtons();
    });

    btnChallenge.addEventListener('click', () => {
      challenge.open();
    });

    // 11. Resize Handler
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      graph3D.resize();
    });

    // Initial UI sync
    updateTelemetryUI(sim._buildTelemetry());
    graph3D.setState(0, false);

    // 12. Animation Loop
    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      const rawDt = Math.min(0.05, clock.getDelta());
      const elapsed = clock.elapsedTime;
      const simDt = chkSlowMo.checked ? rawDt * 0.35 : rawDt;

      // Smooth camera preset tween
      if (camAnim) {
        camAnim.t = Math.min(1, camAnim.t + rawDt * 2.4);
        const ease = 1 - Math.pow(1 - camAnim.t, 3);
        camera.position.lerpVectors(camAnim.startPos, camAnim.endPos, ease);
        controls.target.lerpVectors(camAnim.startTarget, camAnim.endTarget, ease);
        if (camAnim.t >= 1) camAnim = null;
      }

      controls.update();
      envAnim.update(elapsed);
      sim.update(simDt, elapsed);
      graph3D.update(rawDt, elapsed);

      renderer.render(scene, camera);
    }

    animate();
  }

  window.addEventListener('DOMContentLoaded', init);
})(window);
