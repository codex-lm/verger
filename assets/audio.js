/*
 * Verger — mini-synthé WebAudio : cueillette, chute, panier plein.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.VergerAudio = factory(root);
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';
  var ctx = null, enabled = true;

  function ensure() {
    if (!ctx) {
      var AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, gain, when, slideTo) {
    if (!enabled) return;
    try {
      var c = ensure();
      if (!c) return;
      var t = c.currentTime + (when || 0);
      var o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain || 0.08, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + dur + 0.05);
    } catch (e) { /* silence */ }
  }

  return {
    setEnabled: function (v) { enabled = !!v; },
    isEnabled: function () { return enabled; },
    unlock: function () { ensure(); },
    pick: function (n) { tone(420 + n * 60, 0.08, 'triangle', 0.07); },
    swapFail: function () { tone(180, 0.1, 'sine', 0.05, 0, 140); },
    ui: function () { tone(700, 0.045, 'sine', 0.05); },
    win: function () { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 0.18, 'sine', 0.08, i * 0.09); }); },
    lose: function () { [330, 262, 196].forEach(function (f, i) { tone(f, 0.3, 'triangle', 0.07, i * 0.2); }); }
  };
});
