/* Painel do Tribunal - parte 2 (v2): membros, seleção (formulário, entrevista, perguntas), site, vagas internas */
(function () {
  const TJ = window.TJ, esc = TJ.esc, $ = TJ.$, L = TJ.L, state = TJ.state, H = TJ.H, P = TJ.P, F = H.F, opts = H.opts;
  const sb = () => TJ.sb;
  const randCode = () => 'TJ-' + [...crypto.getRandomValues(new Uint8Array(5))].map((b) => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[b % 31]).join('');
  const rnd = (n) => crypto.getRandomValues(new Uint32Array(1))[0] % n;
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // =====================================================================
  // MEMBROS E CARGOS
  // =====================================================================
  async function logEvent(member_id, kind, title, detail) {
    const r = await sb().from('member_events').insert({ member_id, kind, title: title || null, detail: detail || null });
    if (r.error) console.error(r.error);
  }
  const EV = { admissao: 'Entrada', promocao: 'Promoção', rebaixamento: 'Rebaixamento', cargo: 'Mudança de cargo', advertencia: 'Advertência', suspensao: 'Suspensão', demissao: 'Demissão', reintegracao: 'Reintegração', nota: 'Anotação' };

  async function openMember(m, reload) {
    const [{ data: roles }, { data: evs }] = await Promise.all([
      sb().from('roles').select('*').order('rank', { ascending: false }),
      sb().from('member_events').select('*').eq('member_id', m.id).order('at', { ascending: false }),
    ]);
    const all = H.isAll(), my = H.myRank();
    const targetRank = m.role?.rank ?? 0;
    const self = m.id === state.U.id;
    const can = TJ.can('manage_users') && !self && (all || targetRank < my);
    const assignable = (roles || []).filter((r) => all || r.rank < my);
    const st = m.status || (m.active ? 'ativo' : 'demitido');
    const by = {}; // nomes de quem agiu
    const ids = [...new Set((evs || []).map((e) => e.by_id).filter(Boolean))];
    if (ids.length) { const { data } = await sb().from('profiles').select('id,roblox_name').in('id', ids); (data || []).forEach((x) => (by[x.id] = x.roblox_name)); }

    const dlg = TJ.dlg(`<div class="row spread"><div><h3 style="margin:0">@${esc(m.roblox_name)}</h3><div class="small muted">${esc(m.display_name || '')}</div></div><div>${TJ.tag(L.member, st)} <span class="tag">${esc(m.role?.label || m.role_key)}</span></div></div>
      ${m.status_reason && st !== 'ativo' ? `<p class="small" style="margin-top:10px"><b>Motivo:</b> ${esc(m.status_reason)}</p>` : ''}
      ${can ? `
      <div class="dsec"><h4>Cargo</h4><div class="row"><select id="mrole" style="flex:1">${assignable.map((r) => `<option value="${esc(r.key)}"${r.key === m.role_key ? ' selected' : ''}>${esc(r.label)}</option>`).join('')}</select><button class="btn sm" id="mrolebtn">Aplicar cargo</button></div></div>
      <div class="dsec"><h4>Disciplina</h4><label style="margin-top:4px">Motivo (obrigatório para advertir, suspender ou demitir)</label><textarea id="mreason" rows="2" placeholder="Descreva o motivo…"></textarea>
        <div class="row" style="margin-top:10px">
          <button class="btn sm" id="mwarn">Advertir</button>
          ${st === 'ativo' ? '<button class="btn sm danger" id="msusp">Suspender</button><button class="btn sm danger fill" id="mfire">Demitir</button>' : '<button class="btn sm gold" id="mback">Reintegrar ao Tribunal</button>'}
        </div></div>
      <div class="dsec"><h4>Senha</h4><div class="row"><input id="mpass" type="text" placeholder="Nova senha (mín. 8 caracteres)" style="flex:1" autocomplete="off"><button class="btn sm" id="mpassbtn">Redefinir senha</button></div><div class="help">Use se o membro esqueceu a senha. Passe a nova senha para ele pelo Discord.</div></div>` : `<p class="muted small" style="margin-top:12px">${self ? 'Esta é a sua conta. Para mudar seu perfil, use "Minha conta".' : 'Você não pode gerir este membro (cargo igual ou superior ao seu).'}</p>`}
      <div class="dsec"><h4>Anotação interna</h4><div class="row"><input id="mnote" placeholder="Registrar uma observação sobre este membro" style="flex:1"><button class="btn sm" id="mnotebtn">Salvar anotação</button></div></div>
      <div class="dsec"><h4>Histórico</h4><div class="hist">${(evs || []).length ? evs.map((e) => `<div class="item"><b>${esc(EV[e.kind] || e.kind)}</b>${e.title ? ' — ' + esc(e.title) : ''}<br>${e.detail ? `<span>${esc(e.detail)}</span><br>` : ''}<small>${esc(TJ.fmtDT(e.at))}${e.by_id && by[e.by_id] ? ' · por ' + esc(by[e.by_id]) : ''}</small></div>`).join('') : '<p class="muted small">Sem registros.</p>'}</div></div>
      <p style="margin-top:18px"><button class="btn" data-close>Fechar</button></p>`);

    const reason = () => dlg.querySelector('#mreason')?.value.trim() || '';
    const need = () => { const r = reason(); if (!r) { TJ.toast('Escreva o motivo primeiro.', true); return null; } return r; };
    const done = (msg) => { dlg.close(); TJ.toast(msg); reload && reload(); };
    const upd = async (patch) => { const r = await sb().from('profiles').update(patch).eq('id', m.id); if (r.error) { TJ.toast(r.error.message, true); return false; } return true; };
    const on = (id, fn) => { const b = dlg.querySelector('#' + id); if (b) b.onclick = fn; };

    on('mrolebtn', async () => {
      const key = dlg.querySelector('#mrole').value; if (key === m.role_key) return TJ.toast('Esse já é o cargo atual.');
      const nr = roles.find((r) => r.key === key), or = roles.find((r) => r.key === m.role_key);
      if (!(await upd({ role_key: key }))) return;
      await logEvent(m.id, nr.rank > (or?.rank ?? 0) ? 'promocao' : 'rebaixamento', `${or?.label || m.role_key} → ${nr.label}`, reason());
      done('Cargo atualizado.');
    });
    on('mwarn', async () => { const r = need(); if (!r) return; await logEvent(m.id, 'advertencia', null, r); done('Advertência registrada.'); });
    on('msusp', async () => {
      const r = need(); if (!r) return;
      if (!confirm(`Suspender @${m.roblox_name}? Ele perde o acesso ao painel até ser reintegrado.`)) return;
      if (!(await upd({ active: false, status: 'suspenso', status_reason: r, status_at: new Date().toISOString() }))) return;
      await logEvent(m.id, 'suspensao', null, r); done('Membro suspenso.');
    });
    on('mfire', async () => {
      const r = need(); if (!r) return;
      if (!confirm(`DEMITIR @${m.roblox_name}? Ele perde o acesso ao painel e sai da página Equipe. (O histórico fica guardado e dá para reintegrar depois.)`)) return;
      if (!(await upd({ active: false, status: 'demitido', status_reason: r, status_at: new Date().toISOString(), show_public: false }))) return;
      await logEvent(m.id, 'demissao', null, r); done('Membro demitido.');
    });
    on('mback', async () => {
      if (!(await upd({ active: true, status: 'ativo', status_reason: null, status_at: new Date().toISOString(), show_public: true }))) return;
      await logEvent(m.id, 'reintegracao', null, reason()); done('Membro reintegrado.');
    });
    on('mpassbtn', async () => {
      const pw = dlg.querySelector('#mpass').value;
      if (pw.length < 8) return TJ.toast('A senha precisa ter 8 ou mais caracteres.', true);
      const r = await sb().rpc('admin_set_password', { p_user: m.id, p_pass: pw });
      if (r.error) return TJ.toast(r.error.message, true);
      await logEvent(m.id, 'nota', 'Senha redefinida pela coordenação'); done('Senha redefinida.');
    });
    on('mnotebtn', async () => {
      const t = dlg.querySelector('#mnote').value.trim(); if (!t) return TJ.toast('Escreva a anotação.', true);
      await logEvent(m.id, 'nota', null, t); done('Anotação salva.');
    });
  }

  P.usuarios = async (el, [tab = 'membros']) => {
    el.innerHTML = H.head('Membros e cargos', 'Gerencie quem faz parte do Tribunal, cargos, convites e desligamentos.') +
      H.tabs('usuarios', [['membros', 'Membros ativos'], ['desligados', 'Suspensos e demitidos'], ['convites', 'Convites'], ['cargos', 'Cargos e permissões']], tab) + '<div id="tc"></div>';
    const tc = $('#tc', el), can = TJ.can('manage_users');
    const memberCfg = (active) => ({
      id: active ? 'members' : 'ex-members', table: 'profiles', select: '*, role:roles(label,rank,perms)', order: ['created_at'], noCreate: true, canWrite: can, canDelete: false, filter: { active },
      filters: [{ k: 'role_key', label: 'Cargo', opts: [] }],
      fields: [],
      cols: [{ label: 'Roblox', k: 'roblox_name' }, { label: 'Nome', k: 'display_name' }, { label: 'Cargo', fmt: (r) => esc(r.role?.label || r.role_key) }, { label: 'Situação', fmt: (r) => TJ.tag(L.member, r.status || (r.active ? 'ativo' : 'demitido')) }, { label: active ? 'Entrada' : 'Desde', fmt: (r) => esc(TJ.fmtDate(active ? (r.joined_at || r.created_at) : (r.status_at || r.created_at))) }, { label: 'Motivo', fmt: F.cut('status_reason', 50) }, { label: 'Na Equipe', fmt: F.yn('show_public') }],
      onRow: (r, reload) => openMember(r, reload),
    });
    if (tab === 'membros' || tab === 'desligados') {
      const cfg = memberCfg(tab === 'membros');
      cfg.filters = [{ k: 'role_key', label: 'Cargo', opts: await H.rolesOpts() }];
      await TJ.crud(tc, cfg);
      tc.insertAdjacentHTML('beforeend', tab === 'membros' ? '<p class="muted small">Toque em um membro para mudar o cargo, advertir, suspender, demitir ou redefinir a senha. Para adicionar alguém novo, gere um convite na aba <b>Convites</b>.</p>' : '<p class="muted small">Toque em alguém para reintegrar ou ver o histórico.</p>');
    } else if (tab === 'convites') {
      await TJ.crud(tc, { table: 'invites', pk: 'code', order: ['created_at', false], newLabel: 'Gerar convite', canWrite: can,
        defaults: () => ({ code: randCode(), role_key: 'advogado', expires_at: new Date(Date.now() + 7 * 864e5).toISOString() }),
        fields: [{ k: 'roblox_name', label: 'Nome no Roblox da pessoa', req: true }, { k: 'role_key', label: 'Cargo', type: 'select', opts: H.rolesOpts }, { k: 'code', label: 'Código do convite', req: true, ro: true }, { k: 'expires_at', label: 'Validade', type: 'datetime' }],
        cols: [{ label: 'Roblox', k: 'roblox_name' }, { label: 'Cargo', k: 'role_key' }, { label: 'Código', k: 'code' }, { label: 'Situação', fmt: (r) => (r.used_at ? '<span class="tag ok">Usado</span>' : new Date(r.expires_at) < new Date() ? '<span class="tag bad">Expirado</span>' : '<span class="tag warn">Pendente</span>') }],
        actions: [{ label: 'Copiar mensagem', fn: (r) => TJ.copy(`Convite para o ${state.site.name}\nAcesse: ${H.siteUrl()}#/ativar\nNome no Roblox: ${r.roblox_name}\nCódigo: ${r.code}\nO convite vale até ${TJ.fmtDate(r.expires_at)}.`, 'Mensagem de convite copiada.') }] });
    } else {
      await TJ.crud(tc, { table: 'roles', pk: 'key', order: ['rank', false], newLabel: 'Novo cargo', canWrite: can, defaults: { rank: 10, perms: ['view_internal'] },
        fields: [{ k: 'key', label: 'Código interno (sem espaços, minúsculas)', req: true, ro: true, ph: 'ex.: defensor' }, { k: 'label', label: 'Nome do cargo', req: true }, { k: 'rank', label: 'Hierarquia (maior = mais alto)', type: 'number', help: 'Quem tem hierarquia maior pode gerir quem tem menor.' }, { k: 'perms', label: 'O que este cargo pode fazer', type: 'perms' }],
        cols: [{ label: 'Cargo', k: 'label' }, { label: 'Hierarquia', k: 'rank' }, { label: 'Permissões', fmt: (r) => esc((r.perms || []).map((p) => (p === '*' ? 'TOTAL' : H.PERMS[p] || p)).join(', ')) }],
        beforeSave: (p, row) => { if (!row && !/^[a-z0-9_]+$/.test(p.key || '')) throw new Error('Código interno: use só letras minúsculas, números e _.'); } });
    }
  };

  // =====================================================================
  // VAGAS INTERNAS (qualquer membro se candidata pelo painel)
  // =====================================================================
  P.vagas = async (el) => {
    const [r, mine] = await Promise.all([
      sb().from('selection_rounds').select('*').eq('audience', 'interno').order('created_at', { ascending: false }),
      sb().from('applications').select('*, round:selection_rounds(title)').eq('applicant_id', state.U.id).order('created_at', { ascending: false }),
    ]);
    if (r.error) throw r.error;
    const rounds = (r.data || []), done = new Set((mine.data || []).map((a) => a.round_id));
    el.innerHTML = H.head('Vagas internas', 'Oportunidades abertas só para membros (promoções, novas funções…).') +
      (rounds.length ? rounds.map((x) => {
        const open = x.status === 'aberto' && !done.has(x.id), ff = Array.isArray(x.form_fields) ? x.form_fields : [];
        return `<div class="card" style="margin-bottom:18px"><div class="row spread"><h3 style="margin:0">${esc(x.title)}</h3>${TJ.tag(L.round, x.status)}</div>
          ${x.closes_at ? `<p class="small muted">Inscrições até ${esc(TJ.fmtDT(x.closes_at))}</p>` : ''}${x.description ? TJ.md(x.description) : ''}${x.requirements ? '<h4>Requisitos</h4>' + TJ.md(x.requirements) : ''}
          ${done.has(x.id) ? '<p><span class="tag ok">Você já se candidatou</span></p>' : open ? `<details><summary class="btn gold">Candidatar-me</summary><form class="iapply" data-round="${x.id}" style="margin-top:12px">${ff.length ? TJ.formFieldsHTML(ff) : '<label>Por que você quer esta vaga?</label><textarea id="ff_motiv" maxlength="1500"></textarea>'}<p><button class="btn blue">Enviar candidatura</button></p></form></details>` : ''}</div>`;
      }).join('') : '<div class="empty">Nenhuma vaga interna no momento.</div>') +
      `<h2 style="margin-top:28px">Minhas candidaturas</h2>` + ((mine.data || []).length ? `<div class="tablewrap"><table><thead><tr><th>Vaga</th><th>Situação</th><th>Enviada</th></tr></thead><tbody>${mine.data.map((a) => `<tr><td>${esc(a.round?.title || '')}</td><td><span class="tag ${L.appTone[a.status] || ''}">${esc(L.app[a.status] || a.status)}</span></td><td>${esc(TJ.fmtDate(a.created_at))}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Você ainda não se candidatou a nada.</p>');
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

  // =====================================================================
  // SELEÇÃO
  // =====================================================================
  const LV = Object.entries(L.level), TY = Object.entries(L.qtype);
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const lvKey = (s) => { s = norm(s); if (s.startsWith('inex') || s.startsWith('nivel 0') || s === '0') return 'inexistente'; if (s.startsWith('bas') || s === '1') return 'basico'; if (s.startsWith('inter') || s === '2') return 'intermediario'; if (s.startsWith('av') || s === '3') return 'avancado'; return null; };
  const tyKey = (s) => { s = norm(s); if (s.startsWith('term') || s.startsWith('conc') || s.startsWith('def')) return 'termo'; if (s.startsWith('cod') || s.startsWith('lei') || s.startsWith('art')) return 'codigo'; if (s.startsWith('sit') || s.startsWith('caso') || s.startsWith('prat')) return 'situacao'; return null; };

  P.selecao = async (el, [tab = 'vagas']) => {
    el.innerHTML = H.head('Processo seletivo', 'Vagas, candidatos, entrevistas e banco de perguntas.') +
      H.tabs('selecao', [['vagas', 'Vagas e formulário'], ['candidatos', 'Candidatos'], ['entrevista', 'Entrevista'], ['perguntas', 'Banco de perguntas']], tab) + '<div id="tc"></div>';
    const tc = $('#tc', el), can = TJ.can('manage_selection');
    if (tab === 'vagas') await tabVagas(tc, can);
    else if (tab === 'candidatos') await tabCandidatos(tc, can);
    else if (tab === 'entrevista') await tabEntrevista(tc, can);
    else await tabPerguntas(tc, can);
  };

  async function tabVagas(tc, can) {
    tc.insertAdjacentHTML('beforebegin', '');
    await TJ.crud(tc, { table: 'selection_rounds', order: ['created_at', false], newLabel: 'Nova vaga', canWrite: can, defaults: { status: 'aberto', is_public: true, audience: 'publico', form_fields: [] },
      filters: [{ k: 'status', label: 'Situação', opts: opts(L.round) }, { k: 'audience', label: 'Público', opts: [['publico', 'Público (site)'], ['interno', 'Interno (painel)']] }],
      fields: [
        { k: 'title', label: 'Título', req: true, ph: 'Ex.: Seleção de Advogados — Novembro' },
        { k: 'audience', label: 'Quem pode se candidatar', type: 'select', opts: [['publico', 'Qualquer pessoa, pelo site'], ['interno', 'Só membros, pelo painel (Vagas internas)']] },
        { k: 'role_key', label: 'Cargo da vaga', type: 'select', opts: async () => [['', '—']].concat(await H.rolesOpts()) },
        { k: 'status', label: 'Situação', type: 'select', opts: opts(L.round) },
        { k: 'closes_at', label: 'Inscrições até', type: 'datetime' },
        { k: 'description', label: 'Descrição', type: 'textarea' },
        { k: 'requirements', label: 'Requisitos', type: 'textarea', rows: 4 },
        { k: 'form_fields', label: 'Formulário de inscrição', type: 'formbuilder', help: 'Nome do Roblox e Discord já vêm no formulário. Monte aqui as demais perguntas. Se deixar vazio, usa o formulário padrão (experiência e motivação).' },
        { k: 'is_public', label: 'Mostrar no site (vagas públicas)', type: 'bool' },
      ],
      beforeSave: (p) => { if (p.audience === 'interno') p.is_public = false; },
      cols: [{ label: 'Título', k: 'title' }, { label: 'Público', fmt: (r) => (r.audience === 'interno' ? '<span class="tag warn">Interno</span>' : '<span class="tag">Site</span>') }, { label: 'Situação', fmt: (r) => TJ.tag(L.round, r.status) }, { label: 'Perguntas', fmt: (r) => esc(String((r.form_fields || []).length || 'padrão')) }, { label: 'Até', fmt: F.dt('closes_at') }] });
  }

  async function tabCandidatos(tc, can) {
    const { data: rounds } = await sb().from('selection_rounds').select('id,title,audience').order('created_at', { ascending: false });
    if (!(rounds || []).length) { tc.innerHTML = '<div class="empty">Crie uma vaga primeiro.</div>'; return; }
    tc.innerHTML = `<div class="toolbar"><select id="rd">${rounds.map((r) => `<option value="${r.id}">${esc(r.title)}${r.audience === 'interno' ? ' (interna)' : ''}</option>`).join('')}</select>
      <button class="btn sm" id="draw">🎲 Sortear ordem das entrevistas</button><button class="btn sm" id="exp">Copiar ordem p/ Discord</button><button class="btn sm" id="res">Copiar aprovados p/ Discord</button></div><div id="lst"></div>`;
    const setStatus = (status) => async (r, reload) => {
      const u = await sb().from('applications').update({ status }).eq('id', r.id);
      TJ.toast(u.error ? u.error.message : 'Situação atualizada.', !!u.error); reload();
    };
    const show = () => TJ.crud($('#lst', tc), { id: 'applications', table: 'applications', select: '*', filter: { round_id: $('#rd', tc).value }, order: ['created_at', false], canWrite: can, noCreate: true, canDelete: true, editLabel: 'Candidato',
      header: (r) => `<div class="card" style="margin:10px 0;background:var(--soft)"><b>@${esc(r.roblox_name)}</b>${r.discord_user ? ` · Discord: ${esc(r.discord_user)}` : ''}<br>${TJ.answersHTML(r)}${(r.interview_log || []).length ? `<p class="small muted">Entrevista registrada: nota ${esc(String(r.score ?? '—'))}</p>` : ''}</div>`,
      fields: [{ k: 'status', label: 'Situação', type: 'select', opts: opts(L.app) }, { k: 'interview_order', label: 'Ordem da entrevista', type: 'number' }, { k: 'score', label: 'Nota (0 a 10)', type: 'number' }, { k: 'notes', label: 'Anotações internas', type: 'textarea', rows: 3 }],
      filters: [{ k: 'status', label: 'Situação', opts: opts(L.app) }],
      cols: [{ label: 'Ordem', k: 'interview_order' }, { label: 'Roblox', k: 'roblox_name' }, { label: 'Discord', k: 'discord_user' }, { label: 'Situação', fmt: (r) => `<span class="tag ${L.appTone[r.status] || ''}">${esc(L.app[r.status] || r.status)}</span>` }, { label: 'Nota', k: 'score' }, { label: 'Enviada', fmt: F.date('created_at') }, { label: 'Respostas', fmt: (r) => esc(((r.answers || []).map((x) => x.a).join(' | ') || r.experience || '').slice(0, 60)) }],
      actions: can ? [{ label: 'Entrevistar', fn: (r) => setStatus('aprovada_para_entrevista')(r, TJ.reloadCrud) }, { label: 'Aprovar', fn: (r) => setStatus('aprovada')(r, TJ.reloadCrud) }, { label: 'Reprovar', fn: (r) => setStatus('reprovada')(r, TJ.reloadCrud) }] : null });
    $('#rd', tc).onchange = show; await show();
    $('#draw', tc).onclick = async () => {
      const rid = $('#rd', tc).value;
      const { data } = await sb().from('applications').select('id').eq('round_id', rid).eq('status', 'aprovada_para_entrevista');
      if (!(data || []).length) return TJ.toast('Nenhum candidato com situação "Aprovado p/ entrevista" (use o botão Entrevistar).', true);
      const ids = shuffle(data.map((x) => x.id));
      for (let i = 0; i < ids.length; i++) { const r = await sb().from('applications').update({ interview_order: i + 1 }).eq('id', ids[i]); if (r.error) return TJ.toast(r.error.message, true); }
      TJ.toast('Ordem sorteada!'); show();
    };
    $('#exp', tc).onclick = async () => {
      const rid = $('#rd', tc).value, t = rounds.find((r) => r.id === rid)?.title;
      const { data } = await sb().from('applications').select('roblox_name,interview_order').eq('round_id', rid).not('interview_order', 'is', null).order('interview_order');
      if (!(data || []).length) return TJ.toast('Sorteie a ordem primeiro.', true);
      const txt = `# Ordem das entrevistas\n-# ${t}\n` + data.map((x) => `> **${x.interview_order}º** — ${x.roblox_name}`).join('\n');
      TJ.copy(txt, txt.length > 2000 ? `Copiado, mas tem ${txt.length} caracteres (limite sem Nitro: 2000).` : 'Ordem copiada em markdown!');
    };
    $('#res', tc).onclick = async () => {
      const rid = $('#rd', tc).value, t = rounds.find((r) => r.id === rid)?.title;
      const { data } = await sb().from('applications').select('roblox_name').eq('round_id', rid).eq('status', 'aprovada').order('roblox_name');
      if (!(data || []).length) return TJ.toast('Nenhum candidato aprovado ainda.', true);
      const txt = `# Resultado do processo seletivo\n-# ${t}\nParabéns aos aprovados:\n` + data.map((x) => `> **${x.roblox_name}**`).join('\n');
      TJ.copy(txt, txt.length > 2000 ? `Copiado, mas tem ${txt.length} caracteres (limite sem Nitro: 2000).` : 'Resultado copiado em markdown!');
    };
  }

  // ---------- entrevista com perguntas sorteadas ----------
  async function tabEntrevista(tc, can) {
    const [{ data: rounds }, { data: qs }] = await Promise.all([
      sb().from('selection_rounds').select('id,title').order('created_at', { ascending: false }),
      sb().from('questions').select('*').eq('active', true),
    ]);
    if (!(rounds || []).length) { tc.innerHTML = '<div class="empty">Crie uma vaga e tenha candidatos primeiro.</div>'; return; }
    if (!(qs || []).length) { tc.innerHTML = '<div class="empty">O banco de perguntas está vazio. Importe suas perguntas na aba <b>Banco de perguntas</b>.</div>'; return; }
    const count = (lv) => (qs || []).filter((q) => q.level === lv).length;
    tc.innerHTML = `<div class="card"><div class="grid g2" style="align-items:end">
      <div><label>Vaga</label><select id="rd">${rounds.map((r) => `<option value="${r.id}">${esc(r.title)}</option>`).join('')}</select></div>
      <div><label>Candidato</label><select id="cd"></select></div></div>
      <label>Quantas perguntas de cada nível?</label><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">${LV.map(([k, n]) => `<div><span class="small muted">${n} (${count(k)} no banco)</span><input type="number" min="0" max="20" value="${k === 'inexistente' ? 1 : 2}" data-lv="${k}"></div>`).join('')}</div>
      <label>Tipo de pergunta</label><select id="ty"><option value="">Misturar os três tipos</option>${TY.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select>
      <p style="margin-bottom:0"><button class="btn blue" id="gen">Gerar roteiro de perguntas</button></p></div><div id="run"></div>`;
    let apps = [];
    const loadApps = async () => {
      const { data } = await sb().from('applications').select('*').eq('round_id', $('#rd', tc).value).order('interview_order', { nullsFirst: false }).order('created_at');
      apps = data || [];
      $('#cd', tc).innerHTML = apps.length ? apps.map((a) => `<option value="${a.id}">${a.interview_order ? a.interview_order + 'º · ' : ''}${esc(a.roblox_name)} — ${esc(L.app[a.status] || a.status)}</option>`).join('') : '<option value="">Nenhum candidato</option>';
    };
    $('#rd', tc).onchange = loadApps; await loadApps();

    let list = [];
    const drawRun = () => {
      const run = $('#run', tc), cand = apps.find((a) => a.id === $('#cd', tc).value);
      if (!list.length) { run.innerHTML = ''; return; }
      const sum = list.reduce((s, x) => s + (x.pts ?? 0), 0), answered = list.filter((x) => x.pts != null).length;
      const score = Math.round((sum / list.length) * 100) / 10;
      run.innerHTML = `<div class="row spread" style="margin:18px 0 6px"><h3 style="margin:0">Entrevista: @${esc(cand?.roblox_name || '')}</h3><div><span class="small muted">${answered}/${list.length} respondidas · nota</span> <span class="score">${score.toFixed(1)}</span></div></div>
        ${list.map((x, i) => `<div class="qcard ${x.pts === 1 ? 'ok' : x.pts === 0.5 ? 'half' : x.pts === 0 ? 'no' : ''}"><div class="row spread"><span class="small muted"><span class="tag">${esc(L.level[x.level] || x.level)}</span> <span class="tag gray">${esc(L.qtype[x.type] || x.type)}</span></span><button class="btn sm" data-swap="${i}">Trocar pergunta</button></div>
          <div class="q">${i + 1}. ${esc(x.question)}</div>
          <details><summary class="small muted" style="cursor:pointer">Ver resposta esperada</summary><p class="small">${esc(x.answer || 'Sem resposta cadastrada.')}${x.source ? `<br><span class="muted">Fonte: ${esc(x.source)}</span>` : ''}</p></details>
          <div class="row" style="margin-top:8px"><button class="btn sm" data-pt="${i}:1">✔ Acertou</button><button class="btn sm" data-pt="${i}:0.5">½ Parcial</button><button class="btn sm danger" data-pt="${i}:0">✖ Errou</button></div></div>`).join('')}
        <p class="row"><button class="btn gold" id="savei">Salvar entrevista no candidato</button><button class="btn" id="copyi">Copiar resumo</button></p>`;
      run.querySelectorAll('[data-pt]').forEach((b) => (b.onclick = () => { const [i, v] = b.dataset.pt.split(':'); list[+i].pts = list[+i].pts === +v ? null : +v; drawRun(); }));
      run.querySelectorAll('[data-swap]').forEach((b) => (b.onclick = () => {
        const i = +b.dataset.swap, cur = list[i], used = new Set(list.map((x) => x.id));
        const ty = $('#ty', tc).value, pool = qs.filter((q) => q.level === cur.level && !used.has(q.id) && (!ty || q.type === ty));
        if (!pool.length) return TJ.toast('Não há outra pergunta disponível nesse nível.', true);
        list[i] = Object.assign({}, pool[rnd(pool.length)], { pts: null }); drawRun();
      }));
      $('#copyi', run).onclick = () => TJ.copy(`Entrevista de ${cand?.roblox_name} — nota ${score.toFixed(1)}\n` + list.map((x, i) => `${i + 1}. ${x.question} → ${x.pts === 1 ? 'acertou' : x.pts === 0.5 ? 'parcial' : x.pts === 0 ? 'errou' : 'sem avaliação'}`).join('\n'), 'Resumo copiado.');
      $('#savei', run).onclick = async () => {
        if (!cand) return TJ.toast('Escolha um candidato.', true);
        const log = list.map((x) => ({ q: x.question, level: x.level, type: x.type, pts: x.pts }));
        const patch = { interview_log: log, score };
        if (['recebida', 'aprovada_para_entrevista'].includes(cand.status)) patch.status = 'entrevistada';
        const r = await sb().from('applications').update(patch).eq('id', cand.id);
        if (r.error) return TJ.toast(r.error.message, true);
        TJ.toast('Entrevista salva no candidato.'); await loadApps();
      };
    };
    $('#gen', tc).onclick = async () => {
      const cand = apps.find((a) => a.id === $('#cd', tc).value);
      if (!cand) return TJ.toast('Escolha um candidato.', true);
      const asked = new Set((cand.interview_log || []).map((x) => x.q));
      const ty = $('#ty', tc).value; list = [];
      for (const inp of tc.querySelectorAll('[data-lv]')) {
        const n = Math.max(0, Math.min(20, +inp.value || 0)); if (!n) continue;
        let pool = qs.filter((q) => q.level === inp.dataset.lv && (!ty || q.type === ty));
        const fresh = pool.filter((q) => !asked.has(q.question)); if (fresh.length >= n) pool = fresh;
        // tenta equilibrar os tipos
        const picked = [], byType = {}; shuffle(pool).forEach((q) => (byType[q.type] = byType[q.type] || []).push(q));
        const types = Object.keys(byType); let k = 0;
        while (picked.length < n && types.some((t) => byType[t].length)) { const t = types[k++ % types.length]; if (byType[t].length) picked.push(byType[t].shift()); }
        list.push(...picked.map((q) => Object.assign({}, q, { pts: null })));
      }
      if (!list.length) return TJ.toast('Nenhuma pergunta encontrada com esses filtros.', true);
      drawRun();
    };
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
    await TJ.crud($('#lst', tc), { table: 'questions', order: ['level'], newLabel: 'Nova pergunta', canWrite: can, defaults: { level: 'basico', type: 'termo', version: 1, active: true },
      filters: [{ k: 'level', label: 'Nível', opts: LV }, { k: 'type', label: 'Tipo', opts: TY }, { k: 'active', label: 'Situação', opts: [['true', 'Ativas'], ['false', 'Desativadas']] }],
      fields: [{ k: 'level', label: 'Nível', type: 'select', opts: LV }, { k: 'type', label: 'Tipo', type: 'select', opts: TY }, { k: 'question', label: 'Pergunta (curta, falada)', type: 'textarea', rows: 3, req: true }, { k: 'answer', label: 'Resposta esperada', type: 'textarea', rows: 4 }, { k: 'source', label: 'Fonte', ph: 'Ex.: Código Penal, Art. 121' }, { k: 'version', label: 'Versão do banco', type: 'number' }, { k: 'active', label: 'Pergunta ativa (entra nos sorteios)', type: 'bool' }],
      cols: [{ label: 'Nível', fmt: F.map('level', L.level) }, { label: 'Tipo', fmt: F.map('type', L.qtype) }, { label: 'Pergunta', fmt: F.cut('question', 100) }, { label: 'Resposta', fmt: F.cut('answer', 60) }, { label: 'Fonte', k: 'source' }, { label: 'v', k: 'version' }, { label: 'Ativa', fmt: F.yn('active') }] });
  }

  // =====================================================================
  // SITE E APARÊNCIA
  // =====================================================================
  async function saveSite(patch) {
    const v = Object.assign({}, state.site, patch);
    const r = await sb().from('settings').upsert({ key: 'site', value: v, is_public: true });
    if (r.error) { TJ.toast(r.error.message, true); return false; }
    await TJ.loadSettings(); TJ.toast('Salvo! Já aplicado.'); return true;
  }
  function siteForm(tc, fields, can, intro) {
    tc.innerHTML = `<form class="card" id="sf" style="max-width:680px">${intro || ''}${fields.map((f) => TJ.fieldHTML(f, f.get ? f.get(state.site) : state.site[f.k])).join('')}<p style="margin-bottom:0"><button class="btn gold"${can ? '' : ' disabled'}>Salvar alterações</button></p></form>`;
    TJ.wireUploads(tc);
    $('#sf', tc).onsubmit = async (e) => {
      e.preventDefault(); const patch = {};
      fields.forEach((f) => { const v = TJ.readField(f, tc); if (f.set) f.set(patch, v); else patch[f.k] = v; });
      await saveSite(patch);
    };
  }

  P.site = async (el, [tab = 'aparencia']) => {
    el.innerHTML = H.head('Site e aparência', 'Tudo que você vê no site público pode ser mudado aqui, sem mexer em código.') +
      H.tabs('site', [['aparencia', 'Aparência'], ['inicio', 'Página inicial'], ['menu', 'Menu'], ['paginas', 'Páginas'], ['discord', 'Discord'], ['avancado', 'Avançado']], tab) + '<div id="tc"></div>';
    const tc = $('#tc', el), can = TJ.can('manage_site');
    const S = state.site;
    if (tab === 'aparencia') {
      siteForm(tc, [
        { k: 'name', label: 'Nome completo do tribunal', req: true }, { k: 'short', label: 'Nome curto (topo)' }, { k: 'subtitle', label: 'Subtítulo do topo' },
        { k: 'logo_url', label: 'Brasão / logo', upload: 'site' }, { k: 'favicon_url', label: 'Ícone da aba do navegador (opcional)', upload: 'site' },
        { k: 'primary', label: 'Cor principal', type: 'color' }, { k: 'accent', label: 'Cor de destaque (dourado)', type: 'color' },
        { k: 'font', label: 'Estilo dos títulos', type: 'select', opts: [['serif', 'Clássico (com serifa)'], ['sans', 'Moderno (sem serifa)']] },
        { k: 'radius', label: 'Arredondamento dos cantos (0 a 28)', type: 'number' },
        { k: 'density', label: 'Espaçamento', type: 'select', opts: [['compact', 'Compacto'], ['normal', 'Normal'], ['comfortable', 'Confortável']] },
        { k: 'footer', label: 'Texto do rodapé', type: 'textarea', rows: 2 }, { k: 'discord_url', label: 'Link de convite do Discord' },
      ], can);
    } else if (tab === 'inicio') {
      const hv = (k) => (S.home || {})[k] !== false;
      siteForm(tc, [
        { k: 'hero_title', label: 'Título da página inicial' }, { k: 'hero_text', label: 'Texto de apresentação', type: 'textarea', rows: 3 },
        { k: 'hero_image', label: 'Imagem de fundo do topo (opcional)', upload: 'site', help: 'Use uma imagem larga. Um filtro escuro é aplicado por cima para o texto continuar legível.' },
        { k: 'h_stats', label: 'Mostrar contadores de processos', type: 'bool', get: () => S.show_stats !== false && hv('stats'), set: (p, v) => { p.show_stats = v; p.home = Object.assign({}, S.home, { stats: v }); } },
        { k: 'h_ann', label: 'Mostrar últimos comunicados', type: 'bool', get: () => hv('announcements'), set: (p, v) => (p.home = Object.assign({}, p.home || S.home, { announcements: v })) },
        { k: 'h_hear', label: 'Mostrar próximas audiências', type: 'bool', get: () => hv('hearings'), set: (p, v) => (p.home = Object.assign({}, p.home || S.home, { hearings: v })) },
        { k: 'h_sel', label: 'Mostrar faixa de processo seletivo aberto', type: 'bool', get: () => hv('selection'), set: (p, v) => (p.home = Object.assign({}, p.home || S.home, { selection: v })) },
      ], can);
    } else if (tab === 'menu') {
      let items = TJ.navItems().map((i) => ({ ...i }));
      const draw = () => {
        tc.innerHTML = `<div class="card navedit" style="max-width:680px"><p class="muted small">Renomeie, esconda ou mude a ordem dos itens do menu do site. (Páginas extras aparecem no menu pela aba <b>Páginas</b>.)</p>
          ${items.map((it, i) => `<div class="row"><input type="text" data-i="${i}" value="${esc(it.label)}"><label class="chk" style="margin:0"><input type="checkbox" data-v="${i}"${it.show ? ' checked' : ''}> visível</label><button class="btn sm" data-up="${i}">↑</button><button class="btn sm" data-dn="${i}">↓</button></div>`).join('')}
          <p style="margin-bottom:0"><button class="btn gold" id="mn"${can ? '' : ' disabled'}>Salvar menu</button> <button class="btn" id="mr">Restaurar padrão</button></p></div>`;
        tc.querySelectorAll('[data-i]').forEach((x) => (x.oninput = () => (items[+x.dataset.i].label = x.value)));
        tc.querySelectorAll('[data-v]').forEach((x) => (x.onchange = () => (items[+x.dataset.v].show = x.checked)));
        tc.querySelectorAll('[data-up]').forEach((x) => (x.onclick = () => { const i = +x.dataset.up; if (i) { [items[i - 1], items[i]] = [items[i], items[i - 1]]; draw(); } }));
        tc.querySelectorAll('[data-dn]').forEach((x) => (x.onclick = () => { const i = +x.dataset.dn; if (i < items.length - 1) { [items[i + 1], items[i]] = [items[i], items[i + 1]]; draw(); } }));
        $('#mn', tc).onclick = () => saveSite({ nav: items.map((i) => ({ k: i.k, label: i.label.trim() || (TJ.navDefault.find((d) => d[0] === i.k) || [])[1], show: i.show })) });
        $('#mr', tc).onclick = async () => { if (await saveSite({ nav: [] })) { items = TJ.navItems().map((i) => ({ ...i })); draw(); } };
      };
      draw();
    } else if (tab === 'paginas') {
      await TJ.crud(tc, { table: 'pages', pk: 'slug', order: ['sort'], newLabel: 'Nova página', canWrite: can, defaults: { sort: 100, is_public: true, in_menu: true },
        fields: [{ k: 'slug', label: 'Endereço (sem espaços)', req: true, ro: true, ph: 'ex.: regimento' }, { k: 'title', label: 'Título', req: true }, { k: 'body', label: 'Conteúdo', type: 'textarea', rows: 16, help: 'Mesma formatação dos comunicados.' }, { k: 'sort', label: 'Ordem no menu', type: 'number' }, { k: 'in_menu', label: 'Aparece no menu', type: 'bool' }, { k: 'is_public', label: 'Pública', type: 'bool' }],
        cols: [{ label: 'Título', k: 'title' }, { label: 'Endereço', fmt: (r) => esc('#/p/' + r.slug) }, { label: 'Menu', fmt: F.yn('in_menu') }, { label: 'Pública', fmt: F.yn('is_public') }, { label: 'Ordem', k: 'sort' }],
        beforeSave: (p, row) => { if (!row && !/^[a-z0-9\-_]+$/.test(p.slug || '')) throw new Error('Endereço: só letras minúsculas, números, - e _.'); } });
    } else if (tab === 'discord') {
      const { data } = await sb().from('settings').select('value').eq('key', 'discord_webhook').maybeSingle();
      tc.innerHTML = `<form class="card" id="wf" style="max-width:680px"><h3>Envio automático ao Discord</h3><p class="muted small">No Discord: Configurações do canal → Integrações → Webhooks → Novo webhook → Copiar URL. Cole abaixo. Quem tem a permissão de comunicados poderá enviar avisos ao canal por este site.</p>
        <label>URL do webhook</label><input id="u" value="${esc(data?.value?.url || '')}" placeholder="https://discord.com/api/webhooks/…"><p><button class="btn gold"${can ? '' : ' disabled'}>Salvar</button> <button type="button" class="btn" id="wt">Enviar teste</button></p></form>`;
      $('#wf', tc).onsubmit = async (e) => {
        e.preventDefault(); const url = $('#u', tc).value.trim();
        if (url && !/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//.test(url)) return TJ.toast('Isso não parece um webhook do Discord.', true);
        const r = await sb().from('settings').upsert({ key: 'discord_webhook', value: { url }, is_public: false });
        TJ.toast(r.error ? r.error.message : 'Webhook salvo.', !!r.error);
      };
      $('#wt', tc).onclick = () => TJ.sendWebhook('Teste de conexão do site do Tribunal.');
    } else {
      siteForm(tc, [{ k: 'custom_css', label: 'CSS personalizado (avançado)', type: 'textarea', rows: 10, help: 'Para quem entende de CSS: estilos extras aplicados em todo o site. Se algo quebrar, apague o conteúdo e salve.' }], can, '<p class="muted small">Área avançada. A maioria das mudanças visuais já está em <b>Aparência</b>.</p>');
    }
  };
})();
