/* Tribunal de Justiça de Ilha Bela - núcleo do site e páginas públicas (v2) */
(function () {
  const C = window.TJ_CONFIG || {};
  const TJ = (window.TJ = {});
  TJ.configured = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(String(C.SUPABASE_URL || '').trim());
  const state = (TJ.state = { U: null, P: null, blocked: null, site: {}, pages: [] });
  const $ = (s, r = document) => r.querySelector(s);
  TJ.$ = $;

  // ---------- utilidades ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  TJ.esc = esc;
  TJ.fmtDate = (d) => (d ? new Date(String(d).length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('pt-BR') : '');
  TJ.fmtDT = (d) => (d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '');
  TJ.toast = (msg, err) => {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'on' + (err ? ' err' : '');
    clearTimeout(TJ._tt);
    TJ._tt = setTimeout(() => (t.className = ''), err ? 6500 : 2800);
  };
  TJ.copy = async (text, okMsg) => {
    try { await navigator.clipboard.writeText(text); }
    catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e2) {}
      ta.remove();
    }
    TJ.toast(okMsg || 'Copiado!');
  };
  TJ.cssUrl = (u) => esc(encodeURI(String(u || '')).replace(/'/g, '%27'));
  TJ.tagsOf = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);
  TJ.store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  // Markdown simples (estilo Discord)
  TJ.md = function (src) {
    const lines = esc(src || '').split('\n');
    const out = []; let list = false;
    const close = () => { if (list) { out.push('</ul>'); list = false; } };
    const inl = (t) => t
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<u>$1</u>')
      .replace(/(^|[^*])\*([^*\n]+?)\*/g, '$1<em>$2</em>')
      .replace(/\|\|(.+?)\|\|/g, '<span class="spoiler">$1</span>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    for (const raw of lines) {
      const l = raw.trimEnd(); let m;
      if (!l.trim()) { close(); continue; }
      if ((m = l.match(/^(#{1,3})\s+(.*)$/))) { close(); const n = m[1].length + 1; out.push(`<h${n}>${inl(m[2])}</h${n}>`); }
      else if ((m = l.match(/^-#\s+(.*)$/))) { close(); out.push(`<p><small>${inl(m[1])}</small></p>`); }
      else if ((m = l.match(/^&gt;\s?(.*)$/))) { close(); out.push(`<blockquote>${inl(m[1])}</blockquote>`); }
      else if ((m = l.match(/^[-*]\s+(.*)$/))) { if (!list) { out.push('<ul>'); list = true; } out.push(`<li>${inl(m[1])}</li>`); }
      else { close(); out.push(`<p>${inl(l)}</p>`); }
    }
    close();
    return `<div class="md">${out.join('')}</div>`;
  };

  // rótulos
  const L = (TJ.L = {
    status: { em_andamento: ['Em andamento', 'warn'], em_julgamento: ['Em julgamento', 'warn'], sentenciado: ['Sentenciado', 'ok'], arquivado: ['Arquivado', 'gray'], suspenso: ['Suspenso', 'bad'] },
    kind: { criminal: 'Criminal', civel: 'Cível', administrativo: 'Administrativo' },
    side: { acusado: 'Acusado(a)', vitima: 'Vítima', testemunha: 'Testemunha', autor: 'Autor(a)', reu: 'Réu', outro: 'Outro' },
    ev: { relatorio: 'Relatório', anuncio: 'Anúncio', video: 'Gravação / vídeo', imagem: 'Imagem', documento: 'Documento', outro: 'Outro' },
    cat: { comunicado: 'Comunicado', edital: 'Edital', aviso: 'Aviso', resultado: 'Resultado', portaria: 'Portaria' },
    round: { aberto: ['Inscrições abertas', 'ok'], fechado: ['Inscrições fechadas', 'gray'], em_entrevistas: ['Em entrevistas', 'warn'], encerrado: ['Encerrado', 'gray'] },
    app: { recebida: 'Recebida', aprovada_para_entrevista: 'Aprovado p/ entrevista', entrevistada: 'Entrevistada', aprovada: 'Aprovado(a)', reprovada: 'Reprovado(a)' },
    appTone: { recebida: 'gray', aprovada_para_entrevista: 'warn', entrevistada: 'warn', aprovada: 'ok', reprovada: 'bad' },
    hear: { audiencia: 'Audiência', julgamento: 'Julgamento', sessao: 'Sessão', entrevista: 'Entrevista', outro: 'Outro' },
    filing: { relatorio: 'Relatório', alegacao: 'Alegações', rol_testemunhas: 'Rol de testemunhas', peticao: 'Petição', outro: 'Outro' },
    member: { ativo: ['Ativo', 'ok'], suspenso: ['Suspenso', 'warn'], demitido: ['Demitido', 'bad'] },
    level: { inexistente: 'Inexistente', basico: 'Básico', intermediario: 'Intermediário', avancado: 'Avançado' },
    qtype: { termo: 'Termo jurídico', codigo: 'O que diz o código', situacao: 'Situação' },
  });
  TJ.tag = (map, key) => { const v = map[key]; return v ? `<span class="tag ${v[1]}">${esc(v[0])}</span>` : `<span class="tag">${esc(key)}</span>`; };

  // ---------- Supabase ----------
  if (TJ.configured) {
    try { TJ.sb = window.supabase.createClient(String(C.SUPABASE_URL).trim(), String(C.SUPABASE_ANON_KEY || '').trim()); }
    catch (e) { console.error(e); TJ.configured = false; }
  }
  const sb = () => TJ.sb;
  const emailOf = (n) => String(n || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '') + '@membros.tjilhabela.org';
  TJ.emailOf = emailOf;
  TJ.can = (p) => !!(state.P && state.P.active && (state.P.role?.perms || []).some((x) => x === '*' || x === p));

  async function loadSession() {
    const { data: { session } } = await sb().auth.getSession();
    state.U = session?.user || null; state.P = null; state.blocked = null;
    if (state.U) {
      const { data } = await sb().from('profiles').select('*, role:roles(*)').eq('id', state.U.id).maybeSingle();
      if (data && data.active) state.P = data; else if (data) state.blocked = data;
    }
  }
  TJ.loadSession = loadSession;

  const NAV_DEFAULT = [['', 'Início'], ['processos', 'Processos'], ['comunicados', 'Comunicados'], ['agenda', 'Agenda'], ['selecao', 'Seleção'], ['atendimento', 'Atendimento'], ['equipe', 'Equipe']];
  TJ.navDefault = NAV_DEFAULT;
  TJ.navItems = () => {
    const cfg = Array.isArray(state.site.nav) ? state.site.nav : [];
    const out = NAV_DEFAULT.map(([k, t]) => { const c = cfg.find((x) => x.k === k) || {}; return { k, label: c.label || t, show: c.show !== false, icon: c.icon || '' }; });
    cfg.forEach((c, i) => { const idx = out.findIndex((o) => o.k === c.k); if (idx >= 0) out[idx]._i = i; });
    out.sort((a, b) => (a._i ?? 99) - (b._i ?? 99));
    return out;
  };

  const SITE_DEFAULTS = { name: 'Tribunal de Justiça de Ilha Bela', short: 'TJ', primary: '#12284a', accent: '#c9a24b', show_stats: true, style: 'moderno', font: 'sans', radius: 18, density: 'normal', home: {}, banners: {} };
  function applyAppearance() {
    const s = state.site, r = document.documentElement;
    r.style.setProperty('--primary', s.primary || '#12284a');
    r.style.setProperty('--accent', s.accent || '#c9a24b');
    r.style.setProperty('--r', (Number(s.radius) >= 0 ? Number(s.radius) : 18) + 'px');
    r.dataset.style = s.style || 'moderno';
    const tc = document.querySelector('meta[name=theme-color]'); if (tc) tc.content = s.primary || '#12284a';
    r.dataset.density = s.density || 'normal';
    r.dataset.font = s.font || 'serif';
    const st = document.getElementById('custom-css'); if (st) st.textContent = s.custom_css || '';
    const ic = s.favicon_url || s.logo_url;
    if (ic) { let l = document.querySelector('link[rel=icon]'); if (!l) { l = document.createElement('link'); l.rel = 'icon'; document.head.appendChild(l); } l.href = ic; }
    document.title = s.name || document.title;
  }
  TJ.applyAppearance = applyAppearance;

  async function loadSettings() {
    const [s, p] = await Promise.all([
      sb().from('settings').select('*').eq('key', 'site').maybeSingle(),
      sb().from('pages').select('slug,title,sort,in_menu,icon').eq('is_public', true).eq('in_menu', true).order('sort'),
    ]);
    state.site = Object.assign({}, SITE_DEFAULTS, s.data?.value || {});
    state.pages = p.data || [];
    applyAppearance();
  }
  TJ.loadSettings = loadSettings;

  // ---------- casca ----------
  function shell() {
    const s = state.site;
    const logo = s.logo_url ? `<img src="${esc(s.logo_url)}" alt="">` : `<span class="logo">⚖</span>`;
    const tb = s.top_banner || {};
    const banner = tb.on && tb.text ? `<div class="topbanner" style="${tb.color ? 'background:' + esc(tb.color) + ';' : ''}">${tb.link ? `<a href="${esc(tb.link)}">${esc(tb.text)}</a>` : esc(tb.text)}</div>` : '';
    $('#app').innerHTML = `${banner}
      <header class="top"><div class="wrap">
        <a class="brand" href="#/">${logo}<span><b>${esc(s.short || s.name)}</b><small>${esc(s.subtitle || '')}</small></span></a>
        <button class="iconbtn burger" id="burger" aria-label="Abrir menu">☰</button>
        <nav class="nav" id="nav"></nav>
      </div></header>
      <main id="view"></main>
      <footer class="footer"><div class="wrap">${esc(s.footer || '')}${s.discord_url ? ` · <a href="${esc(s.discord_url)}" target="_blank" rel="noopener">Discord</a>` : ''}</div></footer>`;
    $('#burger').onclick = () => $('#nav').classList.toggle('open');
  }
  function navRender(r) {
    let h = TJ.navItems().filter((i) => i.show).map((i) => `<a href="#/${i.k}" class="${r === i.k ? 'on' : ''}">${i.icon ? esc(i.icon) + ' ' : ''}${esc(i.label)}</a>`).join('');
    h += state.pages.map((p) => `<a href="#/p/${esc(p.slug)}">${p.icon ? esc(p.icon) + ' ' : ''}${esc(p.title)}</a>`).join('');
    h += state.P ? `<a class="cta" href="#/painel">Painel</a><a href="#/sair">Sair</a>` : `<a class="cta" href="#/entrar">Entrar</a>`;
    h += `<button class="iconbtn" id="theme" title="Tema claro/escuro" aria-label="Alternar tema">◐</button>`;
    const nav = $('#nav'); nav.innerHTML = h; nav.classList.remove('open');
    $('#theme').onclick = () => {
      const d = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = d; TJ.store.set('tj-theme', d);
    };
  }

  // ---------- formulário configurável (vagas) ----------
  TJ.formFieldsHTML = function (fields) {
    return (fields || []).map((f) => {
      const id = 'ff_' + f.id, req = f.required ? ' required' : '';
      const lab = `${esc(f.label)}${f.required ? ' *' : ''}`;
      if (f.type === 'checkbox') return `<label class="chk"><input type="checkbox" id="${id}"${req}> ${lab}</label>`;
      let inp;
      if (f.type === 'textarea') inp = `<textarea id="${id}" maxlength="2000"${req}></textarea>`;
      else if (f.type === 'select') inp = `<select id="${id}"${req}><option value="">Selecione…</option>${(f.options || []).map((o) => `<option>${esc(o)}</option>`).join('')}</select>`;
      else inp = `<input type="text" id="${id}" maxlength="300"${req}>`;
      return `<label for="${id}">${lab}</label>${inp}`;
    }).join('');
  };
  TJ.readFormAnswers = function (root, fields) {
    return (fields || []).map((f) => {
      const el = root.querySelector('#ff_' + f.id); if (!el) return null;
      const a = f.type === 'checkbox' ? (el.checked ? 'Sim' : 'Não') : el.value.trim();
      return { q: f.label, a };
    }).filter(Boolean);
  };
  TJ.answersHTML = function (row) {
    const an = Array.isArray(row.answers) ? row.answers : [];
    if (an.length) return an.map((x) => `<p style="margin:6px 0"><b>${esc(x.q)}</b><br>${esc(x.a || '—')}</p>`).join('');
    const parts = [];
    if (row.experience) parts.push(`<p style="margin:6px 0"><b>Experiência</b><br>${esc(row.experience)}</p>`);
    if (row.motivation) parts.push(`<p style="margin:6px 0"><b>Motivação</b><br>${esc(row.motivation)}</p>`);
    return parts.join('') || '<p class="muted">Sem respostas.</p>';
  };

  // ---------- páginas públicas ----------
  const head = (t, sub, key, img) => {
    const b = img || (state.site.banners || {})[key];
    const st = b ? ` style="background-image:linear-gradient(rgba(8,16,38,.72),rgba(8,16,38,.45)),url('${TJ.cssUrl(b)}')"` : '';
    return `<div class="pagehead${b ? ' has-img' : ''}"${st}><div class="wrap"><h1>${esc(t)}</h1>${sub ? `<p class="muted" style="margin:6px 0 0">${esc(sub)}</p>` : ''}</div></div>`;
  };
  const empty = (t) => `<div class="empty">${esc(t)}</div>`;
  TJ.head = head;
  const pages = {};
  TJ.pages = pages;

  const annCard = (a) => `<div class="card" style="margin-bottom:14px">${a.image_url ? `<img class="cover" src="${esc(a.image_url)}" alt="" loading="lazy">` : ''}<div class="row spread"><span class="tag">${esc(L.cat[a.category] || a.category)}</span><span class="small muted">${TJ.fmtDate(a.created_at)}${a.pinned ? ' · 📌 fixado' : ''}</span></div><h3 style="margin-top:8px">${esc(a.title)}</h3>${TJ.md(a.body)}</div>`;
  const hearCard = (h) => `<div class="card" style="margin-bottom:14px"><div class="row spread"><span class="tag">${esc(L.hear[h.kind] || h.kind)}</span><b>${TJ.fmtDT(h.starts_at)}</b></div><h3 style="margin-top:8px">${esc(h.title)}</h3>${h.place ? `<p class="muted small">Local: ${esc(h.place)}</p>` : ''}${h.notes ? `<p class="small">${esc(h.notes)}</p>` : ''}</div>`;

  pages[''] = async (v) => {
    const s = state.site, H = s.home || {};
    const nowIso = new Date().toISOString();
    const [cs, an, hr, rd] = await Promise.all([
      sb().from('cases').select('id,status').eq('is_public', true),
      sb().from('announcements').select('*').eq('published', true).order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(3),
      sb().from('hearings').select('*').eq('is_public', true).gte('starts_at', nowIso).order('starts_at').limit(4),
      sb().from('selection_rounds').select('*').eq('is_public', true).eq('audience', 'publico').eq('status', 'aberto'),
    ]);
    const cases = cs.data || [];
    const stat = (n, t) => `<div class="card stat"><b>${n}</b><span class="muted">${t}</span></div>`;
    const ov = Math.min(90, Math.max(0, Number(s.hero_overlay ?? 65))) / 100;
    const heroBg = s.hero_image ? ` style="background-image:linear-gradient(135deg,rgba(10,20,40,${ov + 0.15}),rgba(10,20,40,${Math.max(0, ov - 0.1)})),url('${TJ.cssUrl(s.hero_image)}')"` : '';
    const blocks = [];
    if (H.selection !== false && (rd.data || []).length) blocks.push(`<div class="wrap section" style="padding-bottom:0"><a class="card banner" href="#/selecao"><b>Processo seletivo aberto:</b> ${rd.data.map((r) => esc(r.title)).join(' · ')} — <u>inscreva-se</u></a></div>`);
    if (s.show_stats !== false && H.stats !== false) blocks.push(`<div class="wrap section"><div class="grid g3">
        ${stat(cases.length, 'processos públicos')}
        ${stat(cases.filter((c) => c.status === 'em_andamento' || c.status === 'em_julgamento').length, 'em andamento')}
        ${stat(cases.filter((c) => c.status === 'sentenciado').length, 'sentenciados')}</div></div>`);
    const cols = [];
    if (H.announcements !== false) cols.push(`<div><h2>Últimos comunicados</h2>${(an.data || []).length ? an.data.map(annCard).join('') : empty('Nenhum comunicado ainda.')}<p><a href="#/comunicados">Ver todos →</a></p></div>`);
    if (H.hearings !== false) cols.push(`<div><h2>Próximas audiências</h2>${(hr.data || []).length ? hr.data.map(hearCard).join('') : empty('Nenhuma audiência marcada.')}<p><a href="#/agenda">Ver agenda →</a></p></div>`);
    if (cols.length) blocks.push(`<div class="wrap section"><div class="grid g2" style="align-items:start">${cols.join('')}</div></div>`);
    v.innerHTML = `<section class="hero${s.hero_align === 'center' ? ' center' : ''}"${heroBg}><div class="wrap">
        <h1>${esc(s.hero_title || s.name)}</h1><p>${esc(s.hero_text || '')}</p>
        <div class="btns"><a class="btn gold" href="#/processos">Consultar processos</a><a class="btn" href="#/comunicados">Ver comunicados</a></div>
      </div></section>${blocks.join('')}`;
  };

  pages.processos = async (v) => {
    const { data, error } = await sb().from('cases').select('*').eq('is_public', true).order('opened_at', { ascending: false });
    if (error) throw error;
    const all = data || [];
    v.innerHTML = head('Processos', 'Consulte o andamento e as provas dos processos públicos.', 'processos') + `<div class="wrap section">
      <div class="toolbar"><input id="q" class="q" type="search" placeholder="Buscar por número, título ou nome…" aria-label="Buscar">
      <select id="st"><option value="">Todas as situações</option>${Object.entries(L.status).map(([k, x]) => `<option value="${k}">${x[0]}</option>`).join('')}</select></div>
      <div class="chips" id="tagchips"></div><div class="grid g2" id="list"></div></div>`;
    const allTags = [...new Set(all.flatMap((c) => TJ.tagsOf(c.tags)))]; let tag = '';
    const drawChips = () => { $('#tagchips').innerHTML = allTags.length ? ['', ...allTags].map((t) => `<button class="chip${tag === t ? ' on' : ''}" data-t="${esc(t)}">${t ? esc(t) : 'Todos'}</button>`).join('') : ''; $('#tagchips').querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { tag = b.dataset.t; drawChips(); draw(); })); };
    const draw = () => {
      const q = $('#q').value.toLowerCase(), st = $('#st').value;
      const r = all.filter((c) => (!st || c.status === st) && (!tag || TJ.tagsOf(c.tags).includes(tag)) && (!q || JSON.stringify([c.number, c.title, c.summary, c.judge, c.prosecutor, c.defense]).toLowerCase().includes(q)));
      $('#list').innerHTML = r.length ? r.map((c) => `<a class="card" href="#/processo/${c.id}">${c.cover_url ? `<img class="cover" src="${esc(c.cover_url)}" alt="" loading="lazy">` : ''}<div class="row spread"><b>${esc(c.number)}</b>${TJ.tag(L.status, c.status)}</div><h3 style="margin-top:6px">${esc(c.title)}</h3><p class="muted small">${esc((c.summary || '').slice(0, 150))}</p><p class="small muted">${esc(L.kind[c.kind] || c.kind)} · aberto em ${TJ.fmtDate(c.opened_at)}${c.stage ? ' · ' + esc(c.stage) : ''}</p></a>`).join('') : empty('Nenhum processo encontrado.');
    };
    $('#q').oninput = draw; $('#st').onchange = draw; drawChips(); draw();
  };

  pages.processo = async (v, [id]) => {
    const { data: c, error } = await sb().from('cases').select('*').eq('id', id).eq('is_public', true).maybeSingle();
    if (error) throw error;
    if (!c) { v.innerHTML = head('Processo não encontrado') + `<div class="wrap section">${empty('Este processo não existe ou não é público.')}</div>`; return; }
    const [pa, ev, pr] = await Promise.all([
      sb().from('case_parties').select('*').eq('case_id', id).eq('is_public', true),
      sb().from('case_events').select('*').eq('case_id', id).eq('is_public', true).order('happened_at', { ascending: false }),
      sb().from('evidences').select('*').eq('case_id', id).eq('is_public', true).order('created_at'),
    ]);
    const isImg = (u) => /\.(png|jpe?g|gif|webp)(\?|$)/i.test(u || '');
    v.innerHTML = head('Processo ' + c.number, c.title, 'processos', c.cover_url) + `<div class="wrap section"><div class="grid g2" style="align-items:start">
      <div>
        <div class="card"><div class="row spread"><h3 style="margin:0">Resumo</h3>${TJ.tag(L.status, c.status)}</div>
          ${c.summary ? TJ.md(c.summary) : '<p class="muted">Sem resumo.</p>'}
          <p class="small muted">${esc(L.kind[c.kind] || c.kind)} · aberto em ${TJ.fmtDate(c.opened_at)}${c.closed_at ? ' · encerrado em ' + TJ.fmtDate(c.closed_at) : ''}${c.stage ? '<br>Fase: ' + esc(c.stage) : ''}</p>
          ${c.judge || c.prosecutor || c.defense ? `<p class="small">${c.judge ? '<b>Juiz(a):</b> ' + esc(c.judge) + '<br>' : ''}${c.prosecutor ? '<b>Promotoria:</b> ' + esc(c.prosecutor) + '<br>' : ''}${c.defense ? '<b>Defesa:</b> ' + esc(c.defense) : ''}</p>` : ''}
        </div>
        ${c.result ? `<div class="card" style="margin-top:18px;border-color:var(--accent)"><h3>Decisão / resultado</h3>${TJ.md(c.result)}</div>` : ''}
        <div class="card" style="margin-top:18px"><h3>Partes</h3>${(pa.data || []).length ? `<ul>${pa.data.map((p) => `<li><b>${esc(p.name)}</b> — ${esc(L.side[p.side] || p.side)}${p.note ? ' <span class="muted">(' + esc(p.note) + ')</span>' : ''}</li>`).join('')}</ul>` : '<p class="muted">Nenhuma parte pública.</p>'}</div>
      </div>
      <div>
        <div class="card"><h3>Andamento</h3>${(ev.data || []).length ? `<div class="timeline">${ev.data.map((e) => `<div class="ev"><time>${TJ.fmtDate(e.happened_at)}</time><br><b>${esc(e.title)}</b>${e.description ? TJ.md(e.description) : ''}</div>`).join('')}</div>` : '<p class="muted">Sem movimentações públicas.</p>'}</div>
        <div class="card" style="margin-top:18px"><h3>Provas</h3>${(pr.data || []).length ? pr.data.map((p) => `<div style="margin-bottom:16px"><div class="row spread"><b>${esc(p.title)}</b><span class="tag">${esc(L.ev[p.kind] || p.kind)}</span></div>${p.description ? `<p class="small muted" style="margin:4px 0">${esc(p.description)}</p>` : ''}${p.url ? (isImg(p.url) ? `<a href="${esc(p.url)}" target="_blank" rel="noopener"><img src="${esc(p.url)}" alt="${esc(p.title)}" loading="lazy" style="border-radius:10px;border:1px solid var(--line);max-height:260px"></a>` : `<a href="${esc(p.url)}" target="_blank" rel="noopener">Abrir prova ↗</a>`) : ''}</div>`).join('') : '<p class="muted">Nenhuma prova pública.</p>'}</div>
      </div></div><p><a href="#/processos">← Voltar aos processos</a></p></div>`;
  };

  pages.comunicados = async (v) => {
    const { data, error } = await sb().from('announcements').select('*').eq('published', true).order('pinned', { ascending: false }).order('created_at', { ascending: false });
    if (error) throw error;
    const all = data || [], cats = [...new Set(all.map((a) => a.category))]; let cat = '';
    v.innerHTML = head('Comunicados', 'Avisos, editais e decisões oficiais.', 'comunicados') + `<div class="wrap section" style="max-width:820px"><div class="chips" id="cc"></div><div id="al"></div></div>`;
    const draw = () => {
      $('#cc').innerHTML = cats.length > 1 ? ['', ...cats].map((c) => `<button class="chip${cat === c ? ' on' : ''}" data-c="${esc(c)}">${c ? esc(L.cat[c] || c) : 'Todos'}</button>`).join('') : '';
      $('#cc').querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => { cat = b.dataset.c; draw(); }));
      const r = all.filter((a) => !cat || a.category === cat);
      $('#al').innerHTML = r.length ? r.map(annCard).join('') : empty('Nenhum comunicado publicado.');
    };
    draw();
  };

  pages.agenda = async (v) => {
    const { data, error } = await sb().from('hearings').select('*').eq('is_public', true).order('starts_at');
    if (error) throw error;
    const now = Date.now(); const all = data || [];
    const up = all.filter((h) => new Date(h.starts_at) >= now), past = all.filter((h) => new Date(h.starts_at) < now).reverse().slice(0, 10);
    v.innerHTML = head('Agenda', 'Audiências, julgamentos e sessões.', 'agenda') + `<div class="wrap section"><div class="grid g2" style="align-items:start">
      <div><h2>Próximas</h2>${up.length ? up.map(hearCard).join('') : empty('Nada agendado.')}</div>
      <div><h2>Anteriores</h2>${past.length ? past.map(hearCard).join('') : empty('Sem histórico.')}</div></div></div>`;
  };

  pages.selecao = async (v) => {
    const [r, res, iv] = await Promise.all([
      sb().from('selection_rounds').select('*, role:roles(label)').eq('is_public', true).eq('audience', 'publico').order('created_at', { ascending: false }),
      sb().from('applications_public').select('*'),
      sb().from('interviews_public').select('*').order('interview_at'),
    ]);
    if (r.error) throw r.error;
    const rounds = r.data || []; const approved = res.data || []; const ivs = iv.data || [];
    v.innerHTML = head('Processo seletivo', 'Vagas abertas e resultados.', 'selecao') + `<div class="wrap section" style="max-width:860px">${rounds.length ? rounds.map((x) => {
      const expired = x.closes_at && new Date(x.closes_at) <= new Date();
      const open = x.status === 'aberto' && !expired;
      const ap = approved.filter((a) => a.round_id === x.id);
      const sch = ivs.filter((a) => a.round_id === x.id);
      const ff = Array.isArray(x.form_fields) ? x.form_fields : [];
      return `<div class="card" style="margin-bottom:20px">${x.banner_url ? `<img class="cover" src="${esc(x.banner_url)}" alt="" loading="lazy">` : ''}<div class="row spread"><h3 style="margin:0">${esc(x.title)}</h3>${expired && x.status === 'aberto' ? '<span class="tag gray">Inscrições encerradas</span>' : TJ.tag(L.round, x.status)}</div>
        <p class="small muted">${x.role ? 'Cargo: ' + esc(x.role.label) : ''}${x.closes_at ? ' · inscrições até ' + TJ.fmtDT(x.closes_at) : ''}</p>
        ${x.description ? TJ.md(x.description) : ''}${x.requirements ? '<h4>Requisitos</h4>' + TJ.md(x.requirements) : ''}
        ${sch.length ? `<h4>Agenda de entrevistas</h4>${sch.map((a) => `<div class="slot"><time>${esc(new Date(a.interview_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))}</time><div><b>${esc(a.roblox_name)}</b><div class="small muted">${esc(new Date(a.interview_at).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }))}${a.interview_place ? ' · ' + esc(a.interview_place) : ''}</div></div></div>`).join('')}` : ''}
        ${ap.length ? `<h4>Aprovados</h4><p>${ap.map((a) => `<span class="tag ok">${esc(a.roblox_name)}</span>`).join(' ')}</p>` : ''}
        ${open ? `<details style="margin-top:14px"><summary class="btn gold">Quero me inscrever</summary><form class="apply" data-round="${x.id}" style="margin-top:12px">
          <label>Nome no Roblox *</label><input name="roblox_name" required maxlength="40">
          <label>Usuário no Discord</label><input name="discord_user" maxlength="60">
          ${ff.length ? TJ.formFieldsHTML(ff) : `<label>Experiência jurídica / no roleplay</label><textarea name="experience" maxlength="1500"></textarea>
          <label>Por que quer fazer parte?</label><textarea name="motivation" maxlength="1500"></textarea>`}
          <p><button class="btn blue">Enviar inscrição</button></p></form></details>` : ''}
      </div>`;
    }).join('') : empty('Nenhum processo seletivo no momento.')}</div>`;
    v.querySelectorAll('form.apply').forEach((f) => (f.onsubmit = async (e) => {
      e.preventDefault();
      const round = rounds.find((x) => x.id === f.dataset.round), ff = Array.isArray(round?.form_fields) ? round.form_fields : [];
      const fd = Object.fromEntries(new FormData(f).entries());
      const payload = { round_id: f.dataset.round, roblox_name: (fd.roblox_name || '').trim(), discord_user: (fd.discord_user || '').trim() || null };
      if (ff.length) payload.answers = TJ.readFormAnswers(f, ff);
      else { payload.experience = (fd.experience || '').trim() || null; payload.motivation = (fd.motivation || '').trim() || null; }
      const { error } = await sb().from('applications').insert(payload);
      if (error) return TJ.toast('Não foi possível enviar: ' + error.message, true);
      f.innerHTML = '<p><b>Inscrição enviada!</b> Aguarde o contato da equipe.</p>';
    }));
  };

  pages.equipe = async (v) => {
    const { data, error } = await sb().from('profiles').select('*, role:roles(label,rank)').eq('active', true).eq('show_public', true);
    if (error) throw error;
    const g = {};
    (data || []).forEach((p) => { const k = p.role?.label || p.role_key; (g[k] = g[k] || { rank: p.role?.rank || 0, m: [] }).m.push(p); });
    const groups = Object.entries(g).sort((a, b) => b[1].rank - a[1].rank);
    v.innerHTML = head('Equipe', 'Quem compõe o Tribunal.', 'equipe') + `<div class="wrap section">${groups.length ? groups.map(([k, x]) => `<h2>${esc(k)}</h2><div class="grid g3" style="margin-bottom:24px">${x.m.map((p) => `<div class="card"><div class="row">${p.avatar_url ? `<img class="avatar" src="${esc(p.avatar_url)}" alt="">` : `<span class="avatar">${esc((p.display_name || p.roblox_name || '?')[0].toUpperCase())}</span>`}<div><b>${esc(p.display_name || p.roblox_name)}</b><div class="muted small">@${esc(p.roblox_name)}</div></div></div>${p.bio ? `<p class="small" style="margin-bottom:0">${esc(p.bio)}</p>` : ''}</div>`).join('')}</div>`).join('') : empty('Equipe ainda não divulgada.')}</div>`;
  };

  pages.p = async (v, [slug]) => {
    const { data, error } = await sb().from('pages').select('*').eq('slug', slug).eq('is_public', true).maybeSingle();
    if (error) throw error;
    v.innerHTML = data ? head(data.title, '', 'p', data.banner_url) + `<div class="wrap section" style="max-width:840px"><div class="card">${TJ.md(data.body)}</div></div>` : head('Página não encontrada') + `<div class="wrap section">${empty('Esta página não existe.')}</div>`;
  };

  pages.entrar = async (v) => {
    if (state.P) { location.hash = '#/painel'; return; }
    const blocked = state.blocked ? `<div class="card" style="border-color:var(--bad);margin-bottom:14px"><b>Conta ${state.blocked.status === 'demitido' ? 'desligada' : 'suspensa'}.</b>${state.blocked.status_reason ? `<br><span class="small">${esc(state.blocked.status_reason)}</span>` : ''}<br><span class="small muted">Fale com a coordenação.</span></div>` : '';
    v.innerHTML = `<div class="wrap"><form class="card login" id="lf"><h2>Entrar</h2>${blocked}
      <p class="muted small">Acesso restrito a membros do Tribunal. Use seu nome do Roblox e sua senha.</p>
      <label>Nome no Roblox</label><input id="n" autocomplete="username" required>
      <label>Senha</label><input id="p" type="password" autocomplete="current-password" required>
      <p><button class="btn blue" style="width:100%">Entrar</button></p>
      <p class="small">Recebeu um convite? <a href="#/ativar">Ativar acesso</a></p></form></div>`;
    $('#lf').onsubmit = async (e) => {
      e.preventDefault();
      try {
        const { error } = await sb().auth.signInWithPassword({ email: emailOf($('#n').value), password: $('#p').value });
        if (error) throw new Error('Nome do Roblox ou senha incorretos.');
        await loadSession();
        if (state.blocked) { await sb().auth.signOut(); const b = state.blocked; state.U = state.P = null; throw new Error(b.status === 'demitido' ? 'Esta conta foi desligada do Tribunal.' : 'Esta conta está suspensa.'); }
        if (!state.P) { await sb().auth.signOut(); state.U = null; throw new Error('Conta ainda não ativada. Use "Ativar acesso" com seu convite.'); }
        location.hash = '#/painel';
      } catch (err) { TJ.toast(err.message, true); }
    };
  };

  pages.ativar = async (v) => {
    v.innerHTML = `<div class="wrap"><form class="card login" id="af"><h2>Ativar acesso</h2>
      <p class="muted small">Use o código de convite que a coordenação enviou para você.</p>
      <label>Nome no Roblox (exatamente como no convite)</label><input id="n" required>
      <label>Código do convite</label><input id="c" required style="text-transform:uppercase">
      <label>Crie uma senha (mínimo 8 caracteres)</label><input id="p" type="password" minlength="8" autocomplete="new-password" required>
      <label>Repita a senha</label><input id="p2" type="password" minlength="8" autocomplete="new-password" required>
      <p><button class="btn blue" style="width:100%">Ativar</button></p>
      <p class="small"><a href="#/entrar">Já tenho conta</a></p></form></div>`;
    $('#af').onsubmit = async (e) => {
      e.preventDefault();
      const name = $('#n').value.trim(), code = $('#c').value.trim().replace(/[.\s]+$/, ''), pass = $('#p').value;
      try {
        if (pass !== $('#p2').value) throw new Error('As senhas não conferem.');
        const email = emailOf(name);
        let { error } = await sb().auth.signUp({ email, password: pass });
        if (error && /registered|already/i.test(error.message)) {
          ({ error } = await sb().auth.signInWithPassword({ email, password: pass }));
          if (error) throw new Error('Este nome já tem conta e a senha não confere.');
        } else if (error) throw error;
        const { data: { session } } = await sb().auth.getSession();
        if (!session) throw new Error('O Supabase está pedindo confirmação de e-mail. Desligue "Confirm email" em Authentication > Sign In / Providers > Email.');
        const r = await sb().rpc('redeem_invite', { p_code: code, p_roblox: name });
        if (r.error) { await sb().auth.signOut(); throw new Error(r.error.message); }
        await loadSession();
        TJ.toast('Acesso ativado! Bem-vindo(a).');
        location.hash = '#/painel';
      } catch (err) { TJ.toast(err.message, true); }
    };
  };

  pages.sair = async () => {
    await sb().auth.signOut(); state.U = state.P = state.blocked = null; location.hash = '#/';
  };

  // ---------- roteador ----------
  async function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    const r = parts[0] || '';
    navRender(r);
    const view = $('#view');
    view.innerHTML = '<p class="boot">Carregando…</p>';
    window.scrollTo(0, 0);
    try {
      const mt = state.site.maintenance || {};
      if (mt.on && !state.P && !['entrar', 'ativar', 'sair'].includes(r)) {
        view.innerHTML = `<div class="wrap"><div class="card maint"><div class="big">🛠</div><h2>Site em manutenção</h2><p class="muted">${esc(mt.message || 'Voltamos em breve.')}</p><p class="small"><a href="#/entrar">Acesso de membros</a></p></div></div>`;
        return;
      }
      if (r === 'painel') {
        if (!state.P) { location.hash = '#/entrar'; return; }
        await TJ.mountPanel(view, parts.slice(1));
      } else if (pages[r]) {
        await pages[r](view, parts.slice(1));
      } else {
        view.innerHTML = head('Página não encontrada') + `<div class="wrap section">${empty('O endereço não existe. Volte ao início.')}</div>`;
      }
    } catch (e) {
      console.error(e);
      view.innerHTML = `<div class="wrap section"><div class="card"><h3>Algo deu errado</h3><p class="muted">${esc(e.message || e)}</p><p class="small">Se acabou de atualizar o site, confira se o arquivo <code>schema_v2.sql</code> foi executado por completo no Supabase.</p></div></div>`;
    }
  }
  TJ.route = route;

  TJ.start = async function () {
    const saved = TJ.store.get('tj-theme', null);
    document.documentElement.dataset.theme = saved || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (!TJ.configured) {
      $('#app').innerHTML = `<div class="wrap section"><div class="card" style="max-width:640px;margin:40px auto"><h2>Falta configurar o Supabase</h2><p>Abra o arquivo <code>config.js</code> e confira: <b>SUPABASE_URL</b> deve ser o endereço do projeto, no formato <code>https://xxxxxxxx.supabase.co</code>, e <b>SUPABASE_ANON_KEY</b> deve ser a chave (anon ou publishable).</p></div></div>`;
      return;
    }
    try { await loadSettings(); await loadSession(); } catch (e) { console.error(e); }
    shell();
    document.addEventListener('click', (e) => { const s = e.target.closest('.spoiler'); if (s) s.classList.toggle('show'); });
    window.addEventListener('hashchange', route);
    sb().auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') { state.U = state.P = null; } });
    route();
  };
})();
