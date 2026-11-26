// audio.js — WebAudio synth only for Last Light Mail. No sound files: the
// engine is an oscillator through a low-pass filter, the wind is filtered
// noise, and the chimes are two sine notes. Mute with M.

export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let windSrc = null;
  let windGain = null;
  let muted = false;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    // Engine drone: sawtooth + low-pass, pitch follows throttle.
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 320;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(lp);
    lp.connect(engineGain);
    engineGain.connect(ctx.destination);
    engineOsc.start();
    // Wind: looping noise buffer through a band-pass.
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    windSrc = ctx.createBufferSource();
    windSrc.buffer = buf;
    windSrc.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 480;
    bp.Q.value = 0.6;
    windGain = ctx.createGain();
    windGain.gain.value = 0;
    windSrc.connect(bp);
    bp.connect(windGain);
    windGain.connect(ctx.destination);
    windSrc.start();
    return ctx;
  }

  function tone(freq, at, dur, vol, type) {
    if (!ctx || muted) return;
    const o = ctx.createOscillator();
    o.type = type || 'sine';
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime + at);
    g.gain.linearRampToValueAtTime(vol, ctx.currentTime + at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + at + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(ctx.currentTime + at);
    o.stop(ctx.currentTime + at + dur + 0.05);
  }

  return {
    unlock() {
      const c = ensure();
      if (c && c.state === 'suspended') c.resume();
    },
    engine(throttle, speed) {
      if (!ctx || muted) return;
      ensure();
      const t = ctx.currentTime;
      engineGain.gain.setTargetAtTime(0.05 + throttle * 0.1, t, 0.1);
      engineOsc.frequency.setTargetAtTime(48 + throttle * 62 + speed * 0.35, t, 0.1);
      windGain.gain.setTargetAtTime(Math.min(0.12, speed * 0.0016), t, 0.2);
    },
    ring() {
      tone(880, 0, 0.35, 0.16);
      tone(1318, 0.09, 0.5, 0.14);
    },
    thud() {
      tone(90, 0, 0.25, 0.3, 'triangle');
      tone(60, 0.05, 0.3, 0.22, 'sine');
    },
    stamp() {
      tone(220, 0, 0.12, 0.2, 'square');
      tone(330, 0.1, 0.2, 0.18, 'square');
    },
    click() {
      tone(660, 0, 0.06, 0.08, 'square');
    },
    toggleMute() {
      muted = !muted;
      if (ctx) {
        if (muted) {
          engineGain.gain.value = 0;
          windGain.gain.value = 0;
        }
      }
      return muted;
    },
    get muted() {
      return muted;
    },
  };
}
