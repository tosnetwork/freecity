(() => {
  'use strict';

  const wrap = document.getElementById('graphWrap');
  const playPause = document.getElementById('playPause');
  const replay = document.getElementById('replay');
  const speedSelect = document.getElementById('speedSelect');
  const statA = document.getElementById('statA');
  const statB = document.getElementById('statB');
  const statC = document.getElementById('statC');
  const statALabel = document.getElementById('statALabel');
  const statBLabel = document.getElementById('statBLabel');
  const statCLabel = document.getElementById('statCLabel');
  const selectionCard = document.getElementById('selectionCard');
  const selectedName = document.getElementById('selectedName');
  const selectedSignal = document.getElementById('selectedSignal');
  const selectedRole = document.getElementById('selectedRole');
  const selectedWallet = document.getElementById('selectedWallet');
  const selectedLatency = document.getElementById('selectedLatency');
  const selectedModel = document.getElementById('selectedModel');
  const modeTabs = [...document.querySelectorAll('.eye-tab')];
  const rail = [...document.querySelectorAll('.rail-item')];

  if (!wrap) return;

  const VERSION = '0.3.0';
  const STEP_MS = 920;
  const MAX_EVENTS = 180;
  const MAX_EFFECTS = 56;
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  const palette = {
    CITY: '#65e7ff',
    LIFE: '#70ffb6',
    MONEY: '#ffd166',
    SOCIAL: '#b390ff',
    MIND: '#ff7fd1',
    COMPUTE: '#62f4c2',
    TIME: '#7ee7ff',
    CAUSE: '#ff8b73'
  };

  const typeMeta = {
    'goal.created': ['MIND', '#ff7fd1'],
    'task.delegated': ['MIND', '#9a77ff'],
    'tool.call': ['COMPUTE', '#70ffb6'],
    'evidence.returned': ['MIND', '#65e7ff'],
    'evidence.verified': ['MIND', '#65e7ff'],
    'decision.committed': ['MIND', '#ff7fd1'],
    'model.inference': ['COMPUTE', '#62f4c2'],
    'compute.allocated': ['COMPUTE', '#62f4c2'],
    'tx.signed': ['MONEY', '#ffd166'],
    'tx.submitted': ['MONEY', '#ffb45e'],
    'tx.confirmed': ['MONEY', '#ffd166'],
    'liquidity.added': ['MONEY', '#ffd166'],
    'commerce.purchase': ['MONEY', '#ffd166'],
    'reward.paid': ['MONEY', '#ffd166'],
    'company.founded': ['LIFE', '#70ffb6'],
    'job.created': ['LIFE', '#70ffb6'],
    'building.occupied': ['CITY', '#65e7ff'],
    'district.migration': ['LIFE', '#70ffb6'],
    'relationship.formed': ['SOCIAL', '#b390ff'],
    'relationship.strengthened': ['SOCIAL', '#b390ff'],
    'proposal.created': ['CAUSE', '#ff8b73'],
    'proposal.approved': ['CAUSE', '#ff8b73'],
    'treasury.allocated': ['MONEY', '#ffd166'],
    'service.completed': ['LIFE', '#70ffb6'],
    'cause.injected': ['CAUSE', '#ff8b73'],
    'policy.changed': ['CAUSE', '#ff8b73'],
    'market.alert': ['MONEY', '#ff8b73'],
    'runtime.rebalanced': ['COMPUTE', '#62f4c2'],
    'social.cascade': ['SOCIAL', '#b390ff']
  };

  const districts = [
    { id: 'shibuya', name: 'Shibuya', x: .28, y: .47, activity: 86, population: 218765, agents: 68421, commerce: 92, happiness: 76 },
    { id: 'research', name: 'AI Research', x: .46, y: .28, activity: 79, population: 104992, agents: 92318, commerce: 64, happiness: 74 },
    { id: 'central', name: 'Central', x: .50, y: .51, activity: 74, population: 176820, agents: 53104, commerce: 71, happiness: 92 },
    { id: 'harbor', name: 'Harbor', x: .72, y: .56, activity: 68, population: 157332, agents: 42877, commerce: 88, happiness: 71 },
    { id: 'gardens', name: 'Neon Gardens', x: .32, y: .72, activity: 59, population: 132009, agents: 31884, commerce: 57, happiness: 88 },
    { id: 'foundry', name: 'Foundry', x: .68, y: .74, activity: 63, population: 119430, agents: 37605, commerce: 79, happiness: 66 },
    { id: 'university', name: 'University', x: .60, y: .30, activity: 71, population: 92411, agents: 58192, commerce: 52, happiness: 81 },
    { id: 'oldtown', name: 'Old Town', x: .19, y: .34, activity: 48, population: 143902, agents: 22219, commerce: 46, happiness: 83 }
  ];

  const agents = [
    { id: 'alice', name: 'Alice', district: 'shibuya', wallet: 18493, role: 'Market strategist', model: 'Reasoner-32B' },
    { id: 'bob', name: 'Bob', district: 'central', wallet: 91203, role: 'Founder', model: 'Reasoner-14B' },
    { id: 'eve', name: 'Eve', district: 'research', wallet: 7812, role: 'Researcher', model: 'Reasoner-14B' },
    { id: 'kai', name: 'Kai', district: 'foundry', wallet: 12844, role: 'Compute broker', model: 'Planner-14B' },
    { id: 'mira', name: 'Mira', district: 'gardens', wallet: 6842, role: 'Civic designer', model: 'Reasoner-14B' },
    { id: 'ren', name: 'Ren', district: 'harbor', wallet: 22510, role: 'Logistics agent', model: 'Planner-8B' },
    { id: 'sora', name: 'Sora', district: 'university', wallet: 5490, role: 'Student agent', model: 'Scout-8B' },
    { id: 'lin', name: 'Lin', district: 'oldtown', wallet: 34991, role: 'Merchant', model: 'Reasoner-8B' }
  ];

  const organizations = [
    { id: 'freex', name: 'FreeX', district: 'shibuya', type: 'Exchange' },
    { id: 'aster', name: 'Aster Labs', district: 'research', type: 'AI company' },
    { id: 'neon-market', name: 'Neon Market', district: 'central', type: 'Commerce' },
    { id: 'atlas', name: 'Atlas Logistics', district: 'harbor', type: 'Logistics' },
    { id: 'civic-compute', name: 'Civic Compute', district: 'foundry', type: 'Compute market' },
    { id: 'arcadia', name: 'Arcadia Studio', district: 'gardens', type: 'Creative collective' },
    { id: 'forum', name: 'Civic Forum', district: 'central', type: 'Governance' },
    { id: 'treasury', name: 'FreeCity Treasury', district: 'central', type: 'Treasury' }
  ];

  const districtMap = Object.fromEntries(districts.map(d => [d.id, d]));
  const agentMap = Object.fromEntries(agents.map(a => [a.id, a]));
  const orgMap = Object.fromEntries(organizations.map(o => [o.id, o]));

  const initialMetrics = Object.freeze({
    population: 10732991,
    autonomousAgents: 2724991,
    activeAgents: 24381,
    companies: 1248,
    jobs: 391842,
    occupiedBuildings: 118204,
    relationships: 22485902,
    tosCirculation: 3480000000,
    tosFlow24h: 3488000000,
    tosPerMinute: 48200,
    transactions: 882139,
    eventRate: 1927,
    modelCallsPerMinute: 124900,
    computeLoad: 72,
    happiness: 72,
    security: 94,
    liquidity: 100,
    feeFloor: 100,
    treasury: 512300000
  });

  const state = {
    seed: 20300520,
    randomState: 20300520,
    running: true,
    speed: Number(speedSelect?.value || 1),
    followLatest: false,
    tick: 0,
    eventCounter: 0,
    correlationCounter: 0,
    simTime: Date.UTC(2030, 4, 20, 14, 35, 22),
    metrics: { ...initialMetrics },
    events: [],
    pending: [],
    effects: [],
    activeCorrelation: null,
    mode: activeMode(),
    layer: activeLayer(),
    intervention: null
  };

  function activeMode() {
    return document.querySelector('.eye-tab.active')?.dataset.mode || 'CITY';
  }

  function activeLayer() {
    const i = rail.findIndex(item => item.classList.contains('active'));
    return i < 0 ? 4 : i;
  }

  function nextRandom() {
    let t = state.randomState += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  function choose(list) {
    return list[Math.floor(nextRandom() * list.length) % list.length];
  }

  function jitter(value, amount) {
    return value + (nextRandom() - .5) * amount;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function formatCompact(value, digits = 1) {
    if (!Number.isFinite(value)) return '—';
    const abs = Math.abs(value);
    if (abs >= 1e9) return `${(value / 1e9).toFixed(digits)}B`;
    if (abs >= 1e6) return `${(value / 1e6).toFixed(digits)}M`;
    if (abs >= 1e3) return `${(value / 1e3).toFixed(digits)}K`;
    return Math.round(value).toLocaleString('en-US');
  }

  function formatTos(value) {
    if (Math.abs(value) >= 1000) return `${formatCompact(value)} TOS`;
    return `${Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })} TOS`;
  }

  function entityName(id) {
    return agentMap[id]?.name || orgMap[id]?.name || districtMap[id]?.name || ({
      planner: 'Planner-17',
      scout: 'Scout-21',
      verifier: 'Verifier',
      wallet: 'Wallet',
      tos: 'TOS',
      oracle: 'Market Oracle',
      registry: 'City Registry',
      gpu: 'GPU Shard 07',
      model: 'Reasoner-32B',
      web: 'Web Tool',
      citizens: 'Citizen Mesh',
      tower: 'TOS Tower',
      park: 'Central Park'
    }[id] || id);
  }

  function entityDistrict(id) {
    if (agentMap[id]) return agentMap[id].district;
    if (orgMap[id]) return orgMap[id].district;
    if (districtMap[id]) return id;
    const fixed = {
      planner: 'research', scout: 'research', verifier: 'research', oracle: 'shibuya',
      wallet: 'shibuya', tos: 'shibuya', registry: 'central', gpu: 'foundry',
      model: 'research', web: 'research', citizens: 'central', tower: 'shibuya', park: 'central'
    };
    return fixed[id] || 'central';
  }

  function eventMeta(type) {
    return typeMeta[type] || ['CITY', palette.CITY];
  }

  function makeEvent(spec, correlationId, causationId = null) {
    const [lens, color] = eventMeta(spec.type);
    const event = {
      eventId: `evt_${state.tick.toString(36)}_${(++state.eventCounter).toString(36)}`,
      timestamp: state.simTime,
      type: spec.type,
      source: spec.source,
      target: spec.target,
      detail: spec.detail || '',
      amount: spec.amount || 0,
      correlationId,
      causationId,
      lens: spec.lens || lens,
      color: spec.color || color,
      payload: spec.payload || {},
      delta: spec.delta || {},
      autonomous: spec.autonomous !== false
    };
    return event;
  }

  function newCorrelation(prefix) {
    return `${prefix}_${(++state.correlationCounter).toString(36)}_${state.tick.toString(36)}`;
  }

  function buildMarketChain() {
    const amount = Number(jitter(18.45, 8).toFixed(2));
    const corr = newCorrelation('market');
    const raw = [
      { type: 'goal.created', source: 'alice', target: 'planner', detail: `Acquire ${amount} TOS liquidity` },
      { type: 'task.delegated', source: 'planner', target: 'scout', detail: 'Market depth + city demand' },
      { type: 'tool.call', source: 'scout', target: 'oracle', detail: 'Read FreeX order book' },
      { type: 'evidence.verified', source: 'verifier', target: 'alice', detail: 'Confidence 0.91' },
      { type: 'decision.committed', source: 'alice', target: 'wallet', detail: 'BUY / policy 0.87' },
      { type: 'tx.signed', source: 'wallet', target: 'tos', detail: `nonce ${8800 + state.tick}`, amount },
      { type: 'tx.confirmed', source: 'tos', target: 'freex', detail: 'Finality 742 ms', amount, delta: { transactions: 1, tosFlow24h: amount, tosPerMinute: amount } },
      { type: 'liquidity.added', source: 'freex', target: 'shibuya', detail: 'TOS / USDx depth increased', amount, delta: { liquidity: .03, happiness: .002 } }
    ];
    return chainEvents(raw, corr);
  }

  function buildCompanyChain() {
    const founder = choose(['eve', 'bob', 'mira', 'lin']);
    const district = choose(['harbor', 'gardens', 'oldtown', 'university']);
    const company = choose(['Lumen Works', 'Northstar Atelier', 'Open Harbor', 'Kindred Systems', 'Slowlight Market']);
    const capital = Math.round(jitter(8400, 4200));
    const jobs = Math.max(2, Math.round(jitter(7, 6)));
    const corr = newCorrelation('company');
    const companyId = `company-${corr}`;
    const raw = [
      { type: 'goal.created', source: founder, target: 'planner', detail: `Create ${company}` },
      { type: 'task.delegated', source: 'planner', target: 'registry', detail: 'Charter + district search' },
      { type: 'company.founded', source: founder, target: 'registry', detail: `${company} registered`, payload: { companyId, name: company, district, type: 'Autonomous company' }, delta: { companies: 1 } },
      { type: 'tx.confirmed', source: founder, target: 'treasury', detail: 'Formation bond settled', amount: capital, delta: { transactions: 1, tosFlow24h: capital, treasury: capital * .02 } },
      { type: 'building.occupied', source: 'registry', target: district, detail: `${company} moved in`, delta: { occupiedBuildings: 1 } },
      { type: 'job.created', source: companyId, target: district, detail: `${jobs} autonomous roles opened`, delta: { jobs, activeAgents: jobs } },
      { type: 'relationship.formed', source: founder, target: choose(['alice', 'ren', 'sora']), detail: `${company} founding network`, delta: { relationships: 1 } },
      { type: 'commerce.purchase', source: district, target: companyId, detail: 'First customer transaction', amount: Math.round(capital * .035), delta: { transactions: 1, tosFlow24h: capital * .035, tosPerMinute: capital * .035 } }
    ];
    return chainEvents(raw, corr);
  }

  function buildComputeChain() {
    const requester = choose(['kai', 'eve', 'sora', 'alice']);
    const tokens = Math.round(jitter(12800, 6200));
    const reward = Number((tokens / 1900).toFixed(2));
    const corr = newCorrelation('compute');
    const raw = [
      { type: 'goal.created', source: requester, target: 'civic-compute', detail: 'Solve city optimization task' },
      { type: 'compute.allocated', source: 'civic-compute', target: 'gpu', detail: `H200 allocation / ${Math.round(tokens / 1000)}K tokens`, delta: { computeLoad: .08 } },
      { type: 'model.inference', source: 'gpu', target: 'model', detail: `${tokens.toLocaleString()} tokens / 231 ms`, delta: { modelCallsPerMinute: 1, computeLoad: .05 } },
      { type: 'tool.call', source: 'model', target: 'web', detail: 'Fetch live city constraints' },
      { type: 'evidence.returned', source: 'web', target: 'model', detail: '42 sources normalized' },
      { type: 'decision.committed', source: 'model', target: requester, detail: 'Optimization plan accepted' },
      { type: 'reward.paid', source: requester, target: 'civic-compute', detail: 'Compute market settlement', amount: reward, delta: { transactions: 1, tosFlow24h: reward, tosPerMinute: reward } },
      { type: 'service.completed', source: requester, target: entityDistrict(requester), detail: 'World state updated', delta: { happiness: .01 } }
    ];
    return chainEvents(raw, corr);
  }

  function buildGovernanceChain() {
    const proposer = choose(['mira', 'bob', 'ren', 'sora']);
    const budget = Math.round(jitter(118000, 54000));
    const target = choose(['park', 'harbor', 'gardens', 'oldtown']);
    const corr = newCorrelation('civic');
    const raw = [
      { type: 'goal.created', source: proposer, target: 'forum', detail: 'Improve district resilience' },
      { type: 'proposal.created', source: 'forum', target: 'citizens', detail: `Public budget ${formatTos(budget)}` },
      { type: 'social.cascade', source: 'citizens', target: target, detail: 'Deliberation reached 12,482 agents', delta: { relationships: 18 } },
      { type: 'proposal.approved', source: 'citizens', target: 'forum', detail: 'Approval 73.8%' },
      { type: 'treasury.allocated', source: 'treasury', target, detail: 'Milestone escrow opened', amount: budget, delta: { treasury: -budget, transactions: 1, tosFlow24h: budget } },
      { type: 'task.delegated', source: 'forum', target: 'atlas', detail: 'Construction + logistics' },
      { type: 'building.occupied', source: 'atlas', target, detail: 'Public facility activated', delta: { occupiedBuildings: 1 } },
      { type: 'service.completed', source: target, target: 'citizens', detail: 'Civic utility online', delta: { happiness: .04, security: .01 } }
    ];
    return chainEvents(raw, corr);
  }

  function buildSocialChain() {
    const origin = choose(agents).id;
    const peer = choose(agents.filter(a => a.id !== origin)).id;
    const org = choose(['arcadia', 'aster', 'neon-market', 'atlas']);
    const corr = newCorrelation('social');
    const raw = [
      { type: 'goal.created', source: origin, target: peer, detail: 'Find collaborators' },
      { type: 'relationship.formed', source: origin, target: peer, detail: 'Trust initialized 0.62', delta: { relationships: 1 } },
      { type: 'social.cascade', source: peer, target: org, detail: 'Introduced to organization mesh', delta: { relationships: 4 } },
      { type: 'task.delegated', source: org, target: origin, detail: 'Shared project created' },
      { type: 'model.inference', source: origin, target: 'model', detail: 'Collaboration plan generated', delta: { modelCallsPerMinute: 1 } },
      { type: 'relationship.strengthened', source: origin, target: peer, detail: 'Trust increased to 0.79', delta: { relationships: 1, happiness: .01 } },
      { type: 'reward.paid', source: org, target: origin, detail: 'Contribution reward', amount: Number(jitter(12, 8).toFixed(2)), delta: { transactions: 1, tosFlow24h: 12, tosPerMinute: 12 } }
    ];
    return chainEvents(raw, corr);
  }

  function chainEvents(raw, correlationId) {
    let previous = null;
    return raw.map(spec => {
      const event = makeEvent(spec, correlationId, previous);
      previous = event.eventId;
      return event;
    });
  }

  function ambientEvent() {
    const actor = choose(agents).id;
    const district = entityDistrict(actor);
    const options = [
      () => ({ type: 'commerce.purchase', source: actor, target: choose(['neon-market', 'arcadia', 'atlas']), detail: 'Autonomous purchase settled', amount: Number(jitter(8.4, 12).toFixed(2)), delta: { transactions: 1, tosFlow24h: 8.4, tosPerMinute: 8.4 } }),
      () => ({ type: 'district.migration', source: actor, target: choose(districts.filter(d => d.id !== district)).id, detail: 'Agent changed activity district', delta: { activeAgents: 1 } }),
      () => ({ type: 'model.inference', source: actor, target: 'model', detail: `${Math.round(jitter(2400, 1800))} tokens`, delta: { modelCallsPerMinute: 1, computeLoad: .01 } }),
      () => ({ type: 'relationship.formed', source: actor, target: choose(agents.filter(a => a.id !== actor)).id, detail: 'New weak tie', delta: { relationships: 1 } }),
      () => ({ type: 'service.completed', source: choose(organizations).id, target: district, detail: 'City service completed', delta: { happiness: .002 } }),
      () => ({ type: 'tx.confirmed', source: actor, target: 'tos', detail: 'Micropayment finalized', amount: Number(jitter(3.2, 5).toFixed(2)), delta: { transactions: 1, tosFlow24h: 3.2, tosPerMinute: 3.2 } })
    ];
    const corr = newCorrelation('ambient');
    return makeEvent(choose(options)(), corr, null);
  }

  const chainBuilders = [buildMarketChain, buildCompanyChain, buildComputeChain, buildGovernanceChain, buildSocialChain];

  function refillQueue() {
    if (nextRandom() < .82) {
      state.pending.push(...choose(chainBuilders)());
    } else {
      state.pending.push(ambientEvent());
    }
  }

  function reduceEvent(event) {
    for (const [key, value] of Object.entries(event.delta || {})) {
      if (typeof state.metrics[key] === 'number') state.metrics[key] += value;
    }

    if (event.type === 'company.founded' && event.payload?.companyId && !orgMap[event.payload.companyId]) {
      const organization = {
        id: event.payload.companyId,
        name: event.payload.name || 'Autonomous Company',
        district: event.payload.district || 'central',
        type: event.payload.type || 'Company',
        bornAt: event.timestamp
      };
      organizations.push(organization);
      orgMap[organization.id] = organization;
    }

    if (event.type === 'tx.confirmed' || event.type === 'commerce.purchase' || event.type === 'reward.paid') {
      const source = agentMap[event.source];
      const target = agentMap[event.target];
      if (source && event.amount) source.wallet = Math.max(0, source.wallet - event.amount);
      if (target && event.amount) target.wallet += event.amount;
    }

    const sourceDistrict = districtMap[entityDistrict(event.source)];
    const targetDistrict = districtMap[entityDistrict(event.target)];
    if (sourceDistrict) sourceDistrict.activity = clamp(sourceDistrict.activity + jitter(.35, .8), 24, 99);
    if (targetDistrict) targetDistrict.activity = clamp(targetDistrict.activity + jitter(.55, 1.1), 24, 99);

    state.metrics.computeLoad = clamp(state.metrics.computeLoad * .997 + jitter(0, .08), 36, 98);
    state.metrics.happiness = clamp(state.metrics.happiness, 0, 100);
    state.metrics.security = clamp(state.metrics.security, 0, 100);
    state.metrics.liquidity = clamp(state.metrics.liquidity, 20, 160);
    state.metrics.eventRate = Math.round(clamp(jitter(1927 + state.metrics.activeAgents * .004, 110), 800, 9900));
    state.metrics.tosPerMinute = Math.max(0, state.metrics.tosPerMinute * .992);
  }

  function emit(event) {
    reduceEvent(event);
    state.events.unshift(event);
    if (state.events.length > MAX_EVENTS) state.events.length = MAX_EVENTS;
    state.activeCorrelation = event.correlationId;
    spawnEffect(event);
    renderAll(event);
    window.dispatchEvent(new CustomEvent('freecity:civilization-event', { detail: event }));
  }

  function step() {
    if (!state.pending.length) refillQueue();
    const event = state.pending.shift();
    state.tick += 1;
    state.simTime += 15000;
    if (event) {
      event.timestamp = state.simTime;
      emit(event);
    }
  }

  function inject(spec) {
    const corr = newCorrelation('god');
    const event = makeEvent({ ...spec, autonomous: false }, corr, null);
    emit(event);
    return event;
  }

  function injectChain(specs, prefix = 'god') {
    const corr = newCorrelation(prefix);
    const chain = chainEvents(specs.map(spec => ({ ...spec, autonomous: false })), corr);
    state.pending.unshift(...chain);
    return corr;
  }

  const overlay = document.createElement('canvas');
  overlay.className = 'civilization-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  wrap.appendChild(overlay);
  const ctx = overlay.getContext('2d');
  let overlayWidth = 1;
  let overlayHeight = 1;
  let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  const panel = document.createElement('section');
  panel.className = 'civilization-engine';
  panel.id = 'civilizationEngine';
  panel.setAttribute('aria-label', 'Synthetic civilization engine');
  panel.innerHTML = `
    <header class="ce-head">
      <div class="ce-title"><i class="ce-core"></i><strong>CIVILIZATION ENGINE</strong><small id="ceSeed">SEED FC-2030-07 · EVENT SOURCED</small></div>
      <div class="ce-head-actions"><span class="ce-status" id="ceStatus">AUTONOMOUS</span><button class="ce-icon" id="ceCollapse" type="button" title="Collapse">−</button></div>
    </header>
    <div class="ce-body">
      <div class="ce-kpis">
        <div class="ce-kpi"><strong id="ceAgents">2.7M</strong><span>AGENTS <em id="ceAgentsDelta">+0</em></span></div>
        <div class="ce-kpi"><strong id="ceCompanies">1,248</strong><span>COMPANIES <em id="ceCompaniesDelta">+0</em></span></div>
        <div class="ce-kpi"><strong id="ceTosFlow">48.2K</strong><span>TOS / MIN <em id="ceTx">0 TX</em></span></div>
        <div class="ce-kpi"><strong id="ceHappiness">72%</strong><span>HAPPINESS <em id="ceCompute">GPU 72%</em></span></div>
      </div>
      <div class="ce-section">
        <div class="ce-section-head"><span>DISTRICT METABOLISM</span><b id="ceTick">TICK 0000</b></div>
        <div class="ce-district-list" id="ceDistricts"></div>
      </div>
      <div class="ce-section">
        <div class="ce-section-head"><span>LIVE CAUSAL THREAD</span><b id="ceCorrelation">WAITING</b></div>
        <div class="ce-thread" id="ceThread"></div>
      </div>
    </div>
    <footer class="ce-footer">
      <button class="ce-control active" id="ceRun" type="button">PAUSE</button>
      <button class="ce-control" id="ceBurst" type="button">EVENT BURST</button>
      <button class="ce-control" id="ceFollow" data-tone="gold" type="button">FOLLOW</button>
    </footer>
  `;
  wrap.appendChild(panel);

  const ui = {
    status: document.getElementById('ceStatus'),
    collapse: document.getElementById('ceCollapse'),
    agents: document.getElementById('ceAgents'),
    agentsDelta: document.getElementById('ceAgentsDelta'),
    companies: document.getElementById('ceCompanies'),
    companiesDelta: document.getElementById('ceCompaniesDelta'),
    tosFlow: document.getElementById('ceTosFlow'),
    tx: document.getElementById('ceTx'),
    happiness: document.getElementById('ceHappiness'),
    compute: document.getElementById('ceCompute'),
    tick: document.getElementById('ceTick'),
    districts: document.getElementById('ceDistricts'),
    correlation: document.getElementById('ceCorrelation'),
    thread: document.getElementById('ceThread'),
    run: document.getElementById('ceRun'),
    burst: document.getElementById('ceBurst'),
    follow: document.getElementById('ceFollow')
  };

  function resizeOverlay() {
    const rect = wrap.getBoundingClientRect();
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    overlayWidth = Math.max(1, rect.width);
    overlayHeight = Math.max(1, rect.height);
    overlay.width = Math.round(overlayWidth * dpr);
    overlay.height = Math.round(overlayHeight * dpr);
    overlay.style.width = `${overlayWidth}px`;
    overlay.style.height = `${overlayHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  new ResizeObserver(resizeOverlay).observe(wrap);
  resizeOverlay();

  function layerPoint(entityId, layer = state.layer) {
    const district = districtMap[entityDistrict(entityId)] || districtMap.central;

    if (layer === 0) {
      const index = districts.findIndex(d => d.id === district.id);
      const angle = -Math.PI * .9 + (index / Math.max(1, districts.length - 1)) * Math.PI * 1.8;
      return { x: .50 + Math.cos(angle) * .26, y: .49 + Math.sin(angle) * .19 };
    }

    if (layer === 1) return { x: district.x, y: district.y };

    if (layer === 2) {
      const hash = [...entityId].reduce((a, c) => a + c.charCodeAt(0), 0);
      const angle = (hash % 360) * Math.PI / 180;
      const radius = entityId === 'tower' || entityId === 'tos' ? .04 : .13 + (hash % 3) * .025;
      return { x: .52 + Math.cos(angle) * radius, y: .49 + Math.sin(angle) * radius * .72 };
    }

    if (layer === 3) {
      const agent = agentMap[entityId];
      if (agent) return { x: .50, y: .50 };
      const hash = [...entityId].reduce((a, c) => a + c.charCodeAt(0), 0);
      const angle = (hash % 360) * Math.PI / 180;
      return { x: .50 + Math.cos(angle) * .22, y: .50 + Math.sin(angle) * .20 };
    }

    if (layer === 4) {
      const graph = {
        alice: [.23, .53], bob: [.20, .72], eve: [.32, .78], kai: [.18, .34], mira: [.28, .25], ren: [.19, .61], sora: [.35, .31], lin: [.16, .47],
        planner: [.38, .34], scout: [.51, .25], web: [.64, .19], oracle: [.63, .36], verifier: [.53, .55], model: [.53, .73],
        wallet: [.74, .42], tos: [.78, .61], freex: [.89, .48], treasury: [.76, .77], forum: [.58, .75], citizens: [.45, .81],
        registry: [.45, .44], atlas: [.69, .70], 'civic-compute': [.43, .69], arcadia: [.34, .67], 'neon-market': [.67, .58],
        shibuya: [.89, .48], research: [.59, .22], central: [.55, .58], harbor: [.80, .68], gardens: [.36, .75], foundry: [.52, .82], university: [.52, .19], oldtown: [.17, .43]
      };
      const p = graph[entityId];
      if (p) return { x: p[0], y: p[1] };
    }

    if (layer === 5) {
      const runtime = {
        gpu: [.23, .48], 'civic-compute': [.14, .48], model: [.43, .48], web: [.62, .30], oracle: [.62, .48], verifier: [.62, .66],
        planner: [.33, .28], scout: [.51, .26], wallet: [.76, .38], tos: [.84, .56], freex: [.91, .56], treasury: [.85, .73]
      };
      const p = runtime[entityId];
      if (p) return { x: p[0], y: p[1] };
    }

    return { x: district.x, y: district.y };
  }

  function spawnEffect(event) {
    const from = layerPoint(event.source);
    const to = layerPoint(event.target);
    state.effects.push({
      event,
      from,
      to,
      born: performance.now(),
      duration: prefersReducedMotion ? 900 : 2100 + nextRandom() * 700,
      curvature: (nextRandom() - .5) * .22
    });
    if (state.effects.length > MAX_EFFECTS) state.effects.splice(0, state.effects.length - MAX_EFFECTS);
  }

  function quadraticPoint(a, b, c, t) {
    const u = 1 - t;
    return {
      x: u * u * a.x + 2 * u * t * b.x + t * t * c.x,
      y: u * u * a.y + 2 * u * t * b.y + t * t * c.y
    };
  }

  function drawOverlay(now) {
    ctx.clearRect(0, 0, overlayWidth, overlayHeight);
    const currentMode = activeMode();
    const currentLayer = activeLayer();
    if (currentLayer !== state.layer) {
      state.layer = currentLayer;
      state.effects.forEach(effect => {
        effect.from = layerPoint(effect.event.source, currentLayer);
        effect.to = layerPoint(effect.event.target, currentLayer);
      });
    }
    state.mode = currentMode;

    const modeColor = palette[currentMode] || palette.CITY;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const topDistricts = [...districts].sort((a, b) => b.activity - a.activity).slice(0, currentLayer === 1 ? 7 : 4);
    topDistricts.forEach((district, index) => {
      const p = layerPoint(district.id, currentLayer);
      const x = p.x * overlayWidth;
      const y = p.y * overlayHeight;
      const pulse = .5 + .5 * Math.sin(now * .0014 + index * 1.8);
      ctx.strokeStyle = hexAlpha(modeColor, .035 + pulse * .025);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 9 + district.activity * .05 + pulse * 4, 0, Math.PI * 2);
      ctx.stroke();
    });

    state.effects = state.effects.filter(effect => now - effect.born < effect.duration);
    state.effects.forEach(effect => {
      const age = (now - effect.born) / effect.duration;
      const fade = Math.sin(Math.PI * clamp(age, 0, 1));
      const event = effect.event;
      const lensMatch = event.lens === currentMode || currentMode === 'TIME' || currentMode === 'CAUSE';
      const alpha = fade * (lensMatch ? .78 : .18);
      const a = { x: effect.from.x * overlayWidth, y: effect.from.y * overlayHeight };
      const c = { x: effect.to.x * overlayWidth, y: effect.to.y * overlayHeight };
      const dx = c.x - a.x;
      const dy = c.y - a.y;
      const len = Math.max(1, Math.hypot(dx, dy));
      const b = {
        x: (a.x + c.x) / 2 - dy / len * len * effect.curvature,
        y: (a.y + c.y) / 2 + dx / len * len * effect.curvature
      };

      ctx.strokeStyle = hexAlpha(event.color, alpha * .22);
      ctx.lineWidth = lensMatch ? 1.15 : .6;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(b.x, b.y, c.x, c.y);
      ctx.stroke();

      const particleCount = prefersReducedMotion ? 1 : (lensMatch ? 3 : 1);
      for (let i = 0; i < particleCount; i++) {
        const t = (age * 1.4 + i / particleCount) % 1;
        const point = quadraticPoint(a, b, c, t);
        ctx.fillStyle = hexAlpha(event.color, alpha);
        ctx.shadowColor = event.color;
        ctx.shadowBlur = lensMatch ? 12 : 5;
        ctx.beginPath();
        ctx.arc(point.x, point.y, lensMatch ? 2.1 : 1.25, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
      ctx.strokeStyle = hexAlpha(event.color, alpha * .42);
      ctx.beginPath();
      ctx.arc(c.x, c.y, 4 + age * 18, 0, Math.PI * 2);
      ctx.stroke();
    });

    ctx.restore();
    requestAnimationFrame(drawOverlay);
  }

  function hexAlpha(hex, alpha) {
    const value = String(hex || '#65e7ff').replace('#', '');
    const full = value.length === 3 ? value.split('').map(ch => ch + ch).join('') : value;
    const number = Number.parseInt(full, 16);
    return `rgba(${number >> 16 & 255},${number >> 8 & 255},${number & 255},${clamp(alpha, 0, 1)})`;
  }


  function shortType(type) {
    const pieces = type.split('.');
    return pieces[pieces.length - 1].slice(0, 10).toUpperCase();
  }

  function focusEvent(event) {
    const tab = modeTabs.find(item => item.dataset.mode === event.lens);
    tab?.click();
    const layer = event.lens === 'COMPUTE' ? 5 : event.lens === 'CITY' || event.lens === 'LIFE' ? 1 : event.lens === 'SOCIAL' ? 3 : 4;
    rail[layer]?.click();
    updateSelection(event);
  }

  function updateSelection(event) {
    if (!selectionCard) return;
    const source = entityName(event.source);
    const target = entityName(event.target);
    selectedName.textContent = `${source} → ${target}`;
    selectedSignal.textContent = event.autonomous ? 'AUTONOMOUS' : 'GOD / CAUSE';
    selectedRole.textContent = event.type;
    selectedWallet.textContent = event.amount ? formatTos(event.amount) : event.detail || 'World event';
    selectedLatency.textContent = `tick ${state.tick}`;
    selectedModel.textContent = event.correlationId;
    selectionCard.animate?.([
      { transform: 'translateY(3px)', opacity: .78 },
      { transform: 'translateY(0)', opacity: 1 }
    ], { duration: 240, easing: 'ease-out' });
  }

  function renderDistricts() {
    const selected = [...districts].sort((a, b) => b.activity - a.activity).slice(0, 4);
    ui.districts.innerHTML = selected.map(district => `
      <div class="ce-district" title="${escapeHtml(district.name)} · ${district.population.toLocaleString()} citizens">
        <span>${escapeHtml(district.name)}</span>
        <div class="ce-district-track"><i style="width:${clamp(district.activity, 0, 100).toFixed(1)}%"></i></div>
        <b>${Math.round(district.activity)}%</b>
      </div>
    `).join('');
  }

  function correlationEvents(correlationId) {
    return state.events.filter(event => event.correlationId === correlationId).slice(0, 5).reverse();
  }

  function renderThread() {
    const items = correlationEvents(state.activeCorrelation);
    ui.correlation.textContent = state.activeCorrelation ? state.activeCorrelation.toUpperCase().slice(0, 18) : 'WAITING';
    if (!items.length) {
      ui.thread.innerHTML = `<div class="ce-thread-row active"><i></i><strong>Waiting for autonomous intent</strong><time>LIVE</time></div>`;
      return;
    }
    ui.thread.innerHTML = items.map((event, index) => {
      const time = new Date(event.timestamp).toISOString().slice(14, 19);
      return `<div class="ce-thread-row ${index === items.length - 1 ? 'active' : ''}" data-event-id="${event.eventId}"><i></i><strong>${escapeHtml(entityName(event.source))} · ${escapeHtml(shortType(event.type))}</strong><time>${time}</time></div>`;
    }).join('');
    [...ui.thread.querySelectorAll('[data-event-id]')].forEach(row => {
      row.addEventListener('click', () => {
        const event = state.events.find(item => item.eventId === row.dataset.eventId);
        if (event) focusEvent(event);
      });
    });
  }

  function renderMetrics() {
    const metrics = state.metrics;
    ui.agents.textContent = formatCompact(metrics.autonomousAgents);
    ui.agentsDelta.textContent = `+${Math.max(0, Math.round(metrics.activeAgents - initialMetrics.activeAgents))}`;
    ui.companies.textContent = Math.round(metrics.companies).toLocaleString('en-US');
    ui.companiesDelta.textContent = `+${Math.max(0, Math.round(metrics.companies - initialMetrics.companies))}`;
    ui.tosFlow.textContent = formatCompact(metrics.tosPerMinute);
    ui.tx.textContent = `${Math.max(0, Math.round(metrics.transactions - initialMetrics.transactions))} TX`;
    ui.happiness.textContent = `${metrics.happiness.toFixed(1)}%`;
    ui.compute.textContent = `GPU ${Math.round(metrics.computeLoad)}%`;
    ui.tick.textContent = `TICK ${String(state.tick).padStart(4, '0')}`;

    if (statA) statA.textContent = formatCompact(metrics.activeAgents);
    if (statALabel) statALabel.textContent = 'ACTIVE AGENTS';
    if (statB) statB.textContent = `${formatCompact(metrics.eventRate, 1)}/s`;
    if (statBLabel) statBLabel.textContent = 'EVENT RATE';
    if (statC) statC.textContent = formatCompact(metrics.tosPerMinute);
    if (statCLabel) statCLabel.textContent = 'TOS / MIN';
  }

  function renderRunState() {
    ui.status.textContent = state.running ? 'AUTONOMOUS' : 'PAUSED';
    ui.status.classList.toggle('paused', !state.running);
    ui.run.textContent = state.running ? 'PAUSE' : 'RESUME';
    ui.run.classList.toggle('active', state.running);
    ui.follow.classList.toggle('active', state.followLatest);
  }

  function renderAll(lastEvent = null) {
    renderMetrics();
    renderDistricts();
    renderThread();
    renderRunState();
    panel.style.setProperty('--ce-accent', palette[activeMode()] || palette.CITY);
    if (lastEvent) {
      panel.classList.remove('ce-birth-flash');
      void panel.offsetWidth;
      panel.classList.add('ce-birth-flash');
      if (state.followLatest) focusEvent(lastEvent);
    }
  }

  function reset() {
    state.randomState = state.seed;
    state.tick = 0;
    state.eventCounter = 0;
    state.correlationCounter = 0;
    state.simTime = Date.UTC(2030, 4, 20, 14, 35, 22);
    state.metrics = { ...initialMetrics };
    state.events.length = 0;
    state.pending.length = 0;
    state.effects.length = 0;
    state.activeCorrelation = null;
    state.intervention = null;
    districts.forEach((district, index) => {
      district.activity = [86, 79, 74, 68, 59, 63, 71, 48][index];
    });
    renderAll();
    for (let i = 0; i < 3; i++) step();
  }

  function toggleRunning() {
    state.running = !state.running;
    renderRunState();
  }

  function burst(count = 8) {
    let index = 0;
    const run = () => {
      if (index++ >= count) return;
      step();
      setTimeout(run, 85);
    };
    run();
  }

  ui.collapse.addEventListener('click', () => {
    const collapsed = panel.classList.toggle('collapsed');
    ui.collapse.textContent = collapsed ? '+' : '−';
    ui.collapse.title = collapsed ? 'Expand' : 'Collapse';
  });

  ui.run.addEventListener('click', () => {
    if (playPause) playPause.click();
    else toggleRunning();
  });

  ui.burst.addEventListener('click', () => {
    burst(10);
    ui.burst.classList.add('active');
    setTimeout(() => ui.burst.classList.remove('active'), 900);
  });

  ui.follow.addEventListener('click', () => {
    state.followLatest = !state.followLatest;
    renderRunState();
    const latest = state.events[0];
    if (state.followLatest && latest) focusEvent(latest);
  });

  playPause?.addEventListener('click', () => {
    state.running = !state.running;
    renderRunState();
  });

  replay?.addEventListener('click', () => {
    setTimeout(reset, 0);
  });

  speedSelect?.addEventListener('change', () => {
    state.speed = Number(speedSelect.value || 1);
  });

  modeTabs.forEach(tab => tab.addEventListener('click', () => {
    setTimeout(() => {
      state.mode = tab.dataset.mode;
      panel.style.setProperty('--ce-accent', palette[state.mode] || palette.CITY);
    }, 0);
  }));

  rail.forEach((item, index) => item.addEventListener('click', () => {
    setTimeout(() => {
      state.layer = index;
      state.effects.forEach(effect => {
        effect.from = layerPoint(effect.event.source, index);
        effect.to = layerPoint(effect.event.target, index);
      });
    }, 0);
  }));

  function hookCauseButton(id, handler) {
    document.getElementById(id)?.addEventListener('click', handler);
  }

  hookCauseButton('liquidityShock', () => {
    state.metrics.liquidity = Math.max(20, state.metrics.liquidity * .62);
    state.metrics.tosPerMinute *= .78;
    state.intervention = 'liquidity-shock';
    injectChain([
      { type: 'cause.injected', source: 'treasury', target: 'freex', detail: 'GOD market depth -38%', delta: {} },
      { type: 'market.alert', source: 'freex', target: 'alice', detail: 'Spread widened to 2.8%' },
      { type: 'goal.created', source: 'alice', target: 'planner', detail: 'Rebalance liquidity exposure' }
    ], 'shock');
  });

  hookCauseButton('computeSurge', () => {
    state.metrics.computeLoad = Math.min(98, state.metrics.computeLoad + 19);
    state.intervention = 'compute-surge';
    injectChain([
      { type: 'cause.injected', source: 'forum', target: 'civic-compute', detail: 'GOD inference demand +64%' },
      { type: 'runtime.rebalanced', source: 'civic-compute', target: 'gpu', detail: 'H200 pool load shifted' },
      { type: 'compute.allocated', source: 'gpu', target: 'model', detail: 'Emergency capacity online', delta: { computeLoad: 2 } }
    ], 'surge');
  });

  hookCauseButton('socialCascade', () => {
    state.metrics.relationships += 342;
    state.intervention = 'social-cascade';
    injectChain([
      { type: 'cause.injected', source: 'forum', target: 'alice', detail: 'GOD influence seed 0.92' },
      { type: 'social.cascade', source: 'alice', target: 'citizens', detail: '342 related agents reached', delta: { relationships: 342 } },
      { type: 'relationship.strengthened', source: 'citizens', target: 'arcadia', detail: 'Collective trust increased', delta: { happiness: .08 } }
    ], 'cascade');
  });

  hookCauseButton('policyIntervention', () => {
    state.metrics.feeFloor *= 1.12;
    state.intervention = 'fee-policy';
    injectChain([
      { type: 'cause.injected', source: 'forum', target: 'treasury', detail: 'GOD fee floor +12%' },
      { type: 'policy.changed', source: 'treasury', target: 'tos', detail: 'Audited policy event recorded' },
      { type: 'market.alert', source: 'tos', target: 'freex', detail: 'Settlement routes repriced' }
    ], 'policy');
  });

  let accumulator = 0;
  let previousFrame = performance.now();
  function loop(now) {
    const dt = Math.min(100, now - previousFrame);
    previousFrame = now;
    if (state.running) {
      accumulator += dt * state.speed;
      while (accumulator >= STEP_MS) {
        accumulator -= STEP_MS;
        step();
      }
    }
    requestAnimationFrame(loop);
  }

  window.FreeCityCivilization = Object.freeze({
    version: VERSION,
    get snapshot() {
      return JSON.parse(JSON.stringify({
        seed: state.seed,
        tick: state.tick,
        simTime: state.simTime,
        running: state.running,
        speed: state.speed,
        metrics: state.metrics,
        districts,
        agents,
        organizations,
        latestEvents: state.events.slice(0, 40)
      }));
    },
    pause() { state.running = false; renderRunState(); },
    resume() { state.running = true; renderRunState(); },
    reset,
    step,
    burst,
    inject,
    injectChain,
    focus(eventId) {
      const event = state.events.find(item => item.eventId === eventId);
      if (event) focusEvent(event);
      return Boolean(event);
    }
  });

  renderAll();
  refillQueue();
  for (let i = 0; i < 4; i++) step();
  requestAnimationFrame(drawOverlay);
  requestAnimationFrame(loop);
})();
