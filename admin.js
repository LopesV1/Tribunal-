/* Painel de gestão do Tribunal */
(function () {
  const TJ = window.TJ, esc = TJ.esc, $ = TJ.$, L = TJ.L, state = TJ.state;
  const sb = () => TJ.sb;

  const PERMS = {
    '*': 'ACESSO TOTAL (tudo)',
    view_internal: 'Ver a área interna',
    write_filings: 'Protocolar peças (relatórios, alegações…)',
    view_all_filings: 'Ver as peças de todos',
    manage_cases: 'Gerir processos, partes, andamentos e provas',
    manage_announcements: 'Gerir comunicados',
    manage_agenda: 'Gerir agenda de audiências',
    manage_selection: 'Gerir processo seletivo e perguntas',
    manage_users: 'Gerir membros, convites e cargos',
    manage_site: 'Gerir aparência e páginas do site',
    view_audit: 'Ver o histórico de alterações',
  };

  // ---------- campos de formulário ----------
  const toLocal = (iso) => {
    if (!iso) return '';
    const d = new Date(iso), p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  function fieldHTML(f, v) {
    const id = 'f_' + f.k, req = f.req ? ' required' : '';
    const help = f.help ? `<div class="help">${esc(f.help)}</div>` : '';
    const t = f.type || 'text';
    let inp = '';
    if (t === 'bool') return `<label class="chk"><input type="checkbox" id="${id}"${v ? ' checked' : ''}> ${esc(f.label)}</label>${help}`;
    if (t === 'perms') {
      const cur = Array.isArray(v) ? v : [];
      return `<label>${esc(f.label)}</label><div class="perms" id="${id}">${Object.entries(PERMS).map(([k, x]) => `<label class="chk"><input type="checkbox" data-perm="${esc(k)}"${cur.includes(k) ? ' checked' : ''}> ${esc(x)}</label>`).join('')}</div>${help}`;
    }
    if (t === 'textarea') inp = `<textarea id="${id}" rows="${f.rows || 5}"${req}>${esc(v ?? '')}</textarea>`;
    else if (t === 'select') inp = `<select id="${id}"${req}>${(f.opts || []).map((o) => `<option value="${esc(o[0])}"${String(o[0]) === String(v ?? '') ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
    else if (t === 'date') inp = `<input type="date" id="${id}" value="${esc(v ?? '')}"${req}>`;
    else if (t === 'datetime') inp = `<input type="datetime-local" id="${id}" value="${toLocal(v)}"${req}>`;
    else if (t === 'number') inp = `<input type="number" step="any" id="${id}" value="${esc(v ?? '')}"${req}>`;
    else if (t === 'color') inp = `<input type="color" id="${id}" value="${esc(v || '#000000')}" style="height:42px;padding:3px">`;
    else {
      inp = `<input type="text" id="${id}" value="${esc(v ?? '')}"${req} placeholder="${esc(f.ph || '')}">`;
      if (f.upload) inp += `<input type="file" data-up="${id}" data-bucket="${f.upload}" style="margin-top:6px"><div class="help">Ou envie um arquivo (imagem, vídeo, PDF) acima — o link é preenchido sozinho.</div>`;
    }
    return `<label for="${id}">${esc(f.label)}${f.req ? ' *' : ''}</label>${inp}${help}`;
  }

  function readField(f, root) {
    const t = f.type || 'text', el = root.querySelector('#f_' + f.k);
    if (t === 'bool') return el.checked;
    if (t === 'perms') {
      const sel = [...el.querySelectorAll('[data-perm]:checked')].map((x) => x.dataset.perm);
      return sel.includes('*') ? ['*'] : sel;
    }
    if (t === 'number') return el.value === '' ? null : Number(el.value);
    if (t === 'datetime') return el.value ? new Date(el.value).toISOString() : null;
    const v = el.value.trim();
    return v === '' ? null : v;
  }

  function wireUploads(root) {
    root.querySelectorAll('input[type=file][data-up]').forEach((inp) => {
      inp.onchange = async () => {
        const file = inp.files[0]; if (!file) return;
        TJ.toast('Enviando arquivo…');
        const path = `${Date.now()}-${file.name.normalize('NFD').replace(/[^\w.\-]+/g, '_')}`;
        const { error } = await sb().storage.from(inp.dataset.bucket).upload(path, file);
        if (error) return TJ.toast('Falha no envio: ' + error.message, true);
        root.querySelector('#' + inp.dataset.up).value = sb().storage.from(inp.dataset.bucket).getPublicUrl(path).data.publicUrl;
        TJ.toast('Arquivo enviado.');
      };
    });
  }

  // ---------- formulário em janela ----------
  TJ.openForm = function (cfg, row, done) {
    const isNew = !row, pk = cfg.pk || 'id';
    const vals = Object.assign({}, cfg.defaults || {}, row || {});
    const dlg = document.createElement('dialog');
    dlg.innerHTML = `<form><h3>${isNew ? esc(cfg.newLabel || 'Novo registro') : 'Editar'}</h3>
      ${cfg.fields.map((f) => fieldHTML(Object.assign({}, f, !isNew && f.ro ? { ph: '' } : {}), vals[f.k])).join('')}
      <div class="row spread" style="margin-top:20px"><div>${!isNew && cfg.canDelete !== false ? '<button type="button" class="btn danger" id="del">Excluir</button>' : ''}</div>
      <div class="row"><button type="button" class="btn" id="cancel">Cancelar</button><button class="btn gold" id="save">Salvar</button></div></div></form>`;
    document.body.appendChild(dlg);
    if (!isNew) cfg.fields.forEach((f) => { if (f.ro) { const e = dlg.querySelector('#f_' + f.k); if (e) e.disabled = true; } });
    wireUploads(dlg);
    dlg.addEventListener('close', () => dlg.remove());
    $('#cancel', dlg).onclick = () => dlg.close();
    const del = $('#del', dlg);
    if (del) del.onclick = async () => {
      if (!confirm('Excluir este registro? Isso não pode ser desfeito.')) return;
      const { error } = await sb().from(cfg.table).delete().eq(pk, row[pk]);
      if (error) return TJ.toast(error.message, true);
      dlg.close(); TJ.toast('Excluído.'); done && done();
    };
    $('form', dlg).onsubmit = async (e) => {
      e.preventDefault();
      const btn = $('#save', dlg); btn.disabled = true;
      try {
        const p = {};
        cfg.fields.forEach((f) => { if (!isNew && f.ro) return; p[f.k] = readField(f, dlg); });
        if (isNew) Object.keys(cfg.defaults || {}).forEach((k) => { if (!(k in p)) p[k] = cfg.defaults[k]; });
        if (cfg.beforeSave) await cfg.beforeSave(p, row);
        const r = isNew ? await sb().from(cfg.table).insert(p) : await sb().from(cfg.table).update(p).eq(pk, row[pk]);
        if (r.error) throw r.error;
        dlg.close(); TJ.toast('Salvo!'); done && done();
      } catch (err) { TJ.toast(err.message || String(err), true); btn.disabled = false; }
    };
    dlg.showModal();
  };

  // ---------- lista + CRUD genérico ----------
  TJ.crud = async function (el, cfg) {
    for (const f of cfg.fields) if (typeof f.opts === 'function') f.opts = await f.opts();
    const canWrite = cfg.canWrite !== false;
    async function load() {
      let q = sb().from(cfg.table).select(cfg.select || '*');
      Object.entries(cfg.filter || {}).forEach(([k, v]) => (q = q.eq(k, v)));
      if (cfg.order) q = q.order(cfg.order[0], { ascending: cfg.order[1] !== false });
      const { data, error } = await q.limit(1000);
      if (error) { el.innerHTML = `<div class="card"><b>Erro:</b> ${esc(error.message)}</div>`; return; }
      draw(data || []);
    }
    function draw(rows) {
      el.innerHTML = `<div class="toolbar">${cfg.title ? `<h3 style="margin:0">${esc(cfg.title)}</h3>` : ''}
        <input id="q" placeholder="Buscar…" style="max-width:260px">${canWrite && !cfg.noCreate ? `<button class="btn gold" id="new">+ ${esc(cfg.newLabel || 'Novo')}</button>` : ''}</div>
        <div class="tablewrap"><table><thead><tr>${cfg.cols.map((c) => `<th>${esc(c.label)}</th>`).join('')}${cfg.actions ? '<th></th>' : ''}</tr></thead><tbody id="tb"></tbody></table></div>`;
      const tb = $('#tb', el);
      const paint = () => {
        const q = ($('#q', el).value || '').toLowerCase();
        const r = rows.filter((x) => !q || JSON.stringify(x).toLowerCase().includes(q));
        tb.innerHTML = r.length ? r.map((x, i) => `<tr class="${cfg.onRow || canWrite ? 'click' : ''}" data-i="${rows.indexOf(x)}">${cfg.cols.map((c) => `<td>${c.fmt ? c.fmt(x) : esc(x[c.k] ?? '')}</td>`).join('')}${cfg.actions ? `<td style="white-space:nowrap">${cfg.actions.map((a, j) => `<button class="btn sm" data-a="${j}">${esc(a.label)}</button>`).join(' ')}</td>` : ''}</tr>`).join('') : `<tr><td colspan="${cfg.cols.length + 1}" class="empty">Nada por aqui ainda.</td></tr>`;
      };
      paint(); $('#q', el).oninput = paint;
      tb.onclick = (e) => {
        const tr = e.target.closest('tr[data-i]'); if (!tr) return;
        const row = rows[+tr.dataset.i], ab = e.target.closest('button[data-a]');
        if (ab) { e.stopPropagation(); return cfg.actions[+ab.dataset.a].fn(row, load); }
        if (cfg.onRow) return cfg.onRow(row);
        if (canWrite) TJ.openForm(cfg, row, load);
      };
      const nb = $('#new', el);
      if (nb) nb.onclick = async () => {
        const d = typeof cfg.defaults === 'function' ? await cfg.defaults() : cfg.defaults || {};
        TJ.openForm(Object.assign({}, cfg, { defaults: d }), null, load);
      };
    }
    await load();
  };

  const F = {
    date: (k) => (r) => esc(TJ.fmtDate(r[k])),
    dt: (k) => (r) => esc(TJ.fmtDT(r[k])),
    yn: (k) => (r) => (r[k] ? '<span class="tag ok">Sim</span>' : '<span class="tag gray">Não</span>'),
    cut: (k, n = 80) => (r) => esc(String(r[k] ?? '').slice(0, n)) + (String(r[k] ?? '').length > n ? '…' : ''),
    map: (k, m) => (r) => esc(m[k && r[k]] ?? r[k] ?? ''),
  };
  const opts = (obj) => Object.entries(obj).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]);
  const tabsHTML = (base, items, cur) => `<div class="tabs">${items.map(([k, t]) => `<a href="#/painel/${base}/${k}" class="${cur === k ? 'on' : ''}">${t}</a>`).join('')}</div>`;
  const casesOpts = async (blank) => {
    const { data } = await sb().from('cases').select('id,number,title').order('opened_at', { ascending: false });
    return (blank ? [['', '— sem processo —']] : []).concat((data || []).map((c) => [c.id, `${c.number} · ${c.title}`.slice(0, 80)]));
  };
  const rolesOpts = async () => {
    const { data } = await sb().from('roles').select('key,label,rank').order('rank', { ascending: false });
    return (data || []).map((r) => [r.key, r.label]);
  };
  const randCode = () => 'TJ-' + [...crypto.getRandomValues(new Uint8Array(5))].map((b) => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[b % 31]).join('');
  const siteUrl = () => location.origin + location.pathname;

  // ---------- configurações de processos ----------
  const caseFields = [
    { k: 'number', label: 'Número do processo', req: true },
    { k: 'title', label: 'Título', req: true },
    { k: 'kind', label: 'Tipo', type: 'select', opts: opts(L.kind) },
    { k: 'status', label: 'Situação', type: 'select', opts: opts(L.status) },
    { k: 'stage', label: 'Fase atual', ph: 'Ex.: Instrução, Alegações finais…' },
    { k: 'summary', label: 'Resumo dos fatos', type: 'textarea', help: 'Aparece no site se o processo for público. Aceita formatação estilo Discord.' },
    { k: 'judge', label: 'Juiz(a)' }, { k: 'prosecutor', label: 'Promotoria' }, { k: 'defense', label: 'Defesa' },
    { k: 'result', label: 'Decisão / resultado', type: 'textarea', help: 'Sentença ou desfecho. Aparece no site.' },
    { k: 'opened_at', label: 'Data de abertura', type: 'date' }, { k: 'closed_at', label: 'Data de encerramento', type: 'date' },
    { k: 'is_public', label: 'Processo PÚBLICO (aparece no site)', type: 'bool', help: 'Desmarcado = só membros logados enxergam.' },
  ];
  async function nextNumber() {
    const { count } = await sb().from('cases').select('*', { count: 'exact', head: true });
    return `${new Date().getFullYear()}/${String((count || 0) + 1).padStart(3, '0')}`;
  }

  // ---------- páginas do painel ----------
  const P = {};

  P.home = async (el) => {
    const c = (t, f) => { let q = sb().from(t).select('*', { count: 'exact', head: true }); return f ? f(q) : q; };
    const [a, b, d, e, h] = await Promise.all([
      c('cases', (q) => q.in('status', ['em_andamento', 'em_julgamento'])),
      c('filings', (q) => q.eq('author_id', state.U.id).eq('status', 'rascunho')),
      TJ.can('manage_selection') ? c('applications', (q) => q.eq('status', 'recebida')) : Promise.resolve({ count: null }),
      c('cases', (q) => q.eq('is_public', false)),
      sb().from('hearings').select('*').gte('starts_at', new Date().toISOString()).order('starts_at').limit(5),
    ]);
    const stat = (n, t, link) => `<a class="card stat" href="${link}"><b>${n ?? '—'}</b><span class="muted">${t}</span></a>`;
    el.innerHTML = `<h1>Olá, ${esc(state.P.display_name || state.P.roblox_name)}</h1><p class="muted">Cargo: <b>${esc(state.P.role?.label || state.P.role_key)}</b></p>
      <div class="grid g3" style="margin:18px 0">${stat(a.count, 'processos em andamento', '#/painel/processos')}${stat(b.count, 'meus rascunhos', '#/painel/pecas')}${TJ.can('manage_selection') ? stat(d.count, 'candidaturas novas', '#/painel/selecao/candidatos') : ''}${stat(e.count, 'processos internos (não públicos)', '#/painel/processos')}</div>
      <h3>Próximas audiências</h3>${(h.data || []).length ? h.data.map((x) => `<div class="card" style="margin-bottom:8px"><b>${esc(TJ.fmtDT(x.starts_at))}</b> — ${esc(x.title)} ${x.place ? '· ' + esc(x.place) : ''}</div>`).join('') : '<p class="muted">Nada agendado.</p>'}`;
  };

  P.processos = async (el, args) => {
    if (args[0]) return P.processo(el, args);
    el.innerHTML = '<h1>Processos</h1><div id="c"></div>';
    await TJ.crud($('#c', el), {
      table: 'cases', pk: 'id', title: '', order: ['opened_at', false], fields: caseFields, newLabel: 'Novo processo',
      canWrite: TJ.can('manage_cases'), defaults: async () => ({ number: await nextNumber(), is_public: false, status: 'em_andamento', kind: 'criminal', opened_at: new Date().toISOString().slice(0, 10) }),
      cols: [{ label: 'Nº', k: 'number' }, { label: 'Título', k: 'title' }, { label: 'Situação', fmt: (r) => TJ.tag(L.status, r.status) }, { label: 'Público', fmt: F.yn('is_public') }, { label: 'Abertura', fmt: F.date('opened_at') }],
      onRow: (r) => (location.hash = '#/painel/processos/' + r.id),
    });
  };

  P.processo = async (el, [id, tab = 'dados']) => {
    const { data: c, error } = await sb().from('cases').select('*').eq('id', id).maybeSingle();
    if (error || !c) { el.innerHTML = '<div class="card">Processo não encontrado.</div>'; return; }
    const can = TJ.can('manage_cases');
    el.innerHTML = `<p><a href="#/painel/processos">← Processos</a></p><div class="row spread"><h1 style="margin:0">${esc(c.number)} · ${esc(c.title)}</h1>${TJ.tag(L.status, c.status)}</div>
      ${tabsHTML('processos/' + id, [['dados', 'Dados'], ['partes', 'Partes'], ['andamento', 'Andamento'], ['provas', 'Provas'], ['pecas', 'Peças']], tab)}<div id="tc"></div>`;
    const tc = $('#tc', el);
    const base = { canWrite: can, defaults: { case_id: id, is_public: true } };
    if (tab === 'dados') {
      tc.innerHTML = `<div class="card">${c.summary ? TJ.md(c.summary) : '<p class="muted">Sem resumo.</p>'}
        <p class="small muted">${esc(L.kind[c.kind] || c.kind)} · aberto em ${esc(TJ.fmtDate(c.opened_at))} · ${c.is_public ? '<b>PÚBLICO no site</b>' : 'interno (não aparece no site)'}</p>
        <div class="row">${can ? '<button class="btn gold" id="ed">Editar dados</button>' : ''}${c.is_public ? `<a class="btn" href="#/processo/${id}" target="_blank">Ver no site ↗</a>` : ''}</div></div>`;
      if (can) $('#ed', tc).onclick = () => TJ.openForm({ table: 'cases', fields: caseFields }, c, () => P.processo(el, [id, 'dados']));
    } else if (tab === 'partes') {
      await TJ.crud(tc, Object.assign({ table: 'case_parties', filter: { case_id: id }, order: ['name'], newLabel: 'Nova parte',
        fields: [{ k: 'name', label: 'Nome', req: true }, { k: 'side', label: 'Papel', type: 'select', opts: opts(L.side) }, { k: 'note', label: 'Observação' }, { k: 'is_public', label: 'Mostrar no site', type: 'bool' }],
        cols: [{ label: 'Nome', k: 'name' }, { label: 'Papel', fmt: F.map('side', L.side) }, { label: 'Obs.', k: 'note' }, { label: 'Público', fmt: F.yn('is_public') }] }, base));
    } else if (tab === 'andamento') {
      await TJ.crud(tc, Object.assign({ table: 'case_events', filter: { case_id: id }, order: ['happened_at', false], newLabel: 'Nova movimentação',
        fields: [{ k: 'happened_at', label: 'Data', type: 'date', req: true }, { k: 'title', label: 'Movimentação', req: true, ph: 'Ex.: Audiência de instrução realizada' }, { k: 'description', label: 'Detalhes', type: 'textarea' }, { k: 'is_public', label: 'Mostrar no site', type: 'bool' }],
        cols: [{ label: 'Data', fmt: F.date('happened_at') }, { label: 'Movimentação', k: 'title' }, { label: 'Detalhes', fmt: F.cut('description', 60) }, { label: 'Público', fmt: F.yn('is_public') }] },
        base, { defaults: { case_id: id, is_public: true, happened_at: new Date().toISOString().slice(0, 10) } }));
    } else if (tab === 'provas') {
      await TJ.crud(tc, Object.assign({ table: 'evidences', filter: { case_id: id }, order: ['created_at'], newLabel: 'Nova prova',
        fields: [{ k: 'title', label: 'Título', req: true }, { k: 'kind', label: 'Tipo', type: 'select', opts: opts(L.ev) }, { k: 'url', label: 'Link da prova', upload: 'provas', help: 'Cole um link (YouTube, Imgur, Drive…) ou envie o arquivo.' }, { k: 'description', label: 'Descrição', type: 'textarea', rows: 3 }, { k: 'is_public', label: 'Mostrar no site', type: 'bool' }],
        cols: [{ label: 'Título', k: 'title' }, { label: 'Tipo', fmt: F.map('kind', L.ev) }, { label: 'Link', fmt: (r) => (r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">abrir ↗</a>` : '') }, { label: 'Público', fmt: F.yn('is_public') }] }, base));
    } else if (tab === 'pecas') {
      await TJ.crud(tc, Object.assign(filingsCfg(id), { filter: { case_id: id } }));
    }
  };

  function filingsCfg(caseId) {
    return {
      table: 'filings', select: '*, author:profiles(roblox_name), kase:cases(number,title)', order: ['created_at', false], newLabel: 'Nova peça',
      canWrite: TJ.can('write_filings') || TJ.can('manage_cases'), defaults: { kind: 'relatorio', status: 'rascunho', case_id: caseId || null },
      fields: [
        { k: 'case_id', label: 'Processo', type: 'select', opts: () => casesOpts(true) },
        { k: 'kind', label: 'Tipo de peça', type: 'select', opts: opts(L.filing) },
        { k: 'title', label: 'Título', req: true },
        { k: 'content', label: 'Texto', type: 'textarea', rows: 14 },
        { k: 'status', label: 'Situação', type: 'select', opts: [['rascunho', 'Rascunho (posso editar)'], ['protocolado', 'Protocolado (trava a edição)']], help: 'Depois de protocolada, só a coordenação consegue alterar.' },
      ],
      cols: [{ label: 'Título', k: 'title' }, { label: 'Tipo', fmt: F.map('kind', L.filing) }, { label: 'Processo', fmt: (r) => esc(r.kase?.number || '—') }, { label: 'Autor', fmt: (r) => esc(r.author?.roblox_name || '') }, { label: 'Situação', fmt: (r) => `<span class="tag ${r.status === 'protocolado' ? 'ok' : 'gray'}">${esc(r.status)}</span>` }, { label: 'Criada', fmt: F.date('created_at') }],
      actions: [{ label: 'Copiar texto', fn: (r) => TJ.copy(`${r.title}\n\n${r.content || ''}`, 'Texto da peça copiado.') }],
    };
  }

  P.pecas = async (el) => {
    el.innerHTML = '<h1>Minhas peças</h1><p class="muted">Relatórios, alegações, rol de testemunhas e outras peças. Você só enxerga as suas' + (TJ.can('view_all_filings') ? ' (e, pelo seu cargo, as de todos)' : '') + '.</p><div id="c"></div>';
    await TJ.crud($('#c', el), filingsCfg(null));
  };

  P.agenda = async (el) => {
    el.innerHTML = '<h1>Agenda de audiências</h1><div id="c"></div>';
    await TJ.crud($('#c', el), {
      table: 'hearings', order: ['starts_at', false], newLabel: 'Nova audiência', canWrite: TJ.can('manage_agenda'),
      defaults: { kind: 'audiencia', is_public: true },
      fields: [{ k: 'title', label: 'Título', req: true }, { k: 'kind', label: 'Tipo', type: 'select', opts: opts(L.hear) }, { k: 'starts_at', label: 'Data e hora', type: 'datetime', req: true }, { k: 'place', label: 'Local' }, { k: 'case_id', label: 'Processo', type: 'select', opts: () => casesOpts(true) }, { k: 'notes', label: 'Observações', type: 'textarea', rows: 3 }, { k: 'is_public', label: 'Mostrar no site', type: 'bool' }],
      cols: [{ label: 'Quando', fmt: F.dt('starts_at') }, { label: 'Título', k: 'title' }, { label: 'Tipo', fmt: F.map('kind', L.hear) }, { label: 'Local', k: 'place' }, { label: 'Público', fmt: F.yn('is_public') }],
    });
  };

  // comunicados + Discord
  async function sendWebhook(text) {
    const { data } = await sb().from('settings').select('value').eq('key', 'discord_webhook').maybeSingle();
    const url = data?.value?.url;
    if (!url) return TJ.toast('Cadastre o webhook em Site > Discord antes.', true);
    const chunks = []; let rest = text;
    while (rest.length > 1900) { let i = rest.lastIndexOf('\n', 1900); if (i < 500) i = 1900; chunks.push(rest.slice(0, i)); rest = rest.slice(i); }
    chunks.push(rest);
    for (const c of chunks) {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: c }) });
      if (!r.ok) return TJ.toast('O Discord recusou o envio (confira o webhook).', true);
    }
    TJ.toast('Enviado ao Discord!');
  }
  const discordText = (r) => `# ${r.title}\n${r.body || ''}`;

  P.comunicados = async (el) => {
    el.innerHTML = '<h1>Comunicados</h1><p class="muted">Escreva uma vez: publica no site, copia em markdown para o Discord ou envia direto pelo webhook.</p><div id="c"></div>';
    await TJ.crud($('#c', el), {
      table: 'announcements', order: ['created_at', false], newLabel: 'Novo comunicado', canWrite: TJ.can('manage_announcements'),
      defaults: { category: 'comunicado', published: true, pinned: false },
      fields: [{ k: 'title', label: 'Título', req: true }, { k: 'category', label: 'Categoria', type: 'select', opts: opts(L.cat) }, { k: 'body', label: 'Texto', type: 'textarea', rows: 12, help: 'Formatação: # título, **negrito**, *itálico*, __sublinhado__, -# texto pequeno, > citação, ||spoiler||. Para o Discord sem Nitro, mantenha em até 2000 caracteres.' }, { k: 'pinned', label: 'Fixar no topo', type: 'bool' }, { k: 'published', label: 'Publicado no site', type: 'bool' }],
      cols: [{ label: 'Data', fmt: F.date('created_at') }, { label: 'Título', k: 'title' }, { label: 'Categoria', fmt: F.map('category', L.cat) }, { label: 'Caracteres', fmt: (r) => { const n = discordText(r).length; return `<span class="tag ${n > 2000 ? 'bad' : 'ok'}">${n}</span>`; } }, { label: 'Publicado', fmt: F.yn('published') }],
      actions: [
        { label: 'Copiar p/ Discord', fn: (r) => { const t = discordText(r); TJ.copy(t, t.length > 2000 ? `Copiado, mas tem ${t.length} caracteres (limite sem Nitro: 2000).` : 'Copiado em markdown!'); } },
        { label: 'Enviar ao Discord', fn: (r) => sendWebhook(discordText(r)) },
      ],
    });
  };

  // seleção
  P.selecao = async (el, [tab = 'vagas']) => {
    el.innerHTML = `<h1>Processo seletivo</h1>${tabsHTML('selecao', [['vagas', 'Vagas'], ['candidatos', 'Candidatos'], ['perguntas', 'Banco de perguntas']], tab)}<div id="tc"></div>`;
    const tc = $('#tc', el), can = TJ.can('manage_selection');
    if (tab === 'vagas') {
      await TJ.crud(tc, { table: 'selection_rounds', order: ['created_at', false], newLabel: 'Nova vaga', canWrite: can, defaults: { status: 'aberto', is_public: true },
        fields: [{ k: 'title', label: 'Título', req: true, ph: 'Ex.: Seleção de Advogados — Outubro' }, { k: 'role_key', label: 'Cargo', type: 'select', opts: async () => [['', '—']].concat(await rolesOpts()) }, { k: 'status', label: 'Situação', type: 'select', opts: opts(L.round) }, { k: 'closes_at', label: 'Inscrições até', type: 'datetime' }, { k: 'description', label: 'Descrição', type: 'textarea' }, { k: 'requirements', label: 'Requisitos', type: 'textarea', rows: 4 }, { k: 'is_public', label: 'Mostrar no site', type: 'bool' }],
        cols: [{ label: 'Título', k: 'title' }, { label: 'Situação', fmt: (r) => TJ.tag(L.round, r.status) }, { label: 'Até', fmt: F.dt('closes_at') }, { label: 'Público', fmt: F.yn('is_public') }] });
    } else if (tab === 'candidatos') {
      const { data: rounds } = await sb().from('selection_rounds').select('id,title').order('created_at', { ascending: false });
      if (!(rounds || []).length) { tc.innerHTML = '<div class="empty">Crie uma vaga primeiro.</div>'; return; }
      tc.innerHTML = `<div class="toolbar"><select id="rd">${rounds.map((r) => `<option value="${r.id}">${esc(r.title)}</option>`).join('')}</select>
        <button class="btn" id="draw">🎲 Sortear ordem das entrevistas</button><button class="btn" id="exp">Copiar ordem p/ Discord</button></div><div id="lst"></div>`;
      const show = () => TJ.crud($('#lst', tc), { table: 'applications', filter: { round_id: $('#rd', tc).value }, order: ['interview_order'], canWrite: can, noCreate: true,
        fields: [{ k: 'roblox_name', label: 'Roblox', ro: true }, { k: 'discord_user', label: 'Discord' }, { k: 'experience', label: 'Experiência', type: 'textarea', rows: 3 }, { k: 'motivation', label: 'Motivação', type: 'textarea', rows: 3 }, { k: 'status', label: 'Situação', type: 'select', opts: opts(L.app) }, { k: 'interview_order', label: 'Ordem da entrevista', type: 'number' }, { k: 'score', label: 'Nota', type: 'number' }, { k: 'notes', label: 'Anotações internas', type: 'textarea', rows: 3 }],
        cols: [{ label: 'Ordem', k: 'interview_order' }, { label: 'Roblox', k: 'roblox_name' }, { label: 'Discord', k: 'discord_user' }, { label: 'Situação', fmt: F.map('status', L.app) }, { label: 'Nota', k: 'score' }] });
      $('#rd', tc).onchange = show; await show();
      $('#draw', tc).onclick = async () => {
        const rid = $('#rd', tc).value;
        const { data } = await sb().from('applications').select('id').eq('round_id', rid).eq('status', 'aprovada_para_entrevista');
        if (!(data || []).length) return TJ.toast('Nenhum candidato com situação "Aprovado p/ entrevista".', true);
        const ids = data.map((x) => x.id), rnd = crypto.getRandomValues(new Uint32Array(ids.length));
        for (let i = ids.length - 1; i > 0; i--) { const j = rnd[i] % (i + 1); [ids[i], ids[j]] = [ids[j], ids[i]]; }
        for (let i = 0; i < ids.length; i++) { const r = await sb().from('applications').update({ interview_order: i + 1 }).eq('id', ids[i]); if (r.error) return TJ.toast(r.error.message, true); }
        TJ.toast('Ordem sorteada!'); show();
      };
      $('#exp', tc).onclick = async () => {
        const rid = $('#rd', tc).value, t = rounds.find((r) => r.id === rid)?.title;
        const { data } = await sb().from('applications').select('roblox_name,interview_order').eq('round_id', rid).not('interview_order', 'is', null).order('interview_order');
        if (!(data || []).length) return TJ.toast('Sorteie a ordem primeiro.', true);
        TJ.copy(`# Ordem das entrevistas\n-# ${t}\n` + data.map((x) => `> **${x.interview_order}º** — ${x.roblox_name}`).join('\n'), 'Ordem copiada em markdown!');
      };
    } else if (tab === 'perguntas') {
      const lv = [['inexistente', 'Inexistente'], ['basico', 'Básico'], ['intermediario', 'Intermediário'], ['avancado', 'Avançado']];
      const ty = [['termo', 'Termo jurídico'], ['codigo', 'O que diz o código'], ['situacao', 'Situação']];
      tc.innerHTML = `<div class="card" style="margin-bottom:14px"><div class="toolbar" style="margin:0"><b>Sortear pergunta:</b>
        <select id="sl"><option value="">Qualquer nível</option>${lv.map((x) => `<option value="${x[0]}">${x[1]}</option>`).join('')}</select>
        <select id="st"><option value="">Qualquer tipo</option>${ty.map((x) => `<option value="${x[0]}">${x[1]}</option>`).join('')}</select>
        <button class="btn blue" id="go">Sortear</button></div><div id="out" class="muted small" style="margin-top:8px"></div></div><div id="lst"></div>`;
      $('#go', tc).onclick = async () => {
        let q = sb().from('questions').select('*'); if ($('#sl', tc).value) q = q.eq('level', $('#sl', tc).value); if ($('#st', tc).value) q = q.eq('type', $('#st', tc).value);
        const { data } = await q; if (!(data || []).length) return ($('#out', tc).textContent = 'Nenhuma pergunta com esse filtro.');
        const x = data[crypto.getRandomValues(new Uint32Array(1))[0] % data.length];
        $('#out', tc).innerHTML = `<p style="font-size:18px;color:var(--text)"><b>${esc(x.question)}</b></p><details><summary>Mostrar resposta</summary><p>${esc(x.answer || 'Sem resposta cadastrada.')}</p></details>`;
      };
      await TJ.crud($('#lst', tc), { table: 'questions', order: ['level'], newLabel: 'Nova pergunta', canWrite: can, defaults: { level: 'basico', type: 'termo', version: 1 },
        fields: [{ k: 'level', label: 'Nível', type: 'select', opts: lv }, { k: 'type', label: 'Tipo', type: 'select', opts: ty }, { k: 'question', label: 'Pergunta (curta, falada)', type: 'textarea', rows: 3, req: true }, { k: 'answer', label: 'Resposta esperada', type: 'textarea', rows: 4 }, { k: 'source', label: 'Fonte', ph: 'Ex.: Código Penal, Art. 121' }, { k: 'version', label: 'Versão do banco', type: 'number' }],
        cols: [{ label: 'Nível', fmt: (r) => esc((lv.find((x) => x[0] === r.level) || [])[1] || r.level) }, { label: 'Tipo', fmt: (r) => esc((ty.find((x) => x[0] === r.type) || [])[1] || r.type) }, { label: 'Pergunta', fmt: F.cut('question', 90) }, { label: 'v', k: 'version' }] });
    }
  };

  // usuários
  P.usuarios = async (el, [tab = 'membros']) => {
    el.innerHTML = `<h1>Usuários</h1>${tabsHTML('usuarios', [['membros', 'Membros'], ['convites', 'Convites'], ['cargos', 'Cargos e permissões']], tab)}<div id="tc"></div>`;
    const tc = $('#tc', el), can = TJ.can('manage_users');
    if (tab === 'membros') {
      await TJ.crud(tc, { table: 'profiles', select: '*, role:roles(label,rank)', order: ['created_at'], noCreate: true, canWrite: can, canDelete: false,
        fields: [{ k: 'roblox_name', label: 'Nome no Roblox', ro: true }, { k: 'display_name', label: 'Nome de exibição' }, { k: 'role_key', label: 'Cargo', type: 'select', opts: rolesOpts }, { k: 'bio', label: 'Apresentação (aparece na Equipe)', type: 'textarea', rows: 3 }, { k: 'active', label: 'Conta ativa (desmarque para bloquear o acesso)', type: 'bool' }, { k: 'show_public', label: 'Mostrar na página Equipe', type: 'bool' }],
        cols: [{ label: 'Roblox', k: 'roblox_name' }, { label: 'Nome', k: 'display_name' }, { label: 'Cargo', fmt: (r) => esc(r.role?.label || r.role_key) }, { label: 'Ativo', fmt: F.yn('active') }] });
      tc.insertAdjacentHTML('beforeend', '<p class="muted small">Para adicionar alguém novo, gere um convite na aba <b>Convites</b>.</p>');
    } else if (tab === 'convites') {
      await TJ.crud(tc, { table: 'invites', pk: 'code', order: ['created_at', false], newLabel: 'Gerar convite', canWrite: can,
        defaults: () => ({ code: randCode(), role_key: 'advogado', expires_at: new Date(Date.now() + 7 * 864e5).toISOString() }),
        fields: [{ k: 'roblox_name', label: 'Nome no Roblox da pessoa', req: true }, { k: 'role_key', label: 'Cargo', type: 'select', opts: rolesOpts }, { k: 'code', label: 'Código do convite', req: true, ro: true }, { k: 'expires_at', label: 'Validade', type: 'datetime' }],
        cols: [{ label: 'Roblox', k: 'roblox_name' }, { label: 'Cargo', k: 'role_key' }, { label: 'Código', k: 'code' }, { label: 'Situação', fmt: (r) => (r.used_at ? '<span class="tag ok">Usado</span>' : new Date(r.expires_at) < new Date() ? '<span class="tag bad">Expirado</span>' : '<span class="tag warn">Pendente</span>') }],
        actions: [{ label: 'Copiar mensagem', fn: (r) => TJ.copy(`Convite para o ${state.site.name}\nAcesse: ${siteUrl()}#/ativar\nNome no Roblox: ${r.roblox_name}\nCódigo: ${r.code}\nO convite vale até ${TJ.fmtDate(r.expires_at)}.`, 'Mensagem de convite copiada.') }] });
    } else {
      await TJ.crud(tc, { table: 'roles', pk: 'key', order: ['rank', false], newLabel: 'Novo cargo', canWrite: can, defaults: { rank: 10, perms: ['view_internal'] },
        fields: [{ k: 'key', label: 'Código interno (sem espaços, minúsculas)', req: true, ro: true, ph: 'ex.: defensor' }, { k: 'label', label: 'Nome do cargo', req: true }, { k: 'rank', label: 'Hierarquia (maior = mais alto)', type: 'number' }, { k: 'perms', label: 'O que este cargo pode fazer', type: 'perms' }],
        cols: [{ label: 'Cargo', k: 'label' }, { label: 'Hierarquia', k: 'rank' }, { label: 'Permissões', fmt: (r) => esc((r.perms || []).map((p) => (p === '*' ? 'TOTAL' : PERMS[p] || p)).join(', ')) }],
        beforeSave: (p, row) => { if (!row && !/^[a-z0-9_]+$/.test(p.key || '')) throw new Error('Código interno: use só letras minúsculas, números e _.'); } });
    }
  };

  // site
  P.site = async (el, [tab = 'aparencia']) => {
    el.innerHTML = `<h1>Site</h1>${tabsHTML('site', [['aparencia', 'Aparência e textos'], ['paginas', 'Páginas'], ['discord', 'Discord']], tab)}<div id="tc"></div>`;
    const tc = $('#tc', el), can = TJ.can('manage_site');
    if (tab === 'aparencia') {
      const fields = [
        { k: 'name', label: 'Nome completo do tribunal', req: true }, { k: 'short', label: 'Nome curto (topo)' }, { k: 'subtitle', label: 'Subtítulo do topo' },
        { k: 'hero_title', label: 'Título da página inicial' }, { k: 'hero_text', label: 'Texto da página inicial', type: 'textarea', rows: 3 },
        { k: 'logo_url', label: 'Brasão / logo', upload: 'site' }, { k: 'discord_url', label: 'Link do convite do Discord' },
        { k: 'primary', label: 'Cor principal', type: 'color' }, { k: 'accent', label: 'Cor de destaque (dourado)', type: 'color' },
        { k: 'footer', label: 'Texto do rodapé', type: 'textarea', rows: 2 }, { k: 'show_stats', label: 'Mostrar contadores na página inicial', type: 'bool' },
      ];
      tc.innerHTML = `<form class="card" id="sf" style="max-width:640px">${fields.map((f) => fieldHTML(f, state.site[f.k])).join('')}<p><button class="btn gold"${can ? '' : ' disabled'}>Salvar alterações</button></p></form>`;
      wireUploads(tc);
      $('#sf', tc).onsubmit = async (e) => {
        e.preventDefault();
        const v = Object.assign({}, state.site); fields.forEach((f) => (v[f.k] = readField(f, tc)));
        const r = await sb().from('settings').upsert({ key: 'site', value: v, is_public: true });
        if (r.error) return TJ.toast(r.error.message, true);
        await TJ.loadSettings(); TJ.toast('Aparência salva! Recarregue a página para ver tudo.');
      };
    } else if (tab === 'paginas') {
      await TJ.crud(tc, { table: 'pages', pk: 'slug', order: ['sort'], newLabel: 'Nova página', canWrite: can, defaults: { sort: 100, is_public: true, in_menu: true },
        fields: [{ k: 'slug', label: 'Endereço (sem espaços)', req: true, ro: true, ph: 'ex.: regimento' }, { k: 'title', label: 'Título', req: true }, { k: 'body', label: 'Conteúdo', type: 'textarea', rows: 16, help: 'Mesma formatação dos comunicados.' }, { k: 'sort', label: 'Ordem no menu', type: 'number' }, { k: 'in_menu', label: 'Aparece no menu', type: 'bool' }, { k: 'is_public', label: 'Pública', type: 'bool' }],
        cols: [{ label: 'Título', k: 'title' }, { label: 'Endereço', fmt: (r) => esc('#/p/' + r.slug) }, { label: 'Menu', fmt: F.yn('in_menu') }, { label: 'Pública', fmt: F.yn('is_public') }],
        beforeSave: (p, row) => { if (!row && !/^[a-z0-9\-_]+$/.test(p.slug || '')) throw new Error('Endereço: só letras minúsculas, números, - e _.'); } });
    } else {
      const { data } = await sb().from('settings').select('value').eq('key', 'discord_webhook').maybeSingle();
      tc.innerHTML = `<form class="card" id="wf" style="max-width:640px"><h3>Envio automático ao Discord</h3><p class="muted small">No Discord: Configurações do canal → Integrações → Webhooks → Novo webhook → Copiar URL. Cole abaixo. Quem tem a permissão de comunicados poderá enviar avisos ao canal por este site.</p>
        <label>URL do webhook</label><input id="u" value="${esc(data?.value?.url || '')}" placeholder="https://discord.com/api/webhooks/…"><p><button class="btn gold"${can ? '' : ' disabled'}>Salvar</button></p></form>`;
      $('#wf', tc).onsubmit = async (e) => {
        e.preventDefault(); const url = $('#u', tc).value.trim();
        if (url && !/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//.test(url)) return TJ.toast('Isso não parece um webhook do Discord.', true);
        const r = await sb().from('settings').upsert({ key: 'discord_webhook', value: { url }, is_public: false });
        TJ.toast(r.error ? r.error.message : 'Webhook salvo.', !!r.error);
      };
    }
  };

  P.auditoria = async (el) => {
    el.innerHTML = '<h1>Histórico de alterações</h1><div id="c"></div>';
    const { data: pf } = await sb().from('profiles').select('id,roblox_name');
    const map = Object.fromEntries((pf || []).map((x) => [x.id, x.roblox_name]));
    const A = { INSERT: 'Criou', UPDATE: 'Alterou', DELETE: 'Excluiu' };
    await TJ.crud($('#c', el), { table: 'audit_log', order: ['at', false], noCreate: true, canWrite: false,
      fields: [], cols: [{ label: 'Quando', fmt: F.dt('at') }, { label: 'Quem', fmt: (r) => esc(map[r.user_id] || 'sistema') }, { label: 'Ação', fmt: (r) => esc(A[r.action] || r.action) }, { label: 'Tabela', k: 'table_name' }, { label: 'Registro', fmt: F.cut('row_id', 14) }],
      onRow: (r) => alert(JSON.stringify(r.data, null, 2).slice(0, 3000)) });
  };

  P.conta = async (el) => {
    el.innerHTML = `<h1>Minha conta</h1><div class="card" style="max-width:480px"><p><b>${esc(state.P.roblox_name)}</b> — ${esc(state.P.role?.label || '')}</p>
      <form id="pf"><label>Nova senha (mínimo 8 caracteres)</label><input id="p1" type="password" minlength="8" autocomplete="new-password" required>
      <label>Repita a nova senha</label><input id="p2" type="password" minlength="8" autocomplete="new-password" required><p><button class="btn gold">Trocar senha</button></p></form></div>`;
    $('#pf', el).onsubmit = async (e) => {
      e.preventDefault();
      if ($('#p1', el).value !== $('#p2', el).value) return TJ.toast('As senhas não conferem.', true);
      const { error } = await sb().auth.updateUser({ password: $('#p1', el).value });
      TJ.toast(error ? error.message : 'Senha alterada!', !!error);
      if (!error) e.target.reset();
    };
  };

  // ---------- moldura do painel ----------
  TJ.mountPanel = async function (view, parts) {
    const page = parts[0] || 'home';
    const c = TJ.can;
    const menu = [
      ['', 'Início', true], ['processos', 'Processos', c('view_internal')], ['pecas', 'Minhas peças', c('write_filings') || c('view_all_filings')],
      ['agenda', 'Agenda', c('view_internal')], ['comunicados', 'Comunicados', c('manage_announcements')], ['selecao', 'Seleção', c('manage_selection')],
      ['_', 'Administração', c('manage_users') || c('manage_site') || c('view_audit')], ['usuarios', 'Usuários e cargos', c('manage_users')], ['site', 'Site e páginas', c('manage_site')],
      ['auditoria', 'Histórico', c('view_audit')], ['conta', 'Minha conta', true],
    ].filter((m) => m[2]);
    view.innerHTML = `<div class="panel"><aside class="side">${menu.map(([k, t]) => (k === '_' ? `<h5>${t}</h5>` : `<a href="#/painel${k ? '/' + k : ''}" class="${(page === 'home' && !k) || page === k ? 'on' : ''}">${t}</a>`)).join('')}</aside><section class="content" id="pc"></section></div>`;
    const el = $('#pc', view), fn = page === 'home' ? P.home : P[page];
    const allowed = menu.some((m) => m[0] === (page === 'home' ? '' : page));
    if (!fn || !allowed) { el.innerHTML = '<div class="card">Você não tem acesso a esta área.</div>'; return; }
    try { await fn(el, parts.slice(1)); } catch (e) { console.error(e); el.innerHTML = `<div class="card"><b>Erro:</b> ${esc(e.message || e)}</div>`; }
  };
})();
