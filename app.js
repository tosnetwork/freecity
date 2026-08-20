(() => {
  'use strict';

  /* ------------------------------------------------------------------ *
   * FreeCity GOD MODE — one continuous zoom ladder:
   *   PLANET → CITY → TOWER → AGENT → LIVING GRAPH → RUNTIME
   * Every layer is a scene on the same logarithmic scale `z`. A scene is
   * drawn at F^(z - peak) and cross-fades with its neighbours, so zooming
   * never swaps views: the child grows out of the parent's focus point.
   * ------------------------------------------------------------------ */

  const canvas = document.getElementById('graphCanvas');
  const ctx = canvas.getContext('2d');
  const graphWrap = document.getElementById('graphWrap');
  const sparkCanvas = document.getElementById('sparkCanvas');
  const spark = sparkCanvas.getContext('2d');

  const ui = {
    tabs: [...document.querySelectorAll('.eye-tab')],
    rail: [...document.querySelectorAll('.rail-item')],
    modeTitle: document.getElementById('modeTitle'),
    breadcrumb: document.getElementById('breadcrumb'),
    ascend: document.getElementById('ascendBtn'),
    zoomLayer: document.getElementById('zoomLayer'),
    zoomLabel: document.getElementById('zoomLabel'),
    legend: document.getElementById('legend'),
    drillHint: document.getElementById('drillHint'),
    playPause: document.getElementById('playPause'),
    replay: document.getElementById('replay'),
    resetView: document.getElementById('resetView'),
    speed: document.getElementById('speedSelect'),
    clock: document.getElementById('clock'),
    renderStats: document.getElementById('renderStats'),
    shardLabel: document.getElementById('shardLabel'),
    selectionCard: document.getElementById('selectionCard'),
    selectedName: document.getElementById('selectedName'),
    selectedSignal: document.getElementById('selectedSignal'),
    selectedRole: document.getElementById('selectedRole'),
    selectedWallet: document.getElementById('selectedWallet'),
    selectedLatency: document.getElementById('selectedLatency'),
    selectedModel: document.getElementById('selectedModel'),
    selectedLabels: [1, 2, 3, 4].map(i => document.getElementById(`selectedLabel${i}`)),
    statA: document.getElementById('statA'),
    statB: document.getElementById('statB'),
    statC: document.getElementById('statC'),
    statALabel: document.getElementById('statALabel'),
    statBLabel: document.getElementById('statBLabel'),
    statCLabel: document.getElementById('statCLabel'),
    pulseTitle: document.getElementById('pulseTitle'),
    pulseGrid: document.getElementById('pulseGrid')
  };

  /* ------------------------------ utils ----------------------------- */

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t * t * (3 - 2 * t); }
  function rad(deg) { return deg * Math.PI / 180; }

  function hexAlpha(hex, alpha) {
    if (!hex || hex[0] !== '#') return `rgba(101,231,255,${alpha})`;
    const h = hex.slice(1);
    const full = h.length === 3 ? h.split('').map(x => x + x).join('') : h;
    const num = parseInt(full, 16);
    return `rgba(${(num >> 16) & 255},${(num >> 8) & 255},${num & 255},${alpha})`;
  }

  function mix(hexA, hexB, t) {
    const pa = parseInt(hexA.slice(1), 16);
    const pb = parseInt(hexB.slice(1), 16);
    const r = Math.round(lerp((pa >> 16) & 255, (pb >> 16) & 255, t));
    const g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, t));
    const b = Math.round(lerp(pa & 255, pb & 255, t));
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
  }

  function roundedRect(c, x, y, w, h, r) {
    const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  }

  function mulberry(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function cssW() { return canvas.width / state.dpr; }
  function cssH() { return canvas.height / state.dpr; }

  /* ------------------------------ palette --------------------------- */

  const modeMeta = {
    CITY: ['CITY — AI civilization runtime', '#65e7ff'],
    LIFE: ['LIFE — autonomous citizens & activity', '#70ffb6'],
    MONEY: ['MONEY — TOS value flow & settlement', '#ffd166'],
    SOCIAL: ['SOCIAL — relationships, trust & influence', '#b390ff'],
    MIND: ['MIND — intent, memory & reasoning', '#ff7fd1'],
    COMPUTE: ['COMPUTE — models, tools & inference', '#70ffb6'],
    TIME: ['TIME — replay the civilization state', '#7ee7ff'],
    CAUSE: ['CAUSE — trace and inject causality', '#ff8b73']
  };

  const kindColors = {
    agent: '#65e7ff',
    task: '#9a77ff',
    system: '#7b9cff',
    tool: '#70ffb6',
    chain: '#ffd166',
    market: '#ff9b68',
    memory: '#ff7fd1',
    compute: '#62f4c2',
    social: '#b390ff',
    decision: '#ff7fd1'
  };

  const edgeColors = {
    intent: '#9a77ff',
    delegation: '#6ca2ff',
    evidence: '#6de8ff',
    tool: '#70ffb6',
    decision: '#ff7fd1',
    money: '#ffd166',
    chain: '#ff9b68',
    social: '#b390ff',
    compute: '#62f4c2'
  };

  function accent() { return modeMeta[state.mode][1]; }

  /* ---------------------------- graph data -------------------------- */

  const nodes = [
    { id: 'alice', label: 'Alice', sub: 'Agent A-055721', x: -380, y: 40, r: 28, kind: 'agent', role: 'Market strategist', wallet: '18,493 TOS', latency: '482 ms', model: 'Reasoner-32B' },
    { id: 'intent', label: 'Intent', sub: 'buy-liquidity', x: -535, y: -135, r: 17, kind: 'task', role: 'Goal object', wallet: '—', latency: '12 ms', model: 'Policy layer' },
    { id: 'planner', label: 'Planner', sub: 'Plan / 04 steps', x: -190, y: -125, r: 22, kind: 'system', role: 'Task decomposition', wallet: '3.2 TOS', latency: '188 ms', model: 'Planner-14B' },
    { id: 'scoutWeb', label: 'Scout 01', sub: 'Web signals', x: 35, y: -220, r: 18, kind: 'agent', role: 'Open-web scout', wallet: '211 TOS', latency: '631 ms', model: 'Scout-8B' },
    { id: 'scoutCity', label: 'Scout 02', sub: 'City signals', x: 40, y: -78, r: 18, kind: 'agent', role: 'World-state scout', wallet: '194 TOS', latency: '213 ms', model: 'Scout-8B' },
    { id: 'browser', label: 'Web', sub: 'Search tool', x: 250, y: -270, r: 15, kind: 'tool', role: 'External search', wallet: '—', latency: '382 ms', model: 'Tool' },
    { id: 'oracle', label: 'Market Oracle', sub: 'Price / depth', x: 260, y: -123, r: 17, kind: 'market', role: 'Market data feed', wallet: '—', latency: '46 ms', model: 'Oracle' },
    { id: 'city', label: 'FreeCity', sub: 'World state', x: 260, y: 20, r: 20, kind: 'system', role: 'Simulation state', wallet: '15.8B TOS', latency: '19 ms', model: 'Runtime' },
    { id: 'memory', label: 'Memory', sub: 'Alice / episodic', x: -185, y: 145, r: 18, kind: 'memory', role: 'Long-term memory', wallet: '—', latency: '31 ms', model: 'Vector store' },
    { id: 'verify', label: 'Verifier', sub: 'confidence 0.91', x: 62, y: 105, r: 20, kind: 'system', role: 'Evidence verification', wallet: '1.8 TOS', latency: '328 ms', model: 'Verifier-14B' },
    { id: 'debate', label: 'Debate', sub: '2 branches', x: 248, y: 145, r: 17, kind: 'task', role: 'Counterfactual check', wallet: '1.1 TOS', latency: '515 ms', model: 'Reasoner-32B' },
    { id: 'decision', label: 'Decision', sub: 'BUY / 0.87', x: 445, y: 68, r: 23, kind: 'decision', role: 'Action policy', wallet: '—', latency: '42 ms', model: 'Policy head' },
    { id: 'wallet', label: 'Wallet', sub: 'Alice / signer', x: 610, y: -42, r: 17, kind: 'chain', role: 'Transaction signer', wallet: '18,493 TOS', latency: '8 ms', model: 'TOS wallet' },
    { id: 'tos', label: 'TOS', sub: 'Settlement', x: 625, y: 118, r: 25, kind: 'chain', role: 'Settlement network', wallet: 'Block 8,491,220', latency: '742 ms', model: 'TOS Network' },
    { id: 'exchange', label: 'Exchange', sub: 'Liquidity venue', x: 820, y: 40, r: 20, kind: 'market', role: 'Market venue', wallet: '1.2B TOS', latency: '55 ms', model: 'Contract' },
    { id: 'pool', label: 'Pool', sub: 'TOS / USDx', x: 820, y: 190, r: 18, kind: 'market', role: 'Liquidity pool', wallet: '382M TOS', latency: '21 ms', model: 'AMM' },
    { id: 'bank', label: 'Bank', sub: 'Treasury', x: 595, y: 300, r: 17, kind: 'chain', role: 'Treasury', wallet: '342.8M TOS', latency: '24 ms', model: 'Ledger' },
    { id: 'shop', label: 'Shops', sub: 'City commerce', x: 340, y: 300, r: 16, kind: 'market', role: 'Commerce cluster', wallet: '203.7M TOS', latency: '38 ms', model: 'Cluster' },
    { id: 'bob', label: 'Bob', sub: 'Agent A-010882', x: -420, y: 260, r: 16, kind: 'social', role: 'Founder', wallet: '91,203 TOS', latency: '510 ms', model: 'Reasoner-14B' },
    { id: 'eve', label: 'Eve', sub: 'Agent A-122903', x: -220, y: 315, r: 16, kind: 'social', role: 'Researcher', wallet: '7,812 TOS', latency: '401 ms', model: 'Reasoner-14B' },
    { id: 'gpu', label: 'GPU', sub: 'Shard 07', x: -15, y: 315, r: 17, kind: 'compute', role: 'Inference worker', wallet: '—', latency: '73%', model: 'H200 pool' },
    { id: 'model', label: 'Model', sub: 'Reasoner-32B', x: 150, y: 325, r: 18, kind: 'compute', role: 'Inference model', wallet: '—', latency: '231 ms', model: '32B / 128K' },
    { id: 'receipt', label: 'Receipt', sub: 'tx confirmed', x: 820, y: 315, r: 15, kind: 'chain', role: 'Chain receipt', wallet: '0.42 TOS fee', latency: '742 ms', model: 'Block proof' }
  ];

  const microNodes = [
    { id: 'prompt', label: 'prompt', x: 65, y: 392, kind: 'task' },
    { id: 'context', label: 'context', x: 155, y: 402, kind: 'memory' },
    { id: 'token', label: '12.8K tok', x: 240, y: 382, kind: 'compute' },
    { id: 'toolcall', label: 'tool.call', x: 325, y: 405, kind: 'tool' },
    { id: 'sig', label: 'signature', x: 680, y: 380, kind: 'chain' }
  ];

  const edges = [
    { id: 'e1', a: 'intent', b: 'alice', type: 'intent', label: 'goal' },
    { id: 'e2', a: 'alice', b: 'planner', type: 'intent', label: 'plan.request' },
    { id: 'e3', a: 'planner', b: 'scoutWeb', type: 'delegation', label: 'task.delegate' },
    { id: 'e4', a: 'planner', b: 'scoutCity', type: 'delegation', label: 'task.delegate' },
    { id: 'e5', a: 'scoutWeb', b: 'browser', type: 'tool', label: 'web.search' },
    { id: 'e6', a: 'scoutCity', b: 'oracle', type: 'tool', label: 'price.read' },
    { id: 'e7', a: 'scoutCity', b: 'city', type: 'tool', label: 'world.query' },
    { id: 'e8', a: 'browser', b: 'verify', type: 'evidence', label: 'evidence' },
    { id: 'e9', a: 'oracle', b: 'verify', type: 'evidence', label: 'evidence' },
    { id: 'e10', a: 'city', b: 'verify', type: 'evidence', label: 'state' },
    { id: 'e11', a: 'memory', b: 'alice', type: 'intent', label: 'recall' },
    { id: 'e12', a: 'alice', b: 'memory', type: 'intent', label: 'remember' },
    { id: 'e13', a: 'verify', b: 'debate', type: 'decision', label: 'challenge' },
    { id: 'e14', a: 'debate', b: 'decision', type: 'decision', label: 'score 0.87' },
    { id: 'e15', a: 'verify', b: 'decision', type: 'decision', label: 'confidence' },
    { id: 'e16', a: 'decision', b: 'wallet', type: 'money', label: 'sign intent' },
    { id: 'e17', a: 'wallet', b: 'tos', type: 'chain', label: 'tx.submit' },
    { id: 'e18', a: 'tos', b: 'exchange', type: 'money', label: '2,300 TOS' },
    { id: 'e19', a: 'exchange', b: 'pool', type: 'money', label: 'liquidity' },
    { id: 'e20', a: 'pool', b: 'receipt', type: 'chain', label: 'settled' },
    { id: 'e21', a: 'tos', b: 'receipt', type: 'chain', label: 'confirm' },
    { id: 'e22', a: 'bank', b: 'tos', type: 'money', label: '342M' },
    { id: 'e23', a: 'shop', b: 'bank', type: 'money', label: 'revenue' },
    { id: 'e24', a: 'alice', b: 'bob', type: 'social', label: 'trust .72' },
    { id: 'e25', a: 'alice', b: 'eve', type: 'social', label: 'follow' },
    { id: 'e26', a: 'bob', b: 'eve', type: 'social', label: 'collab' },
    { id: 'e27', a: 'gpu', b: 'model', type: 'compute', label: 'inference' },
    { id: 'e28', a: 'model', b: 'planner', type: 'compute', label: 'tokens' },
    { id: 'e29', a: 'model', b: 'verify', type: 'compute', label: 'tokens' },
    { id: 'e30', a: 'alice', b: 'model', type: 'compute', label: 'reason' },
    { id: 'e31', a: 'city', b: 'shop', type: 'money', label: 'commerce' },
    { id: 'e32', a: 'exchange', b: 'bank', type: 'money', label: 'settlement' }
  ];

  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  const edgeMap = Object.fromEntries(edges.map(e => [e.id, e]));

  const sequence = [
    ['e1', 'Alice', 'intent.created', 'buy-liquidity'],
    ['e2', 'Alice → Planner', 'plan.request', 'accepted'],
    ['e3', 'Planner → Scout 01', 'task.delegate', 'web signals'],
    ['e4', 'Planner → Scout 02', 'task.delegate', 'city + market'],
    ['e5', 'Scout 01 → Web', 'tool.call', '8 sources'],
    ['e6', 'Scout 02 → Oracle', 'market.read', 'depth 42M'],
    ['e7', 'Scout 02 → FreeCity', 'world.query', 'activity +12%'],
    ['e8', 'Web → Verifier', 'evidence.push', '0.78'],
    ['e9', 'Oracle → Verifier', 'evidence.push', '0.94'],
    ['e10', 'FreeCity → Verifier', 'state.push', '0.91'],
    ['e13', 'Verifier → Debate', 'debate.counterfactual', '2 branches'],
    ['e14', 'Debate → Decision', 'policy.score', 'BUY 0.87'],
    ['e16', 'Decision → Wallet', 'action.sign', '2,300 TOS'],
    ['e17', 'Wallet → TOS', 'tx.submit', '0x79…a21'],
    ['e18', 'TOS → Exchange', 'value.transfer', '2,300 TOS'],
    ['e19', 'Exchange → Pool', 'liquidity.add', '+0.004%'],
    ['e21', 'TOS → Receipt', 'tx.confirmed', '742 ms'],
    ['e12', 'Alice → Memory', 'memory.commit', 'decision stored']
  ];

  /* ---------------------------- planet data ------------------------- */

  const GLOBE_R = 232;
  const GLOBE_TILT = rad(16);

  const shards = [
    { id: 'tokyo', name: 'FreeCity', sub: 'Shard 07 / Tokyo', lat: 35.68, lon: 139.69, primary: true, agents: '2.72M', tos: '15.8B TOS', pop: '10.73M', load: '72%' },
    { id: 'seattle', name: 'Rainier', sub: 'Shard 01 / Seattle', lat: 47.61, lon: -122.33, agents: '0.91M', tos: '4.2B TOS', pop: '3.11M', load: '58%' },
    { id: 'berlin', name: 'Spree', sub: 'Shard 02 / Berlin', lat: 52.52, lon: 13.40, agents: '0.74M', tos: '3.6B TOS', pop: '2.84M', load: '61%' },
    { id: 'lagos', name: 'Nova Lagos', sub: 'Shard 03 / Lagos', lat: 6.52, lon: 3.38, agents: '1.12M', tos: '2.9B TOS', pop: '5.02M', load: '77%' },
    { id: 'saopaulo', name: 'Paulista', sub: 'Shard 05 / São Paulo', lat: -23.55, lon: -46.63, agents: '0.66M', tos: '2.1B TOS', pop: '4.18M', load: '54%' },
    { id: 'bengaluru', name: 'Deccan', sub: 'Shard 08 / Bengaluru', lat: 12.97, lon: 77.59, agents: '1.48M', tos: '5.4B TOS', pop: '6.29M', load: '81%' },
    { id: 'sydney', name: 'Harbour', sub: 'Shard 09 / Sydney', lat: -33.87, lon: 151.21, agents: '0.38M', tos: '1.4B TOS', pop: '1.62M', load: '44%' },
    { id: 'reykjavik', name: 'Vatna', sub: 'Shard 11 / Reykjavík', lat: 64.15, lon: -21.94, agents: '0.21M', tos: '0.8B TOS', pop: '0.31M', load: '92%' }
  ];

  const shardLinks = [
    ['tokyo', 'seattle'], ['tokyo', 'bengaluru'], ['tokyo', 'sydney'], ['tokyo', 'berlin'],
    ['seattle', 'saopaulo'], ['seattle', 'berlin'], ['berlin', 'lagos'], ['berlin', 'reykjavik'],
    ['bengaluru', 'lagos'], ['saopaulo', 'lagos']
  ];

  const landmasses = [
    [24, 68, -128, -62], [8, 26, -106, -78], [-52, 12, -78, -35],
    [36, 62, -10, 30], [50, 68, 22, 62], [-35, 34, -16, 50],
    [10, 64, 44, 100], [18, 52, 100, 142], [-9, 8, 96, 140],
    [-38, -12, 114, 152], [60, 72, -50, -22]
  ];

  const landDots = (() => {
    const rnd = mulberry(20300520);
    const out = [];
    let guard = 0;
    while (out.length < 2600 && guard < 90000) {
      guard++;
      const box = landmasses[Math.floor(rnd() * landmasses.length)];
      const lat = lerp(box[0], box[1], rnd());
      const lon = lerp(box[2], box[3], rnd());
      out.push({ lat, lon, s: 0.7 + rnd() * 0.9 });
    }
    return out;
  })();

  function globeProject(lat, lon, rot) {
    const la = rad(lat);
    const lo = rad(lon + rot);
    const x = Math.cos(la) * Math.sin(lo);
    const y1 = Math.sin(la);
    const z1 = Math.cos(la) * Math.cos(lo);
    const y = y1 * Math.cos(GLOBE_TILT) - z1 * Math.sin(GLOBE_TILT);
    const z = y1 * Math.sin(GLOBE_TILT) + z1 * Math.cos(GLOBE_TILT);
    return { x: x * GLOBE_R, y: -y * GLOBE_R, z };
  }

  /* ----------------------------- city data -------------------------- */

  const ISO_X = 0.866;
  const ISO_Y = 0.5;
  function iso(gx, gy, h) { return { x: (gx - gy) * ISO_X, y: (gx + gy) * ISO_Y - (h || 0) }; }

  const districts = [
    { id: 'core', name: 'Civic Core', gx: 0, gy: 0, kind: 'system' },
    { id: 'market', name: 'Market Row', gx: 172, gy: -118, kind: 'market' },
    { id: 'foundry', name: 'Foundry', gx: -178, gy: -128, kind: 'compute' },
    { id: 'commons', name: 'Commons', gx: -158, gy: 158, kind: 'social' },
    { id: 'harbor', name: 'Harbor', gx: 176, gy: 168, kind: 'tool' }
  ];
  const districtMap = Object.fromEntries(districts.map(d => [d.id, d]));

  const landmarks = [
    { id: 'atlas', name: 'Atlas Tower', sub: 'Residential stack', district: 'core', gx: 0, gy: 0, w: 34, d: 34, h: 152, kind: 'agent', drill: true, role: 'Agent housing', wallet: '812K TOS', latency: '14 floors', model: '1,204 residents' },
    { id: 'tosnode', name: 'TOS Node', sub: 'Settlement gateway', district: 'core', gx: 74, gy: 40, w: 30, d: 30, h: 98, kind: 'chain', drill: true, role: 'Chain endpoint', wallet: '342.8M TOS', latency: '742 ms', model: 'Validator set' },
    { id: 'exchange', name: 'Exchange', sub: 'Liquidity venue', district: 'market', gx: 172, gy: -118, w: 42, d: 32, h: 108, kind: 'market', drill: true, role: 'Market venue', wallet: '1.2B TOS', latency: '55 ms', model: 'Contract' },
    { id: 'foundryHall', name: 'Model Foundry', sub: 'GPU + weights', district: 'foundry', gx: -178, gy: -128, w: 46, d: 36, h: 90, kind: 'compute', drill: true, role: 'Inference cluster', wallet: '—', latency: '231 ms', model: 'H200 pool' },
    { id: 'commonsHall', name: 'Commons Hall', sub: 'Civic assembly', district: 'commons', gx: -158, gy: 158, w: 38, d: 38, h: 72, kind: 'social', drill: true, role: 'Governance', wallet: '18.4K TOS', latency: '—', model: 'Steward council' },
    { id: 'harborYard', name: 'Logistics Yard', sub: 'Tool + supply', district: 'harbor', gx: 176, gy: 168, w: 48, d: 30, h: 58, kind: 'tool', drill: true, role: 'Tool depot', wallet: '203.7M TOS', latency: '38 ms', model: 'Cluster' }
  ];
  const landmarkMap = Object.fromEntries(landmarks.map(b => [b.id, b]));

  const filler = (() => {
    const out = [];
    districts.forEach(d => {
      const rnd = mulberry(hashStr(d.id));
      for (let i = 0; i < 11; i++) {
        const ang = (i / 11) * Math.PI * 2 + rnd() * 0.5;
        const rr = 52 + rnd() * 58;
        out.push({
          id: `${d.id}-f${i}`,
          district: d.id,
          gx: d.gx + Math.cos(ang) * rr,
          gy: d.gy + Math.sin(ang) * rr,
          w: 14 + rnd() * 14,
          d: 14 + rnd() * 14,
          h: 16 + rnd() * 62,
          kind: d.kind,
          seed: rnd()
        });
      }
    });
    return out;
  })();

  const cityBuildings = [...filler, ...landmarks].sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));

  const roads = [
    ['core', 'market'], ['core', 'foundry'], ['core', 'commons'], ['core', 'harbor'],
    ['market', 'harbor'], ['foundry', 'commons']
  ];

  /* ---------------------------- tower data -------------------------- */

  const FLOOR_COUNT = 14;
  const FLOOR_H = 33;
  const TOWER_HALF = 152;

  const floorThemes = [
    'Atrium & Intake', 'Trade Floor', 'Custody Desk', 'Scout Bay', 'Memory Vault',
    'Planner Pool', 'Ops Deck', 'Archive', 'Verification Lab', 'Model Bench',
    'Settlement Desk', 'Market Guild', 'Commons Deck', 'Beacon Deck'
  ];

  const firstNames = ['Alice', 'Bob', 'Eve', 'Nori', 'Kai', 'Juno', 'Wren', 'Ash', 'Rune', 'Mira', 'Tao', 'Iris', 'Vale', 'Onyx', 'Sable', 'Pike'];
  const roleNames = ['Market strategist', 'Verification lead', 'Open-web scout', 'Planner', 'Custodian', 'Liquidity clerk', 'Archivist', 'Ops runner', 'Model tuner', 'Settlement agent'];
  const modelNames = ['Reasoner-32B', 'Reasoner-14B', 'Planner-14B', 'Verifier-14B', 'Scout-8B'];

  function buildTower(building) {
    const rnd = mulberry(hashStr(building.id));
    const floors = [];
    for (let n = FLOOR_COUNT; n >= 1; n--) {
      const occupants = [];
      const count = 3 + Math.floor(rnd() * 5);
      for (let i = 0; i < count; i++) {
        const nm = firstNames[Math.floor(rnd() * firstNames.length)];
        occupants.push({
          id: `${building.id}-f${n}-a${i}`,
          name: nm,
          sub: `Agent A-${String(10000 + Math.floor(rnd() * 89999))}`,
          role: roleNames[Math.floor(rnd() * roleNames.length)],
          model: modelNames[Math.floor(rnd() * modelNames.length)],
          wallet: `${(rnd() * 90 + 1).toFixed(1)}K TOS`,
          latency: `${Math.round(120 + rnd() * 700)} ms`,
          x: -TOWER_HALF + 34 + (i + 0.5) * ((TOWER_HALF * 2 - 74) / count),
          busy: rnd() > 0.42
        });
      }
      floors.push({
        n,
        name: floorThemes[(n - 1) % floorThemes.length],
        occupants,
        revenue: (rnd() * 40 + 2).toFixed(1),
        gpu: Math.round(20 + rnd() * 78)
      });
    }
    if (building.id === 'atlas') {
      const f12 = floors.find(f => f.n === 12);
      if (f12) {
        f12.name = 'Market Guild';
        f12.occupants[0] = {
          id: 'alice',
          name: 'Alice',
          sub: 'Agent A-055721',
          role: 'Market strategist',
          model: 'Reasoner-32B',
          wallet: '18,493 TOS',
          latency: '482 ms',
          x: f12.occupants[0].x,
          busy: true,
          hero: true
        };
      }
    }
    return { id: building.id, name: building.name, sub: building.sub, floors };
  }

  /* ---------------------------- agent scene ------------------------- */

  const agentFacets = [
    { key: 'INTENT', kind: 'task', mode: 'MIND', get: a => a.intent || 'buy-liquidity', note: 'active goal' },
    { key: 'WALLET', kind: 'chain', mode: 'MONEY', get: a => a.wallet, note: 'TOS balance' },
    { key: 'MEMORY', kind: 'memory', mode: 'MIND', get: a => a.memory || '42.1K vectors', note: 'episodic store' },
    { key: 'MODEL', kind: 'compute', mode: 'COMPUTE', get: a => a.model, note: 'reasoning core' },
    { key: 'TRUST', kind: 'social', mode: 'SOCIAL', get: a => a.trust || '0.86', note: 'peer score' },
    { key: 'CAPABILITY', kind: 'tool', mode: 'CITY', get: a => a.capability || 'market.make/v3', note: 'declared skill' }
  ];

  /* ------------------------------ state ----------------------------- */

  const scenes = [];

  const state = {
    mode: 'CITY',
    running: true,
    speed: 1,
    z: 4,
    targetZ: 4,
    panX: 0, panY: 0,
    targetPanX: 0, targetPanY: 0,
    dominant: 4,
    selected: null,
    hovered: null,
    hoverDrill: false,
    step: 0,
    stepTime: 0,
    simSeconds: 0,
    eventAccumulator: 0,
    last: performance.now(),
    dragging: false,
    moved: false,
    dragStart: null,
    globeRot: -139.69,
    globeRotTarget: -139.69,
    globeLocked: false,
    shard: shards[0],
    building: landmarkMap.atlas,
    tower: null,
    agent: null,
    dpr: Math.max(1, Math.min(2, window.devicePixelRatio || 1))
  };

  state.tower = buildTower(landmarkMap.atlas);
  state.agent = {
    id: 'alice', name: 'Alice', sub: 'Agent A-055721', role: 'Market strategist',
    wallet: '18,493 TOS', latency: '482 ms', model: 'Reasoner-32B',
    intent: 'buy-liquidity', memory: '42.1K vectors', trust: '0.86', capability: 'market.make/v3'
  };

  const F = 3.35;

  function fitScale() {
    return clamp(Math.min(cssW() / 1120, cssH() / 640), 0.4, 1.55);
  }

  function sceneScale(sc) {
    return Math.pow(F, state.z - sc.peak) * sc.base * fitScale();
  }

  function sceneAlpha(sc) {
    const z = state.z;
    if (sc.in1 != null && z < sc.in1) {
      if (z <= sc.in0) return 0;
      return ease((z - sc.in0) / (sc.in1 - sc.in0));
    }
    if (sc.out0 != null && z > sc.out0) {
      if (z >= sc.out1) return 0;
      return 1 - ease((z - sc.out0) / (sc.out1 - sc.out0));
    }
    return 1;
  }

  function project(sc, x, y) {
    const s = sceneScale(sc);
    return {
      x: cssW() * 0.5 + state.panX + (x - sc.fx) * s,
      y: cssH() * 0.48 + state.panY + (y - sc.fy) * s
    };
  }

  function unproject(sc, sx, sy) {
    const s = sceneScale(sc);
    return {
      x: (sx - cssW() * 0.5 - state.panX) / s + sc.fx,
      y: (sy - cssH() * 0.48 - state.panY) / s + sc.fy
    };
  }

  function dominantScene() {
    let best = scenes[0];
    let bestA = -1;
    scenes.forEach(sc => {
      const a = sceneAlpha(sc);
      if (a >= bestA) { bestA = a; best = sc; }
    });
    return best;
  }

  /* --------------------------- scene: planet ------------------------ */

  function drawPlanet(sc, now, alpha) {
    const s = sceneScale(sc);
    const c = project(sc, 0, 0);
    const R = GLOBE_R * s;
    const tone = accent();

    ctx.save();
    ctx.globalAlpha = alpha;

    const glow = ctx.createRadialGradient(c.x, c.y, R * 0.82, c.x, c.y, R * 1.5);
    glow.addColorStop(0, hexAlpha(tone, 0.16));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(c.x, c.y, R * 1.5, 0, Math.PI * 2); ctx.fill();

    const body = ctx.createRadialGradient(c.x - R * 0.35, c.y - R * 0.4, R * 0.05, c.x, c.y, R);
    body.addColorStop(0, 'rgba(23,44,74,.96)');
    body.addColorStop(0.62, 'rgba(9,17,30,.98)');
    body.addColorStop(1, 'rgba(4,7,13,.99)');
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(c.x, c.y, R, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.beginPath(); ctx.arc(c.x, c.y, R, 0, Math.PI * 2); ctx.clip();

    landDots.forEach(d => {
      const p = globeProject(d.lat, d.lon, state.globeRot);
      if (p.z <= 0.02) return;
      const sp = project(sc, p.x, p.y);
      ctx.fillStyle = hexAlpha('#79b4e6', 0.14 + p.z * 0.38);
      const ds = Math.max(1, d.s * s * 1.7);
      ctx.fillRect(sp.x, sp.y, ds, ds);
    });

    ctx.strokeStyle = hexAlpha('#7fb2ff', 0.07);
    ctx.lineWidth = 1;
    for (let lat = -60; lat <= 60; lat += 30) {
      ctx.beginPath();
      let open = false;
      for (let lon = -180; lon <= 180; lon += 4) {
        const p = globeProject(lat, lon, state.globeRot);
        if (p.z <= 0) { open = false; continue; }
        const sp = project(sc, p.x, p.y);
        if (open) ctx.lineTo(sp.x, sp.y); else { ctx.moveTo(sp.x, sp.y); open = true; }
      }
      ctx.stroke();
    }
    for (let lon = -180; lon < 180; lon += 30) {
      ctx.beginPath();
      let started = false;
      for (let lat = -88; lat <= 88; lat += 4) {
        const p = globeProject(lat, lon, state.globeRot);
        if (p.z <= 0) { started = false; continue; }
        const sp = project(sc, p.x, p.y);
        if (started) ctx.lineTo(sp.x, sp.y); else { ctx.moveTo(sp.x, sp.y); started = true; }
      }
      ctx.stroke();
    }
    ctx.restore();

    ctx.strokeStyle = hexAlpha(tone, 0.34);
    ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.arc(c.x, c.y, R, 0, Math.PI * 2); ctx.stroke();

    const positions = {};
    shards.forEach(sh => {
      const p = globeProject(sh.lat, sh.lon, state.globeRot);
      positions[sh.id] = { p, sp: project(sc, p.x, p.y) };
    });

    const moneyEye = state.mode === 'MONEY' || state.mode === 'CITY' || state.mode === 'TIME';
    shardLinks.forEach((link, i) => {
      const a = positions[link[0]];
      const b = positions[link[1]];
      if (!a || !b) return;
      if (a.p.z <= 0.02 && b.p.z <= 0.02) return;
      const depth = clamp((a.p.z + b.p.z) / 2, 0, 1);
      const mx = (a.sp.x + b.sp.x) / 2;
      const my = (a.sp.y + b.sp.y) / 2;
      const dx = b.sp.x - a.sp.x;
      const dy = b.sp.y - a.sp.y;
      const len = Math.max(1, Math.hypot(dx, dy));
      const lift = Math.min(R * 0.34, len * 0.28);
      const vx = mx - c.x;
      const vy = my - c.y;
      const vl = Math.max(1, Math.hypot(vx, vy));
      const cx = mx + (vx / vl) * lift;
      const cy = my + (vy / vl) * lift;
      const col = moneyEye ? '#ffd166' : tone;

      ctx.strokeStyle = hexAlpha(col, 0.06 + depth * 0.3);
      ctx.lineWidth = moneyEye ? 1.15 : 0.75;
      ctx.beginPath();
      ctx.moveTo(a.sp.x, a.sp.y);
      ctx.quadraticCurveTo(cx, cy, b.sp.x, b.sp.y);
      ctx.stroke();

      const parts = moneyEye ? 2 : 1;
      for (let j = 0; j < parts; j++) {
        const t = ((now * 0.00013 * state.speed) + i * 0.19 + j / parts) % 1;
        const u = 1 - t;
        const px = u * u * a.sp.x + 2 * u * t * cx + t * t * b.sp.x;
        const py = u * u * a.sp.y + 2 * u * t * cy + t * t * b.sp.y;
        ctx.fillStyle = hexAlpha(col, 0.25 + depth * 0.6);
        ctx.shadowColor = col; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(px, py, 1.9, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    shards.forEach(sh => {
      const { p, sp } = positions[sh.id];
      if (p.z <= 0.02) return;
      const col = sh.primary ? tone : '#8fb6dd';
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.0025 + sh.lat);
      const rr = (sh.primary ? 6.5 : 4) * clamp(s, 0.5, 2);
      const depth = clamp(p.z, 0, 1);

      if (sh.primary) {
        ctx.strokeStyle = hexAlpha(col, 0.18 + pulse * 0.3);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(sp.x, sp.y, rr + 6 + pulse * 8, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = hexAlpha(col, 0.35 + depth * 0.6);
      ctx.shadowColor = col; ctx.shadowBlur = sh.primary ? 18 : 8;
      ctx.beginPath(); ctx.arc(sp.x, sp.y, rr, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      if (state.selected === sh.id || state.hovered === sh.id) {
        ctx.strokeStyle = hexAlpha(col, 0.8);
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(sp.x, sp.y, rr + 5, 0, Math.PI * 2); ctx.stroke();
      }

      if (depth > 0.25) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = `${clamp(11 * s, 8, 15)}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = hexAlpha(sh.primary ? '#e9f8ff' : '#a9bdd4', 0.35 + depth * 0.6);
        ctx.fillText(sh.name, sp.x, sp.y + rr + 6);
        ctx.font = `${clamp(7.6 * s, 6, 11)}px SFMono-Regular, Consolas, monospace`;
        ctx.fillStyle = hexAlpha('#5d7189', 0.3 + depth * 0.5);
        ctx.fillText(sh.sub, sp.x, sp.y + rr + 6 + clamp(12 * s, 9, 17));
      }
    });

    ctx.restore();
  }

  function pickPlanet(sc, mx, my) {
    let best = null;
    let bestD = Infinity;
    shards.forEach(sh => {
      const p = globeProject(sh.lat, sh.lon, state.globeRot);
      if (p.z <= 0.02) return;
      const sp = project(sc, p.x, p.y);
      const d = Math.hypot(mx - sp.x, my - sp.y);
      const rr = (sh.primary ? 16 : 12);
      if (d < rr && d < bestD) { bestD = d; best = sh; }
    });
    if (!best) return null;
    return {
      id: best.id,
      name: `${best.name} / ${best.sub}`,
      signal: best.primary ? 'LIVE SHARD' : 'OBSERVED',
      labels: ['POPULATION', 'AGENTS', 'ECONOMY', 'GPU LOAD'],
      values: [best.pop, best.agents, best.tos, best.load],
      drill: best.primary ? () => drillToCity(best) : null
    };
  }

  /* ---------------------------- scene: city ------------------------- */

  function buildingTone(b) {
    const base = kindColors[b.kind] || '#7b9cff';
    if (state.mode === 'MONEY') return b.kind === 'market' || b.kind === 'chain' ? '#ffd166' : mix(base, '#2b3550', 0.62);
    if (state.mode === 'COMPUTE') return b.kind === 'compute' ? '#70ffb6' : mix(base, '#2b3550', 0.62);
    if (state.mode === 'SOCIAL') return b.kind === 'social' || b.kind === 'agent' ? '#b390ff' : mix(base, '#2b3550', 0.62);
    if (state.mode === 'MIND') return b.kind === 'agent' ? '#ff7fd1' : mix(base, '#2b3550', 0.6);
    return base;
  }

  function drawBuilding(sc, b, s, now) {
    const hw = b.w / 2;
    const hd = b.d / 2;
    const tone = buildingTone(b);
    const isLandmark = !!b.drill;
    const focusedNow = state.hovered === b.id || state.selected === b.id;

    const g = [
      iso(b.gx - hw, b.gy - hd, 0), iso(b.gx + hw, b.gy - hd, 0),
      iso(b.gx + hw, b.gy + hd, 0), iso(b.gx - hw, b.gy + hd, 0)
    ].map(p => project(sc, p.x, p.y));
    const t = [
      iso(b.gx - hw, b.gy - hd, b.h), iso(b.gx + hw, b.gy - hd, b.h),
      iso(b.gx + hw, b.gy + hd, b.h), iso(b.gx - hw, b.gy + hd, b.h)
    ].map(p => project(sc, p.x, p.y));

    ctx.lineWidth = focusedNow ? 1.3 : 0.8;

    // Faces are painted opaque first, then tinted, so the painter's-algorithm
    // sort reads as solid massing instead of overlapping wireframes.
    const face = (pts, tint, edge) => {
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.fillStyle = 'rgba(8,12,20,.97)';
      ctx.fill();
      ctx.fillStyle = hexAlpha(tone, tint);
      ctx.fill();
      ctx.strokeStyle = hexAlpha(tone, edge);
      ctx.stroke();
    };

    face([g[1], g[2], t[2], t[1]], isLandmark ? 0.16 : 0.11, focusedNow ? 0.75 : (isLandmark ? 0.44 : 0.22));
    face([g[3], g[2], t[2], t[3]], isLandmark ? 0.07 : 0.045, focusedNow ? 0.6 : (isLandmark ? 0.32 : 0.16));
    face([t[0], t[1], t[2], t[3]], isLandmark ? 0.34 : 0.21, focusedNow ? 0.9 : (isLandmark ? 0.62 : 0.32));

    if (s > 0.62) {
      const rows = Math.max(1, Math.floor(b.h / 22));
      ctx.strokeStyle = hexAlpha(tone, 0.14);
      ctx.lineWidth = 0.6;
      for (let i = 1; i <= rows; i++) {
        const hh = (b.h * i) / (rows + 1);
        const a = project(sc, iso(b.gx + hw, b.gy - hd, hh).x, iso(b.gx + hw, b.gy - hd, hh).y);
        const c2 = project(sc, iso(b.gx + hw, b.gy + hd, hh).x, iso(b.gx + hw, b.gy + hd, hh).y);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c2.x, c2.y); ctx.stroke();
      }
    }

    if (isLandmark) {
      const top = project(sc, iso(b.gx, b.gy, b.h).x, iso(b.gx, b.gy, b.h).y);
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.003 + b.gx * 0.02);
      ctx.fillStyle = hexAlpha(tone, 0.5 + pulse * 0.5);
      ctx.shadowColor = tone; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(top.x, top.y, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      if (s > 0.5) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.font = `${clamp(10.5 * s, 8, 14)}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = hexAlpha('#dcefff', 0.82);
        ctx.fillText(b.name, top.x, top.y - 16);
        if (s > 0.85) {
          ctx.font = `${clamp(7.4 * s, 6, 10)}px SFMono-Regular, Consolas, monospace`;
          ctx.fillStyle = hexAlpha(tone, 0.6);
          ctx.fillText(b.sub, top.x, top.y - 16 + clamp(11 * s, 9, 14));
        }
      }
    }
  }

  function drawCity(sc, now, alpha) {
    const s = sceneScale(sc);
    const tone = accent();
    ctx.save();
    ctx.globalAlpha = alpha;

    const plateR = 300;
    const corners = [iso(-plateR, -plateR), iso(plateR, -plateR), iso(plateR, plateR), iso(-plateR, plateR)]
      .map(p => project(sc, p.x, p.y));
    ctx.beginPath();
    corners.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    const plate = ctx.createLinearGradient(corners[0].x, corners[0].y, corners[2].x, corners[2].y);
    plate.addColorStop(0, 'rgba(12,22,38,.55)');
    plate.addColorStop(1, 'rgba(5,9,16,.72)');
    ctx.fillStyle = plate; ctx.fill();
    ctx.strokeStyle = hexAlpha(tone, 0.18); ctx.lineWidth = 1; ctx.stroke();

    ctx.strokeStyle = 'rgba(103,152,214,.055)';
    ctx.lineWidth = 0.7;
    for (let g = -plateR; g <= plateR; g += 50) {
      const a1 = project(sc, iso(g, -plateR).x, iso(g, -plateR).y);
      const a2 = project(sc, iso(g, plateR).x, iso(g, plateR).y);
      ctx.beginPath(); ctx.moveTo(a1.x, a1.y); ctx.lineTo(a2.x, a2.y); ctx.stroke();
      const b1 = project(sc, iso(-plateR, g).x, iso(-plateR, g).y);
      const b2 = project(sc, iso(plateR, g).x, iso(plateR, g).y);
      ctx.beginPath(); ctx.moveTo(b1.x, b1.y); ctx.lineTo(b2.x, b2.y); ctx.stroke();
    }

    const flowColor = state.mode === 'MONEY' ? '#ffd166' : state.mode === 'SOCIAL' ? '#b390ff' : tone;
    roads.forEach((r, i) => {
      const A = districtMap[r[0]];
      const B = districtMap[r[1]];
      const a = project(sc, iso(A.gx, A.gy).x, iso(A.gx, A.gy).y);
      const b = project(sc, iso(B.gx, B.gy).x, iso(B.gx, B.gy).y);
      ctx.strokeStyle = hexAlpha(flowColor, 0.14);
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      for (let j = 0; j < 3; j++) {
        const t = ((now * 0.00019 * state.speed) + i * 0.21 + j / 3) % 1;
        const px = lerp(a.x, b.x, t);
        const py = lerp(a.y, b.y, t);
        ctx.fillStyle = hexAlpha(flowColor, 0.75);
        ctx.shadowColor = flowColor; ctx.shadowBlur = 7;
        ctx.beginPath(); ctx.arc(px, py, 1.7, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    cityBuildings.forEach(b => drawBuilding(sc, b, s, now));

    if (s > 0.55) {
      districts.forEach(d => {
        const p = project(sc, iso(d.gx, d.gy).x, iso(d.gx, d.gy).y);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = `${clamp(8 * s, 6.5, 11)}px SFMono-Regular, Consolas, monospace`;
        ctx.fillStyle = hexAlpha('#61748c', 0.85);
        ctx.fillText(d.name.toUpperCase(), p.x, p.y + 22 * s);
      });
    }

    ctx.restore();
  }

  function pickCity(sc, mx, my) {
    for (let i = cityBuildings.length - 1; i >= 0; i--) {
      const b = cityBuildings[i];
      const hw = b.w / 2;
      const hd = b.d / 2;
      const t = [
        iso(b.gx - hw, b.gy - hd, b.h), iso(b.gx + hw, b.gy - hd, b.h),
        iso(b.gx + hw, b.gy + hd, b.h), iso(b.gx - hw, b.gy + hd, b.h)
      ].map(p => project(sc, p.x, p.y));
      const g2 = project(sc, iso(b.gx + hw, b.gy + hd, 0).x, iso(b.gx + hw, b.gy + hd, 0).y);
      const minX = Math.min(...t.map(p => p.x));
      const maxX = Math.max(...t.map(p => p.x));
      const minY = Math.min(...t.map(p => p.y));
      const maxY = g2.y;
      if (mx < minX || mx > maxX || my < minY || my > maxY) continue;
      if (!b.drill) {
        const d = districtMap[b.district];
        return {
          id: b.id,
          name: `${d.name} block / ${b.id.split('-')[1]}`,
          signal: 'DISTRICT',
          labels: ['DISTRICT', 'FOOTPRINT', 'HEIGHT', 'CLASS'],
          values: [d.name, `${Math.round(b.w)}×${Math.round(b.d)}`, `${Math.round(b.h)} m`, b.kind],
          drill: null
        };
      }
      return {
        id: b.id,
        name: `${b.name} / ${b.sub}`,
        signal: 'DRILLABLE',
        labels: ['ROLE', 'VALUE', 'SCALE', 'CAPACITY'],
        values: [b.role, b.wallet, b.latency, b.model],
        drill: () => drillToTower(b)
      };
    }
    return null;
  }

  /* --------------------------- scene: tower ------------------------- */

  function floorY(n) { return 236 - n * FLOOR_H; }

  function drawTower(sc, now, alpha) {
    const s = sceneScale(sc);
    const tone = accent();
    const tower = state.tower;
    ctx.save();
    ctx.globalAlpha = alpha;

    const topY = floorY(FLOOR_COUNT) - 20;
    const botY = floorY(0) + 26;
    const a = project(sc, -TOWER_HALF, topY);
    const b = project(sc, TOWER_HALF, botY);
    ctx.fillStyle = 'rgba(8,13,22,.62)';
    ctx.strokeStyle = hexAlpha(tone, 0.2);
    ctx.lineWidth = 1;
    roundedRect(ctx, a.x, a.y, b.x - a.x, b.y - a.y, 6 * s);
    ctx.fill(); ctx.stroke();

    const beacon = project(sc, 0, topY - 30);
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.004);
    ctx.strokeStyle = hexAlpha(tone, 0.3);
    ctx.beginPath();
    ctx.moveTo(project(sc, 0, topY).x, project(sc, 0, topY).y);
    ctx.lineTo(beacon.x, beacon.y);
    ctx.stroke();
    ctx.fillStyle = hexAlpha(tone, 0.4 + pulse * 0.6);
    ctx.shadowColor = tone; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(beacon.x, beacon.y, 3.4 * clamp(s, 0.5, 2), 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    tower.floors.forEach(f => {
      const y = floorY(f.n);
      const p0 = project(sc, -TOWER_HALF + 8, y);
      const p1 = project(sc, TOWER_HALF - 8, y + FLOOR_H - 5);
      const active = state.selected === `${tower.id}-floor-${f.n}`;
      const hovered = state.hovered === `${tower.id}-floor-${f.n}`;

      let fill = 'rgba(255,255,255,.016)';
      if (state.mode === 'MONEY') fill = hexAlpha('#ffd166', 0.02 + (Number(f.revenue) / 42) * 0.1);
      else if (state.mode === 'COMPUTE') fill = hexAlpha('#70ffb6', 0.02 + (f.gpu / 100) * 0.1);
      ctx.fillStyle = active || hovered ? hexAlpha(tone, 0.09) : fill;
      ctx.strokeStyle = hexAlpha(tone, active || hovered ? 0.4 : 0.12);
      ctx.lineWidth = 0.9;
      roundedRect(ctx, p0.x, p0.y, p1.x - p0.x, p1.y - p0.y, 3);
      ctx.fill(); ctx.stroke();

      if (s > 0.5) {
        const lp = project(sc, -TOWER_HALF - 12, y + FLOOR_H / 2 - 3);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.font = `${clamp(8.4 * s, 6.5, 12)}px SFMono-Regular, Consolas, monospace`;
        ctx.fillStyle = hexAlpha('#6d7f96', 0.95);
        ctx.fillText(`F${String(f.n).padStart(2, '0')}`, lp.x, lp.y);
        ctx.textAlign = 'left';
        const rp = project(sc, TOWER_HALF + 12, y + FLOOR_H / 2 - 3);
        ctx.fillStyle = hexAlpha(active ? '#dbf3ff' : '#57687e', 0.95);
        ctx.fillText(f.name, rp.x, rp.y);
        if (state.mode === 'MONEY') {
          ctx.fillStyle = hexAlpha('#ffd166', 0.7);
          ctx.fillText(`  ${f.revenue}K TOS/d`, rp.x + 96 * s, rp.y);
        } else if (state.mode === 'COMPUTE') {
          ctx.fillStyle = hexAlpha('#70ffb6', 0.7);
          ctx.fillText(`  GPU ${f.gpu}%`, rp.x + 96 * s, rp.y);
        }
      }

      f.occupants.forEach((o, i) => {
        const p = project(sc, o.x, y + FLOOR_H / 2 - 3);
        const col = o.hero ? tone : (o.busy ? '#7fd2ff' : '#5a6d85');
        const beat = o.busy ? 0.5 + 0.5 * Math.sin(now * 0.006 + i * 1.7 + f.n) : 0.4;
        const rr = (o.hero ? 5.4 : 3.4) * clamp(s, 0.45, 2.1);
        if (o.hero) {
          ctx.strokeStyle = hexAlpha(col, 0.2 + beat * 0.4);
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(p.x, p.y, rr + 5 + beat * 4, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.fillStyle = hexAlpha(col, 0.45 + beat * 0.5);
        ctx.shadowColor = col; ctx.shadowBlur = o.hero ? 14 : 5;
        ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        if (state.hovered === o.id) {
          ctx.strokeStyle = hexAlpha('#e8f7ff', 0.8);
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(p.x, p.y, rr + 4, 0, Math.PI * 2); ctx.stroke();
        }
        if (o.hero && s > 0.6) {
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.font = `${clamp(9 * s, 7, 13)}px Inter, system-ui, sans-serif`;
          ctx.fillStyle = hexAlpha('#e6f7ff', 0.9);
          ctx.fillText(o.name, p.x, p.y - rr - 5);
        }
      });

      if (state.mode === 'SOCIAL' && f.occupants.length > 1) {
        ctx.strokeStyle = hexAlpha('#b390ff', 0.16);
        ctx.lineWidth = 0.7;
        for (let i = 0; i < f.occupants.length - 1; i++) {
          const p = project(sc, f.occupants[i].x, y + FLOOR_H / 2 - 3);
          const q = project(sc, f.occupants[i + 1].x, y + FLOOR_H / 2 - 3);
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
    });

    const shaftX = TOWER_HALF - 26;
    const sTop = project(sc, shaftX, topY + 10);
    const sBot = project(sc, shaftX, botY - 10);
    ctx.strokeStyle = hexAlpha(tone, 0.16);
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(sTop.x, sTop.y); ctx.lineTo(sBot.x, sBot.y); ctx.stroke();
    ctx.setLineDash([]);
    const carT = (Math.sin(now * 0.00035 * state.speed) + 1) / 2;
    const car = { x: sTop.x, y: lerp(sTop.y, sBot.y, carT) };
    ctx.fillStyle = hexAlpha(tone, 0.85);
    ctx.shadowColor = tone; ctx.shadowBlur = 12;
    roundedRect(ctx, car.x - 4 * s, car.y - 5 * s, 8 * s, 10 * s, 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    const street = project(sc, 0, botY + 4);
    ctx.strokeStyle = hexAlpha('#5f7189', 0.28);
    ctx.lineWidth = 1;
    const sl = project(sc, -TOWER_HALF - 60, botY + 4);
    const sr = project(sc, TOWER_HALF + 60, botY + 4);
    ctx.beginPath(); ctx.moveTo(sl.x, sl.y); ctx.lineTo(sr.x, sr.y); ctx.stroke();
    for (let i = 0; i < 9; i++) {
      const t = ((now * 0.00009 * state.speed) + i / 9) % 1;
      const px = lerp(sl.x, sr.x, t);
      ctx.fillStyle = hexAlpha('#8fb6dd', 0.5);
      ctx.beginPath(); ctx.arc(px, street.y - 4 * s, 1.7 * clamp(s, 0.5, 2), 0, Math.PI * 2); ctx.fill();
    }

    if (s > 0.55) {
      const title = project(sc, 0, topY - 30);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${clamp(13 * s, 10, 19)}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = hexAlpha('#e6f6ff', 0.9);
      ctx.fillText(tower.name, title.x, title.y);
      ctx.font = `${clamp(8 * s, 6.5, 11)}px SFMono-Regular, Consolas, monospace`;
      ctx.fillStyle = hexAlpha(tone, 0.6);
      ctx.fillText(`${tower.sub} · ${FLOOR_COUNT} floors`, title.x, title.y + clamp(15 * s, 12, 22));
    }

    ctx.restore();
  }

  function pickTower(sc, mx, my) {
    const tower = state.tower;
    for (const f of tower.floors) {
      const y = floorY(f.n);
      for (const o of f.occupants) {
        const p = project(sc, o.x, y + FLOOR_H / 2 - 3);
        if (Math.hypot(mx - p.x, my - p.y) < 11) {
          return {
            id: o.id,
            name: `${o.name} / ${o.sub}`,
            signal: o.busy ? 'THINKING' : 'IDLE',
            labels: ['ROLE', 'WALLET', 'LATENCY', 'MODEL'],
            values: [o.role, o.wallet, o.latency, o.model],
            drill: () => drillToAgent(o, f)
          };
        }
      }
      const p0 = project(sc, -TOWER_HALF + 8, y);
      const p1 = project(sc, TOWER_HALF - 8, y + FLOOR_H - 5);
      if (mx >= p0.x && mx <= p1.x && my >= p0.y && my <= p1.y) {
        return {
          id: `${tower.id}-floor-${f.n}`,
          name: `${tower.name} · F${String(f.n).padStart(2, '0')} / ${f.name}`,
          signal: 'FLOOR',
          labels: ['RESIDENTS', 'REVENUE', 'GPU', 'TOWER'],
          values: [`${f.occupants.length} agents`, `${f.revenue}K TOS/d`, `${f.gpu}%`, tower.name],
          drill: null
        };
      }
    }
    return null;
  }

  /* --------------------------- scene: agent ------------------------- */

  function drawAgentScene(sc, now, alpha) {
    const s = sceneScale(sc);
    const a = state.agent;
    const tone = accent();
    const c = project(sc, 0, 0);
    ctx.save();
    ctx.globalAlpha = alpha;

    for (let i = 0; i < 3; i++) {
      const rr = (96 + i * 46) * s;
      ctx.strokeStyle = hexAlpha(tone, 0.07 - i * 0.015);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(c.x, c.y, rr, 0, Math.PI * 2); ctx.stroke();
    }

    const ticks = 72;
    for (let i = 0; i < ticks; i++) {
      const ang = (i / ticks) * Math.PI * 2 + now * 0.00012 * state.speed;
      const r0 = 236 * s;
      const r1 = r0 + (i % 6 === 0 ? 9 : 4) * s;
      ctx.strokeStyle = hexAlpha(tone, i % 6 === 0 ? 0.26 : 0.1);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(c.x + Math.cos(ang) * r0, c.y + Math.sin(ang) * r0);
      ctx.lineTo(c.x + Math.cos(ang) * r1, c.y + Math.sin(ang) * r1);
      ctx.stroke();
    }

    const vitals = [
      ['FOCUS', 0.82, '#65e7ff'],
      ['ENERGY', 0.61, '#70ffb6'],
      ['REPUTATION', 0.86, '#ffd166']
    ];
    vitals.forEach((v, i) => {
      const rr = (116 + i * 14) * s;
      const span = Math.PI * 1.35 * v[1];
      ctx.strokeStyle = hexAlpha(v[2], 0.1);
      ctx.lineWidth = 3.2 * clamp(s, 0.4, 1.6);
      ctx.beginPath(); ctx.arc(c.x, c.y, rr, Math.PI * 0.82, Math.PI * 0.82 + Math.PI * 1.35); ctx.stroke();
      ctx.strokeStyle = hexAlpha(v[2], 0.72);
      ctx.beginPath(); ctx.arc(c.x, c.y, rr, Math.PI * 0.82, Math.PI * 0.82 + span); ctx.stroke();
    });

    const hexR = 62 * s;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const ang = rad(i * 60 - 30);
      const px = c.x + Math.cos(ang) * hexR;
      const py = c.y + Math.sin(ang) * hexR;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    const core = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, hexR);
    core.addColorStop(0, hexAlpha(tone, 0.38));
    core.addColorStop(1, 'rgba(7,12,20,.96)');
    ctx.fillStyle = core;
    ctx.strokeStyle = hexAlpha(tone, state.hovered === 'agent-core' ? 0.95 : 0.6);
    ctx.lineWidth = 1.6;
    ctx.shadowColor = tone; ctx.shadowBlur = 26;
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${clamp(30 * s, 16, 46)}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = hexAlpha('#ecfaff', 0.94);
    ctx.fillText(a.name.slice(0, 1), c.x, c.y - 4 * s);
    ctx.font = `${clamp(8 * s, 6.5, 11)}px SFMono-Regular, Consolas, monospace`;
    ctx.fillStyle = hexAlpha(tone, 0.75);
    ctx.fillText(a.sub, c.x, c.y + 26 * s);

    agentFacets.forEach((f, i) => {
      const ang = (i / agentFacets.length) * Math.PI * 2 + now * 0.00016 * state.speed - Math.PI / 2;
      const rr = 203 * s;
      const px = c.x + Math.cos(ang) * rr;
      const py = c.y + Math.sin(ang) * rr;
      const col = state.mode === f.mode ? tone : kindColors[f.kind];
      const emph = state.mode === f.mode || state.mode === 'CITY' || state.mode === 'TIME';

      ctx.strokeStyle = hexAlpha(col, emph ? 0.3 : 0.1);
      ctx.lineWidth = emph ? 1 : 0.6;
      ctx.beginPath();
      ctx.moveTo(c.x + Math.cos(ang) * hexR, c.y + Math.sin(ang) * hexR);
      ctx.lineTo(px, py);
      ctx.stroke();

      const pt = ((now * 0.0004 * state.speed) + i * 0.16) % 1;
      const qx = lerp(c.x + Math.cos(ang) * hexR, px, pt);
      const qy = lerp(c.y + Math.sin(ang) * hexR, py, pt);
      ctx.fillStyle = hexAlpha(col, emph ? 0.85 : 0.3);
      ctx.beginPath(); ctx.arc(qx, qy, 1.8, 0, Math.PI * 2); ctx.fill();

      const w = 118 * s;
      const h = 40 * s;
      ctx.fillStyle = 'rgba(7,12,20,.86)';
      ctx.strokeStyle = hexAlpha(col, state.hovered === `facet-${f.key}` ? 0.85 : (emph ? 0.42 : 0.16));
      ctx.lineWidth = 1;
      roundedRect(ctx, px - w / 2, py - h / 2, w, h, 5);
      ctx.fill(); ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${clamp(7.4 * s, 6, 10)}px SFMono-Regular, Consolas, monospace`;
      ctx.fillStyle = hexAlpha(col, 0.72);
      ctx.fillText(f.key, px, py - 10 * s);
      ctx.font = `${clamp(10 * s, 8, 14)}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = hexAlpha('#dceeff', emph ? 0.92 : 0.45);
      ctx.fillText(String(f.get(a)), px, py + 6 * s);
    });

    ctx.restore();
  }

  function pickAgentScene(sc, mx, my) {
    const a = state.agent;
    const c = project(sc, 0, 0);
    const s = sceneScale(sc);
    if (Math.hypot(mx - c.x, my - c.y) < 62 * s) {
      return {
        id: 'agent-core',
        name: `${a.name} / ${a.sub}`,
        signal: 'THINKING',
        labels: ['ROLE', 'WALLET', 'LATENCY', 'MODEL'],
        values: [a.role, a.wallet, a.latency, a.model],
        drill: () => drillToGraph()
      };
    }
    for (let i = 0; i < agentFacets.length; i++) {
      const f = agentFacets[i];
      const ang = (i / agentFacets.length) * Math.PI * 2 + performance.now() * 0.00016 * state.speed - Math.PI / 2;
      const rr = 203 * s;
      const px = c.x + Math.cos(ang) * rr;
      const py = c.y + Math.sin(ang) * rr;
      if (Math.abs(mx - px) < 59 * s && Math.abs(my - py) < 20 * s) {
        return {
          id: `facet-${f.key}`,
          name: `${a.name} · ${f.key}`,
          signal: 'FACET',
          labels: ['FACET', 'VALUE', 'MEANING', 'OWNER'],
          values: [f.key, String(f.get(a)), f.note, a.name],
          drill: null
        };
      }
    }
    return null;
  }

  /* --------------------------- scene: graph ------------------------- */

  function activeSetForMode(mode) {
    switch (mode) {
      case 'MONEY': return new Set(['money', 'chain']);
      case 'SOCIAL': return new Set(['social']);
      case 'MIND': return new Set(['intent', 'decision', 'evidence']);
      case 'COMPUTE': return new Set(['compute', 'tool']);
      case 'LIFE': return new Set(['social', 'intent', 'money']);
      case 'CAUSE': return new Set(['intent', 'delegation', 'evidence', 'decision', 'chain']);
      case 'TIME': return new Set(Object.keys(edgeColors));
      default: return new Set(Object.keys(edgeColors));
    }
  }

  const GRAPH_HUBS = ['alice', 'planner', 'verify', 'decision', 'tos', 'exchange', 'city', 'bank'];
  const GRAPH_MID_HIDDEN = ['browser', 'oracle', 'bob', 'eve', 'gpu', 'model', 'receipt'];

  function nodeVisible(n) {
    if (state.z < 3.74) return GRAPH_HUBS.includes(n.id);
    if (state.z < 4.02) return !GRAPH_MID_HIDDEN.includes(n.id);
    return true;
  }

  function curveFor(edge) {
    const a = nodeMap[edge.a];
    const b = nodeMap[edge.b];
    const p0 = { x: a.x, y: a.y };
    const p2 = { x: b.x, y: b.y };
    const dx = p2.x - p0.x;
    const dy = p2.y - p0.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const sign = ((edge.id.charCodeAt(edge.id.length - 1) + edge.id.length) % 2) ? 1 : -1;
    const bend = Math.min(65, len * 0.15) * sign;
    return {
      p0,
      p1: { x: (p0.x + p2.x) / 2 - (dy / len) * bend, y: (p0.y + p2.y) / 2 + (dx / len) * bend },
      p2
    };
  }

  function qPoint(curve, t) {
    const u = 1 - t;
    return {
      x: u * u * curve.p0.x + 2 * u * t * curve.p1.x + t * t * curve.p2.x,
      y: u * u * curve.p0.y + 2 * u * t * curve.p1.y + t * t * curve.p2.y
    };
  }

  function edgeAlpha(edge) {
    const modeSet = activeSetForMode(state.mode);
    if (!nodeVisible(nodeMap[edge.a]) || !nodeVisible(nodeMap[edge.b])) return 0;
    if (state.mode === 'CITY' || state.mode === 'TIME') return 0.34;
    return modeSet.has(edge.type) ? 0.64 : 0.055;
  }

  function drawGraphEdge(sc, edge, now, idx, s) {
    const alpha = edgeAlpha(edge);
    if (!alpha) return;
    const c = curveFor(edge);
    const a = project(sc, c.p0.x, c.p0.y);
    const b = project(sc, c.p1.x, c.p1.y);
    const d = project(sc, c.p2.x, c.p2.y);
    const activeEdge = sequence[state.step % sequence.length][0] === edge.id;
    const modeSet = activeSetForMode(state.mode);
    const emphasized = modeSet.has(edge.type) || state.mode === 'CITY' || state.mode === 'TIME';
    const base = activeEdge ? accent() : edgeColors[edge.type];

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(b.x, b.y, d.x, d.y);
    ctx.strokeStyle = hexAlpha(base, activeEdge ? 0.95 : alpha);
    ctx.lineWidth = (activeEdge ? 1.8 : (emphasized ? 0.85 : 0.45)) * clamp(s, 0.6, 2);
    ctx.shadowColor = base;
    ctx.shadowBlur = activeEdge ? 14 : 0;
    ctx.stroke();
    ctx.restore();

    if (state.z > 4.22 && emphasized) {
      const lp = qPoint(c, 0.53);
      const sp = project(sc, lp.x, lp.y);
      ctx.save();
      ctx.font = `${clamp(8 * s, 7, 13)}px SFMono-Regular, Consolas, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(edge.label).width;
      ctx.fillStyle = 'rgba(4,8,14,.78)';
      roundedRect(ctx, sp.x - tw / 2 - 5, sp.y - 8, tw + 10, 16, 3);
      ctx.fill();
      ctx.fillStyle = hexAlpha(base, 0.75);
      ctx.fillText(edge.label, sp.x, sp.y + 0.2);
      ctx.restore();
    }

    if (!emphasized) return;
    const particleCount = activeEdge ? 4 : (state.z > 4.1 ? 2 : 1);
    for (let j = 0; j < particleCount; j++) {
      const phase = ((now * 0.00016 * state.speed * (activeEdge ? 2.1 : 1)) + idx * 0.137 + j / particleCount) % 1;
      const wp = qPoint(c, phase);
      const sp = project(sc, wp.x, wp.y);
      ctx.save();
      ctx.fillStyle = hexAlpha(base, activeEdge ? 1 : 0.78);
      ctx.shadowColor = base;
      ctx.shadowBlur = activeEdge ? 14 : 8;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, (activeEdge ? 2.7 : 1.6) * clamp(s, 0.7, 1.8), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawGraphNode(sc, n, now, s) {
    if (!nodeVisible(n)) return;
    const p = project(sc, n.x, n.y);
    const base = kindColors[n.kind] || '#8fa8c8';
    const selected = state.selected === n.id;
    const hovered = state.hovered === n.id;
    const ae = edgeMap[sequence[state.step % sequence.length][0]];
    const active = ae && (ae.a === n.id || ae.b === n.id);
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.004 + n.x * 0.01);
    const r = Math.max(6, n.r * s);

    if (active || selected) {
      ctx.save();
      ctx.strokeStyle = hexAlpha(active ? accent() : base, 0.15 + pulse * 0.16);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + (9 + pulse * 4) * clamp(s, 0.6, 1.8), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    const grd = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.4, 1, p.x, p.y, r * 1.25);
    grd.addColorStop(0, hexAlpha(base, 0.34));
    grd.addColorStop(0.7, 'rgba(9,15,25,.96)');
    grd.addColorStop(1, 'rgba(5,8,14,.98)');
    ctx.fillStyle = grd;
    ctx.strokeStyle = hexAlpha(base, selected || hovered || active ? 0.8 : 0.38);
    ctx.lineWidth = selected ? 1.7 : 1;
    ctx.shadowColor = base;
    ctx.shadowBlur = active ? 20 : (selected ? 12 : 4);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = hexAlpha(base, 0.92);
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(1.8, r * 0.13), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `${clamp(11 * s, 8.5, 16)}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = selected || active ? '#effbff' : '#afbdd0';
    ctx.fillText(n.label, p.x, p.y + r + 8);
    if (state.z > 4.12) {
      ctx.font = `${clamp(8 * s, 6.5, 12)}px SFMono-Regular, Consolas, monospace`;
      ctx.fillStyle = '#52647b';
      ctx.fillText(n.sub, p.x, p.y + r + 8 + clamp(14 * s, 11, 20));
    }
    ctx.restore();

    if (state.z > 4.55 && ['alice', 'planner', 'verify', 'tos'].includes(n.id)) {
      const w = 96 * s;
      const h = 24 * s;
      ctx.save();
      ctx.fillStyle = 'rgba(7,12,19,.78)';
      ctx.strokeStyle = hexAlpha(base, 0.2);
      ctx.lineWidth = 1;
      roundedRect(ctx, p.x - w / 2, p.y - r - h - 9, w, h, 4);
      ctx.fill(); ctx.stroke();
      ctx.font = `${clamp(8.4 * s, 7, 12)}px SFMono-Regular, Consolas, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = hexAlpha(base, 0.85);
      const txt = n.id === 'tos' ? '742ms · block final' : n.id === 'alice' ? 'thinking · 12.8K tok' : 'runtime · nominal';
      ctx.fillText(txt, p.x, p.y - r - h / 2 - 9);
      ctx.restore();
    }
  }

  function drawMicroNodes(sc, now, s) {
    if (state.z < 4.72) return;
    const fade = clamp((state.z - 4.72) / 0.3, 0, 1);
    ctx.save();
    ctx.globalAlpha *= fade;
    ctx.setLineDash([2, 5]);
    microNodes.forEach((n, i) => {
      const p = project(sc, n.x, n.y);
      const base = kindColors[n.kind];
      const anchor = i < 4 ? nodeMap.model : nodeMap.tos;
      const a = project(sc, anchor.x, anchor.y);
      ctx.strokeStyle = hexAlpha(base, 0.2);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.fillStyle = hexAlpha(base, 0.85);
      ctx.shadowColor = base; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(p.x, p.y, 3.4 * clamp(s, 0.6, 1.6), 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.font = `${clamp(8 * s, 7, 12)}px SFMono-Regular, Consolas, monospace`;
      ctx.fillStyle = '#7c8ea5';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(n.label, p.x, p.y + 8 * clamp(s, 0.6, 1.6));
    });
    ctx.restore();
  }

  function drawGraph(sc, now, alpha) {
    const s = sceneScale(sc);
    ctx.save();
    ctx.globalAlpha = alpha;
    edges.forEach((e, i) => drawGraphEdge(sc, e, now, i, s));
    nodes.forEach(n => drawGraphNode(sc, n, now, s));
    drawMicroNodes(sc, now, s);
    ctx.restore();
  }

  function pickGraph(sc, mx, my) {
    const s = sceneScale(sc);
    let best = null;
    let bestDist = Infinity;
    for (const n of nodes) {
      if (!nodeVisible(n)) continue;
      const p = project(sc, n.x, n.y);
      const dist = Math.hypot(mx - p.x, my - p.y);
      const r = Math.max(12, n.r * s) + 7;
      if (dist < r && dist < bestDist) { best = n; bestDist = dist; }
    }
    if (!best) return null;
    return {
      id: best.id,
      name: `${best.label} / ${best.sub}`,
      signal: best.kind.toUpperCase(),
      labels: ['ROLE', 'WALLET', 'LATENCY', 'MODEL'],
      values: [best.role, best.wallet, best.latency, best.model],
      drill: null
    };
  }

  /* -------------------------- scene registry ------------------------ */

  scenes.push(
    {
      key: 'PLANET', name: 'PLANET', crumb: 'PLANET', hint: 'Click a live shard to enter its city', peak: 0, base: 1.16,
      in0: null, in1: null, out0: 0.32, out1: 1.04,
      fx: 0, fy: 0, tx: 0, ty: 0,
      draw: drawPlanet, pick: pickPlanet,
      legend: [['Live shard', '#65e7ff'], ['Observed shard', '#8fb6dd'], ['Settlement arc', '#ffd166']],
      stats: () => [
        [`${shards.length}`, 'TOS SHARDS'],
        ['28.1M', 'CITIZENS'],
        ['36.2B', 'TOS / DAY']
      ],
      pulse: () => [
        ['Shards online', `${shards.length}/8`, 'stable'],
        ['Cross-shard tx', '84.2K/m', '+2.1%'],
        ['Global agents', '8.22M', '+3.4%'],
        ['Finality p95', '0.9 s', 'nominal']
      ],
      ambient: [
        ['Shard 11 / Vatna', 'shard.sync', '0.9 s'],
        ['Shard 03 / Lagos', 'agents.migrated', '+1,204'],
        ['TOS mainnet', 'block.finalized', '#8,491,220'],
        ['Shard 08 / Deccan', 'load.rebalance', 'gpu 81%'],
        ['Cross-shard', 'value.transfer', '12.4M TOS']
      ]
    },
    {
      key: 'CITY', name: 'FREECITY', crumb: 'FREECITY', hint: 'Click a landmark to enter the building', peak: 1, base: 1.0,
      in0: 0.12, in1: 0.8, out0: 1.36, out1: 2.04,
      fx: 0, fy: 0, tx: 0, ty: 0,
      draw: drawCity, pick: pickCity,
      legend: [['Landmark', '#65e7ff'], ['Market', '#ff9b68'], ['Compute', '#62f4c2'], ['Commons', '#b390ff']],
      stats: () => [
        ['10.73M', 'CITY POPULATION'],
        [`${districts.length}`, 'DISTRICTS'],
        ['15.8B', 'TOS ECONOMY']
      ],
      pulse: () => [
        ['Population', '10.73M', '+0.8%'],
        ['Autonomous agents', '2.72M', '+3.4%'],
        ['Economic volume', '15.8B', 'TOS'],
        ['GPU load', '72%', 'stable']
      ],
      ambient: [
        ['Market Row', 'commerce.settled', '18.4 TOS'],
        ['Foundry', 'inference.batch', '231 ms'],
        ['Commons Hall', 'proposal.opened', 'beacon-14'],
        ['Harbor', 'tool.dispatch', '42 jobs'],
        ['Civic Core', 'residents.moved', '+38']
      ]
    },
    {
      key: 'TOWER', name: 'TOWER', crumb: 'ATLAS TOWER', hint: 'Click an agent to open their profile', peak: 2, base: 1.08,
      in0: 1.12, in1: 1.8, out0: 2.36, out1: 3.04,
      fx: 58, fy: -2, tx: 58, ty: -2,
      draw: drawTower, pick: pickTower,
      legend: [['Working agent', '#7fd2ff'], ['Idle agent', '#5a6d85'], ['Focus agent', '#65e7ff']],
      stats: () => [
        [`${state.tower.floors.reduce((a, f) => a + f.occupants.length, 0)}`, 'RESIDENTS'],
        [`${FLOOR_COUNT}`, 'FLOORS'],
        ['812K', 'TOS ON FLOOR']
      ],
      pulse: () => [
        ['Residents', `${state.tower.floors.reduce((a, f) => a + f.occupants.length, 0)}`, 'live'],
        ['Busy now', `${state.tower.floors.reduce((a, f) => a + f.occupants.filter(o => o.busy).length, 0)}`, 'working'],
        ['Floor revenue', `${state.tower.floors.reduce((a, f) => a + Number(f.revenue), 0).toFixed(0)}K`, 'TOS/d'],
        ['Mean GPU', `${Math.round(state.tower.floors.reduce((a, f) => a + f.gpu, 0) / FLOOR_COUNT)}%`, 'shard 07']
      ],
      ambient: [
        ['Atlas · F12', 'agent.woke', 'Alice'],
        ['Atlas · F09', 'evidence.scored', '0.91'],
        ['Atlas · F06', 'plan.emitted', '4 subtasks'],
        ['Atlas · F03', 'custody.locked', '2,300 TOS'],
        ['Atlas · lobby', 'visitor.enter', 'Agent A-77120']
      ]
    },
    {
      key: 'AGENT', name: 'AGENT', crumb: 'ALICE', hint: 'Click the core to open its Living Graph', peak: 3, base: 1.16,
      in0: 2.12, in1: 2.8, out0: 3.32, out1: 3.9,
      fx: 0, fy: 0, tx: 0, ty: 0,
      draw: drawAgentScene, pick: pickAgentScene,
      legend: [['Intent', '#9a77ff'], ['Wallet', '#ffd166'], ['Model', '#62f4c2'], ['Trust', '#b390ff']],
      stats: () => [
        [state.agent.wallet.replace(' TOS', ''), 'TOS BALANCE'],
        [state.agent.latency, 'DECISION LATENCY'],
        ['0.87', 'CONFIDENCE']
      ],
      pulse: () => [
        ['Focus', '82%', 'high'],
        ['Energy', '61%', 'ok'],
        ['Reputation', '0.86', '+0.02'],
        ['Open intents', '1', 'buy-liquidity']
      ],
      ambient: [
        ['Alice', 'memory.read', '4 chunks'],
        ['Alice', 'capability.check', 'market.make/v3'],
        ['Alice', 'peer.trust', 'Bob 0.72'],
        ['Alice', 'wallet.balance', '18,493 TOS'],
        ['Alice', 'model.tokens', '12.8K']
      ]
    },
    {
      key: 'GRAPH', name: 'LIVING GRAPH', crumb: 'LIVING GRAPH', hint: 'Keep scrolling for runtime detail', peak: 4, base: 0.72,
      in0: 3.08, in1: 3.88, out0: null, out1: null,
      fx: 142, fy: 60, tx: 142, ty: 60,
      draw: drawGraph, pick: pickGraph,
      legend: [['Agent', '#65e7ff'], ['Task', '#9a77ff'], ['Tool', '#70ffb6'], ['TOS', '#ffd166']],
      stats: () => [
        [`${nodes.length}`, 'GRAPH NODES'],
        [`${edges.length}`, 'CAUSAL EDGES'],
        ['48.2K', 'TOS / MIN']
      ],
      pulse: () => [
        ['Nodes', `${nodes.length}`, 'live'],
        ['Edges', `${edges.length}`, 'causal'],
        ['Step', `${state.step + 1}/${sequence.length}`, 'chain'],
        ['Confidence', '0.87', 'BUY']
      ],
      ambient: [
        ['Scout 109', 'tool.result', 'confidence .82'],
        ['GPU / shard 07', 'inference.done', '231 ms'],
        ['Exchange', 'liquidity.delta', '+0.004%'],
        ['TOS / shard 02', 'block.finalized', '#8,491,220'],
        ['Agent 1203', 'social.follow', 'Agent 0991']
      ]
    }
  );

  scenes.forEach(sc => { sc.dfx = sc.tx; sc.dfy = sc.ty; });

  const sceneByKey = Object.fromEntries(scenes.map(sc => [sc.key, sc]));
  const LAYER_NAMES = ['PLANET', 'FREECITY', 'TOWER', 'AGENT', 'LIVING GRAPH', 'RUNTIME'];

  /* --------------------------- navigation --------------------------- */

  function focusScene(sc, x, y) { sc.tx = x; sc.ty = y; }

  function goToZ(z, label) {
    state.targetZ = clamp(z, 0, 5.2);
    state.targetPanX = 0;
    state.targetPanY = 0;
    if (label) publishOperator('god.zoom', label);
  }

  function restoreFraming(fromPeak) {
    scenes.forEach(sc => {
      if (sc.peak >= fromPeak) { sc.tx = sc.dfx; sc.ty = sc.dfy; }
    });
  }

  function drillToCity(shard) {
    state.shard = shard;
    state.globeLocked = true;
    state.globeRotTarget = -shard.lon;
    const p = globeProject(shard.lat, shard.lon, -shard.lon);
    focusScene(sceneByKey.PLANET, p.x, p.y);
    ui.shardLabel.textContent = `WORLD ${shard.sub.toUpperCase()}`;
    goToZ(1, shard.name);
  }

  function drillToTower(building) {
    state.building = building;
    state.tower = buildTower(building);
    sceneByKey.TOWER.crumb = building.name.toUpperCase();
    const p = iso(building.gx, building.gy, building.h * 0.5);
    focusScene(sceneByKey.CITY, p.x, p.y);
    goToZ(2, building.name);
  }

  function drillToAgent(occupant, floor) {
    state.agent = {
      id: occupant.id,
      name: occupant.name,
      sub: occupant.sub,
      role: occupant.role,
      wallet: occupant.wallet,
      latency: occupant.latency,
      model: occupant.model,
      intent: occupant.hero ? 'buy-liquidity' : `${floor.name.toLowerCase().split(' ')[0]}.work`,
      memory: `${(10 + (hashStr(occupant.id) % 400) / 10).toFixed(1)}K vectors`,
      trust: (0.5 + (hashStr(occupant.id) % 45) / 100).toFixed(2),
      capability: occupant.hero ? 'market.make/v3' : 'task.execute/v1'
    };
    sceneByKey.AGENT.crumb = occupant.name.toUpperCase();
    const y = floorY(floor.n) + FLOOR_H / 2 - 3;
    focusScene(sceneByKey.TOWER, occupant.x, y);
    goToZ(3, occupant.name);
  }

  function drillToGraph() {
    focusScene(sceneByKey.AGENT, 0, 0);
    goToZ(4, 'Living Graph');
  }

  function ascend() {
    const next = Math.max(0, Math.ceil(state.z - 1.001));
    if (next <= 0) state.globeLocked = false;
    restoreFraming(next);
    goToZ(next, LAYER_NAMES[Math.min(next, LAYER_NAMES.length - 1)]);
  }

  function jumpTo(idx) {
    if (idx <= 0) state.globeLocked = false;
    restoreFraming(idx);
    goToZ(idx === 5 ? 4.95 : idx, LAYER_NAMES[idx]);
  }

  function layerIndex() {
    if (state.z >= 4.6) return 5;
    return clamp(Math.round(state.z), 0, 4);
  }

  /* ------------------------------ chrome ---------------------------- */

  let lastChromeKey = '';

  function renderBreadcrumb() {
    const li = layerIndex();
    const crumbs = [
      { i: 0, text: 'PLANET' },
      { i: 1, text: state.shard.name.toUpperCase() },
      { i: 2, text: sceneByKey.TOWER.crumb },
      { i: 3, text: sceneByKey.AGENT.crumb },
      { i: 4, text: 'LIVING GRAPH' },
      { i: 5, text: 'RUNTIME' }
    ];
    ui.breadcrumb.innerHTML = crumbs.map(c => {
      const cls = c.i === li ? 'crumb active' : (c.i < li ? 'crumb' : 'crumb dim');
      return `<button class="${cls}" data-crumb="${c.i}">${escapeHtml(c.text)}</button>`;
    }).join('<i class="crumb-sep">›</i>');
    [...ui.breadcrumb.querySelectorAll('.crumb')].forEach(btn => {
      btn.addEventListener('click', () => jumpTo(Number(btn.dataset.crumb)));
    });
  }

  // Chrome follows the breadcrumb layer, not whichever scene happens to hold the
  // most alpha mid-transition, so labels never disagree with the crumb trail.
  function chromeScene() {
    return scenes[Math.min(layerIndex(), scenes.length - 1)];
  }

  function applyChrome() {
    const sc = chromeScene();
    const li = layerIndex();
    const key = `${sc.key}|${li}|${state.mode}|${sceneByKey.TOWER.crumb}|${sceneByKey.AGENT.crumb}`;
    if (key === lastChromeKey) return;
    lastChromeKey = key;

    ui.zoomLayer.textContent = LAYER_NAMES[li];
    ui.drillHint.textContent = `${sc.hint} · Esc to pull back`;
    renderBreadcrumb();

    ui.legend.innerHTML = sc.legend
      .map(([label, color]) => `<div><i class="swatch" style="background:${color};box-shadow:0 0 8px ${color}"></i>${escapeHtml(label)}</div>`)
      .join('');

    const stats = sc.stats();
    ui.statA.textContent = stats[0][0]; ui.statALabel.textContent = stats[0][1];
    ui.statB.textContent = stats[1][0]; ui.statBLabel.textContent = stats[1][1];
    ui.statC.textContent = stats[2][0]; ui.statCLabel.textContent = stats[2][1];

    ui.pulseTitle.textContent = `${sc.name} PULSE`;
    ui.pulseGrid.innerHTML = sc.pulse()
      .map(([l, v, e]) => `<div><small>${escapeHtml(l)}</small><strong>${escapeHtml(v)}</strong><em>${escapeHtml(e)}</em></div>`)
      .join('');

    ui.rail.forEach(item => item.classList.toggle('active', Number(item.dataset.jump) === li));
    ui.renderStats.textContent = sc.key === 'GRAPH'
      ? `NODES ${nodes.length} · EDGES ${edges.length} · LAYER ${LAYER_NAMES[li]}`
      : `LAYER ${LAYER_NAMES[li]} · SCENE ${sc.key} · MODE ${state.mode}`;
  }

  /* ------------------------------ render ---------------------------- */

  function resize() {
    const rect = graphWrap.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * state.dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * state.dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const srect = sparkCanvas.getBoundingClientRect();
    sparkCanvas.width = Math.max(1, Math.floor(srect.width * state.dpr));
    sparkCanvas.height = Math.max(1, Math.floor(84 * state.dpr));
  }

  function drawBackdrop(now) {
    const w = cssW();
    const h = cssH();
    ctx.save();
    const halo = ctx.createRadialGradient(w * 0.5, h * 0.46, 0, w * 0.5, h * 0.46, Math.min(w, h) * 0.62);
    halo.addColorStop(0, hexAlpha(accent(), 0.045));
    halo.addColorStop(0.55, 'rgba(14,25,44,.015)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);

    const starAlpha = clamp(1 - state.z * 0.8, 0, 1);
    const count = 44 + Math.round(starAlpha * 90);
    for (let i = 0; i < count; i++) {
      const x = ((i * 193 + 71) % Math.max(1, w));
      const y = ((i * 113 + 37) % Math.max(1, h));
      const a = (0.05 + 0.05 * Math.sin(now * 0.0008 + i)) * (1 + starAlpha);
      ctx.fillStyle = `rgba(150,195,255,${a})`;
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.restore();
  }

  function render(now) {
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    ctx.clearRect(0, 0, cssW(), cssH());
    drawBackdrop(now);
    scenes.forEach(sc => {
      const a = sceneAlpha(sc);
      if (a <= 0.004) return;
      sc.draw(sc, now, a);
    });
    renderSparkline(now);
  }

  function renderSparkline(now) {
    const w = sparkCanvas.width / state.dpr;
    const h = sparkCanvas.height / state.dpr;
    spark.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    spark.clearRect(0, 0, w, h);
    spark.strokeStyle = 'rgba(129,165,212,.08)';
    spark.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = h * i / 4;
      spark.beginPath(); spark.moveTo(0, y); spark.lineTo(w, y); spark.stroke();
    }
    const color = accent();
    const points = 44;
    const bias = state.z * 0.4;
    const vals = [];
    for (let i = 0; i < points; i++) {
      vals.push(0.5 + 0.13 * Math.sin(i * 0.38 + now * 0.0007 + bias) + 0.07 * Math.sin(i * 1.15 + 1.7) + 0.03 * Math.sin(i * 0.14));
    }
    const grad = spark.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, hexAlpha(color, 0.23));
    grad.addColorStop(1, hexAlpha(color, 0));
    spark.beginPath();
    vals.forEach((v, i) => {
      const x = i / (points - 1) * w;
      const y = h - v * h;
      i ? spark.lineTo(x, y) : spark.moveTo(x, y);
    });
    spark.lineTo(w, h); spark.lineTo(0, h); spark.closePath(); spark.fillStyle = grad; spark.fill();
    spark.beginPath();
    vals.forEach((v, i) => {
      const x = i / (points - 1) * w;
      const y = h - v * h;
      i ? spark.lineTo(x, y) : spark.moveTo(x, y);
    });
    spark.strokeStyle = hexAlpha(color, 0.72); spark.lineWidth = 1.2; spark.stroke();
  }

  /* ------------------------------- loop ----------------------------- */

  function tick(now) {
    const dt = Math.min(0.05, (now - state.last) / 1000);
    state.last = now;

    const k = Math.min(1, dt * 5.2);
    state.z += (state.targetZ - state.z) * k;
    if (Math.abs(state.targetZ - state.z) < 0.0006) state.z = state.targetZ;

    state.panX += (state.targetPanX - state.panX) * Math.min(1, dt * 9);
    state.panY += (state.targetPanY - state.panY) * Math.min(1, dt * 9);

    scenes.forEach(sc => {
      sc.fx += (sc.tx - sc.fx) * Math.min(1, dt * 5.2);
      sc.fy += (sc.ty - sc.fy) * Math.min(1, dt * 5.2);
    });

    if (state.globeLocked) {
      state.globeRot += (state.globeRotTarget - state.globeRot) * Math.min(1, dt * 3.2);
    } else if (state.running) {
      state.globeRot -= dt * 3.4 * state.speed;
      state.globeRotTarget = state.globeRot;
    }

    if (state.running) {
      state.stepTime += dt * state.speed;
      state.simSeconds += dt * state.speed * 4;
      state.eventAccumulator += dt * state.speed;

      if (state.stepTime > 1.35) {
        state.stepTime = 0;
        state.step = (state.step + 1) % sequence.length;
        emitCurrentEvent();
      }
      if (state.eventAccumulator > 0.72) {
        state.eventAccumulator = 0;
        emitAmbientEvent();
      }
    }

    updateClock();
    applyChrome();
    ui.zoomLabel.textContent = `z ${state.z.toFixed(2)} · ${Math.round(Math.pow(F, state.z - chromeScene().peak) * 100)}%`;
    render(now);
    requestAnimationFrame(tick);
  }

  /* ------------------------------ events ---------------------------- */

  /* ------------------------- gateway ingress ------------------------ *
   * This scene renders the graph; it does not own events. Everything it
   * produces goes out as a canonical envelope and comes back through the
   * gateway, exactly like a real runtime would.
   * ------------------------------------------------------------------ */

  const SIM_EPOCH = Date.UTC(2030, 4, 20, 14, 35, 22);

  // Graph node kinds → entity URN kinds.
  const URN_KIND = {
    agent: 'agent', task: 'task', system: 'service', tool: 'tool',
    chain: 'chain', market: 'market', memory: 'memory',
    compute: 'compute', social: 'agent', decision: 'decision'
  };

  // Ambient rows are scene atmosphere rather than named world entities, so
  // their actor string is slugged into an addressable URN per layer.
  const AMBIENT_KIND = { PLANET: 'shard', CITY: 'district', TOWER: 'building', AGENT: 'agent', GRAPH: 'service' };

  function simNow() {
    return SIM_EPOCH + state.simSeconds * 1000;
  }

  function nodeUrn(nodeId) {
    const node = nodeMap[nodeId];
    if (!node) return `entity:${nodeId}`;
    return `${URN_KIND[node.kind] || 'entity'}:${nodeId}`;
  }

  function slugUrn(kind, label) {
    const slug = String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `${kind}:${slug || 'unknown'}`;
  }

  function feeds() {
    return window.FreeCity && window.FreeCity.feeds ? window.FreeCity.feeds : null;
  }

  function publishScripted(raw) {
    const feed = feeds();
    return feed ? feed.scripted(raw) : null;
  }

  /** Operator actions are world events too: recording them means TIME
   *  replay shows what the observer did, not only what the world did. */
  function publishOperator(type, detail, target) {
    const feed = feeds();
    if (!feed) return null;
    return feed.console({
      timestamp: simNow(),
      type,
      source: 'operator:god-mode',
      target: target || null,
      world: 'freecity',
      correlation_id: `god_${Math.floor(state.simSeconds)}`,
      payload: { detail: String(detail) }
    });
  }

  let runId = null;
  let lastScriptedId = null;

  function emitCurrentEvent() {
    const step = sequence[state.step];
    if (!step) return;
    const [edgeId, , type, result] = step;
    const edge = edgeMap[edgeId];
    if (state.step === 0 || !runId) {
      runId = `run_${Math.round(simNow()).toString(36)}`;
      lastScriptedId = null;
    }
    const envelope = publishScripted({
      event_id: `${runId}_${state.step}`,
      timestamp: simNow(),
      type,
      source: edge ? nodeUrn(edge.a) : 'agent:alice',
      target: edge ? nodeUrn(edge.b) : null,
      world: 'freecity',
      causation_id: lastScriptedId,
      correlation_id: runId,
      payload: { detail: result, edge: edgeId, step: state.step + 1, of: sequence.length }
    });
    if (envelope) lastScriptedId = envelope.event_id;
  }

  let ambientIndex = 0;
  function emitAmbientEvent() {
    const scene = chromeScene();
    const pool = scene.ambient;
    const row = pool[ambientIndex++ % pool.length];
    publishScripted({
      timestamp: simNow(),
      type: row[1],
      source: slugUrn(AMBIENT_KIND[scene.key] || 'entity', row[0]),
      target: null,
      world: 'freecity',
      payload: { detail: row[2], ambient: true, layer: scene.key }
    });
  }

  function updateClock() {
    const replay = window.FreeCity && window.FreeCity.gateway
      ? window.FreeCity.gateway.replay.state()
      : { active: false };
    if (replay.active) return;
    ui.clock.textContent = new Date(simNow()).toISOString().replace('T', ' ').slice(0, 19);
  }

  /* ---------------------------- selection --------------------------- */

  function applySelection(hit) {
    state.selected = hit.id;
    ui.selectedName.textContent = hit.name;
    ui.selectedSignal.textContent = hit.signal;
    ui.selectedLabels.forEach((el, i) => { el.textContent = hit.labels[i]; });
    ui.selectedRole.textContent = hit.values[0];
    ui.selectedWallet.textContent = hit.values[1];
    ui.selectedLatency.textContent = hit.values[2];
    ui.selectedModel.textContent = hit.values[3];
    ui.selectionCard.animate([
      { transform: 'translateY(4px)', opacity: 0.65 },
      { transform: 'translateY(0)', opacity: 1 }
    ], { duration: 190, easing: 'ease-out' });
  }

  function pickAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    for (let i = scenes.length - 1; i >= 0; i--) {
      const sc = scenes[i];
      if (sceneAlpha(sc) < 0.5) continue;
      const hit = sc.pick(sc, mx, my);
      if (hit) return hit;
    }
    return null;
  }

  /* ------------------------------ input ----------------------------- */

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const anchorScene = dominantScene();
    const before = unproject(anchorScene, mx, my);
    state.z = clamp(state.z - e.deltaY * 0.0016, 0, 5.2);
    state.targetZ = state.z;
    const after = project(anchorScene, before.x, before.y);
    state.panX += mx - after.x;
    state.panY += my - after.y;
    state.targetPanX = state.panX;
    state.targetPanY = state.panY;
  }, { passive: false });

  canvas.addEventListener('pointerdown', e => {
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* pointer already released */ }
    state.dragging = true;
    state.moved = false;
    state.dragStart = { x: e.clientX, y: e.clientY, panX: state.panX, panY: state.panY };
  });

  canvas.addEventListener('pointermove', e => {
    const hit = pickAt(e.clientX, e.clientY);
    state.hovered = hit ? hit.id : null;
    state.hoverDrill = !!(hit && hit.drill);
    canvas.style.cursor = state.dragging ? 'grabbing' : (hit ? (hit.drill ? 'zoom-in' : 'pointer') : 'grab');
    if (!state.dragging) return;
    const dx = e.clientX - state.dragStart.x;
    const dy = e.clientY - state.dragStart.y;
    if (Math.hypot(dx, dy) > 3) state.moved = true;
    state.panX = state.targetPanX = state.dragStart.panX + dx;
    state.panY = state.targetPanY = state.dragStart.panY + dy;
  });

  canvas.addEventListener('pointerup', e => {
    if (!state.moved) {
      const hit = pickAt(e.clientX, e.clientY);
      if (hit) {
        applySelection(hit);
        if (hit.drill) hit.drill();
      }
    }
    state.dragging = false;
  });

  canvas.addEventListener('pointerleave', () => { state.hovered = null; state.dragging = false; });
  canvas.addEventListener('contextmenu', e => { e.preventDefault(); ascend(); });

  ui.tabs.forEach(tab => tab.addEventListener('click', () => setMode(tab.dataset.mode)));
  ui.rail.forEach(item => item.addEventListener('click', () => jumpTo(Number(item.dataset.jump))));
  ui.ascend.addEventListener('click', ascend);
  ui.resetView.addEventListener('click', resetView);
  ui.replay.addEventListener('click', resetSimulation);
  ui.playPause.addEventListener('click', togglePlay);
  ui.speed.addEventListener('change', () => {
    state.speed = Number(ui.speed.value) || 1;
    publishOperator('god.time_scale', `${state.speed}×`);
  });

  window.addEventListener('resize', resize);

  window.addEventListener('keydown', e => {
    if (e.target instanceof HTMLSelectElement) return;
    if (e.key === 'Escape') { ascend(); return; }
    if (e.key === ' ') { e.preventDefault(); togglePlay(); return; }
    if (e.key === '+' || e.key === '=') { goToZ(state.targetZ + 1); return; }
    if (e.key === '-' || e.key === '_') { goToZ(state.targetZ - 1); return; }
    if (e.key >= '1' && e.key <= '6') { jumpTo(Number(e.key) - 1); }
  });

  function togglePlay() {
    state.running = !state.running;
    ui.playPause.textContent = state.running ? 'Ⅱ' : '▶';
    publishOperator(state.running ? 'god.resume' : 'god.pause', state.running ? 'LIVE' : 'FROZEN');
  }

  function setMode(mode) {
    state.mode = mode;
    document.body.className = `mode-${mode}`;
    ui.tabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
    ui.modeTitle.textContent = modeMeta[mode][0];
    publishOperator('god.lens_changed', mode);
  }

  function resetView() {
    state.targetPanX = state.panX = 0;
    state.targetPanY = state.panY = 0;
    scenes.forEach(sc => {
      if (sc.key === 'GRAPH') { sc.tx = 142; sc.ty = 60; }
      else if (sc.key === 'TOWER') { sc.tx = 58; sc.ty = -2; }
      else { sc.tx = 0; sc.ty = 0; }
    });
  }

  function resetSimulation() {
    state.step = 0;
    state.stepTime = 0;
    state.simSeconds = 0;
    runId = null;
    lastScriptedId = null;
    ambientIndex = 0;
    for (let i = 0; i < 5; i++) emitAmbientEvent();
    emitCurrentEvent();
  }

  /* ------------------------------- boot ----------------------------- */

  resize();
  setMode('CITY');
  applyChrome();
  resetSimulation();
  applySelection({
    id: 'alice',
    name: 'Alice / Agent A-055721',
    signal: 'THINKING',
    labels: ['ROLE', 'WALLET', 'LATENCY', 'MODEL'],
    values: ['Market strategist', '18,493 TOS', '482 ms', 'Reasoner-32B'],
    drill: null
  });
  requestAnimationFrame(tick);
})();
