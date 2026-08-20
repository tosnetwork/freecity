(() => {
  'use strict';

  const wrap = document.getElementById('graphWrap');
  const stream = document.getElementById('eventStream');
  const modeTabs = [...document.querySelectorAll('.eye-tab')];
  const rail = [...document.querySelectorAll('.rail-item')];
  const selectionCard = document.getElementById('selectionCard');
  const selectedName = document.getElementById('selectedName');
  const selectedSignal = document.getElementById('selectedSignal');
  const selectedRole = document.getElementById('selectedRole');
  const selectedWallet = document.getElementById('selectedWallet');
  const selectedLatency = document.getElementById('selectedLatency');
  const selectedModel = document.getElementById('selectedModel');
  const causalItems = [...document.querySelectorAll('#causalList li')];
  if (!wrap || !stream || !modeTabs.length || !rail.length) return;

  const modeButton = mode => modeTabs.find(b => b.dataset.mode === mode);
  const jump = index => rail[index]?.click();
  const eye = mode => modeButton(mode)?.click();

  const ui = document.createElement('div');
  ui.innerHTML = `
    <button class="god-console-launcher" id="godConsoleLauncher" type="button" aria-expanded="false">
      <span class="pulse-orb"></span><span>GOD CONSOLE</span><span style="opacity:.45">⌘K</span>
    </button>
    <section class="god-console" id="godConsole" aria-label="GOD console">
      <div class="god-console-head">
        <div><strong>FREECITY / GOD CONSOLE</strong><span> · intervention shell</span></div>
        <button class="god-console-close" id="godConsoleClose" type="button" aria-label="Close">×</button>
      </div>
      <div class="god-console-body">
        <div class="god-console-search">
          <input id="godSearch" type="text" spellcheck="false" autocomplete="off" placeholder="alice / tos / tower / planner / exchange" aria-label="Find entity" />
          <button id="godSearchGo" type="button">GO</button>
        </div>
        <div class="god-console-section">
          <div class="god-console-label"><span>NAVIGATION</span><b>SEMANTIC ZOOM</b></div>
          <div class="god-action-grid">
            <button class="god-action" id="autoTour" type="button"><strong>Autonomous tour</strong><small>planet → city → agent → runtime</small></button>
            <button class="god-action" id="traceSettlement" data-accent="gold" type="button"><strong>Trace settlement</strong><small>Alice → wallet → TOS → liquidity</small></button>
            <button class="god-action" id="followAlice" data-accent="violet" type="button"><strong>Follow Alice</strong><small>preserve focus across GOD Eyes</small></button>
            <button class="god-action" id="computeTrace" data-accent="green" type="button"><strong>Compute trace</strong><small>model / tool / token metabolism</small></button>
          </div>
        </div>
        <div class="god-console-section">
          <div class="god-console-label"><span>CAUSE LAB</span><b>SIMULATED</b></div>
          <div class="god-action-grid">
            <button class="god-action" id="liquidityShock" data-accent="gold" type="button"><strong>Liquidity shock</strong><small>inject market-depth event</small></button>
            <button class="god-action" id="computeSurge" data-accent="green" type="button"><strong>Compute surge</strong><small>raise inference load on shard 07</small></button>
            <button class="god-action" id="socialCascade" data-accent="violet" type="button"><strong>Social cascade</strong><small>propagate influence from Alice</small></button>
            <button class="god-action" id="policyIntervention" data-accent="red" type="button"><strong>Policy intervention</strong><small>audited GOD action / replayable</small></button>
          </div>
        </div>
      </div>
    </section>
    <div class="mission-strip" id="missionStrip" aria-live="polite">
      <div class="mission-strip-top"><strong id="missionTitle">MISSION</strong><span id="missionStep">00 / 00</span></div>
      <div class="mission-track"><div class="mission-progress" id="missionProgress"></div></div>
    </div>
    <div class="god-toast-stack" id="godToasts" aria-live="polite"></div>
  `;
  wrap.appendChild(ui);

  const consoleEl = document.getElementById('godConsole');
  const launcher = document.getElementById('godConsoleLauncher');
  const closeBtn = document.getElementById('godConsoleClose');
  const search = document.getElementById('godSearch');
  const mission = document.getElementById('missionStrip');
  const missionTitle = document.getElementById('missionTitle');
  const missionStep = document.getElementById('missionStep');
  const missionProgress = document.getElementById('missionProgress');
  const toasts = document.getElementById('godToasts');

  let tourTimer = null;
  let tourEpoch = 0;

  function toggleConsole(force) {
    const open = typeof force === 'boolean' ? force : !consoleEl.classList.contains('open');
    consoleEl.classList.toggle('open', open);
    launcher.setAttribute('aria-expanded', String(open));
    if (open) setTimeout(() => search.focus(), 60);
  }

  launcher.addEventListener('click', () => toggleConsole());
  closeBtn.addEventListener('click', () => toggleConsole(false));
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      toggleConsole();
    }
  });

  function toast(title, detail, tone = '') {
    const el = document.createElement('div');
    el.className = `god-toast ${tone}`.trim();
    el.innerHTML = `<strong>${escapeHtml(title)}</strong><small>${escapeHtml(detail)}</small>`;
    toasts.prepend(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(-8px)';
      el.style.transition = '.25s ease';
      setTimeout(() => el.remove(), 260);
    }, 3500);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function injectEvent(actor, action, detail, tone = '') {
    const row = document.createElement('div');
    row.className = 'event-row injected';
    const time = new Date().toLocaleTimeString([], {hour12:false});
    row.innerHTML = `<span>${escapeHtml(time)}</span><strong>${escapeHtml(actor)}</strong><em>${escapeHtml(action)}</em><small>${escapeHtml(detail)}</small>`;
    stream.prepend(row);
    while (stream.children.length > 14) stream.lastElementChild?.remove();
    if (tone) row.style.borderLeftColor = tone;
  }

  function flash(cls) {
    wrap.classList.remove('fc-surge', 'fc-economic', 'fc-social');
    void wrap.offsetWidth;
    wrap.classList.add(cls);
    setTimeout(() => wrap.classList.remove(cls), 1600);
  }

  function showMission(title, step, total) {
    missionTitle.textContent = title;
    missionStep.textContent = `${String(step).padStart(2,'0')} / ${String(total).padStart(2,'0')}`;
    missionProgress.style.width = `${Math.round(step / total * 100)}%`;
    mission.classList.add('show');
  }

  function hideMission() {
    setTimeout(() => mission.classList.remove('show'), 900);
  }

  function setSelection(name, signal, role, wallet, latency, model) {
    if (!selectionCard) return;
    selectedName.textContent = name;
    selectedSignal.textContent = signal;
    selectedRole.textContent = role;
    selectedWallet.textContent = wallet;
    selectedLatency.textContent = latency;
    selectedModel.textContent = model;
    selectionCard.animate([{transform:'translateY(2px)',opacity:.82},{transform:'translateY(0)',opacity:1}],{duration:240,easing:'ease-out'});
  }

  function chain(index) {
    causalItems.forEach((li, i) => {
      li.classList.toggle('done', i < index);
      li.classList.toggle('active', i === index);
    });
  }

  const entityTargets = {
    alice: () => {
      jump(3); eye('MIND');
      setSelection('Alice / Agent A-055721','THINKING','Market strategist','18,493 TOS','482 ms','Reasoner-32B');
      toast('Entity locked', 'Alice · focus preserved across GOD Eyes', 'violet');
    },
    tos: () => {
      jump(4); eye('MONEY');
      setSelection('TOS / Settlement','CHAIN','Settlement network','Block 8,491,220','742 ms','TOS Network');
      toast('Settlement layer', 'TOS network selected · finality path visible', 'gold');
    },
    tower: () => {
      jump(2); eye('CITY');
      setSelection('TOS Tower / Shibuya','LANDMARK','Settlement & market hub','2.4B TOS','19 ms','FreeCity runtime');
      toast('Landmark locked', 'TOS Tower · Shibuya district', 'gold');
    },
    planner: () => {
      jump(4); eye('MIND');
      setSelection('Planner / Plan-17','SYSTEM','Task decomposition','3.2 TOS','188 ms','Planner-14B');
      toast('Runtime entity', 'Planner-17 · causal neighborhood exposed', 'violet');
    },
    exchange: () => {
      jump(4); eye('MONEY');
      setSelection('Exchange / FreeX','MARKET','Liquidity venue','1.2B TOS','55 ms','Contract');
      toast('Market entity', 'FreeX · liquidity routes visible', 'gold');
    },
    city: () => {
      jump(1); eye('CITY');
      toast('FreeCity Tokyo', 'City shard 07 · 2.72M autonomous agents');
    },
    freecity: () => entityTargets.city(),
    runtime: () => { jump(5); eye('COMPUTE'); toast('Runtime microscope', 'Model calls, tokens and tool activity exposed', 'green'); }
  };

  function runSearch() {
    const q = search.value.trim().toLowerCase();
    if (!q) return;
    const key = Object.keys(entityTargets).find(k => q.includes(k));
    if (key) {
      entityTargets[key]();
      toggleConsole(false);
    } else {
      toast('No direct entity match', `Try: alice, tos, tower, planner, exchange, city, runtime`, 'red');
    }
  }
  document.getElementById('godSearchGo').addEventListener('click', runSearch);
  search.addEventListener('keydown', e => { if (e.key === 'Enter') runSearch(); });

  function runTour() {
    if (tourTimer) clearTimeout(tourTimer);
    const epoch = ++tourEpoch;
    const steps = [
      {label:'Observe civilization', layer:0, mode:'CITY', event:['WORLD','shard.observe','FreeCity Tokyo / shard 07']},
      {label:'Descend into FreeCity', layer:1, mode:'LIFE', event:['CITY','population.focus','2.72M autonomous agents']},
      {label:'Enter TOS Tower', layer:2, mode:'MONEY', event:['TOWER','economic.focus','342M TOS / 24h volume']},
      {label:'Lock Alice', layer:3, mode:'SOCIAL', event:['ALICE','entity.follow','relationships preserved']},
      {label:'Open causal graph', layer:4, mode:'MIND', event:['PLANNER','task.delegate','Scout-21 + Scout-34']},
      {label:'Inspect compute runtime', layer:5, mode:'COMPUTE', event:['MODEL','inference.trace','12.8K tokens · 231ms']},
      {label:'Settle action', layer:4, mode:'MONEY', event:['TOS','tx.confirmed','18.45 TOS → FreeX']}
    ];
    toggleConsole(false);
    toast('Autonomous tour started', 'Planet → city → agent → runtime → settlement');
    const next = i => {
      if (epoch !== tourEpoch) return;
      if (i >= steps.length) {
        hideMission();
        toast('Tour complete', 'One continuous system · geography to causality', 'green');
        return;
      }
      const s = steps[i];
      showMission(s.label, i + 1, steps.length);
      jump(s.layer); eye(s.mode);
      injectEvent(...s.event);
      if (s.layer === 3) setSelection('Alice / Agent A-055721','FOLLOWING','Market strategist','18,493 TOS','482 ms','Reasoner-32B');
      tourTimer = setTimeout(() => next(i + 1), 2200);
    };
    next(0);
  }

  document.getElementById('autoTour').addEventListener('click', runTour);

  document.getElementById('traceSettlement').addEventListener('click', () => {
    ++tourEpoch;
    toggleConsole(false);
    jump(4); eye('MONEY');
    setSelection('Alice / Settlement trace','TRACE','Action → settlement','18.45 TOS','742 ms','TOS Network');
    const seq = [
      ['ALICE','decision.committed','BUY / confidence 0.87'],
      ['WALLET','tx.signed','nonce 8842 · 18.45 TOS'],
      ['TOS','tx.submitted','mempool → block 8,491,220'],
      ['TOS','tx.confirmed','finality 742 ms'],
      ['FREEX','liquidity.added','TOS / USDx pool']
    ];
    seq.forEach((e, i) => setTimeout(() => { injectEvent(...e); chain(Math.min(i,4)); showMission('TRACE SETTLEMENT', i+1, seq.length); }, i * 650));
    setTimeout(() => { hideMission(); toast('Settlement confirmed','Alice → TOS → FreeX · causal chain complete','gold'); }, seq.length * 650 + 300);
    flash('fc-economic');
  });

  document.getElementById('followAlice').addEventListener('click', () => {
    ++tourEpoch; toggleConsole(false); jump(3); eye('MIND');
    setSelection('Alice / Agent A-055721','FOLLOWING','Market strategist','18,493 TOS','482 ms','Reasoner-32B');
    injectEvent('GOD','entity.follow','Alice / persistent focus');
    toast('Follow mode', 'Alice remains the semantic anchor', 'violet');
  });

  document.getElementById('computeTrace').addEventListener('click', () => {
    ++tourEpoch; toggleConsole(false); jump(5); eye('COMPUTE');
    setSelection('Reasoner-32B / Run-8841','EXECUTING','Inference model','12.8K tokens','231 ms','Reasoner-32B');
    injectEvent('GPU-07','inference.started','Reasoner-32B / run-8841');
    setTimeout(() => injectEvent('MODEL','tool.call','web.search / Scout-21'), 500);
    setTimeout(() => injectEvent('MODEL','completion','8,176 output tokens'), 1000);
    flash('fc-surge');
    toast('Compute microscope', 'GPU → model → tool → completion', 'green');
  });

  document.getElementById('liquidityShock').addEventListener('click', () => {
    toggleConsole(false); jump(4); eye('CAUSE'); flash('fc-economic');
    injectEvent('GOD','cause.injected','market.depth -38% / FreeX');
    injectEvent('FREEX','liquidity.alert','spread widened to 2.8%');
    setSelection('CAUSE / Liquidity shock','INTERVENTION','Audited simulation event','-38% depth','T+0','Replayable');
    toast('CAUSE injected', 'Market depth -38% · autonomous response begins', 'gold');
  });

  document.getElementById('computeSurge').addEventListener('click', () => {
    toggleConsole(false); jump(5); eye('COMPUTE'); flash('fc-surge');
    injectEvent('GOD','cause.injected','GPU demand +64% / shard 07');
    injectEvent('RUNTIME','load.rebalance','H200 pool → 91%');
    setSelection('Compute / Shard 07','SURGE','Inference fabric','91% load','p95 884 ms','H200 pool');
    toast('Compute surge', 'Shard 07 rebalancing inference load', 'green');
  });

  document.getElementById('socialCascade').addEventListener('click', () => {
    toggleConsole(false); jump(3); eye('SOCIAL'); flash('fc-social');
    injectEvent('GOD','cause.injected','Alice influence seed / 0.92');
    injectEvent('SOCIAL','cascade.propagating','342 related agents');
    setSelection('Alice / Influence cascade','PROPAGATING','Social origin','342 agents','T+1.2 s','Relationship graph');
    toast('Social cascade', 'Influence propagating across 342 agents', 'violet');
  });

  document.getElementById('policyIntervention').addEventListener('click', () => {
    toggleConsole(false); jump(1); eye('CAUSE'); flash('fc-economic');
    injectEvent('GOD','policy.proposed','transaction fee floor +12%');
    injectEvent('AUDIT','intervention.recorded','cause-id god-2030-051');
    setSelection('GOD / Policy intervention','AUDITED','Simulation policy','+12% fee floor','T+0','cause-id god-2030-051');
    toast('Intervention recorded', 'Policy event is visually distinct and replayable', 'red');
  });
})();
