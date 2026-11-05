/*
 * Verger — moteur pur (sans DOM) : match-3 à échanges, gravité, objectifs.
 * Grille d'arbres fruitiers ; échanger deux fruits adjacents (côté à côté) ;
 * l'échange doit produire un alignement de 3+ sinon il est refusé ;
 * les alignements sont récoltés, les fruits tombent (gravité), la canopée
 * repousse par le haut (type tiré du RNG seedé). Objectif par niveau :
 * récolter N fruits d'une variété (ou toutes variétés) en M coups.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.VergerEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var KINDS = ['pomme', 'poire', 'prune', 'cerise']; // rouge, jaune-vert, violette, rouge foncé
  var KIND_COLORS = { pomme: '#d1493a', poire: '#e5a63b', prune: '#7d5ba6', cerise: '#b03a52' };

  function rndNext(s) {
    s = (s + 0x6d2b79f5) | 0;
    var t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return { s: s, v: ((t ^ (t >>> 14)) >>> 0) / 4294967296 };
  }

  // level : { name, w, h, kinds, moves, goal: {kind or 'toute', count}, grid? (optionnel) }
  function createGame(level, seed) {
    var g = {
      w: level.w, h: level.h, kinds: level.kinds || 4,
      moves: level.moves, movesLeft: level.moves,
      goal: level.goal, name: level.name,
      rngS: (seed >>> 0) || 20261105,
      grid: [], score: 0, harvested: {}, won: false, lost: false,
      cascade: 0, events: []
    };
    for (var i = 0; i < level.w * level.h; i++) g.harvested[KINDS[i % 4]] = 0;
    // grille initiale : remplir par le RNG puis purger les alignements existants
    if (level.grid) {
      g.grid = level.grid.slice();
    } else {
      do {
        for (var c = 0; c < level.w * level.h; c++)
          g.grid[c] = Math.floor(rng(g) * g.kinds);
      } while (findMatches(g).length > 0);
    }
    return g;
  }

  function rng(g) {
    var r = rndNext(g.rngS);
    g.rngS = r.s;
    return r.v;
  }

  function at(g, r, c) { return g.grid[r * g.w + c]; }

  // toutes les cases des alignements de 3+ (horizontaux et verticaux)
  function findMatches(g) {
    var marks = [];
    for (var i = 0; i < g.w * g.h; i++) marks.push(false);
    // horizontaux
    for (var r = 0; r < g.h; r++) {
      var run = 1;
      for (var c = 1; c <= g.w; c++) {
        if (c < g.w && at(g, r, c) === at(g, r, c - 1) && at(g, r, c) >= 0) run++;
        else {
          if (run >= 3)
            for (var k = c - run; k < c; k++) marks[r * g.w + k] = true;
          run = 1;
        }
      }
    }
    // verticaux
    for (var c = 0; c < g.w; c++) {
      var run2 = 1;
      for (var r2 = 1; r2 <= g.h; r2++) {
        if (r2 < g.h && at(g, r2, c) === at(g, r2 - 1, c) && at(g, r2, c) >= 0) run2++;
        else {
          if (run2 >= 3)
            for (var k2 = r2 - run2; k2 < r2; k2++) marks[k2 * g.w + c] = true;
          run2 = 1;
        }
      }
    }
    var out = [];
    for (var m = 0; m < marks.length; m++) if (marks[m]) out.push(m);
    return out;
  }

  /*
   * Échanger deux cases adjacentes. Refusé si non adjacent ou si l'échange
   * ne produit aucun alignement (règle du verger : on ne secoue pas les
   * branches pour rien). Consomme un coup uniquement si accepté.
   */
  function swap(g, r1, c1, r2, c2) {
    if (g.won || g.lost) return { ok: false, reason: 'over' };
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return { ok: false, reason: 'far' };
    var i1 = r1 * g.w + c1, i2 = r2 * g.w + c2;
    var tmp = g.grid[i1];
    g.grid[i1] = g.grid[i2];
    g.grid[i2] = tmp;
    if (findMatches(g).length === 0) {
      // annule
      g.grid[i2] = g.grid[i1];
      g.grid[i1] = g.grid[i2];
      g.grid[i1] = tmp;
      return { ok: false, reason: 'noMatch' };
    }
    g.movesLeft--;
    return resolve(g, { swap: [i1, i2] });
  }

  // récolter → gravité → repousse → re-récolter (cascade), puis objectif/coups
  function resolve(g, info) {
    var events = [];
    var total = 0;
    g.cascade = 0;
    for (;;) {
      var matches = findMatches(g);
      if (matches.length === 0) break;
      g.cascade++;
      if (g.cascade > 2) break; // sève bornée : pas d'avalanche
      var byKind = {};
      for (var m = 0; m < matches.length; m++) {
        var kind = KINDS[g.grid[matches[m]]];
        g.harvested[kind] = (g.harvested[kind] || 0) + 1;
        byKind[kind] = (byKind[kind] || 0) + 1;
        g.grid[matches[m]] = -1;
        total++;
      }
      events.push({ type: 'harvest', cells: matches.slice(), byKind: byKind, cascade: g.cascade });
      // gravité
      for (var c = 0; c < g.w; c++) {
        var write = g.h - 1;
        for (var r = g.h - 1; r >= 0; r--) {
          if (g.grid[r * g.w + c] >= 0) {
            g.grid[write * g.w + c] = g.grid[r * g.w + c];
            write--;
          }
        }
        for (var r2 = write; r2 >= 0; r2--) g.grid[r2 * g.w + c] = Math.floor(rng(g) * g.kinds);
      }
    }
    g.score += total * 10 * (g.cascade >= 2 ? g.cascade : 1);
    // objectif
    var goalMet = g.goal.kind === 'toute'
      ? Object.keys(g.harvested).reduce(function (a, k) { return a + g.harvested[k]; }, 0) >= g.goal.count
      : (g.harvested[g.goal.kind] || 0) >= g.goal.count;
    if (goalMet) g.won = true;
    else if (g.movesLeft <= 0) g.lost = true;
    return { ok: true, won: g.won, lost: g.lost, harvested: total, cascade: g.cascade, events: events, info: info };
  }

  function stars(g) {
    if (!g.won) return 0;
    return g.movesLeft >= Math.ceil(g.moves / 3) ? 3 : g.movesLeft > 0 ? 2 : 1;
  }

  return { KINDS: KINDS, KIND_COLORS: KIND_COLORS, createGame: createGame,
           findMatches: findMatches, swap: swap, stars: stars, rng: rng };
});
