(() => {
  'use strict';

  // Pronunciation audio (speaker buttons, autoplay, listening quiz) is switched off for now.
  const AUDIO = false;

  const { STRINGS, formatDelay } = window.I18N;
  const { schedule, preview, dayKey, nextDayStart } = window.FSRS;

  // ---------- storage ----------
  const store = {
    get(k, d) {
      try {
        const v = localStorage.getItem(k);
        return v == null ? d : JSON.parse(v);
      } catch {
        return d;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, JSON.stringify(v));
      } catch {}
    },
    del(k) {
      try {
        localStorage.removeItem(k);
      } catch {}
    },
  };
  const K = {
    settings: 'fc1:settings',
    log: 'fc1:log',
    installSeen: 'fc1:installSeen',
    progress: (id) => `fc1:progress:${id}`,
    today: (id) => `fc1:today:${id}`,
    stars: (id) => `fc1:stars:${id}`,
  };
  const DEFAULTS = {
    uiLang: 'fa',
    newPerDay: 10,
    reverse: false,
    autoplay: true,
    showEnglish: true,
    showPron: true,
    speechRate: 0.85,
    order: 'random',
  };
  let settings = { ...DEFAULTS, ...store.get(K.settings, {}) };
  const saveSettings = () => store.set(K.settings, settings);
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  // ---------- helpers ----------
  const app = document.getElementById('app');
  const t = (k) => STRINGS[settings.uiLang][k] ?? STRINGS.en[k] ?? k;
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const num = (n) => new Intl.NumberFormat(settings.uiLang === 'fa' ? 'fa-IR' : 'en').format(n);
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const sample = (arr, n) => shuffle(arr).slice(0, n);
  const LANG_TAGS = { tr: 'tr-TR', fa: 'fa-IR', en: 'en-US', de: 'de-DE', fr: 'fr-FR', es: 'es-ES', ar: 'ar-SA', it: 'it-IT', ru: 'ru-RU' };
  const icon = {
    speaker: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z" fill="currentColor"/></svg>',
    undo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14L4 9l5-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    fire: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-2.5 1.2-4 2.5-5 .2 2 1 3 2 3.2C11 9 11 5.5 12 2z" fill="currentColor"/></svg>',
  };

  // ---------- state ----------
  const S = { decks: [], deck: null, topic: 'all', view: 'loading', session: null, quiz: null, query: '', modal: null };

  // ---------- data ----------
  async function loadDecks() {
    if (window.__FC_DATA__) return window.__FC_DATA__.decks.map((d) => ({ ...d, base: '' }));
    const idx = await fetch('decks/index.json', { cache: 'no-cache' }).then((r) => r.json());
    return Promise.all(
      idx.decks.map(async (m) => {
        const d = await fetch(`decks/${m.id}/deck.json`, { cache: 'no-cache' }).then((r) => r.json());
        return { ...d, base: `decks/${m.id}/` };
      }),
    );
  }
  const imgSrc = (deck, card) => (!card.image ? '' : card.image.startsWith('data:') ? card.image : deck.base + card.image);
  const nativeLangs = (deck) => deck.nativeLanguages || ['fa', 'en'];
  const meaning = (card, lang) => (card.meaning && card.meaning[lang]) || '';

  const progressOf = (deck) => store.get(K.progress(deck.id), {});
  const saveProgress = (deck, p) => store.set(K.progress(deck.id), p);
  function todayOf(deck) {
    const rec = store.get(K.today(deck.id), null);
    const key = dayKey(Date.now());
    return rec && rec.day === key ? rec : { day: key, newCount: 0, extra: 0 };
  }
  const saveToday = (deck, rec) => store.set(K.today(deck.id), rec);
  function starOverrides(deck) {
    return store.get(K.stars(deck.id), {});
  }
  const isStarred = (deck, card, ov = starOverrides(deck)) => (card.id in ov ? ov[card.id] : !!card.starred);

  function logReview(correct, isNew) {
    const log = store.get(K.log, {});
    const key = dayKey(Date.now());
    const e = log[key] || { reviews: 0, correct: 0, newCards: 0 };
    e.reviews++;
    if (correct) e.correct++;
    if (isNew) e.newCards++;
    log[key] = e;
    store.set(K.log, log);
  }
  function streak() {
    const log = store.get(K.log, {});
    let n = 0;
    let ts = Date.now();
    if (!log[dayKey(ts)]) ts -= 864e5; // today not studied yet: streak still counts until tonight
    while (log[dayKey(ts)]) {
      n++;
      ts -= 864e5;
    }
    return n;
  }

  function topicCards(deck, topic) {
    if (topic === 'all') return deck.cards;
    if (topic === 'starred') {
      const ov = starOverrides(deck);
      return deck.cards.filter((c) => isStarred(deck, c, ov));
    }
    return deck.cards.filter((c) => (c.topic || 'other') === topic);
  }
  // Study items: forward card for every word; reverse card once the forward one has graduated.
  function studyItems(deck, topic, prog) {
    const items = [];
    for (const card of topicCards(deck, topic)) {
      items.push({ card, key: card.id, rev: false });
      if (settings.reverse && prog[card.id] && prog[card.id].state === 2) items.push({ card, key: `${card.id}~r`, rev: true });
    }
    return items;
  }
  function stats(deck, topic = 'all') {
    const prog = progressOf(deck);
    const end = nextDayStart(Date.now());
    const today = todayOf(deck);
    let due = 0, fresh = 0, seen = 0, mastered = 0;
    for (const it of studyItems(deck, topic, prog)) {
      const p = prog[it.key];
      if (!p || !p.state) fresh++;
      else if (p.due < end) due++;
    }
    for (const c of deck.cards) {
      const p = prog[c.id];
      if (p && p.state) seen++;
      if (p && p.state === 2 && p.ivl >= 21) mastered++;
    }
    const newLeft = Math.max(0, settings.newPerDay + today.extra - today.newCount);
    return { due, fresh: Math.min(fresh, newLeft), freshAvail: fresh, seen, mastered, total: deck.cards.length };
  }

  // ---------- speech ----------
  let voices = [];
  function loadVoices() {
    if (!('speechSynthesis' in window)) return;
    voices = speechSynthesis.getVoices();
  }
  if ('speechSynthesis' in window) {
    loadVoices();
    speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
  }
  function voiceFor(lang) {
    const pre = lang.toLowerCase();
    const list = voices.filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith(pre));
    return list.find((v) => /enhanced|premium/i.test(v.name)) || list.find((v) => v.localService) || list[0] || null;
  }
  function speak(text, lang = (S.deck && S.deck.language) || 'tr') {
    if (!AUDIO || !text || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANG_TAGS[lang] || lang;
    const v = voiceFor(lang);
    if (v) u.voice = v;
    u.rate = settings.speechRate;
    speechSynthesis.speak(u);
  }

  // ---------- rendering ----------
  function setDir() {
    document.documentElement.lang = settings.uiLang;
    document.documentElement.dir = t('dir');
  }
  function render() {
    setDir();
    const v = S.view;
    let html = '';
    if (v === 'loading') html = `<div class="center-screen"><div class="spinner"></div></div>`;
    else if (v === 'error') html = `<div class="center-screen"><p class="muted">${esc(t('loadError'))}</p></div>`;
    else if (v === 'library') html = viewLibrary();
    else if (v === 'deck') html = viewDeck();
    else if (v === 'study') html = viewStudy();
    else if (v === 'done') html = viewDone();
    else if (v === 'browse') html = viewBrowse();
    else if (v === 'quiz') html = viewQuiz();
    else if (v === 'settings') html = viewSettings();
    app.innerHTML = html + (S.modal ? viewModal() : '');
    app.dataset.view = v;
  }

  const topbar = (title, { back = true, right = '' } = {}) => `
    <header class="topbar">
      ${back ? `<button class="icon-btn" data-act="back" aria-label="${esc(t('back'))}">${icon.back}</button>` : '<span class="icon-btn-spacer"></span>'}
      <h1 class="topbar-title">${title}</h1>
      ${right || '<span class="icon-btn-spacer"></span>'}
    </header>`;

  function coverHtml(deck) {
    const imgs = deck.cards.filter((c) => c.image).slice(0, 4);
    if (!imgs.length) return `<div class="cover cover-empty">${esc((deck.cards[0] && deck.cards[0].emoji) || '📚')}</div>`;
    return `<div class="cover">${imgs.map((c) => `<img src="${esc(imgSrc(deck, c))}" alt="" loading="lazy">`).join('')}</div>`;
  }

  function viewLibrary() {
    return `
      ${topbar(esc(t('library')), { back: false, right: `<button class="icon-btn" data-act="settings" aria-label="${esc(t('settings'))}">${icon.gear}</button>` })}
      <main class="page">
        ${installBanner()}
        <div class="deck-list">
          ${S.decks.map((d) => {
            const st = stats(d);
            return `<button class="deck-tile" data-act="open-deck" data-id="${esc(d.id)}">
              ${coverHtml(d)}
              <div class="deck-tile-body">
                <div class="deck-tile-title" dir="auto">${esc(d.title)}</div>
                <div class="deck-tile-sub" dir="auto">${esc(d.subtitle || '')}</div>
                <div class="pill-row">
                  <span class="pill pill-due">${num(st.due)} ${esc(t('dueToday'))}</span>
                  <span class="pill pill-new">${num(st.fresh)} ${esc(t('newToday'))}</span>
                </div>
                <div class="bar"><span style="width:${(st.seen / Math.max(1, st.total)) * 100}%"></span></div>
              </div>
            </button>`;
          }).join('')}
        </div>
      </main>`;
  }

  function installBanner() {
    const standalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (standalone || !ios || window.__FC_DATA__ || store.get(K.installSeen, false)) return '';
    return `<div class="banner">
      <div><strong>${esc(t('installTitle'))}</strong><p>${esc(t('installBody'))}</p></div>
      <button class="btn btn-soft" data-act="dismiss-install">${esc(t('dismiss'))}</button>
    </div>`;
  }

  function topicChips(deck, withCounts = true) {
    const counts = {};
    for (const c of deck.cards) counts[c.topic || 'other'] = (counts[c.topic || 'other'] || 0) + 1;
    const ov = starOverrides(deck);
    const starredCount = deck.cards.filter((c) => isStarred(deck, c, ov)).length;
    const topicNames = t('topics');
    const keys = Object.keys(topicNames).filter((k) => counts[k]);
    const chip = (key, label, n) =>
      `<button class="chip ${S.topic === key ? 'is-on' : ''}" data-act="topic" data-topic="${esc(key)}">${label}${withCounts ? ` <span class="chip-n">${num(n)}</span>` : ''}</button>`;
    return `<div class="chips" role="tablist">
      ${chip('all', esc(t('all')), deck.cards.length)}
      ${starredCount ? chip('starred', `<span class="chip-star">${icon.star}</span>${esc(t('starred'))}`, starredCount) : ''}
      ${keys.map((k) => chip(k, esc(topicNames[k]), counts[k])).join('')}
    </div>`;
  }

  function viewDeck() {
    const d = S.deck;
    const st = stats(d, S.topic);
    const total = st.due + st.fresh;
    const sk = streak();
    return `
      ${topbar(`<span dir="auto">${esc(d.title)}</span>`, {
        back: S.decks.length > 1,
        right: `<button class="icon-btn" data-act="settings" aria-label="${esc(t('settings'))}">${icon.gear}</button>`,
      })}
      <main class="page">
        ${S.decks.length === 1 ? installBanner() : ''}
        <section class="hero">
          <div class="hero-stats">
            <div class="stat"><span class="stat-n tone-due">${num(st.due)}</span><span class="stat-l">${esc(t('dueToday'))}</span></div>
            <div class="stat"><span class="stat-n tone-new">${num(st.fresh)}</span><span class="stat-l">${esc(t('newToday'))}</span></div>
            <div class="stat"><span class="stat-n">${num(st.mastered)}<small>/${num(st.total)}</small></span><span class="stat-l">${esc(t('mastered'))}</span></div>
          </div>
          ${total
            ? `<button class="btn btn-primary btn-xl" data-act="study">${esc(t('startStudy'))}</button>`
            : `<div class="all-done"><strong>${esc(t('allDone'))} ✓</strong><p>${esc(t('allDoneSub'))}</p>
                ${st.freshAvail ? `<button class="btn btn-soft" data-act="more-new">${esc(t('learnMore'))}</button>` : ''}</div>`}
          ${sk ? `<div class="streak">${icon.fire}<span>${num(sk)} ${esc(t('streak'))}</span></div>` : ''}
        </section>
        ${topicChips(d)}
        <div class="action-grid">
          <button class="action" data-act="browse"><span class="action-emoji">📖</span><span>${esc(t('browse'))}</span></button>
          <button class="action" data-act="quiz"><span class="action-emoji">🎯</span><span>${esc(t('quiz'))}</span></button>
        </div>
      </main>`;
  }

  // ----- study -----
  function startSession(topic = S.topic) {
    const d = S.deck;
    const prog = progressOf(d);
    const now = Date.now();
    const end = nextDayStart(now);
    const items = studyItems(d, topic, prog);
    const due = items.filter((i) => prog[i.key] && prog[i.key].state && prog[i.key].due < end);
    const reviews = shuffle(due.filter((i) => prog[i.key].state === 2));
    const learning = due.filter((i) => prog[i.key].state !== 2);
    let fresh = items.filter((i) => !prog[i.key] || !prog[i.key].state);
    if (settings.order === 'random') fresh = shuffle(fresh);
    fresh = fresh.slice(0, stats(d, topic).fresh);
    // Interleave: one new word after every two reviews.
    const queue = [];
    while (reviews.length || fresh.length) {
      if (reviews.length) queue.push(reviews.shift());
      if (reviews.length) queue.push(reviews.shift());
      if (fresh.length) queue.push(fresh.shift());
    }
    S.session = { queue, learning, current: null, flipped: false, reviewed: 0, correct: 0, history: [], total: queue.length + learning.length };
    S.view = 'study';
    nextCard();
  }

  function nextCard() {
    const s = S.session;
    const prog = progressOf(S.deck);
    const now = Date.now();
    s.learning.sort((a, b) => prog[a.key].due - prog[b.key].due);
    let next = null;
    if (s.learning.length && prog[s.learning[0].key].due <= now) next = s.learning.shift();
    else if (s.queue.length) next = s.queue.shift();
    else if (s.learning.length) next = s.learning.shift();
    s.current = next;
    s.flipped = false;
    if (!next) {
      S.view = 'done';
      render();
      return;
    }
    render();
    if (settings.autoplay && !next.rev) speak(next.card.term);
  }

  function flip() {
    const s = S.session;
    if (!s || !s.current || s.flipped) return;
    s.flipped = true;
    const el = app.querySelector('.flashcard');
    if (el) el.classList.add('is-flipped');
    const bar = app.querySelector('.answer-bar');
    if (bar) bar.outerHTML = ratingBar();
    if (settings.autoplay && s.current.rev) speak(s.current.card.term);
  }

  function rate(g) {
    const s = S.session;
    if (!s || !s.current || !s.flipped) return;
    const d = S.deck;
    const prog = progressOf(d);
    const key = s.current.key;
    const prev = prog[key];
    const today = todayOf(d);
    s.history.push({
      item: s.current,
      prev: prev ? { ...prev } : null,
      today: { ...today },
      logDay: (store.get(K.log, {})[dayKey(Date.now())] || null),
      queue: s.queue.slice(),
      learning: s.learning.slice(),
      reviewed: s.reviewed,
      correct: s.correct,
    });
    const isNew = !prev || !prev.state;
    const next = schedule(prev, g, Date.now());
    prog[key] = next;
    saveProgress(d, prog);
    if (isNew) {
      today.newCount++;
      saveToday(d, today);
    }
    logReview(g > 1, isNew);
    s.reviewed++;
    if (g > 1) s.correct++;
    if (next.state === 1 || next.state === 3) s.learning.push(s.current);
    nextCard();
  }

  function undo() {
    const s = S.session;
    if (!s || !s.history.length) return;
    const h = s.history.pop();
    const d = S.deck;
    const prog = progressOf(d);
    if (h.prev) prog[h.item.key] = h.prev;
    else delete prog[h.item.key];
    saveProgress(d, prog);
    saveToday(d, h.today);
    const log = store.get(K.log, {});
    if (h.logDay) log[dayKey(Date.now())] = h.logDay;
    else delete log[dayKey(Date.now())];
    store.set(K.log, log);
    s.queue = h.queue;
    s.learning = h.learning;
    s.reviewed = h.reviewed;
    s.correct = h.correct;
    s.current = h.item;
    s.flipped = false;
    S.view = 'study';
    render();
  }

  function ratingBar() {
    const s = S.session;
    if (!s.flipped) return `<div class="answer-bar"><button class="btn btn-primary btn-xl" data-act="flip">${esc(t('showAnswer'))}</button></div>`;
    const prog = progressOf(S.deck);
    const delays = preview(prog[s.current.key], Date.now());
    const labels = ['again', 'hard', 'good', 'easy'];
    return `<div class="answer-bar rating">
      ${labels.map((l, i) => `<button class="rate rate-${l}" data-act="rate" data-g="${i + 1}">
        <span class="rate-label">${esc(t(l))}</span><span class="rate-ivl">${esc(formatDelay(delays[i], settings.uiLang))}</span>
      </button>`).join('')}
    </div>`;
  }

  function cardMedia(d, c, cls = '') {
    const src = imgSrc(d, c);
    return src
      ? `<div class="media ${cls}"><img src="${esc(src)}" alt="" decoding="async"></div>`
      : `<div class="media media-emoji ${cls}"><span>${esc(c.emoji || '🖼️')}</span></div>`;
  }
  function speakBtn(text, lang, label = t('listen'), big = false) {
    if (!AUDIO) return '';
    return `<button class="speak ${big ? 'speak-lg' : ''}" data-act="speak" data-text="${esc(text)}" data-lang="${esc(lang)}" aria-label="${esc(label)}">${icon.speaker}</button>`;
  }
  function meaningsHtml(d, c) {
    const [l1, l2] = nativeLangs(d);
    return `<div class="meaning-1" dir="auto">${esc(meaning(c, l1))}</div>
      ${settings.showEnglish && l2 && meaning(c, l2) ? `<div class="meaning-2" dir="auto">${esc(meaning(c, l2))}</div>` : ''}`;
  }
  function exampleHtml(d, c) {
    if (!c.example || !c.example.text) return '';
    const [l1, l2] = nativeLangs(d);
    const m = c.example.meaning || {};
    return `<div class="example">
      <div class="example-row"><span class="example-text" dir="ltr" lang="${esc(d.language)}">${esc(c.example.text)}</span>${speakBtn(c.example.text, d.language)}</div>
      ${m[l1] ? `<div class="example-m" dir="auto">${esc(m[l1])}</div>` : ''}
      ${settings.showEnglish && l2 && m[l2] ? `<div class="example-m2" dir="auto">${esc(m[l2])}</div>` : ''}
    </div>`;
  }
  function termHtml(d, c, size = '') {
    return `<div class="term-row"><span class="term ${size}" dir="ltr" lang="${esc(d.language)}">${esc(c.term)}</span>${speakBtn(c.term, d.language, t('listen'), true)}</div>
      ${settings.showPron && c.pron ? `<div class="pron" dir="rtl">${esc(c.pron)}</div>` : ''}`;
  }
  const posChip = (c) => (t('pos')[c.pos] ? `<span class="pos">${esc(t('pos')[c.pos])}</span>` : '');

  function viewStudy() {
    const s = S.session;
    const d = S.deck;
    const c = s.current.card;
    const left = s.queue.length + s.learning.length + 1;
    const pct = (s.reviewed / (s.reviewed + left)) * 100;
    const front = s.current.rev
      ? `<div class="face face-front face-rev">
          ${cardMedia(d, c, 'media-sm')}
          ${meaningsHtml(d, c)}
          <div class="hint">${esc(t('sayInTarget'))}</div>
        </div>`
      : `<div class="face face-front">
          ${posChip(c)}
          <div class="term-row"><span class="term term-xl" dir="ltr" lang="${esc(d.language)}">${esc(c.term)}</span></div>
          ${speakBtn(c.term, d.language, t('listen'), true)}
          <div class="hint">${esc(t('tapToFlip'))}</div>
        </div>`;
    const back = `<div class="face face-back">
        ${cardMedia(d, c)}
        <div class="back-body">
          ${posChip(c)}
          ${termHtml(d, c)}
          ${meaningsHtml(d, c)}
          ${exampleHtml(d, c)}
        </div>
      </div>`;
    return `
      <header class="topbar study-top">
        <button class="icon-btn" data-act="end-session" aria-label="${esc(t('close'))}">${icon.x}</button>
        <div class="progress"><span style="width:${pct}%"></span></div>
        <span class="left-count">${num(left)}</span>
        <button class="icon-btn" data-act="undo" ${s.history.length ? '' : 'disabled'} aria-label="${esc(t('undo'))}">${icon.undo}</button>
      </header>
      <main class="study">
        <div class="flashcard-wrap">
          <div class="flashcard ${s.flipped ? 'is-flipped' : ''}" data-act="flip" role="button" tabindex="0" aria-label="${esc(t('showAnswer'))}">
            <div class="flashcard-inner">${front}${back}</div>
          </div>
        </div>
        ${ratingBar()}
      </main>`;
  }

  function viewDone() {
    const s = S.session || { reviewed: 0, correct: 0 };
    const st = stats(S.deck, S.topic);
    const pct = s.reviewed ? Math.round((s.correct / s.reviewed) * 100) : 0;
    return `
      ${topbar('', { back: false })}
      <main class="page center-col">
        <div class="celebrate">🎉</div>
        <h2 class="done-title">${esc(t('sessionDone'))}</h2>
        <div class="hero-stats">
          <div class="stat"><span class="stat-n">${num(s.reviewed)}</span><span class="stat-l">${esc(t('reviewed'))}</span></div>
          <div class="stat"><span class="stat-n tone-good">${num(pct)}${settings.uiLang === 'fa' ? '٪' : '%'}</span><span class="stat-l">${esc(t('correctPct'))}</span></div>
          <div class="stat"><span class="stat-n tone-due">${num(streak())}</span><span class="stat-l">${esc(t('streak'))}</span></div>
        </div>
        <div class="stack">
          <button class="btn btn-primary btn-xl" data-act="home">${esc(t('home'))}</button>
          ${st.freshAvail ? `<button class="btn btn-soft" data-act="more-new">${esc(t('learnMore'))}</button>` : ''}
          <button class="btn btn-soft" data-act="quiz">🎯 ${esc(t('quiz'))}</button>
        </div>
      </main>`;
  }

  // ----- browse -----
  function viewBrowse() {
    return `
      ${topbar(esc(t('browse')))}
      <main class="page">
        <input id="search" class="search" type="search" placeholder="${esc(t('search'))}" value="${esc(S.query)}" autocomplete="off" autocapitalize="off" spellcheck="false">
        ${topicChips(S.deck)}
        <div id="browse-results">${browseResults()}</div>
      </main>`;
  }
  function browseResults() {
    const d = S.deck;
    const q = S.query.trim().toLocaleLowerCase('tr');
    const ov = starOverrides(d);
    const list = topicCards(d, S.topic).filter((c) => {
      if (!q) return true;
      const hay = [c.term, c.pron, ...Object.values(c.meaning || {})].join(' ').toLocaleLowerCase('tr');
      return hay.includes(q);
    });
    const prog = progressOf(d);
    return `
        ${list.length ? '' : `<p class="muted center">${esc(t('noResults'))}</p>`}
        <div class="grid">
          ${list.map((c) => {
            const p = prog[c.id];
            const lvl = !p || !p.state ? 0 : p.state !== 2 ? 1 : p.ivl >= 21 ? 3 : 2;
            return `<button class="tile" data-act="word" data-id="${esc(c.id)}">
              ${cardMedia(d, c, 'media-tile')}
              <span class="tile-term" dir="ltr">${esc(c.term)}</span>
              <span class="tile-m" dir="auto">${esc(meaning(c, nativeLangs(d)[0]))}</span>
              <span class="lvl lvl-${lvl}"></span>
              ${isStarred(d, c, ov) ? `<span class="tile-star">${icon.star}</span>` : ''}
            </button>`;
          }).join('')}
        </div>`;
  }

  function viewModal() {
    const m = S.modal;
    if (m.type === 'word') {
      const d = S.deck;
      const c = d.cards.find((x) => x.id === m.id);
      if (!c) return '';
      const starred = isStarred(d, c);
      return `<div class="modal-backdrop" data-act="close-modal">
        <div class="modal word-modal" role="dialog" aria-modal="true">
          <div class="modal-head">
            <button class="icon-btn star-btn ${starred ? 'is-on' : ''}" data-act="toggle-star" data-id="${esc(c.id)}" aria-label="${esc(t('starred'))}">${icon.star}</button>
            <button class="icon-btn" data-act="close-modal" aria-label="${esc(t('close'))}">${icon.x}</button>
          </div>
          ${cardMedia(d, c)}
          <div class="back-body">
            ${posChip(c)}
            ${termHtml(d, c)}
            ${meaningsHtml(d, c)}
            ${exampleHtml(d, c)}
          </div>
        </div>
      </div>`;
    }
    if (m.type === 'confirm') {
      return `<div class="modal-backdrop" data-act="close-modal">
        <div class="modal confirm-modal" role="alertdialog" aria-modal="true">
          <p>${esc(m.text)}</p>
          <div class="row-end">
            <button class="btn btn-soft" data-act="close-modal">${esc(t('cancel'))}</button>
            <button class="btn btn-danger" data-act="confirm-yes">${esc(t('confirm'))}</button>
          </div>
        </div>
      </div>`;
    }
    if (m.type === 'toast') return `<div class="toast" role="status">${esc(m.text)}</div>`;
    return '';
  }

  // ----- quiz -----
  function startQuiz() {
    const d = S.deck;
    const prog = progressOf(d);
    let pool = topicCards(d, S.topic);
    if (pool.length < 4) pool = d.cards;
    const seen = pool.filter((c) => prog[c.id] && prog[c.id].state);
    const base = seen.length >= 8 ? seen : pool;
    const l1 = nativeLangs(d)[0];
    const questions = sample(base, Math.min(10, base.length)).map((c) => {
      const kinds = AUDIO ? ['meaning', 'listen'] : ['meaning'];
      if (c.image) kinds.push('picture', 'picture');
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      const others = sample(
        pool.filter((x) => x.id !== c.id && meaning(x, l1) !== meaning(c, l1) && x.term !== c.term),
        3,
      );
      const options = shuffle([c, ...others]);
      return { card: c, kind, options, answer: null };
    });
    S.quiz = { questions, i: 0, score: 0 };
    S.view = 'quiz';
    render();
    autoSpeakQuiz();
  }
  function autoSpeakQuiz() {
    const q = S.quiz && S.quiz.questions[S.quiz.i];
    if (q && (q.kind === 'listen' || (q.kind === 'meaning' && settings.autoplay))) speak(q.card.term);
  }
  function viewQuiz() {
    const d = S.deck;
    const z = S.quiz;
    const l1 = nativeLangs(d)[0];
    if (z.i >= z.questions.length) {
      return `
        ${topbar(esc(t('quiz')))}
        <main class="page center-col">
          <div class="celebrate">${z.score >= z.questions.length * 0.8 ? '🏆' : '💪'}</div>
          <h2 class="done-title">${esc(t('score'))}: ${num(z.score)} / ${num(z.questions.length)}</h2>
          <div class="stack">
            <button class="btn btn-primary btn-xl" data-act="quiz">${esc(t('playAgain'))}</button>
            <button class="btn btn-soft" data-act="home">${esc(t('home'))}</button>
          </div>
        </main>`;
    }
    const q = z.questions[z.i];
    const c = q.card;
    const pct = (z.i / z.questions.length) * 100;
    let prompt = '';
    let optLabel;
    if (q.kind === 'picture') {
      prompt = `<div class="quiz-q">${esc(t('quizWhichWord'))}</div>${cardMedia(d, c, 'media-quiz')}`;
      optLabel = (o) => `<span dir="ltr">${esc(o.term)}</span>`;
    } else if (q.kind === 'listen') {
      prompt = `<div class="quiz-q">${esc(t('quizListen'))}</div>
        <button class="speak speak-hero" data-act="speak" data-text="${esc(c.term)}" data-lang="${esc(d.language)}">${icon.speaker}</button>`;
      optLabel = (o) => `<span dir="auto">${esc(meaning(o, l1))}</span>`;
    } else {
      prompt = `<div class="quiz-q">${esc(t('quizWhichMeaning'))}</div>
        <div class="term-row"><span class="term term-xl" dir="ltr">${esc(c.term)}</span>${speakBtn(c.term, d.language, t('listen'), true)}</div>`;
      optLabel = (o) => `<span dir="auto">${esc(meaning(o, l1))}</span>`;
    }
    const answered = q.answer != null;
    return `
      <header class="topbar study-top">
        <button class="icon-btn" data-act="back" aria-label="${esc(t('close'))}">${icon.x}</button>
        <div class="progress"><span style="width:${pct}%"></span></div>
        <span class="left-count">${num(z.score)}</span>
        <span class="icon-btn-spacer"></span>
      </header>
      <main class="page quiz">
        <div class="quiz-prompt">${prompt}</div>
        <div class="options">
          ${q.options.map((o) => {
            let cls = '';
            if (answered && o.id === c.id) cls = 'is-right';
            else if (answered && o.id === q.answer) cls = 'is-wrong';
            return `<button class="option ${cls}" data-act="answer" data-id="${esc(o.id)}" ${answered ? 'disabled' : ''}>${optLabel(o)}</button>`;
          }).join('')}
        </div>
        ${answered ? `<div class="quiz-reveal">${termHtml(d, c)}${meaningsHtml(d, c)}</div>
          <button class="btn btn-primary btn-xl" data-act="quiz-next">${esc(t('next'))}</button>` : ''}
      </main>`;
  }
  function answerQuiz(id) {
    const q = S.quiz.questions[S.quiz.i];
    if (q.answer != null) return;
    q.answer = id;
    if (id === q.card.id) S.quiz.score++;
    render();
    speak(q.card.term);
  }

  // ----- settings -----
  function viewSettings() {
    const seg = (key, opts) => `<div class="seg">${opts.map(([v, label]) =>
      `<button class="${settings[key] === v ? 'is-on' : ''}" data-act="set" data-key="${key}" data-val="${esc(JSON.stringify(v))}">${esc(label)}</button>`).join('')}</div>`;
    const toggle = (key, label, sub = '') => `<label class="setting">
        <span><span class="setting-l">${esc(label)}</span>${sub ? `<span class="setting-sub">${esc(sub)}</span>` : ''}</span>
        <input type="checkbox" class="switch" data-act="toggle" data-key="${key}" ${settings[key] ? 'checked' : ''}>
      </label>`;
    return `
      ${topbar(esc(t('settings')))}
      <main class="page settings">
        <section class="card-section">
          <div class="setting"><span class="setting-l">${esc(t('uiLang'))}</span>${seg('uiLang', [['fa', 'فارسی'], ['en', 'English']])}</div>
          <div class="setting"><span class="setting-l">${esc(t('newPerDay'))}</span>${seg('newPerDay', [[5, num(5)], [10, num(10)], [15, num(15)], [20, num(20)], [30, num(30)]])}</div>
          <div class="setting"><span class="setting-l">${esc(t('order'))}</span>${seg('order', [['random', t('orderRandom')], ['book', t('orderBook')]])}</div>
          ${AUDIO ? `<div class="setting"><span class="setting-l">${esc(t('speechRate'))}</span>${seg('speechRate', [[0.65, t('slow')], [0.85, t('normal')], [1, '1×']])}</div>` : ''}
        </section>
        <section class="card-section">
          ${AUDIO ? toggle('autoplay', t('autoplay')) : ''}
          ${toggle('showEnglish', t('showEnglish'))}
          ${toggle('showPron', t('showPron'))}
          ${toggle('reverse', t('reverse'), t('reverseSub'))}
        </section>
        ${S.deck ? `<section class="card-section">
          <button class="setting setting-btn" data-act="backup">💾 ${esc(t('backup'))}</button>
          <label class="setting setting-btn">📂 ${esc(t('restore'))}<input type="file" accept="application/json,.json" data-act="restore" hidden></label>
          <button class="setting setting-btn danger" data-act="reset">${esc(t('reset'))}</button>
        </section>` : ''}
        <p class="muted center small">FSRS · ${esc(S.deck ? S.deck.title : '')}</p>
      </main>`;
  }

  function backup() {
    const data = { app: 'flashcards', version: 1, exportedAt: new Date().toISOString(), settings, log: store.get(K.log, {}), decks: {} };
    for (const d of S.decks) data.decks[d.id] = { progress: progressOf(d), stars: starOverrides(d), today: todayOf(d) };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `flashcards-backup-${dayKey(Date.now())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  async function restore(file) {
    try {
      const data = JSON.parse(await file.text());
      if (data.app !== 'flashcards') throw new Error('bad file');
      if (data.settings) settings = { ...DEFAULTS, ...data.settings };
      saveSettings();
      if (data.log) store.set(K.log, data.log);
      for (const [id, rec] of Object.entries(data.decks || {})) {
        if (rec.progress) store.set(K.progress(id), rec.progress);
        if (rec.stars) store.set(K.stars(id), rec.stars);
        if (rec.today) store.set(K.today(id), rec.today);
      }
      toast(t('restored'));
    } catch {
      toast('✕');
    }
  }
  let toastTimer;
  function toast(text) {
    S.modal = { type: 'toast', text };
    render();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (S.modal && S.modal.type === 'toast') {
        S.modal = null;
        render();
      }
    }, 2200);
  }

  // ---------- navigation ----------
  const homeView = () => (S.decks.length > 1 ? 'library' : 'deck');
  function go(view) {
    S.modal = null;
    S.view = view;
    window.scrollTo(0, 0);
    render();
  }
  function back() {
    if (S.view === 'settings') return go(S.prevView || homeView());
    if (S.view === 'deck') return go('library');
    go('deck');
  }

  // ---------- events ----------
  app.addEventListener('click', (e) => {
    const target = e.target.closest('[data-act]');
    if (!target) return;
    const act = target.dataset.act;
    if (act === 'close-modal' && target.classList.contains('modal-backdrop') && e.target.closest('.modal')) return;
    switch (act) {
      case 'back': return back();
      case 'home': return go(homeView());
      case 'settings':
        S.prevView = S.view;
        return go('settings');
      case 'open-deck':
        S.deck = S.decks.find((d) => d.id === target.dataset.id);
        S.topic = 'all';
        return go('deck');
      case 'dismiss-install':
        store.set(K.installSeen, true);
        return render();
      case 'topic':
        S.topic = target.dataset.topic;
        return render();
      case 'study': return startSession();
      case 'more-new': {
        const today = todayOf(S.deck);
        today.extra += 10;
        saveToday(S.deck, today);
        return startSession();
      }
      case 'flip': {
        if (e.target.closest('.speak')) return;
        return flip();
      }
      case 'rate': return rate(Number(target.dataset.g));
      case 'undo': return undo();
      case 'end-session':
        S.session = null;
        return go('deck');
      case 'speak':
        e.stopPropagation();
        return speak(target.dataset.text, target.dataset.lang);
      case 'browse':
        S.query = '';
        return go('browse');
      case 'word': {
        const c = S.deck.cards.find((x) => x.id === target.dataset.id);
        S.modal = { type: 'word', id: target.dataset.id };
        render();
        if (c) speak(c.term);
        return;
      }
      case 'toggle-star': {
        const ov = starOverrides(S.deck);
        const c = S.deck.cards.find((x) => x.id === target.dataset.id);
        ov[c.id] = !isStarred(S.deck, c, ov);
        store.set(K.stars(S.deck.id), ov);
        return render();
      }
      case 'close-modal':
        S.modal = null;
        return render();
      case 'quiz': return startQuiz();
      case 'answer': return answerQuiz(target.dataset.id);
      case 'quiz-next':
        S.quiz.i++;
        render();
        return autoSpeakQuiz();
      case 'set':
        settings[target.dataset.key] = JSON.parse(target.dataset.val);
        saveSettings();
        return render();
      case 'backup': return backup();
      case 'reset':
        S.modal = { type: 'confirm', text: t('resetConfirm'), action: 'reset' };
        return render();
      case 'confirm-yes':
        if (S.modal && S.modal.action === 'reset') {
          store.del(K.progress(S.deck.id));
          store.del(K.today(S.deck.id));
        }
        S.modal = null;
        return go('deck');
    }
  });
  app.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.act === 'toggle') {
      settings[el.dataset.key] = el.checked;
      saveSettings();
      render();
    } else if (el.dataset.act === 'restore' && el.files[0]) restore(el.files[0]);
  });
  app.addEventListener('input', (e) => {
    if (e.target.id === 'search') {
      S.query = e.target.value;
      app.querySelector('#browse-results').innerHTML = browseResults();
    }
  });
  app.addEventListener('keydown', (e) => {
    if (e.target.classList && e.target.classList.contains('flashcard') && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      flip();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (S.view !== 'study' || e.target.tagName === 'INPUT') return;
    if (e.key === ' ' && !S.session.flipped) {
      e.preventDefault();
      flip();
    } else if (S.session.flipped && ['1', '2', '3', '4'].includes(e.key)) rate(Number(e.key));
    else if ((e.metaKey || e.ctrlKey) && e.key === 'z') undo();
  });

  // ---------- boot ----------
  async function boot() {
    render();
    try {
      S.decks = await loadDecks();
      if (!S.decks.length) throw new Error('no decks');
      if (S.decks.length === 1) S.deck = S.decks[0];
      S.view = homeView();
    } catch (err) {
      console.error(err);
      S.view = 'error';
    }
    render();
  }
  if ('serviceWorker' in navigator && window.__FC_BUILD__ && !window.__FC_DATA__ && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  boot();
})();
