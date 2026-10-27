/* Painel do Tribunal - Seleção (v3): visão geral, vagas, candidatos, agenda de entrevistas, entrevista, perguntas, vagas internas */
(function () {
  const TJ = window.TJ, esc = TJ.esc, $ = TJ.$, L = TJ.L, state = TJ.state, H = TJ.H, P = TJ.P, F = H.F, opts = H.opts;
  const sb = () => TJ.sb;
  const rnd = (n) => crypto.getRandomValues(new Uint32Array(1))[0] % n;
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const auto = (ev, vars) => (TJ.automate ? TJ.automate(ev, vars) : null);
  const LV = Object.entries(L.level), TY = Object.entries(L.qtype);
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const lvKey = (s) => { s = norm(s); if (s.startsWith('inex') || s === '0') return 'inexistente'; if (s.startsWith('bas') || s === '1') return 'basico'; if (s.startsWith('inter') || s === '2') return 'intermediario'; if (s.startsWith('av') || s === '3') return 'avancado'; return null; };
  const tyKey = (s) => { s = norm(s); if (s.startsWith('term') || s.startsWith('conc') || s.startsWith('def')) return 'termo'; if (s.startsWith('cod') || s.startsWith('lei') || s.startsWith('art')) return 'codigo'; if (s.startsWith('sit') || s.startsWith('caso') || s.startsWith('prat')) return 'situacao'; return null; };
  const hhmm = (d) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dayLong = (d) => new Date(d).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const STATUS_ORDER = ['recebida', 'aprovada_para_entrevista', 'entrevistada', 'aprovada', 'reprovada'];

  const stageHead = (n, t, d) => `<div class="stagehead"><span class="stagenum">${n}</span><div><b>${t}</b><div class="small muted">${d}</div></div></div>`;
  async function getRounds() {
    const { data } = await sb().from('selection_rounds').select('*').order('created_at', { ascending: false });
    return data || [];
  }
  const roundPicker = (rounds, id, withAll) => `<select id="rd">${withAll ? '<option value="">Todas as vagas</option>' : ''}${rounds.map((r) => `<option value="${r.id}"${r.id === id ? ' selected' : ''}>${esc(r.title)}${r.audience === 'interno' ? ' (interna)' : ''}</option>`).join('')}</select>`;
  const savedRound = (rounds) => { const id = TJ.store.get('tj-sel-round', ''); return rounds.find((r) => r.id === id) ? id : (rounds[0]?.id || ''); };

  // =====================================================================
  P.selecao = async (el, [tab = 'geral']) => {
    el.innerHTML = H.head('Processo seletivo', 'Vagas, candidatos, agenda de entrevistas, avaliação e banco de perguntas.') +
      H.tabs('selecao', [['geral', 'Visão geral'], ['vagas', '1 · Vaga'], ['candidatos', '2 · Triagem'], ['agenda', '3 · Agenda'], ['entrevista', '4 · Entrevista'], ['resultado', '5 · Resultado'], ['perguntas', 'Perguntas']], tab) + '<div id="tc"></div>';
    const tc = $('#tc', el), can = TJ.can('manage_selection');
    const fn = { geral: tabGeral, vagas: tabVagas, candidatos: tabCandidatos, agenda: tabAgenda, entrevista: tabEntrevista, resultado: tabResultado, perguntas: tabPerguntas }[tab] || tabGeral;
    await fn(tc, can);
  };

  // ---------- visão geral ----------
  async function tabGeral(tc) {
    const rounds = await getRounds();
    if (!rounds.length) { tc.innerHTML = '<div class="empty">Crie uma vaga na aba <b>Vagas e formulário</b> para começar.</div>'; return; }
    const hidden = TJ.store.get('tj-sel-geral-off', []);
    const rid = TJ.store.get('tj-sel-geral-round', '');
    tc.innerHTML = `<div class="toolbar">${roundPicker(rounds, rid, true)}<span class="grow"></span><span class="popwrap"><button class="btn sm" id="gear">⚙ Blocos</button><div class="pop" id="pop" hidden><h4>Mostrar blocos</h4>${[['funnel', 'Funil por situação'], ['next', 'Próximas entrevistas'], ['rank', 'Ranking de notas'], ['todo', 'Pendências']].map(([k, t]) => `<label class="chk"><input type="checkbox" data-b="${k}"${hidden.includes(k) ? '' : ' checked'}> ${t}</label>`).join('')}</div></span></div><div id="gv"></div>`;
    $('#gear', tc).onclick = (e) => { e.stopPropagation(); $('#pop', tc).hidden = !$('#pop', tc).hidden; };
    $('#pop', tc).onclick = (e) => e.stopPropagation();
    $('#pop', tc).querySelectorAll('[data-b]').forEach((cb) => (cb.onchange = () => { const off = [...$('#pop', tc).querySelectorAll('[data-b]')].filter((x) => !x.checked).map((x) => x.dataset.b); TJ.store.set('tj-sel-geral-off', off); draw(); }));
    $('#rd', tc).onchange = () => { TJ.store.set('tj-sel-geral-round', $('#rd', tc).value); draw(); };
    const draw = async () => {
      const off = TJ.store.get('tj-sel-geral-off', []), id = $('#rd', tc).value;
      let q = sb().from('applications').select('id,round_id,roblox_name,status,score,interview_at,interview_place'); if (id) q = q.eq('round_id', id);
      const { data } = await q; const apps = data || [];
      const now = Date.now(), cnt = (s) => apps.filter((a) => a.status === s).length;
      const scored = apps.filter((a) => a.score != null), avg = scored.length ? scored.reduce((s, a) => s + Number(a.score), 0) / scored.length : null;
      const sched = apps.filter((a) => a.interview_at && new Date(a.interview_at) >= now && a.status !== 'reprovada').sort((a, b) => new Date(a.interview_at) - new Date(b.interview_at));
      const noSlot = apps.filter((a) => a.status === 'aprovada_para_entrevista' && !a.interview_at);
      const stat = (n, t) => `<div class="card stat"><b>${n}</b><span class="muted">${t}</span></div>`;
      const tot = apps.length || 1;
      let h = `<div class="grid g3 stats">${stat(apps.length, 'candidaturas')}${stat(sched.length, 'entrevistas marcadas')}${stat(cnt('aprovada'), 'aprovados')}${stat(avg == null ? '—' : avg.toFixed(1), 'nota média')}</div><div class="grid g2" style="margin-top:16px;align-items:start">`;
      if (!off.includes('funnel')) h += `<div class="card"><h3>Funil por situação</h3><div class="funnel">${STATUS_ORDER.map((s) => `<div class="fr"><span>${esc(L.app[s])}</span><div class="bar"><i style="width:${Math.round((cnt(s) / tot) * 100)}%"></i></div><b>${cnt(s)}</b></div>`).join('')}</div></div>`;
      if (!off.includes('next')) h += `<div class="card"><h3>Próximas entrevistas</h3>${sched.length ? sched.slice(0, 8).map((a) => `<div class="slot"><time>${esc(hhmm(a.interview_at))}</time><div><b>${esc(a.roblox_name)}</b><div class="small muted">${esc(dayLong(a.interview_at))}${a.interview_place ? ' · ' + esc(a.interview_place) : ''}</div></div></div>`).join('') : '<p class="muted">Nenhuma entrevista marcada.</p>'}<p style="margin-bottom:0"><a href="#/painel/selecao/agenda">Abrir agenda →</a></p></div>`;
      if (!off.includes('rank')) h += `<div class="card"><h3>Ranking de notas</h3>${scored.length ? scored.sort((a, b) => b.score - a.score).slice(0, 6).map((a, i) => `<div class="item row spread"><span>${i + 1}º <b>${esc(a.roblox_name)}</b></span><span class="tag ${a.score >= 7 ? 'ok' : a.score >= 5 ? 'warn' : 'bad'}">${Number(a.score).toFixed(1)}</span></div>`).join('') : '<p class="muted">Ainda não há notas.</p>'}</div>`;
      if (!off.includes('todo')) h += `<div class="card"><h3>Pendências</h3><div class="item">${cnt('recebida')} candidatura(s) para analisar</div><div class="item">${noSlot.length} aprovado(s) para entrevista sem horário</div><div class="item">${cnt('entrevistada')} entrevistado(s) aguardando resultado</div><p style="margin-bottom:0"><a href="#/painel/selecao/candidatos">Abrir candidatos →</a></p></div>`;
      $('#gv', tc).innerHTML = h + '</div>';
    };
    document.addEventListener('click', () => { const p = $('#pop', tc); if (p) p.hidden = true; }, { once: true });
    await draw();
  }

  // ---------- vagas ----------
  async function tabVagas(tc, can) {
    tc.innerHTML = stageHead(1, 'Vaga e formulário', 'Crie a vaga, monte o formulário de inscrição, defina o prazo, o banner e os critérios de avaliação.') + '<div id="vg"></div>';
    await TJ.crud($('#vg', tc), { id: 'rounds', table: 'selection_rounds', order: ['created_at', false], newLabel: 'Nova vaga', canWrite: can, defaults: { status: 'aberto', is_public: true, audience: 'publico', form_fields: [], rubric: [], show_schedule: false },
      afterSave: async (p, row, isNew) => { if (p.status === 'aberto' && p.audience === 'publico' && (isNew || row.status !== 'aberto')) await auto('round_open', { titulo: p.title, prazo: p.closes_at ? TJ.fmtDT(p.closes_at) : 'sem prazo definido' }); },
      filters: [{ k: 'status', label: 'Situação', opts: opts(L.round) }, { k: 'audience', label: 'Público', opts: [['publico', 'Público (site)'], ['interno', 'Interno (painel)']] }],
      fields: [
        { k: 'title', label: 'Título', req: true, ph: 'Ex.: Seleção de Advogados — Novembro' },
        { k: 'audience', label: 'Quem pode se candidatar', type: 'select', opts: [['publico', 'Qualquer pessoa, pelo site'], ['interno', 'Só membros, pelo painel (Vagas internas)']] },
        { k: 'role_key', label: 'Cargo da vaga', type: 'select', opts: async () => [['', '—']].concat(await H.rolesOpts()) },
        { k: 'status', label: 'Situação', type: 'select', opts: opts(L.round) },
        { k: 'closes_at', label: 'Inscrições até', type: 'datetime', help: 'Depois dessa data e hora, as inscrições se fecham sozinhas.' },
        { k: 'banner_url', label: 'Imagem de banner da vaga (opcional)', upload: 'midia' },
        { k: 'description', label: 'Descrição', type: 'textarea' },
        { k: 'requirements', label: 'Requisitos', type: 'textarea', rows: 4 },
        { k: 'form_fields', label: 'Formulário de inscrição', type: 'formbuilder', help: 'Nome do Roblox e Discord já vêm no formulário. Monte aqui as demais perguntas. Se deixar vazio, usa o formulário padrão (experiência e motivação).' },
        { k: 'rubric', label: 'Critérios de avaliação da entrevista (opcional)', type: 'rubric', help: 'Um critério por linha, no formato: Nome | peso. Na aba Entrevista você dá uma nota de 0 a 10 para cada um e o sistema calcula a média ponderada.' },
        { k: 'show_schedule', label: 'Mostrar a agenda de entrevistas no site (nome e horário)', type: 'bool' },
        { k: 'is_public', label: 'Mostrar a vaga no site (vagas públicas)', type: 'bool' },
      ],
      beforeSave: (p) => { if (p.audience === 'interno') { p.is_public = false; p.show_schedule = false; } },
      cols: [{ label: 'Título', k: 'title' }, { label: 'Público', fmt: (r) => (r.audience === 'interno' ? '<span class="tag warn">Interno</span>' : '<span class="tag">Site</span>') }, { label: 'Situação', fmt: (r) => TJ.tag(L.round, r.status) }, { label: 'Perguntas', fmt: (r) => esc(String((r.form_fields || []).length || 'padrão')) }, { label: 'Critérios', fmt: (r) => esc(String((r.rubric || []).length || '—')) }, { label: 'Até', fmt: F.dt('closes_at') }, { label: 'Agenda no site', fmt: F.yn('show_schedule') }] });
  }

  // ---------- candidatos ----------
  async function tabCandidatos(tc, can) {
    const rounds = await getRounds();
    if (!rounds.length) { tc.innerHTML = '<div class="empty">Crie uma vaga primeiro.</div>'; return; }
    const rid0 = savedRound(rounds);
    tc.innerHTML = stageHead(2, 'Triagem', 'Leia as inscrições e decida quem segue para a entrevista (botão Entrevistar). Depois sorteie a ordem, se quiser.') + `<div class="toolbar">${roundPicker(rounds, rid0)}
      <button class="btn sm" id="draw">🎲 Sortear ordem</button><button class="btn sm" id="exp">Ordem p/ Discord</button><button class="btn sm" id="res">Aprovados p/ Discord</button>
      <span class="popwrap"><button class="btn sm" id="bulk">⚡ Em massa</button><div class="pop" id="bpop" hidden><h4>Triagem em massa</h4><p style="margin:0"><button class="btn sm gold" id="ball">Chamar todas as recebidas p/ entrevista</button></p></div></span></div><div id="lst"></div>`;
    const rid = () => $('#rd', tc).value;
    const setStatus = (status) => async (r, reload) => { const u = await sb().from('applications').update({ status }).eq('id', r.id); TJ.toast(u.error ? u.error.message : 'Situação atualizada.', !!u.error); reload(); };
    const show = () => { TJ.store.set('tj-sel-round', rid()); return TJ.crud($('#lst', tc), { id: 'applications', table: 'applications', select: '*', filter: { round_id: rid() }, order: ['created_at', false], canWrite: can, noCreate: true, canDelete: true, editLabel: 'Candidato',
      header: (r) => `<div class="card" style="margin:10px 0;background:var(--soft)"><b>@${esc(r.roblox_name)}</b>${r.discord_user ? ` · Discord: ${esc(r.discord_user)}` : ''}<br>${TJ.answersHTML(r)}${(r.interview_log || []).length ? `<p class="small muted">Entrevista registrada: nota ${esc(String(r.score ?? '—'))}</p>` : ''}</div>`,
      fields: [{ k: 'status', label: 'Situação', type: 'select', opts: opts(L.app) }, { k: 'interview_at', label: 'Data e hora da entrevista', type: 'datetime' }, { k: 'interview_place', label: 'Local / canal da entrevista' }, { k: 'interview_by', label: 'Entrevistador(a)' }, { k: 'interview_order', label: 'Ordem da entrevista', type: 'number' }, { k: 'score', label: 'Nota final (0 a 10)', type: 'number' }, { k: 'notes', label: 'Anotações internas', type: 'textarea', rows: 3 }],
      filters: [{ k: 'status', label: 'Situação', opts: opts(L.app) }],
      cols: [{ label: 'Ordem', k: 'interview_order' }, { label: 'Roblox', k: 'roblox_name' }, { label: 'Discord', k: 'discord_user' }, { label: 'Situação', fmt: (r) => `<span class="tag ${L.appTone[r.status] || ''}">${esc(L.app[r.status] || r.status)}</span>` }, { label: 'Entrevista', fmt: F.dt('interview_at') }, { label: 'Local', k: 'interview_place' }, { label: 'Entrevistador', k: 'interview_by' }, { label: 'Nota', k: 'score' }, { label: 'Enviada', fmt: F.date('created_at') }, { label: 'Respostas', fmt: (r) => esc(((r.answers || []).map((x) => x.a).join(' | ') || r.experience || '').slice(0, 60)) }],
      actions: can ? [{ label: 'Entrevistar', fn: (r) => setStatus('aprovada_para_entrevista')(r, TJ.reloadCrud) }, { label: 'Aprovar', fn: (r) => setStatus('aprovada')(r, TJ.reloadCrud) }, { label: 'Reprovar', fn: (r) => setStatus('reprovada')(r, TJ.reloadCrud) }] : null }); };
    $('#rd', tc).onchange = show; await show();
    $('#bulk', tc).onclick = (e) => { e.stopPropagation(); $('#bpop', tc).hidden = !$('#bpop', tc).hidden; };
    $('#bpop', tc).onclick = (e) => e.stopPropagation();
    document.addEventListener('click', () => { const p = $('#bpop', tc); if (p) p.hidden = true; }, { once: true });
    $('#ball', tc).onclick = async () => {
      if (!confirm('Mudar todas as candidaturas "Recebida" desta vaga para "Aprovado p/ entrevista"?')) return;
      const r = await sb().from('applications').update({ status: 'aprovada_para_entrevista' }).eq('round_id', rid()).eq('status', 'recebida');
      TJ.toast(r.error ? r.error.message : 'Candidatos chamados para entrevista.', !!r.error); $('#bpop', tc).hidden = true; show();
    };
    $('#draw', tc).onclick = async () => {
      const { data } = await sb().from('applications').select('id').eq('round_id', rid()).eq('status', 'aprovada_para_entrevista');
      if (!(data || []).length) return TJ.toast('Nenhum candidato com situação "Aprovado p/ entrevista" (use o botão Entrevistar).', true);
      const ids = shuffle(data.map((x) => x.id));
      for (let i = 0; i < ids.length; i++) { const r = await sb().from('applications').update({ interview_order: i + 1 }).eq('id', ids[i]); if (r.error) return TJ.toast(r.error.message, true); }
      TJ.toast('Ordem sorteada!'); show();
    };
    $('#exp', tc).onclick = async () => {
      const t = rounds.find((r) => r.id === rid())?.title;
      const { data } = await sb().from('applications').select('roblox_name,interview_order').eq('round_id', rid()).not('interview_order', 'is', null).order('interview_order');
      if (!(data || []).length) return TJ.toast('Sorteie a ordem primeiro.', true);
      TJ.discordSend({ content: `# Ordem das entrevistas\n-# ${t}\n` + data.map((x) => `> **${x.interview_order}º** — ${x.roblox_name}`).join('\n'), title: 'Ordem das entrevistas' });
    };
    $('#res', tc).onclick = async () => {
      const t = rounds.find((r) => r.id === rid())?.title;
      const { data } = await sb().from('applications').select('roblox_name').eq('round_id', rid()).eq('status', 'aprovada').order('roblox_name');
      if (!(data || []).length) return TJ.toast('Nenhum candidato aprovado ainda.', true);
      TJ.discordSend({ content: `# Resultado do processo seletivo\n-# ${t}\nParabéns aos aprovados:\n` + data.map((x) => `> **${x.roblox_name}**`).join('\n'), title: 'Resultado' });
    };
  }

  // ---------- agenda de entrevistas ----------
  function buildPlan(list, o) {
    const [sh, sm] = o.startTime.split(':').map(Number), [eh, em] = o.endTime.split(':').map(Number);
    const startOf = (d) => { const x = new Date(d); x.setHours(sh, sm, 0, 0); return x; };
    const endOf = (d) => { const x = new Date(d); x.setHours(eh, em, 0, 0); return x; };
    const valid = (d) => { let x = new Date(d); let guard = 0; while (o.skipWeekends && [0, 6].includes(x.getDay()) && guard++ < 14) { x.setDate(x.getDate() + 1); x = startOf(x); } return x; };
    let t = valid(new Date(`${o.startDate}T${o.startTime}:00`)); const out = [];
    for (const c of list) {
      if (t.getTime() + o.dur * 60000 > endOf(t).getTime()) { const n = new Date(t); n.setDate(n.getDate() + 1); t = valid(startOf(n)); }
      out.push({ c, at: new Date(t) });
      t = new Date(t.getTime() + (o.dur + o.gap) * 60000);
    }
    return out;
  }
  const scheduleText = (title, rows) => {
    let out = `# Agenda de entrevistas\n-# ${title}\n`, last = '';
    rows.forEach((a) => { const k = dayKey(a.interview_at); if (k !== last) { out += `**${dayLong(a.interview_at)}**\n`; last = k; } out += `> ${hhmm(a.interview_at)} — **${a.roblox_name}**${a.interview_place ? ' (' + a.interview_place + ')' : ''}\n`; });
    return out.trim();
  };

  async function tabAgenda(tc, can) {
    const rounds = await getRounds();
    if (!rounds.length) { tc.innerHTML = '<div class="empty">Crie uma vaga primeiro.</div>'; return; }
    const today = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
    tc.innerHTML = stageHead(3, 'Agenda de entrevistas', 'Marque data, hora, local e entrevistador de cada pessoa, manualmente (clique no horário) ou de forma automática.') + `<div class="toolbar">${roundPicker(rounds, savedRound(rounds))}</div>
      ${can ? `<div class="card" style="margin-bottom:18px"><h3>Montar horários automaticamente</h3>
        <div class="grid g3" style="align-items:end">
          <div><label>Primeiro dia</label><input type="date" id="pd" value="${today}"></div><div><label>Começa às</label><input type="time" id="ps" value="${TJ.store.get('tj-ag-ps','14:00')}"></div><div><label>Termina até</label><input type="time" id="pe" value="${TJ.store.get('tj-ag-pe','20:00')}"></div>
          <div><label>Duração (min)</label><input type="number" id="pdur" value="${TJ.store.get('tj-ag-dur','15')}" min="5" step="5"></div><div><label>Intervalo (min)</label><input type="number" id="pgap" value="${TJ.store.get('tj-ag-gap','5')}" min="0" step="5"></div><div><label>Quem entra</label><select id="pw"><option value="new">Aprovados p/ entrevista, sem horário</option><option value="all">Aprovados p/ entrevista (refazer todos)</option><option value="open">Todos que não foram reprovados</option></select></div>
        </div>
        <div class="grid g2"><div><label>Local / canal</label><input id="ppl" value="${esc(TJ.store.get('tj-ag-pl',''))}" placeholder="Ex.: Sala de voz Entrevistas"></div><div><label>Entrevistador(a)</label><input id="pby" value="${esc(TJ.store.get('tj-ag-by',''))}" placeholder="Ex.: Daniel"></div></div>
        <label class="chk"><input type="checkbox" id="pwk"> Pular sábados e domingos</label><label class="chk"><input type="checkbox" id="prn"> Sortear a ordem (senão segue a ordem já definida / de inscrição)</label>
        <p style="margin-bottom:0"><button class="btn blue" id="pgen">Ver horários propostos</button></p></div>` : ''}
      <div class="card"><div class="row spread"><h3 style="margin:0">Entrevistas marcadas</h3><div class="row"><button class="btn sm" id="acopy">Copiar p/ Discord</button><button class="btn sm" id="asend">Enviar ao Discord…</button>${can ? '<button class="btn sm" id="aag">Pôr na Agenda do tribunal</button><button class="btn sm" id="apub"></button><button class="btn sm danger" id="aclr">Limpar horários</button>' : ''}</div></div><div id="ag"></div></div>`;
    const rid = () => $('#rd', tc).value;
    const round = () => rounds.find((r) => r.id === rid());
    async function load() {
      TJ.store.set('tj-sel-round', rid());
      const { data } = await sb().from('applications').select('*').eq('round_id', rid()).not('interview_at', 'is', null).order('interview_at');
      const rows = (data || []).filter((a) => a.status !== 'reprovada'); load.rows = rows;
      let h = '', last = '';
      rows.forEach((a) => { const k = dayKey(a.interview_at); if (k !== last) { h += `<div class="agday">${esc(dayLong(a.interview_at))}</div>`; last = k; } h += `<div class="slot" data-id="${a.id}" style="cursor:pointer"><time>${esc(hhmm(a.interview_at))}</time><div class="grow"><b>${esc(a.roblox_name)}</b><div class="small muted">${a.interview_place ? esc(a.interview_place) : 'sem local'}${a.interview_by ? ' · ' + esc(a.interview_by) : ''}</div></div><span class="tag ${L.appTone[a.status] || ''}">${esc(L.app[a.status] || a.status)}</span></div>`; });
      $('#ag', tc).innerHTML = h || '<p class="muted">Nenhuma entrevista marcada nesta vaga.</p>';
      $('#ag', tc).querySelectorAll('.slot').forEach((s) => (s.onclick = () => { if (!can) return; const row = rows.find((x) => x.id === s.dataset.id); TJ.openForm({ table: 'applications', editLabel: 'Entrevista', canDelete: false,
        fields: [{ k: 'interview_at', label: 'Data e hora', type: 'datetime' }, { k: 'interview_place', label: 'Local / canal' }, { k: 'interview_by', label: 'Entrevistador(a)' }, { k: 'status', label: 'Situação', type: 'select', opts: opts(L.app) }],
        header: (r) => `<p><b>@${esc(r.roblox_name)}</b></p>` }, row, load); }));
      const b = $('#apub', tc); if (b) b.textContent = round()?.show_schedule ? 'Esconder agenda do site' : 'Mostrar agenda no site';
    }
    $('#rd', tc).onchange = load; await load();
    $('#acopy', tc).onclick = () => { if (!load.rows.length) return TJ.toast('Nada marcado ainda.', true); TJ.copy(scheduleText(round().title, load.rows), 'Agenda copiada em markdown!'); };
    $('#asend', tc).onclick = () => { if (!load.rows.length) return TJ.toast('Nada marcado ainda.', true); TJ.discordSend({ content: scheduleText(round().title, load.rows), title: 'Agenda de entrevistas' }); };
    if (!can) return;
    $('#apub', tc).onclick = async () => { const r = round(); const u = await sb().from('selection_rounds').update({ show_schedule: !r.show_schedule }).eq('id', r.id); if (u.error) return TJ.toast(u.error.message, true); r.show_schedule = !r.show_schedule; TJ.toast(r.show_schedule ? 'Agenda visível no site (se a vaga for pública).' : 'Agenda escondida do site.'); load(); };
    $('#aclr', tc).onclick = async () => { if (!confirm('Remover o horário de todos os candidatos desta vaga?')) return; const u = await sb().from('applications').update({ interview_at: null, interview_place: null, interview_by: null }).eq('round_id', rid()); TJ.toast(u.error ? u.error.message : 'Horários removidos.', !!u.error); load(); };
    $('#aag', tc).onclick = async () => {
      if (!load.rows.length) return TJ.toast('Nada marcado ainda.', true);
      if (!confirm(`Criar ${load.rows.length} compromisso(s) internos na Agenda do tribunal?`)) return;
      const r = await sb().from('hearings').insert(load.rows.map((a) => ({ title: `Entrevista — ${a.roblox_name}`, kind: 'entrevista', starts_at: a.interview_at, place: a.interview_place || null, notes: a.interview_by ? 'Entrevistador: ' + a.interview_by : null, is_public: false })));
      TJ.toast(r.error ? r.error.message : 'Adicionado à Agenda do tribunal.', !!r.error);
    };
    $('#pgen', tc).onclick = async () => {
      const w = $('#pw', tc).value;
      let q = sb().from('applications').select('*').eq('round_id', rid());
      q = w === 'open' ? q.neq('status', 'reprovada') : q.eq('status', 'aprovada_para_entrevista');
      const { data } = await q; let list = (data || []).filter((a) => w === 'new' ? !a.interview_at : true);
      if (!list.length) return TJ.toast('Nenhum candidato para agendar com esse critério.', true);
      list = $('#prn', tc).checked ? shuffle(list) : list.slice().sort((a, b) => (a.interview_order ?? 9999) - (b.interview_order ?? 9999) || new Date(a.created_at) - new Date(b.created_at));
      const o = { startDate: $('#pd', tc).value, startTime: $('#ps', tc).value || '14:00', endTime: $('#pe', tc).value || '20:00', dur: Math.max(5, +$('#pdur', tc).value || 15), gap: Math.max(0, +$('#pgap', tc).value || 0), skipWeekends: $('#pwk', tc).checked };
      if (!o.startDate) return TJ.toast('Escolha o primeiro dia.', true);
      TJ.store.set('tj-ag-ps', o.startTime); TJ.store.set('tj-ag-pe', o.endTime); TJ.store.set('tj-ag-dur', String(o.dur)); TJ.store.set('tj-ag-gap', String(o.gap)); TJ.store.set('tj-ag-pl', $('#ppl', tc).value.trim()); TJ.store.set('tj-ag-by', $('#pby', tc).value.trim());
      const plan = buildPlan(list, o), place = $('#ppl', tc).value.trim() || null, by = $('#pby', tc).value.trim() || null;
      TJ.dlg(`<h3>Horários propostos</h3><p class="muted small">${plan.length} entrevista(s). Confira e aplique. Você ainda pode ajustar cada uma depois.</p><div class="hist" style="max-height:340px">${plan.map((p, i) => `<div class="item"><b>${i + 1}.</b> ${esc(p.c.roblox_name)} — ${esc(dayLong(p.at))}, <b>${esc(hhmm(p.at))}</b></div>`).join('')}</div>
        <p class="row" style="margin-top:16px"><button class="btn gold" id="pap">Aplicar horários</button><button class="btn" data-close>Cancelar</button></p>`, (d) => {
        d.querySelector('#pap').onclick = async () => {
          d.querySelector('#pap').disabled = true;
          for (let i = 0; i < plan.length; i++) {
            const p = plan[i];
            const r = await sb().from('applications').update({ interview_at: p.at.toISOString(), interview_order: i + 1, interview_place: place, interview_by: by }).eq('id', p.c.id);
            if (r.error) { TJ.toast(r.error.message, true); return; }
          }
          d.close(); TJ.toast('Horários aplicados!'); await load();
          if (confirm('Quer avisar no Discord agora?')) { const rows = load.rows; TJ.discordSend({ content: scheduleText(round().title, rows), title: 'Agenda de entrevistas', event: 'interview_schedule', vars: { titulo: round().title, lista: scheduleText(round().title, rows).split('\n').slice(2).join('\n') } }); }
        };
      });
    };
  }

  // ---------- entrevista (só perguntas + nota de cada uma) ----------
  async function tabEntrevista(tc, can) {
    const [rounds, { data: qs }] = await Promise.all([getRounds(), sb().from('questions').select('*').eq('active', true)]);
    if (!rounds.length) { tc.innerHTML = '<div class="empty">Crie uma vaga e tenha candidatos primeiro.</div>'; return; }
    tc.innerHTML = stageHead(4, 'Entrevista', 'Escolha o candidato, gere o roteiro e dê uma nota de 0 a 10 para cada resposta. A nota geral só aparece na etapa Resultado.') +
      `<div class="card"><div class="grid g2" style="align-items:end">
      <div><label>Vaga</label>${roundPicker(rounds, savedRound(rounds))}</div>
      <div><label>Candidato</label><select id="cd"></select></div></div>
      <div id="cinfo" class="small muted" style="margin-top:8px"></div>
      <div class="row spread" style="margin-top:12px"><b>Roteiro</b><span class="popwrap"><button class="btn sm" id="cfg">⚙ Configurar roteiro</button><div class="pop" id="cpop" hidden style="min-width:260px"><h4>Perguntas por nível</h4>${LV.map(([k, n]) => `<label>${n} <span class="muted">(${(qs || []).filter((q) => q.level === k).length} no banco)</span></label><input type="number" min="0" max="20" value="${TJ.store.get('tj-iv-' + k, k === 'inexistente' ? 1 : 2)}" data-lv="${k}">`).join('')}<label>Tipo</label><select id="ty"><option value="">Misturar os três tipos</option>${TY.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></div></span></div>
      <p style="margin-bottom:0" class="row"><button class="btn blue" id="gen">Gerar perguntas</button><button class="btn" id="nxt">Próximo candidato ›</button></p>${(qs || []).length ? '' : '<p class="small"><span class="tag warn">banco vazio</span> Importe perguntas na aba Banco de perguntas.</p>'}</div><div id="run"></div>`;
    $('#cfg', tc).onclick = (e) => { e.stopPropagation(); $('#cpop', tc).hidden = !$('#cpop', tc).hidden; };
    $('#cpop', tc).onclick = (e) => e.stopPropagation();
    document.addEventListener('click', () => { const p = $('#cpop', tc); if (p) p.hidden = true; }, { once: true });
    let apps = [], list = [];
    const rid = () => $('#rd', tc).value;
    const cand = () => apps.find((a) => a.id === $('#cd', tc).value);
    const loadApps = async () => {
      TJ.store.set('tj-sel-round', rid());
      const { data } = await sb().from('applications').select('*').eq('round_id', rid()).in('status', ['aprovada_para_entrevista', 'entrevistada']);
      apps = (data || []).sort((a, b) => (a.interview_at ? new Date(a.interview_at) : 8e15) - (b.interview_at ? new Date(b.interview_at) : 8e15) || (a.interview_order ?? 9999) - (b.interview_order ?? 9999));
      $('#cd', tc).innerHTML = apps.length ? apps.map((a) => `<option value="${a.id}">${a.interview_at ? esc(hhmm(a.interview_at)) + ' · ' : a.interview_order ? a.interview_order + 'º · ' : ''}${esc(a.roblox_name)}${a.status === 'entrevistada' ? ' ✔' : ''}</option>`).join('') : '<option value="">Nenhum candidato na etapa de entrevista</option>';
      pick();
    };
    const pick = () => {
      const c = cand(); $('#cinfo', tc).innerHTML = c ? `${c.interview_at ? 'Entrevista: <b>' + esc(TJ.fmtDT(c.interview_at)) + '</b>' + (c.interview_place ? ' · ' + esc(c.interview_place) : '') : 'Sem horário marcado'}${c.status === 'entrevistada' ? ' · <span class="tag ok">entrevista já registrada</span>' : ''}` : '';
      list = (c?.interview_log || []).map((x) => ({ question: x.q, level: x.level, type: x.type, answer: x.answer, pts: x.pts, id: x.id }));
      drawRun();
    };
    $('#rd', tc).onchange = loadApps; $('#cd', tc).onchange = pick;
    $('#nxt', tc).onclick = () => { const s = $('#cd', tc); if (s.selectedIndex < s.options.length - 1) { s.selectedIndex++; pick(); } else TJ.toast('Esse é o último candidato.'); };
    function drawRun() {
      const run = $('#run', tc), c = cand();
      if (!c || !list.length) { run.innerHTML = c ? '<div class="empty">Clique em <b>Gerar perguntas</b> para montar o roteiro deste candidato.</div>' : ''; return; }
      const done = list.filter((x) => x.pts != null).length;
      run.innerHTML = `<div class="row spread" style="margin:18px 0 6px"><h3 style="margin:0">@${esc(c.roblox_name)}</h3><span class="tag">${done}/${list.length} avaliadas</span></div>
        ${list.map((x, i) => `<div class="qcard"><div class="row spread"><span class="small muted"><span class="tag">${esc(L.level[x.level] || x.level)}</span> <span class="tag gray">${esc(L.qtype[x.type] || x.type)}</span></span><button class="btn sm" data-swap="${i}">Trocar</button></div>
          <div class="q">${i + 1}. ${esc(x.question)}</div>
          <details><summary class="small muted" style="cursor:pointer">Ver resposta esperada</summary><p class="small">${esc(x.answer || 'Sem resposta cadastrada.')}</p></details>
          <div class="row" style="margin-top:8px;align-items:center"><span class="small muted">Nota:</span>${[0, 5, 10].map((v) => `<button class="btn sm${x.pts === v ? ' gold' : ''}" data-pt="${i}:${v}">${v}</button>`).join('')}<input type="number" min="0" max="10" step="0.5" style="width:84px" value="${x.pts ?? ''}" placeholder="0–10" data-n="${i}"></div></div>`).join('')}
        <label>Observações da entrevista (opcional)</label><textarea id="inote" rows="3">${esc(c.notes || '')}</textarea>
        <p class="row"><button class="btn gold" id="savei">Salvar entrevista</button><button class="btn" id="copyi">Copiar resumo</button></p>`;
      const setPts = (i, v) => { list[i].pts = v === '' || v == null || isNaN(+v) ? null : Math.max(0, Math.min(10, +v)); };
      run.querySelectorAll('[data-pt]').forEach((b) => (b.onclick = () => { const [i, v] = b.dataset.pt.split(':'); setPts(+i, list[+i].pts === +v ? null : +v); drawRun(); }));
      run.querySelectorAll('[data-n]').forEach((n) => (n.onchange = () => { setPts(+n.dataset.n, n.value); drawRun(); }));
      run.querySelectorAll('[data-swap]').forEach((b) => (b.onclick = () => {
        const i = +b.dataset.swap, cur = list[i], used = new Set(list.map((x) => x.question));
        const ty = $('#ty', tc).value, pool = (qs || []).filter((x) => x.level === cur.level && !used.has(x.question) && (!ty || x.type === ty));
        if (!pool.length) return TJ.toast('Não há outra pergunta disponível nesse nível.', true);
        list[i] = Object.assign({}, pool[rnd(pool.length)], { pts: null }); drawRun();
      }));
      $('#copyi', run).onclick = () => TJ.copy(`Entrevista de ${c.roblox_name}\n` + list.map((x, i) => `${i + 1}. ${x.question} → ${x.pts == null ? 'sem nota' : x.pts}`).join('\n'), 'Resumo copiado.');
      $('#savei', run).onclick = async () => {
        if (!can) return TJ.toast('Você não tem permissão para salvar.', true);
        const rated = list.filter((x) => x.pts != null);
        const patch = { interview_log: list.map((x) => ({ q: x.question, level: x.level, type: x.type, answer: x.answer || null, pts: x.pts })), notes: run.querySelector('#inote').value.trim() || null };
        if (rated.length) patch.score = Math.round((rated.reduce((s, x) => s + x.pts, 0) / rated.length) * 10) / 10;
        if (rated.length === list.length && c.status !== 'entrevistada') patch.status = 'entrevistada';
        const u = await sb().from('applications').update(patch).eq('id', c.id);
        if (u.error) return TJ.toast(u.error.message, true);
        TJ.toast('Entrevista salva.'); const keep = c.id; await loadApps(); $('#cd', tc).value = keep; pick();
      };
    }
    $('#gen', tc).onclick = () => {
      const c = cand(); if (!c) return TJ.toast('Escolha um candidato.', true);
      const ty = $('#ty', tc).value, asked = new Set((c.interview_log || []).map((x) => x.q)); list = [];
      for (const inp of tc.querySelectorAll('[data-lv]')) {
        const n = Math.max(0, Math.min(20, +inp.value || 0)); TJ.store.set('tj-iv-' + inp.dataset.lv, n); if (!n) continue;
        let pool = (qs || []).filter((q) => q.level === inp.dataset.lv && (!ty || q.type === ty));
        const fresh = pool.filter((q) => !asked.has(q.question)); if (fresh.length >= n) pool = fresh;
        const picked = [], byType = {}; shuffle(pool).forEach((q) => (byType[q.type] = byType[q.type] || []).push(q));
        const types = Object.keys(byType); let k = 0;
        while (picked.length < n && types.some((t) => byType[t].length)) { const t = types[k++ % types.length]; if (byType[t].length) picked.push(byType[t].shift()); }
        list.push(...picked.map((q) => Object.assign({}, q, { pts: null })));
      }
      if (!list.length) return TJ.toast('Nenhuma pergunta encontrada. Importe o banco de perguntas.', true);
      drawRun();
    };
    await loadApps();
  }

  // ---------- resultado (nota geral + decisão) ----------
  async function tabResultado(tc, can) {
    const rounds = await getRounds();
    if (!rounds.length) { tc.innerHTML = '<div class="empty">Crie uma vaga primeiro.</div>'; return; }
    tc.innerHTML = stageHead(5, 'Resultado', 'Aqui aparece a nota geral de cada entrevistado (média das perguntas + critérios opcionais). Defina quem foi aprovado e avise no Discord.') +
      `<div class="toolbar">${roundPicker(rounds, savedRound(rounds))}<span class="grow"></span><span class="popwrap"><button class="btn sm" id="bulk">⚡ Decidir em massa</button><div class="pop" id="bpop" hidden><h4>Nota mínima</h4><input type="number" id="minsc" step="0.5" value="${TJ.store.get('tj-sel-min', 7)}" min="0" max="10"><p style="margin:8px 0 0"><button class="btn sm gold" id="bok">Aprovar quem tem nota ≥ mínima</button></p><p style="margin:8px 0 0"><button class="btn sm danger" id="bno">Reprovar quem tem nota abaixo</button></p></div></span><button class="btn sm" id="rcopy">Copiar resultado</button><button class="btn sm" id="rsend">Enviar ao Discord…</button></div><div id="rs"></div>`;
    const rid = () => $('#rd', tc).value, round = () => rounds.find((r) => r.id === rid());
    let rows = [];
    async function load() {
      TJ.store.set('tj-sel-round', rid());
      const { data } = await sb().from('applications').select('*').eq('round_id', rid()).in('status', ['entrevistada', 'aprovada', 'reprovada', 'aprovada_para_entrevista']);
      rows = (data || []).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
      const rb = round().rubric || [];
      $('#rs', tc).innerHTML = rows.length ? `<div class="tablewrap"><table><thead><tr><th>#</th><th>Candidato</th><th>Perguntas</th>${rb.length ? '<th>Critérios</th>' : ''}<th>Nota geral</th><th>Situação</th><th></th></tr></thead><tbody>${rows.map((a, i) => {
        const q = (a.interview_log || []).filter((x) => x.pts != null);
        const qa = q.length ? q.reduce((s, x) => s + x.pts, 0) / q.length : null;
        return `<tr><td data-label="#">${i + 1}</td><td data-label="Candidato"><b>${esc(a.roblox_name)}</b></td><td data-label="Perguntas">${qa == null ? '—' : qa.toFixed(1)}</td>${rb.length ? `<td data-label="Critérios">${a.rubric_score == null ? '—' : Number(a.rubric_score).toFixed(1)}</td>` : ''}<td data-label="Nota geral"><span class="tag ${a.score >= 7 ? 'ok' : a.score >= 5 ? 'warn' : a.score == null ? 'gray' : 'bad'}">${a.score == null ? '—' : Number(a.score).toFixed(1)}</span></td><td data-label="Situação"><span class="tag ${L.appTone[a.status] || ''}">${esc(L.app[a.status] || a.status)}</span></td><td>${can ? `<span class="row"><button class="btn sm" data-ev="${a.id}">Critérios</button><button class="btn sm gold" data-ok="${a.id}">Aprovar</button><button class="btn sm danger" data-no="${a.id}">Reprovar</button></span>` : ''}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty">Ninguém chegou a esta etapa ainda.</div>';
      const setS = (id, status) => async () => { const u = await sb().from('applications').update({ status }).eq('id', id); TJ.toast(u.error ? u.error.message : 'Situação atualizada.', !!u.error); load(); };
      $('#rs', tc).querySelectorAll('[data-ok]').forEach((b) => (b.onclick = setS(b.dataset.ok, 'aprovada')));
      $('#rs', tc).querySelectorAll('[data-no]').forEach((b) => (b.onclick = setS(b.dataset.no, 'reprovada')));
      $('#rs', tc).querySelectorAll('[data-ev]').forEach((b) => (b.onclick = () => evalRubric(rows.find((x) => x.id === b.dataset.ev), rb, load)));
    }
    function evalRubric(a, rb, done) {
      if (!rb.length) return TJ.toast('Esta vaga não tem critérios. Cadastre em Vaga e formulário.', true);
      const sc = Object.assign({}, a.scores || {});
      TJ.dlg(`<h3>Critérios — @${esc(a.roblox_name)}</h3>${rb.map((x, i) => `<label>${esc(x.name)} <span class="muted">(peso ${x.weight})</span> — <b id="rv${i}">${sc[x.name] ?? 0}</b></label><input type="range" min="0" max="10" step="0.5" value="${sc[x.name] ?? 0}" data-r="${i}">`).join('')}<p class="row" style="margin-top:14px"><button class="btn gold" id="rsave">Salvar</button><button class="btn" data-close>Cancelar</button></p>`, (d) => {
        d.querySelectorAll('[data-r]').forEach((s) => (s.oninput = () => { sc[rb[+s.dataset.r].name] = Number(s.value); d.querySelector('#rv' + s.dataset.r).textContent = s.value; }));
        d.querySelector('#rsave').onclick = async () => {
          const w = rb.reduce((s, c) => s + c.weight, 0) || 1, r = Math.round((rb.reduce((s, c) => s + c.weight * Number(sc[c.name] ?? 0), 0) / w) * 10) / 10;
          const q = (a.interview_log || []).filter((x) => x.pts != null), qa = q.length ? q.reduce((s, x) => s + x.pts, 0) / q.length : null;
          const final = qa == null ? r : Math.round(((qa + r) / 2) * 10) / 10;
          const u = await sb().from('applications').update({ scores: sc, rubric_score: r, score: final }).eq('id', a.id);
          if (u.error) return TJ.toast(u.error.message, true); d.close(); TJ.toast('Critérios salvos.'); done();
        };
      });
    }
    $('#rd', tc).onchange = load; await load();
    const text = () => { const ok = rows.filter((a) => a.status === 'aprovada'); return `# Resultado do processo seletivo\n-# ${round().title}\n` + (ok.length ? 'Parabéns aos aprovados:\n' + ok.map((a) => `> **${a.roblox_name}**`).join('\n') : 'Nenhum aprovado até o momento.'); };
    $('#rcopy', tc).onclick = () => TJ.copy(text(), 'Resultado copiado em markdown!');
    $('#rsend', tc).onclick = () => TJ.discordSend({ content: text(), title: 'Resultado' });
    if (!can) return;
    $('#bulk', tc).onclick = (e) => { e.stopPropagation(); $('#bpop', tc).hidden = !$('#bpop', tc).hidden; };
    $('#bpop', tc).onclick = (e) => e.stopPropagation();
    document.addEventListener('click', () => { const p = $('#bpop', tc); if (p) p.hidden = true; }, { once: true });
    const bulk = (status, op) => async () => {
      const min = Number($('#minsc', tc).value); if (isNaN(min)) return TJ.toast('Informe a nota mínima.', true); TJ.store.set('tj-sel-min', min);
      if (!confirm(`${status === 'aprovada' ? 'Aprovar' : 'Reprovar'} todos os entrevistados com nota ${op === 'gte' ? 'maior ou igual a' : 'menor que'} ${min}?`)) return;
      let q = sb().from('applications').update({ status }).eq('round_id', rid()).eq('status', 'entrevistada'); q = op === 'gte' ? q.gte('score', min) : q.lt('score', min);
      const r = await q; TJ.toast(r.error ? r.error.message : 'Resultado atualizado.', !!r.error); $('#bpop', tc).hidden = true; load();
    };
    $('#bok', tc).onclick = bulk('aprovada', 'gte'); $('#bno', tc).onclick = bulk('reprovada', 'lt');
  }

  // ---------- banco de perguntas ----------
  async function tabPerguntas(tc, can) {
    tc.innerHTML = `<div class="card" style="margin-bottom:16px"><div class="row spread"><div><b>Sortear uma pergunta</b><div class="small muted">Para entrevistas rápidas, sem montar roteiro.</div></div>
      <div class="row"><select id="sl"><option value="">Qualquer nível</option>${LV.map((x) => `<option value="${x[0]}">${x[1]}</option>`).join('')}</select><select id="st"><option value="">Qualquer tipo</option>${TY.map((x) => `<option value="${x[0]}">${x[1]}</option>`).join('')}</select><button class="btn blue" id="go">Sortear</button></div></div><div id="out" style="margin-top:8px"></div></div>
      <div class="row" style="margin-bottom:14px">${can ? '<button class="btn gold" id="imp">⬆ Importar perguntas (colar em massa)</button><button class="btn" id="prompt">Copiar pedido para gerar perguntas com IA</button>' : ''}</div><div id="lst"></div>`;
    $('#go', tc).onclick = async () => {
      let q = sb().from('questions').select('*').eq('active', true); if ($('#sl', tc).value) q = q.eq('level', $('#sl', tc).value); if ($('#st', tc).value) q = q.eq('type', $('#st', tc).value);
      const { data } = await q; if (!(data || []).length) return ($('#out', tc).innerHTML = '<span class="muted">Nenhuma pergunta com esse filtro.</span>');
      const x = data[rnd(data.length)];
      $('#out', tc).innerHTML = `<p style="font-size:19px;margin:6px 0"><span class="tag">${esc(L.level[x.level] || x.level)}</span> <span class="tag gray">${esc(L.qtype[x.type] || x.type)}</span><br><b>${esc(x.question)}</b></p><details><summary class="small muted" style="cursor:pointer">Ver resposta esperada</summary><p>${esc(x.answer || 'Sem resposta cadastrada.')}</p></details>`;
    };
    if (can) {
      $('#prompt', tc).onclick = () => TJ.copy(`Crie 20 perguntas orais curtas para entrevistar candidatos a Advogado/Promotor de um tribunal de roleplay, baseadas no Código Penal e no Manual de Estudos que vou te enviar. Misture 3 tipos: termo jurídico, o que diz o código penal e situação prática. Nível: (inexistente / básico / intermediário / avançado).\nResponda SOMENTE com uma pergunta por linha, neste formato exato, sem numeração:\nnível | tipo | pergunta | resposta esperada | fonte\nOnde nível = inexistente, básico, intermediário ou avançado; tipo = termo, codigo ou situacao.\nExemplo:\nbásico | termo | O que é dolo? | Quando a pessoa quer o resultado ou assume o risco de produzi-lo. | Manual de Estudos`, 'Pedido copiado: cole em uma IA, depois use "Importar perguntas".');
      $('#imp', tc).onclick = () => TJ.dlg(`<h3>Importar perguntas</h3><p class="muted small">Cole uma pergunta por linha, no formato:<br><code>nível | tipo | pergunta | resposta | fonte</code><br>Resposta e fonte são opcionais. Se a linha tiver só a pergunta (ou pergunta | resposta), vale o nível e o tipo escolhidos abaixo. Aceita também colar direto de uma planilha (colunas separadas por tab).</p>
        <div class="row"><select id="dl" style="flex:1"><option value="">Nível padrão…</option>${LV.map((x) => `<option value="${x[0]}">${x[1]}</option>`).join('')}</select><select id="dt" style="flex:1">${TY.map((x) => `<option value="${x[0]}">${x[1]}</option>`).join('')}</select></div>
        <textarea id="itx" rows="10" placeholder="básico | termo | O que é dolo? | Quando a pessoa quer o resultado. | Manual de Estudos"></textarea><div id="ipv" class="small muted" style="margin-top:6px"></div>
        <p class="row" style="margin-top:14px"><button class="btn gold" id="idoit">Importar</button><button class="btn" data-close>Cancelar</button></p>`, (d) => {
        const parse = () => {
          const defL = d.querySelector('#dl').value, defT = d.querySelector('#dt').value, ok = [], bad = [];
          d.querySelector('#itx').value.split('\n').map((l) => l.trim()).filter(Boolean).forEach((line) => {
            line = line.replace(/^\s*[\d]+[.)-]\s+/, '');
            const parts = line.split(/\s*\|\s*|\t/).map((x) => x.trim());
            let level = defL || null, type = defT, question, answer = null, source = null;
            if (parts.length >= 3 && lvKey(parts[0]) && tyKey(parts[1])) { level = lvKey(parts[0]); type = tyKey(parts[1]); [, , question, answer, source] = parts; }
            else if (parts.length >= 3 && lvKey(parts[0])) { level = lvKey(parts[0]); [, question, answer, source] = parts; }
            else { [question, answer, source] = parts; }
            if (!question || !level) bad.push(line); else ok.push({ level, type, question, answer: answer || null, source: source || null, version: 1, active: true });
          });
          return { ok, bad };
        };
        d.querySelector('#itx').oninput = d.querySelector('#dl').onchange = () => { const { ok, bad } = parse(); d.querySelector('#ipv').textContent = `${ok.length} pergunta(s) reconhecida(s)${bad.length ? ` · ${bad.length} linha(s) sem nível (escolha o nível padrão ou escreva o nível na linha)` : ''}`; };
        d.querySelector('#idoit').onclick = async () => {
          const { ok, bad } = parse(); if (!ok.length) return TJ.toast('Nada para importar. Confira o formato e o nível padrão.', true);
          if (bad.length && !confirm(`${bad.length} linha(s) serão ignoradas (sem nível). Importar as outras ${ok.length}?`)) return;
          for (let i = 0; i < ok.length; i += 100) { const r = await sb().from('questions').insert(ok.slice(i, i + 100)); if (r.error) return TJ.toast(r.error.message, true); }
          d.close(); TJ.toast(`${ok.length} pergunta(s) importada(s)!`); P.selecao($('#pc'), ['perguntas']);
        };
      });
    }
    await TJ.crud($('#lst', tc), { id: 'questions', table: 'questions', order: ['level'], newLabel: 'Nova pergunta', canWrite: can, defaults: { level: 'basico', type: 'termo', version: 1, active: true },
      filters: [{ k: 'level', label: 'Nível', opts: LV }, { k: 'type', label: 'Tipo', opts: TY }, { k: 'active', label: 'Situação', opts: [['true', 'Ativas'], ['false', 'Desativadas']] }],
      fields: [{ k: 'level', label: 'Nível', type: 'select', opts: LV }, { k: 'type', label: 'Tipo', type: 'select', opts: TY }, { k: 'question', label: 'Pergunta (curta, falada)', type: 'textarea', rows: 3, req: true }, { k: 'answer', label: 'Resposta esperada', type: 'textarea', rows: 4 }, { k: 'source', label: 'Fonte', ph: 'Ex.: Código Penal, Art. 121' }, { k: 'version', label: 'Versão do banco', type: 'number' }, { k: 'active', label: 'Pergunta ativa (entra nos sorteios)', type: 'bool' }],
      cols: [{ label: 'Nível', fmt: F.map('level', L.level) }, { label: 'Tipo', fmt: F.map('type', L.qtype) }, { label: 'Pergunta', fmt: F.cut('question', 100) }, { label: 'Resposta', fmt: F.cut('answer', 60) }, { label: 'Fonte', k: 'source' }, { label: 'v', k: 'version' }, { label: 'Ativa', fmt: F.yn('active') }] });
  }

  // =====================================================================
  // VAGAS INTERNAS (qualquer membro se candidata pelo painel)
  // =====================================================================
  P.vagas = async (el) => {
    const [r, mine] = await Promise.all([
      sb().from('selection_rounds').select('*').eq('audience', 'interno').order('created_at', { ascending: false }),
      sb().from('my_applications').select('*').order('created_at', { ascending: false }),
    ]);
    if (r.error) throw r.error;
    const rounds = r.data || [], done = new Set((mine.data || []).map((a) => a.round_id));
    el.innerHTML = H.head('Vagas internas', 'Oportunidades abertas só para membros (promoções, novas funções…).') +
      (rounds.length ? rounds.map((x) => {
        const expired = x.closes_at && new Date(x.closes_at) <= new Date();
        const open = x.status === 'aberto' && !expired && !done.has(x.id), ff = Array.isArray(x.form_fields) ? x.form_fields : [];
        return `<div class="card" style="margin-bottom:18px">${x.banner_url ? `<img class="cover" src="${esc(x.banner_url)}" alt="" loading="lazy">` : ''}<div class="row spread"><h3 style="margin:0">${esc(x.title)}</h3>${expired && x.status === 'aberto' ? '<span class="tag gray">Inscrições encerradas</span>' : TJ.tag(L.round, x.status)}</div>
          ${x.closes_at ? `<p class="small muted">Inscrições até ${esc(TJ.fmtDT(x.closes_at))}</p>` : ''}${x.description ? TJ.md(x.description) : ''}${x.requirements ? '<h4>Requisitos</h4>' + TJ.md(x.requirements) : ''}
          ${done.has(x.id) ? '<p><span class="tag ok">Você já se candidatou</span></p>' : open ? `<details><summary class="btn gold">Candidatar-me</summary><form class="iapply" data-round="${x.id}" style="margin-top:12px">${ff.length ? TJ.formFieldsHTML(ff) : '<label>Por que você quer esta vaga?</label><textarea id="ff_motiv" maxlength="1500"></textarea>'}<p><button class="btn blue">Enviar candidatura</button></p></form></details>` : ''}</div>`;
      }).join('') : '<div class="empty">Nenhuma vaga interna no momento.</div>') +
      `<h2 style="margin-top:28px">Minhas candidaturas</h2>` + ((mine.data || []).length ? `<div class="tablewrap"><table><thead><tr><th>Vaga</th><th>Situação</th><th>Entrevista</th><th>Enviada</th></tr></thead><tbody>${mine.data.map((a) => `<tr><td data-label="Vaga">${esc(a.round_title || '')}</td><td data-label="Situação"><span class="tag ${L.appTone[a.status] || ''}">${esc(L.app[a.status] || a.status)}</span></td><td data-label="Entrevista">${a.interview_at ? esc(TJ.fmtDT(a.interview_at)) + (a.interview_place ? ' · ' + esc(a.interview_place) : '') : '—'}</td><td data-label="Enviada">${esc(TJ.fmtDate(a.created_at))}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Você ainda não se candidatou a nada.</p>');
    el.querySelectorAll('form.iapply').forEach((f) => (f.onsubmit = async (e) => {
      e.preventDefault();
      const round = rounds.find((x) => x.id === f.dataset.round), ff = Array.isArray(round?.form_fields) ? round.form_fields : [];
      const p = { round_id: round.id, roblox_name: state.P.roblox_name, applicant_id: state.U.id };
      if (ff.length) p.answers = TJ.readFormAnswers(f, ff); else p.motivation = (f.querySelector('#ff_motiv').value || '').trim() || null;
      const { error } = await sb().from('applications').insert(p);
      if (error) return TJ.toast('Não foi possível enviar: ' + error.message, true);
      TJ.toast('Candidatura enviada!'); P.vagas(el);
    }));
  };
})();
