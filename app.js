(() => {
  'use strict';

  const canvas = document.getElementById('graphCanvas');
  const ctx = canvas.getContext('2d');
  const graphWrap = document.getElementById('graphWrap');
  const sparkCanvas = document.getElementById('sparkCanvas');
  const spark = sparkCanvas.getContext('2d');

  const ui = {
    tabs: [...document.querySelectorAll('.eye-tab')],
    modeTitle: document.getElementById('modeTitle'),
    zoomLabel: document.getElementById('zoomLabel'),
    playPause: document.getElementById('playPause'),
    replay: document.getElementById('replay'),
    resetView: document.getElementById('resetView'),
    speed: document.getElementById('speedSelect'),
    clock: document.getElementById('clock'),
    progress: document.getElementById('timelineProgress'),
    stream: document.getElementById('eventStream'),
    renderStats: document.getElementById('renderStats'),
    causal: [...document.querySelectorAll('#causalList li')],
    chainStatus: document.getElementById('chainStatus'),
    selectedName: document.getElementById('selectedName'),
    selectedRole: document.getElementById('selectedRole'),
    selectedWallet: document.getElementById('selectedWallet'),
    selectedLatency: document.getElementById('selectedLatency'),
    selectedModel: document.getElementById('selectedModel'),
    selectionCard: document.getElementById('selectionCard'),
    eventRate: document.getElementById('eventRate'),
    tosRate: document.getElementById('tosRate'),
    agentCount: document.getElementById('agentCount'),
    eventsPerSec: document.getElementById('eventsPerSec')
  };

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
    social: '#b390ff'
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
    ['e13', 'Verifier → Debate', 'counterfactual', '2 branches'],
    ['e14', 'Debate → Decision', 'policy.score', 'BUY 0.87'],
    ['e16', 'Decision → Wallet', 'action.sign', '2,300 TOS'],
    ['e17', 'Wallet → TOS', 'tx.submit', '0x79…a21'],
    ['e18', 'TOS → Exchange', 'value.transfer', '2,300 TOS'],
    ['e19', 'Exchange → Pool', 'liquidity.add', '+0.004%'],
    ['e21', 'TOS → Receipt', 'tx.confirmed', '742 ms'],
    ['e12', 'Alice → Memory', 'memory.commit', 'decision stored']
  ];

  const state = {
    mode: 'CITY',
    running: true,
    speed: 1,
    zoom: 1,
    panX: 0,
    panY: 0,
    targetPanX: 0,
    targetPanY: 0,
    selected: 'alice',
    hovered: null,
    step: 0,
    stepTime: 0,
    simSeconds: 0,
    eventAccumulator: 0,
    last: performance.now(),
    pointer: { x: 0, y: 0 },
    dragging: false,
    moved: false,
    dragStart: null,
    dpr: Math.max(1, Math.min(2, window.devicePixelRatio || 1))
  };

  const activeSetForMode = mode => {
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
  };

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

  function worldToScreen(x, y) {
    const w = canvas.width / state.dpr;
    const h = canvas.height / state.dpr;
    return {
      x: w * 0.47 + state.panX + x * state.zoom,
      y: h * 0.45 + state.panY + y * state.zoom
    };
  }

  function screenToWorld(x, y) {
    const w = canvas.width / state.dpr;
    const h = canvas.height / state.dpr;
    return {
      x: (x - w * 0.47 - state.panX) / state.zoom,
      y: (y - h * 0.45 - state.panY) / state.zoom
    };
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

  function nodeVisible(n) {
    if (state.zoom < 0.73) return ['alice', 'planner', 'verify', 'decision', 'tos', 'exchange', 'city', 'bank'].includes(n.id);
    if (state.zoom < 0.93) return !['browser', 'oracle', 'bob', 'eve', 'gpu', 'model', 'receipt'].includes(n.id);
    return true;
  }

  function edgeAlpha(edge) {
    const modeSet = activeSetForMode(state.mode);
    const bothVisible = nodeVisible(nodeMap[edge.a]) && nodeVisible(nodeMap[edge.b]);
    if (!bothVisible) return 0;
    if (state.mode === 'CITY' || state.mode === 'TIME') return 0.34;
    return modeSet.has(edge.type) ? 0.64 : 0.055;
  }

  function drawEdge(edge, now, idx) {
    const alpha = edgeAlpha(edge);
    if (!alpha) return;
    const c = curveFor(edge);
    const a = worldToScreen(c.p0.x, c.p0.y);
    const b = worldToScreen(c.p1.x, c.p1.y);
    const d = worldToScreen(c.p2.x, c.p2.y);
    const activeEdge = sequence[state.step % sequence.length][0] === edge.id;
    const modeSet = activeSetForMode(state.mode);
    const emphasized = modeSet.has(edge.type) || state.mode === 'CITY' || state.mode === 'TIME';
    const base = activeEdge ? modeMeta[state.mode][1] : edgeColors[edge.type];

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(b.x, b.y, d.x, d.y);
    ctx.strokeStyle = hexAlpha(base, activeEdge ? .95 : alpha);
    ctx.lineWidth = activeEdge ? 1.8 : (emphasized ? .85 : .45);
    ctx.shadowColor = base;
    ctx.shadowBlur = activeEdge ? 14 : 0;
    ctx.stroke();
    ctx.restore();

    if (state.zoom > 1.18 && emphasized) {
      const lp = qPoint(c, .53);
      const sp = worldToScreen(lp.x, lp.y);
      ctx.save();
      ctx.font = `${Math.max(7, 7.4 * state.zoom)}px SFMono-Regular, Consolas, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(edge.label).width;
      ctx.fillStyle = 'rgba(4,8,14,.78)';
      roundedRect(ctx, sp.x - tw / 2 - 5, sp.y - 7, tw + 10, 14, 3);
      ctx.fill();
      ctx.fillStyle = hexAlpha(base, .72);
      ctx.fillText(edge.label, sp.x, sp.y + .2);
      ctx.restore();
    }

    if (!emphasized || state.zoom < .68) return;
    const particleCount = activeEdge ? 4 : (state.zoom > 1.1 ? 2 : 1);
    for (let j = 0; j < particleCount; j++) {
      const phase = ((now * .00016 * state.speed * (activeEdge ? 2.1 : 1)) + idx * .137 + j / particleCount) % 1;
      const wp = qPoint(c, phase);
      const sp = worldToScreen(wp.x, wp.y);
      ctx.save();
      ctx.fillStyle = hexAlpha(base, activeEdge ? 1 : .78);
      ctx.shadowColor = base;
      ctx.shadowBlur = activeEdge ? 14 : 8;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, activeEdge ? 2.7 : 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawNode(n, now) {
    if (!nodeVisible(n)) return;
    const p = worldToScreen(n.x, n.y);
    const base = kindColors[n.kind] || '#8fa8c8';
    const selected = state.selected === n.id;
    const hovered = state.hovered === n.id;
    const activeEdgeId = sequence[state.step % sequence.length][0];
    const ae = edgeMap[activeEdgeId];
    const active = ae && (ae.a === n.id || ae.b === n.id);
    const pulse = .5 + .5 * Math.sin(now * .004 + n.x * .01);
    const r = Math.max(8, n.r * Math.min(1.35, state.zoom));

    if (active || selected) {
      ctx.save();
      ctx.strokeStyle = hexAlpha(active ? modeMeta[state.mode][1] : base, .15 + pulse * .16);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 9 + pulse * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    const grd = ctx.createRadialGradient(p.x - r * .35, p.y - r * .4, 1, p.x, p.y, r * 1.25);
    grd.addColorStop(0, hexAlpha(base, .34));
    grd.addColorStop(.7, 'rgba(9,15,25,.96)');
    grd.addColorStop(1, 'rgba(5,8,14,.98)');
    ctx.fillStyle = grd;
    ctx.strokeStyle = hexAlpha(base, selected || hovered || active ? .8 : .38);
    ctx.lineWidth = selected ? 1.7 : 1;
    ctx.shadowColor = base;
    ctx.shadowBlur = active ? 20 : (selected ? 12 : 4);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = hexAlpha(base, .92);
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(2.2, r * .13), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (state.zoom > .76 || selected) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = `${Math.max(9, Math.min(12, 10 * state.zoom))}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = selected || active ? '#effbff' : '#afbdd0';
      ctx.fillText(n.label, p.x, p.y + r + 8);
      if (state.zoom > 1.08) {
        ctx.font = `${Math.max(7, 7.4 * state.zoom)}px SFMono-Regular, Consolas, monospace`;
        ctx.fillStyle = '#52647b';
        ctx.fillText(n.sub, p.x, p.y + r + 22);
      }
      ctx.restore();
    }

    if (state.zoom > 1.55 && ['alice', 'planner', 'verify', 'tos'].includes(n.id)) {
      const w = 76 * state.zoom;
      const h = 21 * state.zoom;
      ctx.save();
      ctx.fillStyle = 'rgba(7,12,19,.75)';
      ctx.strokeStyle = hexAlpha(base, .16);
      ctx.lineWidth = 1;
      roundedRect(ctx, p.x - w / 2, p.y - r - h - 7, w, h, 4);
      ctx.fill(); ctx.stroke();
      ctx.font = `${7.3 * state.zoom}px SFMono-Regular, Consolas, monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = hexAlpha(base, .8);
      const txt = n.id === 'tos' ? '742ms · block final' : n.id === 'alice' ? 'thinking · 12.8K tok' : 'runtime · nominal';
      ctx.fillText(txt, p.x, p.y - r - 14 * state.zoom);
      ctx.restore();
    }
  }

  function drawMicroNodes(now) {
    if (state.zoom < 1.68) return;
    ctx.save();
    ctx.setLineDash([2, 5]);
    microNodes.forEach((n, i) => {
      const p = worldToScreen(n.x, n.y);
      const base = kindColors[n.kind];
      const anchor = i < 4 ? nodeMap.model : nodeMap.tos;
      const a = worldToScreen(anchor.x, anchor.y);
      ctx.strokeStyle = hexAlpha(base, .18);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.fillStyle = hexAlpha(base, .8);
      ctx.shadowColor = base; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.font = `${7 * state.zoom}px SFMono-Regular, Consolas, monospace`;
      ctx.fillStyle = '#73859b';
      ctx.textAlign = 'center';
      ctx.fillText(n.label, p.x, p.y + 12);
    });
    ctx.restore();
  }

  function drawBackdrop(now) {
    const w = canvas.width / state.dpr;
    const h = canvas.height / state.dpr;
    ctx.save();
    const halo = ctx.createRadialGradient(w * .5, h * .46, 0, w * .5, h * .46, Math.min(w, h) * .62);
    halo.addColorStop(0, hexAlpha(modeMeta[state.mode][1], .045));
    halo.addColorStop(.55, 'rgba(14,25,44,.015)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 44; i++) {
      const x = ((i * 193 + 71) % Math.max(1, w));
      const y = ((i * 113 + 37) % Math.max(1, h));
      const a = .05 + .05 * Math.sin(now * .0008 + i);
      ctx.fillStyle = `rgba(150,195,255,${a})`;
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.restore();
  }

  function render(now) {
    const w = canvas.width / state.dpr;
    const h = canvas.height / state.dpr;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    drawBackdrop(now);

    edges.forEach((e, i) => drawEdge(e, now, i));
    nodes.forEach(n => drawNode(n, now));
    drawMicroNodes(now);
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
    const color = modeMeta[state.mode][1];
    const points = 44;
    const vals = [];
    for (let i = 0; i < points; i++) {
      const v = .50 + .13 * Math.sin(i * .38 + now * .0007) + .07 * Math.sin(i * 1.15 + 1.7) + .03 * Math.sin(i * .14);
      vals.push(v);
    }
    const grad = spark.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, hexAlpha(color, .23));
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
    spark.strokeStyle = hexAlpha(color, .72); spark.lineWidth = 1.2; spark.stroke();
  }

  function tick(now) {
    const dt = Math.min(.05, (now - state.last) / 1000);
    state.last = now;

    state.panX += (state.targetPanX - state.panX) * Math.min(1, dt * 9);
    state.panY += (state.targetPanY - state.panY) * Math.min(1, dt * 9);

    if (state.running) {
      state.stepTime += dt * state.speed;
      state.simSeconds += dt * state.speed * 4;
      state.eventAccumulator += dt * state.speed;

      if (state.stepTime > 1.35) {
        state.stepTime = 0;
        state.step = (state.step + 1) % sequence.length;
        emitCurrentEvent();
        updateCausal();
      }

      if (state.eventAccumulator > .72) {
        state.eventAccumulator = 0;
        emitAmbientEvent();
      }
    }

    updateClock();
    render(now);
    requestAnimationFrame(tick);
  }

  function emitCurrentEvent() {
    const [, actor, event, result] = sequence[state.step];
    addEvent(actor, event, result, true);
  }

  const ambient = [
    ['Agent 8F21', 'memory.read', '4 chunks'],
    ['World / Tokyo', 'activity.delta', '+1.8%'],
    ['TOS / shard 02', 'block.finalized', '#8,491,220'],
    ['Scout 109', 'tool.result', 'confidence .82'],
    ['Shop cluster', 'payment.settled', '18.4 TOS'],
    ['GPU / shard 07', 'inference.done', '231 ms'],
    ['Agent 1203', 'social.follow', 'Agent 0991'],
    ['Exchange', 'liquidity.delta', '+0.004%']
  ];

  let ambientIndex = 0;
  function emitAmbientEvent() {
    const row = ambient[ambientIndex++ % ambient.length];
    addEvent(row[0], row[1], row[2], false);
  }

  function addEvent(actor, event, result, primary) {
    const d = new Date(Date.UTC(2030, 4, 20, 14, 35, 22) + state.simSeconds * 1000);
    const time = d.toISOString().slice(11, 19);
    const el = document.createElement('div');
    el.className = 'event-row';
    el.innerHTML = `<time>${time}</time><strong>${escapeHtml(actor)} · ${escapeHtml(event)}</strong><b>${escapeHtml(result)}</b>`;
    if (primary) el.style.background = `linear-gradient(90deg, ${hexAlpha(modeMeta[state.mode][1], .065)}, transparent)`;
    ui.stream.prepend(el);
    while (ui.stream.children.length > 13) ui.stream.lastElementChild.remove();
  }

  function updateCausal() {
    const progress = state.step / Math.max(1, sequence.length - 1);
    const phase = Math.min(4, Math.floor(progress * 5));
    ui.causal.forEach((li, i) => {
      li.classList.toggle('done', i < phase);
      li.classList.toggle('active', i === phase);
    });
    ui.chainStatus.textContent = state.running ? 'RUNNING' : 'PAUSED';
  }

  function updateClock() {
    const d = new Date(Date.UTC(2030, 4, 20, 14, 35, 22) + state.simSeconds * 1000);
    ui.clock.textContent = d.toISOString().replace('T', ' ').slice(0, 19);
    const pct = ((state.step + Math.min(1, state.stepTime / 1.35)) / sequence.length) * 100;
    ui.progress.style.width = `${pct}%`;
    const jitter = Math.sin(state.simSeconds * .14);
    ui.eventRate.textContent = `${(1.92 + jitter * .08).toFixed(2)}K/s`;
    ui.eventsPerSec.textContent = `${(1.9 + jitter * .1).toFixed(1)}K/s`;
    ui.tosRate.textContent = `${(48.2 + jitter * 3.8).toFixed(1)}K`;
    ui.agentCount.textContent = Math.round(12483 + Math.sin(state.simSeconds * .05) * 37).toLocaleString();
  }

  function selectNode(id) {
    const n = nodeMap[id];
    if (!n) return;
    state.selected = id;
    ui.selectedName.textContent = `${n.label} / ${n.sub}`;
    ui.selectedRole.textContent = n.role;
    ui.selectedWallet.textContent = n.wallet;
    ui.selectedLatency.textContent = n.latency;
    ui.selectedModel.textContent = n.model;
    ui.selectionCard.animate([
      { transform: 'translateY(4px)', opacity: .65 },
      { transform: 'translateY(0)', opacity: 1 }
    ], { duration: 190, easing: 'ease-out' });
  }

  function hitNode(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let best = null;
    let bestDist = Infinity;
    for (const n of nodes) {
      if (!nodeVisible(n)) continue;
      const p = worldToScreen(n.x, n.y);
      const dist = Math.hypot(x - p.x, y - p.y);
      const r = Math.max(12, n.r * Math.min(1.35, state.zoom)) + 7;
      if (dist < r && dist < bestDist) { best = n.id; bestDist = dist; }
    }
    return best;
  }

  function setMode(mode) {
    state.mode = mode;
    document.body.className = `mode-${mode}`;
    ui.tabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
    ui.modeTitle.textContent = modeMeta[mode][0];
    ui.zoomLabel.textContent = semanticLabel();
    addEvent('GOD MODE', 'vision.changed', mode, true);
  }

  function semanticLabel() {
    let layer = 'CITY';
    if (state.zoom < .78) layer = 'CIVILIZATION';
    else if (state.zoom < 1.15) layer = 'CITY';
    else if (state.zoom < 1.62) layer = 'AGENT';
    else layer = 'RUNTIME';
    return `${layer} / ${Math.round(state.zoom * 100)}%`;
  }

  function resetSimulation() {
    state.step = 0;
    state.stepTime = 0;
    state.simSeconds = 0;
    ui.stream.innerHTML = '';
    for (let i = 0; i < 7; i++) {
      const row = ambient[(ambient.length - 1 - i + ambient.length) % ambient.length];
      addEvent(row[0], row[1], row[2], false);
    }
    emitCurrentEvent();
    updateCausal();
  }

  function resetView() {
    state.zoom = 1;
    state.targetPanX = state.panX = 0;
    state.targetPanY = state.panY = 0;
    ui.zoomLabel.textContent = semanticLabel();
  }

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const before = screenToWorld(mx, my);
    const factor = Math.exp(-e.deltaY * .0011);
    state.zoom = clamp(state.zoom * factor, .58, 2.25);
    const after = worldToScreen(before.x, before.y);
    state.panX += mx - after.x;
    state.panY += my - after.y;
    state.targetPanX = state.panX;
    state.targetPanY = state.panY;
    ui.zoomLabel.textContent = semanticLabel();
  }, { passive: false });

  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId);
    state.dragging = true;
    state.moved = false;
    state.dragStart = { x: e.clientX, y: e.clientY, panX: state.panX, panY: state.panY };
  });

  canvas.addEventListener('pointermove', e => {
    const hit = hitNode(e.clientX, e.clientY);
    state.hovered = hit;
    canvas.style.cursor = hit ? 'pointer' : (state.dragging ? 'grabbing' : 'grab');
    if (!state.dragging) return;
    const dx = e.clientX - state.dragStart.x;
    const dy = e.clientY - state.dragStart.y;
    if (Math.hypot(dx, dy) > 3) state.moved = true;
    state.panX = state.targetPanX = state.dragStart.panX + dx;
    state.panY = state.targetPanY = state.dragStart.panY + dy;
  });

  canvas.addEventListener('pointerup', e => {
    if (!state.moved) {
      const hit = hitNode(e.clientX, e.clientY);
      if (hit) selectNode(hit);
    }
    state.dragging = false;
  });

  canvas.addEventListener('pointerleave', () => { state.hovered = null; state.dragging = false; });

  ui.tabs.forEach(tab => tab.addEventListener('click', () => setMode(tab.dataset.mode)));
  ui.playPause.addEventListener('click', () => {
    state.running = !state.running;
    ui.playPause.textContent = state.running ? 'Ⅱ' : '▶';
    ui.chainStatus.textContent = state.running ? 'RUNNING' : 'PAUSED';
    addEvent('Simulation', state.running ? 'runtime.resume' : 'runtime.pause', state.running ? 'LIVE' : 'FROZEN', true);
  });
  ui.replay.addEventListener('click', resetSimulation);
  ui.resetView.addEventListener('click', resetView);
  ui.speed.addEventListener('change', () => {
    state.speed = Number(ui.speed.value) || 1;
    addEvent('Simulation', 'time.scale', `${state.speed}×`, true);
  });

  window.addEventListener('resize', resize);

  function roundedRect(c, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function hexAlpha(hex, alpha) {
    if (!hex || hex[0] !== '#') return `rgba(101,231,255,${alpha})`;
    const h = hex.slice(1);
    const full = h.length === 3 ? h.split('').map(x => x + x).join('') : h;
    const num = parseInt(full, 16);
    return `rgba(${(num >> 16) & 255},${(num >> 8) & 255},${num & 255},${alpha})`;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
  }

  resize();
  resetSimulation();
  selectNode('alice');
  setMode('CITY');
  ui.renderStats.textContent = `NODES ${nodes.length} · EDGES ${edges.length} · PARTICLES 48`;
  requestAnimationFrame(tick);
})();
