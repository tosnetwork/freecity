(() => {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Event Gateway adapters
   *
   * Every source implements the same contract:
   *
   *   { id, label, kind, describe(), start(publish, ctx), stop() }
   *
   * `publish(raw)` takes the canonical envelope from README section 11.
   * An adapter's only job is to turn whatever its source speaks into that
   * envelope. It renders nothing, owns no state the gateway needs, and can
   * be swapped without any consumer knowing.
   *
   * Configuration comes from the query string so a live source can be
   * pointed at without a rebuild:
   *
   *   ?runtime=ws://localhost:8787/events
   *   ?tos=https://node.example/rpc&tosMethod=get_block&tosPollMs=4000
   *
   * The runtime and chain adapters are real clients, not placeholders.
   * Unconfigured they report `idle` and publish nothing — they never
   * fabricate traffic to look busy.
   * ------------------------------------------------------------------ */

  const NS = (window.FreeCity = window.FreeCity || {});
  const gateway = NS.gateway;
  if (!gateway) {
    console.error('[adapters] gateway.js must load before adapters.js');
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const WORLD = params.get('world') || 'freecity';

  /* -------------------------- entity URNs -------------------------- */

  // Infrastructure entities the synthetic engine names but does not list in
  // its snapshot. Everything else is resolved from the engine itself.
  const STATIC_KINDS = {
    planner: 'agent', scout: 'agent', verifier: 'agent', citizens: 'agent',
    wallet: 'wallet', tos: 'chain', registry: 'org', treasury: 'org',
    oracle: 'market', freex: 'market',
    gpu: 'compute', model: 'model', web: 'tool',
    tower: 'building', park: 'place'
  };

  const kindIndex = new Map(Object.entries(STATIC_KINDS));
  let kindIndexAt = 0;

  function refreshKindIndex(force) {
    const now = Date.now();
    if (!force && now - kindIndexAt < 2000) return;
    kindIndexAt = now;
    const engine = window.FreeCityCivilization;
    if (!engine) return;
    let snapshot;
    try {
      snapshot = engine.snapshot;
    } catch (err) {
      console.warn('[adapters] civilization snapshot unavailable', err);
      return;
    }
    if (!snapshot) return;
    (snapshot.agents || []).forEach(a => a && a.id && kindIndex.set(a.id, 'agent'));
    (snapshot.organizations || []).forEach(o => o && o.id && kindIndex.set(o.id, 'org'));
    (snapshot.districts || []).forEach(d => d && d.id && kindIndex.set(d.id, 'district'));
  }

  /** Resolve a bare engine id such as "alice" into an entity URN. */
  function urn(id) {
    if (typeof id !== 'string' || !id.trim()) return null;
    const raw = id.trim();
    if (raw.includes(':')) return raw;
    let kind = kindIndex.get(raw);
    if (!kind) {
      refreshKindIndex(true);
      kind = kindIndex.get(raw);
    }
    // Unknown ids stay addressable rather than being dropped; "entity" is an
    // explicit admission that the source did not tell us what this is.
    return `${kind || 'entity'}:${raw}`;
  }

  /* ------------------------ passive feed base ---------------------- */

  /**
   * A source that is driven by code inside this page (the scripted
   * walkthrough, operator injections) rather than by an external
   * connection. It still goes through the gateway like any other source.
   */
  function passiveAdapter(id, label, kind, description) {
    let emit = null;
    let dropped = 0;
    const adapter = {
      id,
      label,
      kind,
      describe: () => description,
      start(publish, ctx) {
        emit = publish;
        ctx.setStatus('live', description);
      },
      stop() {
        emit = null;
      },
      feed(raw) {
        if (!emit) {
          dropped += 1;
          if (dropped === 1) console.warn(`[adapters] ${id} received an event before start(); dropped`);
          return null;
        }
        return emit(raw);
      },
      dropped: () => dropped
    };
    return adapter;
  }

  /* --------------------- 1. synthetic civilization ------------------ */

  const civilizationAdapter = (() => {
    let handler = null;
    return {
      id: 'sim.civilization',
      label: 'Synthetic civilization',
      kind: 'synthetic',
      describe: () => 'Event-sourced local simulation (seed FC-2030-07)',
      start(publish, ctx) {
        refreshKindIndex(true);
        handler = e => {
          const event = e && e.detail;
          if (!event || typeof event !== 'object') return;
          publish(toEnvelope(event));
        };
        window.addEventListener('freecity:civilization-event', handler);
        ctx.setStatus('live', 'listening to the local engine');
      },
      stop() {
        if (handler) window.removeEventListener('freecity:civilization-event', handler);
        handler = null;
      }
    };

    function toEnvelope(event) {
      // The engine carries presentation hints (lens, colour, detail) on the
      // event. Those are not part of the contract, so they move into payload
      // where consumers may use them but nothing depends on them.
      const payload = {
        detail: event.detail || '',
        lens: event.lens || null,
        color: event.color || null,
        autonomous: event.autonomous !== false
      };
      if (event.amount) payload.amount = event.amount;
      if (event.delta && Object.keys(event.delta).length) payload.delta = event.delta;
      if (event.payload && typeof event.payload === 'object') Object.assign(payload, event.payload);

      return {
        event_id: event.eventId,
        timestamp: event.timestamp,
        type: event.type,
        source: urn(event.source),
        target: urn(event.target),
        world: WORLD,
        causation_id: event.causationId || null,
        correlation_id: event.correlationId || null,
        visibility: 'public',
        payload
      };
    }
  })();

  /* ----------------------- 2. scripted walkthrough ------------------ */

  const scriptedAdapter = passiveAdapter(
    'sim.scripted',
    'Scripted causal walkthrough',
    'synthetic',
    'The authored Intent → TOS chain and ambient world noise'
  );

  /* ------------------------ 3. operator console --------------------- */

  const consoleAdapter = passiveAdapter(
    'god.console',
    'GOD console',
    'operator',
    'Operator-injected causes and guided scenarios'
  );

  /* ------------------------- 4. agent runtime ----------------------- */

  const runtimeAdapter = (() => {
    const url = params.get('runtime');
    let socket = null;
    let context = null;
    let publishFn = null;
    let retry = 0;
    let retryTimer = 0;
    let closedByUs = false;

    function scheduleRetry() {
      if (closedByUs) return;
      retry += 1;
      const wait = Math.min(30000, 500 * Math.pow(2, retry));
      context.setStatus('reconnecting', `retry ${retry} in ${Math.round(wait / 1000)}s`);
      retryTimer = window.setTimeout(connect, wait);
    }

    function connect() {
      retryTimer = 0;
      let ws;
      try {
        ws = new WebSocket(url);
      } catch (err) {
        context.setStatus('error', err && err.message ? err.message : String(err));
        scheduleRetry();
        return;
      }
      socket = ws;

      ws.onopen = () => {
        retry = 0;
        context.setStatus('live', url);
      };
      ws.onmessage = message => {
        let parsed;
        try {
          parsed = JSON.parse(message.data);
        } catch (err) {
          context.setStatus('error', 'runtime sent malformed JSON');
          return;
        }
        const batch = Array.isArray(parsed) ? parsed : [parsed];
        batch.forEach(item => {
          const envelope = toEnvelope(item);
          if (envelope) publishFn(envelope);
        });
      };
      ws.onerror = () => {
        context.setStatus('error', `socket error on ${url}`);
      };
      ws.onclose = () => {
        socket = null;
        if (!closedByUs) scheduleRetry();
      };
    }

    /**
     * Accepts either a ready-made canonical envelope or the compact form a
     * runtime is likely to emit. Anything that cannot be mapped is passed
     * through untouched so the gateway reports the precise validation error
     * rather than this adapter hiding it.
     */
    function toEnvelope(item) {
      if (!item || typeof item !== 'object') return null;
      if (typeof item.type !== 'string') return item;
      if (typeof item.source === 'string' && item.source.includes(':')) return item;

      return {
        event_id: item.event_id || item.id || null,
        timestamp: item.timestamp ?? item.ts ?? Date.now(),
        type: item.type,
        source: urn(item.source ?? item.from),
        target: urn(item.target ?? item.to),
        world: item.world || WORLD,
        causation_id: item.causation_id ?? item.cause ?? null,
        correlation_id: item.correlation_id ?? item.run ?? item.trace ?? null,
        visibility: item.visibility || 'public',
        payload: item.payload || item.data || {}
      };
    }

    return {
      id: 'runtime.ws',
      label: 'Agent runtime',
      kind: 'runtime',
      describe: () => (url ? `WebSocket ${url}` : 'not configured — pass ?runtime=ws://host/events'),
      start(publish, ctx) {
        publishFn = publish;
        context = ctx;
        closedByUs = false;
        if (!url) {
          ctx.setStatus('idle', 'no ?runtime= endpoint configured');
          return;
        }
        connect();
      },
      stop() {
        closedByUs = true;
        if (retryTimer) { window.clearTimeout(retryTimer); retryTimer = 0; }
        if (socket) { socket.close(); socket = null; }
      }
    };
  })();

  /* --------------------------- 5. TOS node -------------------------- */

  const tosAdapter = (() => {
    const url = params.get('tos');
    const method = params.get('tosMethod') || 'get_block';
    const pollMs = Math.max(1000, Number(params.get('tosPollMs')) || 4000);
    let timer = 0;
    let context = null;
    let publishFn = null;
    let stopped = false;
    let lastHeight = -1;
    let inFlight = false;

    async function rpc(rpcMethod, rpcParams) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: rpcMethod, params: rpcParams || {} })
      });
      if (!response.ok) throw new Error(`${rpcMethod} → HTTP ${response.status}`);
      const body = await response.json();
      if (body && body.error) throw new Error(`${rpcMethod} → ${body.error.message || 'rpc error'}`);
      return body ? body.result : null;
    }

    /**
     * Map a block to settlement envelopes. The node's exact schema is not
     * assumed: if the response does not carry a recognisable height or
     * transaction list the adapter reports an error instead of inventing
     * events, and the shape can be corrected in one place here.
     */
    function blockToEnvelopes(block) {
      if (!block || typeof block !== 'object') return null;
      const height = Number(block.height ?? block.topoheight ?? block.number);
      if (!Number.isFinite(height)) return null;
      const txs = block.transactions || block.txs || [];
      if (!Array.isArray(txs)) return null;
      const timestamp = Number(block.timestamp) || Date.now();

      const blockId = String(block.hash || block.block_hash || height);
      const envelopes = [{
        event_id: `tos_block_${blockId}`,
        timestamp,
        type: 'block.finalized',
        source: 'chain:tos',
        target: `block:${blockId}`,
        world: WORLD,
        causation_id: null,
        correlation_id: `block_${blockId}`,
        visibility: 'public',
        payload: { height, transactions: txs.length }
      }];

      txs.forEach((tx, index) => {
        if (!tx || typeof tx !== 'object') return;
        const hash = String(tx.hash || tx.id || `${blockId}_${index}`);
        envelopes.push({
          event_id: `tos_tx_${hash}`,
          timestamp: Number(tx.timestamp) || timestamp,
          type: 'tx.confirmed',
          source: tx.source || tx.from ? urn(String(tx.source || tx.from)) : 'chain:tos',
          target: tx.destination || tx.to ? urn(String(tx.destination || tx.to)) : `block:${blockId}`,
          world: WORLD,
          causation_id: `tos_block_${blockId}`,
          correlation_id: `block_${blockId}`,
          visibility: 'public',
          payload: { hash, height, amount: tx.amount ?? null, asset: tx.asset ?? null }
        });
      });

      return { height, envelopes };
    }

    async function poll() {
      if (stopped || inFlight) return;
      inFlight = true;
      try {
        const block = await rpc(method, lastHeight >= 0 ? { height: lastHeight + 1 } : {});
        const mapped = blockToEnvelopes(block);
        if (!mapped) {
          context.setStatus('error', `${method} returned a shape this adapter cannot map`);
        } else if (mapped.height !== lastHeight) {
          lastHeight = mapped.height;
          mapped.envelopes.forEach(envelope => publishFn(envelope));
          context.setStatus('live', `${url} · height ${mapped.height}`);
        }
      } catch (err) {
        context.setStatus('error', err && err.message ? err.message : String(err));
      } finally {
        inFlight = false;
      }
    }

    return {
      id: 'tos.node',
      label: 'TOS node',
      kind: 'chain',
      describe: () => (url ? `JSON-RPC ${url} · ${method} every ${pollMs}ms` : 'not configured — pass ?tos=https://node/rpc'),
      start(publish, ctx) {
        publishFn = publish;
        context = ctx;
        stopped = false;
        lastHeight = -1;
        if (!url) {
          ctx.setStatus('idle', 'no ?tos= endpoint configured');
          return;
        }
        ctx.setStatus('starting', url);
        poll();
        timer = window.setInterval(poll, pollMs);
      },
      stop() {
        stopped = true;
        if (timer) { window.clearInterval(timer); timer = 0; }
      }
    };
  })();

  /* ---------------------------- register ---------------------------- */

  [civilizationAdapter, scriptedAdapter, consoleAdapter, runtimeAdapter, tosAdapter]
    .forEach(adapter => {
      try {
        gateway.registerSource(adapter);
      } catch (err) {
        console.error(`[adapters] could not register ${adapter.id}`, err);
      }
    });

  /* --------------------------- entity names ------------------------- */

  const STATIC_NAMES = {
    planner: 'Planner-17', scout: 'Scout-21', verifier: 'Verifier', wallet: 'Wallet',
    tos: 'TOS', oracle: 'Market Oracle', registry: 'City Registry', gpu: 'GPU Shard 07',
    model: 'Reasoner-32B', web: 'Web Tool', citizens: 'Citizen Mesh', tower: 'TOS Tower',
    park: 'Central Park', treasury: 'FreeCity Treasury'
  };

  const nameIndex = new Map(Object.entries(STATIC_NAMES));
  let nameIndexAt = 0;

  function refreshNameIndex(force) {
    const now = Date.now();
    if (!force && now - nameIndexAt < 2000) return;
    nameIndexAt = now;
    const engine = window.FreeCityCivilization;
    if (!engine) return;
    let snapshot;
    try {
      snapshot = engine.snapshot;
    } catch (err) {
      return;
    }
    if (!snapshot) return;
    ['agents', 'organizations', 'districts'].forEach(key => {
      (snapshot[key] || []).forEach(item => {
        if (item && item.id && item.name) nameIndex.set(item.id, item.name);
      });
    });
  }

  /** Human label for an entity URN, resolved from whichever source owns it. */
  function entityName(value) {
    if (typeof value !== 'string' || !value) return '';
    const id = value.includes(':') ? value.slice(value.indexOf(':') + 1) : value;
    let name = nameIndex.get(id);
    if (!name) {
      refreshNameIndex(false);
      name = nameIndex.get(id);
    }
    return name || '';
  }

  NS.entities = Object.freeze({ name: entityName, kind: value => (typeof value === 'string' && value.includes(':') ? value.slice(0, value.indexOf(':')) : 'entity') });

  NS.feeds = Object.freeze({
    scripted: raw => scriptedAdapter.feed(raw),
    console: raw => consoleAdapter.feed(raw),
    urn
  });

  gateway.startAll();
})();
