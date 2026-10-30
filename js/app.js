/* 발명 특허 탐정단 — 교육용 모의출원 웹앱 (실제 특허출원 기능 없음, 모든 데이터는 이 기기에만 저장) */
(function () {
  'use strict';

  const D = window.IPDATA;
  const KEY = 'ipdetective.record.v1';
  const PREF_KEY = 'ipdetective.prefs.v1';
  const MAX_STR = 6000;

  /* ───────── 유틸 ───────── */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nl = (s) => esc(s).replace(/\n/g, '<br>');
  const uid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const circled = (i) => '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'[i] || '(' + (i + 1) + ')';
  const fid = (path) => 'f-' + path.replace(/\./g, '-');
  const trim = (s) => String(s || '').trim();
  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* ───────── 데이터 모델 ───────── */
  function blankComponent() { return { id: uid(), name: '', role: '', drawingNumber: '' }; }
  function blankApp() {
    return {
      displayName: '', inventionTitle: '', category: '', originalityNote: '', collaborators: '',
      problemSituation: '', existingSolution: '', goal: '', technicalField: '',
      components: [blankComponent()], howItWorks: '', materials: [],
      uniqueFeatures: '', sourceLink: '', improvementReason: '', uncertainty: '',
      useCase: '', expectedEffect: '', limits: '', implementation: '',
      drawing: { hasImage: false, caption: '', parts: [], alternativeDescription: '' },
      practiceClaim: '', abstract: '', keywords: []
    };
  }
  function newRecord() {
    const now = new Date().toISOString();
    return {
      schemaVersion: 1, recordId: uid(), level: 'grade4', isDemo: false,
      idea: { mode: '', exampleId: '', title: '', purpose: '', features: '', kwTarget: '', kwProblem: '', kwStructure: '' },
      quiz: {}, caseAnswers: [], reflect: {},
      priorSearch: { queries: [], status: '', items: [], note: '' },
      application: blankApp(),
      mockSubmission: { status: 'draft' },
      settings: { skipChecks: false, drawingOptional: false },
      ui: { tab: 'home', step: 0 },
      createdAt: now, updatedAt: now
    };
  }

  /* 스키마 기반 정리: 기본값을 기준으로 타입이 맞는 값만 받아들인다 (JSON 가져오기 보호) */
  function sanitize(def, src) {
    if (Array.isArray(def)) return Array.isArray(src) ? src : def;
    if (def && typeof def === 'object') {
      const out = {};
      const s = src && typeof src === 'object' && !Array.isArray(src) ? src : {};
      for (const k of Object.keys(def)) out[k] = sanitize(def[k], s[k]);
      return out;
    }
    if (typeof def === 'string') return typeof src === 'string' ? src.slice(0, MAX_STR) : def;
    if (typeof def === 'boolean') return typeof src === 'boolean' ? src : def;
    if (typeof def === 'number') return typeof src === 'number' && isFinite(src) ? src : def;
    return def;
  }
  const strList = (a, max = 20) => (Array.isArray(a) ? a.filter((x) => typeof x === 'string').map((x) => x.slice(0, 80)).slice(0, max) : []);
  const oneOf = (v, list, d) => (list.includes(v) ? v : d);
  function normalize(src) {
    const base = newRecord();
    const r = sanitize(base, src);
    if (typeof src.recordId === 'string') r.recordId = src.recordId.slice(0, 64);
    r.level = oneOf(r.level, D.levels.map((l) => l.id), 'grade4');
    r.application.originalityNote = oneOf(r.application.originalityNote, ['', 'myPreviousIdea', 'teacherExample', 'groupIdea'], '');
    r.priorSearch.status = oneOf(r.priorSearch.status, ['', 'done', 'inProgress', 'notFound'], '');
    r.mockSubmission.status = oneOf(r.mockSubmission.status, ['draft', 'mockSubmitted', 'editedAfterSubmit'], 'draft');
    r.mockSubmission.mockId = typeof (src.mockSubmission || {}).mockId === 'string' && /^MOCK-[0-9A-Z-]{4,20}$/.test(src.mockSubmission.mockId) ? src.mockSubmission.mockId : undefined;
    r.mockSubmission.localSubmittedAt = typeof (src.mockSubmission || {}).localSubmittedAt === 'string' ? src.mockSubmission.localSubmittedAt.slice(0, 40) : undefined;
    const a = r.application;
    a.components = (Array.isArray(a.components) ? a.components : []).slice(0, 30).map((c) => sanitize(blankComponent(), c)).map((c) => (c.id ? c : Object.assign(c, { id: uid() })));
    if (!a.components.length) a.components = [blankComponent()];
    a.materials = strList(a.materials);
    a.keywords = strList(a.keywords, 8);
    a.drawing.parts = (Array.isArray(a.drawing.parts) ? a.drawing.parts : []).slice(0, 20).map((p) => sanitize({ number: '', label: '' }, p));
    r.priorSearch.queries = strList(r.priorSearch.queries);
    r.priorSearch.items = (Array.isArray(r.priorSearch.items) ? r.priorSearch.items : []).slice(0, 10).map((it) => {
      const x = sanitize({ id: '', title: '', source: '', documentId: '', url: '', features: '', similarities: '', differences: '', isFictional: false }, it);
      x.id = x.id || uid();
      x.source = oneOf(x.source, ['', 'KIPRIS', 'teacherMaterial', 'other'], '');
      return x;
    });
    r.caseAnswers = (Array.isArray(r.caseAnswers) ? r.caseAnswers : []).filter((c) => c && typeof c.questionId === 'string').map((c) => ({ questionId: c.questionId.slice(0, 20), selected: strList(c.selected, 6), checked: !!c.checked }));
    const q = {}; Object.keys(r.quiz || {}).forEach((k) => { if (typeof src.quiz[k] === 'boolean') q[k] = src.quiz[k]; }); r.quiz = q;
    const rf = {}; Object.keys((src && src.reflect) || {}).forEach((k) => { if (typeof src.reflect[k] === 'string') rf[k.slice(0, 20)] = src.reflect[k].slice(0, MAX_STR); }); r.reflect = rf;
    r.ui.tab = oneOf(r.ui.tab, ['home'].concat(D.tabs.map((t) => t.id)), 'home');
    r.ui.step = Math.min(7, Math.max(0, r.ui.step | 0));
    return r;
  }

  function getPath(path) { return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), R); }
  function setPath(path, val) {
    const ks = path.split('.'); let o = R;
    for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null) o[ks[i]] = {}; o = o[ks[i]]; }
    o[ks[ks.length - 1]] = val;
  }

  /* ───────── 저장 (localStorage: 텍스트 / IndexedDB: 그림) ───────── */
  let R;
  let drawingURL = null;
  let saveTimer = null;
  let prefs = { large: false, contrast: false };

  function loadRecord() {
    try { const raw = localStorage.getItem(KEY); if (raw) return normalize(JSON.parse(raw)); } catch (e) { /* 손상된 기록은 새로 시작 */ }
    return null;
  }
  function setStatus(kind) {
    const el = $('#save-status'); if (!el) return;
    const map = { saved: ['● 임시저장됨', 'ok'], saving: ['○ 변경사항 저장 중…', 'busy'], fail: ['⚠ 저장 실패 — 기록 파일(JSON)로 내려받아 주세요', 'fail'] };
    el.textContent = map[kind][0]; el.dataset.state = map[kind][1];
  }
  function touch() {
    R.updatedAt = new Date().toISOString();
    setStatus('saving');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 500);
  }
  function saveNow() {
    clearTimeout(saveTimer);
    try { localStorage.setItem(KEY, JSON.stringify(R)); setStatus('saved'); }
    catch (e) { setStatus('fail'); }
  }

  const IDB = (function () {
    let dbp = null;
    function db() {
      if (!dbp) dbp = new Promise((res, rej) => {
        try {
          const req = indexedDB.open('ipdetective', 1);
          req.onupgradeneeded = () => req.result.createObjectStore('blobs');
          req.onsuccess = () => res(req.result);
          req.onerror = () => rej(req.error);
        } catch (e) { rej(e); }
      });
      return dbp;
    }
    function tx(mode, fn) {
      return db().then((d) => new Promise((res, rej) => {
        const t = d.transaction('blobs', mode); const st = t.objectStore('blobs');
        const req = fn(st); t.oncomplete = () => res(req && req.result); t.onerror = () => rej(t.error);
      }));
    }
    return {
      get: (k) => tx('readonly', (s) => s.get(k)),
      set: (k, v) => tx('readwrite', (s) => s.put(v, k)),
      del: (k) => tx('readwrite', (s) => s.delete(k))
    };
  })();
  const drawKey = () => 'drawing:' + R.recordId;
  function storeDrawing(url) {
    drawingURL = url;
    R.application.drawing.hasImage = !!url;
    markEdited('application');
    touch();
    const p = url ? IDB.set(drawKey(), url) : IDB.del(drawKey());
    p.catch(() => setStatus('fail'));
    schedulePreview();
  }
  function loadDrawing() {
    return IDB.get(drawKey()).then((v) => { drawingURL = typeof v === 'string' ? v : null; }).catch(() => { drawingURL = null; });
  }

  function loadPrefs() { try { prefs = Object.assign(prefs, JSON.parse(localStorage.getItem(PREF_KEY) || '{}')); } catch (e) { /* 기본값 */ } applyPrefs(); }
  function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) { /* 무시 */ } applyPrefs(); }
  function applyPrefs() {
    document.documentElement.classList.toggle('large', !!prefs.large);
    document.documentElement.classList.toggle('contrast', !!prefs.contrast);
    const bl = $('#btn-large'), bc = $('#btn-contrast');
    if (bl) bl.setAttribute('aria-pressed', String(!!prefs.large));
    if (bc) bc.setAttribute('aria-pressed', String(!!prefs.contrast));
  }

  function markEdited(path) {
    if (R.mockSubmission.status === 'mockSubmitted' && /^(application|priorSearch)/.test(path)) {
      R.mockSubmission.status = 'editedAfterSubmit';
      renderHeaderState();
    }
  }

  /* ───────── 수준(학년) ───────── */
  const lv = () => (R.level === 'teacher' ? 'middle' : R.level);
  const isAdvOpen = () => R.level === 'middle' || R.level === 'teacher';
  const pick = (o) => (typeof o === 'string' ? o : o[lv()] || o.grade5to6 || '');
  const levelName = () => (D.levels.find((l) => l.id === R.level) || D.levels[0]).name;

  /* ───────── 공통 폼 빌더 (웹 입력 서식 테이블) ───────── */
  function fieldRow(o) {
    const id = o.id || fid(o.path);
    const v = o.value !== undefined ? o.value : getPath(o.path);
    const ex = o.example !== undefined ? o.example : D.fieldExamples[o.path];
    const hintId = id + '-hint', exId = id + '-ex';
    let input;
    const ph = o.placeholder ? ` placeholder="${esc(o.placeholder)}"` : '';
    const describe = ` aria-describedby="${hintId}"`;
    if (o.type === 'textarea') {
      input = `<textarea id="${id}" data-bind="${o.path}" rows="${o.rows || 4}"${ph}${describe}${o.req ? ' aria-required="true"' : ''}>${esc(v)}</textarea>`;
    } else if (o.type === 'select') {
      input = `<select id="${id}" data-bind="${o.path}"${describe}><option value="">— 선택하세요 —</option>${o.options.map((op) => `<option value="${esc(op.v)}"${op.v === v ? ' selected' : ''}>${esc(op.t)}</option>`).join('')}</select>`;
    } else if (o.type === 'radio') {
      input = `<div class="radio-row" role="radiogroup" aria-labelledby="${id}-lb">${o.options.map((op, i) => `<label class="radio-chip"><input type="radio" name="${id}" ${i === 0 ? `id="${id}"` : ''} data-bind="${o.path}" value="${esc(op.v)}"${op.v === v ? ' checked' : ''}><span>${esc(op.t)}</span></label>`).join('')}</div>`;
    } else if (o.type === 'tags') {
      input = tagInput(o.path, id, o.placeholder);
    } else {
      input = `<input type="${o.type || 'text'}" id="${id}" data-bind="${o.path}" value="${esc(v)}"${ph}${describe}${o.list ? ` list="${o.list}"` : ''} autocomplete="off"${o.req ? ' aria-required="true"' : ''}>`;
    }
    const labelTag = o.type === 'radio' ? `<span id="${id}-lb" class="lb">` : `<label for="${id}" class="lb">`;
    const labelEnd = o.type === 'radio' ? '</span>' : '</label>';
    return `<tr class="${o.adv ? 'adv-row' : ''}">
      <th scope="row">${labelTag}${esc(o.label)}${labelEnd}
        ${o.req ? '<span class="req" aria-label="필수">필수</span>' : o.adv ? '<span class="opt">심화</span>' : '<span class="opt">선택</span>'}</th>
      <td>
        ${input}
        <div class="field-tools">
          ${o.hint ? `<button type="button" class="mini" data-act="toggle" data-target="${hintId}" aria-expanded="false">💡 도움말</button>` : ''}
          ${ex ? `<button type="button" class="mini" data-act="toggle" data-target="${exId}" aria-expanded="false">📄 예시 보기</button>` : ''}
          ${o.tools || ''}
        </div>
        <p class="hint" id="${hintId}" hidden>${o.hint ? esc(pick(o.hint)) : ''}</p>
        ${ex ? `<div class="example" id="${exId}" hidden><span class="tag-ex">예시</span> ${nl(ex)}
          ${o.type === 'tags' || o.type === 'radio' ? '' : `<button type="button" class="mini" data-act="fill-example" data-path="${o.path}">이 예시를 칸에 입력</button>`}</div>` : ''}
        ${o.after || ''}
      </td></tr>`;
  }
  function tagInput(path, id, placeholder) {
    const list = getPath(path) || [];
    return `<div class="tags" data-tags="${path}">
      <ul class="chips" aria-label="입력한 낱말">${list.map((t, i) => `<li class="chip">${esc(t)}<button type="button" data-act="tag-del" data-path="${path}" data-i="${i}" aria-label="${esc(t)} 지우기">×</button></li>`).join('')}</ul>
      <div class="tag-add"><input type="text" id="${id}" data-tag-input="${path}" placeholder="${esc(placeholder || '낱말 입력 후 Enter')}" autocomplete="off">
      <button type="button" class="btn sm" data-act="tag-add" data-path="${path}">추가</button></div></div>`;
  }
  const formTable = (rows, caption) => `<table class="form-table">${caption ? `<caption class="sr">${esc(caption)}</caption>` : ''}<tbody>${rows.join('')}</tbody></table>`;
  const ext = (url, name) => `<a class="ext" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(name)}<span aria-hidden="true"> ↗</span><span class="sr">(새 창, 외부 사이트)</span></a>
    <button type="button" class="mini" data-act="copy" data-text="${esc(url)}" aria-label="${esc(name)} 주소 복사">주소 복사</button>`;

  /* ───────── 상단·탭 ───────── */
  function renderTabs() {
    const cur = R.ui.tab;
    $('#tabs').innerHTML = `<ul>
      <li><button type="button" class="tab ${cur === 'home' ? 'on' : ''}" data-act="go" data-tab="home" ${cur === 'home' ? 'aria-current="page"' : ''}><span class="no">00</span><span class="nm">시작</span></button></li>
      ${D.tabs.map((t) => `<li><button type="button" class="tab ${cur === t.id ? 'on' : ''}" data-act="go" data-tab="${t.id}" ${cur === t.id ? 'aria-current="page"' : ''}>
        <span class="no">${t.no}</span><span class="nm">${t.name}</span><span class="ls">${t.lesson}</span></button></li>`).join('')}
    </ul>`;
  }
  function renderHeaderState() {
    const sel = $('#level-select'); if (sel) sel.value = R.level;
    const st = $('#submit-state');
    if (st) {
      const m = { draft: '작성 중', mockSubmitted: '모의접수 완료(교육용)', editedAfterSubmit: '모의접수 뒤 수정됨' };
      st.textContent = m[R.mockSubmission.status];
      st.dataset.state = R.mockSubmission.status;
    }
  }

  function go(tab, opts) {
    R.ui.tab = tab;
    if (opts && typeof opts.step === 'number') R.ui.step = opts.step;
    saveNow();
    render();
    const main = $('#main');
    if (opts && opts.focus) {
      setTimeout(() => { const el = document.getElementById(opts.focus); if (el) { el.scrollIntoView({ block: 'center' }); el.focus(); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1600); } }, 30);
    } else { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
  }

  function render() {
    renderTabs();
    renderHeaderState();
    const main = $('#main');
    const t = R.ui.tab;
    const views = { home: viewHome, learn: viewLearn, cases: viewCases, prior: viewPrior, apply: viewApply, submit: viewSubmit, archive: viewArchive };
    main.innerHTML = views[t]();
    if (t === 'apply') { mountApply(); }
  }

  const pageHead = (no, title, lead, extra) => `<header class="page-head">
      <div class="folder-tab">${esc(no)}</div>
      <div><h1>${esc(title)}</h1><p class="lead">${lead}</p></div>${extra || ''}</header>`;

  /* ───────── 홈 ───────── */
  function viewHome() {
    const hasData = trim(R.application.inventionTitle) || R.priorSearch.items.length || Object.keys(R.quiz).length;
    return `<section class="home">
      <div class="home-hero paper-card">
        <p class="eyebrow">15. 발명과 특허, 지식재산권 · 발명 특허 탐정단</p>
        <h1 class="hero-title">내 아이디어의 권리를 찾아라!</h1>
        <p class="hero-sub">지식재산권을 배우고, 내가 가진 아이디어를 모의 특허출원서로 만들어 봐요.</p>
        <p class="motto">아이디어를 찾아서, 권리로 설명하다</p>
        <div class="hero-actions">
          <button type="button" class="btn primary lg" data-act="go" data-tab="learn">처음부터 학습하기</button>
          <button type="button" class="btn ink lg" data-act="go" data-tab="apply" data-step="0">빈칸 출원서 바로 작성하기</button>
          <button type="button" class="btn lg" data-act="resume" ${hasData ? '' : 'disabled aria-disabled="true"'}>이어하기</button>
          <button type="button" class="btn lg" data-act="demo">예시로 체험하기</button>
        </div>
        <div class="stamp" aria-hidden="true">모의</div>
      </div>

      <div class="home-grid">
        <section class="paper-card">
          <h2>① 학습 수준 고르기</h2>
          <p class="small">언제든 바꿀 수 있고, 바꿔도 입력한 내용은 지워지지 않아요.</p>
          <div class="radio-row big" role="radiogroup" aria-label="학습 수준">
            ${D.levels.map((l) => `<label class="radio-chip"><input type="radio" name="home-level" data-act-change="level" value="${l.id}" ${R.level === l.id ? 'checked' : ''}><span>${esc(l.name)}</span></label>`).join('')}
          </div>
        </section>
        <section class="paper-card">
          <h2>② 발명 아이디어 고르기</h2>
          <div class="choice-list">
            <button type="button" class="choice ${R.idea.mode === 'mine' ? 'on' : ''}" data-act="idea-mode" data-mode="mine"><b>이전에 구상한 내 아이디어 사용</b><span>예전에 생각해 둔 아이디어를 적어요.</span></button>
            <button type="button" class="choice ${R.idea.mode === 'example' ? 'on' : ''}" data-act="idea-mode" data-mode="example"><b>예시 아이디어 사용</b><span>교육용 가상 예시 3가지 중 골라요.</span></button>
            <button type="button" class="choice ${R.idea.mode === 'teacher' ? 'on' : ''}" data-act="idea-mode" data-mode="teacher"><b>교사가 준 활동 아이디어 입력</b><span>선생님이 알려 준 발명 이름과 설명을 적어요.</span></button>
          </div>
        </section>
        <section class="paper-card">
          <h2>③ 발명가 별명 (선택)</h2>
          ${formTable([fieldRow({ path: 'application.displayName', label: '별명 또는 모둠명', placeholder: '예: 발명탐정 2모둠', hint: '실명, 학교, 연락처는 적지 않아요. 별명이나 모둠명만 적어요.' })])}
          <p class="notice-box">🔒 이 기기에 저장됩니다. 공용 태블릿이라면 수업 뒤 기록을 내려받고 기기 데이터를 지워 주세요. 시크릿(사생활 보호) 창에서는 창을 닫으면 기록이 사라질 수 있어요.</p>
        </section>
        <section class="paper-card teacher-quick">
          <h2>수업 바로가기</h2>
          <div class="btn-row">
            <button type="button" class="btn" data-act="go" data-tab="learn">오늘은 1~2차시 → 01 권리 이해관</button>
            <button type="button" class="btn" data-act="go" data-tab="prior">오늘은 3~4차시 → 03 선행기술 조사실</button>
          </div>
          <p class="small">이 웹앱은 법적 효력이 없는 교육용 모의출원 서비스예요. 실제 접수, 특허 등록, 심사, 출원번호 발급, 특허성 판단, 수수료 납부를 하지 않아요.</p>
        </section>
      </div>
    </section>`;
  }

  /* ───────── 01 권리 이해관 ───────── */
  function viewLearn() {
    const q = D.quiz;
    const shown = lv() === 'grade4' ? q.slice(0, 8) : q;
    return `${pageHead('01', '권리 이해관', '지식재산권 다섯 가지를 알아봐요. 카드를 눌러 펼쳐 보세요.')}
    <section class="cards5">
      ${D.rights.map((r) => `<details class="right-card" ${r.id === 'patent' ? 'open' : ''}>
        <summary><span class="ic" aria-hidden="true">${r.icon}</span><span><b>${r.name}</b><small>${esc(r.line)}</small></span></summary>
        <dl>
          <dt>무엇을 보호하지?</dt><dd>${esc(r.what)}</dd>
          <dt>생활 속 예시</dt><dd>${esc(r.example)}</dd>
          <dt>헷갈리기 쉬운 사례</dt><dd>${esc(r.confusing)}</dd>
          ${lv() !== 'grade4' ? `<dt>더 알아보기</dt><dd>${esc(r.deep)}</dd>` : ''}
          <dt>기억할 한 문장</dt><dd class="remember">“${esc(r.remember)}”</dd>
        </dl></details>`).join('')}
    </section>

    <section class="paper-card">
      <h2>비교해 보기</h2>
      <p class="small">한 물건에도 여러 종류의 지식재산권이 함께 관련될 수 있어요.</p>
      <div class="compare-grid">
        ${D.compares.map((c) => `<div class="compare"><h3>${esc(c.title)}</h3>
          <div class="tbl-wrap"><table class="data-table"><thead><tr>${c.head.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
          <tbody>${c.rows.map((row) => `<tr>${row.map((cell, i) => (i === 0 ? `<th scope="row">${esc(cell)}</th>` : `<td>${esc(cell)}</td>`)).join('')}</tr>`).join('')}</tbody></table></div></div>`).join('')}
      </div>
    </section>

    <section class="paper-card">
      <h2>특허 제도 핵심</h2>
      <ul class="bullets">
        ${lv() === 'grade4'
          ? '<li><b>새로운가?</b> 이미 알려진 기술과 같지 않아야 해요.</li><li><b>어떻게 작동하나?</b> 구조와 작동 원리를 다른 사람이 이해할 수 있게 설명해야 해요.</li><li><b>쓸모가 있나?</b> 실제로 만들어 쓸 수 있어야 해요.</li>'
          : `<li><b>산업상 이용가능성</b> — 산업에서 실제로 이용할 수 있어야 해요.</li><li><b>신규성</b> — 출원 전에 이미 알려진 기술과 같지 않아야 해요.</li><li><b>진보성</b> — 그 분야의 사람이 기존 기술로부터 쉽게 생각해 낼 수 없어야 해요.</li>`}
        <li><b>선행기술 조사</b>는 이미 알려진 기술과 비교하기 위한 탐색이에요. 짧은 검색만으로 특허등록 가능 여부를 확정할 수 없어요.</li>
        <li>출원한 뒤 <b>심사</b>를 거쳐 등록 여부가 결정돼요. <b>출원만으로 특허권이 생기지 않아요.</b></li>
        <li>퀴즈의 정답은 공부를 위한 것이고, 실제 특허 가능성·침해 여부는 전문적인 법률 판단이 필요해요.</li>
      </ul>
    </section>

    <section class="paper-card">
      <h2>O/X 확인 문제 <small class="small">(틀려도 다음 단계로 갈 수 있어요)</small></h2>
      <ol class="quiz">
        ${shown.map((it) => {
          const a = R.quiz[it.id];
          const answered = typeof a === 'boolean';
          const ok = answered && a === it.answer;
          return `<li class="quiz-item">
            <p>${esc(it.text)}</p>
            <div class="ox" role="group" aria-label="O 또는 X 선택">
              <button type="button" class="ox-btn ${a === true ? 'sel' : ''}" data-act="quiz" data-id="${it.id}" data-v="1" aria-pressed="${a === true}">O</button>
              <button type="button" class="ox-btn ${a === false ? 'sel' : ''}" data-act="quiz" data-id="${it.id}" data-v="0" aria-pressed="${a === false}">X</button>
            </div>
            ${answered ? `<p class="feedback ${ok ? 'good' : 'retry'}" role="status">${ok ? '✔ 맞았어요!' : '✎ 다시 생각해 봐요.'} 정답: <b>${it.answer ? 'O' : 'X'}</b> — ${esc(it.why)}</p>` : ''}
          </li>`;
        }).join('')}
      </ol>
    </section>

    <section class="paper-card">
      <h2>실제 특허출원 절차 알아보기</h2>
      <p class="warn-line"><b>출원 ≠ 등록</b> · <b>모의출원 ≠ 실제 출원</b> — 이 웹앱은 아래 절차를 설명만 하고, 실제 전자출원은 하지 않아요.</p>
      <ol class="process">
        ${D.process.map((p, i) => `<li><span class="pn">${i + 1}</span><div><b>${esc(p.t)}</b><p>${esc(p.d)}</p>${p.link ? `<p>${ext(p.link.url, p.link.name)}</p>` : ''}</div></li>`).join('')}
      </ol>
      <p class="small">법령·서식·절차는 바뀔 수 있으므로 실제 출원에 관한 요건(대리, 미성년자 법정대리인 등)과 기간은 공식 안내에서 확인하세요. 이 화면은 일반적인 교육 정보이며 법률·특허 자문이 아니에요.</p>
      <ul class="link-list">${D.links.map((l) => `<li>${ext(l.url, l.name)}</li>`).join('')}</ul>
    </section>
    <div class="next-row"><button type="button" class="btn primary" data-act="go" data-tab="cases">다음: 02 사례 탐정실 →</button></div>`;
  }

  /* ───────── 02 사례 탐정실 ───────── */
  function caseAns(id) { return R.caseAnswers.find((c) => c.questionId === id); }
  function viewCases() {
    const list = lv() === 'grade4' ? D.cases.slice(0, 10) : D.cases;
    return `${pageHead('02', '사례 탐정실', '사례마다 <b>주로 관련된 권리</b>를 골라 보세요. 여러 개를 골라도 돼요. 버튼을 누르거나, 아래 권리 카드를 사례 칸으로 끌어다 놓을 수 있어요.')}
    <div class="drag-palette paper-card" aria-label="끌어다 놓는 권리 카드">
      <span class="small">끌어다 놓기:</span>
      ${D.caseOptions.map((o) => `<span class="drag-chip" draggable="true" data-drag="${o.id}">${esc(o.name)}</span>`).join('')}
    </div>
    <ol class="case-list">
      ${list.map((c, n) => {
        const a = caseAns(c.id) || { selected: [], checked: false };
        const accept = c.main.concat(c.also);
        const good = a.checked && a.selected.length && a.selected.every((s) => accept.includes(s)) && a.selected.some((s) => c.main.includes(s));
        return `<li class="case paper-card" data-drop="${c.id}">
          <div class="case-head"><span class="case-ic" aria-hidden="true">${c.icon}</span><div><span class="small">사례 ${n + 1}</span><p class="case-text">${esc(c.text)}</p></div></div>
          <div class="opt-row" role="group" aria-label="관련된 권리 고르기">
            ${D.caseOptions.map((o) => `<button type="button" class="opt-btn ${a.selected.includes(o.id) ? 'sel' : ''}" aria-pressed="${a.selected.includes(o.id)}" data-act="case-pick" data-id="${c.id}" data-opt="${o.id}">${a.selected.includes(o.id) ? '☑' : '☐'} ${esc(o.name)}</button>`).join('')}
          </div>
          <div class="btn-row">
            <button type="button" class="btn sm" data-act="toggle" data-target="hint-${c.id}" aria-expanded="false">힌트 보기</button>
            <button type="button" class="btn sm ink" data-act="case-check" data-id="${c.id}" ${a.selected.length ? '' : 'disabled'}>해설 확인</button>
          </div>
          <p class="hint" id="hint-${c.id}" hidden>💡 ${esc(c.hint)}</p>
          ${a.checked ? `<div class="feedback ${good ? 'good' : 'retry'}" role="status">
            <p><b>${good ? '✔ 잘 찾았어요!' : '✎ 다시 생각해 볼까요?'}</b> 주로 관련된 권리: <b>${c.main.map((m) => D.caseOptions.find((o) => o.id === m).name).join(', ')}</b>${c.also.length ? ` (함께 검토할 수 있음: ${c.also.map((m) => D.caseOptions.find((o) => o.id === m).name).join(', ')})` : ''}</p>
            <p>${esc(c.why)}</p>
            <p class="small">왜 이런 권리가 관련될까? 내 생각을 말해 보세요.</p></div>` : ''}
        </li>`;
      }).join('')}
    </ol>

    <section class="paper-card">
      <h2>특허를 생각할 때 필요한 질문</h2>
      <p class="small">이 질문은 법적 특허성을 판정하는 것이 아니라, 생각을 정리하기 위한 <b>교육용 점검 질문</b>이에요. 내 아이디어로 짧게 답해 보세요(선택).</p>
      ${formTable(D.patentQuestions.map((p) => fieldRow({ path: 'reflect.' + p.id, label: p.q, type: 'textarea', rows: 2, hint: p.link })))}
    </section>
    <div class="next-row"><button type="button" class="btn" data-act="go" data-tab="learn">← 01 권리 이해관</button><button type="button" class="btn primary" data-act="go" data-tab="prior">다음: 03 선행기술 조사실 →</button></div>`;
  }

  /* ───────── 03 선행기술 조사실 ───────── */
  function keywordSuggestions() {
    const t = trim(R.idea.kwTarget), p = trim(R.idea.kwProblem);
    const ss = String(R.idea.kwStructure || '').split(/[,\s]+/).map(trim).filter(Boolean);
    const out = new Set();
    if (t) {
      ss.forEach((s) => out.add(`${t} ${s}`));
      if (ss.length > 1) out.add(`${t} ${ss.join(' ')}`);
      if (p) out.add(`${t} ${p.split(/\s+/)[0]}`);
    }
    return Array.from(out).slice(0, 6);
  }
  function viewPrior() {
    const ps = R.priorSearch, idea = R.idea;
    const ex = D.exampleIdeas.find((e) => e.id === idea.exampleId);
    const docs = D.fictionalDocs.filter((d) => !ex || d.idea === ex.id);
    const sugg = keywordSuggestions();
    const depth = { grade4: '선생님이 준비한 가상 문헌 카드 2~3개 중에서 비교해 봐요.', grade5to6: '검색어를 조합해 보고, 찾은 기술의 요약을 내 아이디어와 비교해요.', middle: '키프리스에서 실제 문헌의 제목, 공개/등록번호, 기술의 차이를 기록해요.' }[lv()];
    return `${pageHead('03', '선행기술 조사실', '내 아이디어와 비슷한 기술이 이미 있는지 찾아보고 비교해요. ' + esc(depth))}

    <section class="paper-card">
      <h2>1. 발명 아이디어 가져오기</h2>
      <div class="seg" role="tablist" aria-label="아이디어 가져오는 방법">
        ${[['mine', 'A. 내 아이디어'], ['example', 'B. 예시 아이디어'], ['teacher', 'C. 교사 제공 아이디어']].map(([m, t]) => `<button type="button" role="tab" aria-selected="${idea.mode === m}" class="seg-btn ${idea.mode === m ? 'on' : ''}" data-act="idea-mode" data-mode="${m}" data-stay="1">${t}</button>`).join('')}
      </div>
      ${idea.mode === 'example' ? `
        <div class="example-ideas">
          ${D.exampleIdeas.map((e) => `<div class="idea-card ${idea.exampleId === e.id ? 'on' : ''}">
            <span class="badge">교육용 가상 예시</span>
            <h3>${esc(e.title)}</h3><p>${esc(e.purpose)}</p><p class="small">${esc(e.features)}</p>
            <button type="button" class="btn sm ${idea.exampleId === e.id ? 'ink' : ''}" data-act="pick-example" data-id="${e.id}">${idea.exampleId === e.id ? '✔ 선택됨' : '이 예시 고르기'}</button></div>`).join('')}
        </div>
        ${ex ? `<div class="practice-note"><span class="badge copper">연습용으로 미리 적힌 예시</span> 이 아이디어는 선생님이 준비한 연습 예시예요. 내 발명이라고 착각하지 않도록 출원서에 "교사 제공 예시"로 표시돼요.
          <div class="btn-row"><button type="button" class="btn sm" data-act="example-keep">예시 그대로 연습</button><button type="button" class="btn sm ink" data-act="example-own">내 생각으로 바꾸기</button></div></div>` : ''}`
      : idea.mode ? formTable([
          fieldRow({ path: 'idea.title', label: idea.mode === 'teacher' ? '발명의 명칭(선생님 제공)' : '아이디어 이름', placeholder: '없으면 비워 둬도 돼요' }),
          fieldRow({ path: 'idea.purpose', label: '무엇을 위한 아이디어인가요?', type: 'textarea', rows: 2 }),
          fieldRow({ path: 'idea.features', label: '어떤 특징이 있나요?', type: 'textarea', rows: 2 })
        ]) + `<div class="btn-row"><button type="button" class="btn sm" data-act="idea-to-app">출원서 '발명의 이름'으로 보내기</button>
          ${idea.mode === 'teacher' ? '<button type="button" class="btn sm" data-act="import-teacher">교사 예시 JSON 불러오기</button>' : ''}</div>`
      : '<p class="small">위에서 아이디어를 가져올 방법을 골라 주세요.</p>'}
    </section>

    <section class="paper-card">
      <h2>2. 검색어 만들기</h2>
      <p class="small">세 칸을 채우면 검색어 조합을 <b>제안</b>해요. 제안은 참고일 뿐이니 마음대로 고쳐 써요.</p>
      ${formTable([
        fieldRow({ path: 'idea.kwTarget', label: '발명의 대상', placeholder: '예: 우산' }),
        fieldRow({ path: 'idea.kwProblem', label: '해결할 문제', placeholder: '예: 물이 떨어짐' }),
        fieldRow({ path: 'idea.kwStructure', label: '구조·기능 (쉼표로 구분)', placeholder: '예: 탈착, 물받이' })
      ])}
      <div class="sugg" aria-live="polite">${sugg.length ? '<span class="small">제안 검색어 (눌러서 추가):</span> ' + sugg.map((s) => `<button type="button" class="chip-btn" data-act="add-query" data-q="${esc(s)}">+ ${esc(s)}</button>`).join('') : '<span class="small">대상과 구조·기능을 적으면 제안이 나타나요.</span>'}</div>
      ${formTable([fieldRow({ path: 'priorSearch.queries', label: '검색한 단어', type: 'tags', placeholder: '예: 우산 물받이' })])}
      <div class="kipris-box">
        <p><b>키프리스(KIPRIS)</b>는 특허 정보를 검색할 수 있는 공식 사이트예요. 이 웹앱은 검색 결과를 자동으로 가져오지 않아요. 직접 검색하고 결과를 아래에 기록해요.</p>
        <p><a class="btn ink" href="https://www.kipris.or.kr" target="_blank" rel="noopener noreferrer">키프리스 열기 ↗<span class="sr">(새 창, 외부 사이트)</span></a>
        <button type="button" class="mini" data-act="copy" data-text="https://www.kipris.or.kr">주소 복사</button></p>
      </div>
    </section>

    <section class="paper-card">
      <h2>3. 가상 학습 문헌 카드 <span class="badge copper">가상 학습자료 · 실제 특허 문헌이 아님</span></h2>
      <p class="small">수업 연습용으로 만든 가짜 문헌이에요. 실제 키프리스 문헌과 구별해요.</p>
      <div class="doc-cards">
        ${docs.map((d) => `<div class="doc-card"><span class="badge copper">가상 학습자료</span><p class="doc-id">학습자료 ${esc(d.id)}</p><h3>${esc(d.title)}</h3><p>${esc(d.features)}</p>
          <button type="button" class="btn sm" data-act="add-fictional" data-id="${d.id}" ${ps.items.length >= 10 ? 'disabled' : ''}>이 자료로 비교 기록 만들기</button></div>`).join('')}
      </div>
    </section>

    <section class="paper-card">
      <h2>4. 선행기술 비교 기록지</h2>
      <p class="small">최소 1개, 최대 5개를 권장해요. 찾지 못했다면 조사 상태에서 "자료를 찾지 못함"을 골라요. <b>"찾지 못함"이 새로운 발명이라는 증거는 아니에요.</b></p>
      ${ps.items.map((it, i) => priorItemForm(it, i)).join('')}
      <div class="btn-row"><button type="button" class="btn" data-act="prior-add" ${ps.items.length >= 10 ? 'disabled' : ''}>+ 비교 기록 추가</button>${ps.items.length >= 5 ? '<span class="small">5개 이상이면 핵심만 남겨 보세요.</span>' : ''}</div>
      ${formTable([
        fieldRow({ path: 'priorSearch.status', label: '조사 상태', type: 'radio', req: true, options: [{ v: 'done', t: '조사함' }, { v: 'inProgress', t: '아직 조사 중' }, { v: 'notFound', t: '자료를 찾지 못함' }] }),
        fieldRow({ path: 'priorSearch.note', label: '추가로 확인할 점', type: 'textarea', rows: 2, placeholder: '더 찾아보고 싶은 부분' })
      ])}
    </section>
    <div class="next-row"><button type="button" class="btn" data-act="go" data-tab="cases">← 02 사례 탐정실</button><button type="button" class="btn primary" data-act="go" data-tab="apply">다음: 04 모의출원서 작성소 →</button></div>`;
  }
  function priorItemForm(it, i) {
    const p = 'priorSearch.items.' + i;
    return `<fieldset class="repeat-box">
      <legend>비교 기록 ${i + 1} ${it.isFictional ? '<span class="badge copper">가상 학습자료 · 실제 특허 문헌이 아님</span>' : ''}</legend>
      <div class="repeat-tools"><button type="button" class="mini danger" data-act="prior-del" data-i="${i}">이 기록 삭제</button></div>
      ${formTable([
        fieldRow({ path: p + '.title', label: '찾은 기술의 이름', placeholder: '찾은 문헌의 제목을 적어요' }),
        fieldRow({ path: p + '.source', label: '찾은 곳', type: 'select', options: [{ v: 'KIPRIS', t: '키프리스' }, { v: 'teacherMaterial', t: '교사 제공 자료' }, { v: 'other', t: '기타' }] }),
        fieldRow({ path: p + '.documentId', label: '문헌번호(알면)', placeholder: '찾지 못했으면 비워도 돼요', hint: '실제로 확인한 번호만 적어요. 번호를 지어내지 않아요.' }),
        fieldRow({ path: p + '.url', label: '출처 주소', type: 'url', placeholder: 'https://...' }),
        fieldRow({ path: p + '.features', label: '비슷한 기술의 주요 특징', type: 'textarea', rows: 2, placeholder: '어떤 구조·기능인가요?' }),
        fieldRow({ path: p + '.similarities', label: '내 아이디어와 같은 점', type: 'textarea', rows: 2, placeholder: '어떤 기능이 닮았나요?' }),
        fieldRow({ path: p + '.differences', label: '내 아이디어와 다른 점', type: 'textarea', rows: 2, placeholder: '무엇이 다르다고 생각하나요?' })
      ])}</fieldset>`;
  }

  /* ───────── 04 모의출원서 작성소 ───────── */
  const STEPS = [
    { t: '발명 기본정보', q: { grade4: '내 발명의 이름을 지어 볼까요?', grade5to6: '발명의 이름과 아이디어의 출처를 적어요.', middle: '발명의 명칭, 분야, 아이디어 출처를 정리해요.' } },
    { t: '해결할 문제', q: '어떤 문제가 있었고, 왜 이 발명이 필요한지 설명해 보세요.' },
    { t: '구성과 작동 원리', q: { grade4: '발명이 어떤 부분으로 되어 있고 어떻게 움직이는지 적어요.', grade5to6: '부품마다 이름과 역할을 적고, 작동 순서를 설명해요.', middle: '구성요소와 구성요소 사이의 관계, 작동 원리를 구체적으로 설명해요.' } },
    { t: '기술적 차이', q: { grade4: '다른 점을 한 가지 적어도 충분해요.', grade5to6: '기존 물건과 어떤 차이가 있나요?', middle: '기존 기술과의 차이와 그 차이가 왜 중요한지 근거를 들어 설명해요.' } },
    { t: '사용 예와 효과', q: { grade4: '어디에 쓰나요? 쓰면 무엇이 좋아지나요?', grade5to6: '언제 어디서 어떻게 사용하고, 어떤 효과를 기대하나요?', middle: '실시 예(사용 장면)와 기대 효과, 한계를 정리해요.' } },
    { t: '도면', q: { grade4: '발명품을 그림으로 그리거나 사진을 넣어요.', grade5to6: '그림에 부품 번호를 붙이고 기능을 설명해요.', middle: '구성요소의 관계가 드러나도록 도면과 번호 설명을 작성해요.' } },
    { t: '청구항(심화)', q: { grade4: '원하면 펼쳐서 도전해 보세요. 비워 둬도 모의접수할 수 있어요.', grade5to6: '우리 발명에서 가장 중요한 특징을 한 문장으로 적어요.', middle: '기술적 구성요소 + 구성요소 간 관계 + 작동 특징 형식으로 적어요.' } },
    { t: '요약서', q: { grade4: '발명을 1~2문장으로 짧게 정리해요.', grade5to6: '발명의 중요한 내용을 2~3문장으로 정리해요.', middle: '구체적인 구성과 효과가 드러나도록 요약해요.' } }
  ];
  const tipOf = {
    0: '발명의 이름은 "무엇을 + 어떻게 하는 + 물건"처럼 지으면 알아보기 쉬워요.',
    1: '"누가, 언제, 어떤 불편을 겪는지"를 적으면 구체적이에요.',
    2: '부품의 이름 → 역할 → 작동 순서(①→②→③) 순서로 적어 보세요.',
    3: '03 조사실에서 찾은 기술과 비교해서 적으면 근거가 생겨요.',
    4: '아직 실험하지 않았다면 "~할 것으로 기대한다"처럼 써요.',
    5: '잘 그리지 않아도 괜찮아요. 부품에 번호(1, 2, 3)를 붙여 보세요.',
    6: '청구항은 보호받고 싶은 기술의 범위를 적는 부분이에요. 여기서는 교육용 간이 문장이에요.',
    7: '"내가 쓴 내용 모아보기"로 앞에서 쓴 내용을 다시 확인해요.'
  };
  function stepDone(i) {
    const a = R.application;
    switch (i) {
      case 0: return !!(trim(a.inventionTitle) && a.originalityNote);
      case 1: return !!(trim(a.problemSituation) && trim(a.goal));
      case 2: return !!(a.components.some((c) => trim(c.name) && trim(c.role)) && trim(a.howItWorks));
      case 3: return !!trim(a.uniqueFeatures);
      case 4: return !!(trim(a.useCase) && trim(a.expectedEffect));
      case 5: return !!(a.drawing.hasImage || trim(a.drawing.alternativeDescription));
      case 6: return !!trim(a.practiceClaim);
      case 7: return !!trim(a.abstract);
    }
    return false;
  }
  function viewApply() {
    const s = R.ui.step;
    const showDemoLabel = R.isDemo || R.application.originalityNote === 'teacherExample';
    return `<section class="apply">
      <div class="browser" role="region" aria-label="온라인 모의출원서 입력 화면">
        <div class="browser-bar" aria-hidden="true">
          <span class="dots"><i></i><i></i><i></i></span>
          <span class="addr">🔒 모의출원 연습실 › 04 모의출원서 작성소 › ${esc(STEPS[s].t)}</span>
          <span class="mock-chip">교육용</span>
        </div>
        <div class="form-head">
          <div><p class="eyebrow">04 · 모의출원서 작성소</p><h1>교육용 모의 특허출원서 입력</h1></div>
          <div class="form-meta"><span class="step-count">${s + 1} / 8단계</span><span id="save-status-inline" class="save-inline" aria-hidden="true"></span></div>
        </div>
        <p class="fixed-notice">📌 이 문서는 공부를 위한 모의 특허출원서입니다. 실제 제출·출원·등록되지 않습니다.</p>
        ${showDemoLabel ? '<p class="practice-note"><span class="badge copper">교사 제공 연습 예시</span> 예시 아이디어로 연습하고 있어요. 내 발명으로 착각하지 않도록 표시를 유지해요.</p>' : ''}
        <ol class="stepper" aria-label="작성 단계">
          ${STEPS.map((st, i) => `<li><button type="button" class="${i === s ? 'on' : ''} ${stepDone(i) ? 'done' : ''}" data-act="step" data-step="${i}" ${i === s ? 'aria-current="step"' : ''}>
            <span class="sn">${stepDone(i) ? '✓' : circled(i)}</span><span class="st">${esc(st.t)}</span></button></li>`).join('')}
        </ol>
        <div class="mobile-toggle" role="tablist" aria-label="작성 또는 미리보기">
          <button type="button" role="tab" class="seg-btn on" data-act="pane" data-pane="form" aria-selected="true">✎ 작성하기</button>
          <button type="button" role="tab" class="seg-btn" data-act="pane" data-pane="preview" aria-selected="false">📄 미리보기</button>
        </div>
        <div class="apply-grid" data-pane="form">
          <div class="form-pane">
            <section class="step-panel" aria-labelledby="step-title">
              <h2 id="step-title"><span class="snum">${circled(s)}</span> ${esc(STEPS[s].t)}</h2>
              <p class="q-line">Q. ${esc(pick(STEPS[s].q))}</p>
              <p class="tip">✍ 구체적으로 적는 팁: ${esc(tipOf[s])}</p>
              ${stepBody(s)}
            </section>
            <div class="step-nav">
              <button type="button" class="btn" data-act="step" data-step="${s - 1}" ${s === 0 ? 'disabled' : ''}>← 이전</button>
              ${s < 7 ? `<button type="button" class="btn primary" data-act="step" data-step="${s + 1}">다음 →</button>` : '<button type="button" class="btn primary" data-act="go" data-tab="submit">05 모의접수 창구로 →</button>'}
            </div>
          </div>
          <aside class="preview-pane" aria-label="A4 모의출원서 실시간 미리보기">
            <div class="preview-tools">
              <span class="small">A4 실시간 미리보기 · 빈칸을 누르면 해당 입력칸으로 이동해요</span>
              <span><button type="button" class="mini" data-act="print" data-kind="app-detail">🖨 인쇄 미리보기</button></span>
            </div>
            <div class="paper-scroll"><article class="paper" id="preview"></article></div>
          </aside>
        </div>
      </div>
    </section>`;
  }
  function advBlock(rows) {
    if (!rows.length) return '';
    return `<details class="adv" ${isAdvOpen() ? 'open' : ''}><summary>심화 문항 ${isAdvOpen() ? '' : '더 보기'} <span class="small">(중학생 권장 · 적지 않아도 돼요)</span></summary>${formTable(rows)}</details>`;
  }
  function stepBody(s) {
    const a = R.application;
    switch (s) {
      case 0: return formTable([
        fieldRow({ path: 'application.displayName', label: '발명가(별명 또는 모둠명)', placeholder: '예: 발명탐정 2모둠', hint: '실명 대신 별명이나 모둠명을 적어요. 법적 출원인 칸이 아니에요.' }),
        fieldRow({ path: 'application.inventionTitle', label: '발명의 이름은 무엇인가요?', req: true, placeholder: '예: 가방 부착형 우산 물받이 거치대', hint: { grade4: '무엇에 쓰는 물건인지 알 수 있게 이름을 지어요.', grade5to6: '발명의 대상과 특징이 드러나게 지어요.', middle: '발명의 대상, 핵심 구성, 용도가 드러나도록 간결하게 지어요.' } }),
        fieldRow({ path: 'application.originalityNote', label: '이 아이디어는 어디에서 가져왔나요?', type: 'radio', req: true, options: [{ v: 'myPreviousIdea', t: '내 기존 아이디어' }, { v: 'teacherExample', t: '교사 제공 예시' }, { v: 'groupIdea', t: '공동 구상 아이디어' }] }),
        fieldRow({ path: 'application.collaborators', label: '함께 구상한 친구가 있나요?', placeholder: '별명으로 적어요', hint: '실명은 적지 않아도 돼요.' })
      ]) + advBlock([
        fieldRow({ path: 'application.category', label: '어떤 분야의 발명인가요?', list: 'cat-list', placeholder: '생활용품, 학습도구, 안전, 환경 등', adv: true })
      ]) + `<datalist id="cat-list">${D.categories.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
        <p class="small info">ℹ 실제 출원서에는 출원인 정보, 특허고객번호, 대리인 정보 등이 들어가지만, 이 모의출원서에서는 입력받지 않아요.</p>`;
      case 1: return formTable([
        fieldRow({ path: 'application.problemSituation', label: '어떤 불편함이나 문제를 해결하려고 하나요?', type: 'textarea', rows: 5, req: true, hint: { grade4: '언제, 어디서, 무엇이 불편했는지 적어요.', grade5to6: '불편을 겪는 사람과 상황을 구체적으로 적어요.', middle: '문제 상황과 그 원인을 함께 설명해요(배경기술).' } }),
        fieldRow({ path: 'application.goal', label: '그래서 어떤 일을 할 수 있는 물건을 만들고 싶나요?', type: 'textarea', rows: 3, req: true, hint: '해결 목표를 구체적으로 적어요.' })
      ]) + advBlock([
        fieldRow({ path: 'application.existingSolution', label: '지금까지는 이 문제를 어떻게 해결하나요?', type: 'textarea', rows: 3, adv: true, hint: '기존 제품이나 방법을 적어요.' }),
        fieldRow({ path: 'application.technicalField', label: '이 발명은 어떤 기술 분야에 속하나요?', adv: true, placeholder: '예: 생활용품의 탈착식 고정 구조' })
      ]);
      case 2: return `<div class="comp-list">${a.components.map((c, i) => compForm(c, i, a.components.length)).join('')}</div>
        <div class="btn-row"><button type="button" class="btn" data-act="comp-add">+ 부품 추가</button></div>
        ${numberWarnings()}
        ${formTable([
          fieldRow({ path: 'application.howItWorks', label: '이 발명은 어떤 순서와 원리로 작동하나요?', type: 'textarea', rows: 5, req: true, hint: '예: ① 클립을 가방에 끼운다 → ② 우산을 고정한다 → ③ 떨어진 물을 아래 용기에 모은다', tools: '<button type="button" class="mini" data-act="insert-steps">①→②→③ 틀 넣기</button>' }),
          fieldRow({ path: 'application.materials', label: '어떤 재료를 사용할 수 있나요?', type: 'tags', placeholder: '예: 플라스틱' })
        ])}`;
      case 3: return formTable([
        fieldRow({ path: 'application.uniqueFeatures', label: '기존 물건과 어떤 점이 다른가요?', type: 'textarea', rows: 5, req: true, hint: { grade4: '다른 점을 한 가지 적어도 충분해요.', grade5to6: '조사한 기술과 비교해 다른 점을 적어요.', middle: '기존 기술과의 차이와 그 이유(근거)를 함께 적어요.' }, tools: '<button type="button" class="mini ink" data-act="toggle" data-target="prior-import" aria-expanded="false">03 조사실 결과에서 가져오기</button>', after: priorImportPanel() }),
        fieldRow({ path: 'application.sourceLink', label: '참고한 선행기술 조사 기록', type: 'select', options: R.priorSearch.items.map((it, i) => ({ v: it.id, t: `비교 기록 ${i + 1}: ${trim(it.title) || '(이름 없음)'}` })), hint: '03 조사실에서 기록한 자료 중 하나를 연결할 수 있어요.' }),
        fieldRow({ path: 'application.uncertainty', label: '아직 확인하지 못한 점이 있나요?', type: 'textarea', rows: 3 })
      ]) + advBlock([
        fieldRow({ path: 'application.improvementReason', label: '그 차이로 어떤 문제를 더 잘 해결할 수 있나요?', type: 'textarea', rows: 3, adv: true })
      ]) + '<p class="small info">ℹ 이 웹앱은 신규성이나 진보성을 인증하거나 판정하지 않아요.</p>';
      case 4: return formTable([
        fieldRow({ path: 'application.useCase', label: '언제 어디서 어떻게 사용하나요?', type: 'textarea', rows: 4, req: true }),
        fieldRow({ path: 'application.expectedEffect', label: '이 발명을 사용하면 어떤 점이 좋아지나요?', type: 'textarea', rows: 4, req: true, hint: '실험으로 확인하지 않았다면 "기대하는 효과"로 적어요.' }),
        fieldRow({ path: 'application.limits', label: '예상되는 불편함이나 개선할 점은 무엇인가요?', type: 'textarea', rows: 3 })
      ]) + advBlock([
        fieldRow({ path: 'application.implementation', label: '실제 제작한다면 어떻게 만들 수 있을까요?', type: 'textarea', rows: 3, adv: true })
      ]);
      case 5: return drawingBody();
      case 6: {
        const inner = `<p class="practice-note"><span class="badge copper">간이 청구항(교육용)</span> 실제 제출용 문장이 아니에요. 법적 효력이나 권리 범위를 평가하지 않아요.</p>
          <p class="small">예시 틀: <code>○○을(를) 포함하고, □□에 결합되어 △△하도록 구성된 [발명품 이름].</code></p>
          ${formTable([fieldRow({ path: 'application.practiceClaim', label: lv() === 'grade5to6' ? '우리 발명에서 가장 중요한 특징 한 문장' : '간이 청구항(교육용)', type: 'textarea', rows: 4, hint: { grade4: '가장 중요한 부품들을 "~을 포함하는 ○○" 형태로 적어 봐요.', grade5to6: '[우리 발명에서 가장 중요한 특징 한 문장]으로 적어요.', middle: '기술적 구성요소 + 구성요소 간 관계 + 작동 특징 순서로 적어요.' }, tools: '<button type="button" class="mini" data-act="claim-frame">문장 틀 넣기</button>' })])}`;
        return lv() === 'grade4' ? `<details class="adv"><summary>청구항 도전하기 (펼쳐 보기)</summary>${inner}</details>` : inner;
      }
      case 7: return formTable([
        fieldRow({ path: 'application.abstract', label: '발명의 중요한 내용을 짧게 정리해 보세요.', type: 'textarea', rows: 5, req: true, hint: { grade4: '1~2문장도 괜찮아요.', grade5to6: '문제, 발명 이름, 효과가 들어가게 적어요.', middle: '구체적인 구성과 효과를 설명해요.' }, tools: '<button type="button" class="mini" data-act="toggle" data-target="collect" aria-expanded="false">내가 쓴 내용 모아보기</button><button type="button" class="mini" data-act="toggle" data-target="helper" aria-expanded="false">요약 작성 도우미</button>', after: collectPanel() + helperPanel() }),
        fieldRow({ path: 'application.keywords', label: '중요한 낱말 2~4개', type: 'tags', placeholder: '예: 우산' })
      ]);
    }
    return '';
  }
  function compForm(c, i, n) {
    const p = 'application.components.' + i;
    return `<fieldset class="repeat-box">
      <legend>구성요소 ${circled(i)}</legend>
      <div class="repeat-tools">
        <button type="button" class="mini" data-act="comp-up" data-i="${i}" ${i === 0 ? 'disabled' : ''} aria-label="구성요소 ${i + 1} 위로">▲ 위로</button>
        <button type="button" class="mini" data-act="comp-down" data-i="${i}" ${i === n - 1 ? 'disabled' : ''} aria-label="구성요소 ${i + 1} 아래로">▼ 아래로</button>
        <button type="button" class="mini danger" data-act="comp-del" data-i="${i}" ${n === 1 ? 'disabled' : ''} aria-label="구성요소 ${i + 1} 삭제">삭제</button>
      </div>
      ${formTable([
        fieldRow({ path: p + '.name', id: 'comp-name-' + i, label: `부품/구성 ${i + 1}의 이름`, req: i === 0, example: i < 3 ? D.demo.components[i].name : undefined, placeholder: '예: 탈착 클립' }),
        fieldRow({ path: p + '.role', id: 'comp-role-' + i, label: '이 부분은 어떤 역할을 하나요?', type: 'textarea', rows: 2, req: !!trim(c.name) || i === 0, example: i < 3 ? D.demo.components[i].role : undefined }),
        fieldRow({ path: p + '.drawingNumber', id: 'comp-num-' + i, label: '도면의 번호', placeholder: '예: 1', hint: '도면 단계에서 그림에 붙인 번호와 맞춰요.' })
      ])}</fieldset>`;
  }
  function numberWarnings() {
    const a = R.application;
    const partNums = a.drawing.parts.map((p) => trim(p.number)).filter(Boolean);
    if (!partNums.length) return '';
    const miss = a.components.filter((c) => trim(c.drawingNumber) && !partNums.includes(trim(c.drawingNumber)));
    if (!miss.length) return '';
    return `<p class="warn" role="note">⚠ 도면 번호 확인: ${miss.map((c) => `"${esc(trim(c.name) || '이름 없는 부품')}"(번호 ${esc(c.drawingNumber)})`).join(', ')}의 번호가 도면 번호 설명에 없어요. 꼭 맞추지 않아도 저장·접수할 수 있어요.</p>`;
  }
  function priorImportPanel() {
    const items = R.priorSearch.items.filter((it) => trim(it.similarities) || trim(it.differences));
    return `<div class="import-panel" id="prior-import" hidden>
      <p class="small"><b>03 조사실에서 적은 내용</b> — 참고할 항목만 골라 "덧붙이기"를 누르면 그 내용만 칸 끝에 더해져요.</p>
      ${items.length ? items.map((it) => `<div class="import-item"><p class="small"><b>${esc(trim(it.title) || '이름 없는 기록')}</b>${it.isFictional ? ' <span class="badge copper">가상</span>' : ''}</p>
        ${trim(it.similarities) ? `<label class="chk"><input type="checkbox" data-import="${esc('[' + (trim(it.title) || '조사 기록') + '와 같은 점] ' + trim(it.similarities))}"> 같은 점: ${esc(it.similarities)}</label>` : ''}
        ${trim(it.differences) ? `<label class="chk"><input type="checkbox" data-import="${esc('[' + (trim(it.title) || '조사 기록') + '와 다른 점] ' + trim(it.differences))}"> 다른 점: ${esc(it.differences)}</label>` : ''}</div>`).join('')
        + '<button type="button" class="btn sm ink" data-act="import-prior">이 내용을 참고해 작성 (선택한 것만 덧붙이기)</button>'
        : '<p class="small">아직 03 조사실에 적은 "같은 점/다른 점"이 없어요. <button type="button" class="mini" data-act="go" data-tab="prior">03 조사실로 가기</button></p>'}
    </div>`;
  }
  function collectPanel() {
    const a = R.application;
    const rows = [['발명의 이름', a.inventionTitle], ['해결할 문제', a.problemSituation], ['구성', a.components.filter((c) => trim(c.name)).map((c) => c.name).join(', ')], ['작동 원리', a.howItWorks], ['기대 효과', a.expectedEffect]];
    return `<div class="import-panel" id="collect" hidden><p class="small"><b>내가 쓴 내용</b> (그대로 인용)</p>
      <dl class="collect">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${trim(v) ? nl(v) : '<span class="blank-inline">[작성 전]</span>'}</dd>`).join('')}</dl></div>`;
  }
  function helperText() {
    const a = R.application;
    const f = (v, ph) => (trim(v) ? trim(v).replace(/[.。]\s*$/, '') : `[${ph}]`);
    const comps = a.components.filter((c) => trim(c.name)).map((c) => trim(c.name)).join(', ');
    return `이 발명은 ${f(a.problemSituation, '해결할 문제')}(이)라는 문제를 해결하기 위한 ${f(a.inventionTitle, '발명 명칭')}이다. ${comps ? comps + '(으)로 구성되며, ' : '[구성요소]로 구성되며, '}${f(a.expectedEffect, '기대 효과')}`;
  }
  function helperPanel() {
    return `<div class="import-panel" id="helper" hidden><p class="small"><b>요약 작성 도우미</b> — 이미 적은 내용만 문장 틀에 넣어 <b>제안</b>해요. [ ] 칸은 아직 적지 않은 부분이에요. 넣은 뒤 꼭 직접 읽고 고쳐 주세요.</p>
      <p class="suggest-box" id="helper-text">${esc(helperText())}</p>
      <button type="button" class="btn sm" data-act="use-helper">제안을 요약 칸에 넣기 (직접 고칠 거예요)</button></div>`;
  }

  /* 도면 */
  function drawingBody() {
    const d = R.application.drawing;
    const reqDrawing = (R.level === 'grade4' || R.level === 'grade5to6') && !R.settings.drawingOptional;
    return `<p class="small">손가락·마우스·스타일러스로 그리거나 사진·그림 파일을 넣을 수 있어요. ${reqDrawing ? '<b>이 학습 수준에서는 그림 또는 대체 설명이 필요해요(수업 활동 기준).</b>' : '그림은 권장 사항이에요.'}</p>
      <p class="small info">ℹ 실제 특허출원에서는 발명의 내용에 따라 도면 첨부 여부가 달라질 수 있어요. 여기서의 그림은 수업 활동을 위한 것이며 법정 필수 조건이 아니에요.</p>
      <div class="sketch">
        <div class="sketch-tools" role="toolbar" aria-label="그리기 도구">
          <span class="grp" role="group" aria-label="펜 두께">
            <button type="button" class="tool on" data-pen="3" aria-pressed="true" title="가는 펜">✎ 가늘게</button>
            <button type="button" class="tool" data-pen="6" aria-pressed="false" title="보통 펜">✎ 보통</button>
            <button type="button" class="tool" data-pen="12" aria-pressed="false" title="굵은 펜">✎ 굵게</button>
          </span>
          <span class="grp" role="group" aria-label="색">
            <button type="button" class="tool swatch on" data-color="#111111" aria-pressed="true" aria-label="검정"><i style="background:#111"></i></button>
            <button type="button" class="tool swatch" data-color="#5b6670" aria-pressed="false" aria-label="회색"><i style="background:#5b6670"></i></button>
            <button type="button" class="tool swatch" data-color="#1d4ed8" aria-pressed="false" aria-label="파랑"><i style="background:#1d4ed8"></i></button>
          </span>
          <span class="grp">
            <button type="button" class="tool" data-tool="eraser" aria-pressed="false">⌫ 지우개</button>
            <button type="button" class="tool" data-tool="undo">↶ 실행 취소</button>
            <button type="button" class="tool" data-tool="redo">↷ 다시 실행</button>
            <button type="button" class="tool" data-tool="rotate">⟳ 90° 회전</button>
            <button type="button" class="tool danger" data-tool="clear">초기화</button>
          </span>
          <label class="chk small"><input type="checkbox" id="pen-only"> 펜·마우스로만 그리기(손바닥 닿음 방지)</label>
        </div>
        <canvas id="sketch" width="1200" height="800" aria-label="도면 그리기 칸. 그림을 글로 설명하려면 아래 대체 설명 칸을 이용하세요." role="img"></canvas>
        <div class="upload-row">
          <label class="btn" for="img-upload">🖼 사진·그림 파일 넣기 (PNG/JPG/WebP, 10MB 이하)</label>
          <input type="file" id="img-upload" accept="image/png,image/jpeg,image/webp" class="sr-file">
          <span class="small">넣은 사진은 이 기기에서 다시 그려 저장하므로 촬영 위치 같은 정보(EXIF)는 저장되지 않아요.</span>
        </div>
      </div>
      ${formTable([
        fieldRow({ path: 'application.drawing.caption', label: '그림에서 중요한 부분을 설명해 주세요.', type: 'textarea', rows: 3 }),
        fieldRow({ path: 'application.drawing.alternativeDescription', label: '그림 대신 글로 설명하기(대체 설명)', type: 'textarea', rows: 3, hint: '그림을 그리기 어렵다면 모양과 부품 배치를 글로 설명해도 돼요.' })
      ])}
      <h3 class="sub-h">번호 설명 (선택)</h3>
      ${d.parts.map((p, i) => `<div class="part-row">
        <label for="part-num-${i}" class="sr">번호 ${i + 1}</label><input id="part-num-${i}" class="num-in" data-bind="application.drawing.parts.${i}.number" value="${esc(p.number)}" placeholder="번호">
        <label for="part-lb-${i}" class="sr">번호가 가리키는 부분</label><input id="part-lb-${i}" data-bind="application.drawing.parts.${i}.label" value="${esc(p.label)}" placeholder="번호가 가리키는 부분">
        <button type="button" class="mini danger" data-act="part-del" data-i="${i}">삭제</button></div>`).join('')}
      <div class="btn-row"><button type="button" class="btn sm" data-act="part-add">+ 번호 추가</button><button type="button" class="btn sm" data-act="parts-from-comps">구성요소 목록에서 번호 가져오기</button></div>
      ${numberWarnings()}`;
  }

  let sketch = null;
  function mountSketch() {
    const c = $('#sketch'); if (!c) return;
    const ctx = c.getContext('2d');
    const st = { pen: 3, color: '#111111', eraser: false, drawing: false, undo: [], redo: [], last: null, penOnly: false };
    sketch = st;
    const fillWhite = () => { ctx.save(); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.restore(); };
    fillWhite();
    const drawURL = (url) => new Promise((res) => { if (!url) return res(); const im = new Image(); im.onload = () => { fillWhite(); ctx.drawImage(im, 0, 0, c.width, c.height); res(); }; im.onerror = () => res(); im.src = url; });
    if (drawingURL) drawURL(drawingURL);
    const snap = () => { st.undo.push(c.toDataURL('image/png')); if (st.undo.length > 15) st.undo.shift(); st.redo = []; };
    const commit = () => {
      const blank = isBlank();
      storeDrawing(blank ? null : c.toDataURL('image/png'));
    };
    const isBlank = () => {
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      for (let i = 0; i < d.length; i += 64) if (d[i] < 250 || d[i + 1] < 250 || d[i + 2] < 250) return false;
      return true;
    };
    const pos = (e) => { const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) }; };
    c.addEventListener('pointerdown', (e) => {
      if (st.penOnly && e.pointerType === 'touch') return;
      if (e.pointerType === 'touch' && e.width > 45 && e.height > 45) return; /* 손바닥 접촉 무시 */
      e.preventDefault();
      c.setPointerCapture(e.pointerId);
      snap(); st.drawing = true; st.last = pos(e);
      ctx.beginPath(); ctx.fillStyle = st.eraser ? '#fff' : st.color;
      ctx.arc(st.last.x, st.last.y, (st.eraser ? st.pen * 3 : st.pen) / 2, 0, Math.PI * 2); ctx.fill();
    });
    c.addEventListener('pointermove', (e) => {
      if (!st.drawing) return;
      const p = pos(e);
      ctx.strokeStyle = st.eraser ? '#fff' : st.color; ctx.lineWidth = st.eraser ? st.pen * 3 : st.pen; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(st.last.x, st.last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); st.last = p;
    });
    const end = () => { if (!st.drawing) return; st.drawing = false; commit(); };
    c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end); c.addEventListener('lostpointercapture', end);

    $('.sketch-tools').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.pen) { st.pen = +b.dataset.pen; st.eraser = false; pressGroup(b, '[data-pen]'); setPressed('[data-tool="eraser"]', false); }
      else if (b.dataset.color) { st.color = b.dataset.color; st.eraser = false; pressGroup(b, '[data-color]'); setPressed('[data-tool="eraser"]', false); }
      else if (b.dataset.tool === 'eraser') { st.eraser = !st.eraser; setPressed('[data-tool="eraser"]', st.eraser); }
      else if (b.dataset.tool === 'undo') { if (!st.undo.length) return; st.redo.push(c.toDataURL('image/png')); drawURL(st.undo.pop()).then(commit); }
      else if (b.dataset.tool === 'redo') { if (!st.redo.length) return; st.undo.push(c.toDataURL('image/png')); drawURL(st.redo.pop()).then(commit); }
      else if (b.dataset.tool === 'clear') { if (!confirm('그림을 모두 지울까요? (실행 취소로 되돌릴 수 있어요)')) return; snap(); fillWhite(); commit(); announce('그림을 지웠어요.'); }
      else if (b.dataset.tool === 'rotate') { snap(); rotate90(); commit(); }
    });
    function pressGroup(b, sel) { $$(sel).forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); }); }
    function setPressed(sel, v) { const x = $(sel); if (x) { x.classList.toggle('on', v); x.setAttribute('aria-pressed', String(v)); } }
    function rotate90() {
      const t = document.createElement('canvas'); t.width = c.height; t.height = c.width;
      const tc = t.getContext('2d'); tc.translate(t.width / 2, t.height / 2); tc.rotate(Math.PI / 2); tc.drawImage(c, -c.width / 2, -c.height / 2);
      fillWhite(); placeFit(t.width, t.height, t);
    }
    function placeFit(w, h, src) {
      const sc = Math.min(c.width / w, c.height / h);
      const dw = w * sc, dh = h * sc;
      ctx.drawImage(src, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh);
    }
    $('#pen-only').addEventListener('change', (e) => { st.penOnly = e.target.checked; });
    $('#img-upload').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0]; e.target.value = '';
      if (!f) return;
      if (!/^image\/(png|jpeg|webp)$/.test(f.type)) { alert('PNG, JPG, WebP 그림 파일만 넣을 수 있어요.'); return; }
      if (f.size > 10 * 1024 * 1024) { alert('파일이 너무 커요. 10MB 이하의 파일을 골라 주세요.'); return; }
      const url = URL.createObjectURL(f); const im = new Image();
      im.onload = () => {
        URL.revokeObjectURL(url);
        if (im.naturalWidth > 12000 || im.naturalHeight > 12000) { alert('그림의 크기(픽셀)가 너무 커요.'); return; }
        snap(); fillWhite(); placeFit(im.naturalWidth, im.naturalHeight, im); commit(); announce('그림을 넣었어요.');
      };
      im.onerror = () => { URL.revokeObjectURL(url); alert('그림을 읽을 수 없어요.'); };
      im.src = url;
    });
  }

  /* ───────── 미리보기/출력 문서 (하나의 원본 상태에서 생성) ───────── */
  const ORIGIN = { myPreviousIdea: '내 기존 아이디어', teacherExample: '교사 제공 예시(연습용)', groupIdea: '공동 구상 아이디어' };
  const SOURCE = { KIPRIS: '키프리스', teacherMaterial: '교사 제공 자료', other: '기타' };
  const SEARCH = { done: '조사함', inProgress: '아직 조사 중', notFound: '자료를 찾지 못함' };
  function val(v, jump, ph) {
    return trim(v) ? nl(trim(v)) : `<span class="blank" ${jump ? `data-jump="${jump}" role="link" tabindex="0"` : ''}>[${ph || '작성 전'}]</span>`;
  }
  function buildDoc(opt) {
    const a = R.application, ps = R.priorSearch, ms = R.mockSubmission;
    const detail = opt.detail !== false;
    const show = (v) => detail || trim(v);
    const J = (step, field) => `${step}|${field}`;
    const statusTxt = { draft: '작성 중', mockSubmitted: '모의접수 완료(교육용)', editedAfterSubmit: '모의접수 뒤 수정됨 (다시 모의접수 가능)' }[ms.status];
    const comps = a.components.filter((c, i) => i === 0 || trim(c.name) || trim(c.role));
    const items = ps.items;
    const priorEmpty = !items.length || ps.status === 'notFound';
    const demoBadge = R.isDemo || a.originalityNote === 'teacherExample';
    let h = `<div class="doc-notice">교육용 모의출원 · 법적 효력 없음</div>
      <h1 class="doc-title">교육용 모의 특허출원서</h1>
      <p class="doc-sub">※ 이 문서는 수업용 모의출원서이며 실제 특허출원·접수가 아닙니다.</p>
      ${demoBadge ? '<p class="doc-sub"><span class="badge copper">교사 제공 연습 예시</span></p>' : ''}
      <section class="doc-sec"><h2>Ⅰ. 모의출원 기본정보</h2>
      <table class="doc-table"><tbody>
        <tr><th>모의 발명가(별명·모둠명)</th><td>${val(a.displayName, J(0, 'f-application-displayName'))}</td></tr>
        <tr><th>발명의 명칭</th><td class="strong">${val(a.inventionTitle, J(0, 'f-application-inventionTitle'))}</td></tr>
        ${show(a.category) ? `<tr><th>발명의 분야</th><td>${val(a.category, J(0, 'f-application-category'))}</td></tr>` : ''}
        <tr><th>아이디어 출처</th><td>${a.originalityNote ? esc(ORIGIN[a.originalityNote]) : val('', J(0, 'f-application-originalityNote'))}</td></tr>
        ${trim(a.collaborators) ? `<tr><th>함께 구상한 친구(별명)</th><td>${nl(a.collaborators)}</td></tr>` : ''}
      </tbody></table></section>
      <section class="doc-sec"><h2>Ⅱ. 발명의 설명 — 간이 명세서</h2>
        ${show(a.technicalField) ? `<h3>1. 기술분야</h3><p>${val(a.technicalField, J(1, 'f-application-technicalField'))}</p>` : ''}
        <h3>2. 발명의 배경 및 해결하려는 문제</h3><p>${val(a.problemSituation, J(1, 'f-application-problemSituation'))}</p>
        ${show(a.existingSolution) ? `<p class="sub-p"><b>기존의 해결 방법:</b> ${val(a.existingSolution, J(1, 'f-application-existingSolution'))}</p>` : ''}
        <h3>3. 발명의 목적</h3><p>${val(a.goal, J(1, 'f-application-goal'))}</p>
        <h3>4. 발명의 구성</h3>
        <ul class="comp-ul">${comps.map((c, i) => `<li><b>구성요소 ${circled(i)}${trim(c.drawingNumber) ? ` (도면 ${esc(c.drawingNumber)})` : ''}:</b> ${val(c.name, J(2, 'comp-name-' + i))} / <b>역할:</b> ${val(c.role, J(2, 'comp-role-' + i))}</li>`).join('')}</ul>
        ${a.materials.length ? `<p class="sub-p"><b>사용할 수 있는 재료:</b> ${a.materials.map(esc).join(', ')}</p>` : ''}
        <h3>5. 작동 원리 및 사용 방법</h3><p>${val(a.howItWorks, J(2, 'f-application-howItWorks'))}</p>
        <p class="sub-p"><b>사용 예:</b> ${val(a.useCase, J(4, 'f-application-useCase'))}</p>
        ${show(a.implementation) ? `<p class="sub-p"><b>제작 방법(구상):</b> ${val(a.implementation, J(4, 'f-application-implementation'))}</p>` : ''}
        <h3>6. 기존 기술과의 차이</h3><p>${val(a.uniqueFeatures, J(3, 'f-application-uniqueFeatures'))}</p>
        ${show(a.improvementReason) ? `<p class="sub-p"><b>차이로 더 잘 해결하는 점:</b> ${val(a.improvementReason, J(3, 'f-application-improvementReason'))}</p>` : ''}
        ${trim(a.uncertainty) ? `<p class="sub-p"><b>아직 확인하지 못한 점:</b> ${nl(a.uncertainty)}</p>` : ''}
        <h3>7. 기대하는 효과</h3><p>${val(a.expectedEffect, J(4, 'f-application-expectedEffect'))}</p>
        ${show(a.limits) ? `<p class="sub-p"><b>예상되는 불편·개선할 점:</b> ${val(a.limits, J(4, 'f-application-limits'))}</p>` : ''}
        ${show(a.practiceClaim) ? `<h3>8. 간이 청구항(교육용·심화)</h3><p class="claim">${val(a.practiceClaim, J(6, 'f-application-practiceClaim'), lv() === 'grade4' ? '선택 항목 — 작성하지 않음' : '작성 전')}</p><p class="tiny">※ 교육용 간이 문장이며 실제 청구범위나 권리 범위를 뜻하지 않습니다.</p>` : ''}
      </section>
      <section class="doc-sec"><h2>Ⅲ. 선행기술 조사 기록</h2>
        <table class="doc-table"><tbody>
          <tr><th>조사 상태</th><td>${ps.status ? esc(SEARCH[ps.status]) : '<span class="blank">[작성 전]</span>'}</td></tr>
          <tr><th>검색어</th><td>${ps.queries.length ? ps.queries.map(esc).join(', ') : '<span class="blank">[작성 전]</span>'}</td></tr>
        </tbody></table>
        ${priorEmpty ? '<p class="flag">검색으로 확인하지 못함 — 추가 조사 필요</p>' : ''}
        ${items.map((it, i) => `<div class="prior-doc"><p><b>비교 기록 ${i + 1}${it.isFictional ? ' (가상 학습자료 · 실제 특허 문헌이 아님)' : ''}</b>${a.sourceLink === it.id ? ' <span class="tiny">← 6. 기존 기술과의 차이에서 참고</span>' : ''}</p>
          <table class="doc-table"><tbody>
            <tr><th>비슷한 기술/문헌명</th><td>${val(it.title)}</td></tr>
            <tr><th>출처</th><td>${it.source ? esc(SOURCE[it.source]) : '<span class="blank">[작성 전]</span>'}${trim(it.documentId) ? ' · 문헌번호: ' + esc(it.documentId) : ''}${trim(it.url) ? '<br><span class="url">' + esc(it.url) + '</span>' : ''}</td></tr>
            ${trim(it.features) ? `<tr><th>주요 특징</th><td>${nl(it.features)}</td></tr>` : ''}
            <tr><th>공통점</th><td>${val(it.similarities)}</td></tr>
            <tr><th>차이점</th><td>${val(it.differences)}</td></tr>
          </tbody></table></div>`).join('')}
        ${trim(ps.note) ? `<p class="sub-p"><b>추가 조사 사항:</b> ${nl(ps.note)}</p>` : ''}
      </section>
      <section class="doc-sec keep"><h2>Ⅳ. 도면</h2>
        ${a.drawing.hasImage && drawingURL ? `<figure class="doc-fig"><img src="${drawingURL}" alt="학생이 직접 그리거나 첨부한 도면${trim(a.drawing.caption) ? ': ' + esc(a.drawing.caption) : ''}"></figure>` : `<p class="fig-empty">${trim(a.drawing.alternativeDescription) ? '' : `<span class="blank" data-jump="${J(5, 'sketch')}" role="link" tabindex="0">[그림 첨부 예정]</span>`}</p>`}
        ${trim(a.drawing.alternativeDescription) ? `<p class="sub-p"><b>그림 대체 설명:</b> ${nl(a.drawing.alternativeDescription)}</p>` : ''}
        <p class="sub-p"><b>그림 설명:</b> ${val(a.drawing.caption, J(5, 'f-application-drawing-caption'))}</p>
        <p class="sub-p"><b>번호 설명:</b> ${a.drawing.parts.filter((p) => trim(p.number) || trim(p.label)).length ? a.drawing.parts.filter((p) => trim(p.number) || trim(p.label)).map((p) => `${esc(p.number || '?')}: ${esc(p.label || '[작성 전]')}`).join(' · ') : '<span class="blank">[작성 전]</span>'}</p>
      </section>
      <section class="doc-sec keep"><h2>Ⅴ. 요약서</h2><p>${val(a.abstract, J(7, 'f-application-abstract'))}</p>
        ${a.keywords.length ? `<p class="sub-p"><b>중요한 낱말:</b> ${a.keywords.map(esc).join(', ')}</p>` : ''}</section>
      <footer class="doc-foot">
        <p>상태: <b>${statusTxt}</b>${ms.localSubmittedAt ? ` · 모의접수 날짜(이 기기 기준, 법적 출원일 아님): ${esc(ms.localSubmittedAt.slice(0, 10))}` : ''}</p>
        <p>교육용 문서 ID: <b>${esc(ms.mockId || 'MOCK-(모의접수 전)')}</b> ※ 공식 출원번호가 아닙니다.</p>
        <p class="doc-notice">교육용 모의출원 · 법적 효력 없음</p>
      </footer>`;
    return h;
  }
  let pvRaf = 0;
  function schedulePreview() {
    if (pvRaf) return;
    pvRaf = requestAnimationFrame(() => { pvRaf = 0; const p = $('#preview'); if (p) p.innerHTML = buildDoc({ detail: true }); });
  }
  function mountApply() {
    schedulePreview();
    if (R.ui.step === 5) mountSketch();
  }
  function refreshStepper() {
    $$('.stepper button').forEach((b) => {
      const i = +b.dataset.step; const d = stepDone(i);
      b.classList.toggle('done', d);
      b.querySelector('.sn').textContent = d ? '✓' : circled(i);
    });
  }

  /* ───────── 05 모의접수 창구 ───────── */
  function checks() {
    const a = R.application;
    const drawReq = (R.level === 'grade4' || R.level === 'grade5to6') && !R.settings.drawingOptional;
    const hasDraw = a.drawing.hasImage || trim(a.drawing.alternativeDescription);
    const c = [
      { t: '발명의 이름을 적었나요?', ok: !!trim(a.inventionTitle), step: 0, f: 'f-application-inventionTitle', v: a.inventionTitle },
      { t: '어떤 문제를 해결하는지 적었나요?', ok: !!trim(a.problemSituation), step: 1, f: 'f-application-problemSituation', v: a.problemSituation },
      { t: '구성요소를 적어도 1개 설명했나요? (이름과 역할)', ok: a.components.some((x) => trim(x.name) && trim(x.role)), step: 2, f: 'comp-name-0' },
      { t: '작동 원리를 적었나요?', ok: !!trim(a.howItWorks), step: 2, f: 'f-application-howItWorks', v: a.howItWorks },
      { t: '기존 기술과의 차이를 적었나요?', ok: !!trim(a.uniqueFeatures), step: 3, f: 'f-application-uniqueFeatures', v: a.uniqueFeatures },
      { t: '언제 어떻게 사용하는지 적었나요?', ok: !!trim(a.useCase), step: 4, f: 'f-application-useCase', v: a.useCase },
      { t: '기대하는 효과를 적었나요?', ok: !!trim(a.expectedEffect), step: 4, f: 'f-application-expectedEffect', v: a.expectedEffect },
      { t: '발명 내용을 간단히 요약했나요?', ok: !!trim(a.abstract), step: 7, f: 'f-application-abstract', v: a.abstract },
      { t: '선행기술 조사 상태를 선택했나요?', ok: !!R.priorSearch.status, tab: 'prior', f: 'f-priorSearch-status', note: R.priorSearch.status === 'notFound' ? '"자료를 찾지 못함"도 정직한 기록이에요. 출원서에 "추가 조사 필요"가 표시돼요.' : '' },
      { t: '그림·도면을 그리거나 대체 설명을 했나요?', ok: !drawReq || !!hasDraw, soft: !drawReq, step: 5, f: 'sketch', note: !drawReq && !hasDraw ? (R.settings.drawingOptional ? '교사 설정으로 도면 없이도 모의접수할 수 있어요.' : '중등 모드에서는 도면이 권장 사항이에요. 없어도 모의접수할 수 있어요.') : '' }
    ];
    c.forEach((x) => { if (x.ok && x.v !== undefined && trim(x.v).length < 10) x.short = true; });
    return c;
  }
  function viewSubmit() {
    const c = checks();
    const missing = c.filter((x) => !x.ok);
    const can = !missing.length || (R.level === 'teacher' && R.settings.skipChecks);
    const ms = R.mockSubmission;
    return `${pageHead('05', '모의접수 창구', '빈칸을 모두 채웠는지 확인하고 모의접수해요. 모의접수는 학습용 문서를 "완성"했다는 표시일 뿐, <b>어떤 기관에도 전송되지 않아요.</b>')}
    <section class="paper-card counter">
      <div class="counter-head"><h2>제출 전 확인 목록</h2><span class="count-chip">${c.length - missing.length} / ${c.length} 확인</span></div>
      <ol class="checklist">
        ${c.map((x) => `<li class="${x.ok ? 'ok' : 'no'}">
          <span class="ck" aria-hidden="true">${x.ok ? '☑' : '☐'}</span>
          <div><p><b>${esc(x.t)}</b> <span class="sr">${x.ok ? '확인됨' : '아직 비어 있음'}</span>${x.ok ? '' : ' <span class="miss">아직 비어 있어요</span>'}</p>
          ${x.short ? '<p class="small">✎ 조금 더 구체적으로 적어 보세요.</p>' : ''}
          ${x.note ? `<p class="small">${esc(x.note)}</p>` : ''}</div>
          <button type="button" class="mini" data-act="jump" data-tab="${x.tab || 'apply'}" data-step="${x.step != null ? x.step : ''}" data-focus="${x.f}">해당 빈칸으로 이동</button>
        </li>`).join('')}
      </ol>
      ${R.level === 'teacher' ? `<div class="teacher-box"><p class="small"><b>교사 설정</b> (실제 법적 제출 요건과는 관계없는 수업용 설정이에요)</p>
        <label class="chk"><input type="checkbox" data-bind="settings.skipChecks" ${R.settings.skipChecks ? 'checked' : ''}> 필수 항목 검사 예외 적용</label>
        <label class="chk"><input type="checkbox" data-bind="settings.drawingOptional" ${R.settings.drawingOptional ? 'checked' : ''}> 도면 없이도 모의접수 허용(접근성)</label></div>` : ''}
      <div class="submit-row">
        <button type="button" class="btn primary lg" data-act="mock-submit" ${can ? '' : 'disabled aria-disabled="true"'}>${ms.status === 'draft' ? '모의접수 제출 (교육용)' : '다시 모의접수 (교육용)'}</button>
        ${can ? '' : `<p class="small">빈칸 ${missing.length}개를 채우면 모의접수 버튼이 켜져요.</p>`}
      </div>
      ${ms.status !== 'draft' ? `<p class="state-line">현재 상태: <b>${ms.status === 'mockSubmitted' ? '모의접수 완료(교육용)' : '모의접수 뒤 수정됨'}</b> · 교육용 문서 ID ${esc(ms.mockId || '')} (공식 출원번호 아님)</p>` : ''}
    </section>
    <section class="paper-card">
      <h2>실제로 특허를 출원하려면?</h2>
      <p>실제 출원은 공식 전자출원 시스템(특허로)에서 특허고객번호, 인증서, 수수료 납부 등의 절차를 거쳐요. 이 웹앱에서는 할 수 없어요.</p>
      <ul class="link-list">${D.links.slice(1, 5).map((l) => `<li>${ext(l.url, l.name)}</li>`).join('')}</ul>
    </section>`;
  }
  function mockSubmit() {
    const c = checks();
    if (c.some((x) => !x.ok) && !(R.level === 'teacher' && R.settings.skipChecks)) return;
    const yr = new Date().getFullYear();
    const rnd = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    R.mockSubmission = { status: 'mockSubmitted', mockId: `MOCK-${yr}-${rnd}`, localSubmittedAt: new Date().toISOString() };
    saveNow();
    render();
    openDialog(`<h2 class="dlg-title">모의출원서 작성 및 접수를 완료했어요! <span class="badge copper">교육용 모의접수</span></h2>
      <p>이 활동은 특허출원 절차를 배우는 <b>교육용 체험</b>입니다. 실제 특허청에 제출된 것이 아니며 특허권이나 출원번호가 발급되지 않았습니다.</p>
      <table class="doc-table"><tbody>
        <tr><th>교육용 문서 ID</th><td>${esc(R.mockSubmission.mockId)} <span class="tiny">(공식 출원번호 아님)</span></td></tr>
        <tr><th>모의접수 날짜</th><td>${esc(today())} <span class="tiny">(이 기기의 날짜 · 법적 출원일 아님)</span></td></tr>
      </tbody></table>
      <div class="btn-row">
        <button type="button" class="btn primary" data-act="print" data-kind="app-detail">서류 인쇄하기</button>
        <button type="button" class="btn" data-act="pdf-help">PDF로 저장하기</button>
        <button type="button" class="btn" data-act="export">JSON 기록 저장</button>
        <button type="button" class="btn" data-act="go" data-tab="apply" data-close="1">계속 수정하기</button>
      </div>`);
  }

  /* ───────── 06 탐정 기록 보관함 ───────── */
  function viewArchive() {
    const qN = Object.keys(R.quiz).length;
    const qOk = D.quiz.filter((q) => R.quiz[q.id] === q.answer).length;
    const cN = R.caseAnswers.filter((c) => c.checked).length;
    const doneSteps = STEPS.filter((_, i) => stepDone(i)).length;
    return `${pageHead('06', '탐정 기록 보관함', '지금까지의 활동 기록을 모아 보고, 인쇄하거나 파일로 저장해요.')}
    <section class="paper-card">
      <h2>활동 기록 모아보기</h2>
      <div class="stat-row">
        <div class="stat"><b>${qOk}<small> / ${qN}</small></b><span>O/X 문제 (맞힌 수 / 푼 수)</span></div>
        <div class="stat"><b>${cN}<small> / ${D.cases.length}</small></b><span>사례 탐정 해설 확인</span></div>
        <div class="stat"><b>${R.priorSearch.items.length}</b><span>선행기술 비교 기록</span></div>
        <div class="stat"><b>${doneSteps}<small> / 8</small></b><span>출원서 작성 단계</span></div>
      </div>
      <p class="state-line">모의출원 상태: <b>${{ draft: '작성 중', mockSubmitted: '모의접수 완료(교육용)', editedAfterSubmit: '모의접수 뒤 수정됨' }[R.mockSubmission.status]}</b></p>
    </section>
    <section class="paper-card">
      <h2>인쇄 · PDF</h2>
      <div class="radio-row" role="radiogroup" aria-label="출원서 인쇄 형식">
        <label class="radio-chip"><input type="radio" name="print-mode" value="app-simple"><span>간단 문서 (비어 있는 선택 항목 생략)</span></label>
        <label class="radio-chip"><input type="radio" name="print-mode" value="app-detail" checked><span>상세 문서 (모든 항목)</span></label>
      </div>
      <div class="btn-row">
        <button type="button" class="btn primary xl" data-act="print-app">🖨 모의 특허출원서 인쇄</button>
      </div>
      <div class="btn-row">
        <button type="button" class="btn" data-act="pdf-help">PDF로 저장하는 방법 보기</button>
        <button type="button" class="btn" data-act="print" data-kind="prior">선행기술 조사표 인쇄</button>
        <button type="button" class="btn" data-act="print" data-kind="all">학습 기록 전체 인쇄</button>
        <button type="button" class="btn" data-act="print" data-kind="teacher">활동 설명 포함 인쇄(교사용)</button>
      </div>
    </section>
    <section class="paper-card">
      <h2>기록 파일(JSON) 저장 · 불러오기</h2>
      <label class="chk"><input type="checkbox" id="exp-drawing" checked> 도면 그림도 파일에 포함하기</label>
      <p class="small">그림을 빼고 저장하면 불러올 때 도면이 비어 있어요.</p>
      <div class="btn-row">
        <button type="button" class="btn ink" data-act="export">기록 파일(JSON) 저장</button>
        <button type="button" class="btn" data-act="import">기록 파일 불러오기</button>
      </div>
    </section>
    <section class="paper-card">
      <h2>기록 관리</h2>
      <p class="notice-box">공용 기기라면 수업 뒤 <b>기록 파일을 저장한 다음 "이 기록 삭제"</b>를 눌러 주세요. 이 웹앱은 기록을 서버로 보내지 않아요.</p>
      <div class="btn-row">
        <button type="button" class="btn" data-act="new-record">새로운 기록 만들기</button>
        <button type="button" class="btn danger" data-act="delete-record">이 기록 삭제</button>
      </div>
    </section>
    ${R.level === 'teacher' ? `<section class="paper-card"><h2>교사 관찰 참고 문항 <span class="small">(저장되지 않는 수업 참고용)</span></h2>
      <ul class="bullets"><li>지식재산권의 종류·특징을 구별했는가?</li><li>선행기술 조사 결과를 설명했는가?</li><li>발명의 특징과 작동 원리를 구체적으로 작성했는가?</li><li>모의출원과 실제 특허출원을 구별했는가?</li></ul></section>` : ''}`;
  }

  /* 인쇄 */
  function learningDoc() {
    const quizRows = D.quiz.filter((q) => typeof R.quiz[q.id] === 'boolean').map((q) => `<tr><td>${esc(q.text)}</td><td>${R.quiz[q.id] ? 'O' : 'X'}</td><td>${q.answer ? 'O' : 'X'}</td></tr>`).join('');
    const caseRows = R.caseAnswers.map((c) => { const k = D.cases.find((x) => x.id === c.questionId); if (!k) return ''; return `<tr><td>${esc(k.text)}</td><td>${c.selected.map((s) => esc((D.caseOptions.find((o) => o.id === s) || {}).name || s)).join(', ')}</td><td>${k.main.map((m) => D.caseOptions.find((o) => o.id === m).name).join(', ')}</td></tr>`; }).join('');
    const ref = D.patentQuestions.filter((p) => trim(R.reflect[p.id])).map((p) => `<p><b>${esc(p.q)}</b><br>${nl(R.reflect[p.id])}</p>`).join('');
    return `<div class="doc-notice">교육용 모의출원 · 법적 효력 없음</div>
      <h1 class="doc-title">지식재산권 탐정 기록</h1>
      <p class="doc-sub">발명가(별명): ${esc(trim(R.application.displayName) || '—')} · 학습 수준: ${esc(levelName())} · 출력일: ${today()}</p>
      <section class="doc-sec"><h2>Ⅰ. O/X 확인 문제</h2>${quizRows ? `<table class="doc-table"><thead><tr><th>문제</th><th>내 답</th><th>정답</th></tr></thead><tbody>${quizRows}</tbody></table>` : '<p class="blank">[아직 풀지 않음]</p>'}</section>
      <section class="doc-sec"><h2>Ⅱ. 사례 탐정 기록</h2>${caseRows ? `<table class="doc-table"><thead><tr><th>사례</th><th>내가 고른 권리</th><th>주로 관련된 권리</th></tr></thead><tbody>${caseRows}</tbody></table>` : '<p class="blank">[아직 기록 없음]</p>'}
      ${ref ? `<h3>특허 점검 질문에 대한 내 생각</h3>${ref}` : ''}</section>`;
  }
  function priorDoc() {
    const ps = R.priorSearch;
    return `<div class="doc-notice">교육용 모의출원 · 법적 효력 없음</div>
      <h1 class="doc-title">선행기술 조사표</h1>
      <p class="doc-sub">아이디어: ${esc(trim(R.application.inventionTitle) || trim(R.idea.title) || '—')} · 출력일: ${today()}</p>
      <table class="doc-table"><tbody>
        <tr><th>조사 상태</th><td>${ps.status ? esc(SEARCH[ps.status]) : '[작성 전]'}</td></tr>
        <tr><th>검색어</th><td>${ps.queries.length ? ps.queries.map(esc).join(', ') : '[작성 전]'}</td></tr></tbody></table>
      ${!ps.items.length || ps.status === 'notFound' ? '<p class="flag">검색으로 확인하지 못함 — 추가 조사 필요</p>' : ''}
      ${ps.items.length ? `<table class="doc-table wide"><thead><tr><th>#</th><th>기술/문헌명</th><th>출처</th><th>주요 특징</th><th>같은 점</th><th>다른 점</th></tr></thead><tbody>
        ${ps.items.map((it, i) => `<tr><td>${i + 1}</td><td>${esc(it.title || '[작성 전]')}${it.isFictional ? '<br><span class="tiny">(가상 학습자료 · 실제 특허 문헌이 아님)</span>' : ''}</td><td>${esc(SOURCE[it.source] || '')}${trim(it.documentId) ? '<br>' + esc(it.documentId) : ''}${trim(it.url) ? '<br><span class="url">' + esc(it.url) + '</span>' : ''}</td><td>${nl(it.features)}</td><td>${nl(it.similarities)}</td><td>${nl(it.differences)}</td></tr>`).join('')}</tbody></table>` : ''}
      ${trim(ps.note) ? `<p><b>추가로 확인할 점:</b> ${nl(ps.note)}</p>` : ''}
      <p class="doc-notice">교육용 모의출원 · 법적 효력 없음</p>`;
  }
  function teacherIntro() {
    return `<div class="doc-notice">교육용 모의출원 · 법적 효력 없음</div><h1 class="doc-title">활동 안내 — 발명 특허 탐정단</h1>
      <p>학습 목표: 지식재산권의 종류와 특징을 이해하고, 기존 발명 아이디어의 선행기술 조사와 모의 특허출원 과정을 체험한다.</p>
      <ol><li>1차시 — 지식재산권 5종 이해, 특허 vs 저작권 비교</li><li>2차시 — 권리 분류·사례 판단, 특허 요건 탐구</li><li>3차시 — 아이디어 선택, 키워드 추출, 선행기술 비교</li><li>4차시 — 모의출원서 작성, 모의접수(교육용), 발표</li></ol>
      <p class="small">이 문서는 교육용 모의출원 결과물이며, 실제 특허출원·등록·심사와 관계없습니다.</p>`;
  }
  function printDoc(kind) {
    const area = $('#print-area');
    const brk = '<div class="page-break"></div>';
    const map = {
      'app-detail': () => buildDoc({ detail: true }),
      'app-simple': () => buildDoc({ detail: false }),
      prior: priorDoc,
      all: () => learningDoc() + brk + priorDoc() + brk + buildDoc({ detail: true }),
      teacher: () => teacherIntro() + brk + learningDoc() + brk + priorDoc() + brk + buildDoc({ detail: true })
    };
    area.innerHTML = `<article class="paper print-paper">${(map[kind] || map['app-detail'])()}</article>`;
    const old = document.title;
    const name = (trim(R.application.inventionTitle) || '발명').replace(/[\\/:*?"<>|\s]+/g, '').slice(0, 30);
    document.title = (kind === 'prior' ? '선행기술조사표_' : kind === 'all' || kind === 'teacher' ? '탐정기록_' : '모의특허출원서_') + name + '_' + today();
    const imgs = $$('img', area);
    Promise.all(imgs.map((im) => (im.complete ? Promise.resolve() : new Promise((r) => { im.onload = im.onerror = r; })))).then(() => {
      closeDialog();
      window.print();
      setTimeout(() => { document.title = old; }, 500);
    });
  }

  /* JSON 내보내기/불러오기 */
  function exportJSON() {
    saveNow();
    const incl = $('#exp-drawing') ? $('#exp-drawing').checked : true;
    const out = JSON.parse(JSON.stringify(R));
    out.exportedAt = new Date().toISOString();
    out.app = '발명 특허 탐정단 (교육용 모의출원)';
    if (incl && drawingURL) out.drawingDataURL = drawingURL;
    else out.drawingIncluded = false;
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    const name = (trim(R.application.inventionTitle) || '기록').replace(/[\\/:*?"<>|\s]+/g, '').slice(0, 30);
    a.href = URL.createObjectURL(blob); a.download = `탐정기록_${name}_${today()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    announce(incl || !R.application.drawing.hasImage ? '기록 파일을 저장했어요.' : '기록 파일을 저장했어요. (도면 그림은 포함하지 않았어요)');
  }
  let importMode = 'record';
  function importJSON(file) {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { alert('파일이 너무 커요(15MB 이하).'); return; }
    const fr = new FileReader();
    fr.onload = () => {
      let obj;
      try { obj = JSON.parse(String(fr.result)); } catch (e) { alert('기록 파일을 읽을 수 없어요. 올바른 JSON 파일인지 확인해 주세요.'); return; }
      if (importMode === 'teacher') return importTeacher(obj);
      if (!obj || typeof obj !== 'object' || obj.schemaVersion !== 1) { alert('이 웹앱의 기록 파일이 아니거나 지원하지 않는 버전이에요.'); return; }
      if (!confirm('지금 기록을 불러온 기록으로 바꿀까요? 현재 기록이 필요하면 먼저 "기록 파일 저장"을 해 주세요.')) return;
      const rec = normalize(obj);
      let draw = null;
      if (typeof obj.drawingDataURL === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(obj.drawingDataURL) && obj.drawingDataURL.length < 14e6) draw = obj.drawingDataURL;
      R = rec;
      if (draw) { storeDrawing(draw); } else { drawingURL = null; IDB.get(drawKey()).then((v) => { if (typeof v === 'string') { drawingURL = v; R.application.drawing.hasImage = true; } else R.application.drawing.hasImage = false; render(); }).catch(() => {}); }
      saveNow(); render();
      if (obj.drawingIncluded === false && rec.application.drawing.hasImage) alert('기록을 불러왔어요. 이 파일에는 도면 그림이 포함되어 있지 않아요.');
      else announce('기록을 불러왔어요.');
    };
    fr.readAsText(file);
  }
  function importTeacher(obj) {
    const t = obj && (obj.teacherIdea || obj);
    if (!t || typeof t !== 'object' || typeof t.title !== 'string') { alert('교사 예시 파일 형식이 아니에요. {"title": "...", "description": "..."} 형식이어야 해요.'); return; }
    R.idea.mode = 'teacher';
    R.idea.title = t.title.slice(0, 200);
    R.idea.purpose = typeof t.description === 'string' ? t.description.slice(0, 2000) : R.idea.purpose;
    if (typeof t.features === 'string') R.idea.features = t.features.slice(0, 2000);
    touch(); render(); announce('교사 예시를 불러왔어요.');
  }

  function loadDemo() {
    const has = trim(R.application.inventionTitle) || trim(R.application.problemSituation) || R.priorSearch.items.length;
    if (has && !confirm('지금 기록에 입력한 내용이 있어요.\n먼저 "기록 파일(JSON) 저장"으로 보관한 뒤 새 예시 기록을 만드는 것을 권장해요.\n\n[확인] 현재 기록을 파일로 저장하고 예시 기록 만들기\n[취소] 그만두기')) return;
    if (has) exportJSON();
    const old = R.recordId;
    IDB.del('drawing:' + old).catch(() => {});
    const r = newRecord();
    r.level = R.level; r.isDemo = true;
    const d = D.demo;
    Object.assign(r.application, {
      displayName: '연습 예시', inventionTitle: d.inventionTitle, category: d.category, originalityNote: 'teacherExample',
      problemSituation: d.problemSituation, goal: d.goal, technicalField: d.technicalField,
      components: d.components.map((c) => Object.assign(blankComponent(), c)), howItWorks: d.howItWorks,
      uniqueFeatures: '', uncertainty: '조사 필요 — 학생이 실제로 찾은 선행기술 자료와 비교해서 직접 작성해요.',
      useCase: d.useCase, expectedEffect: d.expectedEffect, practiceClaim: d.practiceClaim, abstract: d.abstract, keywords: d.keywords.slice()
    });
    r.application.drawing.parts = d.components.map((c) => ({ number: c.drawingNumber, label: c.name }));
    r.idea = { mode: 'example', exampleId: 'ex-umbrella', title: D.exampleIdeas[0].title, purpose: D.exampleIdeas[0].purpose, features: D.exampleIdeas[0].features, kwTarget: '우산', kwProblem: '물이 떨어짐', kwStructure: '탈착, 물받이' };
    r.ui = { tab: 'apply', step: 3 };
    R = r; drawingURL = null; saveNow(); render();
    announce('교사 제공 연습 예시를 불러왔어요. "기존 기술과의 차이"는 직접 조사해서 적어요.');
  }

  /* 대화상자 */
  function openDialog(html) {
    const d = $('#dlg'); $('#dlg-body').innerHTML = html;
    if (typeof d.showModal === 'function') { if (!d.open) d.showModal(); } else d.setAttribute('open', '');
    const f = $('#dlg-body button, #dlg-body a'); if (f) f.focus();
  }
  function closeDialog() { const d = $('#dlg'); if (d.open) { if (typeof d.close === 'function') d.close(); else d.removeAttribute('open'); } }
  function announce(msg) { const l = $('#live'); l.textContent = ''; setTimeout(() => { l.textContent = msg; }, 30); const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600); }
  function pdfHelp() {
    openDialog(`<h2 class="dlg-title">PDF로 저장하는 방법</h2>
      <ol class="bullets"><li>아래 "인쇄 창 열기"를 누르세요.</li><li>인쇄 창의 <b>대상(프린터)</b>에서 <b>"PDF로 저장"</b>을 고르세요. (iPad: 공유 → "프린트" → 미리보기를 두 손가락으로 벌리면 PDF가 돼요)</li><li>용지 크기는 <b>A4</b>, 배율은 <b>기본값</b>으로 두세요. "배경 그래픽"을 켜면 표 색이 함께 인쇄돼요.</li><li>파일 이름에 실명은 넣지 않아요. 예: 모의특허출원서_우산물받이거치대_${today()}.pdf</li></ol>
      <p class="small">브라우저마다 메뉴 이름이 조금씩 달라요.</p>
      <div class="btn-row"><button type="button" class="btn primary" data-act="print" data-kind="app-detail">인쇄 창 열기</button><button type="button" class="btn" data-act="close">닫기</button></div>`);
  }
  function helpDialog() {
    openDialog(`<h2 class="dlg-title">도움말 — 발명 특허 탐정단</h2>
      <ul class="bullets">
        <li><b>01 권리 이해관 → 02 사례 탐정실</b>: 지식재산권을 배우고 사례를 판단해요.</li>
        <li><b>03 선행기술 조사실</b>: 아이디어를 고르고, 키프리스에서 직접 찾아본 기술을 기록해요.</li>
        <li><b>04 모의출원서 작성소</b>: 8단계 빈칸을 채우면 오른쪽 A4 출원서가 실시간으로 완성돼요.</li>
        <li><b>05 모의접수 창구</b>: 빈칸을 확인하고 교육용 모의접수를 해요.</li>
        <li><b>06 탐정 기록 보관함</b>: 인쇄, PDF, 기록 파일 저장·불러오기.</li>
        <li>탭은 자유롭게 오갈 수 있어요. 입력한 내용은 이 기기에 자동 저장돼요.</li>
        <li>상단의 <b>가</b>(글자 크게)와 <b>◐</b>(고대비) 버튼으로 보기 설정을 바꿀 수 있어요.</li>
      </ul>
      <p class="notice-box">이 웹앱은 법적 효력이 없는 교육용 모의출원 서비스예요. 실제 접수, 특허 등록, 심사, 출원번호 발급, 특허성 판단, 수수료 납부, 개인정보 수집·제출을 하지 않아요. 법률 안내는 일반적인 교육 정보이며 전문적인 법률·특허 자문이 아니에요.</p>
      <div class="btn-row"><button type="button" class="btn" data-act="close">닫기</button></div>`);
  }

  /* ───────── 이벤트 ───────── */
  function onInput(e) {
    const el = e.target;
    if (el.dataset.bind) {
      const path = el.dataset.bind;
      let v;
      if (el.type === 'checkbox') v = el.checked;
      else if (el.type === 'radio') { if (!el.checked) return; v = el.value; }
      else v = String(el.value).slice(0, MAX_STR);
      setPath(path, v);
      markEdited(path);
      touch();
      if (R.ui.tab === 'apply') {
        schedulePreview(); refreshStepper();
        const ht = $('#helper-text'); if (ht) ht.textContent = helperText();
      }
      if (/^idea\.kw/.test(path)) {
        const box = $('.sugg'); if (box) { const s = keywordSuggestions(); box.innerHTML = s.length ? '<span class="small">제안 검색어 (눌러서 추가):</span> ' + s.map((x) => `<button type="button" class="chip-btn" data-act="add-query" data-q="${esc(x)}">+ ${esc(x)}</button>`).join('') : '<span class="small">대상과 구조·기능을 적으면 제안이 나타나요.</span>'; }
      }
      if (path.startsWith('settings.') && e.type === 'change') render();
      if (el.type === 'radio' && path === 'application.originalityNote' && e.type === 'change') { render(); }
      if (el.type === 'radio' && path === 'priorSearch.status' && e.type === 'change') renderHeaderState();
    }
    if (el.dataset.actChange === 'level' && e.type === 'change') setLevel(el.value);
  }
  function setLevel(v) {
    if (!D.levels.some((l) => l.id === v)) return;
    R.level = v; touch(); render();
    announce(`학습 수준을 "${levelName()}"(으)로 바꿨어요. 입력한 내용은 그대로예요.`);
  }
  function addTag(path) {
    const inp = document.querySelector(`[data-tag-input="${path}"]`); if (!inp) return;
    const parts = inp.value.split(',').map(trim).filter(Boolean);
    if (!parts.length) return;
    const list = getPath(path) || [];
    parts.forEach((p) => { if (!list.includes(p) && list.length < 20) list.push(p.slice(0, 80)); });
    setPath(path, list); markEdited(path); touch();
    rerenderKeep(inp.id);
  }
  function rerenderKeep(focusId) {
    const y = window.scrollY;
    render();
    window.scrollTo(0, y);
    if (focusId) { const el = document.getElementById(focusId); if (el) el.focus({ preventScroll: true }); }
  }

  function onClick(e) {
    const blank = e.target.closest('[data-jump]');
    if (blank) { jumpFromPreview(blank.dataset.jump); return; }
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const act = b.dataset.act;
    const i = b.dataset.i != null ? +b.dataset.i : null;
    const a = R.application;
    switch (act) {
      case 'go':
        if (b.dataset.close) closeDialog();
        go(b.dataset.tab, b.dataset.step != null && b.dataset.step !== '' ? { step: +b.dataset.step } : null); break;
      case 'resume': go(R.ui.lastTab || (R.ui.tab === 'home' ? 'apply' : R.ui.tab)); break;
      case 'demo': loadDemo(); break;
      case 'step': R.ui.step = Math.max(0, Math.min(7, +b.dataset.step)); saveNow(); render(); $('.apply').scrollIntoView({ block: 'start' }); break;
      case 'jump': closeDialog(); go(b.dataset.tab, { step: b.dataset.step !== '' ? +b.dataset.step : undefined, focus: b.dataset.focus }); break;
      case 'toggle': {
        const t = document.getElementById(b.dataset.target); if (!t) return;
        t.hidden = !t.hidden; b.setAttribute('aria-expanded', String(!t.hidden)); break;
      }
      case 'fill-example': {
        const p = b.dataset.path; const ex = D.fieldExamples[p] !== undefined ? D.fieldExamples[p] : exampleForComp(p);
        if (ex == null) return;
        if (trim(getPath(p)) && !confirm('이미 적은 내용이 있어요. 예시로 바꿔 쓸까요?')) return;
        setPath(p, ex); markEdited(p); touch(); rerenderKeep(fid(p)); break;
      }
      case 'tag-add': addTag(b.dataset.path); break;
      case 'tag-del': { const l = getPath(b.dataset.path); l.splice(i, 1); markEdited(b.dataset.path); touch(); rerenderKeep(); break; }
      case 'copy': copyText(b.dataset.text); break;
      case 'quiz': R.quiz[b.dataset.id] = b.dataset.v === '1'; touch(); rerenderKeep(); break;
      case 'case-pick': {
        let ca = caseAns(b.dataset.id); if (!ca) { ca = { questionId: b.dataset.id, selected: [], checked: false }; R.caseAnswers.push(ca); }
        const o = b.dataset.opt; ca.selected = ca.selected.includes(o) ? ca.selected.filter((x) => x !== o) : ca.selected.concat(o);
        ca.checked = false; touch(); rerenderKeep(); break;
      }
      case 'case-check': { const ca = caseAns(b.dataset.id); if (ca) { ca.checked = true; touch(); rerenderKeep(); } break; }
      case 'idea-mode': R.idea.mode = b.dataset.mode; touch(); if (b.dataset.stay) rerenderKeep(); else go('prior'); break;
      case 'pick-example': {
        const ex = D.exampleIdeas.find((x) => x.id === b.dataset.id); if (!ex) return;
        R.idea.exampleId = ex.id; R.idea.kwTarget = R.idea.kwTarget || ex.kw.target; R.idea.kwProblem = R.idea.kwProblem || ex.kw.problem; R.idea.kwStructure = R.idea.kwStructure || ex.kw.structure;
        touch(); rerenderKeep(); break;
      }
      case 'example-keep': {
        const ex = D.exampleIdeas.find((x) => x.id === R.idea.exampleId); if (!ex) return;
        Object.assign(R.idea, { title: ex.title, purpose: ex.purpose, features: ex.features });
        if (!trim(a.inventionTitle)) a.inventionTitle = ex.title;
        a.originalityNote = 'teacherExample'; markEdited('application'); touch();
        announce('연습 예시로 진행해요. 출원서에 "교사 제공 예시"로 표시돼요.'); rerenderKeep(); break;
      }
      case 'example-own': {
        const ex = D.exampleIdeas.find((x) => x.id === R.idea.exampleId);
        if (ex) Object.assign(R.idea, { title: R.idea.title || ex.title, purpose: R.idea.purpose || ex.purpose, features: R.idea.features || ex.features });
        R.idea.mode = 'mine'; R.idea.exampleId = '';
        if (a.originalityNote === 'teacherExample') a.originalityNote = '';
        touch(); announce('예시를 바탕으로 내 생각을 적어 보세요. 출처는 출원서 ① 단계에서 다시 골라요.'); rerenderKeep(); break;
      }
      case 'idea-to-app':
        if (!trim(R.idea.title)) { announce('아이디어 이름을 먼저 적어 주세요.'); return; }
        if (trim(a.inventionTitle) && a.inventionTitle !== R.idea.title && !confirm('출원서에 이미 적은 발명의 이름이 있어요. 바꿀까요?')) return;
        a.inventionTitle = R.idea.title;
        if (!a.originalityNote) a.originalityNote = R.idea.mode === 'teacher' ? 'teacherExample' : 'myPreviousIdea';
        markEdited('application'); touch(); announce('출원서 "발명의 이름"에 넣었어요.'); break;
      case 'import-teacher': importMode = 'teacher'; $('#import-file').click(); break;
      case 'add-query': {
        const q = b.dataset.q; const l = R.priorSearch.queries; if (!l.includes(q)) l.push(q); markEdited('priorSearch'); touch(); rerenderKeep(); break;
      }
      case 'add-fictional': {
        const d = D.fictionalDocs.find((x) => x.id === b.dataset.id); if (!d) return;
        R.priorSearch.items.push({ id: uid(), title: d.title, source: 'teacherMaterial', documentId: '학습자료 ' + d.id, url: '', features: d.features, similarities: '', differences: '', isFictional: true });
        markEdited('priorSearch'); touch(); rerenderKeep(); announce('비교 기록을 만들었어요. 같은 점과 다른 점을 직접 적어 보세요.'); break;
      }
      case 'prior-add': R.priorSearch.items.push({ id: uid(), title: '', source: '', documentId: '', url: '', features: '', similarities: '', differences: '', isFictional: false }); markEdited('priorSearch'); touch(); rerenderKeep(); break;
      case 'prior-del': if (!confirm(`비교 기록 ${i + 1}을(를) 삭제할까요?`)) return; { const it = R.priorSearch.items.splice(i, 1)[0]; if (it && a.sourceLink === it.id) a.sourceLink = ''; } markEdited('priorSearch'); touch(); rerenderKeep(); break;
      case 'comp-add': a.components.push(blankComponent()); markEdited('application'); touch(); rerenderKeep('comp-name-' + (a.components.length - 1)); announce(`구성요소 ${a.components.length}을(를) 추가했어요.`); break;
      case 'comp-del': {
        const c = a.components[i]; if (a.components.length <= 1) return;
        if ((trim(c.name) || trim(c.role)) && !confirm(`구성요소 ${circled(i)}을(를) 삭제할까요?`)) return;
        a.components.splice(i, 1); markEdited('application'); touch(); rerenderKeep(); break;
      }
      case 'comp-up': case 'comp-down': {
        const j = act === 'comp-up' ? i - 1 : i + 1; if (j < 0 || j >= a.components.length) return;
        const t = a.components[i]; a.components[i] = a.components[j]; a.components[j] = t;
        markEdited('application'); touch(); rerenderKeep(); const btn = $(`[data-act="${act}"][data-i="${j}"]`); if (btn && !btn.disabled) btn.focus(); break;
      }
      case 'insert-steps': {
        const p = 'application.howItWorks';
        setPath(p, (trim(getPath(p)) ? getPath(p) + '\n' : '') + '① \n② \n③ '); touch(); rerenderKeep(fid(p)); break;
      }
      case 'claim-frame': {
        const p = 'application.practiceClaim';
        if (trim(getPath(p)) && !confirm('이미 적은 문장 뒤에 틀을 덧붙일까요?')) return;
        setPath(p, (trim(getPath(p)) ? getPath(p) + '\n' : '') + '○○을(를) 포함하고, □□에 결합되어 △△하도록 구성된 [발명품 이름].'); touch(); rerenderKeep(fid(p)); break;
      }
      case 'import-prior': {
        const sel = $$('#prior-import input[type=checkbox]:checked').map((x) => x.dataset.import);
        if (!sel.length) { announce('덧붙일 항목을 골라 주세요.'); return; }
        a.uniqueFeatures = (trim(a.uniqueFeatures) ? a.uniqueFeatures + '\n' : '') + sel.join('\n');
        markEdited('application'); touch(); rerenderKeep('f-application-uniqueFeatures'); announce('고른 내용만 덧붙였어요. 내 말로 다듬어 보세요.'); break;
      }
      case 'use-helper': {
        const txt = helperText();
        if (trim(a.abstract) && !confirm('이미 적은 요약이 있어요. 제안 문장으로 바꿀까요?')) return;
        a.abstract = txt; markEdited('application'); touch(); rerenderKeep('f-application-abstract'); announce('제안을 넣었어요. [ ] 칸과 문장을 직접 고쳐 주세요.'); break;
      }
      case 'part-add': a.drawing.parts.push({ number: String(a.drawing.parts.length + 1), label: '' }); markEdited('application'); touch(); rerenderKeep('part-lb-' + (a.drawing.parts.length - 1)); break;
      case 'part-del': a.drawing.parts.splice(i, 1); markEdited('application'); touch(); rerenderKeep(); break;
      case 'parts-from-comps': {
        const named = a.components.filter((c) => trim(c.name));
        if (!named.length) { announce('먼저 ③ 단계에서 구성요소 이름을 적어 주세요.'); return; }
        named.forEach((c, k) => {
          if (!trim(c.drawingNumber)) c.drawingNumber = String(k + 1);
          if (!a.drawing.parts.some((p) => trim(p.number) === trim(c.drawingNumber))) a.drawing.parts.push({ number: trim(c.drawingNumber), label: trim(c.name) });
        });
        markEdited('application'); touch(); rerenderKeep(); break;
      }
      case 'pane': {
        const g = $('.apply-grid'); g.dataset.pane = b.dataset.pane;
        $$('.mobile-toggle .seg-btn').forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-selected', String(on)); });
        break;
      }
      case 'mock-submit': mockSubmit(); break;
      case 'print': printDoc(b.dataset.kind); break;
      case 'print-app': { const m = $('input[name="print-mode"]:checked'); printDoc(m ? m.value : 'app-detail'); break; }
      case 'pdf-help': pdfHelp(); break;
      case 'export': exportJSON(); break;
      case 'import': importMode = 'record'; $('#import-file').click(); break;
      case 'new-record':
        if (!confirm('새로운 기록을 만들까요?\n지금 기록은 이 기기에서 사라지므로, 필요하면 먼저 "기록 파일(JSON) 저장"을 해 주세요.')) return;
        IDB.del(drawKey()).catch(() => {});
        { const lvSave = R.level; R = newRecord(); R.level = lvSave; } drawingURL = null; saveNow(); go('home'); announce('새로운 기록을 만들었어요.'); break;
      case 'delete-record':
        if (!confirm('이 기기에서 이 기록을 완전히 삭제할까요? 되돌릴 수 없어요.')) return;
        IDB.del(drawKey()).catch(() => {});
        try { localStorage.removeItem(KEY); } catch (er) { /* 무시 */ }
        R = newRecord(); drawingURL = null; saveNow(); go('home'); announce('기록을 삭제했어요.'); break;
      case 'help': helpDialog(); break;
      case 'close': closeDialog(); break;
      case 'large': prefs.large = !prefs.large; savePrefs(); break;
      case 'contrast': prefs.contrast = !prefs.contrast; savePrefs(); break;
    }
    if (act !== 'go' && act !== 'resume' && act !== 'jump' && R.ui.tab !== 'home') R.ui.lastTab = R.ui.tab;
  }
  function exampleForComp(p) {
    const m = p.match(/^application\.components\.(\d+)\.(name|role)$/);
    if (m && D.demo.components[+m[1]]) return D.demo.components[+m[1]][m[2]];
    return null;
  }
  function jumpFromPreview(spec) {
    const [step, field] = spec.split('|');
    R.ui.step = +step;
    render();
    const g = $('.apply-grid'); if (g) g.dataset.pane = 'form';
    $$('.mobile-toggle .seg-btn').forEach((x) => { const on = x.dataset.pane === 'form'; x.classList.toggle('on', on); x.setAttribute('aria-selected', String(on)); });
    setTimeout(() => {
      const adv = document.getElementById(field) && document.getElementById(field).closest('details'); if (adv) adv.open = true;
      const el = document.getElementById(field); if (el) { el.scrollIntoView({ block: 'center' }); el.focus({ preventScroll: true }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1600); }
    }, 30);
  }
  function copyText(t) {
    const done = () => announce('주소를 복사했어요: ' + t);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, () => prompt('주소를 복사하세요:', t));
    else prompt('주소를 복사하세요:', t);
  }

  function onKey(e) {
    if (e.target.dataset && e.target.dataset.tagInput && e.key === 'Enter' && !e.isComposing) { e.preventDefault(); addTag(e.target.dataset.tagInput); }
    const bl = e.target.closest && e.target.closest('[data-jump]');
    if (bl && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); jumpFromPreview(bl.dataset.jump); }
  }

  /* 사례 드래그 앤 드롭 */
  function onDragStart(e) { const c = e.target.closest && e.target.closest('[data-drag]'); if (c) { e.dataTransfer.setData('text/plain', c.dataset.drag); e.dataTransfer.effectAllowed = 'copy'; } }
  function onDragOver(e) { const z = e.target.closest && e.target.closest('[data-drop]'); if (z) { e.preventDefault(); z.classList.add('drop-on'); } }
  function onDragLeave(e) { const z = e.target.closest && e.target.closest('[data-drop]'); if (z && !z.contains(e.relatedTarget)) z.classList.remove('drop-on'); }
  function onDrop(e) {
    const z = e.target.closest && e.target.closest('[data-drop]'); if (!z) return;
    e.preventDefault(); z.classList.remove('drop-on');
    const o = e.dataTransfer.getData('text/plain'); if (!D.caseOptions.some((x) => x.id === o)) return;
    let ca = caseAns(z.dataset.drop); if (!ca) { ca = { questionId: z.dataset.drop, selected: [], checked: false }; R.caseAnswers.push(ca); }
    if (!ca.selected.includes(o)) ca.selected.push(o);
    ca.checked = false; touch(); rerenderKeep();
  }

  /* ───────── 시작 ───────── */
  function init() {
    R = loadRecord() || newRecord();
    loadPrefs();
    const sel = $('#level-select');
    sel.innerHTML = D.levels.map((l) => `<option value="${l.id}">${esc(l.name)}</option>`).join('');
    sel.addEventListener('change', () => setLevel(sel.value));
    document.addEventListener('input', onInput);
    document.addEventListener('change', onInput);
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    document.addEventListener('dragstart', onDragStart);
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('dragleave', onDragLeave);
    document.addEventListener('drop', onDrop);
    $('#import-file').addEventListener('change', (e) => { const f = e.target.files[0]; e.target.value = ''; importJSON(f); });
    $('#dlg').addEventListener('click', (e) => { if (e.target.id === 'dlg') closeDialog(); });
    window.addEventListener('beforeunload', saveNow);
    document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
    try { localStorage.setItem(KEY + '.probe', '1'); localStorage.removeItem(KEY + '.probe'); setStatus('saved'); } catch (e) { setStatus('fail'); }
    loadDrawing().then(() => {
      if (R.application.drawing.hasImage && !drawingURL) R.application.drawing.hasImage = false;
      render();
    });
    render();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
