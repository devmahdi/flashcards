/*
 * Spaced-repetition scheduler.
 * FSRS-4.5 memory model (the algorithm behind modern Anki) with Anki-style
 * short learning steps, so a forgotten card comes back within the same session.
 *
 * Card state: { state, s, d, step, due, last, reps, lapses, ivl }
 *   state: 0 new · 1 learning · 2 review · 3 relearning
 *   s: stability (days) · d: difficulty (1–10) · due/last: epoch ms
 * Grades: 1 Again · 2 Hard · 3 Good · 4 Easy
 */
(function (root) {
  const W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474,
    0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
  const DECAY = -0.5;
  const FACTOR = 19 / 81;
  const MIN = 60e3;
  const DAY = 864e5;
  const LEARN_STEPS = [1 * MIN, 10 * MIN];
  const RELEARN_STEPS = [10 * MIN];
  const ROLLOVER_HOUR = 4; // a "day" starts at 04:00 local time, like Anki

  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const initS = (g) => W[g - 1];
  const initD = (g) => clamp(W[4] - (g - 3) * W[5], 1, 10);
  const nextD = (d, g) => clamp(W[7] * initD(4) + (1 - W[7]) * (d - W[6] * (g - 3)), 1, 10);
  const retrievability = (t, s) => Math.pow(1 + (FACTOR * t) / s, DECAY);
  const recallS = (d, s, r, g) =>
    s * (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) *
      (g === 2 ? W[15] : 1) * (g === 4 ? W[16] : 1));
  const forgetS = (d, s, r) =>
    Math.min(s, W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r)));

  function intervalDays(s, opts) {
    const retention = opts.retention || 0.9;
    const ivl = (s / FACTOR) * (Math.pow(retention, 1 / DECAY) - 1);
    return clamp(Math.round(ivl), 1, opts.maxInterval || 365);
  }

  function dayStart(ts) {
    const d = new Date(ts - ROLLOVER_HOUR * 36e5);
    d.setHours(ROLLOVER_HOUR, 0, 0, 0);
    return d.getTime();
  }
  const nextDayStart = (ts) => dayStart(ts) + DAY;
  const dayKey = (ts) => {
    const d = new Date(dayStart(ts));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const newCard = () => ({ state: 0, s: 0, d: 0, step: 0, due: 0, last: 0, reps: 0, lapses: 0, ivl: 0 });

  function schedule(card, g, now, opts = {}) {
    const c = card || newCard();
    const n = { ...c, reps: (c.reps || 0) + 1, last: now };
    const graduate = (s, minIvl = 1) => {
      n.s = s;
      n.state = 2;
      n.step = 0;
      n.ivl = Math.max(intervalDays(s, opts), minIvl);
      n.due = dayStart(now) + n.ivl * DAY;
    };

    if (!c.state) {
      n.s = initS(g);
      n.d = initD(g);
      if (g === 4) graduate(n.s);
      else {
        n.state = 1;
        n.step = g === 3 ? 1 : 0;
        n.due = now + (g === 1 ? LEARN_STEPS[0] : g === 2 ? (LEARN_STEPS[0] + LEARN_STEPS[1]) / 2 : LEARN_STEPS[1]);
      }
      return n;
    }

    if (c.state === 1 || c.state === 3) {
      const steps = c.state === 1 ? LEARN_STEPS : RELEARN_STEPS;
      n.d = nextD(c.d, g);
      if (g === 1) {
        n.s = Math.min(c.s, W[0]);
        n.step = 0;
        n.due = now + steps[0];
      } else if (g === 2) {
        n.due = now + (c.step === 0 && steps.length > 1 ? (steps[0] + steps[1]) / 2 : steps[c.step] * 1.5);
      } else if (g === 3) {
        if (c.step + 1 < steps.length) {
          n.step = c.step + 1;
          n.due = now + steps[n.step];
        } else graduate(c.s);
      } else {
        graduate(Math.max(c.s * 1.5, W[2]), intervalDays(c.s, opts) + 1);
      }
      return n;
    }

    // Review
    const elapsed = Math.max(0, (now - (c.last || now)) / DAY);
    const r = retrievability(elapsed, c.s);
    n.d = nextD(c.d, g);
    if (g === 1) {
      n.s = forgetS(c.d, c.s, r);
      n.lapses = (c.lapses || 0) + 1;
      n.state = 3;
      n.step = 0;
      n.due = now + RELEARN_STEPS[0];
      return n;
    }
    const sH = recallS(c.d, c.s, r, 2);
    const sG = recallS(c.d, c.s, r, 3);
    const sE = recallS(c.d, c.s, r, 4);
    let iH = intervalDays(sH, opts);
    let iG = intervalDays(sG, opts);
    let iE = intervalDays(sE, opts);
    const maxIvl = opts.maxInterval || 365;
    iH = Math.min(iH, iG);
    iG = Math.min(Math.max(iG, iH + 1), maxIvl);
    iE = Math.min(Math.max(iE, iG + 1), maxIvl);
    n.s = g === 2 ? sH : g === 3 ? sG : sE;
    n.state = 2;
    n.step = 0;
    n.ivl = g === 2 ? iH : g === 3 ? iG : iE;
    n.due = dayStart(now) + n.ivl * DAY;
    return n;
  }

  // Delay (ms from now) that each grade would produce — used for button labels.
  function preview(card, now, opts) {
    return [1, 2, 3, 4].map((g) => {
      const n = schedule(card, g, now, opts);
      return n.state === 2 ? n.ivl * DAY : n.due - now;
    });
  }

  root.FSRS = { schedule, preview, newCard, dayStart, nextDayStart, dayKey, DAY, MIN };
})(typeof window !== 'undefined' ? window : globalThis);
