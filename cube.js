/*
 * A tiny Rubik's cube model plus two SVG renderers.
 *
 * The cube is 54 stickers. Each sticker knows which cubie it sits on (p),
 * which way it faces (n), the face it belongs to when solved (face) and the
 * cubie it started on (home). Turning a face rotates p and n for every
 * sticker in that layer.
 *
 * Axes: x points right, y points up, z points toward you.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Cube = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const NORMALS = {
    U: [0, 1, 0], D: [0, -1, 0],
    F: [0, 0, 1], B: [0, 0, -1],
    R: [1, 0, 0], L: [-1, 0, 0],
  };

  function solved() {
    const stickers = [];
    for (const face of Object.keys(NORMALS)) {
      const n = NORMALS[face];
      const axis = n.findIndex((v) => v !== 0);
      for (let a = -1; a <= 1; a++) {
        for (let b = -1; b <= 1; b++) {
          const p = [0, 0, 0];
          p[axis] = n[axis];
          p[(axis + 1) % 3] = a;
          p[(axis + 2) % 3] = b;
          stickers.push({ p, n: n.slice(), face, home: p.slice() });
        }
      }
    }
    return stickers;
  }

  // [axis, layers along that axis, direction]
  // direction -1 is clockwise seen from the positive end of the axis (R, U, F);
  // +1 is clockwise seen from the negative end (L, D, B).
  const MOVES = {
    R: [0, [1], -1], L: [0, [-1], 1], M: [0, [0], 1],
    U: [1, [1], -1], D: [1, [-1], 1], E: [1, [0], 1],
    F: [2, [1], -1], B: [2, [-1], 1], S: [2, [0], -1],
    r: [0, [0, 1], -1], l: [0, [-1, 0], 1],
    u: [1, [0, 1], -1], d: [1, [-1, 0], 1],
    f: [2, [0, 1], -1], b: [2, [-1, 0], 1],
    x: [0, [-1, 0, 1], -1], y: [1, [-1, 0, 1], -1], z: [2, [-1, 0, 1], -1],
  };

  function quarterTurn(v, axis, dir) {
    const a = (axis + 1) % 3;
    const b = (axis + 2) % 3;
    const out = v.slice();
    out[a] = dir > 0 ? -v[b] : v[b];
    out[b] = dir > 0 ? v[a] : -v[a];
    return out;
  }

  const TOKEN = /^([RLUDFBMESrludfbxyz])(w?)(2?)('?)$/;

  // "F (R U R' U') F'" -> [{ base: 'F', times: 1 }, ...]. Brackets only group.
  function parse(alg) {
    return alg
      .replace(/[()]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => {
        const m = TOKEN.exec(token);
        if (!m) throw new Error('Unknown move "' + token + '" in "' + alg + '"');
        const base = m[2] ? m[1].toLowerCase() : m[1];
        const times = m[3] ? 2 : m[4] ? 3 : 1;
        return { base, times };
      });
  }

  function apply(state, alg) {
    let s = state;
    for (const { base, times } of parse(alg)) {
      const [axis, layers, dir] = MOVES[base];
      for (let i = 0; i < times; i++) {
        s = s.map((st) =>
          layers.includes(st.p[axis])
            ? { ...st, p: quarterTurn(st.p, axis, dir), n: quarterTurn(st.n, axis, dir) }
            : st
        );
      }
    }
    return s;
  }

  function invert(alg) {
    return parse(alg)
      .reverse()
      .map(({ base, times }) => base + (times === 2 ? '2' : times === 1 ? "'" : ''))
      .join(' ');
  }

  // The position a case starts from: the one its algorithm solves.
  function caseState(alg) {
    return apply(solved(), invert(alg));
  }

  const key = (p, n) => p.map(Number).join() + '|' + n.map(Number).join();

  function lookup(state) {
    const map = new Map();
    for (const st of state) map.set(key(st.p, st.n), st);
    return (p, n) => map.get(key(p, n));
  }

  const pieceKind = (p) => ['center', 'edge', 'corner'][p.filter((v) => v !== 0).length - 1];

  /*
   * Where the top-layer pieces travel when alg is performed, as arrows on the
   * 3x3 top-face grid ([col, row], back row first). Only meaningful for
   * algorithms that keep the top face one colour.
   */
  function topArrows(alg, kinds) {
    const after = apply(solved(), alg);
    const cell = (p) => [p[0] + 1, p[2] + 1];
    const moves = [];
    for (const st of after) {
      if (st.n[1] !== 1 || st.face !== 'U') continue;
      const kind = pieceKind(st.p);
      if (!kinds.includes(kind)) continue;
      if (st.p.join() === st.home.join()) continue;
      moves.push({ from: cell(st.home), to: cell(st.p) });
    }
    const arrows = [];
    const used = new Set();
    moves.forEach((m, i) => {
      if (used.has(i)) return;
      const back = moves.findIndex(
        (o, j) => j !== i && o.from.join() === m.to.join() && o.to.join() === m.from.join()
      );
      if (back >= 0) used.add(back);
      arrows.push({ from: m.from, to: m.to, both: back >= 0 });
    });
    return arrows;
  }

  const fmt = (v) => Math.round(v * 100) / 100;

  /*
   * Looking straight down at the top face. The thin bars around the grid are
   * the side stickers of the top layer.
   * paint(sticker, { kind, side }) returns a CSS class suffix, or null to skip.
   */
  function topView(state, opt) {
    const at = lookup(state);
    const cell = 23, gap = 2.5, start = 13, bar = 6, near = 4, far = 90;
    const pos = (i) => start + i * (cell + gap);
    const parts = [];
    const rect = (x, y, w, h, r, cls) =>
      parts.push(`<rect class="st st-${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>`);

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const p = [col - 1, 1, row - 1];
        const cls = opt.paint(at(p, NORMALS.U), { kind: pieceKind(p), side: false });
        if (cls) rect(pos(col), pos(row), cell, cell, 3, cls);
      }
    }
    for (let i = 0; i < 3; i++) {
      const sides = [
        { p: [i - 1, 1, -1], n: NORMALS.B, box: [pos(i), near, cell, bar] },
        { p: [i - 1, 1, 1], n: NORMALS.F, box: [pos(i), far, cell, bar] },
        { p: [-1, 1, i - 1], n: NORMALS.L, box: [near, pos(i), bar, cell] },
        { p: [1, 1, i - 1], n: NORMALS.R, box: [far, pos(i), bar, cell] },
      ];
      for (const { p, n, box } of sides) {
        const cls = opt.paint(at(p, n), { kind: pieceKind(p), side: true });
        if (cls) rect(box[0], box[1], box[2], box[3], 2, cls);
      }
    }

    for (const arrow of opt.arrows || []) {
      const centre = ([c, r]) => [pos(c) + cell / 2, pos(r) + cell / 2];
      parts.push(arrowSVG(centre(arrow.from), centre(arrow.to), arrow.both, 5));
    }

    return `<svg class="cube cube-top" viewBox="0 0 100 100" role="img" aria-label="${opt.label}">${parts.join('')}</svg>`;
  }

  // An arrow between two points in a picture, pulled in from each end by inset.
  function arrowSVG([x1, y1], [x2, y2], both, inset) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
    const head = 6, half = 3.6;
    const tip = [x2 - ux * inset, y2 - uy * inset];
    const tail = [x1 + ux * inset, y1 + uy * inset];
    const headAt = (t, dir) => {
      const bx = t[0] - ux * head * dir, by = t[1] - uy * head * dir;
      return {
        base: [bx, by],
        svg: `<polygon class="arrow-head" points="${fmt(t[0])},${fmt(t[1])} ${fmt(bx - uy * half)},${fmt(by + ux * half)} ${fmt(bx + uy * half)},${fmt(by - ux * half)}"/>`,
      };
    };
    const end = headAt(tip, 1);
    const begin = both ? headAt(tail, -1) : { base: tail, svg: '' };
    return (
      `<line class="arrow-line" x1="${fmt(begin.base[0])}" y1="${fmt(begin.base[1])}" x2="${fmt(end.base[0])}" y2="${fmt(end.base[1])}"/>` +
      begin.svg + end.svg
    );
  }

  /*
   * A three-quarter view: the front face large, one side face beside it and
   * the top above. view 'right' shows the right face, 'left' the left face.
   * paint(sticker) returns a CSS class suffix.
   * Optional extras, all in cube units (the cube runs from -1.5 to 1.5 on
   * each axis): outline is a list of 3D polygons to trace on top, arrows a
   * list of { from, to, both } between 3D points, and turn is how far round
   * to the side the camera sits, in degrees (30 unless given; past 45 the
   * side face becomes the big one).
   */
  function isoView(state, opt) {
    const at = lookup(state);
    const left = opt.view === 'left';
    // The camera sits a little to one side of the front, and above it.
    const turn = ((left ? -1 : 1) * (opt.turn || 30) * Math.PI) / 180;
    const tilt = (28 * Math.PI) / 180;
    const k = 20;
    const across = [Math.cos(turn), 0, -Math.sin(turn)];
    const up = [-Math.sin(turn) * Math.sin(tilt), Math.cos(tilt), -Math.cos(turn) * Math.sin(tilt)];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const project = (v) => [dot(v, across) * k, -dot(v, up) * k];
    const points = (corners) => corners.map((v) => project(v).map(fmt).join(',')).join(' ');
    const quad = (centre, a, b, h) =>
      [[h, h], [h, -h], [-h, -h], [-h, h]].map(([da, db]) => {
        const v = centre.slice();
        v[a] += da;
        v[b] += db;
        return v;
      });

    const body = [];
    const stickers = [];
    for (const n of [NORMALS.U, NORMALS.F, left ? NORMALS.L : NORMALS.R]) {
      const axis = n.findIndex((v) => v !== 0);
      const a = (axis + 1) % 3, b = (axis + 2) % 3;
      body.push(`<polygon class="cube-body" points="${points(quad(n.map((v) => v * 1.5), a, b, 1.5))}"/>`);
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const p = n.slice();
          p[a] = i;
          p[b] = j;
          const centre = p.map((v, idx) => v + n[idx] * 0.5);
          const cls = opt.paint(at(p, n));
          stickers.push(`<polygon class="st st-${cls}" points="${points(quad(centre, a, b, 0.4))}"/>`);
        }
      }
    }

    const outline = (opt.outline || []).map((shape) => `<polygon class="cube-outline" points="${points(shape)}"/>`);
    const arrows = (opt.arrows || []).map((arrow) => arrowSVG(project(arrow.from), project(arrow.to), arrow.both, 0));

    return `<svg class="cube cube-iso" viewBox="-44 -50 88 100" role="img" aria-label="${opt.label}">${body.join('')}${stickers.join('')}${outline.join('')}${arrows.join('')}</svg>`;
  }

  return { NORMALS, solved, parse, apply, invert, caseState, lookup, pieceKind, topArrows, topView, isoView };
});
