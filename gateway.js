(() => {
  'use strict';

  /* ------------------------------------------------------------------ *
   * FreeCity Event Gateway
   *
   * One ingress for every event source. Local simulation, a real agent
   * runtime and a TOS node all publish the same canonical envelope
   * (README section 11), so GOD MODE, the Living Graph, TIME replay and
   * CAUSE read from one log and never learn where an event came from.
   *
   *   adapter → gateway.publish(raw) → normalize → log + indices → subscribers
   *
   * The gateway owns no DOM and no domain logic. It validates, orders,
   * de-duplicates, indexes causality and replays. Nothing else.
   * ------------------------------------------------------------------ */

  const NS = (window.FreeCity = window.FreeCity || {});
  if (NS.gateway) return;

  const MAX_LOG = 4000;
  const MAX_CHAIN = 256;
  const DEFAULT_WORLD = 'freecity';
  const RATE_WINDOW_MS = 5000;

  // "task.delegated", "tx.confirmed" — domain.action, at least two segments.
  const TYPE_RE = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9_]*)+$/;
  // "agent:alice", "wallet:0x79a2", "org:civic_forum" — kind:id.
  const URN_RE = /^[a-z][a-z0-9]*:[A-Za-z0-9._@/-]+$/;

  const VISIBILITY = new Set(['public', 'city', 'org', 'private']);

  /* ----------------------------- state ----------------------------- */

  const log = [];
  const byId = new Map();
  const byCorrelation = new Map();
  const childrenOf = new Map();
  const subscribers = new Set();
  const sources = new Map();
  const sourceListeners = new Set();

  let seqCounter = 0;
  const ingestTimes = [];
  const stats = { published: 0, rejected: 0, duplicates: 0, bySource: Object.create(null) };
  let lastRejection = null;

  /* --------------------------- validation -------------------------- */

  function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function normalizeUrn(value) {
    if (typeof value !== 'string') return null;
    const urn = value.trim();
    return URN_RE.test(urn) ? urn : null;
  }

  function optionalId(value, label, errors) {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string') { errors.push(`${label} must be a string when present`); return null; }
    const id = value.trim();
    if (!id) { errors.push(`${label} must not be blank when present`); return null; }
    if (id.length > 200) { errors.push(`${label} exceeds 200 characters`); return null; }
    return id;
  }

  /**
   * Validate a raw event against the canonical envelope.
   * Returns { ok: true, envelope } or { ok: false, errors: [...] }.
   * Nothing is silently coerced except documented defaults (world,
   * visibility, payload), so a malformed source stays visible instead of
   * quietly poisoning the log.
   */
  function normalize(raw, sourceId, seq) {
    const errors = [];
    if (!isPlainObject(raw)) return { ok: false, errors: ['event must be a plain object'] };

    const type = typeof raw.type === 'string' ? raw.type.trim() : '';
    if (!TYPE_RE.test(type)) errors.push(`type ${JSON.stringify(raw.type)} must read as "domain.action"`);

    const source = normalizeUrn(raw.source);
    if (!source) errors.push(`source ${JSON.stringify(raw.source)} must be an entity URN such as "agent:alice"`);

    let target = null;
    if (raw.target !== undefined && raw.target !== null && raw.target !== '') {
      target = normalizeUrn(raw.target);
      if (!target) errors.push(`target ${JSON.stringify(raw.target)} must be an entity URN such as "agent:scout-21"`);
    }

    const timestamp = Number(raw.timestamp);
    if (!Number.isFinite(timestamp) || timestamp < 0) {
      errors.push(`timestamp ${JSON.stringify(raw.timestamp)} must be a finite epoch-ms number`);
    }

    let world = DEFAULT_WORLD;
    if (raw.world !== undefined && raw.world !== null) {
      if (typeof raw.world !== 'string' || !raw.world.trim()) errors.push('world must be a non-empty string when present');
      else world = raw.world.trim();
    }

    let visibility = 'public';
    if (raw.visibility !== undefined && raw.visibility !== null) {
      visibility = String(raw.visibility);
      if (!VISIBILITY.has(visibility)) {
        errors.push(`visibility ${JSON.stringify(raw.visibility)} must be one of ${[...VISIBILITY].join(', ')}`);
      }
    }

    let payload = {};
    if (raw.payload !== undefined && raw.payload !== null) {
      if (!isPlainObject(raw.payload)) errors.push('payload must be an object');
      else payload = raw.payload;
    }

    const causation_id = optionalId(raw.causation_id, 'causation_id', errors);
    const correlation_id = optionalId(raw.correlation_id, 'correlation_id', errors);

    let generatedId = false;
    let event_id = optionalId(raw.event_id, 'event_id', errors);
    if (!event_id) {
      event_id = `evt_${sourceId}_${seq.toString(36)}`;
      generatedId = true;
    }

    if (errors.length) return { ok: false, errors };

    return {
      ok: true,
      envelope: Object.freeze({
        event_id,
        timestamp,
        type,
        source,
        target,
        world,
        causation_id,
        correlation_id,
        visibility,
        payload: Object.freeze({ ...payload }),
        // Gateway bookkeeping. Not part of the wire contract — adapters
        // never set it and consumers must not depend on it for meaning.
        meta: Object.freeze({
          seq,
          source_id: sourceId,
          ingested_at: Date.now(),
          generated_id: generatedId
        })
      })
    };
  }

  /* ------------------------------ log ------------------------------ */

  function indexEvent(envelope) {
    byId.set(envelope.event_id, envelope);
    if (envelope.correlation_id) {
      const bucket = byCorrelation.get(envelope.correlation_id);
      if (bucket) bucket.push(envelope.event_id);
      else byCorrelation.set(envelope.correlation_id, [envelope.event_id]);
    }
    if (envelope.causation_id) {
      const kids = childrenOf.get(envelope.causation_id);
      if (kids) kids.push(envelope.event_id);
      else childrenOf.set(envelope.causation_id, [envelope.event_id]);
    }
  }

  function unindexEvent(envelope) {
    byId.delete(envelope.event_id);
    if (envelope.correlation_id) {
      const bucket = byCorrelation.get(envelope.correlation_id);
      if (bucket) {
        const at = bucket.indexOf(envelope.event_id);
        if (at !== -1) bucket.splice(at, 1);
        if (!bucket.length) byCorrelation.delete(envelope.correlation_id);
      }
    }
    if (envelope.causation_id) {
      const kids = childrenOf.get(envelope.causation_id);
      if (kids) {
        const at = kids.indexOf(envelope.event_id);
        if (at !== -1) kids.splice(at, 1);
        if (!kids.length) childrenOf.delete(envelope.causation_id);
      }
    }
    childrenOf.delete(envelope.event_id);
  }

  function trimLog() {
    while (log.length > MAX_LOG) {
      const dropped = log.shift();
      if (dropped) unindexEvent(dropped);
    }
  }

  function recordRate(now) {
    ingestTimes.push(now);
    const cutoff = now - RATE_WINDOW_MS;
    while (ingestTimes.length && ingestTimes[0] < cutoff) ingestTimes.shift();
  }

  /* --------------------------- delivery ---------------------------- */

  function matches(filter, envelope) {
    if (!filter) return true;
    if (filter.world && envelope.world !== filter.world) return false;
    if (filter.source_id && envelope.meta.source_id !== filter.source_id) return false;
    if (filter.visibility && !filter.visibility.includes(envelope.visibility)) return false;
    if (filter.types && !filter.types.some(t => envelope.type === t || envelope.type.startsWith(`${t}.`))) return false;
    return true;
  }

  function deliver(envelope, mode) {
    subscribers.forEach(entry => {
      if (mode === 'replay' && entry.opts.replay === false) return;
      if (mode === 'live' && entry.opts.replay === 'only') return;
      if (!matches(entry.opts.filter, envelope)) return;
      try {
        entry.fn(envelope, mode);
      } catch (err) {
        // One broken consumer must not stop the others or the ingest path.
        console.error('[gateway] subscriber failed', err);
      }
    });
  }

  function notifySources() {
    const snapshot = sourceList();
    sourceListeners.forEach(fn => {
      try { fn(snapshot); } catch (err) { console.error('[gateway] source listener failed', err); }
    });
  }

  /* ---------------------------- publish ---------------------------- */

  function publish(raw, sourceId) {
    const from = typeof sourceId === 'string' && sourceId ? sourceId : 'unknown';
    const seq = seqCounter + 1;
    const result = normalize(raw, from, seq);

    if (!result.ok) {
      stats.rejected += 1;
      lastRejection = { source_id: from, errors: result.errors, at: Date.now() };
      console.warn(`[gateway] rejected event from ${from}: ${result.errors.join('; ')}`);
      return null;
    }

    const envelope = result.envelope;
    if (byId.has(envelope.event_id)) {
      // Real sources redeliver on reconnect. Idempotency is the gateway's job.
      stats.duplicates += 1;
      return byId.get(envelope.event_id);
    }

    seqCounter = seq;
    log.push(envelope);
    indexEvent(envelope);
    trimLog();

    stats.published += 1;
    stats.bySource[from] = (stats.bySource[from] || 0) + 1;
    recordRate(envelope.meta.ingested_at);

    if (!replayState.active) deliver(envelope, 'live');
    return envelope;
  }

  /* --------------------------- read paths -------------------------- */

  function query(options) {
    const opts = options || {};
    let out = log;
    if (opts.world) out = out.filter(e => e.world === opts.world);
    if (opts.source_id) out = out.filter(e => e.meta.source_id === opts.source_id);
    if (opts.correlation_id) out = out.filter(e => e.correlation_id === opts.correlation_id);
    if (typeof opts.since === 'number') out = out.filter(e => e.meta.seq > opts.since);
    if (typeof opts.from === 'number') out = out.filter(e => e.timestamp >= opts.from);
    if (typeof opts.to === 'number') out = out.filter(e => e.timestamp <= opts.to);
    if (typeof opts.ingested_from === 'number') out = out.filter(e => e.meta.ingested_at >= opts.ingested_from);
    if (typeof opts.ingested_to === 'number') out = out.filter(e => e.meta.ingested_at <= opts.ingested_to);
    if (Array.isArray(opts.types) && opts.types.length) {
      out = out.filter(e => opts.types.some(t => e.type === t || e.type.startsWith(`${t}.`)));
    }
    if (out === log) out = log.slice();
    const limit = Number.isFinite(opts.limit) ? Math.max(0, Math.floor(opts.limit)) : 0;
    if (limit && out.length > limit) out = out.slice(out.length - limit);
    return out;
  }

  function correlation(correlationId) {
    if (typeof correlationId !== 'string' || !correlationId) return [];
    const ids = byCorrelation.get(correlationId);
    if (!ids || !ids.length) return [];
    return ids
      .map(id => byId.get(id))
      .filter(Boolean)
      .sort((a, b) => a.meta.seq - b.meta.seq);
  }

  /**
   * Walk causation both ways from one event. Depth-capped and cycle-guarded:
   * a malformed source that points an event at itself must not hang the UI.
   */
  function causalChain(eventId) {
    const event = byId.get(eventId);
    if (!event) return { event: null, ancestors: [], descendants: [] };

    const ancestors = [];
    const seen = new Set([event.event_id]);
    let cursor = event.causation_id ? byId.get(event.causation_id) : null;
    while (cursor && ancestors.length < MAX_CHAIN && !seen.has(cursor.event_id)) {
      seen.add(cursor.event_id);
      ancestors.unshift(cursor);
      cursor = cursor.causation_id ? byId.get(cursor.causation_id) : null;
    }

    const descendants = [];
    const queue = [event.event_id];
    while (queue.length && descendants.length < MAX_CHAIN) {
      const parent = queue.shift();
      const kids = childrenOf.get(parent);
      if (!kids) continue;
      for (const kid of kids) {
        if (seen.has(kid)) continue;
        seen.add(kid);
        const child = byId.get(kid);
        if (!child) continue;
        descendants.push(child);
        queue.push(kid);
      }
    }
    descendants.sort((a, b) => a.meta.seq - b.meta.seq);

    return { event, ancestors, descendants };
  }

  /**
   * Replay runs on ingest time, not on `timestamp`.
   *
   * `timestamp` is the source's own world clock: a simulation may sit in
   * 2030 while a chain node reports today. Those are not comparable, and
   * scrubbing across them produces a timeline four years wide. `ingested_at`
   * is stamped by the gateway on one clock, so it is the only ordering that
   * holds once sources are mixed. World time stays on the event for display.
   */
  function span() {
    if (!log.length) return { from: 0, to: 0, count: 0, world_from: 0, world_to: 0 };
    let from = log[0].meta.ingested_at;
    let to = log[0].meta.ingested_at;
    let worldFrom = log[0].timestamp;
    let worldTo = log[0].timestamp;
    for (const e of log) {
      if (e.meta.ingested_at < from) from = e.meta.ingested_at;
      if (e.meta.ingested_at > to) to = e.meta.ingested_at;
      if (e.timestamp < worldFrom) worldFrom = e.timestamp;
      if (e.timestamp > worldTo) worldTo = e.timestamp;
    }
    return { from, to, count: log.length, world_from: worldFrom, world_to: worldTo };
  }

  /* ----------------------------- replay ---------------------------- */

  const replayState = { active: false, playing: false, cursor: 0, rate: 1, lastFrame: 0, raf: 0 };

  function replayWindow(fromTs, toTs) {
    if (toTs < fromTs) return [];
    return log.filter(e => e.meta.ingested_at > fromTs && e.meta.ingested_at <= toTs);
  }

  function stopRaf() {
    if (replayState.raf) {
      cancelAnimationFrame(replayState.raf);
      replayState.raf = 0;
    }
  }

  function replayFrame(now) {
    if (!replayState.active || !replayState.playing) { replayState.raf = 0; return; }
    const dt = replayState.lastFrame ? Math.min(250, now - replayState.lastFrame) : 16;
    replayState.lastFrame = now;
    const bounds = span();
    const next = replayState.cursor + dt * replayState.rate;
    replayWindow(replayState.cursor, next).forEach(e => deliver(e, 'replay'));
    replayState.cursor = next;
    if (replayState.cursor >= bounds.to) {
      replayState.cursor = bounds.to;
      replayState.playing = false;
      notifySources();
      replayState.raf = 0;
      return;
    }
    replayState.raf = requestAnimationFrame(replayFrame);
  }

  const replay = {
    enter(fromTs) {
      const bounds = span();
      if (!bounds.count) return false;
      replayState.active = true;
      replayState.playing = false;
      replayState.cursor = Number.isFinite(fromTs) ? Math.max(bounds.from, Math.min(bounds.to, fromTs)) : bounds.from;
      replayState.lastFrame = 0;
      notifySources();
      return true;
    },
    exit() {
      stopRaf();
      replayState.active = false;
      replayState.playing = false;
      replayState.lastFrame = 0;
      notifySources();
    },
    /** Jump the cursor. Moving forward replays the crossed window; moving
     *  backward only repositions, because consumers rebuild from query(). */
    seek(ts) {
      if (!replayState.active) return false;
      const bounds = span();
      const target = Math.max(bounds.from, Math.min(bounds.to, Number(ts)));
      if (!Number.isFinite(target)) return false;
      if (target > replayState.cursor) replayWindow(replayState.cursor, target).forEach(e => deliver(e, 'replay'));
      replayState.cursor = target;
      return true;
    },
    play() {
      if (!replayState.active) return false;
      const bounds = span();
      if (replayState.cursor >= bounds.to) replayState.cursor = bounds.from;
      replayState.playing = true;
      replayState.lastFrame = 0;
      stopRaf();
      replayState.raf = requestAnimationFrame(replayFrame);
      notifySources();
      return true;
    },
    pause() {
      replayState.playing = false;
      stopRaf();
      notifySources();
    },
    setRate(rate) {
      const value = Number(rate);
      if (!Number.isFinite(value) || value <= 0) return false;
      replayState.rate = Math.min(64, value);
      return true;
    },
    state() {
      const bounds = span();
      const total = Math.max(1, bounds.to - bounds.from);
      return {
        active: replayState.active,
        playing: replayState.playing,
        rate: replayState.rate,
        cursor: replayState.cursor,
        from: bounds.from,
        to: bounds.to,
        progress: replayState.active ? Math.max(0, Math.min(1, (replayState.cursor - bounds.from) / total)) : 0
      };
    }
  };

  /* ---------------------------- sources ---------------------------- */

  function sourceList() {
    return [...sources.values()].map(entry => ({
      id: entry.adapter.id,
      label: entry.adapter.label || entry.adapter.id,
      kind: entry.adapter.kind || 'unknown',
      status: entry.status,
      message: entry.message,
      events: stats.bySource[entry.adapter.id] || 0
    }));
  }

  function registerSource(adapter) {
    if (!isPlainObject(adapter)) throw new TypeError('adapter must be an object');
    if (typeof adapter.id !== 'string' || !adapter.id.trim()) throw new TypeError('adapter.id must be a non-empty string');
    if (typeof adapter.start !== 'function') throw new TypeError(`adapter ${adapter.id} must implement start(publish, ctx)`);
    if (typeof adapter.stop !== 'function') throw new TypeError(`adapter ${adapter.id} must implement stop()`);
    if (sources.has(adapter.id)) throw new Error(`adapter ${adapter.id} is already registered`);

    sources.set(adapter.id, { adapter, status: 'registered', message: '' });
    notifySources();
    return adapter.id;
  }

  function startSource(id) {
    const entry = sources.get(id);
    if (!entry) return false;
    if (entry.status === 'live' || entry.status === 'starting') return true;

    entry.status = 'starting';
    entry.message = '';
    notifySources();

    const ctx = {
      id,
      setStatus(status, message) {
        const current = sources.get(id);
        if (!current) return;
        current.status = String(status || 'idle');
        current.message = message ? String(message) : '';
        notifySources();
      }
    };

    try {
      entry.adapter.start(raw => publish(raw, id), ctx);
      // An adapter that never reports in is treated as live; one that is
      // unconfigured is expected to call setStatus('idle', reason) itself.
      if (sources.get(id) && sources.get(id).status === 'starting') ctx.setStatus('live', '');
      return true;
    } catch (err) {
      ctx.setStatus('error', err && err.message ? err.message : String(err));
      return false;
    }
  }

  function stopSource(id) {
    const entry = sources.get(id);
    if (!entry) return false;
    try {
      entry.adapter.stop();
      entry.status = 'stopped';
      entry.message = '';
    } catch (err) {
      entry.status = 'error';
      entry.message = err && err.message ? err.message : String(err);
    }
    notifySources();
    return true;
  }

  function startAll() {
    [...sources.keys()].forEach(startSource);
  }

  /* ------------------------------ api ------------------------------ */

  NS.gateway = {
    ENVELOPE_FIELDS: Object.freeze([
      'event_id', 'timestamp', 'type', 'source', 'target',
      'world', 'causation_id', 'correlation_id', 'visibility', 'payload'
    ]),
    VISIBILITY: Object.freeze([...VISIBILITY]),

    publish,
    normalize: (raw, sourceId) => normalize(raw, sourceId || 'probe', seqCounter + 1),

    subscribe(fn, opts) {
      if (typeof fn !== 'function') throw new TypeError('subscribe(fn) requires a function');
      const entry = { fn, opts: isPlainObject(opts) ? opts : {} };
      subscribers.add(entry);
      return () => subscribers.delete(entry);
    },

    query,
    byId: id => byId.get(id) || null,
    correlation,
    causalChain,
    span,
    replay,

    registerSource,
    startSource,
    stopSource,
    startAll,
    sources: sourceList,
    onSourceChange(fn) {
      if (typeof fn !== 'function') throw new TypeError('onSourceChange(fn) requires a function');
      sourceListeners.add(fn);
      return () => sourceListeners.delete(fn);
    },

    stats() {
      return {
        published: stats.published,
        rejected: stats.rejected,
        duplicates: stats.duplicates,
        logged: log.length,
        perSecond: ingestTimes.length / (RATE_WINDOW_MS / 1000),
        bySource: { ...stats.bySource },
        lastRejection
      };
    },

    reset() {
      replay.exit();
      log.length = 0;
      byId.clear();
      byCorrelation.clear();
      childrenOf.clear();
      ingestTimes.length = 0;
      seqCounter = 0;
      stats.published = 0;
      stats.rejected = 0;
      stats.duplicates = 0;
      stats.bySource = Object.create(null);
      lastRejection = null;
    }
  };
})();
