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
      if (nr.rank > (or?.rank ?? 0) && TJ.automate) TJ.automate('member_promoted', { nome: m.display_name || m.roblox_name, cargo: nr.label });
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
      await logEvent(m.id, 'demissao', null, r);
      if (TJ.automate) TJ.automate('member_dismissed', { nome: m.display_name || m.roblox_name });
      done('Membro demitido.');
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

  const BACKUP_TABLES = ['roles', 'profiles', 'member_events', 'cases', 'case_parties', 'case_events', 'evidences', 'filings', 'templates', 'announcements', 'board_posts', 'hearings', 'tasks', 'selection_rounds', 'applications', 'questions', 'pages', 'discord_rules'];

  P.site = async (el, [tab = 'aparencia']) => {
    el.innerHTML = H.head('Site e aparência', 'Tudo que você vê no site público pode ser mudado aqui, sem mexer em código.') +
      H.tabs('site', [['aparencia', 'Aparência'], ['imagens', 'Imagens e banners'], ['inicio', 'Página inicial'], ['menu', 'Menu'], ['paginas', 'Páginas'], ['avisos', 'Avisos e manutenção'], ['discord', 'Discord'], ['avancado', 'Avançado e backup']], tab) + '<div id="tc"></div>';
    const tc = $('#tc', el), can = TJ.can('manage_site');
    const S = state.site;
    const nested = (obj, key) => (S[obj] || {})[key];
    const setNested = (obj, key) => (p, v) => (p[obj] = Object.assign({}, p[obj] || S[obj] || {}, { [key]: v }));
    if (tab === 'aparencia') {
      siteForm(tc, [
        { k: 'name', label: 'Nome completo do tribunal', req: true }, { k: 'short', label: 'Nome curto (topo)' }, { k: 'subtitle', label: 'Subtítulo do topo' },
        { k: 'logo_url', label: 'Brasão / logo', upload: 'midia' }, { k: 'favicon_url', label: 'Ícone da aba do navegador (opcional)', upload: 'midia' },
        { k: 'style', label: 'Estilo do site', type: 'select', opts: [['moderno', 'Moderno (barra flutuante, cantos arredondados)'], ['classico', 'Clássico (barra reta, bordas douradas)']] },
        { k: 'primary', label: 'Cor principal', type: 'color' }, { k: 'accent', label: 'Cor de destaque (dourado)', type: 'color' },
        { k: 'font', label: 'Fonte dos títulos', type: 'select', opts: [['sans', 'Moderna (sem serifa)'], ['serif', 'Clássica (com serifa)']] },
        { k: 'radius', label: 'Arredondamento dos cantos (0 a 28)', type: 'number' },
        { k: 'density', label: 'Espaçamento', type: 'select', opts: [['compact', 'Compacto'], ['normal', 'Normal'], ['comfortable', 'Confortável']] },
        { k: 'footer', label: 'Texto do rodapé', type: 'textarea', rows: 2 }, { k: 'discord_url', label: 'Link de convite do Discord' },
      ], can);
    } else if (tab === 'imagens') {
      const pg = [['processos', 'Processos'], ['comunicados', 'Comunicados'], ['agenda', 'Agenda'], ['selecao', 'Seleção'], ['equipe', 'Equipe']];
      siteForm(tc, [
        { k: 'hero_image', label: 'Imagem de fundo da página inicial', upload: 'midia', help: 'Imagem larga (ex.: 1600x700). Um filtro escuro é aplicado por cima.' },
        { k: 'hero_overlay', label: 'Escurecimento da imagem (0 a 90)', type: 'number', help: 'Quanto maior, mais escura a imagem (melhora a leitura do texto).' },
        { k: 'hero_align', label: 'Alinhamento do texto da capa', type: 'select', opts: [['left', 'À esquerda'], ['center', 'Centralizado']] },
        ...pg.map(([k, t]) => ({ k: 'b_' + k, label: `Banner da página ${t}`, upload: 'midia', get: () => nested('banners', k), set: setNested('banners', k) })),
      ], can, '<p class="muted small">Todas as imagens são opcionais. Para tirar uma imagem, apague o link e salve. Capas de processos, imagens de comunicados e banners de vagas são colocados nos próprios formulários.</p>');
    } else if (tab === 'inicio') {
      const hv = (k) => (S.home || {})[k] !== false;
      siteForm(tc, [
        { k: 'hero_title', label: 'Título da página inicial' }, { k: 'hero_text', label: 'Texto de apresentação', type: 'textarea', rows: 3 },
        { k: 'h_stats', label: 'Mostrar contadores de processos', type: 'bool', get: () => S.show_stats !== false && hv('stats'), set: (p, v) => { p.show_stats = v; p.home = Object.assign({}, p.home || S.home, { stats: v }); } },
        { k: 'h_ann', label: 'Mostrar últimos comunicados', type: 'bool', get: () => hv('announcements'), set: (p, v) => (p.home = Object.assign({}, p.home || S.home, { announcements: v })) },
        { k: 'h_hear', label: 'Mostrar próximas audiências', type: 'bool', get: () => hv('hearings'), set: (p, v) => (p.home = Object.assign({}, p.home || S.home, { hearings: v })) },
        { k: 'h_sel', label: 'Mostrar faixa de processo seletivo aberto', type: 'bool', get: () => hv('selection'), set: (p, v) => (p.home = Object.assign({}, p.home || S.home, { selection: v })) },
      ], can);
    } else if (tab === 'menu') {
      let items = TJ.navItems().map((i) => ({ ...i }));
      const draw = () => {
        tc.innerHTML = `<div class="card navedit" style="max-width:720px"><p class="muted small">Renomeie, escolha um emoji de ícone, esconda ou mude a ordem dos itens do menu do site. (Páginas extras aparecem no menu pela aba <b>Páginas</b>.)</p>
          ${items.map((it, i) => `<div class="row"><input type="text" data-e="${i}" value="${esc(it.icon || '')}" maxlength="4" placeholder="🙂" style="width:64px;flex:none;text-align:center"><input type="text" data-i="${i}" value="${esc(it.label)}"><label class="chk" style="margin:0"><input type="checkbox" data-v="${i}"${it.show ? ' checked' : ''}> visível</label><button class="btn sm" data-up="${i}">↑</button><button class="btn sm" data-dn="${i}">↓</button></div>`).join('')}
          <p style="margin-bottom:0"><button class="btn gold" id="mn"${can ? '' : ' disabled'}>Salvar menu</button> <button class="btn" id="mr">Restaurar padrão</button></p></div>`;
        tc.querySelectorAll('[data-i]').forEach((x) => (x.oninput = () => (items[+x.dataset.i].label = x.value)));
        tc.querySelectorAll('[data-e]').forEach((x) => (x.oninput = () => (items[+x.dataset.e].icon = x.value)));
        tc.querySelectorAll('[data-v]').forEach((x) => (x.onchange = () => (items[+x.dataset.v].show = x.checked)));
        tc.querySelectorAll('[data-up]').forEach((x) => (x.onclick = () => { const i = +x.dataset.up; if (i) { [items[i - 1], items[i]] = [items[i], items[i - 1]]; draw(); } }));
        tc.querySelectorAll('[data-dn]').forEach((x) => (x.onclick = () => { const i = +x.dataset.dn; if (i < items.length - 1) { [items[i + 1], items[i]] = [items[i], items[i + 1]]; draw(); } }));
        $('#mn', tc).onclick = () => saveSite({ nav: items.map((i) => ({ k: i.k, label: i.label.trim() || (TJ.navDefault.find((d) => d[0] === i.k) || [])[1], show: i.show, icon: (i.icon || '').trim() })) });
        $('#mr', tc).onclick = async () => { if (await saveSite({ nav: [] })) { items = TJ.navItems().map((i) => ({ ...i })); draw(); } };
      };
      draw();
    } else if (tab === 'paginas') {
      await TJ.crud(tc, { table: 'pages', pk: 'slug', order: ['sort'], newLabel: 'Nova página', canWrite: can, defaults: { sort: 100, is_public: true, in_menu: true },
        fields: [{ k: 'slug', label: 'Endereço (sem espaços)', req: true, ro: true, ph: 'ex.: regimento' }, { k: 'title', label: 'Título', req: true }, { k: 'icon', label: 'Ícone (emoji, opcional)', ph: '📜' }, { k: 'banner_url', label: 'Banner da página (opcional)', upload: 'midia' }, { k: 'body', label: 'Conteúdo', type: 'textarea', rows: 16, help: 'Mesma formatação dos comunicados.' }, { k: 'sort', label: 'Ordem no menu', type: 'number' }, { k: 'in_menu', label: 'Aparece no menu', type: 'bool' }, { k: 'is_public', label: 'Pública', type: 'bool' }],
        cols: [{ label: 'Ícone', k: 'icon' }, { label: 'Título', k: 'title' }, { label: 'Endereço', fmt: (r) => esc('#/p/' + r.slug) }, { label: 'Menu', fmt: F.yn('in_menu') }, { label: 'Pública', fmt: F.yn('is_public') }, { label: 'Ordem', k: 'sort' }],
        beforeSave: (p, row) => { if (!row && !/^[a-z0-9\-_]+$/.test(p.slug || '')) throw new Error('Endereço: só letras minúsculas, números, - e _.'); } });
    } else if (tab === 'avisos') {
      siteForm(tc, [
        { k: 'tb_on', label: 'Mostrar faixa de aviso no topo do site', type: 'bool', get: () => nested('top_banner', 'on') === true, set: setNested('top_banner', 'on') },
        { k: 'tb_text', label: 'Texto da faixa', get: () => nested('top_banner', 'text'), set: setNested('top_banner', 'text') },
        { k: 'tb_link', label: 'Link da faixa (opcional)', get: () => nested('top_banner', 'link'), set: setNested('top_banner', 'link') },
        { k: 'tb_color', label: 'Cor da faixa', type: 'color', get: () => nested('top_banner', 'color') || '#c9a24b', set: setNested('top_banner', 'color') },
        { k: 'mt_on', label: 'MODO MANUTENÇÃO (visitantes veem só um aviso; membros continuam entrando)', type: 'bool', get: () => nested('maintenance', 'on') === true, set: setNested('maintenance', 'on') },
        { k: 'mt_msg', label: 'Mensagem da manutenção', type: 'textarea', rows: 2, get: () => nested('maintenance', 'message'), set: setNested('maintenance', 'message') },
      ], can);
    } else if (tab === 'discord') {
      tc.innerHTML = `<div class="card" style="max-width:680px"><h3>Discord</h3><p class="muted">Os canais (webhooks), o envio de mensagens, as automações e o histórico agora ficam na área <b>Discord</b> do painel.</p><p><a class="btn gold" href="#/painel/discord">Abrir a área Discord →</a></p></div>`;
    } else {
      siteForm(tc, [{ k: 'custom_css', label: 'CSS personalizado (avançado)', type: 'textarea', rows: 10, help: 'Para quem entende de CSS: estilos extras aplicados em todo o site. Se algo quebrar, apague o conteúdo e salve.' }], can, '<p class="muted small">Área avançada. A maioria das mudanças visuais já está em <b>Aparência</b> e <b>Imagens e banners</b>.</p>');
      tc.insertAdjacentHTML('beforeend', `<div class="card" style="max-width:680px;margin-top:16px"><h3>Backup dos dados</h3><p class="muted small">Baixa um arquivo JSON com processos, peças, comunicados, vagas, candidatos, perguntas, membros e mais. Guarde em lugar seguro. (Senhas e webhooks do Discord não entram.)</p><p style="margin-bottom:0"><button class="btn blue" id="bk">⬇ Baixar backup completo</button></p></div>`);
      $('#bk', tc).onclick = async () => {
        TJ.toast('Gerando backup…'); const out = { gerado_em: new Date().toISOString(), site: state.site };
        for (const t of BACKUP_TABLES) { const r = await sb().from(t).select('*').limit(10000); out[t] = r.error ? { erro: r.error.message } : r.data; }
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
        a.download = 'backup-tj-' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(a); a.click(); a.remove(); TJ.toast('Backup baixado!');
      };
    }
  };
})();
