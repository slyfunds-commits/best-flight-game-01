// input.js — keyboard and mouse for Last Light Mail.
// W/S throttle, A/D bank, arrows pitch, F flaps, C camera, P pause, M mute.

export function createInput() {
  const keys = {};
  const pressed = {}; // edge-triggered, consumed by the game loop

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    if (!keys[e.key.toLowerCase()]) pressed[e.key.toLowerCase()] = true;
    keys[e.key.toLowerCase()] = true;
  });
  window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });
  window.addEventListener('blur', () => {
    for (const k of Object.keys(keys)) keys[k] = false;
  });

  function axis(neg, pos) {
    return (keys[pos] ? 1 : 0) - (keys[neg] ? 1 : 0);
  }

  return {
    // -1..1 aileron (bank), -1..1 elevator (pitch), throttle delta per second.
    read(dt) {
      const out = {
        aileron: axis('a', 'd') + axis('arrowleft', 'arrowright') * 0.7,
        elevator: axis('arrowdown', 'arrowup') * 0.8,
        throttleDelta: axis('s', 'w') * 0.55,
        flaps: !!keys['f'],
      };
      out.aileron = Math.max(-1, Math.min(1, out.aileron));
      out.elevator = Math.max(-1, Math.min(1, out.elevator));
      return out;
    },
    // True once per key press.
    wasPressed(key) {
      const v = !!pressed[key.toLowerCase()];
      pressed[key.toLowerCase()] = false;
      return v;
    },
    isDown(key) {
      return !!keys[key.toLowerCase()];
    },
  };
}
