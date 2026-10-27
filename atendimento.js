/* Painel do Tribunal - Linha de atendimento (chamados com protocolo)
   Página pública (#/atendimento) + painel (#/painel/atendimento) */
(function () {
  const TJ = window.TJ, esc = TJ.esc, $ = TJ.$, state = TJ.state, H = TJ.H, P = TJ.P, F = H.F;
  const sb = () => TJ.sb;
  const ST = { aberto: ['Aberto', 'warn'], em_atendimento: ['Em atendimento', ''], aguardando: ['Aguardando solicitante', 'gray'], resolvido: ['Resolvido', 'ok'], arquivado: ['Arquivado', 'gray'] };
  const PR = { baixa: ['Baixa', 'gray'], normal: ['Normal', ''], alta: ['Alta', 'warn'], urgente: ['Urgente', 'bad'] };
  const PRK = { urgente: 0, alta: 1, normal: 2, baixa: 3 };
  const OPEN = ['aberto', 'em_atendimento', 'aguardando'];
  const kv = (o) => Object.entries(o).map(([k, v]) => [k, v[0]]);
  const ago = (d) => { const m = Math.max(0, Math.round((Date.now() - new Date(d)) / 60000)); if (m < 60) return m + ' min'; const h = Math.round(m / 60); if (h < 48) return h + ' h'; return Math.round(h / 24) + ' dias'; };
  const hoursSince = (d) => (Date.now() - new Date(d)) / 36e5;
  const late = (t, sla) => OPEN.slice(0, 2).includes(t.status) && !t.first_response_at && hoursSince(t.created_at) > (sla || 48);
  const bubble = (m) => `<div class="msg${m.staff ? ' staff' : ''}${m.internal ? ' internal' : ''}"><div class="mh"><b>${esc(m.author)}</b>${m.staff ? ' <span class="tag">Equipe</span>' : ''}${m.internal ? ' <span class="tag warn">Nota interna</span>' : ''}<span class="small muted"> · ${esc(TJ.fmtDT(m.at))}</span></div><div class="mb">${TJ.md(m.body)}</div></div>`;
  const myList = () => TJ.store.get('tj-my-tickets', []);
  const remember = (protocol, code) => { const l = myList().filter((x) => x.protocol !== protocol); l.unshift({ protocol, code }); TJ.store.set('tj-my-tickets', l.slice(0, 10)); };
  const errMsg = (e) => String(e && e.message || e || '').replace(/^.*?: /, '');

  async function categories(onlyActive = true) {
    let q = sb().from('ticket_categories').select('*').order('sort'); if (onlyActive) q = q.eq('active', true);
    const { data } = await q; return data || [];
  }
  const catOpts = (cats, sel) => cats.map((c) => `<option value="${c.id}"${c.id === sel ? ' selected' : ''}>${esc((c.icon ? c.icon + ' ' : '') + c.name)}${c.members_only ? ' (só membros)' : ''}</option>`).join('');

  // =====================================================================
  // PÁGINA PÚBLICA
  // =====================================================================
  TJ.pages.atendimento = async (v, [sub, prot]) => {
    const [cats, faqR] = await Promise.all([categories(), sb().from('faq').select('*').eq('active', true).order('sort')]);
    const faq = faqR.data || [], logged = !!state.P, mine = myList();
    v.innerHTML = TJ.head('Atendimento', 'Tire dúvidas, faça denúncias e peça ajuda à equipe do Tribunal.', 'atendimento') + `<div class="wrap section"><div class="grid g2" style="align-items:start">
      <div class="card" id="newbox"><h2 style="margin-top:0">Abrir um chamado</h2>
        <form id="nf"><div style="position:absolute;left:-9999px" aria-hidden="true"><input name="website" tabindex="-1" autocomplete="off"></div>
          <label>Seu nome no Roblox *</label><input name="name" maxlength="40" required value="${esc(state.P?.roblox_name || '')}"${logged ? ' readonly' : ''}>
          <label>Seu usuário no Discord (opcional)</label><input name="discord" maxlength="60">
          <label>Categoria *</label><select name="cat" required><option value="">Selecione…</option>${catOpts(cats)}</select>
          <p class="small muted" id="catd" style="margin:4px 0 0"></p>
          <label>Assunto *</label><input name="subject" maxlength="120" required>
          <label>Descreva o que aconteceu ou o que precisa *</label><textarea name="body" rows="6" maxlength="4000" required placeholder="Quanto mais detalhes (nomes, datas, links de prova), mais rápido o atendimento."></textarea>
          <p style="margin-bottom:0"><button class="btn gold">Enviar chamado</button></p></form></div>
      <div>
        <div class="card" id="trkbox"><h2 style="margin-top:0">Acompanhar um chamado</h2>
          <form id="tf" class="row" style="align-items:end"><div class="grow"><label style="margin-top:0">Protocolo</label><input name="p" placeholder="TJ-2026-0001" value="${esc(prot || '')}" required></div><div class="grow"><label style="margin-top:0">Código</label><input name="c" placeholder="8 caracteres" maxlength="8" required></div><button class="btn blue">Ver</button></form>
          ${mine.length ? `<p class="small muted" style="margin:12px 0 4px">Chamados abertos neste aparelho:</p><div class="chips">${mine.map((m) => `<button class="chip" data-p="${esc(m.protocol)}" data-c="${esc(m.code)}">${esc(m.protocol)}</button>`).join('')}</div>` : ''}
          <div id="trk" style="margin-top:14px"></div></div>
        ${faq.length ? `<div class="card" style="margin-top:18px"><h2 style="margin-top:0">Perguntas frequentes</h2>${faq.map((f) => `<details class="faqi"><summary>${esc(f.question)}</summary><div>${TJ.md(f.answer)}</div></details>`).join('')}</div>` : ''}
      </div></div></div>`;
    const nf = $('#nf', v);
    nf.cat.onchange = () => { const c = cats.find((x) => x.id === nf.cat.value); $('#catd', v).textContent = c ? `${c.description || ''} Prazo de resposta: até ${c.sla_hours} h.` : ''; };
    nf.onsubmit = async (e) => {
      e.preventDefault();
      if (nf.website.value) { $('#newbox', v).innerHTML = '<p>Chamado enviado.</p>'; return; }
      const btn = nf.querySelector('button'); btn.disabled = true;
      const { data, error } = await sb().rpc('open_ticket', { p_name: nf.name.value, p_discord: nf.discord.value, p_category: nf.cat.value, p_subject: nf.subject.value, p_body: nf.body.value });
      btn.disabled = false;
      if (error) return TJ.toast(errMsg(error), true);
      const r = Array.isArray(data) ? data[0] : data; remember(r.protocol, r.access_code);
      $('#newbox', v).innerHTML = `<h2 style="margin-top:0">Chamado enviado ✅</h2><p>Guarde estes dados para acompanhar:</p><div class="ticketcode"><div><span class="small muted">Protocolo</span><b>${esc(r.protocol)}</b></div><div><span class="small muted">Código</span><b>${esc(r.access_code)}</b></div></div>
        <p class="row"><button class="btn sm" id="cpc">Copiar</button><button class="btn sm blue" id="seec">Acompanhar agora</button></p>${logged ? '<p class="small muted">Como você é membro, ele também aparece em Painel › Atendimento › Meus chamados.</p>' : '<p class="small muted">Sem o código, não é possível ver o chamado depois. Anote-o ou tire um print.</p>'}`;
      $('#cpc', v).onclick = () => TJ.copy(`Protocolo: ${r.protocol}\nCódigo: ${r.access_code}`, 'Copiado!');
      $('#seec', v).onclick = () => { track(r.protocol, r.access_code); $('#trkbox', v).scrollIntoView({ behavior: 'smooth' }); };
    };
    async function track(p, c) {
      const box = $('#trk', v); box.innerHTML = '<p class="muted">Buscando…</p>';
      const { data, error } = await sb().rpc('track_ticket', { p_protocol: p, p_code: c });
      if (error) { box.innerHTML = ''; return TJ.toast(errMsg(error), true); }
      if (!data) { box.innerHTML = '<p class="muted">Não encontramos esse chamado. Confira o protocolo e o código.</p>'; return; }
      remember(data.protocol, String(c).toUpperCase());
      const t = data, done = ['resolvido', 'arquivado'].includes(t.status);
      box.innerHTML = `<div class="row spread"><b>${esc(t.protocol)} — ${esc(t.subject)}</b>${TJ.tag(ST, t.status)}</div><p class="small muted">${esc(t.category || '')} · aberto em ${esc(TJ.fmtDT(t.created_at))}</p>
        <div class="thread">${(t.messages || []).map((m) => bubble({ author: m.author, staff: m.staff, body: m.body, at: m.at })).join('')}</div>
        ${t.status !== 'arquivado' ? `<form id="rf" style="margin-top:12px"><label>${done ? 'Reabrir com uma nova mensagem' : 'Responder'}</label><textarea name="b" rows="3" maxlength="4000" required></textarea><p style="margin:8px 0 0"><button class="btn sm gold">Enviar resposta</button></p></form>` : ''}
        ${done && !t.rating ? `<div class="card" style="margin-top:12px;background:var(--soft)"><b>Como foi o atendimento?</b><div class="chips" style="margin-top:8px">${[1, 2, 3, 4, 5].map((n) => `<button class="chip" data-rt="${n}">${'★'.repeat(n)}</button>`).join('')}</div></div>` : t.rating ? `<p class="small muted">Sua avaliação: ${'★'.repeat(t.rating)}</p>` : ''}`;
      const rf = $('#rf', box); if (rf) rf.onsubmit = async (e) => { e.preventDefault(); const r = await sb().rpc('reply_ticket', { p_protocol: p, p_code: c, p_body: rf.b.value }); if (r.error) return TJ.toast(errMsg(r.error), true); TJ.toast('Resposta enviada.'); track(p, c); };
      box.querySelectorAll('[data-rt]').forEach((b) => (b.onclick = async () => { const r = await sb().rpc('rate_ticket', { p_protocol: p, p_code: c, p_rating: +b.dataset.rt, p_comment: null }); TJ.toast(r.error ? errMsg(r.error) : 'Obrigado pela avaliação!', !!r.error); track(p, c); }));
    }
    $('#tf', v).onsubmit = (e) => { e.preventDefault(); const f = e.target; track(f.p.value.trim(), f.c.value.trim()); };
    v.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => { $('#tf', v).p.value = b.dataset.p; $('#tf', v).c.value = b.dataset.c; track(b.dataset.p, b.dataset.c); }));
    if (prot) { const m = mine.find((x) => x.protocol === prot); if (m) track(m.protocol, m.code); }
  };

  // =====================================================================
  // PAINEL
  // =====================================================================
  P.atendimento = async (el, [tab, id]) => {
    const mgr = TJ.can('manage_tickets');
    if (!tab) tab = mgr ? 'fila' : 'meus';
    if (!mgr && ['fila', 'categorias', 'respostas', 'faq'].includes(tab)) tab = 'meus';
    const tabs = (mgr ? [['fila', 'Fila de atendimento']] : []).concat([['meus', 'Meus chamados'], ['novo', 'Novo chamado']], mgr ? [['categorias', 'Categorias'], ['respostas', 'Respostas prontas'], ['faq', 'Perguntas frequentes']] : []);
    el.innerHTML = H.head('Atendimento', 'Linha de atendimento do Tribunal: chamados com protocolo, prazos e histórico.', `<a class="btn sm" href="#/atendimento" target="_blank" rel="noopener">Ver página pública ↗</a>`) + H.tabs('atendimento', tabs, tab === 'ver' ? '' : tab) + '<div id="tc"></div>';
    const tc = $('#tc', el);
    const fn = { fila: tabFila, meus: tabMeus, novo: tabNovo, categorias: tabCats, respostas: tabCanned, faq: tabFaq, ver: tabVer }[tab] || tabMeus;
    await fn(tc, id, mgr);
  };

  // ---------- novo chamado (membro) ----------
  async function tabNovo(tc) {
    const cats = await categories();
    tc.innerHTML = `<div class="card" style="max-width:720px"><form id="nf">
      <label style="margin-top:0">Categoria *</label><select name="cat" required><option value="">Selecione…</option>${catOpts(cats)}</select><p class="small muted" id="catd" style="margin:4px 0 0"></p>
      <label>Assunto *</label><input name="subject" maxlength="120" required>
      <label>Descrição *</label><textarea name="body" rows="7" maxlength="4000" required></textarea>
      <p style="margin-bottom:0"><button class="btn gold">Abrir chamado</button></p></form></div>`;
    const f = $('#nf', tc);
    f.cat.onchange = () => { const c = cats.find((x) => x.id === f.cat.value); $('#catd', tc).textContent = c ? `${c.description || ''} Prazo de resposta: até ${c.sla_hours} h.` : ''; };
    f.onsubmit = async (e) => {
      e.preventDefault(); f.querySelector('button').disabled = true;
      const { data, error } = await sb().rpc('open_ticket', { p_name: state.P.roblox_name, p_discord: null, p_category: f.cat.value, p_subject: f.subject.value, p_body: f.body.value });
      if (error) { f.querySelector('button').disabled = false; return TJ.toast(errMsg(error), true); }
      const r = Array.isArray(data) ? data[0] : data; TJ.toast('Chamado ' + r.protocol + ' aberto!');
      const { data: t } = await sb().from('tickets').select('id').eq('protocol', r.protocol).maybeSingle();
      location.hash = t ? '#/painel/atendimento/ver/' + t.id : '#/painel/atendimento/meus';
    };
  }

  const ticketRow = (t, cat, extra) => `<a class="tkrow" href="#/painel/atendimento/ver/${t.id}"><div class="grow"><div><b>${esc(t.protocol)}</b> · ${esc(t.subject)}</div><div class="small muted">${esc((cat?.icon ? cat.icon + ' ' : '') + (cat?.name || 'Sem categoria'))} · ${esc(t.requester_name)} · há ${esc(ago(t.created_at))}${extra || ''}</div></div><div class="row">${late(t, cat?.sla_hours) ? '<span class="tag bad">Atrasado</span>' : ''}${t.priority !== 'normal' ? TJ.tag(PR, t.priority) : ''}${TJ.tag(ST, t.status)}</div></a>`;

  // ---------- meus chamados ----------
  async function tabMeus(tc) {
    const [{ data }, cats] = await Promise.all([sb().from('tickets').select('*').eq('requester_id', state.U.id).order('created_at', { ascending: false }), categories(false)]);
    tc.innerHTML = (data || []).length ? `<div class="tklist">${data.map((t) => ticketRow(t, cats.find((c) => c.id === t.category_id))).join('')}</div>` : '<div class="empty">Você ainda não abriu chamados. Use <a href="#/painel/atendimento/novo">Novo chamado</a>.</div>';
  }

  // ---------- fila (equipe) ----------
  async function tabFila(tc) {
    const [{ data: all }, cats, { data: profs }] = await Promise.all([
      sb().from('tickets').select('*').order('created_at', { ascending: false }).limit(600), categories(false), sb().from('profiles').select('id,roblox_name,display_name').eq('active', true)]);
    const rows = all || [], me = state.U.id;
    const cnt = (f) => rows.filter(f).length, catOf = (t) => cats.find((c) => c.id === t.category_id);
    const lateN = cnt((t) => late(t, catOf(t)?.sla_hours));
    const rated = rows.filter((t) => t.rating), avg = rated.length ? rated.reduce((s, t) => s + t.rating, 0) / rated.length : null;
    const frs = rows.filter((t) => t.first_response_at).map((t) => (new Date(t.first_response_at) - new Date(t.created_at)) / 36e5), fr = frs.length ? frs.reduce((a, b) => a + b, 0) / frs.length : null;
    const f0 = Object.assign({ st: 'abertos', pr: '', cat: '', who: '', q: '' }, TJ.store.get('tj-tk-f', {}));
    tc.innerHTML = `<div class="grid g3 stats" style="margin-bottom:16px"><div class="card stat"><b>${cnt((t) => t.status === 'aberto')}</b><span class="muted">novos</span></div><div class="card stat"><b>${cnt((t) => t.status === 'em_atendimento')}</b><span class="muted">em atendimento</span></div><div class="card stat"><b>${lateN}</b><span class="muted">atrasados</span></div><div class="card stat"><b>${fr == null ? '—' : fr < 1 ? Math.round(fr * 60) + ' min' : fr.toFixed(1) + ' h'}</b><span class="muted">1ª resposta (média)</span></div><div class="card stat"><b>${avg == null ? '—' : avg.toFixed(1) + ' ★'}</b><span class="muted">avaliação (${rated.length})</span></div><div class="card stat"><b>${rows.length}</b><span class="muted">no total</span></div></div>
      <div class="toolbar"><input id="q" placeholder="Buscar protocolo, assunto ou nome…" value="${esc(f0.q)}" style="max-width:280px">
        <select id="st"><option value="abertos">Em aberto</option><option value="">Todas as situações</option>${kv(ST).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select>
        <select id="pr"><option value="">Qualquer prioridade</option>${kv(PR).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select>
        <select id="cat"><option value="">Todas as categorias</option>${cats.map((c) => `<option value="${c.id}">${esc((c.icon || '') + ' ' + c.name)}</option>`).join('')}</select>
        <select id="who"><option value="">Qualquer responsável</option><option value="me">Atribuídos a mim</option><option value="none">Sem responsável</option><option value="late">Só atrasados</option></select>
        <span class="grow"></span><button class="btn sm" id="csv">Exportar CSV</button></div><div id="lst"></div>`;
    ['st', 'pr', 'cat', 'who'].forEach((k) => ($('#' + k, tc).value = f0[k]));
    const draw = () => {
      const f = { st: $('#st', tc).value, pr: $('#pr', tc).value, cat: $('#cat', tc).value, who: $('#who', tc).value, q: $('#q', tc).value.trim() }; TJ.store.set('tj-tk-f', f);
      const q = f.q.toLowerCase();
      let l = rows.filter((t) => (f.st === 'abertos' ? OPEN.includes(t.status) : !f.st || t.status === f.st) && (!f.pr || t.priority === f.pr) && (!f.cat || t.category_id === f.cat)
        && (!f.who || (f.who === 'me' ? t.assignee_id === me : f.who === 'none' ? !t.assignee_id : late(t, catOf(t)?.sla_hours)))
        && (!q || [t.protocol, t.subject, t.requester_name].some((x) => String(x || '').toLowerCase().includes(q))));
      l = l.sort((a, b) => (late(b, catOf(b)?.sla_hours) - late(a, catOf(a)?.sla_hours)) || (PRK[a.priority] - PRK[b.priority]) || new Date(a.created_at) - new Date(b.created_at));
      draw.l = l;
      $('#lst', tc).innerHTML = l.length ? `<div class="tklist">${l.slice(0, 150).map((t) => ticketRow(t, catOf(t), t.assignee_id ? ' · resp.: ' + esc((profs || []).find((p) => p.id === t.assignee_id)?.display_name || '—') : ' · sem responsável')).join('')}</div>${l.length > 150 ? `<p class="small muted">Mostrando 150 de ${l.length}. Use os filtros.</p>` : ''}` : '<div class="empty">Nenhum chamado com esses filtros.</div>';
    };
    tc.querySelectorAll('select,input').forEach((i) => i.addEventListener('input', draw)); draw();
    $('#csv', tc).onclick = () => {
      const q = (s) => '"' + String(s ?? '').replace(/"/g, '""') + '"';
      const csv = ['protocolo;assunto;solicitante;categoria;situacao;prioridade;aberto_em;primeira_resposta;avaliacao'].concat(draw.l.map((t) => [t.protocol, t.subject, t.requester_name, catOf(t)?.name, ST[t.status][0], PR[t.priority][0], t.created_at, t.first_response_at, t.rating].map(q).join(';'))).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = 'chamados.csv'; a.click();
    };
  }

  // ---------- chamado ----------
  async function tabVer(tc, id, mgr) {
    const [{ data: t }, { data: msgs }, cats, { data: profs }, canned] = await Promise.all([
      sb().from('tickets').select('*').eq('id', id).maybeSingle(), sb().from('ticket_messages').select('*').eq('ticket_id', id).order('created_at'), categories(false),
      mgr ? sb().from('profiles').select('id,roblox_name,display_name').eq('active', true) : { data: [] }, mgr ? sb().from('canned_replies').select('*').order('title') : { data: [] }]);
    if (!t) { tc.innerHTML = '<div class="empty">Chamado não encontrado ou sem permissão. <a href="#/painel/atendimento">Voltar</a></div>'; return; }
    const cat = cats.find((c) => c.id === t.category_id), mine = t.requester_id === state.U.id, done = ['resolvido', 'arquivado'].includes(t.status);
    const nameOf = (uid) => (profs || []).find((p) => p.id === uid)?.display_name || '—';
    const me = state.P.display_name || state.P.roblox_name;
    const thread = (msgs || []).map((m) => bubble({ author: m.author_name, staff: m.is_staff, internal: m.internal, body: m.body, at: m.created_at })).join('');
    const slaTxt = cat ? (t.first_response_at ? 'respondido em ' + (((new Date(t.first_response_at) - new Date(t.created_at)) / 36e5) < 1 ? Math.round((new Date(t.first_response_at) - new Date(t.created_at)) / 60000) + ' min' : (((new Date(t.first_response_at) - new Date(t.created_at)) / 36e5).toFixed(1)) + ' h') : (late(t, cat.sla_hours) ? '<span class="tag bad">prazo vencido</span>' : 'prazo: ' + cat.sla_hours + ' h')) : '';
    tc.innerHTML = `<p><a href="#/painel/atendimento/${mgr ? 'fila' : 'meus'}">← Voltar</a></p><div class="tkgrid"><div>
      <div class="card"><div class="row spread"><h3 style="margin:0">${esc(t.protocol)} — ${esc(t.subject)}</h3>${TJ.tag(ST, t.status)}</div><div class="thread" style="margin-top:12px">${thread}</div></div>
      ${t.status !== 'arquivado' && (mgr || mine) ? `<div class="card" style="margin-top:14px"><form id="rf">
        ${mgr ? `<div class="row"><select id="cn" class="grow"><option value="">Resposta pronta…</option>${(canned.data || []).map((c) => `<option value="${c.id}">${esc(c.title)}</option>`).join('')}</select></div>` : ''}
        <textarea name="b" rows="4" maxlength="4000" required placeholder="${mgr ? 'Escreva a resposta ao solicitante…' : 'Escreva sua resposta…'}"></textarea>
        <div class="row spread" style="margin-top:8px">${mgr ? `<span><label class="chk" style="margin:0"><input type="checkbox" id="int"> Nota interna (só a equipe vê)</label><label class="chk" style="margin:0"><input type="checkbox" id="wait"> Marcar como aguardando solicitante</label></span>` : '<span></span>'}<button class="btn gold">Enviar</button></div></form></div>` : ''}
      ${mine && done && !t.rating ? `<div class="card" style="margin-top:14px"><b>Como foi o atendimento?</b><div class="chips" style="margin-top:8px">${[1, 2, 3, 4, 5].map((n) => `<button class="chip" data-rt="${n}">${'★'.repeat(n)}</button>`).join('')}</div></div>` : ''}</div>
      <div class="card tkside"><h3 style="margin-top:0">Detalhes</h3>
        <div class="small"><b>Solicitante:</b> ${esc(t.requester_name)} ${t.is_member ? '<span class="tag ok">membro</span>' : '<span class="tag gray">visitante</span>'}${t.requester_discord ? `<br><b>Discord:</b> ${esc(t.requester_discord)}` : ''}<br><b>Categoria:</b> ${esc((cat?.icon || '') + ' ' + (cat?.name || '—'))}<br><b>Aberto em:</b> ${esc(TJ.fmtDT(t.created_at))}<br><b>Atendimento:</b> ${slaTxt || '—'}${t.closed_at ? `<br><b>Encerrado:</b> ${esc(TJ.fmtDT(t.closed_at))}` : ''}${t.rating ? `<br><b>Avaliação:</b> ${'★'.repeat(t.rating)}${t.rating_comment ? ' — ' + esc(t.rating_comment) : ''}` : ''}${mgr ? `<br><b>Responsável:</b> ${t.assignee_id ? esc(nameOf(t.assignee_id)) : '—'}` : ''}</div>
        ${mgr ? `<hr><label style="margin-top:0">Situação</label><select id="fst">${kv(ST).map(([k, n]) => `<option value="${k}"${t.status === k ? ' selected' : ''}>${n}</option>`).join('')}</select>
          <label>Prioridade</label><select id="fpr">${kv(PR).map(([k, n]) => `<option value="${k}"${t.priority === k ? ' selected' : ''}>${n}</option>`).join('')}</select>
          <label>Categoria</label><select id="fct">${catOpts(cats, t.category_id)}</select>
          <label>Responsável</label><select id="fas"><option value="">— ninguém —</option>${(profs || []).map((p) => `<option value="${p.id}"${t.assignee_id === p.id ? ' selected' : ''}>${esc(p.display_name || p.roblox_name)}</option>`).join('')}</select>
          <p class="row" style="margin:14px 0 0"><button class="btn sm gold" id="take">Assumir</button><button class="btn sm" id="res">${done ? 'Reabrir' : 'Resolver'}</button><button class="btn sm" id="arc">Arquivar</button></p>
          ${!t.is_member ? '<p class="row" style="margin:8px 0 0"><button class="btn sm" id="cc">Copiar protocolo e código</button></p>' : ''}
          <p class="row" style="margin:8px 0 0"><button class="btn sm" id="dc">Avisar no Discord…</button><button class="btn sm danger" id="del">Excluir</button></p>` : ''}</div></div>`;
    const refresh = () => location.hash === '#/painel/atendimento/ver/' + id ? TJ.route() : null;
    const note = (txt) => sb().from('ticket_messages').insert({ ticket_id: id, author_id: state.U.id, author_name: 'Sistema', is_staff: true, internal: true, body: txt });
    const rf = $('#rf', tc);
    if (rf) {
      const cn = $('#cn', tc); if (cn) cn.onchange = () => { const c = (canned.data || []).find((x) => x.id === cn.value); if (c) rf.b.value = c.body.replace(/\{nome\}/g, t.requester_name); };
      rf.onsubmit = async (e) => {
        e.preventDefault(); const internal = !!$('#int', tc)?.checked; rf.querySelector('.gold').disabled = true;
        const r = await sb().from('ticket_messages').insert({ ticket_id: id, author_id: state.U.id, author_name: mgr ? me : t.requester_name, is_staff: !!mgr, internal, body: rf.b.value.trim() });
        if (r.error) { rf.querySelector('.gold').disabled = false; return TJ.toast(errMsg(r.error), true); }
        if (mgr && !internal && $('#wait', tc)?.checked) await sb().from('tickets').update({ status: 'aguardando' }).eq('id', id);
        TJ.toast(internal ? 'Nota interna salva.' : 'Mensagem enviada.'); refresh();
      };
    }
    tc.querySelectorAll('[data-rt]').forEach((b) => (b.onclick = async () => { const r = await sb().rpc('rate_ticket', { p_protocol: t.protocol, p_code: t.access_code, p_rating: +b.dataset.rt, p_comment: null }); TJ.toast(r.error ? errMsg(r.error) : 'Obrigado pela avaliação!', !!r.error); refresh(); }));
    if (!mgr) return;
    const upd = async (patch, why) => { const r = await sb().from('tickets').update(patch).eq('id', id); if (r.error) return TJ.toast(errMsg(r.error), true); await note(`${me}: ${why}`); TJ.toast('Atualizado.'); refresh(); };
    $('#fst', tc).onchange = (e) => upd({ status: e.target.value }, 'situação → ' + ST[e.target.value][0]);
    $('#fpr', tc).onchange = (e) => upd({ priority: e.target.value }, 'prioridade → ' + PR[e.target.value][0]);
    $('#fct', tc).onchange = (e) => upd({ category_id: e.target.value }, 'categoria → ' + (cats.find((c) => c.id === e.target.value)?.name || ''));
    $('#fas', tc).onchange = (e) => upd({ assignee_id: e.target.value || null, status: t.status === 'aberto' && e.target.value ? 'em_atendimento' : t.status }, 'responsável → ' + (e.target.value ? nameOf(e.target.value) : 'ninguém'));
    $('#take', tc).onclick = () => upd({ assignee_id: state.U.id, status: t.status === 'aberto' ? 'em_atendimento' : t.status }, 'assumiu o chamado');
    $('#res', tc).onclick = () => upd({ status: done ? 'aberto' : 'resolvido' }, done ? 'reabriu o chamado' : 'resolveu o chamado');
    $('#arc', tc).onclick = () => upd({ status: 'arquivado' }, 'arquivou o chamado');
    const cc = $('#cc', tc); if (cc) cc.onclick = () => TJ.copy(`Seu chamado foi aberto.\nProtocolo: ${t.protocol}\nCódigo: ${t.access_code}\nAcompanhe em: ${H.siteUrl ? H.siteUrl() : location.origin + location.pathname}#/atendimento/acompanhar/${t.protocol}`, 'Copiado! Envie ao solicitante.');
    $('#dc', tc).onclick = () => TJ.discordSend({ content: `**Chamado ${t.protocol}** — ${t.subject}\n> Situação: ${ST[t.status][0]} · Prioridade: ${PR[t.priority][0]}\n> Solicitante: ${t.requester_name}`, title: t.protocol });
    $('#del', tc).onclick = async () => { if (!confirm('Excluir este chamado e todas as mensagens? Não dá para desfazer. (Prefira arquivar.)')) return; const r = await sb().from('tickets').delete().eq('id', id); if (r.error) return TJ.toast(errMsg(r.error), true); TJ.toast('Chamado excluído.'); location.hash = '#/painel/atendimento/fila'; };
  }

  // ---------- configurações (equipe) ----------
  async function tabCats(tc) {
    tc.innerHTML = '<div class="card" style="margin-bottom:14px"><b>Categorias do atendimento</b><p class="small muted" style="margin:4px 0 0">Cada categoria tem um prazo de resposta (em horas). Se passar do prazo sem resposta, o chamado aparece como <b>atrasado</b>. “Só membros” esconde a categoria de visitantes.</p></div><div id="l"></div>';
    await TJ.crud($('#l', tc), { id: 'tcats', table: 'ticket_categories', order: ['sort'], newLabel: 'Nova categoria', canWrite: true, defaults: { active: true, sla_hours: 48, sort: 10, members_only: false },
      fields: [{ k: 'name', label: 'Nome', req: true }, { k: 'icon', label: 'Ícone (emoji)', ph: '⚖️' }, { k: 'description', label: 'Descrição (aparece para quem abre o chamado)', type: 'textarea', rows: 2 }, { k: 'sla_hours', label: 'Prazo de resposta (horas)', type: 'number' }, { k: 'sort', label: 'Ordem', type: 'number' }, { k: 'members_only', label: 'Só para membros logados', type: 'bool' }, { k: 'active', label: 'Ativa', type: 'bool' }],
      cols: [{ label: 'Categoria', fmt: (r) => esc((r.icon || '') + ' ' + r.name) }, { label: 'Prazo', fmt: (r) => esc(r.sla_hours + ' h') }, { label: 'Só membros', fmt: F.yn('members_only') }, { label: 'Ativa', fmt: F.yn('active') }, { label: 'Ordem', k: 'sort' }] });
  }
  async function tabCanned(tc) {
    tc.innerHTML = '<div class="card" style="margin-bottom:14px"><b>Respostas prontas</b><p class="small muted" style="margin:4px 0 0">Modelos para responder rápido. Use <code>{nome}</code> para inserir o nome do solicitante.</p></div><div id="l"></div>';
    await TJ.crud($('#l', tc), { id: 'canned', table: 'canned_replies', order: ['title'], newLabel: 'Nova resposta', canWrite: true, fields: [{ k: 'title', label: 'Título', req: true }, { k: 'body', label: 'Texto', type: 'textarea', rows: 6, req: true }], cols: [{ label: 'Título', k: 'title' }, { label: 'Texto', fmt: F.cut('body', 110) }] });
  }
  async function tabFaq(tc) {
    tc.innerHTML = '<div class="card" style="margin-bottom:14px"><b>Perguntas frequentes</b><p class="small muted" style="margin:4px 0 0">Aparecem na página pública de Atendimento.</p></div><div id="l"></div>';
    await TJ.crud($('#l', tc), { id: 'faq', table: 'faq', order: ['sort'], newLabel: 'Nova pergunta', canWrite: true, defaults: { active: true, sort: 10 }, fields: [{ k: 'question', label: 'Pergunta', req: true }, { k: 'answer', label: 'Resposta', type: 'textarea', rows: 5, req: true }, { k: 'sort', label: 'Ordem', type: 'number' }, { k: 'active', label: 'Visível', type: 'bool' }], cols: [{ label: 'Pergunta', k: 'question' }, { label: 'Resposta', fmt: F.cut('answer', 90) }, { label: 'Visível', fmt: F.yn('active') }, { label: 'Ordem', k: 'sort' }] });
  }
})();
