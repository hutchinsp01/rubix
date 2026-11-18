/*
 * Every case on the page, in the order you meet them in a solve.
 *
 * Brackets in an algorithm only group moves into chunks. Pictures are drawn
 * from the algorithm itself (see cube.js), so changing an algorithm changes
 * its picture. Run `node verify.js` after editing.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.STAGES = api.stages;
    root.CHUNKS = api.chunks;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /*
   * Bracketed chunks that have a name of their own. Hovering a chunk shows
   * its name and note, plus every other case that uses the same chunk.
   */
  const chunks = {
    "R U R' U'": {
      name: 'Righty',
      note: 'The most common chunk in cubing, done with the right hand. Six in a row puts the cube back where it started.',
    },
    "R' F R F'": {
      name: 'Sledgehammer',
      note: 'The other chunk worth knowing by name.',
    },
    "r U R' U'": {
      name: 'Wide righty',
      note: 'Righty with a two-layer first turn.',
    },
    "r' F R F'": {
      name: 'Wide sledgehammer',
      note: 'The sledgehammer with a two-layer first turn.',
    },
  };

  const stages = [
    {
      /*
       * The first two steps build the white layer on the bottom. Each picture
       * shows the piece in the top layer, above the outlined spot it's headed
       * for: the front-bottom edge here, the front-right bottom corner next.
       */
      id: 'cross',
      title: 'White cross',
      jargon: 'the four white edges',
      short: 'White cross',
      intro:
        "Hold the cube with the yellow centre on top and the white centre underneath, and keep it that way for the whole solve. Start with the four edges that have white on them. Get each one into the top layer first: if it's lower down, turn the face it's on until it comes up, turn the top to move it aside, then turn that face back. Then send them down one at a time. The spot an edge is headed for is outlined in white.",
      cases: [
        {
          id: 'cross-up',
          name: 'Edge with white on top',
          alg: 'F2',
          tip: "Turn the top until the edge's side colour is above the centre of the same colour, facing you. Two turns of the front carry it to the bottom.",
        },
        {
          id: 'cross-front',
          name: 'Edge with white facing you',
          alg: "U' R' F R",
          tip: 'White faces you instead of up. Turn the top until the colour on top of the edge matches the centre in front of you, then tuck it in round the side.',
        },
      ],
    },
    {
      id: 'corners',
      title: 'White corners',
      jargon: 'finishing the white layer',
      short: 'White corners',
      intro:
        "Next, the four corners with white on them. Find one in the top layer and read its other two colours. Turn the top until it sits between the centres of those two colours, then hold that corner at your front-right. It is now directly above the gap it belongs in, and the way its white sticker faces picks the card. If a white corner is stuck in the bottom layer, hold it at your front-right and do `R U R' U'` once to bring it up. That same chunk, repeated, solves any of these: it never takes more than five goes.",
      cases: [
        {
          id: 'corner-right',
          name: 'Corner with white facing right',
          alg: "R U R'",
          tip: 'White faces out to the right. Three moves drop it in.',
        },
        {
          id: 'corner-front',
          name: 'Corner with white facing you',
          alg: "F' U' F",
          tip: 'White faces you. This is the mirror image of the one before, done with the front face.',
        },
        {
          id: 'corner-up',
          name: 'Corner with white on top',
          alg: "(R U R' U') (R U R' U') (R U R' U')",
          tip: 'White faces up. The same four moves, three times over.',
        },
      ],
    },
    {
      /*
       * With the white layer done, this step places the four middle edges.
       * `side` says which gap a case fills and which side its picture is
       * drawn from; `anySlot` marks a case that looks the same from either
       * side, so one card covers every gap.
       */
      id: 'f2l',
      title: 'Middle layer',
      jargon: 'second layer',
      short: 'Middle layer',
      intro:
        "Start with the white layer finished and on the bottom, every corner matching the centres beside it. Four edges are left to place in the middle. Find one in the top layer with no yellow on it, and turn the top until its side colour sits above the matching centre, straight in front of you. Its top colour tells you which way it goes. The gap it's headed for is outlined in white.",
      cases: [
        {
          id: 'f2l-edge-right',
          name: 'Edge to the right',
          side: 'right',
          alg: "(U R U' R') (U' F' U F)",
          tip: 'The edge is lined up at the front and its top colour matches the centre on the right, so it belongs in the gap at your front-right.',
        },
        {
          id: 'f2l-edge-left',
          name: 'Edge to the left',
          side: 'left',
          alg: "(U' L' U L) (U F U' F')",
          tip: 'The edge is lined up at the front and its top colour matches the centre on the left, so it belongs in the gap at your front-left.',
        },
        {
          id: 'f2l-edge-flipped',
          name: 'Edge in, flipped',
          side: 'right',
          anySlot: true,
          alg: "(F' U2 F) U' (F' U2 F) U' (R U R')",
          tip: 'The edge is in its own gap but turned over, so its two colours sit on the wrong faces. Works for any gap: turn the cube so it sits at your front-right. The same lift twice flips it.',
        },
        // `swap` marks the one case that involves two gaps: front-right and back-right.
        {
          id: 'f2l-edge-swap',
          name: 'Two edges swapped',
          side: 'right',
          anySlot: true,
          swap: true,
          alg: 'R2 U2 R2 U2 R2',
          tip: "Two edges sit in each other's gaps, on the same face. Turn the cube so that face is on your right. It only works if both already show the right face's colour on the right, as pictured. If they don't, lift one out with Edge to the right instead.",
        },
      ],
      // A second heading inside the step, placed before the named case.
      subhead: {
        before: 'f2l-edge-flipped',
        title: 'When an edge is in the wrong place',
        intro:
          "If an edge is stuck in a gap that isn't its own, hold that gap at your front-right and do Edge to the right once. A top-layer edge takes its place and the stuck one comes up to the top, ready to line up. These two are shortcuts: one for an edge turned over in its own gap, one for two edges that have traded places.",
      },
    },
    {
      id: 'eo',
      title: 'Yellow cross',
      jargon: 'OLL, first look',
      short: 'Yellow cross',
      intro:
        'Yellow goes on top from here on. Ignore the corners and look only at the edges of the top face. If you already have a yellow cross, skip to the next step.',
      cases: [
        {
          id: 'eo-dot',
          name: 'Dot',
          alg: "F (R U R' U') F' f (R U R' U') f'",
          tip: 'No yellow edges on top. Any way round works: this is the Line algorithm followed by the L algorithm.',
        },
        {
          id: 'eo-l',
          name: 'L shape',
          alg: "f (R U R' U') f'",
          tip: 'Two yellow edges that touch. Hold them at the front and the right.',
        },
        {
          id: 'eo-line',
          name: 'Line',
          alg: "F (R U R' U') F'",
          tip: 'Two yellow edges opposite each other. Hold the line running left to right.',
        },
      ],
    },
    {
      id: 'co',
      title: 'Yellow face',
      jargon: 'OLL, second look',
      short: 'Yellow face',
      intro:
        'Count the corners that are yellow on top, then check where the others show their yellow. Turn the top layer until it matches a picture.',
      cases: [
        {
          id: 'co-sune',
          name: 'Sune',
          alg: "(R U R' U) (R U2 R')",
          tip: 'One corner yellow on top. Hold it front-left. The front-right corner shows yellow facing you.',
        },
        {
          id: 'co-antisune',
          name: 'Anti-Sune',
          alg: "(R U2 R') (U' R U' R')",
          tip: 'One corner yellow on top. Hold it back-right. The front-left corner shows yellow facing you.',
        },
        {
          id: 'co-h',
          name: 'Double headlights',
          aka: 'H',
          alg: "(R U R' U) (R U' R' U) (R U2 R')",
          tip: 'No corners yellow on top, and yellow shows in two matching pairs. Hold the pairs facing left and right.',
        },
        {
          id: 'co-pi',
          name: 'Pi',
          alg: "R U2 (R2 U' R2 U') R2 U2 R",
          tip: 'No corners yellow on top, and only one matching pair. Hold the pair on the left. The other two face front and back.',
        },
        {
          id: 'co-headlights',
          name: 'Headlights',
          aka: 'U',
          alg: "R2 D (R' U2 R) D' (R' U2 R')",
          tip: 'Two corners yellow on top, side by side. Hold them at the back. The front two show yellow facing you.',
        },
        {
          id: 'co-chameleon',
          name: 'Chameleon',
          aka: 'T',
          alg: "(r U R' U') (r' F R F')",
          tip: 'Two corners yellow on top, side by side. Hold them on the right. The left two face front and back.',
        },
        {
          id: 'co-bowtie',
          name: 'Bowtie',
          aka: 'L',
          alg: "F' (r U R' U') r' F R",
          tip: 'Two corners yellow on top, diagonal from each other. Hold them back-right and front-left, so the front-right corner shows yellow facing you.',
        },
      ],
    },
    {
      id: 'cp',
      title: 'Corners into place',
      jargon: 'PLL, first look',
      short: 'Corners',
      intro:
        'The top is all yellow, so now read the side colours, and only on the corners. Two corners that match on one side are called headlights. If all four sides have them, skip to the next step. Your colours will differ from the pictures; match the pattern.',
      cases: [
        {
          id: 'cp-t',
          name: 'Headlights on one side',
          aka: 'T perm',
          alg: "(R U R' U') (R' F R2 U') R' U' (R U R' F')",
          tip: 'Exactly one side has matching corners. Hold that side on the left. The two right-hand corners swap.',
        },
        {
          id: 'cp-y',
          name: 'No headlights',
          aka: 'Y perm',
          alg: "F (R U' R' U') (R U R' F') (R U R' U') (R' F R F')",
          tip: 'No side has matching corners. Any way round works. Two diagonal corners swap.',
        },
      ],
    },
    {
      id: 'ep',
      title: 'Edges into place',
      jargon: 'PLL, second look',
      short: 'Edges',
      intro:
        'Turn the top layer until every corner sits above its matching centre. Then turn the whole cube to match a picture. The algorithm finishes the solve.',
      cases: [
        {
          id: 'ep-ua',
          name: 'Three edges, front to right',
          aka: 'Ua perm',
          alg: "(R U' R U) (R U R U') (R' U' R2)",
          alt: "M2 U M U2 M' U M2",
          tip: 'One side is fully solved. Hold it at the back. The front edge belongs on the right.',
        },
        {
          id: 'ep-ub',
          name: 'Three edges, front to left',
          aka: 'Ub perm',
          alg: "(R2 U R U) (R' U' R' U') (R' U R')",
          alt: "M2 U' M U2 M' U' M2",
          tip: 'One side is fully solved. Hold it at the back. The front edge belongs on the left.',
        },
        {
          id: 'ep-h',
          name: 'Opposite swap',
          aka: 'H perm',
          alg: 'M2 U M2 U2 M2 U M2',
          tip: 'Every edge belongs on the opposite side. Any way round works.',
        },
        {
          id: 'ep-z',
          name: 'Neighbour swap',
          aka: 'Z perm',
          alg: "(M' U M2 U) (M2 U M' U2) M2 U'",
          tip: 'Every edge belongs on a side next to it. Hold it so the front edge belongs on the left.',
        },
      ],
    },
  ];

  return { stages, chunks };
});
