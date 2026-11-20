/* Biblioteca: normas, manuais, modelos e documentos do Tribunal (página pública + gestão no painel) */
(function () {
  const TJ = window.TJ, esc = TJ.esc, $ = TJ.$, state = TJ.state, H = TJ.H, P = TJ.P, pages = TJ.pages, F = H.F;
  const sb = () => TJ.sb;

  // ---------- página pública ----------
  pages.biblioteca = async (v, [id]) => {
    if (id) return detail(v, id);
    const { data, error } = await sb().from('library_docs').select('id,title,category,summary,audience,file_url,updated_at,sort').eq('published', true).order('sort').order('title');
    if (error) throw error;
    const all = data || [], cats = [...new Set(all.map((d) => d.category))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    let cat = '';
    v.innerHTML = TJ.head('Biblioteca', 'Leis, normas, manuais e documentos do Tribunal.', 'biblioteca') + `<div class="wrap section">
      <div class="toolbar"><input id="q" class="q" type="search" placeholder="Buscar documento…" aria-label="Buscar na biblioteca"></div>
      <div class="chips" id="cc"></div><div class="grid g3" id="list"></div>
      ${state.P ? '' : '<p class="small muted" style="margin-top:18px">Alguns documentos são só para membros. <a href="#/entrar">Entre</a> para vê-los.</p>'}</div>`;
    const draw = () => {
      $('#cc').innerHTML = cats.length > 1 ? ['', ...cats].map((c) => `<button class="chip${cat === c ? ' on' : ''}" data-c="${esc(c)}" aria-pressed="${cat === c}">${c ? esc(c) : 'Todos'}</button>`).join('') : '';
      $('#cc').querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => { cat = b.dataset.c; draw(); }));
      const q = $('#q').value.toLowerCase();
      const r = all.filter((d) => (!cat || d.category === cat) && (!q || (d.title + ' ' + (d.summary || '') + ' ' + d.category).toLowerCase().includes(q)));
      $('#list').innerHTML = r.length ? r.map((d) => `<a class="card doccard" href="#/biblioteca/${esc(d.id)}"><div class="meta"><span class="tag">${esc(d.category)}</span>${d.audience === 'membros' ? '<span class="tag warn">Só membros</span>' : ''}${TJ.url(d.file_url) ? '<span class="tag gray">Arquivo</span>' : ''}</div><h2 style="margin:0;font-size:17px">${esc(d.title)}</h2>${d.summary ? `<p class="muted small">${esc(d.summary)}</p>` : ''}<p class="small muted" style="margin-top:auto">Atualizado em ${TJ.fmtDate(d.updated_at)}</p></a>`).join('') : TJ.empty(all.length ? 'Nenhum documento encontrado.' : 'A biblioteca ainda não tem documentos.');
    };
    $('#q').oninput = draw; draw();
  };

  async function detail(v, id) {
    const bad = () => { v.innerHTML = TJ.head('Documento não encontrado') + `<div class="wrap section">${TJ.empty('Este documento não existe ou é restrito a membros.')}<p style="text-align:center"><a href="#/biblioteca">← Biblioteca</a>${state.P ? '' : ' · <a href="#/entrar">Entrar</a>'}</p></div>`; };
    if (!/^[0-9a-f-]{36}$/i.test(id)) return bad();
    const { data: d, error } = await sb().from('library_docs').select('*').eq('id', id).eq('published', true).maybeSingle();
    if (error) throw error;
    if (!d) return bad();
    const f = TJ.url(d.file_url);
    v.innerHTML = TJ.head(d.title, d.summary || '', 'biblioteca') + `<div class="wrap section"><div class="docview">
      <p class="row"><span class="tag">${esc(d.category)}</span>${d.audience === 'membros' ? '<span class="tag warn">Só membros</span>' : ''}<span class="small muted">Atualizado em ${TJ.fmtDate(d.updated_at)}</span></p>
      ${f ? `<p><a class="btn gold" href="${esc(f)}" target="_blank" rel="noopener noreferrer">${TJ.icon('download')} Abrir arquivo (nova aba)</a></p>` : ''}
      <div class="card">${d.body ? TJ.md(d.body) : '<p class="muted">Este documento não tem texto, só o arquivo anexado.</p>'}</div>
      <p style="margin-top:18px"><a href="#/biblioteca">← Voltar à biblioteca</a></p></div></div>`;
  }

  // ---------- painel ----------
  P.biblioteca = async (el, args, embed) => {
    const can = TJ.can('manage_library');
    el.innerHTML = H.hd(embed)('Biblioteca', 'Leis, regimento, manuais e modelos. Quem não gerencia só consulta' + (can ? '' : ' (somente leitura)') + '.', can ? `<a class="btn sm" href="#/biblioteca" target="_blank">${TJ.icon('eye')} Ver no site</a>` : '') + '<div id="c"></div>';
    await TJ.crud($('#c', el), {
      table: 'library_docs', order: ['sort'], newLabel: 'Novo documento', canWrite: can,
      defaults: { category: 'Geral', audience: 'publico', published: true, sort: 100 },
      filters: [{ k: 'audience', label: 'Quem vê', opts: [['publico', 'Todos'], ['membros', 'Só membros']] }],
      fields: [
        { k: 'title', label: 'Título', req: true, ph: 'Ex.: Código Penal de Ilha Bela' },
        { k: 'category', label: 'Categoria', req: true, ph: 'Ex.: Leis e códigos, Manuais, Regimento, Modelos' },
        { k: 'audience', label: 'Quem pode ver', type: 'select', opts: [['publico', 'Todos (público no site)'], ['membros', 'Só membros logados']] },
        { k: 'summary', label: 'Resumo (aparece no cartão)', type: 'textarea', rows: 2, help: 'Até 400 caracteres.' },
        { k: 'body', label: 'Texto do documento', type: 'textarea', rows: 16, help: 'Mesma formatação dos comunicados: # título, **negrito**, > citação, - lista.' },
        { k: 'file_url', label: 'Arquivo ou link (opcional)', upload: 'biblioteca', help: 'Cole um link (Drive, Docs…) ou envie um PDF/imagem de até 15 MB.' },
        { k: 'sort', label: 'Ordem (menor aparece primeiro)', type: 'number' },
        { k: 'published', label: 'Publicado', type: 'bool', help: 'Desmarcado = rascunho, só quem gerencia vê.' },
      ],
      beforeSave: (p) => {
        if (!p.title || p.title.length < 3 || p.title.length > 160) throw new Error('O título precisa ter de 3 a 160 caracteres.');
        if (p.summary && p.summary.length > 400) throw new Error('O resumo pode ter no máximo 400 caracteres.');
        if (p.file_url && !TJ.url(p.file_url)) throw new Error('O link do arquivo precisa começar com https://');
        if (p.file_url) p.file_url = TJ.url(p.file_url);
      },
      cols: [{ label: 'Título', k: 'title' }, { label: 'Categoria', k: 'category' }, { label: 'Quem vê', fmt: (r) => (r.audience === 'membros' ? '<span class="tag warn">Só membros</span>' : '<span class="tag ok">Todos</span>') }, { label: 'Publicado', fmt: F.yn('published') }, { label: 'Atualizado', fmt: F.date('updated_at') }],
      actions: [{ label: 'Abrir', fn: (r) => { window.open(location.origin + location.pathname + '#/biblioteca/' + r.id, '_blank', 'noopener'); } }],
      onRow: can ? undefined : (r) => { location.hash = '#/biblioteca/' + r.id; },
    });
  };
})();
