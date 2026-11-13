/* Builds the page from cases.js and keeps the marks in localStorage. */
(function () {
  'use strict';

  // The page was once called "After the cross". The key keeps that name so saved marks survive.
  const KEY = 'after-the-cross:v1';
  const data = load();
  const allCases = STAGES.flatMap((stage) => stage.cases);

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && typeof raw === 'object' && raw.marks) return raw;
    } catch (e) { /* fall through to a fresh start */ }
    return { marks: {}, onlyLearning: false };
  }

  function save() {
    let ok = true;
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      ok = false;
    }
    document.getElementById('save-note').textContent = ok
      ? 'Your marks are saved in this browser.'
      : "This browser is blocking storage, so marks won't survive a reload.";
  }

  const markFor = (id) => data.marks[id] || (data.marks[id] = { uses: 0, confident: false });

  const esc = (s) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const plain = (alg) => alg.replace(/[()]/g, '');

  const chunkKey = (text) => text.trim().split(/\s+/).join(' ');

  // Which cases use each bracketed chunk, so a chunk can point at the others.
  const usedIn = {};
  for (const c of allCases) {
    for (const alg of [c.alg, c.alt].filter(Boolean)) {
      for (const m of alg.matchAll(/\(([^)]+)\)/g)) {
        const list = usedIn[chunkKey(m[1])] || (usedIn[chunkKey(m[1])] = []);
        if (!list.includes(c)) list.push(c);
      }
    }
  }

  const elsewhere = (key, caseId) => (usedIn[key] || []).filter((c) => c.id !== caseId);
  const hasRef = (key, caseId) => Boolean(CHUNKS[key]) || elsewhere(key, caseId).length > 0;

  // "F (R U R' U') F'" -> moves, keeping each bracketed chunk on one line.
  // A chunk with a name, or one that other cases share, can be hovered.
  function algHTML(alg, caseId) {
    const move = (m) => `<span class="mv">${esc(m)}</span>`;
    const parts = [];
    const re = /\(([^)]+)\)|(\S+)/g;
    let m;
    while ((m = re.exec(alg))) {
      if (!m[1]) {
        parts.push(move(m[2]));
        continue;
      }
      const key = chunkKey(m[1]);
      const attrs = hasRef(key, caseId) ? ` data-chunk="${esc(key)}" tabindex="0"` : '';
      parts.push(`<span class="grp"${attrs}>(${key.split(' ').map(move).join(' ')})</span>`);
    }
    return parts.join(' ');
  }

  // How a case is named in a list: "T perm" rather than "Headlights on one side", otherwise its name.
  const caseLabel = (c) => (c.aka && c.aka.includes(' ') ? c.aka : c.name);
  // "A, B and C", or "A; B; C" when a name has a comma of its own.
  const sentenceList = (items) => {
    if (items.some((item) => item.includes(','))) return items.join('; ');
    return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
  };

  // What the hover card says about a chunk.
  function refHTML(key, caseId) {
    const named = CHUNKS[key];
    const others = elsewhere(key, caseId).map(caseLabel);
    return (
      (named ? `<strong>${esc(named.name)}</strong><span>${esc(named.note)}</span>` : '') +
      (others.length ? `<span>${caseId ? 'Also in' : 'In'} ${esc(sentenceList(others))}.</span>` : '')
    );
  }

  function diagram(stage, c) {
    const state = Cube.caseState(c.alg);

    if (stage.id === 'f2l') {
      // A gap is a middle-layer edge position: front-right or front-left,
      // plus back-right for the case that swaps two edges on the right face.
      const x = c.side === 'left' ? -1 : 1;
      const gaps = [[x, 0, 1].join()].concat(c.swap ? ['1,0,-1'] : []);
      // Each gap is traced where it shows: round the front corner, or flat on the right face.
      const outline = [[
        [x * 0.5, 0.5, 1.5], [x * 1.5, 0.5, 1.5], [x * 1.5, 0.5, 0.5],
        [x * 1.5, -0.5, 0.5], [x * 1.5, -0.5, 1.5], [x * 0.5, -0.5, 1.5],
      ]];
      if (c.swap) outline.push([[1.5, 0.5, -0.5], [1.5, 0.5, -1.5], [1.5, -0.5, -1.5], [1.5, -0.5, -0.5]]);

      return Cube.isoView(state, {
        view: c.side,
        label: esc(`${c.name}, before the algorithm`),
        paint(st) {
          // Shown in colour: centres, the finished white layer, and this case's edges.
          const whiteLayer = st.home[1] === -1;
          if (Cube.pieceKind(st.home) === 'center' || whiteLayer || gaps.includes(st.home.join())) return st.face;
          // Whatever else is sitting in a gap doesn't matter: show it empty.
          return gaps.includes(st.p.join()) ? 'any' : 'blank';
        },
        outline,
        // The swap is seen from further round, so the right face is the big one.
        turn: c.swap ? 60 : 30,
        arrows: c.swap ? [{ from: [1.5, 0, 0.95], to: [1.5, 0, -0.95], both: true }] : [],
      });
    }

    const label = esc(`${c.name}, before the algorithm`);

    const painters = {
      // Edges only: corners don't matter yet.
      eo: (st, { kind, side }) =>
        kind === 'corner' ? (side ? null : 'any') : st.face === 'U' ? 'U' : side ? null : 'blank',
      co: (st, { side }) => (st.face === 'U' ? 'U' : side ? null : 'blank'),
      // Corners only: edge colours don't matter yet.
      cp: (st, { kind, side }) => (side && kind === 'edge' ? 'any' : st.face),
      ep: (st) => st.face,
    };
    const arrows = { cp: ['corner'], ep: ['edge'] }[stage.id];
    return Cube.topView(state, {
      label,
      paint: painters[stage.id],
      arrows: arrows ? Cube.topArrows(c.alg, arrows) : [],
    });
  }

  function caseHTML(stage, c) {
    const algLine = (alg) => `<p class="alg" aria-label="${esc(plain(alg))}">${algHTML(alg, c.id)}</p>`;
    // Middle-layer cards are laid out by the side their gap is on.
    const slot = c.anySlot ? 'any' : c.side;
    const tag = c.aka ? ` <span class="aka">${esc(c.aka)}</span>` : '';

    return `
      <article class="cubie" id="${c.id}" data-id="${c.id}"${slot ? ` data-side="${slot}"` : ''}>
        <div class="sticker">
          <div class="case-top">
            <div class="tile">${diagram(stage, c)}</div>
            <div class="case-text">
              <h3>${esc(c.name)}${tag}</h3>
              <p class="tip">${esc(c.tip)}</p>
            </div>
          </div>
          ${algLine(c.alg)}
          ${c.alt ? `<p class="alt">Or, using the middle layer: <span class="alg" aria-label="${esc(plain(c.alt))}">${algHTML(c.alt, c.id)}</span></p>` : ''}
          <div class="track">
            <button type="button" class="plus" data-act="plus" aria-label="Add one use of ${esc(c.name)}">+1</button>
            <p class="uses"><span class="count"></span> <span class="uses-word"></span></p>
            <button type="button" class="quiet minus" data-act="minus" aria-label="Take one use off ${esc(c.name)}">Undo</button>
            <label class="confident"><input type="checkbox" data-act="confident"> Confident</label>
          </div>
        </div>
      </article>`;
  }

  // A step is one grid of cases, or two with a sub-heading between them.
  function gridsHTML(stage) {
    const grid = (cases) => `<div class="grid">${cases.map((c) => caseHTML(stage, c)).join('')}</div>`;
    const sub = stage.subhead;
    if (!sub) return grid(stage.cases);
    const at = stage.cases.findIndex((c) => c.id === sub.before);
    // `R U R'` in the text is set as moves and kept on one line.
    const prose = (text) => esc(text).replace(/`([^`]+)`/g, '<span class="moves">$1</span>');
    return `${grid(stage.cases.slice(0, at))}
      <div class="subhead">
        <h3>${esc(sub.title)}</h3>
        <p>${prose(sub.intro)}</p>
        ${sub.note ? `<p>${prose(sub.note)}</p>` : ''}
      </div>
      ${grid(stage.cases.slice(at))}`;
  }

  function render() {
    document.getElementById('stages').innerHTML = STAGES.map((stage, i) => `
      <section class="stage tone-${stage.id}" data-stage="${stage.id}" aria-labelledby="h-${stage.id}">
        <div class="stage-head">
          <span class="stage-num" aria-hidden="true"><span>${i + 1}</span></span>
          <div>
            <h2 id="h-${stage.id}">${esc(stage.title)} <span class="jargon">${esc(stage.jargon)}</span></h2>
            <p class="intro">${esc(stage.intro)}</p>
          </div>
        </div>
        <p class="all-done" hidden></p>
        ${gridsHTML(stage)}
      </section>`).join('');

    document.getElementById('map').innerHTML = STAGES.map((stage, i) => `
      <div class="map-group tone-${stage.id}">
        <div class="map-bar">${stage.cases.map((c) => `<a href="#${c.id}" data-map="${c.id}"></a>`).join('')}</div>
        <span class="map-label">${i + 1}. ${esc(stage.short)}</span>
      </div>`).join('');

    document.querySelectorAll('.case-count').forEach((el) => {
      el.textContent = allCases.length;
    });
  }

  function paintCase(c) {
    const mark = markFor(c.id);
    const card = document.getElementById(c.id);
    card.classList.toggle('is-confident', mark.confident);
    card.querySelector('.count').textContent = mark.uses;
    card.querySelector('.uses-word').textContent = mark.uses === 1 ? 'use' : 'uses';
    card.querySelector('[data-act="minus"]').hidden = mark.uses === 0;
    card.querySelector('[data-act="confident"]').checked = mark.confident;

    const dot = document.querySelector(`[data-map="${c.id}"]`);
    dot.classList.toggle('is-confident', mark.confident);
    const label = `${c.name}: ${mark.confident ? 'confident' : 'still learning'}, ${mark.uses} ${mark.uses === 1 ? 'use' : 'uses'}`;
    dot.title = label;
    dot.setAttribute('aria-label', label);
  }

  function paintSummary() {
    const confident = allCases.filter((c) => markFor(c.id).confident).length;
    document.getElementById('confident-count').textContent = confident;
    document.body.classList.toggle('only-learning', data.onlyLearning);
    document.getElementById('only-learning').checked = data.onlyLearning;

    for (const stage of STAGES) {
      const done = stage.cases.every((c) => markFor(c.id).confident);
      const note = document.querySelector(`[data-stage="${stage.id}"] .all-done`);
      note.hidden = !(done && data.onlyLearning);
      note.textContent = `All ${stage.cases.length} confident.`;
    }
  }

  function paintAll() {
    allCases.forEach(paintCase);
    paintSummary();
  }

  function bump(el) {
    el.classList.remove('bump');
    void el.offsetWidth; // restart the animation
    el.classList.add('bump');
  }

  document.getElementById('stages').addEventListener('click', (event) => {
    const control = event.target.closest('[data-act]');
    if (!control) return;
    const card = control.closest('.cubie');
    const c = allCases.find((item) => item.id === card.dataset.id);
    const mark = markFor(c.id);
    const act = control.dataset.act;

    if (act === 'plus') mark.uses += 1;
    else if (act === 'minus') mark.uses = Math.max(0, mark.uses - 1);
    else if (act === 'confident') mark.confident = control.checked;
    else return;

    save();
    paintCase(c);
    paintSummary();
    if (act === 'plus') bump(card.querySelector('.count'));
    if (act === 'minus' && mark.uses === 0) card.querySelector('[data-act="plus"]').focus();
  });

  // ---------- Hover card for bracketed chunks ----------

  const refCard = document.createElement('div');
  refCard.id = 'chunk-ref';
  refCard.className = 'ref';
  refCard.setAttribute('role', 'tooltip');
  refCard.hidden = true;
  document.body.appendChild(refCard);
  let refFor = null;

  function showRef(chunk) {
    if (refFor === chunk) return;
    hideRef();
    const card = chunk.closest('.cubie');
    refCard.innerHTML = refHTML(chunk.dataset.chunk, card ? card.dataset.id : null);
    refCard.hidden = false;
    chunk.setAttribute('aria-describedby', refCard.id);
    refFor = chunk;

    // Sit above the chunk, or below it when there's no room, and stay on screen.
    const gap = 8;
    const box = chunk.getBoundingClientRect();
    const size = refCard.getBoundingClientRect();
    const maxLeft = document.documentElement.clientWidth - size.width - gap;
    const left = Math.max(gap, Math.min(box.left + box.width / 2 - size.width / 2, maxLeft));
    const above = box.top - size.height - gap;
    refCard.style.left = `${left}px`;
    refCard.style.top = `${above >= gap ? above : box.bottom + gap}px`;
  }

  function hideRef() {
    if (!refFor) return;
    refFor.removeAttribute('aria-describedby');
    refFor = null;
    refCard.hidden = true;
  }

  const chunkAt = (event) => (event.target.closest ? event.target.closest('.grp[data-chunk]') : null);

  document.addEventListener('mouseover', (event) => {
    const chunk = chunkAt(event);
    if (chunk) showRef(chunk);
  });
  document.addEventListener('mouseout', (event) => {
    const chunk = chunkAt(event);
    if (chunk && !chunk.contains(event.relatedTarget)) hideRef();
  });
  document.addEventListener('focusin', (event) => {
    const chunk = chunkAt(event);
    if (chunk) showRef(chunk);
  });
  document.addEventListener('focusout', (event) => {
    if (chunkAt(event)) hideRef();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hideRef();
  });
  window.addEventListener('scroll', hideRef, { passive: true });
  window.addEventListener('resize', hideRef);

  document.getElementById('only-learning').addEventListener('change', (event) => {
    data.onlyLearning = event.target.checked;
    save();
    paintSummary();
  });

  document.getElementById('clear').addEventListener('click', () => {
    const total = allCases.reduce((sum, c) => sum + markFor(c.id).uses, 0);
    if (!window.confirm(`Clear all marks? This wipes ${total} logged uses and every Confident tick.`)) return;
    data.marks = {};
    save();
    paintAll();
  });

  render();
  paintAll();
  save();

  // The cards are built after load, so honour a #case link by hand.
  if (location.hash.length > 1) {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) target.scrollIntoView();
  }
})();
