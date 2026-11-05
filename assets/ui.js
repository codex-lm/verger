/*
 * Verger — contrôleur : grille de fruits, sélection/échange, HUD objectif.
 */
(function () {
  'use strict';
  var E = window.VergerEngine, LV = window.VergerLevels.levels, I18N = window.VergerI18n, AU = window.VergerAudio;

  var SAVE_KEY = 'verger.save.v1';
  var save = { unlocked: 1, stars: {}, best: {}, lang: 'en', sound: true };
  try {
    var raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      var p = JSON.parse(raw);
      save = { unlocked: p.unlocked || 1, stars: p.stars || {}, best: p.best || {},
               lang: p.lang || 'en', sound: p.sound !== false };
    }
  } catch (e) {}
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
  function t(k) { return I18N.get(save.lang, k); }
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function show(node, on) { node.classList.toggle('hidden', !on); }

  var g = null;               // partie courante
  var levelIndex = 0;
  var selected = null;        // index de la case sélectionnée
  var busy = false;
  var cell = 56;

  function renderTexts() {
    document.documentElement.lang = save.lang;
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = t(nodes[i].getAttribute('data-i18n'));
    $('tagline').textContent = t('tagline');
    $('btn-play').textContent = save.unlocked > 1 ? t('continueGame') : t('play');
    $('btn-howto').textContent = t('howTo');
    $('btn-sound').textContent = (save.sound ? '♪ ' : '✕ ') + t(save.sound ? 'soundOn' : 'soundOff');
    $('btn-menu').textContent = '⌂';
    $('btn-menu').setAttribute('aria-label', t('menu'));
    renderLangPills();
    renderLevelGrid();
    if (g) renderHud();
  }

  function renderLangPills() {
    var box = $('langs');
    box.textContent = '';
    I18N.langs.forEach(function (code) {
      var b = el('button', 'pill' + (save.lang === code ? ' active' : ''), code.toUpperCase());
      b.addEventListener('click', function () { save.lang = code; persist(); AU.ui(); renderTexts(); });
      box.appendChild(b);
    });
  }

  function renderLevelGrid() {
    var grid = $('levelgrid');
    grid.textContent = '';
    LV.forEach(function (lvl, i) {
      var locked = i + 1 > save.unlocked;
      var chip = el('button', 'chip' + (locked ? ' locked' : ''), locked ? '•' : String(i + 1));
      if (!locked) {
        var stars = save.stars[i] || 0;
        chip.appendChild(el('span', 'chip-stars', stars ? '★'.repeat(stars) : ' '));
        chip.addEventListener('click', function () { AU.ui(); openLevel(i); });
      }
      grid.appendChild(chip);
    });
  }

  function cellSize() {
    var availW = Math.min(window.innerWidth - 28, 460);
    var availH = window.innerHeight - 330;
    return Math.max(28, Math.floor(Math.min(availW / g.w, availH / g.h, 56)));
  }

  var FRUIT = ['🍎', '🍐', '🍆', '🍒']; // pomme, poire, prune, cerise

  function buildBoard() {
    cell = cellSize();
    var board = $('board');
    board.textContent = '';
    board.style.width = g.w * cell + 'px';
    board.style.height = g.h * cell + 'px';
    for (var r = 0; r < g.h; r++) {
      for (var c = 0; c < g.w; c++) {
        var sq = el('div', 'fruit');
        sq.style.left = c * cell + 'px';
        sq.style.top = r * cell + 'px';
        sq.style.width = cell + 'px';
        sq.style.height = cell + 'px';
        sq.style.fontSize = Math.floor(cell * 0.52) + 'px';
        sq.setAttribute('data-i', r * g.w + c);
        sq.addEventListener('click', onFruitClick(sq.getAttribute('data-i')));
        board.appendChild(sq);
      }
    }
    renderFruits();
    renderHud();
  }

  function onFruitClick(iStr) {
    var i = Number(iStr);
    return function () { selectFruit(i); };
  }

  function renderFruits() {
    var board = $('board');
    var nodes = board.querySelectorAll('.fruit');
    for (var k = 0; k < nodes.length; k++) {
      var i = Number(nodes[k].getAttribute('data-i'));
      nodes[k].textContent = FRUIT[g.grid[i]];
      nodes[k].classList.toggle('sel', selected === i);
    }
  }

  function renderHud() {
    var lvl = LV[levelIndex];
    $('hud-level').textContent = t('level') + ' ' + (levelIndex + 1) + ' — ' + lvl.name;
    var goalKind = lvl.goal.kind === 'toute' ? t('any') : t(lvl.goal.kind);
    var have = lvl.goal.kind === 'toute'
      ? Object.keys(g.harvested).reduce(function (a, k) { return a + g.harvested[k]; }, 0)
      : (g.harvested[lvl.goal.kind] || 0);
    $('hud-goal').textContent = '🧺 ' + t('goal') + ' : ' + goalKind + ' ' + have + '/' + lvl.goal.count;
    $('hud-moves').textContent = '✋ ' + g.movesLeft + ' ' + t('movesLeft') + ' · ' + t('score') + ' ' + g.score;
    var pct = Math.min(100, 100 * have / lvl.goal.count);
    $('goalbar').style.width = pct + '%';
  }

  function openLevel(i) {
    levelIndex = i;
    g = E.createGame(LV[i], (Date.now() & 0xffffffff) >>> 0);
    selected = null;
    busy = false;
    show($('home'), false);
    show($('game'), true);
    buildBoard();
  }

  function goMenu() {
    g = null; busy = false;
    show($('game'), false);
    show($('home'), true);
    renderTexts();
  }

  function toast(msg) {
    var box = $('toast');
    box.textContent = msg;
    box.classList.add('on');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { box.classList.remove('on'); }, 1500);
  }

  function selectFruit(i) {
    if (!g || busy) return;
    AU.unlock();
    if (selected === null) { selected = i; renderFruits(); return; }
    if (selected === i) { selected = null; renderFruits(); return; }
    // adjacent ?
    var a = selected, b = i;
    var ar = Math.floor(a / g.w), ac = a % g.w;
    var br = Math.floor(b / g.w), bc = b % g.w;
    if (Math.abs(ar - br) + Math.abs(ac - bc) !== 1) {
      selected = i; renderFruits(); return; // re-sélectionne ailleurs
    }
    trySwap(ar, ac, br, bc);
    selected = null;
  }

  function trySwap(r1, c1, r2, c2) {
    var before = g.grid.slice();
    var res = E.swap(g, r1, c1, r2, c2);
    if (!res.ok) {
      if (res.reason === 'noMatch') { AU.swapFail(); toast(t('invalid')); }
      renderFruits();
      return;
    }
    busy = true;
    AU.pick(res.cascade);
    // animation : flash des cases récoltées puis rendu final
    var board = $('board');
    res.events.forEach(function (ev) {
      ev.cells.forEach(function (ci) {
        var node = board.querySelector('[data-i="' + ci + '"]');
        if (node) node.classList.add('harvested');
      });
    });
    setTimeout(function () {
      g.grid.forEach(function (v, ci) {
        var node = board.querySelector('[data-i="' + ci + '"]');
        if (node) node.classList.remove('harvested');
      });
      before = null;
      renderFruits();
      renderHud();
      busy = false;
      if (res.won) {
        AU.win();
        var stars = E.stars(g);
        save.stars[levelIndex] = Math.max(save.stars[levelIndex] || 0, stars);
        save.best[levelIndex] = Math.max(save.best[levelIndex] || 0, g.score);
        if (levelIndex + 2 > save.unlocked) save.unlocked = Math.min(LV.length, levelIndex + 2);
        persist();
        setTimeout(showWin, 450);
      } else if (res.lost) {
        AU.lose();
        setTimeout(showLost, 450);
      }
    }, 320);
  }

  // glisser un fruit vers son voisin
  (function () {
    var board = $('board');
    var dragFrom = null;
    board.addEventListener('pointerdown', function (ev) {
      if (!g || busy) return;
      AU.unlock();
      var node = ev.target.closest('.fruit');
      if (node) dragFrom = Number(node.getAttribute('data-i'));
    });
    board.addEventListener('pointerup', function (ev) {
      if (!g || busy || dragFrom === null) { dragFrom = null; return; }
      var node = document.elementFromPoint(ev.clientX, ev.clientY);
      node = node && node.closest ? node.closest('.fruit') : null;
      if (node) {
        var to = Number(node.getAttribute('data-i'));
        var a = dragFrom, b = to;
        var ar = Math.floor(a / g.w), ac = a % g.w;
        var br = Math.floor(b / g.w), bc = b % g.w;
        if (a !== b && Math.abs(ar - br) + Math.abs(ac - bc) === 1) {
          selected = null;
          trySwap(ar, ac, br, bc);
        } else {
          selectFruit(a);
        }
      }
      dragFrom = null;
    });
  })();

  // ---------------------------------------------------------------- overlays
  function overlay(content) {
    var card = $('overlay-card');
    card.textContent = '';
    card.appendChild(content);
    show($('overlay'), true);
  }
  function closeOverlay() { show($('overlay'), false); }

  function showRules() {
    var box = el('div', 'rules');
    box.appendChild(el('h2', null, t('rulesTitle')));
    [1, 2, 3, 4].forEach(function (n) { box.appendChild(el('p', null, t('rule' + n))); });
    var btn = el('button', 'primary', t('gotIt'));
    btn.addEventListener('click', function () { AU.ui(); closeOverlay(); });
    box.appendChild(btn);
    overlay(box);
  }

  function resultBox(title, subtitle, showStars) {
    var box = el('div', 'modal');
    box.appendChild(el('h2', null, title));
    if (subtitle) box.appendChild(el('p', null, subtitle));
    if (showStars) {
      var stars = E.stars(g);
      var row = el('div', 'star-row');
      for (var s = 0; s < 3; s++) row.appendChild(el('span', 'star' + (s < stars ? ' on' : ''), '★'));
      box.appendChild(row);
    }
    return box;
  }

  function showWin() {
    var isLast = levelIndex === LV.length - 1;
    var box;
    if (isLast) {
      var total = 0;
      LV.forEach(function (_, i) { total += save.best[i] || 0; });
      box = resultBox(t('finalTitle'), t('finalBody'));
      box.appendChild(el('p', 'big', t('total') + ' : ' + total));
      var again = el('button', 'primary', t('replayAll'));
      again.addEventListener('click', function () {
        AU.ui(); closeOverlay();
        save.unlocked = 1; save.stars = {}; save.best = {}; persist();
        openLevel(0);
      });
      box.appendChild(again);
    } else {
      box = resultBox(t('wonTitle'), g.score + ' ' + t('score'), true);
      var next = el('button', 'primary', t('next'));
      next.addEventListener('click', function () { AU.ui(); closeOverlay(); openLevel(levelIndex + 1); });
      box.appendChild(next);
    }
    var replay = el('button', null, t('replay'));
    replay.addEventListener('click', function () { AU.ui(); closeOverlay(); openLevel(levelIndex); });
    var menu = el('button', null, t('menu'));
    menu.addEventListener('click', function () { AU.ui(); closeOverlay(); goMenu(); });
    var row2 = el('div', 'btn-row');
    row2.appendChild(replay); row2.appendChild(menu);
    box.appendChild(row2);
    overlay(box);
  }

  function showLost() {
    var box = resultBox(t('lostTitle'), null, false);
    var replay = el('button', 'primary', t('replay'));
    replay.addEventListener('click', function () { AU.ui(); closeOverlay(); openLevel(levelIndex); });
    box.appendChild(replay);
    var menu = el('button', null, t('menu'));
    menu.addEventListener('click', function () { AU.ui(); closeOverlay(); goMenu(); });
    box.appendChild(menu);
    overlay(box);
  }

  // ---------------------------------------------------------------- boutons
  $('btn-play').addEventListener('click', function () {
    AU.ui(); AU.unlock();
    openLevel(Math.min(save.unlocked, LV.length) - 1);
  });
  $('btn-howto').addEventListener('click', function () { AU.ui(); showRules(); });
  $('btn-sound').addEventListener('click', function () {
    save.sound = !save.sound; persist();
    AU.setEnabled(save.sound);
    renderTexts();
    if (save.sound) AU.ui();
  });
  $('btn-menu').addEventListener('click', function () { AU.ui(); goMenu(); });
  $('overlay').addEventListener('click', function (ev) { if (ev.target === $('overlay')) closeOverlay(); });
  window.addEventListener('resize', function () { if (g && !busy) buildBoard(); });

  // hook QA (?debug=1)
  if (location.search.indexOf('debug=1') !== -1) {
    window.__verger = {
      g: function () { return g; },
      engine: E, levels: LV, save: save,
      open: openLevel,
      swap: function (r1, c1, r2, c2) { selected = null; trySwap(r1, c1, r2, c2); },
      bestSwap: function () {
        // trouve et joue le meilleur échange (pour QA)
        var best = null;
        for (var r = 0; r < g.h; r++) for (var c = 0; c < g.w; c++)
          for (var d = 0; d < 2; d++) {
            var r2 = r + (d === 0 ? 0 : 1), c2 = c + (d === 0 ? 1 : 0);
            if (r2 >= g.h || c2 >= g.w) continue;
            var probe = { w: g.w, h: g.h, kinds: g.kinds, moves: g.moves, movesLeft: g.movesLeft,
                          goal: g.goal, name: g.name, rngS: g.rngS, grid: g.grid.slice(),
                          score: g.score, harvested: JSON.parse(JSON.stringify(g.harvested)),
                          won: g.won, lost: g.lost, cascade: 0, events: [] };
            var res = E.swap(probe, r, c, r2, c2);
            if (res.ok && (!best || res.harvested > best.h)) best = { r: r, c: c, r2: r2, c2: c2, h: res.harvested };
          }
        if (best) { trySwap(best.r, best.c, best.r2, best.c2); return best.h; }
        return 0;
      }
    };
  }

  // ---------------------------------------------------------------- démarrage
  AU.setEnabled(save.sound);
  renderTexts();
  show($('home'), true);
})();
