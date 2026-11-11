(function (global) {
  'use strict';

  const HookeLab = (global.HookeLab = global.HookeLab || {});

  class HologramGraph3D {
    constructor(canvas, container, readoutEl) {
      this.canvas = canvas;
      this.container = container;
      this.readoutEl = readoutEl;
      this.CFG = HookeLab.CONFIG;

      this.maxXCm = 14.0;
      this.maxForceN = 0.46;
      this.plotW = 3.2;
      this.plotH = 2.05;

      this.targetClips = 0;
      this.animClips = 0;
      this.isSnapped = false;
      this.hoverX = 0;
      this.hoverY = 0;

      this._initThree();
      this._buildAxesAndGrid();
      this._initDynamicPlot();
      this._bindEvents();
      this.resize();
    }

    _initThree() {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.outputEncoding = THREE.sRGBEncoding;

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(36, 1.5, 0.1, 30);
      this.camera.position.set(0.15, 0.4, 5.15);
      this.camera.lookAt(0, 0, 0);

      const amb = new THREE.AmbientLight(0xcfe8ff, 0.9);
      this.scene.add(amb);
      const dir = new THREE.DirectionalLight(0x44e6ff, 1.4);
      dir.position.set(3, 5, 4);
      this.scene.add(dir);

      this.stageGroup = new THREE.Group();
      // Center plot around origin
      this.plotOffset = new THREE.Vector3(-this.plotW * 0.5, -this.plotH * 0.48, 0);
      this.scene.add(this.stageGroup);
    }

    _toPlotCoords(extCm, forceN, z = 0) {
      const nx = Math.min(1.04, extCm / this.maxXCm);
      const ny = Math.min(1.04, forceN / this.maxForceN);
      return new THREE.Vector3(
        this.plotOffset.x + nx * this.plotW,
        this.plotOffset.y + ny * this.plotH,
        z
      );
    }

    _buildAxesAndGrid() {
      const ox = this.plotOffset.x;
      const oy = this.plotOffset.y;
      const w = this.plotW;
      const h = this.plotH;

      // Back holographic 3D grid lines
      const gridPts = [];
      const xDivs = 7;
      for (let i = 0; i <= xDivs; i++) {
        const x = ox + (i / xDivs) * w;
        gridPts.push(new THREE.Vector3(x, oy, -0.06), new THREE.Vector3(x, oy + h, -0.06));
        // Base depth floor tick
        gridPts.push(new THREE.Vector3(x, oy, -0.06), new THREE.Vector3(x, oy, 0.24));
      }
      const yDivs = 5;
      for (let j = 0; j <= yDivs; j++) {
        const y = oy + (j / yDivs) * h;
        gridPts.push(new THREE.Vector3(ox, y, -0.06), new THREE.Vector3(ox + w, y, -0.06));
      }

      const gridGeo = new THREE.BufferGeometry().setFromPoints(gridPts);
      const gridMat = new THREE.LineBasicMaterial({
        color: 0x22e6ff,
        transparent: true,
        opacity: 0.22
      });
      this.stageGroup.add(new THREE.LineSegments(gridGeo, gridMat));

      // Extruded 3D X-Axis (Extension)
      const axisMatX = new THREE.MeshBasicMaterial({ color: 0x22e6ff });
      const xAxis = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, w + 0.14, 10), axisMatX);
      xAxis.rotation.z = Math.PI / 2;
      xAxis.position.set(ox + (w + 0.14) * 0.5, oy, 0);
      this.stageGroup.add(xAxis);

      const xCone = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.14, 12), axisMatX);
      xCone.rotation.z = -Math.PI / 2;
      xCone.position.set(ox + w + 0.18, oy, 0);
      this.stageGroup.add(xCone);

      // Extruded 3D Y-Axis (Force)
      const axisMatY = new THREE.MeshBasicMaterial({ color: 0x7b9cff });
      const yAxis = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, h + 0.12, 10), axisMatY);
      yAxis.position.set(ox, oy + (h + 0.12) * 0.5, 0);
      this.stageGroup.add(yAxis);

      const yCone = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.14, 12), axisMatY);
      yCone.position.set(ox, oy + h + 0.16, 0);
      this.stageGroup.add(yCone);

      // Elastic Limit Vertical Reference Marker at 12.0 cm (8 clips)
      const limX = this._toPlotCoords(12.0, 0).x;
      const limPts = [
        new THREE.Vector3(limX, oy, 0.02),
        new THREE.Vector3(limX, oy + h, 0.02)
      ];
      const limLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(limPts),
        new THREE.LineDashedMaterial({
          color: 0xffb020,
          dashSize: 0.09,
          gapSize: 0.06,
          transparent: true,
          opacity: 0.85
        })
      );
      limLine.computeLineDistances();
      this.stageGroup.add(limLine);

      // Subtle glowing base reflection plane under plot
      const floorPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(w + 0.2, 0.42),
        new THREE.MeshBasicMaterial({
          color: 0x104478,
          transparent: true,
          opacity: 0.25,
          side: THREE.DoubleSide
        })
      );
      floorPlane.rotation.x = -Math.PI / 2;
      floorPlane.position.set(ox + w * 0.5, oy - 0.005, 0.08);
      this.stageGroup.add(floorPlane);
    }

    _initDynamicPlot() {
      this.plotGroup = new THREE.Group();
      this.stageGroup.add(this.plotGroup);

      this.lineMat = new THREE.MeshStandardMaterial({
        color: 0x22e6ff,
        emissive: 0x14d4ff,
        emissiveIntensity: 0.95,
        roughness: 0.2
      });
      this.breakMat = new THREE.MeshStandardMaterial({
        color: 0xff3355,
        emissive: 0xff1133,
        emissiveIntensity: 1.0,
        roughness: 0.25
      });

      this.nodeGeo = new THREE.SphereGeometry(0.056, 16, 16);
      this.haloGeo = new THREE.RingGeometry(0.072, 0.098, 24);
      this.nodeMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x22e6ff,
        emissiveIntensity: 1.2
      });
      this.limitNodeMat = new THREE.MeshStandardMaterial({
        color: 0xffd27d,
        emissive: 0xffb020,
        emissiveIntensity: 1.2
      });
      this.snapNodeMat = new THREE.MeshStandardMaterial({
        color: 0xff9eb0,
        emissive: 0xff3355,
        emissiveIntensity: 1.3
      });
      this.haloMatCyan = new THREE.MeshBasicMaterial({
        color: 0x22e6ff,
        side: THREE.DoubleSide
      });
      this.haloMatAmber = new THREE.MeshBasicMaterial({
        color: 0xffb020,
        side: THREE.DoubleSide
      });

      this.lineMesh = null;
      this.breakMesh = null;
      this.nodeMeshes = [];
      this._lastDrawnKey = '';

      this._rebuildGeometry();
    }

    _bindEvents() {
      this.container.addEventListener('pointermove', (e) => {
        const rect = this.container.getBoundingClientRect();
        this.hoverX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        this.hoverY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      });
      this.container.addEventListener('pointerleave', () => {
        this.hoverX = 0;
        this.hoverY = 0;
      });

      if (global.ResizeObserver) {
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.container);
      }
    }

    resize() {
      const w = Math.max(200, this.container.clientWidth);
      const h = Math.max(150, this.container.clientHeight);
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }

    setState(clips, isSnapped) {
      this.targetClips = clips;
      this.isSnapped = isSnapped;

      if (this.readoutEl) {
        if (isSnapped) {
          this.readoutEl.textContent = 'ELASTIC BREAK (>12.0 cm)';
          this.readoutEl.style.color = '#ff7b93';
          this.readoutEl.style.borderColor = 'rgba(255,51,85,0.5)';
        } else {
          const ext = (clips * this.CFG.EXT_PER_CLIP_CM).toFixed(1);
          const fN = (clips * this.CFG.FORCE_PER_CLIP_N).toFixed(3);
          this.readoutEl.textContent =
            clips === 0 ? 'Origin: (0.0 cm, 0.000 N)' : `Point: (${ext} cm, ${fN} N)`;
          this.readoutEl.style.color = clips >= 7 ? '#ffb020' : '#22e6ff';
          this.readoutEl.style.borderColor =
            clips >= 7 ? 'rgba(255,176,32,0.45)' : 'rgba(34,230,255,0.28)';
        }
      }
    }

    _rebuildGeometry() {
      const safeAnim = Math.min(this.CFG.MAX_SAFE_CLIPS, this.animClips);
      const key = `${safeAnim.toFixed(3)}|${this.isSnapped}`;
      if (key === this._lastDrawnKey) return;
      this._lastDrawnKey = key;

      // Dispose previous dynamic line & nodes
      if (this.lineMesh) {
        this.plotGroup.remove(this.lineMesh);
        this.lineMesh.geometry.dispose();
        this.lineMesh = null;
      }
      if (this.breakMesh) {
        this.plotGroup.remove(this.breakMesh);
        this.breakMesh.geometry.dispose();
        this.breakMesh = null;
      }
      this.nodeMeshes.forEach((m) => this.plotGroup.remove(m));
      this.nodeMeshes = [];

      // Always draw origin node
      const originPos = this._toPlotCoords(0, 0, 0.06);
      const originSphere = new THREE.Mesh(this.nodeGeo, this.nodeMat);
      originSphere.position.copy(originPos);
      this.plotGroup.add(originSphere);
      this.nodeMeshes.push(originSphere);

      const wholeClips = Math.floor(safeAnim);
      const pts = [originPos];

      for (let i = 1; i <= wholeClips; i++) {
        const p = this._toPlotCoords(
          i * this.CFG.EXT_PER_CLIP_CM,
          i * this.CFG.FORCE_PER_CLIP_N,
          0.06
        );
        pts.push(p);

        const mat = i >= 7 ? this.limitNodeMat : this.nodeMat;
        const sphere = new THREE.Mesh(this.nodeGeo, mat);
        sphere.position.copy(p);
        this.plotGroup.add(sphere);
        this.nodeMeshes.push(sphere);

        // Glowing halo around latest safe node
        if (i === wholeClips && !this.isSnapped) {
          const halo = new THREE.Mesh(
            this.haloGeo,
            i >= 7 ? this.haloMatAmber : this.haloMatCyan
          );
          halo.position.copy(p);
          this.plotGroup.add(halo);
          this.nodeMeshes.push(halo);
        }
      }

      // Fractional leading edge for smooth animation
      if (safeAnim > wholeClips) {
        const fracExt = safeAnim * this.CFG.EXT_PER_CLIP_CM;
        const fracForce = safeAnim * this.CFG.FORCE_PER_CLIP_N;
        pts.push(this._toPlotCoords(fracExt, fracForce, 0.06));
      }

      if (pts.length >= 2) {
        const curve = new THREE.CatmullRomCurve3(pts);
        const tubeGeo = new THREE.TubeGeometry(curve, Math.max(12, pts.length * 8), 0.025, 8, false);
        this.lineMesh = new THREE.Mesh(tubeGeo, this.lineMat);
        this.plotGroup.add(this.lineMesh);
      }

      // Snapped drop-off branch beyond elastic limit
      if (this.isSnapped) {
        const pLimit = this._toPlotCoords(
          8 * this.CFG.EXT_PER_CLIP_CM,
          8 * this.CFG.FORCE_PER_CLIP_N,
          0.06
        );
        const pBreakPeak = this._toPlotCoords(12.8, 0.42, 0.06);
        const pCrash = this._toPlotCoords(13.2, 0.04, 0.06);
        const breakCurve = new THREE.CatmullRomCurve3([pLimit, pBreakPeak, pCrash]);
        this.breakMesh = new THREE.Mesh(
          new THREE.TubeGeometry(breakCurve, 18, 0.024, 8, false),
          this.breakMat
        );
        this.plotGroup.add(this.breakMesh);

        const snapSphere = new THREE.Mesh(this.nodeGeo, this.snapNodeMat);
        snapSphere.position.copy(pBreakPeak);
        this.plotGroup.add(snapSphere);
        this.nodeMeshes.push(snapSphere);
      }
    }

    update(dt, elapsed) {
      // Smoothly animate plot growth toward targetClips
      const speed = 4.5;
      if (Math.abs(this.targetClips - this.animClips) > 0.005) {
        this.animClips += (this.targetClips - this.animClips) * Math.min(1, dt * speed);
      } else {
        this.animClips = this.targetClips;
      }

      this._rebuildGeometry();

      // Gentle 3D holographic floating rotation + responsive pointer parallax
      const targetRotY = 0.24 + Math.sin(elapsed * 0.85) * 0.1 + this.hoverX * 0.22;
      const targetRotX = -0.16 + Math.cos(elapsed * 0.7) * 0.04 - this.hoverY * 0.14;
      this.stageGroup.rotation.y += (targetRotY - this.stageGroup.rotation.y) * Math.min(1, dt * 6);
      this.stageGroup.rotation.x += (targetRotX - this.stageGroup.rotation.x) * Math.min(1, dt * 6);

      this.renderer.render(this.scene, this.camera);
    }
  }

  HookeLab.HologramGraph3D = HologramGraph3D;
})(window);
