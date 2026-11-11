(function (global) {
  'use strict';

  const HookeLab = (global.HookeLab = global.HookeLab || {});

  class PhysicsSimulation {
    constructor(scene, models) {
      this.scene = scene;
      this.models = models;
      this.CFG = HookeLab.CONFIG;

      this.committedClips = 0;
      this.currentExtCm = 0;
      this.velExtCm = 0;
      this.targetExtCm = 0;

      this.bandVibAmp = 0;
      this.bandVibPhase = 0;
      this.cupSwayX = 0;
      this.cupSwayZ = 0;

      this.isSnapped = false;
      this.snapAge = 0;
      this.cupFallVelY = 0;
      this.cupFloorBounced = false;
      this.cupTiltAngle = 0;
      this.cupTiltVel = 0;
      this.cupFallDirAngle = 0.55; // tips slightly forward-right for dramatic view

      this.fallingClips = [];
      this.restingClips = [];
      this.spilledClips = [];

      this.feederFlash = 0;

      this.onTelemetryChange = null;
      this.onSnapTriggered = null;
      this.onClipCommitted = null;
    }

    getMode() {
      if (this.isSnapped) return 'snapped';
      if (this.committedClips >= 7) return 'warning';
      return 'normal';
    }

    getPendingTotal() {
      return this.committedClips + this.fallingClips.filter((c) => !c.hasImpacted).length;
    }

    addPaperclip() {
      if (this.isSnapped) return false;
      if (this.getPendingTotal() >= 10) return false;

      const idx = this.committedClips + this.fallingClips.length;
      const mesh = this.models.createPaperclipMesh(idx);

      const cupPos = this.models.cupAssembly.cupGroup.position;
      const spawnX = (Math.random() - 0.5) * 0.22;
      const spawnY = Math.min(8.1, cupPos.y + this.CFG.CUP_HEIGHT + 1.55);
      const spawnZ = 0.16 + (Math.random() - 0.5) * 0.12;

      mesh.position.set(spawnX, spawnY, spawnZ);
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      this.scene.add(mesh);

      this.fallingClips.push({
        mesh,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -1.4,
        vz: (Math.random() - 0.5) * 0.12,
        rx: (Math.random() - 0.5) * 7,
        ry: (Math.random() - 0.5) * 7,
        rz: (Math.random() - 0.5) * 7,
        hasImpacted: false,
        bounces: 0,
        settled: false,
        pileIndex: idx
      });

      this.feederFlash = 1.0;
      this.models.gantry.feederHalo.position.set(spawnX, spawnY, spawnZ);
      HookeLab.audio.playDropPulse();
      return true;
    }

    removePaperclip() {
      if (this.isSnapped || this.committedClips <= 0) return false;

      this.committedClips -= 1;
      this.targetExtCm = this.committedClips * this.CFG.EXT_PER_CLIP_CM;
      this.velExtCm -= 9.5; // upward spring recoil on unloading
      this.bandVibAmp = 0.04;

      const last = this.restingClips.pop();
      if (last) {
        this.models.cupAssembly.clipContainer.remove(last);
        if (last.material) last.material.dispose();
      }

      HookeLab.audio.playDropPulse();
      if (this.onClipCommitted) {
        this.onClipCommitted(this.committedClips, true);
      }
      if (this.onTelemetryChange) {
        this.onTelemetryChange(this._buildTelemetry());
      }
      return true;
    }

    reset() {
      // Clean up falling clips
      this.fallingClips.forEach((c) => {
        this.scene.remove(c.mesh);
        if (c.mesh.material) c.mesh.material.dispose();
      });
      this.fallingClips = [];

      // Clean up resting clips
      this.restingClips.forEach((m) => {
        this.models.cupAssembly.clipContainer.remove(m);
        if (m.material) m.material.dispose();
      });
      this.restingClips = [];

      // Clean up spilled floor clips
      this.spilledClips.forEach((s) => {
        this.scene.remove(s.mesh);
        if (s.mesh.material) s.mesh.material.dispose();
      });
      this.spilledClips = [];

      this.committedClips = 0;
      this.currentExtCm = 0;
      this.velExtCm = 0;
      this.targetExtCm = 0;
      this.bandVibAmp = 0;
      this.bandVibPhase = 0;
      this.cupSwayX = 0;
      this.cupSwayZ = 0;

      this.isSnapped = false;
      this.snapAge = 0;
      this.cupFallVelY = 0;
      this.cupFloorBounced = false;
      this.cupTiltAngle = 0;
      this.cupTiltVel = 0;

      const { cupGroup, hookLocalY } = this.models.cupAssembly;
      cupGroup.position.set(0, this.CFG.REST_BOTTOM_Y - hookLocalY, 0);
      cupGroup.rotation.set(0, 0, 0);

      this.models.rubberBand.sparkPoints.visible = false;
      this.models.rubberBand.updateIntact(this.CFG.REST_BOTTOM_Y, 0, 0, 0);
      this.models.gantry.setStatusMode('normal');
      this.models.ruler.update(this.CFG.REST_BOTTOM_Y, 0, 0, 'normal');

      if (this.onTelemetryChange) {
        this.onTelemetryChange(this._buildTelemetry());
      }
    }

    _triggerSnap() {
      this.isSnapped = true;
      this.snapAge = 0;
      this.cupFallVelY = -1.6;
      this.cupFloorBounced = false;
      this.cupTiltAngle = 0;
      this.cupTiltVel = 0;

      const bandBotY = this.CFG.REST_BOTTOM_Y - this.currentExtCm * this.CFG.CM_TO_WORLD;
      const midY = (this.CFG.TOP_HOOK_Y + bandBotY) * 0.5;
      this.models.rubberBand.triggerSnapBurst(midY);

      const { cupGroup, hookLocalY } = this.models.cupAssembly;
      const hookLocalVec = new THREE.Vector3(0, hookLocalY, 0);
      cupGroup.updateMatrixWorld(true);
      hookLocalVec.applyMatrix4(cupGroup.matrixWorld);
      this.models.rubberBand.updateSnapped(0, 0, hookLocalVec);

      this.models.gantry.setStatusMode('snapped');
      HookeLab.audio.playSnap();

      // Convert any remaining airborne clips into spilled floor clips
      this.fallingClips.forEach((c) => {
        this.spilledClips.push({
          mesh: c.mesh,
          vx: (Math.random() - 0.5) * 1.4,
          vy: c.vy * 0.5,
          vz: 0.4 + Math.random() * 1.2,
          rx: c.rx,
          ry: c.ry,
          rz: c.rz,
          settled: false
        });
      });
      this.fallingClips = [];

      if (this.onSnapTriggered) {
        this.onSnapTriggered(this.committedClips);
      }
    }

    _spillClipsOnCrash() {
      const { cupGroup, clipContainer } = this.models.cupAssembly;
      cupGroup.updateMatrixWorld(true);

      // Eject clips outward onto the pedestal floor around the tipped cup
      while (this.restingClips.length > 0) {
        const mesh = this.restingClips.pop();
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        mesh.getWorldPosition(worldPos);
        mesh.getWorldQuaternion(worldQuat);

        clipContainer.remove(mesh);
        mesh.position.copy(worldPos);
        mesh.quaternion.copy(worldQuat);
        this.scene.add(mesh);

        const ang = (Math.random() - 0.5) * 2.4 + this.cupFallDirAngle;
        const speed = 1.1 + Math.random() * 1.9;
        this.spilledClips.push({
          mesh,
          vx: Math.sin(ang) * speed,
          vy: 1.4 + Math.random() * 1.8,
          vz: Math.cos(ang) * speed,
          rx: (Math.random() - 0.5) * 10,
          ry: (Math.random() - 0.5) * 10,
          rz: (Math.random() - 0.5) * 10,
          settled: false
        });
      }
    }

    _buildTelemetry() {
      const weightG = this.committedClips * this.CFG.CLIP_MASS_G;
      const forceN = this.committedClips * this.CFG.FORCE_PER_CLIP_N;
      return {
        clips: this.committedClips,
        weightG,
        forceN,
        extCm: this.currentExtCm,
        targetExtCm: this.targetExtCm,
        mode: this.getMode(),
        isSnapped: this.isSnapped
      };
    }

    update(dt, elapsed) {
      const { cupAssembly, rubberBand, gantry, ruler } = this.models;
      const { cupGroup, clipContainer, hookLocalY } = cupAssembly;

      // Feeder flash decay
      if (this.feederFlash > 0) {
        this.feederFlash = Math.max(0, this.feederFlash - dt * 3.5);
        gantry.feederMat.opacity = this.feederFlash * 0.85;
        const s = 1 + (1 - this.feederFlash) * 0.45;
        gantry.feederHalo.scale.set(s, s, 1);
      }

      if (!this.isSnapped) {
        // 1. Hooke's Law Damped Harmonic Oscillator
        const stiffness = 78.0;
        const damping = 6.2;
        const acc = stiffness * (this.targetExtCm - this.currentExtCm) - damping * this.velExtCm;
        this.velExtCm += acc * dt;
        this.currentExtCm = Math.max(0, this.currentExtCm + this.velExtCm * dt);

        const bandBottomY = this.CFG.REST_BOTTOM_Y - this.currentExtCm * this.CFG.CM_TO_WORLD;
        cupGroup.position.y = bandBottomY - hookLocalY;

        // Micro-sway decay on cup
        this.cupSwayX *= Math.exp(-3.5 * dt);
        this.cupSwayZ *= Math.exp(-3.5 * dt);
        cupGroup.rotation.set(
          Math.sin(elapsed * 5.2) * this.cupSwayX,
          0,
          Math.cos(elapsed * 4.7) * this.cupSwayZ
        );

        // Rubber band lateral vibration twang
        this.bandVibAmp *= Math.exp(-4.5 * dt);
        this.bandVibPhase += dt * 42.0;

        const tensionRatio = Math.min(1, this.currentExtCm / (this.CFG.MAX_SAFE_CLIPS * this.CFG.EXT_PER_CLIP_CM));
        rubberBand.updateIntact(bandBottomY, this.bandVibAmp, this.bandVibPhase, tensionRatio);

        const mode = this.getMode();
        gantry.setStatusMode(mode);
        ruler.update(bandBottomY, this.currentExtCm, this.committedClips, mode);

        // 2. Update Falling Paperclips
        for (let i = this.fallingClips.length - 1; i >= 0; i--) {
          const clip = this.fallingClips[i];
          clip.vy -= 17.5 * dt;
          clip.mesh.position.x += clip.vx * dt;
          clip.mesh.position.y += clip.vy * dt;
          clip.mesh.position.z += clip.vz * dt;

          clip.mesh.rotation.x += clip.rx * dt;
          clip.mesh.rotation.y += clip.ry * dt;
          clip.mesh.rotation.z += clip.rz * dt;

          // Keep inside cup cylinder once below cup rim
          const cupTopY = cupGroup.position.y + this.CFG.CUP_HEIGHT;
          if (clip.mesh.position.y < cupTopY) {
            const radial = Math.hypot(clip.mesh.position.x, clip.mesh.position.z);
            const maxR = 0.28;
            if (radial > maxR) {
              const s = maxR / radial;
              clip.mesh.position.x *= s;
              clip.mesh.position.z *= s;
              clip.vx *= -0.4;
              clip.vz *= -0.4;
            }
          }

          const pileY = cupGroup.position.y + 0.08 + Math.min(0.28, (clip.pileIndex % 8) * 0.028);
          if (clip.mesh.position.y <= pileY) {
            clip.mesh.position.y = pileY;

            if (!clip.hasImpacted) {
              clip.hasImpacted = true;
              this.committedClips += 1;
              this.targetExtCm = this.committedClips * this.CFG.EXT_PER_CLIP_CM;

              if (this.committedClips > this.CFG.MAX_SAFE_CLIPS) {
                // Elastic Limit Exceeded!
                this.scene.remove(clip.mesh);
                this.fallingClips.splice(i, 1);
                // Put the overload clip into resting list briefly so it spills with the rest!
                clip.mesh.position.set(0, 0.14, 0);
                clipContainer.add(clip.mesh);
                this.restingClips.push(clip.mesh);
                this._triggerSnap();
                break;
              } else {
                this.velExtCm += 14.5;
                this.bandVibAmp = 0.055;
                this.cupSwayX = 0.03;
                this.cupSwayZ = 0.025;
                HookeLab.audio.playClipClink(this.committedClips / this.CFG.MAX_SAFE_CLIPS);
                if (this.onClipCommitted) {
                  this.onClipCommitted(this.committedClips, false);
                }
              }
            }

            clip.bounces += 1;
            if (clip.bounces <= 2 && Math.abs(clip.vy) > 0.45) {
              clip.vy = Math.abs(clip.vy) * 0.35;
              clip.vx *= 0.5;
              clip.vz *= 0.5;
              clip.rx *= 0.4;
              clip.ry *= 0.4;
            } else {
              // Settle inside cupContainer in local coordinates
              const localX = clip.mesh.position.x;
              const localY = 0.075 + Math.floor(this.restingClips.length / 3) * 0.032 + Math.random() * 0.015;
              const localZ = clip.mesh.position.z;
              this.scene.remove(clip.mesh);
              clip.mesh.position.set(localX, localY, localZ);
              clip.mesh.rotation.set(
                (Math.random() - 0.5) * 0.25,
                Math.random() * Math.PI * 2,
                (Math.random() - 0.5) * 0.25
              );
              clipContainer.add(clip.mesh);
              this.restingClips.push(clip.mesh);
              this.fallingClips.splice(i, 1);
            }
          }
        }
      } else {
        // 3. Snapped State: Cup Freefall + Floor Tip + Spilled Paperclips
        this.snapAge += dt;

        // Cup falls onto pedestal (y = 0)
        if (!this.cupFloorBounced || cupGroup.position.y > 0.44 || Math.abs(this.cupFallVelY) > 0.05) {
          this.cupFallVelY -= 19.6 * dt;
          cupGroup.position.y += this.cupFallVelY * dt;

          // Determine minimum safe Y accounting for cup tilt on floor
          const minCupY = Math.max(0.0, 0.44 * Math.sin(this.cupTiltAngle));
          if (cupGroup.position.y <= minCupY) {
            cupGroup.position.y = minCupY;
            if (!this.cupFloorBounced) {
              this.cupFloorBounced = true;
              this.cupFallVelY = Math.abs(this.cupFallVelY) * 0.32;
              this.cupTiltVel = 4.6;
              HookeLab.audio.playFloorCrash();
              this._spillClipsOnCrash();
            } else {
              this.cupFallVelY = Math.abs(this.cupFallVelY) * 0.25;
              if (this.cupFallVelY < 0.25) this.cupFallVelY = 0;
            }
          }
        }

        // Cup tips sideways onto its conical side (resting cleanly at 82.7 deg)
        if (this.cupFloorBounced && this.cupTiltAngle < 1.44) {
          this.cupTiltVel += 8.5 * dt;
          this.cupTiltAngle = Math.min(1.44, this.cupTiltAngle + this.cupTiltVel * dt);
          cupGroup.position.y = Math.max(cupGroup.position.y, 0.44 * Math.sin(this.cupTiltAngle));
          cupGroup.rotation.set(
            Math.cos(this.cupFallDirAngle) * this.cupTiltAngle,
            0,
            -Math.sin(this.cupFallDirAngle) * this.cupTiltAngle
          );
        }

        // Compute cup top hook world position for trailing lower snapped rubber band
        const hookLocalVec = new THREE.Vector3(0, hookLocalY, 0);
        cupGroup.updateMatrixWorld(true);
        hookLocalVec.applyMatrix4(cupGroup.matrixWorld);
        rubberBand.updateSnapped(dt, this.snapAge, hookLocalVec);

        // Update spilled floor paperclips
        for (let i = 0; i < this.spilledClips.length; i++) {
          const s = this.spilledClips[i];
          if (s.settled) continue;
          s.vy -= 18.0 * dt;
          s.mesh.position.x += s.vx * dt;
          s.mesh.position.y += s.vy * dt;
          s.mesh.position.z += s.vz * dt;
          const rHoriz = Math.hypot(s.mesh.position.x, s.mesh.position.z);
          if (rHoriz > 3.45) {
            const sc = 3.45 / rHoriz;
            s.mesh.position.x *= sc;
            s.mesh.position.z *= sc;
            s.vx *= -0.4;
            s.vz *= -0.4;
          }
          s.mesh.rotation.x += s.rx * dt;
          s.mesh.rotation.y += s.ry * dt;
          s.mesh.rotation.z += s.rz * dt;

          if (s.mesh.position.y <= 0.022) {
            s.mesh.position.y = 0.022;
            if (Math.abs(s.vy) > 0.6) {
              s.vy = Math.abs(s.vy) * 0.35;
              s.vx *= 0.6;
              s.vz *= 0.6;
              s.rx *= 0.4;
              s.rz *= 0.4;
            } else {
              s.settled = true;
              s.mesh.rotation.x = 0;
              s.mesh.rotation.z = 0;
            }
          }
        }

        ruler.update(
          this.CFG.REST_BOTTOM_Y - 12.6 * this.CFG.CM_TO_WORLD,
          this.currentExtCm,
          this.committedClips,
          'snapped'
        );
      }

      if (this.onTelemetryChange) {
        this.onTelemetryChange(this._buildTelemetry());
      }
    }
  }

  HookeLab.PhysicsSimulation = PhysicsSimulation;
})(window);
