/*
 * Checks every algorithm in cases.js on a simulated cube.
 * Run with: node verify.js
 */
'use strict';

const Cube = require('./cube.js');
const { stages: STAGES, chunks: CHUNKS } = require('./cases.js');

const N = Cube.NORMALS;
const isHome = (st) => st.p.join() === st.home.join() && st.n.join() === N[st.face].join();
const topLayer = (state) => state.filter((st) => st.p[1] === 1);
const yellowUp = (state, kind) =>
  topLayer(state).filter((st) => st.face === 'U' && st.n[1] === 1 && Cube.pieceKind(st.p) === kind);
const cells = (stickers) => stickers.map((st) => st.p[0] + ',' + st.p[2]).sort().join(' ');
const fullState = (state) =>
  state.map((st) => st.face + st.home.join('') + '>' + st.p.join('') + '/' + st.n.join('')).sort().join(';');

// What each case should look like before its algorithm is applied.
const EXPECT = {
  // white layer: which way the piece's white sticker faces before it goes in
  'cross-up': { white: 'U' },
  'cross-front': { white: 'F' },
  'corner-right': { white: 'R' },
  'corner-front': { white: 'F' },
  'corner-up': { white: 'U' },
  // middle layer: where the edge starts
  'f2l-edge-right': { edge: 'front' },
  'f2l-edge-left': { edge: 'front' },
  'f2l-edge-flipped': { edge: 'flipped' },
  'f2l-edge-swap': { edge: 'swapped' },
  // yellow edges on top, as "x,z" cells (x: -1 left, 1 right; z: -1 back, 1 front)
  'eo-dot': { edges: '' },
  'eo-l': { edges: '0,1 1,0' },
  'eo-line': { edges: '-1,0 1,0' },
  // yellow corners on top
  'co-sune': { corners: '-1,1' },
  'co-antisune': { corners: '1,-1' },
  'co-h': { corners: '' },
  'co-pi': { corners: '' },
  'co-headlights': { corners: '-1,-1 1,-1' },
  'co-chameleon': { corners: '1,-1 1,1' },
  'co-bowtie': { corners: '-1,1 1,-1' },
  // number of corner and edge arrows on the top face
  'cp-t': { cornerArrows: 1 },
  'cp-y': { cornerArrows: 1 },
  'ep-ua': { cornerArrows: 0, edgeArrows: 3 },
  'ep-ub': { cornerArrows: 0, edgeArrows: 3 },
  'ep-h': { cornerArrows: 0, edgeArrows: 2 },
  'ep-z': { cornerArrows: 0, edgeArrows: 2 },
};

const problems = [];
let count = 0;

// The middle-layer gap a case fills: the edge at the front-right or front-left.
const gapOf = (c) => [c.side === 'left' ? -1 : 1, 0, 1].join();

for (const stage of STAGES) {
  for (const c of stage.cases) {
    count++;
    const fail = (msg) => problems.push(`${c.id}: ${msg}`);
    const state = Cube.caseState(c.alg);
    const expect = EXPECT[c.id] || {};

    if (stage.id === 'cross' || stage.id === 'corners') {
      // The piece starts in the top layer above its spot: the front-bottom edge
      // for the cross, the front-right bottom corner for the corners.
      const cross = stage.id === 'cross';
      const target = cross ? '0,-1,1' : '1,-1,1';
      const above = cross ? '0,1,1' : '1,1,1';
      const isCrossEdge = (st) => st.home[1] === -1 && Cube.pieceKind(st.home) === 'edge';
      const isWhiteCorner = (st) => st.home[1] === -1 && Cube.pieceKind(st.home) === 'corner';
      // What must already be in place and stay there: the other cross edges, and
      // for a corner the whole cross plus the other white corners.
      const kept = state.filter((st) => st.home.join() !== target && (isCrossEdge(st) || (!cross && isWhiteCorner(st))));
      if (!kept.every(isHome)) fail('disturbs white pieces that are already placed');
      const piece = state.filter((st) => st.home.join() === target);
      if (!piece.every((st) => st.p.join() === above)) fail('should start with the piece in the top layer above its spot');
      const white = piece.find((st) => st.face === 'D');
      if (white.n.join() !== N[expect.white].join()) fail('white is not facing the way the card says');
      continue;
    }

    if (stage.id === 'f2l') {
      // The white layer and the other middle edges must already be solved.
      const gap = gapOf(c);
      const backRight = '1,0,-1';
      const own = expect.edge === 'swapped' ? [gap, backRight] : [gap];
      const lower = state.filter((st) => st.home[1] <= 0);
      if (lower.some((st) => !own.includes(st.home.join()) && !isHome(st))) {
        fail('should start with everything but its own edges solved');
      }
      const edge = state.filter((st) => st.home.join() === gap);
      if (expect.edge === 'swapped') {
        // Each edge in the other's gap, both showing the right face's colour on the right.
        const other = state.filter((st) => st.home.join() === backRight);
        const traded = edge.every((st) => st.p.join() === backRight) && other.every((st) => st.p.join() === gap);
        const rightOnRight = [...edge, ...other].filter((st) => st.face === 'R').every((st) => st.n.join() === '1,0,0');
        if (!traded || !rightOnRight) fail("should start with the two right-hand edges in each other's gaps, right colour on the right");
      } else if (expect.edge === 'flipped') {
        const inGap = edge.every((st) => st.p.join() === gap);
        if (!inGap || edge.some(isHome)) fail('should start with the edge turned over in its own gap');
      } else if (expect.edge === 'front') {
        const front = edge.find((st) => st.face === 'F');
        if (front.p.join() !== '0,1,1' || front.n.join() !== '0,0,1') {
          fail('should start with the edge lined up above the front centre');
        }
      } else {
        fail('has nothing to be checked against in verify.js');
      }
      continue;
    }

    // Everything after the middle layer must leave the first two layers alone.
    for (const alg of [c.alg, c.alt].filter(Boolean)) {
      const lower = Cube.caseState(alg).filter((st) => st.p[1] <= 0);
      if (!lower.every(isHome)) fail(`"${alg}" breaks the first two layers`);
    }

    if (stage.id === 'eo') {
      if (cells(yellowUp(state, 'edge')) !== expect.edges) fail('yellow edges are not where the tip says');
    }
    if (stage.id === 'co') {
      if (yellowUp(state, 'edge').length !== 4) fail('should start from a finished yellow cross');
      if (cells(yellowUp(state, 'corner')) !== expect.corners) fail('yellow corners are not where the tip says');
    }
    if (stage.id === 'cp' || stage.id === 'ep') {
      if (yellowUp(state, 'corner').length + yellowUp(state, 'edge').length !== 8) fail('top face should be all yellow');
      const corners = Cube.topArrows(c.alg, ['corner']).length;
      const edges = Cube.topArrows(c.alg, ['edge']).length;
      if (corners !== expect.cornerArrows) fail(`expected ${expect.cornerArrows} corner arrows, got ${corners}`);
      if (expect.edgeArrows !== undefined && edges !== expect.edgeArrows) fail(`expected ${expect.edgeArrows} edge arrows, got ${edges}`);
    }
    if (c.alt && fullState(Cube.caseState(c.alt)) !== fullState(state)) {
      fail('the alternative algorithm solves a different position from the main one');
    }
  }
}

