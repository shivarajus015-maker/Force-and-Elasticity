(function (global) {
  'use strict';

  const HookeLab = (global.HookeLab = global.HookeLab || {});

  /**
   * Builds the dark futuristic laboratory bay, reflective grid floor,
   * circular measurement pedestal, observatory ribs, volumetric light cones,
   * and floating dust motes.
   */
  function buildLabEnvironment(scene) {
    const tex = HookeLab.textures;
    const envGroup = new THREE.Group();

    // 1. Outer Lab Grid Floor (y = -0.18)
    const gridTex = tex.createLabGridTexture();
    const floorGeo = new THREE.CircleGeometry(34, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      map: gridTex,
      roughness: 0.55,
      metalness: 0.35
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.18;
    floor.receiveShadow = true;
    envGroup.add(floor);

    // 2. Central Elevated Measurement Pedestal (y = -0.18 to y = 0.0)
    const pedTex = tex.createPedestalTexture();
    const pedSideMat = new THREE.MeshStandardMaterial({
      color: 0x0e182e,
      metalness: 0.8,
      roughness: 0.3
    });
    const pedTopMat = new THREE.MeshStandardMaterial({
      map: pedTex,
      roughness: 0.42,
      metalness: 0.45
    });
    const pedGeo = new THREE.CylinderGeometry(3.85, 4.05, 0.18, 64);
    const pedestal = new THREE.Mesh(pedGeo, [pedSideMat, pedTopMat, pedSideMat]);
    pedestal.position.y = -0.09;
    pedestal.receiveShadow = true;
    envGroup.add(pedestal);

    // Glowing Cyan Rim Ring on Pedestal
    const pedRing = new THREE.Mesh(
      new THREE.TorusGeometry(3.88, 0.024, 12, 96),
      new THREE.MeshBasicMaterial({ color: 0x22e6ff })
    );
    pedRing.rotation.x = Math.PI / 2;
    pedRing.position.y = 0.0;
    envGroup.add(pedRing);

    // 3. Background Observatory Chamber Architectural Ribs
    const ribMat = new THREE.MeshStandardMaterial({
      color: 0x101c38,
      metalness: 0.82,
      roughness: 0.35
    });
    const ledStripMat = new THREE.MeshBasicMaterial({ color: 0x18bfff });
    const ribAngles = [-2.35, -1.65, -0.75, 0.05];
    ribAngles.forEach((ang) => {
      const ribGroup = new THREE.Group();
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.36, 13.5, 0.55), ribMat);
      col.position.set(Math.cos(ang) * 10.8, 6.5, Math.sin(ang) * 10.8);
      col.lookAt(0, 6.5, 0);
      ribGroup.add(col);

      const led = new THREE.Mesh(new THREE.BoxGeometry(0.06, 10.5, 0.05), ledStripMat);
      led.position.set(Math.cos(ang) * 10.5, 5.8, Math.sin(ang) * 10.5);
      led.lookAt(0, 5.8, 0);
      ribGroup.add(led);

      envGroup.add(ribGroup);
    });

    // Overhead Observatory Halo Aperture Ring (y = 11.4)
    const ceilingRing = new THREE.Mesh(
      new THREE.TorusGeometry(3.8, 0.12, 16, 72),
      new THREE.MeshStandardMaterial({ color: 0x182748, metalness: 0.85, roughness: 0.25 })
    );
    ceilingRing.rotation.x = Math.PI / 2;
    ceilingRing.position.y = 11.4;
    envGroup.add(ceilingRing);

    const ceilingGlow = new THREE.Mesh(
      new THREE.TorusGeometry(3.62, 0.03, 12, 72),
      new THREE.MeshBasicMaterial({ color: 0x22e6ff })
    );
    ceilingGlow.rotation.x = Math.PI / 2;
    ceilingGlow.position.y = 11.34;
    envGroup.add(ceilingGlow);

    // 4. Soft Volumetric Lighting Cones (Custom Fresnel-Faded Shader)
    function createVolumetricCone(topR, botR, height, colorHex, intensity) {
      const geo = new THREE.CylinderGeometry(topR, botR, height, 48, 1, true);
      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uColor: { value: new THREE.Color(colorHex) },
          uIntensity: { value: intensity }
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vNormalView;
          varying vec3 vViewPos;
          void main() {
            vUv = uv;
            vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
            vViewPos = -mvPos.xyz;
            vNormalView = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * mvPos;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uIntensity;
          varying vec2 vUv;
          varying vec3 vNormalView;
          varying vec3 vViewPos;
          void main() {
            vec3 viewDir = normalize(vViewPos);
            float fresnel = pow(abs(dot(normalize(vNormalView), viewDir)), 2.2);
            float verticalFade = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.72, vUv.y);
            float alpha = fresnel * verticalFade * uIntensity;
            gl_FragColor = vec4(uColor, alpha);
          }
        `
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = height / 2;
      return mesh;
    }

    envGroup.add(createVolumetricCone(1.5, 4.1, 11.4, 0x38d8ff, 0.085));
    envGroup.add(createVolumetricCone(0.8, 2.5, 11.4, 0xbceeff, 0.065));

    // 5. Floating Dust Motes in Volumetric Light Column
    const moteCount = 180;
    const motePos = new Float32Array(moteCount * 3);
    const moteSeed = new Float32Array(moteCount);
    for (let i = 0; i < moteCount; i++) {
      const r = 0.4 + Math.random() * 3.6;
      const th = Math.random() * Math.PI * 2;
      motePos[i * 3] = Math.cos(th) * r;
      motePos[i * 3 + 1] = 0.3 + Math.random() * 10.2;
      motePos[i * 3 + 2] = Math.sin(th) * r;
      moteSeed[i] = Math.random() * 100;
    }
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
    const moteMat = new THREE.PointsMaterial({
      color: 0x99f2ff,
      size: 0.045,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const motes = new THREE.Points(moteGeo, moteMat);
    envGroup.add(motes);

    scene.add(envGroup);

    return {
      update(elapsed) {
        const pos = moteGeo.attributes.position.array;
        for (let i = 0; i < moteCount; i++) {
          const idx = i * 3;
          pos[idx + 1] += 0.004;
          pos[idx] += Math.sin(elapsed * 0.6 + moteSeed[i]) * 0.0012;
          if (pos[idx + 1] > 10.6) pos[idx + 1] = 0.25;
        }
        moteGeo.attributes.position.needsUpdate = true;
      }
    };
  }

  /**
   * Builds the heavy brushed-titanium overhead gantry frame, top solid metal bar,
   * central load-cell clamp, status LED ring, and top hook pin.
   */
  function buildGantry(scene) {
    const CFG = HookeLab.CONFIG;
    const gantry = new THREE.Group();

    const darkMetal = new THREE.MeshStandardMaterial({
      color: 0x263248,
      metalness: 0.85,
      roughness: 0.28
    });
    const brushedChrome = new THREE.MeshStandardMaterial({
      color: 0xbdd0e4,
      metalness: 0.92,
      roughness: 0.2
    });
    const accentCyan = new THREE.MeshBasicMaterial({ color: 0x22e6ff });

    // Twin Vertical Gantry Pillars (x = -3.25 and +3.25)
    [-3.25, 3.25].forEach((px) => {
      const baseFoot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.36, 0.26, 24),
        darkMetal
      );
      baseFoot.position.set(px, 0.13, 0);
      baseFoot.castShadow = true;
      baseFoot.receiveShadow = true;
      gantry.add(baseFoot);

      const footGlow = new THREE.Mesh(
        new THREE.TorusGeometry(0.32, 0.014, 10, 32),
        accentCyan
      );
      footGlow.rotation.x = Math.PI / 2;
      footGlow.position.set(px, 0.03, 0);
      gantry.add(footGlow);

      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.14, 8.95, 24),
        darkMetal
      );
      pillar.position.set(px, 4.475, 0);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      gantry.add(pillar);

      // Vertical LED telemetry slit facing inward
      const slit = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 7.6, 0.04),
        accentCyan
      );
      slit.position.set(px > 0 ? px - 0.12 : px + 0.12, 4.5, 0.06);
      gantry.add(slit);

      // Top Collar Joint
      const collar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.42, 24),
        brushedChrome
      );
      collar.position.set(px, 8.85, 0);
      collar.castShadow = true;
      gantry.add(collar);
    });

    // Solid 3D Metal Bar at the Top (y = 8.85)
    const topBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.145, 0.145, 7.05, 32),
      brushedChrome
    );
    topBar.rotation.z = Math.PI / 2;
    topBar.position.set(0, 8.85, 0);
    topBar.castShadow = true;
    topBar.receiveShadow = true;
    gantry.add(topBar);

    // End Caps on Top Metal Bar
    [-3.56, 3.56].forEach((ex) => {
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.12, 24),
        darkMetal
      );
      cap.rotation.z = Math.PI / 2;
      cap.position.set(ex, 8.85, 0);
      gantry.add(cap);
    });

    // Central Tension Sensor Clamp
    const clampBlock = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.22, 0.48, 28),
      darkMetal
    );
    clampBlock.position.set(0, 8.85, 0);
    clampBlock.castShadow = true;
    gantry.add(clampBlock);

    // Status LED Tension Ring on Clamp
    const statusLedMat = new THREE.MeshStandardMaterial({
      color: 0x22e6ff,
      emissive: 0x22e6ff,
      emissiveIntensity: 1.4,
      roughness: 0.2
    });
    const statusLedRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.245, 0.024, 12, 36),
      statusLedMat
    );
    statusLedRing.rotation.x = Math.PI / 2;
    statusLedRing.position.set(0, 8.66, 0);
    gantry.add(statusLedRing);

    // Steel Stem + Horizontal Hook Pin at TOP_HOOK_Y (8.20)
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.46, 16),
      brushedChrome
    );
    stem.position.set(0, 8.43, 0);
    stem.castShadow = true;
    gantry.add(stem);

    const hookPin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.24, 16),
      brushedChrome
    );
    hookPin.rotation.x = Math.PI / 2;
    hookPin.position.set(0, CFG.TOP_HOOK_Y, 0);
    hookPin.castShadow = true;
    gantry.add(hookPin);

    // Subtle Dispenser Emitter Ring above cup opening
    const feederMat = new THREE.MeshBasicMaterial({
      color: 0x22e6ff,
      transparent: true,
      opacity: 0.0
    });
    const feederHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.015, 10, 32),
      feederMat
    );
    feederHalo.rotation.x = Math.PI / 2;
    feederHalo.position.set(-0.14, 7.25, 0.16);
    gantry.add(feederHalo);

    scene.add(gantry);

    return {
      statusLedMat,
      feederMat,
      feederHalo,
      setStatusMode(mode) {
        if (mode === 'snapped') {
          statusLedMat.color.setHex(0xff2a4b);
          statusLedMat.emissive.setHex(0xff2a4b);
        } else if (mode === 'warning') {
          statusLedMat.color.setHex(0xffb020);
          statusLedMat.emissive.setHex(0xffb020);
        } else {
          statusLedMat.color.setHex(0x22e6ff);
          statusLedMat.emissive.setHex(0x22e6ff);
        }
      }
    };
  }

  /**
   * Builds a dynamic closed-loop 3D Rubber Band whose vertices deform in-place
   * (stretch downward + Poisson thinning + damped lateral vibration twang)
   * AND splits into two recoiling snap strands when exceeding the elastic limit.
   */
  class RubberBand3D {
    constructor(scene) {
      this.CFG = HookeLab.CONFIG;
      this.segments = 64;
      this.radialSegs = 10;

      this.material = new THREE.MeshPhysicalMaterial({
        color: 0xf2aa35,
        roughness: 0.24,
        metalness: 0.04,
        clearcoat: 0.85,
        clearcoatRoughness: 0.18,
        emissive: 0x221000,
        emissiveIntensity: 0.35
      });

      this.geometry = this._allocateTubeGeometry(this.segments, this.radialSegs, true);
      this.loopMesh = new THREE.Mesh(this.geometry, this.material);
      this.loopMesh.castShadow = true;
      this.loopMesh.receiveShadow = true;
      scene.add(this.loopMesh);

      // Snapped Remnant Meshes (open strands)
      this.snapMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xff2848,
        emissive: 0xff1133,
        emissiveIntensity: 0.85,
        roughness: 0.25,
        clearcoat: 0.75
      });
      this.upperGeo = this._allocateTubeGeometry(28, 8, false);
      this.upperMesh = new THREE.Mesh(this.upperGeo, this.snapMaterial);
      this.upperMesh.castShadow = true;
      this.upperMesh.visible = false;
      scene.add(this.upperMesh);

      this.lowerGeo = this._allocateTubeGeometry(28, 8, false);
      this.lowerMesh = new THREE.Mesh(this.lowerGeo, this.snapMaterial);
      this.lowerMesh.castShadow = true;
      this.lowerMesh.visible = false;
      scene.add(this.lowerMesh);

      // Snap Spark Particle Burst
      this.sparkCount = 40;
      const sPos = new Float32Array(this.sparkCount * 3);
      this.sparkVel = [];
      for (let i = 0; i < this.sparkCount; i++) {
        this.sparkVel.push(new THREE.Vector3());
      }
      this.sparkGeo = new THREE.BufferGeometry();
      this.sparkGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
      this.sparkMat = new THREE.PointsMaterial({
        color: 0xff4b66,
        size: 0.12,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      this.sparkPoints = new THREE.Points(this.sparkGeo, this.sparkMat);
      this.sparkPoints.visible = false;
      scene.add(this.sparkPoints);
      this.sparkLife = 0;

      // Scratch arrays for zero-GC updates
      this._centers = Array.from({ length: this.segments + 1 }, () => new THREE.Vector3());
      this._snapCenters = Array.from({ length: 29 }, () => new THREE.Vector3());
      this._up = new THREE.Vector3(0, 0, 1);
      this._tangent = new THREE.Vector3();
      this._normal = new THREE.Vector3();
      this._binormal = new THREE.Vector3();
      this._cNormal = new THREE.Color(0xf2aa35);
      this._cWarn = new THREE.Color(0xff5e1a);
      this._cLimit = new THREE.Color(0xff2644);

      this.updateIntact(this.CFG.REST_BOTTOM_Y, 0, 0, 0);
    }

    _allocateTubeGeometry(segs, radSegs, closed) {
      const ringCount = segs + 1;
      const vertCount = ringCount * (radSegs + 1);
      const positions = new Float32Array(vertCount * 3);
      const normals = new Float32Array(vertCount * 3);
      const indices = [];

      for (let i = 0; i < segs; i++) {
        for (let j = 0; j < radSegs; j++) {
          const a = i * (radSegs + 1) + j;
          const b = (i + 1) * (radSegs + 1) + j;
          const c = (i + 1) * (radSegs + 1) + (j + 1);
          const d = i * (radSegs + 1) + (j + 1);
          indices.push(a, b, d);
          indices.push(b, c, d);
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
      geo.setIndex(indices);
      geo.userData = { segs, radSegs, closed };
      return geo;
    }

    _writeTubeFromCenters(geo, centers, radius) {
      const { segs, radSegs } = geo.userData;
      const posArr = geo.attributes.position.array;
      const normArr = geo.attributes.normal.array;

      for (let i = 0; i <= segs; i++) {
        const prev = centers[Math.max(0, i - 1)];
        const next = centers[Math.min(segs, i + 1)];
        this._tangent.subVectors(next, prev).normalize();

        // Robust reference normal in Z or X
        if (Math.abs(this._tangent.z) < 0.9) {
          this._up.set(0, 0, 1);
        } else {
          this._up.set(1, 0, 0);
        }
        this._normal.crossVectors(this._tangent, this._up).normalize();
        this._binormal.crossVectors(this._tangent, this._normal).normalize();

        for (let j = 0; j <= radSegs; j++) {
          const theta = (j / radSegs) * Math.PI * 2;
          const cosT = Math.cos(theta);
          const sinT = Math.sin(theta);

          const nx = this._normal.x * cosT + this._binormal.x * sinT;
          const ny = this._normal.y * cosT + this._binormal.y * sinT;
          const nz = this._normal.z * cosT + this._binormal.z * sinT;

          const vIdx = (i * (radSegs + 1) + j) * 3;
          posArr[vIdx] = centers[i].x + nx * radius;
          posArr[vIdx + 1] = centers[i].y + ny * radius;
          posArr[vIdx + 2] = centers[i].z + nz * radius;

          normArr[vIdx] = nx;
          normArr[vIdx + 1] = ny;
          normArr[vIdx + 2] = nz;
        }
      }

      geo.attributes.position.needsUpdate = true;
      geo.attributes.normal.needsUpdate = true;
      geo.computeBoundingSphere();
    }

    updateIntact(botY, vibAmp, vibPhase, tensionRatio) {
      this.loopMesh.visible = true;
      this.upperMesh.visible = false;
      this.lowerMesh.visible = false;

      const topY = this.CFG.TOP_HOOK_Y;
      const span = Math.max(0.5, topY - botY);
      const stretchRatio = span / this.CFG.BAND_REST_LEN;

      // Poisson thinning: elastomer narrows as it stretches
      const tubeRadius = 0.036 / Math.sqrt(Math.max(0.85, stretchRatio));
      // Loop width slightly narrows under heavy tension
      const halfWidth = Math.max(0.055, 0.095 - Math.min(0.035, (stretchRatio - 1) * 0.018));
      const capR = halfWidth;
      const straightLen = Math.max(0.1, span - capR * 2);
      const topCenterY = topY - capR;
      const botCenterY = botY + capR;

      const N = this.segments;
      for (let i = 0; i <= N; i++) {
        const u = (i / N) * 4.0; // 4 quarters around stadium loop
        let x = 0;
        let y = 0;
        let strandFactor = 0;

        if (u < 1.0) {
          // Right descending strand
          const t = u;
          y = topCenterY - t * straightLen;
          strandFactor = Math.sin(Math.PI * t);
          x = halfWidth + vibAmp * strandFactor * Math.sin(vibPhase);
        } else if (u < 2.0) {
          // Bottom semicircle around bottom hook pin
          const a = (u - 1.0) * Math.PI;
          x = Math.cos(a) * halfWidth;
          y = botCenterY - Math.sin(a) * capR;
        } else if (u < 3.0) {
          // Left ascending strand
          const t = u - 2.0;
          y = botCenterY + t * straightLen;
          strandFactor = Math.sin(Math.PI * t);
          x = -halfWidth - vibAmp * strandFactor * Math.sin(vibPhase);
        } else {
          // Top semicircle around top hook pin
          const a = (u - 3.0) * Math.PI;
          x = -Math.cos(a) * halfWidth;
          y = topCenterY + Math.sin(a) * capR;
        }

        this._centers[i].set(x, y, 0);
      }

      this._writeTubeFromCenters(this.geometry, this._centers, tubeRadius);

      // Material color shifts smoothly toward warm orange-red near elastic limit
      if (tensionRatio <= 0.75) {
        this.material.color.copy(this._cNormal).lerp(this._cWarn, tensionRatio / 0.75);
        this.material.emissive.setHex(0x281100);
        this.material.emissiveIntensity = 0.25 + tensionRatio * 0.4;
      } else {
        const t = Math.min(1, (tensionRatio - 0.75) / 0.25);
        this.material.color.copy(this._cWarn).lerp(this._cLimit, t);
        this.material.emissive.setHex(0x881118);
        this.material.emissiveIntensity = 0.55 + t * 0.65;
      }
    }

    triggerSnapBurst(midY) {
      this.loopMesh.visible = false;
      this.upperMesh.visible = true;
      this.lowerMesh.visible = true;

      const arr = this.sparkGeo.attributes.position.array;
      for (let i = 0; i < this.sparkCount; i++) {
        arr[i * 3] = (Math.random() - 0.5) * 0.14;
        arr[i * 3 + 1] = midY + (Math.random() - 0.5) * 0.2;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 0.14;
        const ang = Math.random() * Math.PI * 2;
        const spd = 1.6 + Math.random() * 3.2;
        this.sparkVel[i].set(
          Math.cos(ang) * spd,
          (Math.random() - 0.25) * 3.8,
          Math.sin(ang) * spd
        );
      }
      this.sparkGeo.attributes.position.needsUpdate = true;
      this.sparkMat.opacity = 1.0;
      this.sparkPoints.visible = true;
      this.sparkLife = 1.0;
    }

    updateSnapped(dt, snapAge, cupHookWorldPos) {
      // Upper strand recoils and whips below top hook
      const topY = this.CFG.TOP_HOOK_Y;
      const segs = 28;
      const whipDecay = Math.exp(-snapAge * 3.2);
      const upperLen = 1.15;
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const swayX =
          Math.sin(t * 4.2 - snapAge * 22.0) * 0.38 * whipDecay * t +
          Math.sin(snapAge * 4.0 + t * 2.0) * 0.03 * t;
        const swayZ = Math.cos(t * 3.5 - snapAge * 19.0) * 0.24 * whipDecay * t;
        const recoilY = topY - t * upperLen * (1 - 0.35 * whipDecay);
        this._snapCenters[i].set(swayX, recoilY, swayZ);
      }
      this._writeTubeFromCenters(this.upperGeo, this._snapCenters, 0.032);

      // Lower strand trails upward from falling cup hook
      const lowerLen = 0.95;
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const curlX = Math.sin(t * 3.8 + snapAge * 16.0) * 0.28 * whipDecay * t;
        const curlZ = Math.cos(t * 3.1 + snapAge * 14.0) * 0.22 * whipDecay * t;
        this._snapCenters[i].set(
          cupHookWorldPos.x + curlX,
          cupHookWorldPos.y + t * lowerLen * (0.45 + 0.55 * (1 - whipDecay)),
          cupHookWorldPos.z + curlZ
        );
      }
      this._writeTubeFromCenters(this.lowerGeo, this._snapCenters, 0.032);

      // Update Snap Sparks
      if (this.sparkLife > 0) {
        this.sparkLife = Math.max(0, this.sparkLife - dt * 1.35);
        const arr = this.sparkGeo.attributes.position.array;
        for (let i = 0; i < this.sparkCount; i++) {
          this.sparkVel[i].y -= 9.8 * dt;
          arr[i * 3] += this.sparkVel[i].x * dt;
          arr[i * 3 + 1] = Math.max(0.03, arr[i * 3 + 1] + this.sparkVel[i].y * dt);
          arr[i * 3 + 2] += this.sparkVel[i].z * dt;
        }
        this.sparkGeo.attributes.position.needsUpdate = true;
        this.sparkMat.opacity = this.sparkLife;
        if (this.sparkLife <= 0) {
          this.sparkPoints.visible = false;
        }
      }
    }
  }

  /**
   * Builds the 3D translucent laboratory plastic cup + 3-wire suspension harness
   * + local paperclip container group.
   * Local origin (0,0,0) sits at the bottom center of the cup!
   */
  function buildCupAssembly(scene) {
    const CFG = HookeLab.CONFIG;
    const cupGroup = new THREE.Group();
    const cupH = CFG.CUP_HEIGHT; // 1.25
    const botR = 0.44;
    const topR = 0.60;

    // 1. Cup Body via LatheGeometry (with realistic wall thickness & rolled rim)
    const pts = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(botR, 0.0),
      new THREE.Vector2(topR, cupH - 0.04),
      new THREE.Vector2(topR + 0.045, cupH),
      new THREE.Vector2(topR + 0.02, cupH + 0.02),
      new THREE.Vector2(topR - 0.035, cupH - 0.03),
      new THREE.Vector2(botR - 0.035, 0.06),
      new THREE.Vector2(0.0, 0.06)
    ];
    const cupGeo = new THREE.LatheGeometry(pts, 48);
    const cupMat = new THREE.MeshPhysicalMaterial({
      color: 0xd0f2ff,
      transparent: true,
      opacity: 0.36,
      roughness: 0.12,
      metalness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const cupMesh = new THREE.Mesh(cupGeo, cupMat);
    cupMesh.castShadow = true;
    cupMesh.renderOrder = 3;
    cupGroup.add(cupMesh);

    // Subtle etched graduation decal cylinder
    const decalGeo = new THREE.CylinderGeometry(topR * 0.985, botR * 1.01, cupH * 0.86, 40, 1, true);
    const decalMat = new THREE.MeshBasicMaterial({
      map: HookeLab.textures.createCupLabelTexture(),
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const decalMesh = new THREE.Mesh(decalGeo, decalMat);
    decalMesh.position.y = cupH * 0.5;
    decalMesh.renderOrder = 4;
    cupGroup.add(decalMesh);

    // Metallic Rim Ring + Weighted Base Ring (ensures ultra-crisp shadow & high-tech lab feel)
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xb7cde4,
      metalness: 0.9,
      roughness: 0.22
    });
    const rimRing = new THREE.Mesh(new THREE.TorusGeometry(topR + 0.01, 0.022, 12, 48), steelMat);
    rimRing.rotation.x = Math.PI / 2;
    rimRing.position.y = cupH;
    rimRing.castShadow = true;
    cupGroup.add(rimRing);

    const baseRing = new THREE.Mesh(new THREE.TorusGeometry(botR - 0.01, 0.024, 12, 48), steelMat);
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.y = 0.025;
    baseRing.castShadow = true;
    cupGroup.add(baseRing);

    // Solid Base Plate Disk inside cup floor for crisp floor shadow & clip resting surface
    const floorDisk = new THREE.Mesh(
      new THREE.CylinderGeometry(botR - 0.03, botR - 0.03, 0.055, 36),
      new THREE.MeshStandardMaterial({
        color: 0x162b4d,
        metalness: 0.55,
        roughness: 0.38
      })
    );
    floorDisk.position.y = 0.03;
    floorDisk.castShadow = true;
    floorDisk.receiveShadow = true;
    cupGroup.add(floorDisk);

    // 2. 3-Wire Suspension Harness converging at local y = CUP_HEIGHT + HARNESS_HEIGHT (2.20)
    const hookLocalY = cupH + CFG.HARNESS_HEIGHT;
    const lugAngles = [Math.PI * 0.15, Math.PI * 0.85, Math.PI * 1.5]; // wide front gap!
    const topAnchor = new THREE.Vector3(0, hookLocalY - 0.05, 0);

    lugAngles.forEach((ang) => {
      const lx = Math.cos(ang) * (topR + 0.01);
      const lz = Math.sin(ang) * (topR + 0.01);
      const lug = new THREE.Mesh(new THREE.SphereGeometry(0.034, 12, 12), steelMat);
      lug.position.set(lx, cupH + 0.01, lz);
      cupGroup.add(lug);

      const start = new THREE.Vector3(lx, cupH + 0.01, lz);
      const dist = start.distanceTo(topAnchor);
      const wire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.011, 0.011, dist, 8),
        steelMat
      );
      wire.position.copy(start).add(topAnchor).multiplyScalar(0.5);
      wire.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3().subVectors(topAnchor, start).normalize()
      );
      wire.castShadow = true;
      cupGroup.add(wire);
    });

    // Top Harness Collar + Hook Pin (interfaces directly with rubber band bottom)
    const hookCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.095, 0.13, 20),
      steelMat
    );
    hookCollar.position.set(0, hookLocalY - 0.05, 0);
    hookCollar.castShadow = true;
    cupGroup.add(hookCollar);

    const botHookPin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.036, 0.036, 0.22, 16),
      steelMat
    );
    botHookPin.rotation.x = Math.PI / 2;
    botHookPin.position.set(0, hookLocalY, 0);
    botHookPin.castShadow = true;
    cupGroup.add(botHookPin);

    // Local group holding resting paperclips inside the cup
    const clipContainer = new THREE.Group();
    cupGroup.add(clipContainer);

    cupGroup.position.y = CFG.REST_BOTTOM_Y - hookLocalY; // 4.20 at 0 clips
    scene.add(cupGroup);

    return {
      cupGroup,
      clipContainer,
      hookLocalY
    };
  }

  /**
   * Builds a shared, realistic bent-wire 3D Paperclip geometry + factory function.
   */
  let sharedClipGeo = null;
  function getPaperclipGeometry() {
    if (sharedClipGeo) return sharedClipGeo;
    const pts = [
      new THREE.Vector3(0.035, 0.0, -0.06),
      new THREE.Vector3(0.035, 0.0, 0.11),
      new THREE.Vector3(0.0, 0.0, 0.145),
      new THREE.Vector3(-0.042, 0.0, 0.11),
      new THREE.Vector3(-0.042, 0.0, -0.11),
      new THREE.Vector3(0.005, 0.0, -0.15),
      new THREE.Vector3(0.055, 0.0, -0.11),
      new THREE.Vector3(0.055, 0.0, 0.125),
      new THREE.Vector3(0.005, 0.0, 0.165),
      new THREE.Vector3(-0.058, 0.0, 0.125),
      new THREE.Vector3(-0.058, 0.0, -0.09)
    ];
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.35);
    sharedClipGeo = new THREE.TubeGeometry(curve, 64, 0.013, 8, false);
    sharedClipGeo.scale(1.15, 1.15, 1.15);
    return sharedClipGeo;
  }

  const CLIP_COLORS = [0xdbe8f5, 0x99d9ff, 0xf5d48a, 0xc3d4f7];
  function createPaperclipMesh(index) {
    const color = CLIP_COLORS[index % CLIP_COLORS.length];
    const mat = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.92,
      roughness: 0.16
    });
    const mesh = new THREE.Mesh(getPaperclipGeometry(), mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  /**
   * Builds the glowing, semi-transparent 3D Ruler + Floor Telemetry Stand
   * + Sliding Holographic Laser Cursor & Glowing Real-Time Digital HUD Numbers.
   */
  function buildRulerAssembly(scene) {
    const CFG = HookeLab.CONFIG;
    const rulerGroup = new THREE.Group();

    const rulerCenterY = 4.15;
    const rulerHeight = 5.4;
    const rulerTopY = rulerCenterY + rulerHeight / 2; // 6.85
    const rulerWidth = 0.80;
    const rx = CFG.RULER_X; // 1.32

    // Floor Base & Telescoping Column supporting the 3D ruler
    const standMat = new THREE.MeshStandardMaterial({
      color: 0x1b2740,
      metalness: 0.85,
      roughness: 0.3
    });
    const standBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.36, 0.16, 24),
      standMat
    );
    standBase.position.set(rx, 0.08, 0);
    standBase.castShadow = true;
    standBase.receiveShadow = true;
    rulerGroup.add(standBase);

    const standPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.075, 1.42, 16),
      standMat
    );
    standPost.position.set(rx, 0.78, 0);
    standPost.castShadow = true;
    rulerGroup.add(standPost);

    // Glowing Semi-Transparent Holographic Glass Ruler Plate
    const rulerTex = HookeLab.textures.createRulerScaleTexture(rulerTopY, rulerHeight);
    const rulerMat = new THREE.MeshPhysicalMaterial({
      map: rulerTex,
      emissiveMap: rulerTex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.42,
      transparent: true,
      opacity: 0.92,
      roughness: 0.15,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    const rulerPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(rulerWidth, rulerHeight),
      rulerMat
    );
    rulerPlate.position.set(rx, rulerCenterY, 0);
    rulerGroup.add(rulerPlate);

    // Sleek Metallic Edge Rails around Ruler
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x3b537a,
      metalness: 0.88,
      roughness: 0.25
    });
    [-rulerWidth / 2 - 0.03, rulerWidth / 2 + 0.03].forEach((ox) => {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, rulerHeight + 0.08, 0.06),
        railMat
      );
      rail.position.set(rx + ox, rulerCenterY, 0);
      rail.castShadow = true;
      rulerGroup.add(rail);
    });

    // Sliding Holographic Laser Cursor Group (moves vertically with bandBottomY)
    const cursorGroup = new THREE.Group();
    cursorGroup.position.set(0, CFG.REST_BOTTOM_Y, 0);

    // Laser Alignment Beam connecting Rubber Band bottom collar (x=0.12) to Ruler edge (rx - rulerWidth/2)
    const beamStart = 0.12;
    const beamEnd = rx - rulerWidth / 2;
    const beamLen = beamEnd - beamStart;
    const laserMat = new THREE.MeshBasicMaterial({
      color: 0x22e6ff,
      transparent: true,
      opacity: 0.88
    });
    const laserBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, beamLen, 8),
      laserMat
    );
    laserBeam.rotation.z = Math.PI / 2;
    laserBeam.position.set((beamStart + beamEnd) * 0.5, 0, 0.015);
    cursorGroup.add(laserBeam);

    // Glowing Alignment Dot at Band Collar
    const collarDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 12, 12),
      laserMat
    );
    collarDot.position.set(beamStart, 0, 0.015);
    cursorGroup.add(collarDot);

    // Ruler Edge Pointer Arrow
    const pointerMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.055, 0.13, 4),
      laserMat
    );
    pointerMesh.rotation.z = -Math.PI / 2;
    pointerMesh.position.set(beamEnd - 0.03, 0, 0.02);
    cursorGroup.add(pointerMesh);

    // Real-time Glowing Digital HUD Readout Panel attached to right side of ruler
    const digitalHud = new HookeLab.textures.DigitalHudTexture();
    const hudPlaneMat = new THREE.MeshBasicMaterial({
      map: digitalHud.texture,
      transparent: true,
      side: THREE.DoubleSide
    });
    const hudPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.22, 0.61),
      hudPlaneMat
    );
    hudPlane.position.set(rx + rulerWidth / 2 + 0.67, 0, 0.08);
    cursorGroup.add(hudPlane);

    rulerGroup.add(cursorGroup);
    scene.add(rulerGroup);

    return {
      cursorGroup,
      laserBeam,
      collarDot,
      laserMat,
      digitalHud,
      setLaserVisible(visible) {
        laserBeam.visible = visible;
        collarDot.visible = visible;
      },
      update(bandBottomY, extCm, clipCount, mode) {
        cursorGroup.position.y = Math.max(1.6, Math.min(6.75, bandBottomY));
        digitalHud.update(extCm, clipCount, mode);
        if (mode === 'snapped') {
          laserMat.color.setHex(0xff3355);
        } else if (mode === 'warning') {
          laserMat.color.setHex(0xffb020);
        } else {
          laserMat.color.setHex(0x22e6ff);
        }
      }
    };
  }

  HookeLab.models = {
    buildLabEnvironment,
    buildGantry,
    RubberBand3D,
    buildCupAssembly,
    createPaperclipMesh,
    buildRulerAssembly
  };
})(window);
