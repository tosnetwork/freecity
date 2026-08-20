(() => {
  'use strict';

  /* ------------------------------------------------------------------ *
   * The gateway's UI consumer.
   *
   * This is the only writer of the event stream, the causal chain panel,
   * the timeline scrubber and the source badge. It reads exclusively from
   * the gateway, so it behaves identically whether the events came from
   * the local simulation, a real agent runtime or a TOS node.
   * ------------------------------------------------------------------ */

  const NS = (window.FreeCity = window.FreeCity || {});
  const gateway = NS.gateway;
  if (!gateway) {
    console.error('[gateway-view] gateway.js must load before gateway-view.js');
    return;
  }

  const dom = {
    stream: document.getElementById('eventStream'),
    perSecond: document.getElementById('eventsPerSec'),
    causal: document.getElementById('causalList'),
    chainStatus: document.getElementById('chainStatus'),
    track: document.querySelector('.timeline-track'),
    progress: document.getElementById('timelineProgress'),
    clock: document.getElementById('clock'),
    sources: document.getElementById('sourceBadge'),
    liveExit: null
  };

  const MAX_ROWS = 16;
  const KIND_COLOR = {
    synthetic: '#65e7ff',
    operator: '#ff8b73',
    runtime: '#b390ff',
    chain: '#ffd166'
  };

  const state = {
    focusedId: null,
    pinned: false,
    lastRendered: null
  };

  /* --------------------------- entity names ------------------------- */

  function displayName(urn) {
    if (!urn) return '—';
    const resolver = NS.entities && NS.entities.name;
    if (resolver) {
      const resolved = resolver(urn);
      if (resolved) return resolved;
    }
    const id = urn.includes(':') ? urn.slice(urn.indexOf(':') + 1) : urn;
    return id.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function shortType(type) {
    const pieces = String(type).split('.');
    return pieces[pieces.length - 1].toUpperCase().slice(0, 12);
  }

  function clockText(timestamp) {
    const d = new Date(timestamp);
    if (Number.isNaN(d.getTime())) return '--:--:--';
    return d.toISOString().slice(11, 19);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[ch]));
  }

  /* ---------------------------- event rows -------------------------- */

  function detailOf(envelope) {
    const payload = envelope.payload || {};
    if (payload.detail) return payload.detail;
    if (payload.amount != null) return `${payload.amount} TOS`;
    if (payload.height != null) return `#${payload.height}`;
    return shortType(envelope.type);
  }

  function rowFor(envelope, mode) {
    const row = document.createElement('div');
    row.className = 'event-row';
    row.dataset.eventId = envelope.event_id;
    if (mode === 'replay') row.classList.add('replayed');

    const kind = sourceKind(envelope.meta.source_id);
    const accent = envelope.payload && envelope.payload.color ? envelope.payload.color : KIND_COLOR[kind] || '#65e7ff';
    row.style.borderLeft = `2px solid ${accent}`;
    row.title = `${envelope.type}\n${envelope.source} → ${envelope.target || '—'}\n${envelope.meta.source_id}`;

    const label = envelope.target
      ? `${displayName(envelope.source)} → ${displayName(envelope.target)}`
      : displayName(envelope.source);

    row.innerHTML =
      `<time>${escapeHtml(clockText(envelope.timestamp))}</time>` +
      `<strong>${escapeHtml(label)} · ${escapeHtml(envelope.type)}</strong>` +
      `<b>${escapeHtml(detailOf(envelope))}</b>`;

    row.addEventListener('click', () => {
      state.pinned = true;
      focus(envelope.event_id);
    });
    return row;
  }

  const sourceKinds = new Map();
  function sourceKind(sourceId) {
    if (sourceKinds.has(sourceId)) return sourceKinds.get(sourceId);
    const found = gateway.sources().find(s => s.id === sourceId);
    const kind = found ? found.kind : 'unknown';
    sourceKinds.set(sourceId, kind);
    return kind;
  }

  function pushRow(envelope, mode) {
    if (!dom.stream) return;
    dom.stream.prepend(rowFor(envelope, mode));
    while (dom.stream.children.length > MAX_ROWS) dom.stream.lastElementChild.remove();
  }

  function rebuildStream(events) {
    if (!dom.stream) return;
    dom.stream.innerHTML = '';
    events.slice(-MAX_ROWS).forEach(envelope => dom.stream.prepend(rowFor(envelope, 'replay')));
  }

  /* --------------------------- causal panel ------------------------- */

  function focus(eventId) {
    state.focusedId = eventId;
    renderCausal();
  }

  function autoFocus(envelope) {
    if (state.pinned) return;
    if (!envelope.correlation_id && !envelope.causation_id) return;
    state.focusedId = envelope.event_id;
    renderCausal();
  }

  function renderCausal() {
    if (!dom.causal) return;
    const chain = state.focusedId ? gateway.causalChain(state.focusedId) : null;

    if (!chain || !chain.event) {
      dom.causal.innerHTML = '<li class="causal-empty"><span>—</span><div><strong>No causal chain yet</strong>' +
        '<small>click an event to trace its cause</small></div></li>';
      if (dom.chainStatus) dom.chainStatus.textContent = 'WAITING';
      return;
    }

    // The focused event sits between what caused it and what it caused, so
    // one panel answers both "why did this happen" and "what did it start".
    let ordered = [...chain.ancestors, chain.event, ...chain.descendants];
    // A freshly opened thread has no causation yet; show the run it belongs
    // to rather than a panel with one lonely row.
    if (ordered.length < 2 && chain.event.correlation_id) {
      const run = gateway.correlation(chain.event.correlation_id);
      if (run.length > ordered.length) ordered = run;
    }
    ordered = ordered.slice(-7);
    const focusIndex = Math.max(0, ordered.indexOf(chain.event));
    const signature = ordered.map(e => e.event_id).join('|');
    if (signature === state.lastRendered) return;
    state.lastRendered = signature;

    dom.causal.innerHTML = ordered.map((envelope, index) => {
      const cls = index < focusIndex ? 'done' : (index === focusIndex ? 'active' : '');
      const label = envelope.target
        ? `${displayName(envelope.source)} → ${displayName(envelope.target)}`
        : displayName(envelope.source);
      return `<li class="${cls}" data-event-id="${escapeHtml(envelope.event_id)}">` +
        `<span>${String(index + 1).padStart(2, '0')}</span>` +
        `<div><strong>${escapeHtml(envelope.type)}</strong>` +
        `<small>${escapeHtml(label)}</small></div></li>`;
    }).join('');

    [...dom.causal.querySelectorAll('[data-event-id]')].forEach(li => {
      li.addEventListener('click', () => { state.pinned = true; focus(li.dataset.eventId); });
    });

    if (dom.chainStatus) {
      const correlation = chain.event.correlation_id;
      dom.chainStatus.textContent = correlation ? correlation.toUpperCase().slice(0, 16) : 'TRACED';
    }
  }

  /* ---------------------------- replay UI --------------------------- */

  function ensureLiveButton() {
    if (dom.liveExit || !dom.track || !dom.track.parentElement) return;
    const button = document.createElement('button');
    button.id = 'replayExit';
    button.className = 'timeline-button replay-exit';
    button.textContent = 'LIVE';
    button.title = 'Leave replay and follow live events';
    button.hidden = true;
    button.addEventListener('click', () => {
      gateway.replay.exit();
      state.pinned = false;
      renderReplay();
    });
    dom.track.parentElement.insertBefore(button, dom.track.nextSibling);
    dom.liveExit = button;
  }

  function timestampAt(ratio) {
    const bounds = gateway.span();
    if (!bounds.count) return 0;
    return bounds.from + (bounds.to - bounds.from) * Math.max(0, Math.min(1, ratio));
  }

  function scrubTo(clientX) {
    const rect = dom.track.getBoundingClientRect();
    if (!rect.width) return;
    const ratio = (clientX - rect.left) / rect.width;
    if (!gateway.replay.state().active && !gateway.replay.enter(timestampAt(ratio))) return;
    const target = timestampAt(ratio);
    const previous = gateway.replay.state().cursor;
    gateway.replay.seek(target);
    if (target < previous) rebuildStream(gateway.query({ ingested_to: target, limit: MAX_ROWS }));
    renderReplay();
  }

  function bindScrubber() {
    if (!dom.track) return;
    dom.track.classList.add('scrubbable');
    dom.track.title = 'Drag to replay recorded events';
    let dragging = false;

    dom.track.addEventListener('pointerdown', e => {
      dragging = true;
      try { dom.track.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
      gateway.replay.pause();
      scrubTo(e.clientX);
    });
    dom.track.addEventListener('pointermove', e => { if (dragging) scrubTo(e.clientX); });
    const end = () => { dragging = false; };
    dom.track.addEventListener('pointerup', end);
    dom.track.addEventListener('pointercancel', end);
    dom.track.addEventListener('pointerleave', end);
  }

  function renderReplay() {
    const replay = gateway.replay.state();
    if (dom.liveExit) dom.liveExit.hidden = !replay.active;
    if (dom.track) dom.track.classList.toggle('replaying', replay.active);

    if (dom.progress) {
      const bounds = gateway.span();
      const ratio = replay.active
        ? replay.progress
        : (bounds.count ? 1 : 0);
      dom.progress.style.width = `${(ratio * 100).toFixed(2)}%`;
    }
    if (replay.active && dom.clock) {
      const upTo = gateway.query({ ingested_to: replay.cursor, limit: 1 });
      const at = upTo.length ? upTo[upTo.length - 1].timestamp : replay.cursor;
      dom.clock.textContent = new Date(at).toISOString().replace('T', ' ').slice(0, 19);
    }
  }

  /* --------------------------- source badge ------------------------- */

  function renderSources(list) {
    if (!dom.sources) return;
    const active = list.filter(s => s.status === 'live' && s.events > 0);
    const shown = active.length ? active : list.filter(s => s.status === 'live');
    const problems = list.filter(s => s.status === 'error' || s.status === 'reconnecting');

    const parts = shown.map(s => {
      const color = KIND_COLOR[s.kind] || '#65e7ff';
      return `<i class="src-dot" style="background:${color};box-shadow:0 0 8px ${color}"></i>${escapeHtml(s.label)}`;
    });
    if (problems.length) parts.push(`<i class="src-dot src-bad"></i>${escapeHtml(problems[0].label)} ${escapeHtml(problems[0].status)}`);
    dom.sources.innerHTML = parts.join('<em class="src-sep">·</em>') || 'NO SOURCE';
    dom.sources.title = list
      .map(s => `${s.label} [${s.kind}] ${s.status}${s.message ? ` — ${s.message}` : ''} · ${s.events} events`)
      .join('\n');
  }

  /* ------------------------------ wiring ---------------------------- */

  gateway.subscribe((envelope, mode) => {
    pushRow(envelope, mode);
    autoFocus(envelope);
  });

  gateway.onSourceChange(list => {
    sourceKinds.clear();
    renderSources(list);
    renderReplay();
  });

  ensureLiveButton();
  bindScrubber();
  renderCausal();
  renderSources(gateway.sources());

  window.setInterval(() => {
    if (dom.perSecond) {
      const rate = gateway.stats().perSecond;
      dom.perSecond.textContent = rate >= 1000 ? `${(rate / 1000).toFixed(1)}K/s` : `${rate.toFixed(1)}/s`;
    }
    renderReplay();
    renderSources(gateway.sources());
  }, 500);

  NS.view = Object.freeze({
    focus,
    unpin() { state.pinned = false; },
    isPinned: () => state.pinned
  });
})();
