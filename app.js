/* Tribunal de Justiça de Ilha Bela - núcleo do site e páginas públicas (v5) */
(function () {
  'use strict';
  const C = window.TJ_CONFIG || {};
  const TJ = (window.TJ = {});
  const state = (TJ.state = { U: null, P: null, blocked: null, site: {}, pages: [] });
  const $ = (s, r = document) => r.querySelector(s);
  TJ.$ = $;

  // ---------- utilidades ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  TJ.esc = esc;
  const okDate = (d) => { const x = new Date(String(d).length === 10 ? d + 'T12:00:00' : d); return isNaN(x) ? null : x; };
  TJ.fmtDate = (d) => { const x = d ? okDate(d) : null; return x ? x.toLocaleDateString('pt-BR') : ''; };
  TJ.fmtDT = (d) => { const x = d ? okDate(d) : null; return x ? x.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''; };

  // só aceita endereços http(s): bloqueia javascript:, data: e afins em qualquer link ou imagem vindos do banco
  TJ.url = (u) => {
    const t = String(u == null ? '' : u).trim();
    if (!t) return '';   // vazio não pode virar o endereço da própria página
    try { const x = new URL(t, location.href); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch (e) { return ''; }
  };
  TJ.cssUrl = (u) => esc(TJ.url(u).replace(/['"()\s\\]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')));

  // mensagens de erro amigáveis: o detalhe técnico fica só no console
  TJ.friendly = function (m) {
    const s = String((m && m.message) || m || '');
    const R = [
      [/row-level security|permission denied|insufficient_privilege|42501|not allowed/i, 'Você não tem permissão para fazer isso.'],
      [/jwt|token.*expired|not authenticated|session.*(missing|expired)|invalid.*refresh/i, 'Sua sessão expirou. Entre novamente.'],
      [/rate limit|too many requests|over_.*limit|only request this after|for security purposes/i, 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.'],
      [/weak password|password should|password is known|password.*(short|weak)/i, 'A senha é curta ou fraca demais. Use 8 ou mais caracteres, com letras e números.'],
      [/duplicate key|already exists|23505/i, 'Já existe um registro igual a este.'],
      [/violates (check|foreign key|not-null)|null value|23514|23503|23502|invalid input syntax|value too long|too large|payload too large|exceeds/i, 'Algum dado está faltando, inválido ou grande demais. Confira o formulário.'],
      [/mime|file type|not supported|maximum allowed size|invalid.*bucket|bucket not found/i, 'Arquivo não aceito. Use imagem PNG, JPG, WEBP ou GIF (ou PDF onde for permitido), dentro do limite de tamanho.'],
      [/schema cache|does not exist|could not find the|PGRST/i, 'Este recurso ainda não foi instalado no banco. Rode o arquivo SQL mais recente no Supabase.'],
      [/failed to fetch|networkerror|network request|load failed|timeout|aborted/i, 'Sem conexão com o servidor. Verifique a internet e tente de novo.'],
      [/\b(violates|relation|column|constraint|syntax|function|schema|policy|operator|undefined|TypeError|ReferenceError|Unexpected|SQLSTATE)\b/i, 'Não foi possível concluir. Tente novamente.'],
    ];
    for (const [re, t] of R) if (re.test(s)) { console.warn('[tj]', s); return t; }
    return s || 'Não foi possível concluir. Tente novamente.';
  };
  TJ.toast = (msg, err) => {
    const t = $('#toast'); if (!t) return;
    t.textContent = err ? TJ.friendly(msg) : String(msg ?? '');
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
  TJ.tagsOf = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);
  TJ.store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };

  // senha: regras mínimas (o limite de verdade também é configurado no Supabase)
  const COMMON = ['12345678', '123456789', '1234567890', 'password', 'senha123', 'qwerty123', 'abc12345', '11111111', '00000000', 'iloveyou', 'roblox123', 'tribunal123', 'ilhabela'];
  TJ.pwProblem = (pw, name) => {
    pw = String(pw || ''); const low = pw.toLowerCase(), nm = String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (pw.length < 8) return 'A senha precisa ter 8 ou mais caracteres.';
    if (pw.length > 72) return 'A senha pode ter no máximo 72 caracteres.';
    if (COMMON.some((c) => low.includes(c))) return 'Essa senha é muito comum. Escolha outra.';
    if (nm.length >= 3 && low.replace(/[^a-z0-9]/g, '').includes(nm)) return 'A senha não pode conter o seu nome do Roblox.';
    if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Use letras e números na senha.';
    return '';
  };

  // contraste (WCAG)
  const lum = (h) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  TJ.contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  TJ.onColor = (bg) => (TJ.contrast(bg, '#101828') >= TJ.contrast(bg, '#ffffff') ? '#101828' : '#ffffff');
  const mix = (a, b, t) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('');
  const isHex = (h) => /^#[0-9a-f]{6}$/i.test(String(h || ''));

  // Markdown simples (estilo Discord) — primeiro escapa tudo, depois formata; só links http(s)
  TJ.md = function (src) {
    const lines = esc(src || '').split('\n');
    const out = []; let list = false;
    const close = () => { if (list) { out.push('</ul>'); list = false; } };
    const inl = (t) => t
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<u>$1</u>')
      .replace(/(^|[^*])\*([^*\n]+?)\*/g, '$1<em>$2</em>')
      .replace(/\|\|(.+?)\|\|/g, '<span class="spoiler">$1</span>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
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

  // ---------- ícones (compartilhados com o painel) ----------
  const IC = (TJ.IC = {
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
    shield: 'M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z M9 12l2 2 4-4',
    scale: 'M12 3v18 M6 21h12 M5 7h14 M5 7l-3 7a3 3 0 0 0 6 0z M19 7l-3 7a3 3 0 0 0 6 0z',
    book: 'M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z M4 17a3 3 0 0 1 3-3h11',
    lock: 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4',
    download: 'M12 3v12 M7 10l5 5 5-5 M4 21h16',
    arrow: 'M5 12h14 M13 6l6 6-6 6',
    grid: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
    info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M12 16v-4 M12 8h.01',
    x: 'M6 6l12 12 M18 6L6 18',
    moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  });
  TJ.icon = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${IC[n] || IC.file}"/></svg>`;

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
  // Proteção da chave: o site só aceita a chave pública (anon / publishable). Se alguém colar a chave secreta, ele se recusa a iniciar.
  const keyProblem = () => {
    const k = String(C.SUPABASE_ANON_KEY || '').trim();
    if (/^sb_secret_/i.test(k)) return 'secret';
    const p = k.split('.');
    if (p.length === 3) { try { const j = JSON.parse(atob(p[1].replace(/-/g, '+').replace(/_/g, '/'))); if (j.role === 'service_role') return 'service_role'; } catch (e) {} }
    return '';
  };
  TJ.keyBad = keyProblem();
  TJ.urlOk = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(String(C.SUPABASE_URL || '').trim());
  TJ.configured = TJ.urlOk && !TJ.keyBad && !!String(C.SUPABASE_ANON_KEY || '').trim();
  if (TJ.configured) {
    if (!window.supabase) { TJ.noLib = true; TJ.configured = false; }
    else {
      try { TJ.sb = window.supabase.createClient(String(C.SUPABASE_URL).trim(), String(C.SUPABASE_ANON_KEY).trim(), { auth: { detectSessionInUrl: false } }); }
      catch (e) { console.error(e); TJ.configured = false; }
    }
  }
  // cliente SEM sessão (usado pelo teste "como visitante" no painel Segurança)
  TJ.anonClient = () => window.supabase.createClient(String(C.SUPABASE_URL).trim(), String(C.SUPABASE_ANON_KEY).trim(), { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  TJ.config = () => ({ url: String(C.SUPABASE_URL || '').trim(), key: String(C.SUPABASE_ANON_KEY || '').trim() });
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

  // ---------- menu do site ----------
  const NAV_DEFAULT = [['', 'Início'], ['processos', 'Processos'], ['comunicados', 'Comunicados'], ['agenda', 'Agenda'], ['selecao', 'Seleção'], ['biblioteca', 'Biblioteca'], ['equipe', 'Equipe']];
  TJ.navDefault = NAV_DEFAULT;
  TJ.navItems = () => {
    const cfg = Array.isArray(state.site.nav) ? state.site.nav : [];
    const out = NAV_DEFAULT.map(([k, t]) => { const c = cfg.find((x) => x.k === k) || {}; return { k, label: c.label || t, show: c.show !== false, icon: c.icon || '' }; });
    cfg.forEach((c, i) => { const idx = out.findIndex((o) => o.k === c.k); if (idx >= 0) out[idx]._i = i; });
    out.sort((a, b) => (a._i ?? 99) - (b._i ?? 99));
    return out;
  };
  TJ.navOn = (k) => { const it = TJ.navItems().find((i) => i.k === k); return !it || it.show; };

  // ---------- aparência ----------
  const SITE_DEFAULTS = { name: 'Tribunal de Justiça de Ilha Bela', short: 'TJ', primary: '#12284a', accent: '#c9a24b', show_stats: true, style: 'institucional', header: 'light', font: 'sans', radius: 12, density: 'normal', home: {}, banners: {}, idle_minutes: 30, legal: {} };
  TJ.presets = [
    ['Azul-marinho e dourado', '#12284a', '#c9a24b'],
    ['Grená e dourado', '#5a1a2b', '#c9a24b'],
    ['Verde-floresta e dourado', '#12392b', '#c9a24b'],
    ['Grafite e azul-claro', '#1f2937', '#7db0ff'],
    ['Roxo real e dourado', '#2e1a5c', '#d8b04a'],
  ];
  function normalizeSite(v) {
    const s = Object.assign({}, SITE_DEFAULTS, v || {});
    if (!s.ui_v5) { s.style = 'institucional'; s.font = 'sans'; s.radius = 12; s.header = 'light'; }   // migração única para o visual novo
    if (!isHex(s.primary)) s.primary = SITE_DEFAULTS.primary;
    if (!isHex(s.accent)) s.accent = SITE_DEFAULTS.accent;
    if (TJ.contrast(s.primary, '#ffffff') < 4.5) s.primary = SITE_DEFAULTS.primary;   // texto branco precisa ser legível
    if (!['institucional', 'moderno'].includes(s.style)) s.style = 'institucional';
    return s;
  }
  function applyAppearance() {
    const s = state.site, r = document.documentElement;
    r.style.setProperty('--primary', s.primary);
    r.style.setProperty('--primary-2', mix(s.primary, '#ffffff', 0.14));
    r.style.setProperty('--accent', s.accent);
    r.style.setProperty('--on-accent', TJ.onColor(s.accent));
    r.style.setProperty('--r', Math.min(28, Math.max(0, Number(s.radius) || 0)) + 'px');
    r.dataset.style = s.style;
    r.dataset.header = s.header === 'dark' ? 'dark' : 'light';
    r.dataset.density = s.density || 'normal';
    r.dataset.font = s.font === 'serif' ? 'serif' : 'sans';
    const tc = document.querySelector('meta[name=theme-color]'); if (tc) tc.content = s.primary;
    const st = document.getElementById('custom-css'); if (st) st.textContent = s.custom_css || '';
    const ic = TJ.url(s.favicon_url || s.logo_url);
    if (ic) { let l = document.querySelector('link[rel=icon]'); if (!l) { l = document.createElement('link'); l.rel = 'icon'; document.head.appendChild(l); } l.href = ic; }
  }
  TJ.applyAppearance = applyAppearance;

  async function loadSettings() {
    const [s, p] = await Promise.all([
      sb().from('settings').select('*').eq('key', 'site').maybeSingle(),
      sb().from('pages').select('slug,title,sort,in_menu,icon').eq('is_public', true).eq('in_menu', true).order('sort'),
    ]);
    state.site = normalizeSite(s.data?.value);
    state.pages = p.data || [];
    applyAppearance();
  }
  TJ.loadSettings = loadSettings;
  TJ.SITE_DEFAULTS = SITE_DEFAULTS;

  // dados de quem cuida do site (LGPD: identificação do controlador)
  TJ.legalInfo = () => {
    const s = state.site, g = s.legal || {};
    return {
      controller: g.controller || `Coordenação do ${s.name}`,
      contact: g.contact || (s.discord_url ? 'pelo servidor do Discord do Tribunal' : 'pela coordenação, no servidor do Discord'),
      retention: Number(g.retention_days) >= 30 ? Number(g.retention_days) : 180,
      credits: g.credits || '',
      updated: g.updated || '',
    };
  };
  const FICTION = 'Este é um site de roleplay (jogo no Roblox). Os processos, decisões, cargos e penas são fictícios, não têm validade jurídica e não representam nenhum órgão público real.';
  TJ.FICTION = FICTION;

  // ---------- casca ----------
  const setNavTop = () => { const h = $('.top'); if (h) document.documentElement.style.setProperty('--navtop', Math.max(56, Math.round(h.getBoundingClientRect().bottom)) + 'px'); };
  function setMenu(open) {
    const nav = $('#nav'), b = $('#burger'); if (!nav || !b) return;
    if (open) setNavTop();
    nav.classList.toggle('open', open);
    b.setAttribute('aria-expanded', String(open));
    b.innerHTML = TJ.icon(open ? 'x' : 'menu');
    b.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    document.body.style.overflow = open ? 'hidden' : '';
  }
  function toggleTheme() {
    const d = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = d; TJ.store.set('tj-theme', d);
  }
  TJ.toggleTheme = toggleTheme;
  function logoHTML(cls) {
    const u = TJ.url(state.site.logo_url);
    return u ? `<img src="${esc(u)}" alt="" width="44" height="44">` : `<span class="logo" aria-hidden="true">⚖</span>`;
  }
  function shell() {
    const s = state.site, tb = s.top_banner || {};
    const tbLink = TJ.url(tb.link);
    const bg = isHex(tb.color) ? `background:${tb.color};color:${TJ.onColor(tb.color)};` : '';
    const banner = tb.on && tb.text ? `<div class="topbanner" role="status" style="${bg}">${tbLink ? `<a href="${esc(tbLink)}" target="_blank" rel="noopener noreferrer">${esc(tb.text)}</a>` : esc(tb.text)}</div>` : '';
    const dc = TJ.url(s.discord_url);
    const util = s.utilbar === false ? '' : `<div class="utilbar"><div class="wrap"><span>${esc(s.util_text || 'Roleplay · ambiente fictício, sem vínculo com órgão público real')}</span><span class="ul hide-m"><a href="#/privacidade">Privacidade</a><a href="#/termos">Termos de uso</a>${dc ? `<a href="${esc(dc)}" target="_blank" rel="noopener noreferrer">Discord</a>` : ''}</span></div></div>`;
    $('#app').innerHTML = `<a class="skip" href="#" id="skip">Ir para o conteúdo</a>${banner}${util}
      <header class="top"><div class="wrap">
        <a class="brand" href="#/" aria-label="${esc(s.name)} — início">${logoHTML()}<span><b>${esc(s.short || s.name)}</b><small>${esc(s.subtitle || '')}</small></span></a>
        <nav class="nav" id="nav" aria-label="Menu principal"></nav>
        <div class="topact" id="topact"></div>
        <button class="iconbtn burger" id="burger" aria-expanded="false" aria-controls="nav" aria-label="Abrir menu">${TJ.icon('menu')}</button>
      </div></header>
      <main id="view" tabindex="-1" aria-live="polite"></main>
      <footer class="footer" id="footer"></footer>`;
    $('#skip').onclick = (e) => { e.preventDefault(); $('#view').focus(); };
    $('#burger').onclick = () => setMenu(!$('#nav').classList.contains('open'));
    window.addEventListener('resize', () => { setNavTop(); if (window.innerWidth > 940) setMenu(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#nav')?.classList.contains('open')) { setMenu(false); $('#burger').focus(); } });
    footerRender();
  }
  function footerRender() {
    const s = state.site, lg = TJ.legalInfo(), dc = TJ.url(s.discord_url);
    const links = TJ.navItems().filter((i) => i.show && i.k !== '').map((i) => `<li><a href="#/${i.k}">${esc(i.label)}</a></li>`).join('');
    $('#footer').innerHTML = `<div class="wrap"><div class="fgrid">
      <div><div class="fbrand">${logoHTML()}<b>${esc(s.name)}</b></div><p>${esc(s.footer || '')}</p>${dc ? `<a class="fbtn" href="${esc(dc)}" target="_blank" rel="noopener noreferrer">Entrar no Discord</a>` : ''}</div>
      <div><h4>Navegação</h4><ul><li><a href="#/">Início</a></li>${links}</ul></div>
      <div><h4>Transparência</h4><ul><li><a href="#/privacidade">Política de Privacidade</a></li><li><a href="#/termos">Termos de uso</a></li><li><a href="#/privacidade">Seus direitos (LGPD)</a></li><li><a href="#/entrar">Acesso de membros</a></li></ul></div>
      <div><h4>Contato</h4><p>${esc(lg.controller)}<br>Fale conosco ${esc(lg.contact)}.</p></div>
    </div>
    <div class="fbottom"><p>${esc(FICTION)}</p><p>© ${new Date().getFullYear()} ${esc(s.name)}. Projeto de roleplay, sem fins lucrativos.</p></div></div>`;
  }
  function navRender(r, parts) {
    const slug = r === 'p' ? parts[1] : null;
    let h = TJ.navItems().filter((i) => i.show).map((i) => `<a href="#/${i.k}"${r === i.k ? ' class="on" aria-current="page"' : ''}>${i.icon ? esc(i.icon) + '&nbsp;' : ''}${esc(i.label)}</a>`).join('');
    h += state.pages.map((p) => `<a href="#/p/${esc(p.slug)}"${slug === p.slug ? ' class="on" aria-current="page"' : ''}>${p.icon ? esc(p.icon) + '&nbsp;' : ''}${esc(p.title)}</a>`).join('');
    h += `<button class="navtheme" id="theme2" type="button">Alternar tema claro/escuro</button>`;
    if (state.P) h += `<a class="navout" href="#/sair">Sair</a>`;
    $('#nav').innerHTML = h;
    $('#topact').innerHTML = state.P
      ? `<a class="cta" href="#/painel">Painel</a><a class="iconbtn only-d" href="#/sair" aria-label="Sair" title="Sair">${TJ.icon('out')}</a><button class="iconbtn only-d" id="theme" type="button" aria-label="Alternar tema claro/escuro" title="Tema claro/escuro">${TJ.icon('moon')}</button>`
      : `<a class="cta" href="#/entrar">Entrar</a><button class="iconbtn only-d" id="theme" type="button" aria-label="Alternar tema claro/escuro" title="Tema claro/escuro">${TJ.icon('moon')}</button>`;
    $('#theme').onclick = toggleTheme; $('#theme2').onclick = toggleTheme;
    setMenu(false);
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
      const a = f.type === 'checkbox' ? (el.checked ? 'Sim' : 'Não') : el.value.trim().slice(0, 2000);
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
    const u = TJ.cssUrl(b);
    const st = u ? ` style="background-image:linear-gradient(rgba(8,16,38,.72),rgba(8,16,38,.45)),url('${u}')"` : '';
    return `<div class="pagehead${u ? ' has-img' : ''}"${st}><div class="wrap"><h1>${esc(t)}</h1>${sub ? `<p class="muted" style="margin:6px 0 0">${esc(sub)}</p>` : ''}</div></div>`;
  };
  const empty = (t) => `<div class="empty">${esc(t)}</div>`;
  const cover = (u, alt) => { const x = TJ.url(u); return x ? `<img class="cover" src="${esc(x)}" alt="${esc(alt || '')}" loading="lazy" decoding="async">` : ''; };
  TJ.head = head; TJ.empty = empty; TJ.cover = cover;
  const pages = {};
  TJ.pages = pages;

  const dateBlock = (d) => { const x = okDate(d); if (!x) return ''; return `<div class="dateblock" aria-hidden="true"><b>${String(x.getDate()).padStart(2, '0')}</b><span>${esc(x.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''))}</span></div>`; };
  const annCard = (a) => `<article class="card" style="margin-bottom:14px">${cover(a.image_url, 'Imagem do comunicado: ' + a.title)}<div class="row spread"><span class="tag">${esc(L.cat[a.category] || a.category)}</span><span class="small muted">${TJ.fmtDate(a.created_at)}${a.pinned ? ' · fixado' : ''}</span></div><h3 style="margin-top:8px">${esc(a.title)}</h3>${TJ.md(a.body)}</article>`;
  const hearCard = (h) => `<div class="listcard">${dateBlock(h.starts_at)}<div class="grow"><span class="tag">${esc(L.hear[h.kind] || h.kind)}</span><h3>${esc(h.title)}</h3><p class="muted small" style="margin:0">${esc(TJ.fmtDT(h.starts_at))}${h.place ? ' · ' + esc(h.place) : ''}</p>${h.notes ? `<p class="small" style="margin:6px 0 0">${esc(h.notes)}</p>` : ''}</div></div>`;
  const QT = { processos: ['briefcase', 'Processos', 'Andamento e provas'], comunicados: ['bell', 'Comunicados', 'Avisos e decisões'], agenda: ['calendar', 'Agenda', 'Audiências e sessões'], selecao: ['check', 'Seleção', 'Vagas e resultados'], biblioteca: ['book', 'Biblioteca', 'Normas e manuais'] };

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
    const on = TJ.navOn;
    const stat = (n, t) => `<div><b>${n}</b><span>${t}</span></div>`;
    const ov = Math.min(90, Math.max(0, Number(s.hero_overlay ?? 65))) / 100;
    const hu = TJ.cssUrl(s.hero_image);
    const heroBg = hu ? ` style="background-image:linear-gradient(135deg,rgba(10,20,40,${ov + 0.15}),rgba(10,20,40,${Math.max(0, ov - 0.1)})),url('${hu}')"` : '';
    const seal = TJ.url(s.logo_url) ? `<img src="${esc(TJ.url(s.logo_url))}" alt="">` : '⚖';
    const open = (rd.data || []).filter((r) => !r.closes_at || new Date(r.closes_at) > new Date());
    const tiles = H.quick === false ? '' : TJ.navItems().filter((i) => i.show && QT[i.k]).map((i) => `<a class="qt" href="#/${i.k}"><span class="ic">${TJ.icon(QT[i.k][0])}</span><div><b>${esc(i.label)}</b><span>${esc(QT[i.k][2])}</span></div></a>`).join('');
    const blocks = [];
    if (tiles) blocks.push(`<div class="wrap qa"><div class="grid">${tiles}</div></div>`);
    if (on('selecao') && H.selection !== false && open.length) blocks.push(`<div class="wrap section" style="padding-bottom:0"><a class="card banner" href="#/selecao"><b>Processo seletivo aberto:</b> ${open.map((r) => esc(r.title)).join(' · ')} — <u>inscreva-se</u></a></div>`);
    if (s.show_stats !== false && H.stats !== false && on('processos')) blocks.push(`<div class="wrap section" style="padding-bottom:0"><div class="statbar">
        ${stat(cases.length, 'processos públicos')}
        ${stat(cases.filter((c) => c.status === 'em_andamento' || c.status === 'em_julgamento').length, 'em andamento')}
        ${stat(cases.filter((c) => c.status === 'sentenciado').length, 'sentenciados')}</div></div>`);
    const cols = [];
    if (on('comunicados') && H.announcements !== false) cols.push(`<section><div class="sechead"><h2>Últimos comunicados</h2><a href="#/comunicados">Ver todos</a></div>${(an.data || []).length ? an.data.map(annCard).join('') : empty('Nenhum comunicado ainda.')}</section>`);
    if (on('agenda') && H.hearings !== false) cols.push(`<section><div class="sechead"><h2>Próximas audiências</h2><a href="#/agenda">Ver agenda</a></div>${(hr.data || []).length ? hr.data.map(hearCard).join('') : empty('Nenhuma audiência marcada.')}</section>`);
    if (cols.length) blocks.push(`<div class="wrap section"><div class="grid g2" style="align-items:start">${cols.join('')}</div></div>`);
    const size = s.hero_size === 'tall' ? ' tall' : s.hero_size === 'short' ? ' short' : '';
    v.innerHTML = `<section class="hero${size}${s.hero_align === 'center' ? ' center' : ''}"${heroBg}><div class="wrap"><div>
        <span class="kicker">${esc(s.hero_kicker || 'Poder Judiciário · Roleplay')}</span>
        <h1>${esc(s.hero_title || s.name)}</h1><p>${esc(s.hero_text || '')}</p>
        <div class="btns">${on('processos') ? '<a class="btn gold" href="#/processos">Consultar processos</a>' : ''}${on('comunicados') ? '<a class="btn" href="#/comunicados">Ver comunicados</a>' : ''}</div>
      </div><div class="hero-seal" aria-hidden="true">${seal}</div></div></section>${blocks.join('')}`;
  };

  pages.processos = async (v) => {
    const { data, error } = await sb().from('cases').select('*').eq('is_public', true).order('opened_at', { ascending: false });
    if (error) throw error;
    const all = data || [];
    v.innerHTML = head('Processos', 'Consulte o andamento e as provas dos processos públicos.', 'processos') + `<div class="wrap section">
      <div class="toolbar"><input id="q" class="q" type="search" placeholder="Buscar por número, título ou nome…" aria-label="Buscar processos">
      <select id="st" aria-label="Filtrar por situação"><option value="">Todas as situações</option>${Object.entries(L.status).map(([k, x]) => `<option value="${k}">${x[0]}</option>`).join('')}</select></div>
      <div class="chips" id="tagchips"></div><div class="grid g2" id="list"></div></div>`;
    const allTags = [...new Set(all.flatMap((c) => TJ.tagsOf(c.tags)))]; let tag = '';
    const drawChips = () => { $('#tagchips').innerHTML = allTags.length ? ['', ...allTags].map((t) => `<button class="chip${tag === t ? ' on' : ''}" data-t="${esc(t)}" aria-pressed="${tag === t}">${t ? esc(t) : 'Todos'}</button>`).join('') : ''; $('#tagchips').querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { tag = b.dataset.t; drawChips(); draw(); })); };
    const draw = () => {
      const q = $('#q').value.toLowerCase(), st = $('#st').value;
      const r = all.filter((c) => (!st || c.status === st) && (!tag || TJ.tagsOf(c.tags).includes(tag)) && (!q || JSON.stringify([c.number, c.title, c.summary, c.judge, c.prosecutor, c.defense]).toLowerCase().includes(q)));
      $('#list').innerHTML = r.length ? r.map((c) => `<a class="card" href="#/processo/${esc(c.id)}">${cover(c.cover_url, 'Capa do processo ' + c.number)}<div class="row spread"><b>${esc(c.number)}</b>${TJ.tag(L.status, c.status)}</div><h3 style="margin-top:6px">${esc(c.title)}</h3><p class="muted small">${esc((c.summary || '').slice(0, 150))}</p><p class="small muted">${esc(L.kind[c.kind] || c.kind)} · aberto em ${TJ.fmtDate(c.opened_at)}${c.stage ? ' · ' + esc(c.stage) : ''}</p></a>`).join('') : empty('Nenhum processo encontrado.');
    };
    $('#q').oninput = draw; $('#st').onchange = draw; drawChips(); draw();
  };

  pages.processo = async (v, [id]) => {
    if (!/^[0-9a-f-]{36}$/i.test(String(id || ''))) { v.innerHTML = head('Processo não encontrado') + `<div class="wrap section">${empty('Este processo não existe ou não é público.')}</div>`; return; }
    const { data: c, error } = await sb().from('cases').select('*').eq('id', id).eq('is_public', true).maybeSingle();
    if (error) throw error;
    if (!c) { v.innerHTML = head('Processo não encontrado') + `<div class="wrap section">${empty('Este processo não existe ou não é público.')}</div>`; return; }
    const [pa, ev, pr] = await Promise.all([
      sb().from('case_parties').select('*').eq('case_id', id).eq('is_public', true),
      sb().from('case_events').select('*').eq('case_id', id).eq('is_public', true).order('happened_at', { ascending: false }),
      sb().from('evidences').select('*').eq('case_id', id).eq('is_public', true).order('created_at'),
    ]);
    const isImg = (u) => /\.(png|jpe?g|gif|webp)(\?|$)/i.test(u || '');
    const proof = (p) => { const u = TJ.url(p.url); if (!u) return ''; return isImg(u) ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer"><img src="${esc(u)}" alt="Prova: ${esc(p.title)}" loading="lazy" style="border-radius:10px;border:1px solid var(--line);max-height:260px"></a>` : `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">Abrir prova (abre em nova aba)</a>`; };
    v.innerHTML = head('Processo ' + c.number, c.title, 'processos', c.cover_url) + `<div class="wrap section"><div class="grid g2" style="align-items:start">
      <div>
        <div class="card"><div class="row spread"><h2 style="margin:0;font-size:18px">Resumo</h2>${TJ.tag(L.status, c.status)}</div>
          ${c.summary ? TJ.md(c.summary) : '<p class="muted">Sem resumo.</p>'}
          <p class="small muted">${esc(L.kind[c.kind] || c.kind)} · aberto em ${TJ.fmtDate(c.opened_at)}${c.closed_at ? ' · encerrado em ' + TJ.fmtDate(c.closed_at) : ''}${c.stage ? '<br>Fase: ' + esc(c.stage) : ''}</p>
          ${c.judge || c.prosecutor || c.defense ? `<p class="small">${c.judge ? '<b>Juiz(a):</b> ' + esc(c.judge) + '<br>' : ''}${c.prosecutor ? '<b>Promotoria:</b> ' + esc(c.prosecutor) + '<br>' : ''}${c.defense ? '<b>Defesa:</b> ' + esc(c.defense) : ''}</p>` : ''}
        </div>
        ${c.result ? `<div class="card" style="margin-top:18px;border-color:var(--accent)"><h2 style="font-size:18px">Decisão / resultado</h2>${TJ.md(c.result)}</div>` : ''}
        <div class="card" style="margin-top:18px"><h2 style="font-size:18px">Partes</h2>${(pa.data || []).length ? `<ul>${pa.data.map((p) => `<li><b>${esc(p.name)}</b> — ${esc(L.side[p.side] || p.side)}${p.note ? ' <span class="muted">(' + esc(p.note) + ')</span>' : ''}</li>`).join('')}</ul>` : '<p class="muted">Nenhuma parte pública.</p>'}</div>
      </div>
      <div>
        <div class="card"><h2 style="font-size:18px">Andamento</h2>${(ev.data || []).length ? `<div class="timeline">${ev.data.map((e) => `<div class="ev"><time>${TJ.fmtDate(e.happened_at)}</time><br><b>${esc(e.title)}</b>${e.description ? TJ.md(e.description) : ''}</div>`).join('')}</div>` : '<p class="muted">Sem movimentações públicas.</p>'}</div>
        <div class="card" style="margin-top:18px"><h2 style="font-size:18px">Provas</h2>${(pr.data || []).length ? pr.data.map((p) => `<div style="margin-bottom:16px"><div class="row spread"><b>${esc(p.title)}</b><span class="tag">${esc(L.ev[p.kind] || p.kind)}</span></div>${p.description ? `<p class="small muted" style="margin:4px 0">${esc(p.description)}</p>` : ''}${proof(p)}</div>`).join('') : '<p class="muted">Nenhuma prova pública.</p>'}</div>
      </div></div><p><a href="#/processos">← Voltar aos processos</a></p></div>`;
  };

  pages.comunicados = async (v) => {
    const { data, error } = await sb().from('announcements').select('*').eq('published', true).order('pinned', { ascending: false }).order('created_at', { ascending: false });
    if (error) throw error;
    const all = data || [], cats = [...new Set(all.map((a) => a.category))]; let cat = '';
    v.innerHTML = head('Comunicados', 'Avisos, editais e decisões oficiais.', 'comunicados') + `<div class="wrap section" style="max-width:820px"><div class="chips" id="cc"></div><div id="al"></div></div>`;
    const draw = () => {
      $('#cc').innerHTML = cats.length > 1 ? ['', ...cats].map((c) => `<button class="chip${cat === c ? ' on' : ''}" data-c="${esc(c)}" aria-pressed="${cat === c}">${c ? esc(L.cat[c] || c) : 'Todos'}</button>`).join('') : '';
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
      <section><div class="sechead"><h2>Próximas</h2></div>${up.length ? up.map(hearCard).join('') : empty('Nada agendado.')}</section>
      <section><div class="sechead"><h2>Anteriores</h2></div>${past.length ? past.map(hearCard).join('') : empty('Sem histórico.')}</section></div></div>`;
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
      return `<div class="card" style="margin-bottom:20px">${cover(x.banner_url, 'Banner da vaga ' + x.title)}<div class="row spread"><h2 style="margin:0;font-size:20px">${esc(x.title)}</h2>${expired && x.status === 'aberto' ? '<span class="tag gray">Inscrições encerradas</span>' : TJ.tag(L.round, x.status)}</div>
        <p class="small muted">${x.role ? 'Cargo: ' + esc(x.role.label) : ''}${x.closes_at ? ' · inscrições até ' + TJ.fmtDT(x.closes_at) : ''}</p>
        ${x.description ? TJ.md(x.description) : ''}${x.requirements ? '<h3>Requisitos</h3>' + TJ.md(x.requirements) : ''}
        ${sch.length ? `<h3>Agenda de entrevistas</h3>${sch.map((a) => `<div class="slot"><time>${esc(new Date(a.interview_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))}</time><div><b>${esc(a.roblox_name)}</b><div class="small muted">${esc(new Date(a.interview_at).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }))}${a.interview_place ? ' · ' + esc(a.interview_place) : ''}</div></div></div>`).join('')}` : ''}
        ${ap.length ? `<h3>Aprovados</h3><p>${ap.map((a) => `<span class="tag ok">${esc(a.roblox_name)}</span>`).join(' ')}</p>` : ''}
        ${open ? `<details style="margin-top:14px"><summary class="btn gold">Quero me inscrever</summary><form class="apply" data-round="${esc(x.id)}" style="margin-top:12px" novalidate>
          <label for="rn_${esc(x.id)}">Nome no Roblox *</label><input id="rn_${esc(x.id)}" name="roblox_name" required maxlength="20" autocomplete="off" autocapitalize="off" spellcheck="false">
          <label for="du_${esc(x.id)}">Usuário no Discord (opcional)</label><input id="du_${esc(x.id)}" name="discord_user" maxlength="60" autocomplete="off">
          ${ff.length ? TJ.formFieldsHTML(ff) : `<label for="ex_${esc(x.id)}">Experiência jurídica / no roleplay</label><textarea id="ex_${esc(x.id)}" name="experience" maxlength="1500"></textarea>
          <label for="mo_${esc(x.id)}">Por que quer fazer parte?</label><textarea id="mo_${esc(x.id)}" name="motivation" maxlength="1500"></textarea>`}
          <div class="hp" aria-hidden="true"><label>Não preencha<input name="website" tabindex="-1" autocomplete="off"></label></div>
          <label class="chk" style="align-items:flex-start;margin-top:16px"><input type="checkbox" name="consent" required> <span>Li e aceito a <a href="#/privacidade" target="_blank" rel="noopener">Política de Privacidade</a>. Autorizo o uso do que informei aqui apenas para avaliar a minha candidatura.</span></label>
          <p class="consent">Coletamos só o necessário: nome no Roblox, Discord (opcional) e as respostas acima. Nada de CPF, e-mail ou dados reais.</p>
          <p><button class="btn blue">Enviar inscrição</button></p></form></details>` : ''}
      </div>`;
    }).join('') : empty('Nenhum processo seletivo no momento.')}</div>`;
    v.querySelectorAll('form.apply').forEach((f) => (f.onsubmit = async (e) => {
      e.preventDefault();
      const round = rounds.find((x) => x.id === f.dataset.round), ff = Array.isArray(round?.form_fields) ? round.form_fields : [];
      const fd = Object.fromEntries(new FormData(f).entries());
      const name = (fd.roblox_name || '').trim();
      if (!/^[A-Za-z0-9_]{3,20}$/.test(name)) return TJ.toast('Nome do Roblox inválido: use de 3 a 20 letras, números ou _.', true);
      if (!f.querySelector('[name=consent]').checked) return TJ.toast('Marque a aceitação da Política de Privacidade para continuar.', true);
      if (fd.website) { f.innerHTML = '<p><b>Inscrição enviada!</b> Aguarde o contato da equipe.</p>'; return; }   // robô
      for (const q of ff) { if (q.required && q.type !== 'checkbox' && !(f.querySelector('#ff_' + q.id)?.value || '').trim()) return TJ.toast('Responda a pergunta: ' + q.label, true); }
      const payload = { round_id: f.dataset.round, roblox_name: name, discord_user: (fd.discord_user || '').trim().slice(0, 60) || null, consent: true };
      if (ff.length) payload.answers = TJ.readFormAnswers(f, ff);
      else { payload.experience = (fd.experience || '').trim().slice(0, 1500) || null; payload.motivation = (fd.motivation || '').trim().slice(0, 1500) || null; }
      const btn = f.querySelector('button.btn'); btn.disabled = true;
      const { error } = await sb().from('applications').insert(payload);
      if (error) { btn.disabled = false; return TJ.toast('Não foi possível enviar: ' + TJ.friendly(error.message), true); }
      f.innerHTML = '<p><b>Inscrição enviada!</b> Aguarde o contato da equipe.</p>';
    }));
  };

  pages.equipe = async (v) => {
    const { data, error } = await sb().from('profiles').select('*, role:roles(label,rank)').eq('active', true).eq('show_public', true);
    if (error) throw error;
    const g = {};
    (data || []).forEach((p) => { const k = p.role?.label || p.role_key; (g[k] = g[k] || { rank: p.role?.rank || 0, m: [] }).m.push(p); });
    const groups = Object.entries(g).sort((a, b) => b[1].rank - a[1].rank);
    v.innerHTML = head('Equipe', 'Quem compõe o Tribunal.', 'equipe') + `<div class="wrap section">${groups.length ? groups.map(([k, x]) => `<h2>${esc(k)}</h2><div class="grid g3" style="margin-bottom:24px">${x.m.map((p) => { const av = TJ.url(p.avatar_url); return `<div class="card"><div class="row">${av ? `<img class="avatar" src="${esc(av)}" alt="" loading="lazy">` : `<span class="avatar" aria-hidden="true">${esc((p.display_name || p.roblox_name || '?')[0].toUpperCase())}</span>`}<div><b>${esc(p.display_name || p.roblox_name)}</b><div class="muted small">@${esc(p.roblox_name)}</div></div></div>${p.bio ? `<p class="small" style="margin-bottom:0">${esc(p.bio)}</p>` : ''}</div>`; }).join('')}</div>`).join('') : empty('Equipe ainda não divulgada.')}</div>`;
  };

  pages.p = async (v, [slug]) => {
    const { data, error } = await sb().from('pages').select('*').eq('slug', String(slug || '')).eq('is_public', true).maybeSingle();
    if (error) throw error;
    v.innerHTML = data ? head(data.title, '', 'p', data.banner_url) + `<div class="wrap section" style="max-width:840px"><div class="card">${TJ.md(data.body)}</div></div>` : head('Página não encontrada') + `<div class="wrap section">${empty('Esta página não existe.')}</div>`;
  };

  // ---------- entrar (com trava de tentativas no aparelho) ----------
  const LK = 'tj-login-fails';
  const lockLeft = () => Math.max(0, (TJ.store.get(LK, {}).until || 0) - Date.now());
  const noteFail = () => { const d = TJ.store.get(LK, { n: 0, t: 0, until: 0 }), now = Date.now(); if (now - d.t > 15 * 60000) d.n = 0; d.n++; d.t = now; if (d.n >= 5) d.until = now + Math.min(15, 2 ** (d.n - 5)) * 60000; TJ.store.set(LK, d); };
  pages.entrar = async (v) => {
    if (state.P) { location.hash = '#/painel'; return; }
    const blocked = state.blocked ? `<div class="card" style="border-color:var(--bad);margin-bottom:14px"><b>Conta ${state.blocked.status === 'demitido' ? 'desligada' : 'suspensa'}.</b>${state.blocked.status_reason ? `<br><span class="small">${esc(state.blocked.status_reason)}</span>` : ''}<br><span class="small muted">Fale com a coordenação.</span></div>` : '';
    v.innerHTML = `<div class="wrap"><form class="card login" id="lf" novalidate><h1 style="font-size:24px">Entrar</h1>${blocked}
      <p class="muted small">Acesso restrito a membros do Tribunal. Use seu nome do Roblox e sua senha.</p>
      <label for="n">Nome no Roblox</label><input id="n" autocomplete="username" autocapitalize="off" spellcheck="false" required>
      <label for="p">Senha</label><input id="p" type="password" autocomplete="current-password" required>
      <p><button class="btn blue" style="width:100%">Entrar</button></p>
      <p class="small">Recebeu um convite? <a href="#/ativar">Ativar acesso</a></p></form></div>`;
    $('#lf').onsubmit = async (e) => {
      e.preventDefault();
      const left = lockLeft();
      if (left) return TJ.toast(`Muitas tentativas. Aguarde ${Math.ceil(left / 60000)} min e tente de novo.`, true);
      const btn = $('#lf button'); btn.disabled = true;
      try {
        const name = $('#n').value.trim();
        if (!name || !$('#p').value) throw new Error('Preencha o nome e a senha.');
        const { error } = await sb().auth.signInWithPassword({ email: emailOf(name), password: $('#p').value });
        if (error) { noteFail(); throw new Error('Nome do Roblox ou senha incorretos.'); }
        TJ.store.del(LK);
        await loadSession();
        if (state.blocked) { await sb().auth.signOut(); const b = state.blocked; state.U = state.P = null; throw new Error(b.status === 'demitido' ? 'Esta conta foi desligada do Tribunal.' : 'Esta conta está suspensa.'); }
        if (!state.P) { await sb().auth.signOut(); state.U = null; throw new Error('Conta ainda não ativada. Use "Ativar acesso" com seu convite.'); }
        location.hash = '#/painel';
      } catch (err) { TJ.toast(err.message, true); btn.disabled = false; }
    };
  };

  pages.ativar = async (v) => {
    v.innerHTML = `<div class="wrap"><form class="card login" id="af" novalidate><h1 style="font-size:24px">Ativar acesso</h1>
      <p class="muted small">Use o código de convite que a coordenação enviou para você.</p>
      <label for="n">Nome no Roblox (exatamente como no convite)</label><input id="n" autocapitalize="off" spellcheck="false" required>
      <label for="c">Código do convite</label><input id="c" required autocomplete="off" style="text-transform:uppercase">
      <label for="p">Crie uma senha (mínimo 8 caracteres, com letras e números)</label><input id="p" type="password" minlength="8" autocomplete="new-password" required>
      <label for="p2">Repita a senha</label><input id="p2" type="password" minlength="8" autocomplete="new-password" required>
      <label class="chk" style="align-items:flex-start;margin-top:16px"><input type="checkbox" id="ok" required> <span>Li e aceito a <a href="#/privacidade" target="_blank" rel="noopener">Política de Privacidade</a> e os <a href="#/termos" target="_blank" rel="noopener">Termos de uso</a>.</span></label>
      <p><button class="btn blue" style="width:100%">Ativar</button></p>
      <p class="small"><a href="#/entrar">Já tenho conta</a></p></form></div>`;
    $('#af').onsubmit = async (e) => {
      e.preventDefault();
      const btn = $('#af button'); btn.disabled = true;
      const name = $('#n').value.trim(), code = $('#c').value.trim().replace(/[.\s]+$/, ''), pass = $('#p').value;
      try {
        if (!name || !code) throw new Error('Preencha o nome e o código do convite.');
        if (!$('#ok').checked) throw new Error('Aceite a Política de Privacidade e os Termos de uso para continuar.');
        if (pass !== $('#p2').value) throw new Error('As senhas não conferem.');
        const bad = TJ.pwProblem(pass, name); if (bad) throw new Error(bad);
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
        if (r.data && r.data !== 'ok') { await sb().auth.signOut(); throw new Error(String(r.data)); }
        await loadSession();
        if (!state.P) throw new Error('Não foi possível ativar a conta. Confira o convite e tente de novo.');
        TJ.toast('Acesso ativado! Bem-vindo(a).');
        location.hash = '#/painel';
      } catch (err) { TJ.toast(err.message, true); btn.disabled = false; }
    };
  };

  pages.sair = async () => {
    try { await sb().auth.signOut(); } catch (e) {}
    state.U = state.P = state.blocked = null; location.hash = '#/';
  };

  // ---------- roteador ----------
  const TITLES = { processos: 'Processos', processo: 'Processo', comunicados: 'Comunicados', agenda: 'Agenda', selecao: 'Processo seletivo', biblioteca: 'Biblioteca', equipe: 'Equipe', entrar: 'Entrar', ativar: 'Ativar acesso', painel: 'Painel', privacidade: 'Política de Privacidade', termos: 'Termos de uso' };
  const GATE = { processo: 'processos' };
  async function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map((x) => { try { return decodeURIComponent(x); } catch (e) { return x; } });
    const r = parts[0] || '';
    navRender(r, parts);
    const view = $('#view');
    view.innerHTML = '<p class="boot">Carregando…</p>';
    window.scrollTo(0, 0);
    document.title = (TITLES[r] ? TITLES[r] + ' · ' : '') + (state.site.name || 'Tribunal de Justiça de Ilha Bela');
    try {
      const mt = state.site.maintenance || {};
      if (mt.on && !state.P && !['entrar', 'ativar', 'sair', 'privacidade', 'termos'].includes(r)) {
        view.innerHTML = `<div class="wrap"><div class="card maint"><div class="big" aria-hidden="true">🛠</div><h1 style="font-size:24px">Site em manutenção</h1><p class="muted">${esc(mt.message || 'Voltamos em breve.')}</p><p class="small"><a href="#/entrar">Acesso de membros</a></p></div></div>`;
        return;
      }
      const gate = GATE[r] || r;
      if (r === 'painel') {
        if (!state.P) { location.hash = '#/entrar'; return; }
        await TJ.mountPanel(view, parts.slice(1));
      } else if (pages[r] && gate && TJ.navDefault.some((d) => d[0] === gate) && !TJ.navOn(gate)) {
        view.innerHTML = head('Área indisponível') + `<div class="wrap section">${empty('Esta área não está disponível no momento.')}</div>`;
      } else if (pages[r]) {
        await pages[r](view, parts.slice(1));
      } else {
        view.innerHTML = head('Página não encontrada') + `<div class="wrap section">${empty('O endereço não existe. Volte ao início.')}</div>`;
      }
    } catch (e) {
      console.error(e);
      view.innerHTML = `<div class="wrap section"><div class="card"><h1 style="font-size:22px">Algo deu errado</h1><p class="muted">${esc(TJ.friendly(e.message || e))}</p><p class="small">Tente recarregar a página. Se você é da equipe e acabou de atualizar o site, confira se o arquivo SQL mais recente foi executado por completo no Supabase.</p></div></div>`;
    }
    if (location.hash === '' || document.activeElement === document.body) { try { view.focus({ preventScroll: true }); } catch (e) {} }
  }
  TJ.route = route;

  // encerra a sessão depois de um tempo sem uso
  function idleWatch() {
    const mins = Number(state.site.idle_minutes ?? 30);
    if (!(mins > 0)) return;
    let last = Date.now();
    ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((ev) => window.addEventListener(ev, () => { last = Date.now(); }, { passive: true }));
    setInterval(async () => {
      if (!state.U || Date.now() - last < mins * 60000) return;
      last = Date.now();
      try { await sb().auth.signOut(); } catch (e) {}
      state.U = state.P = null; TJ.toast('Sessão encerrada por inatividade. Entre novamente.');
      location.hash = '#/entrar'; if (location.hash === '#/entrar') route();
    }, 20000);
  }

  function fatal(html) { $('#app').innerHTML = `<div class="wrap section"><div class="card" style="max-width:660px;margin:40px auto">${html}</div></div>`; }

  TJ.start = async function () {
    const saved = TJ.store.get('tj-theme', null);
    document.documentElement.dataset.theme = saved || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (TJ.keyBad) { fatal('<h1 style="font-size:22px;color:var(--bad)">Chave secreta no site: pare tudo</h1><p>O arquivo <code>config.js</code> contém a chave <b>secreta</b> do Supabase (<code>service_role</code> ou <code>sb_secret_…</code>). Ela dá acesso total ao banco e nunca pode ficar num site público.</p><p><b>Faça agora:</b> 1) troque no <code>config.js</code> pela chave <b>anon</b> ou <b>publishable</b>; 2) no Supabase, gere uma chave nova (Project Settings › API) e considere a antiga vazada.</p>'); return; }
    if (TJ.noLib) { fatal('<h1 style="font-size:22px">Não consegui carregar o Supabase</h1><p>O arquivo da biblioteca do Supabase não carregou (rede ou bloqueio). Recarregue a página. Se continuar, verifique a linha <code>supabase-js</code> do <code>index.html</code>.</p>'); return; }
    if (!TJ.configured) { fatal('<h2>Falta configurar o Supabase</h2><p>Abra o arquivo <code>config.js</code> e confira: <b>SUPABASE_URL</b> deve ser o endereço do projeto, no formato <code>https://xxxxxxxx.supabase.co</code>, e <b>SUPABASE_ANON_KEY</b> deve ser a chave pública (anon ou publishable).</p>'); return; }
    try { await loadSettings(); await loadSession(); } catch (e) { console.error(e); state.site = normalizeSite({}); applyAppearance(); }
    shell();
    document.addEventListener('click', (e) => { const s = e.target.closest('.spoiler'); if (s) s.classList.toggle('show'); });
    window.addEventListener('hashchange', route);
    sb().auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT' && state.U) { state.U = state.P = null; if (location.hash.startsWith('#/painel')) location.hash = '#/entrar'; } });
    idleWatch();
    if (TJ.legalInit) TJ.legalInit();
    route();
  };
})();
