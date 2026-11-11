(function (global) {
  'use strict';

  const HookeLab = (global.HookeLab = global.HookeLab || {});

  class SoundEngine {
    constructor() {
      this.enabled = true;
      this.ctx = null;
    }

    ensureContext() {
      if (!this.enabled) return null;
      try {
        if (!this.ctx) {
          const AudioCtx = global.AudioContext || global.webkitAudioContext;
          if (!AudioCtx) return null;
          this.ctx = new AudioCtx();
        }
        if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
        return this.ctx;
      } catch (e) {
        return null;
      }
    }

    setEnabled(val) {
      this.enabled = Boolean(val);
    }

    playDropPulse() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(760, now);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    }

    playClipClink(tensionRatio) {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Metallic clink
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const baseFreq = 1480 + Math.random() * 240;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(920, now + 0.09);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.11);

      // Subtle rubber twang pitch scaled by tension
      const twang = ctx.createOscillator();
      const tGain = ctx.createGain();
      twang.type = 'sine';
      const f = 110 + tensionRatio * 145;
      twang.frequency.setValueAtTime(f, now);
      twang.frequency.exponentialRampToValueAtTime(f * 0.85, now + 0.24);
      tGain.gain.setValueAtTime(0.07, now);
      tGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      twang.connect(tGain);
      tGain.connect(ctx.destination);
      twang.start(now);
      twang.stop(now + 0.26);
    }

    playSnap() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Sharp elastic snap transient using filtered white noise
      const bufferSize = Math.floor(ctx.sampleRate * 0.22);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.035));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.Q.setValueAtTime(1.2, now);

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.32, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(ctx.destination);
      noise.start(now);

      // Recoil whip sweep
      const whip = ctx.createOscillator();
      const wGain = ctx.createGain();
      whip.type = 'sawtooth';
      whip.frequency.setValueAtTime(520, now);
      whip.frequency.exponentialRampToValueAtTime(85, now + 0.28);
      wGain.gain.setValueAtTime(0.14, now);
      wGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      whip.connect(wGain);
      wGain.connect(ctx.destination);
      whip.start(now);
      whip.stop(now + 0.31);
    }

    playFloorCrash() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(135, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.18);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.21);
    }

    playQuizChime(isCorrect) {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const freqs = isCorrect ? [523.25, 659.25, 783.99] : [310, 230];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const t = now + idx * 0.08;
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.09, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.21);
      });
    }
  }

  HookeLab.audio = new SoundEngine();
})(window);
