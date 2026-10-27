/* Painel do Tribunal - Discord (v3): vários canais (webhooks), envio, automações por evento e histórico */
(function () {
  const TJ = window.TJ, esc = TJ.esc, $ = TJ.$, state = TJ.state, H = TJ.H, P = TJ.P, F = H.F;
  const sb = () => TJ.sb;
  const EVENTS = {
    announcement: ['Comunicado publicado', 'Quando um comunicado é publicado', ['titulo', 'texto']],
    hearing: ['Audiência agendada', 'Quando uma audiência pública é criada', ['titulo', 'data', 'local']],
    case_new: ['Novo processo público', 'Quando um processo público é aberto', ['numero', 'titulo']],
    case_sentenced: ['Processo sentenciado', 'Quando um processo passa a Sentenciado', ['numero', 'titulo', 'resultado']],
    round_open: ['Seleção aberta', 'Quando uma vaga pública é aberta', ['titulo', 'prazo']],
    interview_schedule: ['Agenda de entrevistas', 'Ao aplicar horários na seleção (opcional)', ['titulo', 'lista']],
    member_promoted: ['Membro promovido', 'Quando o cargo de um membro sobe', ['nome', 'cargo']],
    member_dismissed: ['Membro desligado', 'Quando um membro é desligado', ['nome']],
  };
  const fill = (tpl, vars) => String(tpl || '').replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null && vars[k] !== '' ? vars[k] : '—'));
  const chunk = (t, n = 1900) => { const out = []; let cur = ''; for (const line of String(t).split('\n')) { if ((cur + '\n' + line).length > n && cur) { out.push(cur); cur = ''; } if (line.length > n) { for (let i = 0; i < line.length; i += n) out.push(line.slice(i, i + n)); continue; } cur = cur ? cur + '\n' + line : line; } if (cur) out.push(cur); return out; };
  const validHook = (u) => /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+/.test(String(u || '').trim());
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function post(ch, body) {
    const r = await fetch(ch.webhook_url.trim() + '?wait=false', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error(`Discord respondeu ${r.status}${t ? ': ' + t.slice(0, 120) : ''}`); }
  }
  async function log(ch, kind, content, ok) {
    try { await sb().from('discord_log').insert({ channel_name: ch.name, kind, content: String(content).slice(0, 4000), ok, user_id: state.U?.id || null }); } catch (e) { /* ignora */ }
  }
  // envia texto simples (com divisão automática) ou embed para um canal
  async function sendTo(ch, o, kind) {
    try {
      const base = { username: o.username || ch.username || undefined, avatar_url: o.avatar_url || ch.avatar_url || undefined, allowed_mentions: o.mentions ? { parse: ['everyone', 'roles', 'users'] } : { parse: [] } };
      if (o.embed) {
        await post(ch, Object.assign({}, base, { content: o.content_above || undefined, embeds: [{ title: o.title || undefined, description: String(o.content).slice(0, 4000), color: o.color ? parseInt(o.color.replace('#', ''), 16) : undefined, image: o.image ? { url: o.image } : undefined, thumbnail: o.thumb ? { url: o.thumb } : undefined, footer: o.footer ? { text: o.footer } : undefined, timestamp: o.timestamp ? new Date().toISOString() : undefined }] }));
      } else {
        const parts = chunk(o.content);
        for (let i = 0; i < parts.length; i++) { await post(ch, Object.assign({}, base, { content: parts[i] })); if (i < parts.length - 1) await sleep(700); }
      }
      await log(ch, kind || 'manual', o.content, true);
      return null;
    } catch (e) { await log(ch, kind || 'manual', o.content + '\n[erro] ' + e.message, false); return e.message; }
  }
  async function channels() {
    const { data } = await sb().from('discord_channels').select('*').eq('active', true).order('name');
    return data || [];
  }

  // ---------- automação ----------
  TJ.automate = async function (event, vars) {
    try {
      const { data: rule } = await sb().from('discord_rules').select('*').eq('event', event).maybeSingle();
      if (!rule || !rule.enabled || !rule.channel_id) return;
      const { data: ch } = await sb().from('discord_channels').select('*').eq('id', rule.channel_id).maybeSingle();
      if (!ch || !ch.active) return;
      const err = await sendTo(ch, { content: fill(rule.template, vars) }, 'auto:' + event);
      TJ.toast(err ? 'Aviso automático falhou: ' + err : `Aviso enviado ao Discord (#${ch.name}).`, !!err);
    } catch (e) { /* automação nunca quebra a ação principal */ }
  };

  // ---------- diálogo de envio rápido (usado em vários lugares) ----------
  TJ.discordSend = async function (o) {
    const chs = await channels();
    if (!chs.length) return TJ.toast('Cadastre um canal em Discord › Canais primeiro.', true);
    const last = TJ.store.get('tj-dc-last', []);
    TJ.dlg(`<h3>Enviar ao Discord</h3>
      <label>Canais de destino</label><div class="chips">${chs.map((c) => `<label class="chip chk"><input type="checkbox" value="${c.id}"${last.includes(c.id) || (!last.length && chs.length === 1) ? ' checked' : ''}> #${esc(c.name)}</label>`).join('')}</div>
      <label>Mensagem <span class="muted small" id="cnt"></span></label><textarea id="dtx" rows="9">${esc(o.content || '')}</textarea>
      <p class="row" style="margin-top:14px"><button class="btn gold" id="dgo">Enviar</button><button class="btn" id="dcp">Copiar</button><button class="btn" data-close>Cancelar</button></p>`, (d) => {
      const tx = d.querySelector('#dtx'), cnt = () => { const n = tx.value.length; d.querySelector('#cnt').textContent = `${n} caracteres${n > 2000 ? ' — será dividida em ' + chunk(tx.value).length + ' mensagens' : ''}`; };
      tx.oninput = cnt; cnt();
      d.querySelector('#dcp').onclick = () => TJ.copy(tx.value, 'Copiado em markdown!');
      d.querySelector('#dgo').onclick = async () => {
        const ids = [...d.querySelectorAll('.chips input:checked')].map((x) => x.value); if (!ids.length) return TJ.toast('Marque pelo menos um canal.', true);
        if (!tx.value.trim()) return TJ.toast('Escreva a mensagem.', true);
        TJ.store.set('tj-dc-last', ids); d.querySelector('#dgo').disabled = true; let bad = 0;
        for (const id of ids) { const err = await sendTo(chs.find((c) => c.id === id), { content: tx.value }, o.event || 'manual'); if (err) { bad++; TJ.toast(err, true); } }
        d.close(); if (!bad) TJ.toast('Enviado!');
      };
    });
  };

  // ---------- página ----------
  P.discord = async (el, [tab = 'enviar']) => {
    el.innerHTML = H.head('Discord', 'Canais (webhooks), envios, avisos automáticos e histórico.') + H.tabs('discord', [['enviar', 'Enviar'], ['canais', 'Canais'], ['auto', 'Automações'], ['historico', 'Histórico']], tab) + '<div id="tc"></div>';
    const tc = $('#tc', el);
    ({ enviar: tabEnviar, canais: tabCanais, auto: tabAuto, historico: tabHist }[tab] || tabEnviar)(tc);
  };

  async function tabEnviar(tc) {
    const [chs, { data: anns }] = await Promise.all([channels(), sb().from('announcements').select('id,title,body,category').order('created_at', { ascending: false }).limit(30)]);
    if (!chs.length) { tc.innerHTML = '<div class="empty">Nenhum canal ativo. Vá em <a href="#/painel/discord/canais"><b>Canais</b></a> e cadastre o webhook de cada canal do seu servidor.</div>'; return; }
    const last = TJ.store.get('tj-dc-last', []);
    tc.innerHTML = `<div class="grid g2" style="align-items:start"><div class="card">
      <label style="margin-top:0">Canais de destino</label><div class="chips">${chs.map((c) => `<label class="chip chk"><input type="checkbox" value="${c.id}"${last.includes(c.id) ? ' checked' : ''}> #${esc(c.name)}</label>`).join('')}</div>
      <label>Carregar de um comunicado</label><select id="an"><option value="">— escrever do zero —</option>${(anns || []).map((a) => `<option value="${a.id}">${esc(a.title)}</option>`).join('')}</select>
      <label>Formato</label><select id="mode"><option value="text">Texto normal (markdown do Discord)</option><option value="embed">Cartão (embed) com título, cor e imagem</option></select>
      <div id="embedf" hidden><label>Título do cartão</label><input id="et"><div class="grid g2"><div><label>Cor</label><input type="color" id="ec" value="#c8a24a"></div><div><label>Rodapé</label><input id="ef"></div></div><label>Imagem (link)</label><input id="ei" placeholder="https://…"><label>Miniatura (link)</label><input id="eth" placeholder="https://…"></div>
      <label>Mensagem <span class="muted small" id="cnt"></span></label><textarea id="tx" rows="10" placeholder="# Título&#10;Texto do aviso…"></textarea>
      <div class="grid g2"><div><label>Nome do remetente (opcional)</label><input id="un" placeholder="Padrão do canal"></div><div><label>Foto do remetente (link)</label><input id="av"></div></div>
      <label class="chk"><input type="checkbox" id="mn"> Permitir marcar @everyone / @cargos</label>
      <p class="row" style="margin-bottom:0"><button class="btn gold" id="go">Enviar agora</button><button class="btn" id="cp">Copiar</button></p></div>
      <div class="card"><h3>Pré-visualização</h3><div id="pv" class="dcpreview"></div></div></div>`;
    const tx = $('#tx', tc), pv = () => { const n = tx.value.length; $('#cnt', tc).textContent = `${n} caracteres${n > 2000 && $('#mode', tc).value === 'text' ? ' — será dividida em ' + chunk(tx.value).length + ' mensagens' : ''}`; const emb = $('#mode', tc).value === 'embed'; $('#embedf', tc).hidden = !emb; $('#pv', tc).innerHTML = emb ? `<div class="dcembed" style="border-left:4px solid ${esc($('#ec', tc).value)}">${$('#et', tc).value ? `<b>${esc($('#et', tc).value)}</b>` : ''}${TJ.md(tx.value)}${$('#ei', tc).value ? `<img src="${esc($('#ei', tc).value)}" alt="" style="max-width:100%;border-radius:6px;margin-top:8px">` : ''}${$('#ef', tc).value ? `<div class="small muted" style="margin-top:6px">${esc($('#ef', tc).value)}</div>` : ''}</div>` : TJ.md(tx.value) || '<span class="muted">A prévia aparece aqui.</span>'; };
    tc.querySelectorAll('input,textarea,select').forEach((i) => i.addEventListener('input', pv)); pv();
    $('#an', tc).onchange = () => { const a = (anns || []).find((x) => x.id === $('#an', tc).value); if (a) { tx.value = `# ${a.title}\n${a.body || ''}`; $('#et', tc).value = a.title; pv(); } };
    $('#cp', tc).onclick = () => TJ.copy(tx.value, 'Copiado em markdown!');
    $('#go', tc).onclick = async () => {
      const ids = [...tc.querySelectorAll('.chips input:checked')].map((x) => x.value); if (!ids.length) return TJ.toast('Marque pelo menos um canal.', true);
      if (!tx.value.trim()) return TJ.toast('Escreva a mensagem.', true);
      TJ.store.set('tj-dc-last', ids);
      const emb = $('#mode', tc).value === 'embed', mentions = $('#mn', tc).checked;
      if (mentions && !confirm('Isso pode marcar muita gente. Enviar mesmo assim?')) return;
      $('#go', tc).disabled = true; let ok = 0, bad = 0;
      for (const id of ids) { const err = await sendTo(chs.find((c) => c.id === id), { content: tx.value, embed: emb, title: $('#et', tc).value, color: $('#ec', tc).value, footer: $('#ef', tc).value, image: $('#ei', tc).value, thumb: $('#eth', tc).value, username: $('#un', tc).value.trim(), avatar_url: $('#av', tc).value.trim(), mentions }); if (err) { bad++; TJ.toast(err, true); } else ok++; }
      $('#go', tc).disabled = false; if (ok) TJ.toast(`Enviado para ${ok} canal(is)${bad ? `, ${bad} falhou` : ''}.`, !!bad && !ok);
    };
  }

  async function tabCanais(tc) {
    const can = TJ.can('manage_site');
    tc.innerHTML = `<div class="card" style="margin-bottom:16px"><b>Como pegar o webhook de um canal</b><p class="small muted" style="margin-bottom:0">No Discord: Configurações do canal › Integrações › Webhooks › Novo webhook › Copiar URL do webhook. Cadastre um por canal (avisos, audiências, seleção…). Quem tem acesso ao painel consegue enviar mensagens nesses canais, então cadastre só os que quiser.</p></div><div id="lst"></div>`;
    await TJ.crud($('#lst', tc), { id: 'dchannels', table: 'discord_channels', order: ['name'], newLabel: 'Novo canal', canWrite: can, defaults: { active: true },
      beforeSave: (p) => { if (!validHook(p.webhook_url)) throw new Error('O link do webhook parece inválido. Ele começa com https://discord.com/api/webhooks/'); p.webhook_url = p.webhook_url.trim(); p.name = String(p.name || '').replace(/^#/, '').trim(); },
      fields: [{ k: 'name', label: 'Nome do canal', req: true, ph: 'Ex.: avisos-gerais' }, { k: 'webhook_url', label: 'URL do webhook', req: true, ph: 'https://discord.com/api/webhooks/…' }, { k: 'description', label: 'Para que serve (opcional)' }, { k: 'username', label: 'Nome do remetente (opcional)', ph: 'Tribunal de Justiça' }, { k: 'avatar_url', label: 'Foto do remetente', upload: 'midia' }, { k: 'active', label: 'Canal ativo', type: 'bool' }],
      cols: [{ label: 'Canal', fmt: (r) => '#' + esc(r.name) }, { label: 'Uso', k: 'description' }, { label: 'Remetente', k: 'username' }, { label: 'Webhook', fmt: (r) => `<span class="muted small">…${esc(String(r.webhook_url).slice(-8))}</span>` }, { label: 'Ativo', fmt: F.yn('active') }],
      actions: can ? [{ label: 'Testar', fn: async (r) => { const err = await sendTo(r, { content: '✅ Teste de conexão do painel do Tribunal.' }, 'teste'); TJ.toast(err || 'Mensagem de teste enviada!', !!err); } }] : null });
  }

  async function tabAuto(tc) {
    const can = TJ.can('manage_site');
    const [chs, { data: rules }] = await Promise.all([sb().from('discord_channels').select('id,name,active').order('name'), sb().from('discord_rules').select('*')]);
    const byEv = Object.fromEntries((rules || []).map((r) => [r.event, r]));
    tc.innerHTML = `<div class="card" style="margin-bottom:16px"><b>Avisos automáticos</b><p class="small muted" style="margin-bottom:0">Escolha o que o site avisa sozinho e em qual canal. Os avisos são enviados do seu navegador no momento da ação (por exemplo, ao salvar a audiência).</p></div>
      ${Object.entries(EVENTS).map(([ev, [t, d, vars]]) => { const r = byEv[ev] || { enabled: false, template: '' }; return `<div class="card" data-ev="${ev}" style="margin-bottom:14px"><div class="row spread"><div><b>${t}</b><div class="small muted">${d}</div></div><label class="chk" style="margin:0"><input type="checkbox" class="en"${r.enabled ? ' checked' : ''}${can ? '' : ' disabled'}> Ativo</label></div>
        <label>Canal</label><select class="ch"${can ? '' : ' disabled'}><option value="">— escolher —</option>${(chs || []).map((c) => `<option value="${c.id}"${r.channel_id === c.id ? ' selected' : ''}>#${esc(c.name)}${c.active ? '' : ' (inativo)'}</option>`).join('')}</select>
        <label>Mensagem <span class="muted small">campos: ${vars.map((v) => `<code>{${v}}</code>`).join(' ')}</span></label><textarea class="tp" rows="4"${can ? '' : ' disabled'}>${esc(r.template || '')}</textarea>
        ${can ? '<p class="row" style="margin-bottom:0"><button class="btn sm gold sv">Salvar</button><button class="btn sm pr">Pré-visualizar</button></p>' : ''}</div>`; }).join('')}`;
    tc.querySelectorAll('[data-ev]').forEach((card) => {
      const ev = card.dataset.ev; const ex = Object.fromEntries(EVENTS[ev][2].map((v) => [v, '(' + v + ')']));
      const pr = card.querySelector('.pr'); if (pr) pr.onclick = () => TJ.dlg(`<h3>Pré-visualização</h3><div class="dcpreview">${TJ.md(fill(card.querySelector('.tp').value, ex))}</div><p><button class="btn" data-close>Fechar</button></p>`);
      const sv = card.querySelector('.sv'); if (sv) sv.onclick = async () => {
        const row = { event: ev, enabled: card.querySelector('.en').checked, channel_id: card.querySelector('.ch').value || null, template: card.querySelector('.tp').value };
        if (row.enabled && !row.channel_id) return TJ.toast('Escolha um canal para ativar.', true);
        const { error } = await sb().from('discord_rules').upsert(row, { onConflict: 'event' }); TJ.toast(error ? error.message : 'Automação salva.', !!error);
      };
    });
  }

  async function tabHist(tc) {
    await TJ.crud(tc, { id: 'dlog', table: 'discord_log', order: ['created_at', false], canWrite: false, noCreate: true,
      filters: [{ k: 'ok', label: 'Resultado', opts: [['true', 'Enviado'], ['false', 'Falhou']] }],
      cols: [{ label: 'Quando', fmt: F.dt('created_at') }, { label: 'Canal', fmt: (r) => '#' + esc(r.channel_name || '') }, { label: 'Origem', k: 'kind' }, { label: 'Resultado', fmt: (r) => `<span class="tag ${r.ok ? 'ok' : 'bad'}">${r.ok ? 'Enviado' : 'Falhou'}</span>` }, { label: 'Mensagem', fmt: F.cut('content', 90) }] });
  }
})();
