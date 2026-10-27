/* Painel do Tribunal - núcleo (v2): formulários, tabelas configuráveis, processos, peças, agenda, mural */
(function () {
  const TJ = window.TJ, esc = TJ.esc, $ = TJ.$, L = TJ.L, state = TJ.state;
  const sb = () => TJ.sb;
  const P = (TJ.P = {});

  const PERMS = {
    '*': 'ACESSO TOTAL (tudo)',
    view_internal: 'Ver a área interna',
    write_filings: 'Protocolar peças (relatórios, alegações…)',
    view_all_filings: 'Ver as peças de todos',
    manage_cases: 'Gerir processos, partes, andamentos, provas e modelos',
    manage_announcements: 'Gerir comunicados e mural interno',
    manage_agenda: 'Gerir agenda de audiências',
    manage_selection: 'Gerir processo seletivo, entrevistas e perguntas',
    manage_users: 'Gerir membros, convites e cargos',
    manage_site: 'Gerir aparência e páginas do site',
    view_audit: 'Ver o histórico de alterações',
  };

  const IC = {
    home: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
    briefcase: 'M3 7h18v13H3z M8 7V4h8v3',
    file: 'M6 2h9l5 5v15H6z M14 2v6h6 M9 13h8 M9 17h8',
    copy: 'M8 8h12v13H8z M4 16V3h12',
    calendar: 'M3 5h18v16H3z M3 10h18 M8 2v6 M16 2v6',
    pin: 'M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z M16 8a5 5 0 0 1 0 8',
    clip: 'M9 2h6v4H9z M7 4H5v18h14V4h-2 M9 13l2 2 4-4',
    bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10 21a2 2 0 0 0 4 0',
    check: 'M4 12l5 5L20 6',
    users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.9 M16 3.1a4 4 0 0 1 0 7.8',
    sliders: 'M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6',
    clock: 'M3 12a9 9 0 1 0 3-6.7 M3 4v5h5 M12 7v5l3 2',
    user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
    send: 'M22 2L11 13 M22 2l-7 20-4-9-9-4z',
    tasks: 'M9 6h12 M9 12h12 M9 18h12 M3 6l1 1 2-2 M3 12l1 1 2-2 M3 18l1 1 2-2',
    search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16 M21 21l-4.3-4.3',
    menu: 'M4 6h16 M4 12h16 M4 18h16',
    out: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  };
  const icon = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${IC[n] || IC.file}"/></svg>`;

  // ---------- auxiliares ----------
  const toLocal = (iso) => {
    if (!iso) return '';
    const d = new Date(iso), p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const plain = (h) => String(h ?? '').replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim();
  const opts = (obj) => Object.entries(obj).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]);
  const H = (TJ.H = {
    PERMS, icon, plain, opts, toLocal,
    F: {
      date: (k) => (r) => esc(TJ.fmtDate(r[k])),
      dt: (k) => (r) => esc(TJ.fmtDT(r[k])),
      yn: (k) => (r) => (r[k] ? '<span class="tag ok">Sim</span>' : '<span class="tag gray">Não</span>'),
      cut: (k, n = 80) => (r) => esc(String(r[k] ?? '').slice(0, n)) + (String(r[k] ?? '').length > n ? '…' : ''),
      map: (k, m) => (r) => esc(m[r[k]] ?? r[k] ?? ''),
    },
    tabs: (base, items, cur) => `<div class="tabs">${items.map(([k, t]) => `<a href="#/painel/${base}/${k}" class="${cur === k ? 'on' : ''}">${t}</a>`).join('')}</div>`,
    casesOpts: async (blank) => {
      const { data } = await sb().from('cases').select('id,number,title').order('opened_at', { ascending: false });
      return (blank ? [['', '— sem processo —']] : []).concat((data || []).map((c) => [c.id, `${c.number} · ${c.title}`.slice(0, 80)]));
    },
    rolesOpts: async () => {
      const { data } = await sb().from('roles').select('key,label,rank').order('rank', { ascending: false });
      return (data || []).map((r) => [r.key, r.label]);
    },
    siteUrl: () => location.origin + location.pathname,
    head: (title, sub, right) => `<div class="phead"><div><h1>${esc(title)}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</div>${right || ''}</div>`,
    myRank: () => state.P?.role?.rank ?? 0,
    isAll: () => (state.P?.role?.perms || []).includes('*'),
  });
  const F = H.F;

  // janela genérica
  TJ.dlg = function (html, mount) {
    const dlg = document.createElement('dialog');
    dlg.innerHTML = `<div class="dform">${html}</div>`;
    document.body.appendChild(dlg);
    dlg.addEventListener('close', () => dlg.remove());
    dlg.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => dlg.close()));
    dlg.showModal();
    if (mount) mount(dlg);
    return dlg;
  };

  // ---------- campos de formulário ----------
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
    if (t === 'formbuilder') {
      return `<label>${esc(f.label)}</label><div class="fb" id="${id}" data-init="${esc(JSON.stringify(Array.isArray(v) ? v : []))}"><div class="fb-list"></div><button type="button" class="btn sm" data-fb="add">+ Adicionar pergunta</button></div>${help}`;
    }
    if (t === 'rubric') {
      const txt = (Array.isArray(v) ? v : []).map((x) => `${x.name} | ${x.weight}`).join('\n');
      return `<label>${esc(f.label)}</label><textarea id="${id}" rows="4" placeholder="Postura | 2&#10;Conhecimento | 3&#10;Oratória | 1">${esc(txt)}</textarea>${help}`;
    }
    if (t === 'textarea') inp = `<textarea id="${id}" rows="${f.rows || 5}"${req}>${esc(v ?? '')}</textarea>`;
    else if (t === 'select') inp = `<select id="${id}"${req}>${(f.opts || []).map((o) => `<option value="${esc(o[0])}"${String(o[0]) === String(v ?? '') ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
    else if (t === 'date') inp = `<input type="date" id="${id}" value="${esc(v ?? '')}"${req}>`;
    else if (t === 'datetime') inp = `<input type="datetime-local" id="${id}" value="${toLocal(v)}"${req}>`;
    else if (t === 'number') inp = `<input type="number" step="any" id="${id}" value="${esc(v ?? '')}"${req}>`;
    else if (t === 'color') inp = `<input type="color" id="${id}" value="${esc(v || '#000000')}" style="height:44px;padding:3px">`;
    else {
      inp = `<input type="text" id="${id}" value="${esc(v ?? '')}"${req} placeholder="${esc(f.ph || '')}">`;
      if (f.upload) inp += `<input type="file" data-up="${id}" data-bucket="${f.upload}" style="margin-top:6px"><div class="help">Ou envie um arquivo (imagem, vídeo, PDF) acima — o link é preenchido sozinho.</div>`;
    }
    return `<label for="${id}">${esc(f.label)}${f.req ? ' *' : ''}</label>${inp}${help}`;
  }
  TJ.fieldHTML = fieldHTML;

  function readField(f, root) {
    const t = f.type || 'text', el = root.querySelector('#f_' + f.k);
    if (!el) return null;
    if (t === 'bool') return el.checked;
    if (t === 'perms') {
      const sel = [...el.querySelectorAll('[data-perm]:checked')].map((x) => x.dataset.perm);
      return sel.includes('*') ? ['*'] : sel;
    }
    if (t === 'formbuilder') {
      return [...el.querySelectorAll('.fb-row')].map((r) => ({
        id: r.dataset.id,
        label: r.querySelector('.fb-label').value.trim(),
        type: r.querySelector('.fb-type').value,
        required: r.querySelector('.fb-req').checked,
        options: r.querySelector('.fb-opts').value.split(',').map((x) => x.trim()).filter(Boolean),
      })).filter((x) => x.label);
    }
    if (t === 'rubric') return el.value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [n, w] = l.split('|').map((x) => x.trim()); return { name: n, weight: Number(String(w || '1').replace(',', '.')) || 1 }; });
    if (t === 'number') return el.value === '' ? null : Number(el.value);
    if (t === 'datetime') return el.value ? new Date(el.value).toISOString() : null;
    const v = el.value.trim();
    return v === '' ? null : v;
  }
  TJ.readField = readField;

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
  TJ.wireUploads = wireUploads;

  // construtor de formulário (perguntas da vaga)
  const uid = () => 'q' + Math.random().toString(36).slice(2, 8);
  function wireBuilders(root) {
    root.querySelectorAll('.fb').forEach((fb) => {
      let items = [];
      try { items = JSON.parse(fb.dataset.init || '[]'); } catch (e) {}
      const list = fb.querySelector('.fb-list');
      const rowHTML = (it) => `<div class="fb-row" data-id="${esc(it.id || uid())}">
        <div class="row"><input class="fb-label" placeholder="Pergunta" value="${esc(it.label || '')}">
        <select class="fb-type">${[['text', 'Resposta curta'], ['textarea', 'Resposta longa'], ['select', 'Lista de opções'], ['checkbox', 'Sim / Não']].map((o) => `<option value="${o[0]}"${it.type === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select>
        <label class="chk"><input type="checkbox" class="fb-req"${it.required ? ' checked' : ''}> obrigatória</label>
        <button type="button" class="btn sm" data-fb="up" title="Subir">↑</button><button type="button" class="btn sm" data-fb="down" title="Descer">↓</button><button type="button" class="btn sm danger" data-fb="del" title="Remover">✕</button></div>
        <input class="fb-opts" placeholder="Opções separadas por vírgula (só para lista)" value="${esc((it.options || []).join(', '))}" style="margin-top:8px;${it.type === 'select' ? '' : 'display:none'}"></div>`;
      list.innerHTML = items.map(rowHTML).join('');
      fb.onclick = (e) => {
        const b = e.target.closest('[data-fb]'); if (!b) return;
        const row = b.closest('.fb-row');
        if (b.dataset.fb === 'add') list.insertAdjacentHTML('beforeend', rowHTML({ type: 'text' }));
        else if (b.dataset.fb === 'del') row.remove();
        else if (b.dataset.fb === 'up' && row.previousElementSibling) list.insertBefore(row, row.previousElementSibling);
        else if (b.dataset.fb === 'down' && row.nextElementSibling) list.insertBefore(row.nextElementSibling, row);
      };
      fb.onchange = (e) => { if (e.target.classList.contains('fb-type')) e.target.closest('.fb-row').querySelector('.fb-opts').style.display = e.target.value === 'select' ? '' : 'none'; };
    });
  }

  // ---------- formulário em janela ----------
  TJ.openForm = function (cfg, row, done) {
    const isNew = !row, pk = cfg.pk || 'id';
    const vals = Object.assign({}, cfg.defaults || {}, row || {});
    const dlg = document.createElement('dialog');
    dlg.innerHTML = `<form class="dform"><h3>${isNew ? esc(cfg.newLabel || 'Novo registro') : esc(cfg.editLabel || 'Editar')}</h3>
      ${cfg.header && row ? cfg.header(row) : ''}
      ${cfg.fields.map((f) => fieldHTML(f, vals[f.k])).join('')}
      <div class="row spread" style="margin-top:22px"><div>${!isNew && cfg.canDelete !== false ? '<button type="button" class="btn danger" id="del">Excluir</button>' : ''}</div>
      <div class="row"><button type="button" class="btn" id="cancel">Cancelar</button><button class="btn gold" id="save">Salvar</button></div></div></form>`;
    document.body.appendChild(dlg);
    if (!isNew) cfg.fields.forEach((f) => { if (f.ro) { const e = dlg.querySelector('#f_' + f.k); if (e) e.disabled = true; } });
    wireUploads(dlg); wireBuilders(dlg);
    cfg.fields.forEach((f) => { if (f.onchange) { const e = dlg.querySelector('#f_' + f.k); if (e) e.onchange = () => f.onchange(e.value, dlg); } });
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
        cfg.fields.forEach((f) => { if (f.nosave || (!isNew && f.ro)) return; p[f.k] = readField(f, dlg); });
        if (isNew) Object.keys(cfg.defaults || {}).forEach((k) => { if (!(k in p) && !(cfg.fields.find((f) => f.k === k && f.nosave))) p[k] = cfg.defaults[k]; });
        if (cfg.beforeSave) await cfg.beforeSave(p, row);
        const r = isNew ? await sb().from(cfg.table).insert(p) : await sb().from(cfg.table).update(p).eq(pk, row[pk]);
        if (r.error) throw r.error;
        dlg.close(); TJ.toast('Salvo!');
        if (cfg.afterSave) { try { await cfg.afterSave(p, row, isNew); } catch (e) { console.error(e); } }
        done && done();
      } catch (err) { TJ.toast(err.message || String(err), true); btn.disabled = false; }
    };
    dlg.showModal();
    return dlg;
  };

  // ---------- tabela configurável (engrenagem, ordenação, CSV, páginas) ----------
  TJ.crud = async function (el, cfg) {
    for (const f of cfg.fields || []) if (typeof f.opts === 'function') f.opts = await f.opts();
    const canWrite = cfg.canWrite !== false;
    const colKey = 'tj-cols-' + (cfg.id || cfg.table);
    let hidden = TJ.store.get(colKey, []);
    let sort = { i: -1, dir: 1 }, page = 0, size = TJ.store.get('tj-size', 25), q = '', fv = {}, rows = [];
    const cell = (c, r) => (c.k ? (r[c.k] ?? '') : plain(c.fmt ? c.fmt(r) : ''));

    async function load() {
      let qq = sb().from(cfg.table).select(cfg.select || '*');
      Object.entries(cfg.filter || {}).forEach(([k, v]) => (qq = qq.eq(k, v)));
      if (cfg.order) qq = qq.order(cfg.order[0], { ascending: cfg.order[1] !== false });
      const { data, error } = await qq.limit(2000);
      if (error) { el.innerHTML = `<div class="card"><b>Erro:</b> ${esc(error.message)}</div>`; return; }
      rows = data || []; render();
    }

    function visibleCols() { return cfg.cols.map((c, i) => [c, i]).filter(([c]) => !hidden.includes(c.label)); }

    function filtered() {
      let r = rows.filter((x) => (!q || JSON.stringify(x).toLowerCase().includes(q)) &&
        (cfg.filters || []).every((f) => !fv[f.k] || String(x[f.k]) === fv[f.k]));
      if (sort.i >= 0) {
        const c = cfg.cols[sort.i];
        r = r.slice().sort((a, b) => {
          const A = cell(c, a), B = cell(c, b);
          const na = parseFloat(A), nb = parseFloat(B);
          const cmp = !isNaN(na) && !isNaN(nb) && String(na) === String(A).trim() ? na - nb : String(A).localeCompare(String(B), 'pt-BR', { numeric: true });
          return cmp * sort.dir;
        });
      }
      return r;
    }

    function render() {
      const vc = visibleCols();
      el.innerHTML = `<div class="toolbar">${cfg.title ? `<h3 style="margin:0">${esc(cfg.title)}</h3>` : ''}
        <input id="q" class="q" type="search" placeholder="Buscar…" value="${esc(q)}">
        ${(cfg.filters || []).map((f) => `<select data-f="${esc(f.k)}"><option value="">${esc(f.label)}: todos</option>${(f.opts || []).map((o) => `<option value="${esc(o[0])}"${fv[f.k] === String(o[0]) ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`).join('')}
        <span class="grow"></span>
        <span class="popwrap"><button class="btn sm" id="gear" title="Escolher colunas">⚙ Colunas</button><div class="pop" id="pop" hidden><h4>Mostrar colunas</h4>${cfg.cols.map((c) => `<label class="chk"><input type="checkbox" data-col="${esc(c.label)}"${hidden.includes(c.label) ? '' : ' checked'}> ${esc(c.label)}</label>`).join('')}<p style="margin:8px 0 0"><button class="btn sm" id="reset">Restaurar</button></p></div></span>
        <button class="btn sm" id="csv" title="Baixar em planilha (CSV)">⬇ CSV</button>
        ${canWrite && !cfg.noCreate ? `<button class="btn gold" id="new">+ ${esc(cfg.newLabel || 'Novo')}</button>` : ''}</div>
        <div class="tablewrap"><table><thead><tr>${vc.map(([c, i]) => `<th class="sortable" data-s="${i}">${esc(c.label)}${sort.i === i ? (sort.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}${cfg.actions ? '<th></th>' : ''}</tr></thead><tbody id="tb"></tbody></table></div>
        <div class="pager" id="pg"></div>`;
      $('#q', el).oninput = (e) => { q = e.target.value.toLowerCase(); page = 0; paint(); };
      el.querySelectorAll('select[data-f]').forEach((s) => (s.onchange = () => { fv[s.dataset.f] = s.value; page = 0; paint(); }));
      el.querySelectorAll('th.sortable').forEach((th) => (th.onclick = () => { const i = +th.dataset.s; sort = sort.i === i ? { i, dir: -sort.dir } : { i, dir: 1 }; render(); }));
      const pop = $('#pop', el);
      $('#gear', el).onclick = (e) => { e.stopPropagation(); pop.hidden = !pop.hidden; };
      pop.onclick = (e) => e.stopPropagation();
      pop.querySelectorAll('[data-col]').forEach((cb) => (cb.onchange = () => {
        const l = cb.dataset.col; hidden = cb.checked ? hidden.filter((x) => x !== l) : hidden.concat(l);
        if (cfg.cols.every((c) => hidden.includes(c.label))) hidden = hidden.filter((x) => x !== l);
        TJ.store.set(colKey, hidden); const open = true; render(); $('#pop', el).hidden = !open;
      }));
      $('#reset', el).onclick = () => { hidden = []; TJ.store.set(colKey, hidden); render(); };
      document.addEventListener('click', function closer() { const p = $('#pop', el); if (p) p.hidden = true; document.removeEventListener('click', closer); }, { once: true });
      $('#csv', el).onclick = () => {
        const r = filtered(), cs = cfg.cols;
        const csv = [cs.map((c) => c.label)].concat(r.map((x) => cs.map((c) => cell(c, x)))).map((l) => l.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(';')).join('\r\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
        a.download = (cfg.id || cfg.table) + '.csv'; document.body.appendChild(a); a.click(); a.remove(); TJ.toast('Planilha baixada.');
      };
      const nb = $('#new', el);
      if (nb) nb.onclick = async () => {
        const d = typeof cfg.defaults === 'function' ? await cfg.defaults() : cfg.defaults || {};
        TJ.openForm(Object.assign({}, cfg, { defaults: d }), null, load);
      };
      paint();
    }

    function paint() {
      const vc = visibleCols(), r = filtered(), total = r.length;
      const pages = Math.max(1, Math.ceil(total / size)); if (page >= pages) page = pages - 1;
      const slice = r.slice(page * size, page * size + size);
      const tb = $('#tb', el);
      tb.innerHTML = slice.length ? slice.map((x) => `<tr class="${cfg.onRow || canWrite ? 'click' : ''}" data-i="${rows.indexOf(x)}">${vc.map(([c]) => `<td data-label="${esc(c.label)}">${c.fmt ? c.fmt(x) : esc(x[c.k] ?? '')}</td>`).join('')}${cfg.actions ? `<td class="acts" data-label="">${cfg.actions.map((a, j) => `<button class="btn sm" data-a="${j}">${esc(a.label)}</button>`).join(' ')}</td>` : ''}</tr>`).join('') : `<tr><td colspan="${vc.length + 1}" class="empty">Nada por aqui ainda.</td></tr>`;
      $('#pg', el).innerHTML = total > size || size !== 25 ? `<span class="small muted">${total ? page * size + 1 : 0}–${Math.min(total, page * size + size)} de ${total}</span><span class="row"><button class="btn sm" id="pp"${page ? '' : ' disabled'}>← Anterior</button><button class="btn sm" id="pn"${page < pages - 1 ? '' : ' disabled'}>Próxima →</button><select id="sz">${[10, 25, 50, 100].map((n) => `<option${n === size ? ' selected' : ''}>${n}</option>`).join('')}</select></span>` : `<span class="small muted">${total} registro(s)</span>`;
      const pp = $('#pp', el), pn = $('#pn', el), sz = $('#sz', el);
      if (pp) pp.onclick = () => { page--; paint(); };
      if (pn) pn.onclick = () => { page++; paint(); };
      if (sz) sz.onchange = () => { size = +sz.value; TJ.store.set('tj-size', size); page = 0; paint(); };
      tb.onclick = (e) => {
        const tr = e.target.closest('tr[data-i]'); if (!tr) return;
        const row = rows[+tr.dataset.i], ab = e.target.closest('button[data-a]');
        if (ab) { e.stopPropagation(); return cfg.actions[+ab.dataset.a].fn(row, load); }
        if (cfg.onRow) return cfg.onRow(row, load);
        if (canWrite) TJ.openForm(cfg, row, load);
      };
    }
    TJ.reloadCrud = load;
    await load();
  };

  // ---------- processos ----------
  const caseFields = [
    { k: 'number', label: 'Número do processo', req: true },
    { k: 'title', label: 'Título', req: true },
    { k: 'kind', label: 'Tipo', type: 'select', opts: opts(L.kind) },
    { k: 'status', label: 'Situação', type: 'select', opts: opts(L.status) },
    { k: 'stage', label: 'Fase atual', ph: 'Ex.: Instrução, Alegações finais…' },
    { k: 'tags', label: 'Etiquetas (separadas por vírgula)', ph: 'Ex.: trânsito, roubo' },
    { k: 'cover_url', label: 'Imagem de capa (opcional)', upload: 'midia', help: 'Aparece no cartão e no topo do processo no site.' },
    { k: 'summary', label: 'Resumo dos fatos', type: 'textarea', help: 'Aparece no site se o processo for público. Aceita formatação estilo Discord.' },
    { k: 'judge', label: 'Juiz(a)' }, { k: 'prosecutor', label: 'Promotoria' }, { k: 'defense', label: 'Defesa' },
    { k: 'result', label: 'Decisão / resultado', type: 'textarea', help: 'Sentença ou desfecho. Aparece no site.' },
    { k: 'opened_at', label: 'Data de abertura', type: 'date' }, { k: 'closed_at', label: 'Data de encerramento', type: 'date' },
    { k: 'is_public', label: 'Processo PÚBLICO (aparece no site)', type: 'bool', help: 'Desmarcado = só membros logados enxergam.' },
  ];
  const auto = (ev, vars) => (TJ.automate ? TJ.automate(ev, vars) : null);
  const caseAfter = async (p, row, isNew) => {
    if (p.is_public && (isNew || !row.is_public)) await auto('case_new', { numero: p.number, titulo: p.title });
    if (p.status === 'sentenciado' && (!row || row.status !== 'sentenciado')) await auto('case_sentenced', { numero: p.number, titulo: p.title, resultado: p.result || '' });
  };
  async function nextNumber() {
    const { count } = await sb().from('cases').select('*', { count: 'exact', head: true });
    return `${new Date().getFullYear()}/${String((count || 0) + 1).padStart(3, '0')}`;
  }

  P.processos = async (el, args) => {
    if (args[0]) return P.processo(el, args);
    el.innerHTML = H.head('Processos', 'Todos os processos do Tribunal. Toque em um para abrir.') + '<div id="c"></div>';
    await TJ.crud($('#c', el), {
      table: 'cases', pk: 'id', order: ['opened_at', false], fields: caseFields, newLabel: 'Novo processo', afterSave: caseAfter,
      canWrite: TJ.can('manage_cases'), defaults: async () => ({ number: await nextNumber(), is_public: false, status: 'em_andamento', kind: 'criminal', opened_at: new Date().toISOString().slice(0, 10) }),
      filters: [{ k: 'status', label: 'Situação', opts: opts(L.status) }, { k: 'is_public', label: 'Visibilidade', opts: [['true', 'Públicos'], ['false', 'Internos']] }],
      cols: [{ label: 'Nº', k: 'number' }, { label: 'Título', k: 'title' }, { label: 'Tipo', fmt: F.map('kind', L.kind) }, { label: 'Situação', fmt: (r) => TJ.tag(L.status, r.status) }, { label: 'Fase', k: 'stage' }, { label: 'Juiz(a)', k: 'judge' }, { label: 'Público', fmt: F.yn('is_public') }, { label: 'Abertura', fmt: F.date('opened_at') }],
      onRow: (r) => (location.hash = '#/painel/processos/' + r.id),
    });
  };

  P.processo = async (el, [id, tab = 'dados']) => {
    const { data: c, error } = await sb().from('cases').select('*').eq('id', id).maybeSingle();
    if (error || !c) { el.innerHTML = '<div class="card">Processo não encontrado.</div>'; return; }
    const can = TJ.can('manage_cases');
    el.innerHTML = `<p><a href="#/painel/processos">← Processos</a></p>${H.head(c.number + ' · ' + c.title, '', TJ.tag(L.status, c.status))}
      ${H.tabs('processos/' + id, [['dados', 'Dados'], ['partes', 'Partes'], ['andamento', 'Andamento'], ['provas', 'Provas'], ['pecas', 'Peças']], tab)}<div id="tc"></div>`;
    const tc = $('#tc', el);
    const base = { canWrite: can, defaults: { case_id: id, is_public: true } };
    if (tab === 'dados') {
      tc.innerHTML = `<div class="card">${c.summary ? TJ.md(c.summary) : '<p class="muted">Sem resumo.</p>'}
        <p class="small muted">${esc(L.kind[c.kind] || c.kind)} · aberto em ${esc(TJ.fmtDate(c.opened_at))} · ${c.is_public ? '<b>PÚBLICO no site</b>' : 'interno (não aparece no site)'}</p>
        <div class="row">${can ? '<button class="btn gold" id="ed">Editar dados</button>' : ''}${c.is_public ? `<a class="btn" href="#/processo/${id}" target="_blank">Ver no site ↗</a>` : ''}</div></div>`;
      if (can) $('#ed', tc).onclick = () => TJ.openForm({ table: 'cases', fields: caseFields, afterSave: caseAfter }, c, () => P.processo(el, [id, 'dados']));
    } else if (tab === 'partes') {
      await TJ.crud(tc, Object.assign({ table: 'case_parties', filter: { case_id: id }, order: ['name'], newLabel: 'Nova parte',
        fields: [{ k: 'name', label: 'Nome', req: true }, { k: 'side', label: 'Papel', type: 'select', opts: opts(L.side) }, { k: 'note', label: 'Observação' }, { k: 'is_public', label: 'Mostrar no site', type: 'bool' }],
        cols: [{ label: 'Nome', k: 'name' }, { label: 'Papel', fmt: F.map('side', L.side) }, { label: 'Obs.', k: 'note' }, { label: 'Público', fmt: F.yn('is_public') }] }, base));
    } else if (tab === 'andamento') {
      await TJ.crud(tc, Object.assign({ table: 'case_events', filter: { case_id: id }, order: ['happened_at', false], newLabel: 'Nova movimentação',
        fields: [{ k: 'happened_at', label: 'Data', type: 'date', req: true }, { k: 'title', label: 'Movimentação', req: true, ph: 'Ex.: Audiência de instrução realizada' }, { k: 'description', label: 'Detalhes', type: 'textarea' }, { k: 'is_public', label: 'Mostrar no site', type: 'bool', help: 'Desmarcado vira anotação interna do processo.' }],
        cols: [{ label: 'Data', fmt: F.date('happened_at') }, { label: 'Movimentação', k: 'title' }, { label: 'Detalhes', fmt: F.cut('description', 60) }, { label: 'Público', fmt: F.yn('is_public') }] },
        base, { defaults: { case_id: id, is_public: true, happened_at: new Date().toISOString().slice(0, 10) } }));
    } else if (tab === 'provas') {
      await TJ.crud(tc, Object.assign({ table: 'evidences', filter: { case_id: id }, order: ['created_at'], newLabel: 'Nova prova',
        fields: [{ k: 'title', label: 'Título', req: true }, { k: 'kind', label: 'Tipo', type: 'select', opts: opts(L.ev) }, { k: 'url', label: 'Link da prova', upload: 'provas', help: 'Cole um link (YouTube, Imgur, Drive…) ou envie o arquivo.' }, { k: 'description', label: 'Descrição', type: 'textarea', rows: 3 }, { k: 'is_public', label: 'Mostrar no site', type: 'bool' }],
        cols: [{ label: 'Título', k: 'title' }, { label: 'Tipo', fmt: F.map('kind', L.ev) }, { label: 'Link', fmt: (r) => (r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">abrir ↗</a>` : '') }, { label: 'Público', fmt: F.yn('is_public') }] }, base));
    } else if (tab === 'pecas') {
      await TJ.crud(tc, Object.assign(await filingsCfg(id), { filter: { case_id: id } }));
    }
  };

  // ---------- peças (com modelos) ----------
  async function filingsCfg(caseId) {
    const { data: tpls } = await sb().from('templates').select('*').order('title');
    const tplMap = Object.fromEntries((tpls || []).map((t) => [t.id, t]));
    return {
      id: 'filings', table: 'filings', select: '*, author:profiles(roblox_name), kase:cases(number,title)', order: ['created_at', false], newLabel: 'Nova peça',
      canWrite: TJ.can('write_filings') || TJ.can('manage_cases'), defaults: { kind: 'relatorio', status: 'rascunho', case_id: caseId || null },
      filters: [{ k: 'status', label: 'Situação', opts: [['rascunho', 'Rascunho'], ['protocolado', 'Protocolado']] }, { k: 'kind', label: 'Tipo', opts: opts(L.filing) }],
      fields: [
        { k: '_tpl', label: 'Começar de um modelo (opcional)', type: 'select', nosave: true, opts: [['', '— em branco —']].concat((tpls || []).map((t) => [t.id, t.title])),
          onchange: (val, root) => {
            const t = tplMap[val]; if (!t) return;
            const c = root.querySelector('#f_content');
            if (c.value.trim() && !confirm('Substituir o texto atual pelo modelo?')) return;
            c.value = t.content || '';
            const ti = root.querySelector('#f_title'); if (!ti.value.trim()) ti.value = t.title;
            const k = root.querySelector('#f_kind'); if (k && L.filing[t.kind]) k.value = t.kind;
          } },
        { k: 'case_id', label: 'Processo', type: 'select', opts: () => H.casesOpts(true) },
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
    el.innerHTML = H.head('Minhas peças', 'Relatórios, alegações, rol de testemunhas e outras peças. Você só enxerga as suas' + (TJ.can('view_all_filings') ? ' (e, pelo seu cargo, as de todos)' : '') + '.') + '<div id="c"></div>';
    await TJ.crud($('#c', el), await filingsCfg(null));
  };

  P.modelos = async (el) => {
    const can = TJ.can('manage_cases');
    el.innerHTML = H.head('Modelos de peças', 'Textos prontos para começar uma peça rapidamente.' + (can ? '' : ' (somente leitura)')) + '<div id="c"></div>';
    await TJ.crud($('#c', el), {
      table: 'templates', order: ['title'], newLabel: 'Novo modelo', canWrite: can, defaults: { kind: 'relatorio' },
      fields: [{ k: 'title', label: 'Título', req: true }, { k: 'kind', label: 'Tipo', type: 'select', opts: opts(L.filing) }, { k: 'content', label: 'Texto do modelo', type: 'textarea', rows: 14 }],
      cols: [{ label: 'Título', k: 'title' }, { label: 'Tipo', fmt: F.map('kind', L.filing) }, { label: 'Prévia', fmt: F.cut('content', 70) }],
      actions: [{ label: 'Copiar', fn: (r) => TJ.copy(r.content || '', 'Modelo copiado.') }],
      onRow: can ? undefined : (r) => TJ.dlg(`<h3>${esc(r.title)}</h3><div class="codebox">${esc(r.content || '')}</div><p style="margin-top:16px"><button class="btn" data-close>Fechar</button></p>`),
    });
  };

  // ---------- agenda ----------
  P.agenda = async (el) => {
    el.innerHTML = H.head('Agenda de audiências', 'Audiências, julgamentos e sessões — públicas ou internas.') + '<div id="c"></div>';
    await TJ.crud($('#c', el), {
      table: 'hearings', order: ['starts_at', false], newLabel: 'Nova audiência', canWrite: TJ.can('manage_agenda'),
      afterSave: async (p, row, isNew) => { if (isNew && p.is_public) await auto('hearing', { titulo: p.title, data: TJ.fmtDT(p.starts_at), local: p.place || 'a definir' }); },
      defaults: { kind: 'audiencia', is_public: true },
      filters: [{ k: 'kind', label: 'Tipo', opts: opts(L.hear) }],
      fields: [{ k: 'title', label: 'Título', req: true }, { k: 'kind', label: 'Tipo', type: 'select', opts: opts(L.hear) }, { k: 'starts_at', label: 'Data e hora', type: 'datetime', req: true }, { k: 'place', label: 'Local' }, { k: 'case_id', label: 'Processo', type: 'select', opts: () => H.casesOpts(true) }, { k: 'notes', label: 'Observações', type: 'textarea', rows: 3 }, { k: 'is_public', label: 'Mostrar no site', type: 'bool' }],
      cols: [{ label: 'Quando', fmt: F.dt('starts_at') }, { label: 'Título', k: 'title' }, { label: 'Tipo', fmt: F.map('kind', L.hear) }, { label: 'Local', k: 'place' }, { label: 'Público', fmt: F.yn('is_public') }],
    });
  };

  // ---------- mural interno ----------
  P.mural = async (el) => {
    el.innerHTML = H.head('Mural interno', 'Avisos só para membros do Tribunal (não aparecem no site).') + '<div id="c"></div>';
    const can = TJ.can('manage_announcements');
    await TJ.crud($('#c', el), {
      table: 'board_posts', order: ['created_at', false], newLabel: 'Novo aviso', canWrite: can, defaults: { pinned: false },
      fields: [{ k: 'title', label: 'Título', req: true }, { k: 'body', label: 'Texto', type: 'textarea', rows: 10, help: 'Aceita a formatação estilo Discord.' }, { k: 'pinned', label: 'Fixar no topo', type: 'bool' }],
      cols: [{ label: 'Data', fmt: F.date('created_at') }, { label: 'Título', k: 'title' }, { label: 'Texto', fmt: F.cut('body', 90) }, { label: 'Fixado', fmt: F.yn('pinned') }],
      onRow: can ? undefined : (r) => TJ.dlg(`<h3>${esc(r.title)}</h3>${TJ.md(r.body)}<p style="margin-top:16px"><button class="btn" data-close>Fechar</button></p>`),
    });
  };

  // ---------- comunicados + Discord ----------
  const discordText = (r) => `# ${r.title}\n${r.body || ''}`;

  P.comunicados = async (el) => {
    el.innerHTML = H.head('Comunicados', 'Escreva uma vez: publica no site, copia em markdown para o Discord ou envia direto pelo webhook.') + '<div id="c"></div>';
    await TJ.crud($('#c', el), {
      table: 'announcements', order: ['created_at', false], newLabel: 'Novo comunicado', canWrite: TJ.can('manage_announcements'),
      afterSave: async (p, row, isNew) => { if (p.published && !p.publish_at && (isNew || !row.published)) await auto('announcement', { titulo: p.title, texto: p.body || '' }); },
      defaults: { category: 'comunicado', published: true, pinned: false },
      filters: [{ k: 'category', label: 'Categoria', opts: opts(L.cat) }],
      fields: [{ k: 'title', label: 'Título', req: true }, { k: 'category', label: 'Categoria', type: 'select', opts: opts(L.cat) }, { k: 'body', label: 'Texto', type: 'textarea', rows: 12, help: 'Formatação: # título, **negrito**, *itálico*, __sublinhado__, -# texto pequeno, > citação, ||spoiler||. Para o Discord sem Nitro, mantenha em até 2000 caracteres.' }, { k: 'tags', label: 'Etiquetas (opcional)' }, { k: 'image_url', label: 'Imagem do comunicado (opcional)', upload: 'midia' }, { k: 'publish_at', label: 'Publicar automaticamente em (opcional)', type: 'datetime', help: 'Deixe vazio para publicar agora. Se preencher, o comunicado aparece no site sozinho na data e hora escolhidas.' }, { k: 'pinned', label: 'Fixar no topo', type: 'bool' }, { k: 'published', label: 'Publicado no site', type: 'bool' }],
      cols: [{ label: 'Data', fmt: F.date('created_at') }, { label: 'Título', k: 'title' }, { label: 'Categoria', fmt: F.map('category', L.cat) }, { label: 'Agendado p/', fmt: F.dt('publish_at') }, { label: 'Caracteres', fmt: (r) => { const n = discordText(r).length; return `<span class="tag ${n > 2000 ? 'bad' : 'ok'}">${n}</span>`; } }, { label: 'Publicado', fmt: F.yn('published') }],
      actions: [
        { label: 'Copiar p/ Discord', fn: (r) => { const t = discordText(r); TJ.copy(t, t.length > 2000 ? `Copiado, mas tem ${t.length} caracteres (limite sem Nitro: 2000).` : 'Copiado em markdown!'); } },
        { label: 'Enviar ao Discord', fn: (r) => TJ.discordSend({ content: discordText(r), title: r.title }) },
      ],
    });
  };

  // ---------- início (widgets configuráveis) ----------
  P.home = async (el) => {
    const c = TJ.can;
    const cnt = async (t, f) => { let q = sb().from(t).select('*', { count: 'exact', head: true }); if (f) q = f(q); const r = await q; return r.count ?? '—'; };
    const stat = (n, t, link) => `<a class="card stat" href="${link}"><b>${n}</b><span class="muted">${t}</span></a>`;
    const W = [
      { id: 'stats', title: 'Resumo', ok: true, full: true, r: async () => {
        const [a, b, d, e] = await Promise.all([
          cnt('cases', (q) => q.in('status', ['em_andamento', 'em_julgamento'])),
          c('write_filings') ? cnt('filings', (q) => q.eq('author_id', state.U.id).eq('status', 'rascunho')) : '—',
          c('manage_selection') ? cnt('applications', (q) => q.eq('status', 'recebida')) : null,
          cnt('cases', (q) => q.eq('is_public', false)),
        ]);
        return `<div class="grid g3 stats">${stat(a, 'processos em andamento', '#/painel/processos')}${stat(b, 'meus rascunhos', '#/painel/pecas')}${d !== null ? stat(d, 'candidaturas novas', '#/painel/selecao/candidatos') : ''}${stat(e, 'processos internos', '#/painel/processos')}</div>`;
      } },
      { id: 'charts', title: 'Gráfico de processos', ok: c('view_internal'), r: async () => {
        const { data } = await sb().from('cases').select('status'); const m = {}; (data || []).forEach((x) => (m[x.status] = (m[x.status] || 0) + 1)); const tot = (data || []).length || 1;
        return `<div class="card"><h3>Processos por situação</h3><div class="funnel">${Object.entries(L.status).map(([k, v]) => `<div class="fr"><span>${v[0]}</span><div class="bar"><i style="width:${Math.round(((m[k] || 0) / tot) * 100)}%"></i></div><b>${m[k] || 0}</b></div>`).join('')}</div></div>`;
      } },
      { id: 'tasks', title: 'Minhas tarefas', ok: c('view_internal'), r: async () => {
        const { data } = await sb().from('tasks').select('*').eq('assigned_to', state.U.id).neq('status', 'concluida').order('due_at').limit(5);
        return `<div class="card"><h3>Minhas tarefas</h3>${(data || []).length ? data.map((x) => `<div class="item row spread"><span>${esc(x.title)}</span><span class="small muted">${x.due_at ? esc(TJ.fmtDate(x.due_at)) : ''}</span></div>`).join('') : '<p class="muted">Nenhuma tarefa pendente.</p>'}<p style="margin-bottom:0"><a href="#/painel/tarefas">Abrir tarefas →</a></p></div>`;
      } },
      { id: 'mural', title: 'Mural interno', ok: c('view_internal'), r: async () => {
        const { data } = await sb().from('board_posts').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(3);
        return `<div class="card"><h3>Mural interno</h3>${(data || []).length ? data.map((p) => `<div class="item"><b>${p.pinned ? '📌 ' : ''}${esc(p.title)}</b> <span class="small muted">${esc(TJ.fmtDate(p.created_at))}</span>${TJ.md(p.body)}</div>`).join('') : '<p class="muted">Nenhum aviso.</p>'}<p style="margin-bottom:0"><a href="#/painel/mural">Abrir mural →</a></p></div>`;
      } },
      { id: 'hearings', title: 'Próximas audiências', ok: c('view_internal'), r: async () => {
        const { data } = await sb().from('hearings').select('*').gte('starts_at', new Date().toISOString()).order('starts_at').limit(5);
        return `<div class="card"><h3>Próximas audiências</h3>${(data || []).length ? data.map((x) => `<div class="item"><b>${esc(TJ.fmtDT(x.starts_at))}</b> — ${esc(x.title)} ${x.place ? '· ' + esc(x.place) : ''}</div>`).join('') : '<p class="muted">Nada agendado.</p>'}<p style="margin-bottom:0"><a href="#/painel/agenda">Abrir agenda →</a></p></div>`;
      } },
      { id: 'cases', title: 'Processos recentes', ok: c('view_internal'), r: async () => {
        const { data } = await sb().from('cases').select('*').order('opened_at', { ascending: false }).limit(5);
        return `<div class="card"><h3>Processos recentes</h3>${(data || []).length ? data.map((x) => `<div class="item row spread"><a href="#/painel/processos/${x.id}"><b>${esc(x.number)}</b> ${esc(x.title)}</a>${TJ.tag(L.status, x.status)}</div>`).join('') : '<p class="muted">Nenhum processo.</p>'}</div>`;
      } },
      { id: 'filings', title: 'Minhas peças recentes', ok: c('write_filings'), r: async () => {
        const { data } = await sb().from('filings').select('*').eq('author_id', state.U.id).order('created_at', { ascending: false }).limit(5);
        return `<div class="card"><h3>Minhas peças recentes</h3>${(data || []).length ? data.map((x) => `<div class="item row spread"><span>${esc(x.title)}</span><span class="tag ${x.status === 'protocolado' ? 'ok' : 'gray'}">${esc(x.status)}</span></div>`).join('') : '<p class="muted">Você ainda não escreveu peças.</p>'}<p style="margin-bottom:0"><a href="#/painel/pecas">Abrir minhas peças →</a></p></div>`;
      } },
      { id: 'apps', title: 'Candidaturas novas', ok: c('manage_selection'), r: async () => {
        const { data } = await sb().from('applications').select('*, round:selection_rounds(title)').eq('status', 'recebida').order('created_at', { ascending: false }).limit(5);
        return `<div class="card"><h3>Candidaturas novas</h3>${(data || []).length ? data.map((x) => `<div class="item"><b>${esc(x.roblox_name)}</b> <span class="small muted">${esc(x.round?.title || '')}</span></div>`).join('') : '<p class="muted">Nenhuma candidatura nova.</p>'}<p style="margin-bottom:0"><a href="#/painel/selecao/candidatos">Ver candidatos →</a></p></div>`;
      } },
      { id: 'audit', title: 'Últimas alterações', ok: c('view_audit'), r: async () => {
        const { data } = await sb().from('audit_log').select('*').order('at', { ascending: false }).limit(6);
        const A = { INSERT: 'Criou', UPDATE: 'Alterou', DELETE: 'Excluiu' };
        return `<div class="card"><h3>Últimas alterações</h3>${(data || []).map((x) => `<div class="item small">${esc(TJ.fmtDT(x.at))} — ${esc(A[x.action] || x.action)} em <b>${esc(x.table_name)}</b></div>`).join('') || '<p class="muted">Sem registros.</p>'}</div>`;
      } },
    ].filter((w) => w.ok);

    const off = TJ.store.get('tj-widgets-off', []);
    el.innerHTML = H.head('Olá, ' + (state.P.display_name || state.P.roblox_name), `Cargo: <b>${esc(state.P.role?.label || state.P.role_key)}</b>`, '<button class="btn sm" id="wcfg">⚙ Personalizar painel</button>') + `<div class="quick">${[['processos', 'briefcase', 'Processos', c('view_internal')], ['pecas', 'file', 'Minhas peças', c('write_filings')], ['tarefas', 'tasks', 'Tarefas', c('view_internal')], ['comunicados', 'bell', 'Comunicados', c('manage_announcements')], ['selecao', 'check', 'Seleção', c('manage_selection')], ['discord', 'send', 'Discord', c('manage_announcements') || c('manage_site')]].filter((x) => x[3]).map(([k, ic, t]) => `<a href="#/painel/${k}">${icon(ic)}${t}</a>`).join('')}</div><div id="ws"></div>`;
    $('#wcfg', el).onclick = () => TJ.dlg(`<h3>Personalizar painel</h3><p class="muted small">Escolha o que aparece na sua tela inicial (vale só para você neste aparelho).</p>${W.map((w) => `<label class="chk"><input type="checkbox" data-w="${w.id}"${off.includes(w.id) ? '' : ' checked'}> ${esc(w.title)}</label>`).join('')}<p style="margin-top:16px"><button class="btn gold" id="wsave">Salvar</button> <button class="btn" data-close>Cancelar</button></p>`, (d) => {
      d.querySelector('#wsave').onclick = () => { TJ.store.set('tj-widgets-off', [...d.querySelectorAll('[data-w]')].filter((x) => !x.checked).map((x) => x.dataset.w)); d.close(); P.home(el); };
    });
    const vis = W.filter((w) => !off.includes(w.id));
    const parts = await Promise.all(vis.map((w) => w.r().catch((e) => `<div class="card"><b>${esc(w.title)}:</b> ${esc(e.message || e)}</div>`)));
    const full = vis.map((w, i) => (w.full ? parts[i] : '')).join(''), cards = vis.map((w, i) => (w.full ? '' : parts[i])).join('');
    $('#ws', el).innerHTML = `${full}<div class="grid g2" style="margin-top:18px;align-items:start">${cards}</div>`;
    if (!vis.length) $('#ws', el).innerHTML = '<div class="empty">Nenhum bloco ativo. Use "Personalizar painel".</div>';
  };

  // ---------- minha conta ----------
  P.conta = async (el) => {
    const p = state.P;
    el.innerHTML = H.head('Minha conta', `<b>${esc(p.roblox_name)}</b> — ${esc(p.role?.label || '')}`) + `<div class="grid g2" style="align-items:start">
      <form class="card" id="pf"><h3>Meu perfil</h3>
        <div class="row">${p.avatar_url ? `<img class="avatar" src="${esc(p.avatar_url)}" alt="">` : `<span class="avatar">${esc((p.display_name || p.roblox_name || '?')[0].toUpperCase())}</span>`}<div class="grow"><label style="margin-top:0">Foto de perfil</label><input type="file" id="av" accept="image/*"></div></div>
        <label>Nome de exibição</label><input id="dn" value="${esc(p.display_name || '')}" maxlength="60">
        <label>Apresentação (aparece na página Equipe)</label><textarea id="bio" rows="3" maxlength="300">${esc(p.bio || '')}</textarea>
        <label class="chk"><input type="checkbox" id="sp"${p.show_public ? ' checked' : ''}> Aparecer na página Equipe do site</label>
        <p><button class="btn gold">Salvar perfil</button></p></form>
      <form class="card" id="pw"><h3>Trocar senha</h3>
        <label>Nova senha (mínimo 8 caracteres)</label><input id="p1" type="password" minlength="8" autocomplete="new-password" required>
        <label>Repita a nova senha</label><input id="p2" type="password" minlength="8" autocomplete="new-password" required>
        <p><button class="btn gold">Trocar senha</button></p></form></div>`;
    $('#pf', el).onsubmit = async (e) => {
      e.preventDefault();
      const patch = { display_name: $('#dn', el).value.trim() || p.roblox_name, bio: $('#bio', el).value.trim() || null, show_public: $('#sp', el).checked };
      const file = $('#av', el).files[0];
      if (file) {
        const path = `${p.id}/${Date.now()}-${file.name.normalize('NFD').replace(/[^\w.\-]+/g, '_')}`;
        const up = await sb().storage.from('avatares').upload(path, file);
        if (up.error) return TJ.toast('Falha ao enviar a foto: ' + up.error.message, true);
        patch.avatar_url = sb().storage.from('avatares').getPublicUrl(path).data.publicUrl;
      }
      const r = await sb().from('profiles').update(patch).eq('id', p.id);
      if (r.error) return TJ.toast(r.error.message, true);
      await TJ.loadSession(); TJ.toast('Perfil salvo!');
    };
    $('#pw', el).onsubmit = async (e) => {
      e.preventDefault();
      if ($('#p1', el).value !== $('#p2', el).value) return TJ.toast('As senhas não conferem.', true);
      const { error } = await sb().auth.updateUser({ password: $('#p1', el).value });
      TJ.toast(error ? error.message : 'Senha alterada!', !!error);
      if (!error) e.target.reset();
    };
  };

  // ---------- auditoria ----------
  P.auditoria = async (el) => {
    el.innerHTML = H.head('Histórico de alterações', 'Quem criou, alterou ou excluiu cada coisa. Toque em uma linha para ver os dados.') + '<div id="c"></div>';
    const { data: pf } = await sb().from('profiles').select('id,roblox_name');
    const map = Object.fromEntries((pf || []).map((x) => [x.id, x.roblox_name]));
    const A = { INSERT: 'Criou', UPDATE: 'Alterou', DELETE: 'Excluiu' };
    await TJ.crud($('#c', el), { table: 'audit_log', order: ['at', false], noCreate: true, canWrite: false, fields: [],
      filters: [{ k: 'action', label: 'Ação', opts: [['INSERT', 'Criou'], ['UPDATE', 'Alterou'], ['DELETE', 'Excluiu']] }],
      cols: [{ label: 'Quando', fmt: F.dt('at') }, { label: 'Quem', fmt: (r) => esc(map[r.user_id] || 'sistema') }, { label: 'Ação', fmt: (r) => esc(A[r.action] || r.action) }, { label: 'Tabela', k: 'table_name' }, { label: 'Registro', fmt: F.cut('row_id', 14) }],
      onRow: (r) => TJ.dlg(`<h3>${esc(A[r.action] || r.action)} em ${esc(r.table_name)}</h3><div class="codebox">${esc(JSON.stringify(r.data, null, 2))}</div><p style="margin-top:14px"><button class="btn" data-close>Fechar</button></p>`) });
  };

  // ---------- tarefas ----------
  P.tarefas = async (el) => {
    const { data: ppl } = await sb().from('profiles').select('id,roblox_name').eq('active', true).order('roblox_name');
    const T = { aberta: ['Aberta', 'warn'], em_andamento: ['Em andamento', 'warn'], concluida: ['Concluída', 'ok'] };
    el.innerHTML = H.head('Tarefas', 'Combine e acompanhe o que cada membro precisa fazer, com prazo e processo ligado.') + '<div id="c"></div>';
    const mine = TJ.can('manage_cases') ? [] : [];
    await TJ.crud($('#c', el), {
      table: 'tasks', select: '*, assignee:profiles!assigned_to(roblox_name), kase:cases(number)', order: ['due_at'], newLabel: 'Nova tarefa', canWrite: true,
      defaults: { status: 'aberta', assigned_to: state.U.id },
      filters: [{ k: 'status', label: 'Situação', opts: opts(Object.fromEntries(Object.entries(T).map(([k, v]) => [k, v[0]]))) }],
      fields: [{ k: 'title', label: 'Tarefa', req: true }, { k: 'detail', label: 'Detalhes', type: 'textarea', rows: 4 },
        { k: 'assigned_to', label: 'Responsável', type: 'select', opts: [['', '— ninguém —']].concat((ppl || []).map((x) => [x.id, x.roblox_name])) },
        { k: 'due_at', label: 'Prazo', type: 'datetime' }, { k: 'case_id', label: 'Processo (opcional)', type: 'select', opts: () => H.casesOpts(true) },
        { k: 'status', label: 'Situação', type: 'select', opts: [['aberta', 'Aberta'], ['em_andamento', 'Em andamento'], ['concluida', 'Concluída']] }],
      cols: [{ label: 'Tarefa', k: 'title' }, { label: 'Responsável', fmt: (r) => esc(r.assignee?.roblox_name || '—') }, { label: 'Prazo', fmt: (r) => (r.due_at ? `<span class="${new Date(r.due_at) < new Date() && r.status !== 'concluida' ? 'tag bad' : ''}">${esc(TJ.fmtDT(r.due_at))}</span>` : '—') }, { label: 'Processo', fmt: (r) => esc(r.kase?.number || '') }, { label: 'Situação', fmt: (r) => TJ.tag(T, r.status) }],
      actions: [{ label: 'Concluir', fn: async (r, reload) => { const u = await sb().from('tasks').update({ status: 'concluida' }).eq('id', r.id); TJ.toast(u.error ? u.error.message : 'Tarefa concluída.', !!u.error); reload(); } }],
    });
  };

  // ---------- busca geral ----------
  P.busca = async (el, [term = '']) => {
    term = decodeURIComponent(term).replace(/[%,()*]/g, ' ').trim();
    el.innerHTML = H.head('Busca', term ? `Resultados para “${esc(term)}”` : 'Digite algo na barra de busca acima.') + '<div id="r"></div>';
    if (!term) return;
    const like = (cols) => cols.map((c) => `${c}.ilike.%${term}%`).join(',');
    const c = TJ.can;
    const [cs, pf, an, ap, fl] = await Promise.all([
      c('view_internal') ? sb().from('cases').select('id,number,title,status').or(like(['number', 'title', 'summary'])).limit(8) : { data: [] },
      c('view_internal') ? sb().from('profiles').select('id,roblox_name,display_name,active').or(like(['roblox_name', 'display_name'])).limit(8) : { data: [] },
      c('manage_announcements') ? sb().from('announcements').select('id,title,created_at').or(like(['title', 'body'])).limit(8) : { data: [] },
      c('manage_selection') ? sb().from('applications').select('id,roblox_name,status').or(like(['roblox_name', 'discord_user'])).limit(8) : { data: [] },
      c('write_filings') ? sb().from('filings').select('id,title,status').or(like(['title', 'content'])).limit(8) : { data: [] },
    ]);
    const sec = (t, arr, fn) => (arr && arr.length ? `<div class="card" style="margin-bottom:14px"><h3>${t}</h3>${arr.map((x) => `<div class="item">${fn(x)}</div>`).join('')}</div>` : '');
    const html = sec('Processos', cs.data, (x) => `<a href="#/painel/processos/${x.id}"><b>${esc(x.number)}</b> ${esc(x.title)}</a> ${TJ.tag(L.status, x.status)}`) +
      sec('Membros', pf.data, (x) => `<a href="#/painel/usuarios/${x.active ? 'membros' : 'desligados'}"><b>@${esc(x.roblox_name)}</b> ${esc(x.display_name || '')}</a> ${x.active ? '' : '<span class="tag bad">desligado</span>'}`) +
      sec('Comunicados', an.data, (x) => `<a href="#/painel/comunicados">${esc(x.title)}</a> <span class="small muted">${esc(TJ.fmtDate(x.created_at))}</span>`) +
      sec('Candidatos', ap.data, (x) => `<a href="#/painel/selecao/candidatos"><b>${esc(x.roblox_name)}</b></a> <span class="tag ${L.appTone[x.status] || ''}">${esc(L.app[x.status] || x.status)}</span>`) +
      sec('Peças', fl.data, (x) => `<a href="#/painel/pecas">${esc(x.title)}</a> <span class="tag gray">${esc(x.status)}</span>`);
    $('#r', el).innerHTML = html || '<div class="empty">Nada encontrado.</div>';
  };

  // ---------- moldura do painel (menu lateral no PC, barra inferior no celular) ----------
  const MENU = () => {
    const c = TJ.can;
    return [
      ['', 'Início', 'home', true, 'Trabalho', true],
      ['processos', 'Processos', 'briefcase', c('view_internal'), 'Trabalho'],
      ['pecas', 'Minhas peças', 'file', c('write_filings') || c('view_all_filings'), 'Trabalho'],
      ['modelos', 'Modelos de peças', 'copy', c('view_internal'), 'Trabalho'],
      ['tarefas', 'Tarefas', 'tasks', c('view_internal'), 'Trabalho'],
      ['agenda', 'Agenda', 'calendar', c('view_internal'), 'Trabalho'],
      ['mural', 'Mural interno', 'pin', c('view_internal'), 'Trabalho'],
      ['vagas', 'Vagas internas', 'clip', c('view_internal'), 'Trabalho'],
      ['comunicados', 'Comunicados', 'bell', c('manage_announcements'), 'Gestão'],
      ['discord', 'Discord', 'send', c('manage_announcements') || c('manage_site'), 'Gestão'],
      ['selecao', 'Seleção', 'check', c('manage_selection'), 'Gestão'],
      ['usuarios', 'Membros e cargos', 'users', c('manage_users'), 'Gestão'],
      ['site', 'Site e aparência', 'sliders', c('manage_site'), 'Gestão'],
      ['auditoria', 'Histórico', 'clock', c('view_audit'), 'Gestão'],
      ['conta', 'Minha conta', 'user', true, 'Conta', true],
    ].filter((m) => m[3]).map(([k, t, ic, , g, fixed]) => ({ k, t, ic, g, fixed: !!fixed }));
  };
  TJ.menuDialog = (done) => {
    const all = MENU(), hid = TJ.store.get('tj-menu-hidden', []), fav = TJ.store.get('tj-menu-fav', ['', 'processos', 'pecas', 'agenda']);
    TJ.dlg(`<h3>Personalizar menu</h3><p class="muted small">Escolha o que aparece no seu menu. Use a estrela para fixar até 4 atalhos na barra de baixo (celular).</p>
      ${all.map((m) => `<div class="row spread item"><label class="chk" style="margin:0"><input type="checkbox" data-v="${esc(m.k)}"${hid.includes(m.k) ? '' : ' checked'}${m.fixed ? ' disabled' : ''}> ${esc(m.t)}</label><label class="chk" style="margin:0" title="Fixar na barra de baixo"><input type="checkbox" data-f="${esc(m.k)}"${fav.includes(m.k) ? ' checked' : ''}> ★</label></div>`).join('')}
      <p style="margin-top:16px" class="row"><button class="btn gold" id="mdsave">Salvar</button><button class="btn" id="mdreset">Restaurar padrão</button><button class="btn" data-close>Cancelar</button></p>`, (d) => {
      d.querySelector('#mdsave').onclick = () => {
        const hidden = [...d.querySelectorAll('[data-v]')].filter((x) => !x.checked).map((x) => x.dataset.v);
        const favs = [...d.querySelectorAll('[data-f]:checked')].map((x) => x.dataset.f).slice(0, 4);
        TJ.store.set('tj-menu-hidden', hidden); TJ.store.set('tj-menu-fav', favs); d.close(); done && done();
      };
      d.querySelector('#mdreset').onclick = () => { TJ.store.set('tj-menu-hidden', []); TJ.store.set('tj-menu-fav', ['', 'processos', 'pecas', 'agenda']); d.close(); done && done(); };
    });
  };

  TJ.mountPanel = async function (view, parts) {
    const page = parts[0] || 'home';
    const all = MENU(), hid = TJ.store.get('tj-menu-hidden', []);
    const vis = all.filter((m) => m.fixed || !hid.includes(m.k));
    let favKeys = TJ.store.get('tj-menu-fav', ['', 'processos', 'pecas', 'agenda']);
    let fav = favKeys.map((k) => vis.find((m) => m.k === k)).filter(Boolean).slice(0, 4);
    if (fav.length < 4) vis.forEach((m) => { if (fav.length < 4 && !fav.includes(m) && m.k !== 'conta') fav.push(m); });
    const cur = page === 'home' ? '' : page;
    const href = (k) => `#/painel${k ? '/' + k : ''}`;
    const ini = (state.P.display_name || state.P.roblox_name || '?')[0].toUpperCase();
    const av = state.P.avatar_url ? `<img class="avatar" src="${esc(state.P.avatar_url)}" alt="">` : `<span class="avatar">${esc(ini)}</span>`;
    let groups = ''; let last = '';
    vis.forEach((m) => { if (m.g !== last) { groups += `<h5>${esc(m.g)}</h5>`; last = m.g; } groups += `<a class="mi${cur === m.k ? ' on' : ''}" href="${href(m.k)}">${icon(m.ic)}${esc(m.t)}</a>`; });
    const inFav = fav.some((m) => m.k === cur);
    view.innerHTML = `<div class="panel"><aside class="side"><div class="me">${av}<div><b>${esc(state.P.display_name || state.P.roblox_name)}</b><div class="small muted">${esc(state.P.role?.label || '')}</div></div></div>${groups}<button class="btn sm gearbtn" id="mcfg">⚙ Personalizar menu</button></aside>
      <section class="content"><form class="ptop" id="sf"><input type="search" id="sq" placeholder="Buscar processos, membros, comunicados…" aria-label="Buscar"></form><div id="pc"></div></section></div>
      <nav class="tabbar" aria-label="Menu">${fav.map((m) => `<a href="${href(m.k)}" class="${cur === m.k ? 'on' : ''}">${icon(m.ic)}<span>${esc(m.t.split(' ')[0])}</span></a>`).join('')}<button id="tbmore" class="${!inFav && cur ? 'on' : ''}">${icon('menu')}<span>Menu</span></button></nav>`;
    $('#sf', view).onsubmit = (e) => { e.preventDefault(); const t = $('#sq', view).value.trim(); if (t) location.hash = '#/painel/busca/' + encodeURIComponent(t); };
    $('#mcfg', view).onclick = () => TJ.menuDialog(() => TJ.route());
    $('#tbmore', view).onclick = () => TJ.dlg(`<h3>Menu</h3><div class="tiles">${vis.map((m) => `<a class="tile${cur === m.k ? ' on' : ''}" href="${href(m.k)}" data-close>${icon(m.ic)}${esc(m.t)}</a>`).join('')}<a class="tile" href="#/" data-close>${icon('home')}Ver o site</a><a class="tile" href="#/sair" data-close>${icon('out')}Sair</a></div>
      <p class="row" style="margin-top:14px"><button class="btn sm" id="mm1">⚙ Personalizar menu</button><button class="btn sm" id="mm2">◐ Tema claro/escuro</button><button class="btn sm" data-close>Fechar</button></p>`, (d) => {
      d.querySelectorAll('a.tile').forEach((a) => a.addEventListener('click', () => d.close()));
      d.querySelector('#mm1').onclick = () => { d.close(); TJ.menuDialog(() => TJ.route()); };
      d.querySelector('#mm2').onclick = () => { const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = t; TJ.store.set('tj-theme', t); };
    });
    const el = $('#pc', view), fn = page === 'home' ? P.home : P[page];
    const allowed = page === 'busca' || all.some((m) => m.k === cur);
    if (!fn || !allowed) { el.innerHTML = '<div class="card">Você não tem acesso a esta área.</div>'; return; }
    try { await fn(el, parts.slice(1)); } catch (e) { console.error(e); el.innerHTML = `<div class="card"><b>Erro:</b> ${esc(e.message || e)}</div>`; }
  };
})();
