/*
 * Verger — niveaux. kinds = nombre de variétés (2-4) ; moves = coups ;
 * goal = { kind: 'pomme'|…|'toute', count } récoltes visées.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.VergerLevels = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  return {
    levels: [
      { name: 'Première cueillette', w: 6, h: 6, kinds: 2, moves: 6, goal: { kind: 'toute', count: 40 } },
      { name: 'Rouges', w: 6, h: 6, kinds: 2, moves: 6, goal: { kind: 'pomme', count: 36 } },
      { name: 'Panier mixte', w: 7, h: 6, kinds: 3, moves: 6, goal: { kind: 'toute', count: 42 } },
      { name: 'Prunes', w: 7, h: 6, kinds: 3, moves: 6, goal: { kind: 'prune', count: 30 } },
      { name: 'Greffe serrée', w: 7, h: 7, kinds: 3, moves: 6, goal: { kind: 'poire', count: 28 } },
      { name: 'Quatre saisons', w: 8, h: 7, kinds: 4, moves: 7, goal: { kind: 'toute', count: 52 } },
      { name: 'Cerises noires', w: 8, h: 7, kinds: 4, moves: 8, goal: { kind: 'cerise', count: 32 } },
      { name: 'Économie', w: 6, h: 6, kinds: 3, moves: 3, goal: { kind: 'toute', count: 32 } },
      { name: 'Le grand verger', w: 8, h: 8, kinds: 4, moves: 8, goal: { kind: 'prune', count: 38 } },
      { name: 'Toutes variétés', w: 8, h: 8, kinds: 4, moves: 9, goal: { kind: 'pomme', count: 40 } },
      { name: 'Sève montante', w: 7, h: 8, kinds: 4, moves: 5, goal: { kind: 'toute', count: 58 } },
      { name: 'La dernière récolte', w: 8, h: 8, kinds: 4, moves: 9, goal: { kind: 'cerise', count: 38 } }
    ]
  };
});