/*
 * A middle-layer case earns its own card only if turning the whole cube
 * can't make it one of the others. Describe where the edge sits relative to
 * its gap, with a front-left gap brought round to the front-right; two cards
 * with the same description are one case.
 */
const middle = STAGES.find((stage) => stage.id === 'f2l');
const seenFromGap = (c) => {
  const left = c.side === 'left';
  const state = Cube.apply(Cube.caseState(c.alg), left ? "y'" : '');
  const role = left ? { L: 'front', F: 'side' } : { F: 'front', R: 'side' };
  return state
    .filter((st) => st.home.join() === gapOf(c))
    .map((st) => `${role[st.face]} colour at ${st.p.join()} facing ${st.n.join()}`)
    .sort()
    .join('; ');
};
const views = middle.cases.map(seenFromGap);
if (new Set(views).size !== views.length) {
  problems.push('two middle-layer cards are the same case after turning the cube, so one of them is enough');
}

// The page says "Edge to the right" also pops a stuck edge out of the front-right gap.
{
  const after = Cube.apply(Cube.solved(), middle.cases.find((c) => c.id === 'f2l-edge-right').alg);
  const stuck = after.filter((st) => st.home.join() === '1,0,1');
  const rest = after.filter((st) => st.home[1] <= 0 && st.home.join() !== '1,0,1');
  if (!stuck.every((st) => st.p[1] === 1)) problems.push('Edge to the right should lift the front-right edge to the top layer');
  if (!rest.every(isHome)) problems.push('Edge to the right should leave the rest of the first two layers alone');
}

/*
 * The white-corner step says two things about (R U R' U'): once brings a
 * stuck corner up from the front-right without disturbing the rest of the
 * white layer, and repeating it solves any corner above its gap in five goes
 * or fewer.
 */
{
  const righty = "R U R' U'";
  const whiteLayer = (state) => state.filter((st) => st.home[1] === -1);
  const corner = (state) => state.filter((st) => st.home.join() === '1,-1,1');

  const lifted = Cube.apply(Cube.solved(), righty);
  if (!corner(lifted).every((st) => st.p[1] === 1)) problems.push('Righty once should lift the front-right corner to the top layer');
  if (!whiteLayer(lifted).filter((st) => st.home.join() !== '1,-1,1').every(isHome)) {
    problems.push('Righty once should leave the rest of the white layer alone');
  }

  for (const c of STAGES.find((stage) => stage.id === 'corners').cases) {
    let state = Cube.caseState(c.alg);
    let goes = 0;
    while (goes < 5 && !whiteLayer(state).every(isHome)) {
      state = Cube.apply(state, righty);
      goes++;
    }
    if (!whiteLayer(state).every(isHome)) problems.push(`${c.id}: repeating Righty should solve it within five goes`);
  }
}

// Every named chunk must be bracketed in at least one algorithm, spelled the same way.
const bracketed = new Set();
for (const stage of STAGES) {
  for (const c of stage.cases) {
    for (const alg of [c.alg, c.alt].filter(Boolean)) {
      for (const m of alg.matchAll(/\(([^)]+)\)/g)) bracketed.add(m[1].trim().split(/\s+/).join(' '));
    }
  }
}
for (const key of Object.keys(CHUNKS)) {
  if (!bracketed.has(key)) problems.push(`chunk "${key}" is named but never appears in brackets`);
}
// The sexy move's note says six in a row does nothing.
if (!Cube.apply(Cube.solved(), "R U R' U' ".repeat(6)).every(isHome)) {
  problems.push("six (R U R' U') in a row should return to solved");
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`All ${count} cases check out.`);
