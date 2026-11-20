/* Segurança, privacidade (LGPD) e transparência: páginas legais, aviso de armazenamento, painel Segurança e "Meus dados" */
(function () {
  const TJ = window.TJ, esc = TJ.esc, $ = TJ.$, L = TJ.L, state = TJ.state, H = TJ.H, P = TJ.P, pages = TJ.pages, F = H.F;
  const sb = () => TJ.sb;
  const VERSION_DATE = '3 de novembro de 2026';

  // =====================================================================
  // TEXTOS LEGAIS (modelos; a coordenação pode trocar tudo em Segurança › Textos legais)
  // =====================================================================
  TJ.legalDefaults = function () {
    const s = state.site, lg = TJ.legalInfo();
    const privacy = `## 1. Quem somos
O **${s.name}** é um projeto de roleplay (jogo no Roblox), sem fins lucrativos, sem CNPJ e sem qualquer ligação com um órgão público real. Quem decide como os dados deste site são tratados (o "controlador", na LGPD) é a **${lg.controller}**. Fale conosco ${lg.contact}.

## 2. Que dados coletamos
- **Quem só visita o site:** nenhum dado pessoal. O navegador guarda apenas preferências, como o tema claro/escuro. Não usamos cookies de publicidade, estatísticas ou rastreamento, nem pixels, nem fontes ou scripts de terceiros além da biblioteca técnica do Supabase.
- **Candidatos (formulário do processo seletivo):** nome de usuário do Roblox, usuário do Discord (opcional), as respostas que você escrever, e a data e hora em que você aceitou esta política.
- **Membros:** nome do Roblox, nome de exibição, foto e apresentação (opcionais), cargo, histórico no Tribunal (entrada, promoções, advertências), peças e tarefas que você cria e registros de alterações (auditoria). A senha é guardada em formato criptografado pelo serviço de login e **ninguém da equipe consegue ver a sua senha**.
- **Registros técnicos:** os serviços que mantêm o site (hospedagem e banco de dados) podem registrar endereço de IP e dados de acesso, por segurança e para evitar abusos.

**Não peça nem informe dados reais** (nome completo, CPF, endereço, telefone, e-mail, fotos de documentos). O site não precisa deles.

## 3. Para que usamos e em que base legal
- Avaliar candidaturas e contatar candidatos: **consentimento** (art. 7º, I, da LGPD), que você dá marcando a caixa do formulário e pode retirar quando quiser.
- Gerir membros, cargos, processos fictícios e a segurança do site: **legítimo interesse** e execução do vínculo no jogo (art. 7º, V e IX).
- Cumprir pedidos seus sobre os dados: **obrigação legal** (art. 18).

## 4. Com quem compartilhamos
Não vendemos nem alugamos dados. Usamos serviços de terceiros apenas para o site funcionar: **Supabase** (banco de dados, login e arquivos), **GitHub Pages** (hospedagem), **jsDelivr** (entrega da biblioteca técnica do site) e **Discord** (avisos que a equipe publica; dados de candidatos não são enviados ao Discord). Esses serviços podem tratar dados fora do Brasil.

## 5. Por quanto tempo guardamos
- Inscrições: até **${lg.retention} dias** depois do fim da vaga; depois são apagadas.
- Dados de membros: enquanto você for membro; o histórico mínimo (entrada, saída, penalidades) pode ser mantido depois, por interesse legítimo e para evitar abusos.
- Você pode pedir a exclusão antes disso (veja o item 6).

## 6. Seus direitos (art. 18 da LGPD)
Você pode pedir: confirmação de que tratamos seus dados, acesso, correção, anonimização ou eliminação, portabilidade, informação sobre compartilhamento e a retirada do consentimento.
- **Membros:** entre no painel, abra **Minha conta › Meus dados** para baixar uma cópia e para pedir correção ou exclusão.
- **Candidatos e visitantes:** escreva à coordenação ${lg.contact}, informando o seu nome de usuário do Roblox.
Respondemos em até 15 dias.

## 7. Segurança
Usamos conexão segura (HTTPS), controle de acesso por cargo no servidor, senhas criptografadas, limites de tentativas, validação dos dados e registro de alterações. Nenhum sistema é 100% seguro; se soubermos de um incidente que possa afetar você, avisaremos.

## 8. Crianças e adolescentes
O Roblox é usado por muita gente jovem. Se você tem **menos de 18 anos**, peça ao seu responsável legal para ler esta política antes de se inscrever. Não coletamos de propósito dados de crianças além do nome de usuário do jogo.

## 9. Mudanças
Podemos atualizar esta política. A data da última versão aparece abaixo.

*Última atualização: ${lg.updated || VERSION_DATE}.*

-# Texto-modelo. Não substitui orientação jurídica; a coordenação deve revisá-lo e adaptá-lo à realidade do projeto.`;

    const terms = `## 1. O que é este site
O site do **${s.name}** faz parte de um jogo de roleplay. Tudo o que aparece aqui (processos, decisões, penas, cargos, audiências) é **ficção**, não tem validade jurídica e não representa nenhum órgão público real. O projeto não tem ligação com a Roblox Corporation, com o Discord ou com qualquer governo; "Roblox" e "Discord" são marcas dos seus donos.

## 2. Contas de membros
O acesso é só por convite. Você é responsável pela sua conta: não compartilhe a senha, use uma senha forte e avise a coordenação se desconfiar de acesso indevido. A coordenação pode suspender ou desligar contas, com registro do motivo no histórico do membro.

## 3. Conduta
É proibido: publicar conteúdo ilegal, ofensivo, discriminatório ou de assédio; expor dados pessoais reais de alguém; enviar spam; tentar burlar a segurança do site ou acessar o que não é seu. Se encontrar uma falha de segurança, avise a coordenação em vez de explorá-la.

## 4. Conteúdo e direitos autorais
Você é responsável pelo que escreve e envia. **Envie só imagens, textos e arquivos que são seus, livres de direitos ou que você tem autorização para usar**, e dê o crédito quando necessário. Conteúdo que violar direitos de terceiros será removido a pedido. ${lg.credits ? 'Créditos de imagens e materiais: ' + lg.credits : 'Os créditos de imagens e materiais, quando houver, ficam indicados junto a eles.'}

## 5. Sem promessas
Resultados de processos seletivos, cargos e decisões dependem da coordenação e do andamento do roleplay. **Nada neste site é garantia** de aprovação, de cargo ou de qualquer vantagem. O site é oferecido "como está", sem garantia de funcionamento ininterrupto, e pode sair do ar para manutenção.

## 6. Privacidade
O tratamento de dados pessoais está descrito na [Política de Privacidade](#/privacidade).

## 7. Mudanças e lei aplicável
Estes termos podem mudar; a versão em vigor é a publicada nesta página. Aplica-se a lei brasileira.

*Última atualização: ${lg.updated || VERSION_DATE}.*

-# Texto-modelo. Não substitui orientação jurídica; a coordenação deve revisá-lo e adaptá-lo.`;
    return { privacy, terms };
  };

  const legalPage = (key, title, sub) => async (v) => {
    const g = state.site.legal || {}, def = TJ.legalDefaults();
    const text = (g[key + '_text'] || '').trim() || def[key];
    v.innerHTML = TJ.head(title, sub) + `<div class="wrap section" style="max-width:840px"><div class="card legal">${TJ.md(text)}</div>
      <div class="notice" style="margin-top:16px">${TJ.icon('info')}<p>${esc(TJ.FICTION)}</p></div>
      <p style="margin-top:16px"><a href="#/">← Início</a> · <a href="#/${key === 'privacy' ? 'termos' : 'privacidade'}">${key === 'privacy' ? 'Termos de uso' : 'Política de Privacidade'}</a></p></div>`;
  };
  pages.privacidade = legalPage('privacy', 'Política de Privacidade', 'Como tratamos os seus dados (LGPD).');
  pages.termos = legalPage('terms', 'Termos de uso', 'Regras para usar o site.');

  // =====================================================================
  // AVISO DE ARMAZENAMENTO (só o essencial; sem rastreadores)
  // =====================================================================
  TJ.legalInit = function () {
    if (TJ.store.get('tj-aviso-ok', false)) return;
    const d = document.createElement('div');
    d.className = 'cookie' + (location.hash.startsWith('#/painel') ? '' : ' pub'); d.setAttribute('role', 'region'); d.setAttribute('aria-label', 'Aviso de privacidade');
    d.innerHTML = `<p><b>Privacidade em primeiro lugar.</b> Guardamos no seu aparelho só o essencial (login dos membros e o tema). <b>Sem cookies de publicidade ou rastreamento.</b> <a href="#/privacidade">Saiba mais</a></p><button class="btn sm gold" type="button">Entendi</button>`;
    const sync = () => d.classList.toggle('pub', !location.hash.startsWith('#/painel'));   // no painel o aviso sobe para não cobrir a barra de baixo
    window.addEventListener('hashchange', sync);
    d.querySelector('button').onclick = () => { TJ.store.set('tj-aviso-ok', true); window.removeEventListener('hashchange', sync); d.remove(); };
    document.body.appendChild(d);
  };

  // =====================================================================
  // MAPA DAS DUAS LISTAS (o que cada item virou no site)
  // =====================================================================
  const MAP_SEC = [
    ['API key protegida', 'ok', 'O site só aceita a chave pública (anon/publishable) e se recusa a iniciar se achar a chave secreta. Webhooks do Discord só aparecem para quem gerencia comunicados; os avisos automáticos podem sair pelo servidor.'],
    ['.env nunca exposto', 'ok', 'O site não usa .env nem build; o config.js só tem o endereço do projeto e a chave pública. Confira também o item de segredos no GitHub (lista manual abaixo).'],
    ['Sem senha no código', 'ok', 'Nenhuma senha em nenhum arquivo. Senhas existem só no serviço de login do Supabase, criptografadas.'],
    ['Login real', 'ok', 'Login do Supabase Auth, só por convite, com sessão que expira por inatividade e trava de tentativas.'],
    ['Permissão no servidor', 'ok', 'Todas as permissões são regras RLS e funções no banco (has_perm, trava de hierarquia). Esconder um botão na tela é só estética.'],
    ['Não confiar em IDs da tela', 'ok', 'O banco decide quem pode ver ou mudar cada linha; endereços com ID são validados e a candidatura interna só vale com o ID do próprio usuário logado.'],
    ['Cada pessoa vê só o seu', 'ok', 'Peças por autor, candidaturas próprias sem as notas dos entrevistadores, pedidos LGPD próprios.'],
    ['Banco trancado', 'ok', 'RLS ligado em todas as tabelas (o SQL v5 liga o que faltar), visitante sem permissão de escrever (exceto enviar inscrição) e sem ver a lista de permissões dos cargos.'],
    ['Regras de Supabase/Storage', 'ok', 'Ninguém lista as pastas de arquivos (só a equipe); cada pasta tem limite de tamanho e de tipos de arquivo.'],
    ['Admin protegido', 'ok', 'O painel e a página Segurança só abrem com cargo e permissão; ninguém muda o próprio cargo; só quem tem acesso total cria outro acesso total.'],
    ['Debug desligado', 'ok', 'O site não tem modo de depuração e nenhuma tela mostra detalhes técnicos.'],
    ['Erros sem detalhe', 'ok', 'Toda mensagem de erro é traduzida para um texto simples; o detalhe técnico vai só para o console do navegador.'],
    ['Validar tudo no servidor', 'ok', 'Limites de tamanho (CHECK), gatilhos (consentimento, duplicidade, excesso de inscrições) e funções que conferem a permissão.'],
    ['Sanitizar entradas', 'ok', 'Todo texto é escapado antes de aparecer; links e imagens só aceitam http(s); a política de segurança (CSP) bloqueia scripts de fora.'],
    ['Uploads protegidos', 'ok', 'Só quem tem permissão envia; tipos e tamanhos conferidos na tela e no servidor; SVG e HTML não são aceitos.'],
    ['Sem SQL injection', 'ok', 'O site só faz consultas parametrizadas pelo Supabase; nenhuma função monta SQL com texto digitado.'],
    ['Limite de tentativas', 'ok', 'Login: trava no aparelho + limite do Supabase Auth (lista manual); convites: 8 erros em 15 min; inscrições: anti-repetição e limite por vaga.'],
    ['Git sem segredos vazados', 'manual', 'O site não tem segredos para vazar. Falta ligar o "Secret scanning" no GitHub (lista manual abaixo).'],
    ['Cabeçalhos e CORS corretos', 'parcial', 'Há CSP, referrer e anti-quadro por meta/script. O GitHub Pages não deixa configurar cabeçalhos HTTP (HSTS, X-Frame-Options); para isso seria preciso um proxy como Cloudflare. CORS é do Supabase.'],
    ['Testar como um estranho', 'ok', 'Aba "Testar como visitante": roda dezenas de tentativas sem login e mostra o que passou ou falhou.'],
  ];
  const MAP_LEGAL = [
    ['Política de privacidade', 'ok', 'Página #/privacidade, com rodapé e links nos formulários.'],
    ['Termos de uso', 'ok', 'Página #/termos.'],
    ['Aviso de cookies', 'ok', 'Aviso de armazenamento essencial. Como não há rastreadores, não é preciso banner de consentimento.'],
    ['Política de reembolso', 'na', 'Não se aplica: o site é gratuito e não vende nada.'],
    ['Formulários conforme a LGPD', 'ok', 'Caixa de consentimento obrigatória, finalidade explicada, data do aceite gravada no servidor.'],
    ['Só os dados necessários', 'ok', 'Nome no Roblox, Discord opcional e respostas da vaga. Nada de CPF, e-mail ou documentos.'],
    ['Scripts de rastreamento', 'ok', 'Nenhum. Fontes do Google foram removidas; a CSP impede scripts de outros sites.'],
    ['Acessibilidade', 'ok', 'Link "ir para o conteúdo", foco visível, rótulos em todos os campos, menus com aria, respeito a "reduzir movimento".'],
    ['Alt nas imagens', 'ok', 'Imagens de conteúdo têm texto alternativo; as decorativas são marcadas como decorativas.'],
    ['Contraste corrigido', 'ok', 'Paleta conferida no padrão WCAG AA; o painel recusa cor principal que não dê leitura com texto branco.'],
    ['Navegação por teclado', 'ok', 'Menus, tabelas, janelas e botões funcionam com Tab, Enter, Espaço e Esc.'],
    ['Sem avaliações falsas', 'ok', 'O site não tem depoimentos nem notas; os Termos proíbem.'],
    ['Sem promessas falsas', 'ok', 'Aviso de ficção em todas as páginas e nos Termos; nada garante aprovação ou cargo.'],
    ['Direitos autorais das imagens', 'ok', 'Aviso em todo campo de envio, regra nos Termos e campo de créditos.'],
    ['Dados da empresa', 'ok', 'Projeto sem CNPJ: o responsável e o contato aparecem no rodapé e na Política (você edita em Textos legais).'],
    ['Conformidade com a LGPD', 'ok', 'Baixar meus dados, pedir correção ou exclusão, fila de pedidos para a coordenação e apagamento de inscrições antigas.'],
    ['Riscos legais', 'parcial', 'Textos-modelo e avisos prontos. Eles não substituem a revisão de um profissional; revise antes de divulgar.'],
  ];

  // =====================================================================
  // PAINEL SEGURANÇA
  // =====================================================================
  const mk = { ok: '✓', warn: '!', bad: '✕', gray: 'i' };
  const row = (st, label, detail) => `<div class="secrow"><span class="mk ${st}" aria-hidden="true">${mk[st]}</span><div><b>${esc(label)}</b><span class="sr-only"> (${{ ok: 'ok', warn: 'atenção', bad: 'problema', gray: 'informação' }[st]})</span>${detail ? `<div class="small muted">${detail}</div>` : ''}</div></div>`;

  const MANUAL = [
    ['auth_rate', 'Limites de tentativas do login (Supabase)', 'Supabase › Authentication › Rate Limits: mantenha os limites padrão ou diminua o de "sign-ins". É o limite de verdade do servidor.'],
    ['auth_pw', 'Senhas fortes e senhas vazadas', 'Supabase › Authentication › Sign In / Providers › Email: senha mínima de 8 ou mais. A proteção contra senhas vazadas existe em planos pagos.'],
    ['auth_email', '"Confirm email" desligado', 'Necessário para o login por nome do Roblox funcionar (o e-mail é fictício). Authentication › Sign In / Providers › Email.'],
    ['auth_url', 'Endereço do site cadastrado', 'Authentication › URL Configuration: Site URL = o endereço do seu GitHub Pages.'],
    ['key_rotate', 'Nenhuma chave secreta já foi colocada no site ou no GitHub', 'Se alguma vez a service_role foi colada em um arquivo, gere chave nova em Project Settings › API.'],
    ['gh_secret', 'GitHub: "Secret scanning" e "Push protection" ligados', 'Repositório › Settings › Code security. Avisa se algum segredo for enviado por engano.'],
    ['gh_2fa', 'Verificação em duas etapas no GitHub e no Supabase', 'Proteja as duas contas que controlam o site.'],
    ['gh_team', 'Poucas pessoas com permissão de escrita no repositório', 'Repositório › Settings › Collaborators.'],
    ['backup', 'Backup baixado recentemente', 'Site › Avançado e backup › Baixar backup completo. Guarde em lugar seguro (contém dados pessoais).'],
  ];

  async function tabVerificacao(tc) {
    tc.innerHTML = '<p class="muted">Verificando…</p>';
    const rep = await sb().rpc('security_report');
    const out = [];
    const key = TJ.config().key;
    out.push(row(/^sb_publishable_/.test(key) ? 'ok' : (key.split('.').length === 3 ? 'ok' : 'warn'), 'Chave usada pelo site', /^sb_publishable_/.test(key) ? 'Chave publicável (pública por natureza).' : 'Chave anon (pública por natureza). O site recusa iniciar com chave secreta.'));
    const hosts = [...document.querySelectorAll('script[src],link[rel=stylesheet]')].map((n) => { try { return new URL(n.src || n.href, location.href).host; } catch (e) { return ''; } }).filter((h) => h && h !== location.host);
    const extra = [...new Set(hosts)].filter((h) => h !== 'cdn.jsdelivr.net');
    out.push(row(extra.length ? 'bad' : 'ok', 'Scripts e fontes de terceiros', extra.length ? 'Encontrei: ' + esc(extra.join(', ')) : 'Só a biblioteca do Supabase (jsDelivr, versão fixada). Nenhum rastreador, nenhuma fonte externa.'));
    out.push(row(document.querySelector('meta[http-equiv="Content-Security-Policy"]') ? 'ok' : 'bad', 'Política de segurança de conteúdo (CSP)', 'Bloqueia scripts e conexões não previstos.'));
    out.push(row(location.protocol === 'https:' ? 'ok' : (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'gray' : 'bad'), 'Conexão segura (HTTPS)', location.protocol === 'https:' ? 'O site é servido por HTTPS.' : 'Abra o site pelo endereço https://.'));
    out.push(row(Number(state.site.idle_minutes ?? 30) > 0 ? 'ok' : 'warn', 'Sessão encerra por inatividade', Number(state.site.idle_minutes ?? 30) > 0 ? `Depois de ${Number(state.site.idle_minutes ?? 30)} minutos sem uso.` : 'Desligado. Recomendo 30 minutos.'));
    if (rep.error) {
      out.push(row('warn', 'Relatório do banco', 'Não consegui ler o relatório (' + esc(TJ.friendly(rep.error.message)) + '). Rode o arquivo schema_v5.sql inteiro no Supabase.'));
    } else {
      const r = rep.data || {};
      const noRls = (r.tabelas || []).filter((t) => !t.rls).map((t) => t.nome);
      const zero = (r.tabelas || []).filter((t) => t.rls && !t.politicas).map((t) => t.nome);
      out.push(row(noRls.length ? 'bad' : 'ok', 'RLS ligado em todas as tabelas', noRls.length ? 'SEM RLS: ' + esc(noRls.join(', ')) + '. Rode o schema_v5.sql.' : `${(r.tabelas || []).length} tabelas protegidas.`));
      if (zero.length) out.push(row('gray', 'Tabelas fechadas para todos', esc(zero.join(', ')) + ' — só funções internas acessam (normal).'));
      const fnExtra = (r.visitante_executa || []).filter((f) => !['has_perm', 'is_staff'].includes(f));
      out.push(row(fnExtra.length ? 'warn' : 'ok', 'Funções que um visitante consegue chamar', fnExtra.length ? 'Confira: ' + esc(fnExtra.join(', ')) + '. Se não forem necessárias ao público, tire o acesso.' : 'Só has_perm e is_staff (necessárias às regras de acesso).'));
      const vwExtra = (r.visoes_publicas || []).filter((f) => !['applications_public', 'interviews_public'].includes(f));
      out.push(row(vwExtra.length ? 'warn' : 'ok', 'Visões públicas', vwExtra.length ? 'Além das esperadas: ' + esc(vwExtra.join(', ')) : 'Só aprovados e agenda de entrevistas (dados mínimos).'));
      const bk = (r.buckets || []).filter((b) => !b.limite || !b.tipos);
      out.push(row(bk.length ? 'warn' : 'ok', 'Pastas de arquivos com limite e tipos', bk.length ? 'Sem limite ou sem lista de tipos: ' + esc(bk.map((b) => b.id).join(', ')) : (r.buckets || []).map((b) => esc(b.id) + ' (' + Math.round(b.limite / 1048576) + ' MB)').join(' · ')));
      out.push(row('gray', 'Avisos do Discord pelo servidor', r.pg_net ? 'Ativo: o endereço do webhook não precisa chegar ao navegador de quem só cria processos.' : 'Extensão pg_net inativa: os avisos automáticos saem do navegador e só funcionam para quem pode ler os canais.'));
    }
    const saved = await sb().from('settings').select('value').eq('key', 'security').maybeSingle();
    const checks = (saved.data && saved.data.value && saved.data.value.checks) || {};
    const can = TJ.can('manage_site');
    tc.innerHTML = `<div class="grid g2" style="align-items:start">
      <div class="card"><h3>Verificação automática</h3>${out.join('')}<p style="margin:12px 0 0"><button class="btn sm" id="rerun">Verificar de novo</button></p></div>
      <div class="card"><h3>O que só você consegue conferir</h3><p class="muted small">Estes itens ficam nas configurações do Supabase e do GitHub. Marque quando conferir.${can ? '' : ' (Só quem gerencia o site pode marcar.)'}</p>
        ${MANUAL.map(([k, t, d]) => `<div class="secrow"><label class="chk" style="margin:0;align-items:flex-start"><input type="checkbox" data-k="${k}"${checks[k] ? ' checked' : ''}${can ? '' : ' disabled'}><span><b>${esc(t)}</b><span class="small muted" style="display:block;font-weight:400">${esc(d)}${checks[k] ? ' <b>Conferido em ' + esc(TJ.fmtDate(checks[k])) + '.</b>' : ''}</span></span></label></div>`).join('')}
        <div class="notice" style="margin-top:14px">${TJ.icon('info')}<p><b>Limite do GitHub Pages:</b> ele não permite configurar cabeçalhos HTTP (HSTS, X-Frame-Options). O site compensa com CSP por meta e proteção contra quadros por script. Para ter os cabeçalhos completos, coloque o domínio atrás do Cloudflare (grátis).</p></div></div></div>
      <div class="card" style="margin-top:16px"><h3>Como cada item das duas listas foi atendido</h3><p class="muted small">Segurança (20 itens) e jurídico/acessibilidade (17 itens). Itens repetidos nas duas listas foram tratados uma vez só.</p>
        <details open><summary><b>Lista de segurança</b></summary>${MAP_SEC.map((m, i) => row({ ok: 'ok', parcial: 'warn', manual: 'warn', na: 'gray' }[m[1]], `${i + 1}. ${m[0]}`, esc(m[2]))).join('')}</details>
        <details style="margin-top:10px"><summary><b>Lista jurídica e de acessibilidade</b></summary>${MAP_LEGAL.map((m, i) => row({ ok: 'ok', parcial: 'warn', manual: 'warn', na: 'gray' }[m[1]], `${i + 1}. ${m[0]}`, esc(m[2]))).join('')}</details></div>
      <div id="idle" style="margin-top:16px"></div>`;
    $('#rerun', tc).onclick = () => tabVerificacao(tc);
    tc.querySelectorAll('[data-k]').forEach((cb) => (cb.onchange = async () => {
      checks[cb.dataset.k] = cb.checked ? new Date().toISOString() : null;
      const r = await sb().from('settings').upsert({ key: 'security', value: { checks }, is_public: false });
      TJ.toast(r.error ? r.error.message : 'Anotado.', !!r.error);
      if (!r.error) tabVerificacao(tc);
    }));
    if (can && TJ.siteForm) TJ.siteForm($('#idle', tc), [{ k: 'idle_minutes', label: 'Encerrar a sessão depois de quantos minutos sem uso? (0 = nunca)', type: 'number', help: 'Recomendado: 30. Vale para todos os membros.' }], can);
  }

  // ---------- teste "como um estranho" ----------
  async function tabVisitante(tc) {
    tc.innerHTML = `<div class="card"><h3>Testar como um estranho</h3><p class="muted">Faz o que um visitante sem login poderia tentar: ler dados privados, escrever, chamar funções internas e listar arquivos. Nada é criado ou alterado (as tentativas de escrita são feitas vazias e devem ser barradas).</p><p><button class="btn gold" id="go">Rodar o teste agora</button></p><div id="res"></div></div>`;
    $('#go', tc).onclick = async () => {
      const btn = $('#go', tc); btn.disabled = true; $('#res', tc).innerHTML = '<p class="muted">Testando…</p>';
      const c = TJ.anonClient(), res = [];
      const missing = (e) => e && (/PGRST205|42P01|PGRST202|42883/.test(e.code || '') || /does not exist|schema cache/i.test(e.message || ''));
      const readTest = async (label, q) => { const r = await q; if (missing(r.error)) return; res.push([!(r.data && r.data.length), `Ler ${label}`, r.data && r.data.length ? `${r.data.length} linha(s) visível(is) para um estranho` : 'barrado ou vazio']); };
      const priv = ['invites', 'filings', 'audit_log', 'member_events', 'board_posts', 'templates', 'tasks', 'questions', 'applications', 'discord_channels', 'discord_rules', 'discord_log', 'data_requests', 'invite_attempts'];
      for (const t of priv) await readTest(`"${t}" (privado)`, c.from(t).select('*').limit(1));
      await readTest('"my_applications" (privado)', c.from('my_applications').select('*').limit(1));
      await readTest('casos não públicos', c.from('cases').select('id').eq('is_public', false).limit(1));
      for (const t of ['case_events', 'case_parties', 'evidences']) await readTest(`"${t}" não públicos`, c.from(t).select('id').eq('is_public', false).limit(1));
      await readTest('comunicados não publicados', c.from('announcements').select('id').eq('published', false).limit(1));
      await readTest('audiências internas', c.from('hearings').select('id').eq('is_public', false).limit(1));
      await readTest('páginas não públicas', c.from('pages').select('slug').eq('is_public', false).limit(1));
      await readTest('vagas não públicas', c.from('selection_rounds').select('id').eq('is_public', false).limit(1));
      await readTest('configurações não públicas', c.from('settings').select('key').eq('is_public', false).limit(1));
      await readTest('membros desligados', c.from('profiles').select('id').eq('active', false).limit(1));
      await readTest('biblioteca restrita ou rascunho', c.from('library_docs').select('id').or('published.eq.false,audience.eq.membros').limit(1));
      { const r = await c.from('roles').select('perms').limit(1); if (!missing(r.error)) res.push([!!r.error || !(r.data || []).length, 'Ler as permissões dos cargos', r.error ? 'barrado' : 'visível para estranhos']); }
      const writeTables = ['cases', 'case_events', 'case_parties', 'evidences', 'filings', 'announcements', 'hearings', 'board_posts', 'templates', 'tasks', 'questions', 'pages', 'settings', 'roles', 'profiles', 'invites', 'selection_rounds', 'library_docs', 'data_requests', 'discord_channels', 'discord_rules', 'audit_log'];
      for (const t of writeTables) {
        const r = await c.from(t).insert({});
        if (missing(r.error)) continue;
        const code = (r.error && r.error.code) || '';
        res.push([code === '42501' || r.status === 401 || r.status === 403, `Escrever em "${t}"`, code === '42501' || r.status === 401 || r.status === 403 ? 'barrado' : 'a regra deixou a tentativa chegar ao banco (' + esc(code || 'sem erro') + ')']);
      }
      const rpcs = [['security_report', {}], ['export_my_data', {}], ['purge_old_applications', { p_days: 30 }], ['admin_set_password', { p_user: '00000000-0000-0000-0000-000000000000', p_pass: 'Teste12345' }], ['discord_automate', { p_event: 'teste', p_vars: {} }], ['redeem_invite', { p_code: 'X', p_roblox: 'x' }]];
      for (const [fn, args] of rpcs) { const r = await c.rpc(fn, args); if (missing(r.error)) continue; res.push([!!r.error && r.data == null, `Chamar a função "${fn}"`, r.error ? 'barrado' : 'EXECUTOU para um estranho']); }
      for (const b of ['provas', 'site', 'midia', 'avatares', 'biblioteca']) { const r = await c.storage.from(b).list('', { limit: 1 }); res.push([!(r.data && r.data.length), `Listar arquivos da pasta "${b}"`, r.data && r.data.length ? 'lista visível' : 'barrado ou vazio']); }
      const bad = res.filter((x) => !x[0]);
      $('#res', tc).innerHTML = `<div class="notice" style="margin-bottom:10px;border-left-color:var(--${bad.length ? 'bad' : 'ok'})"><p><b>${res.length - bad.length} de ${res.length} verificações passaram.</b> ${bad.length ? 'Veja abaixo o que precisa de atenção e rode o schema_v5.sql inteiro.' : 'Um estranho não conseguiu ler nem escrever nada privado.'}</p></div>` +
        [...bad, ...res.filter((x) => x[0])].map((x) => row(x[0] ? 'ok' : 'bad', x[1], x[2])).join('');
      btn.disabled = false;
    };
  }

  // ---------- LGPD (pedidos + retenção) ----------
  async function tabLgpd(tc) {
    const retention = TJ.legalInfo().retention;
    tc.innerHTML = `<div id="reqs"></div>${TJ.can('manage_selection') ? `<div class="card" style="margin-top:18px;max-width:680px"><h3>Retenção de inscrições</h3><p class="muted small">Apaga as inscrições de vagas já encerradas ou fechadas que são mais antigas que o prazo da Política de Privacidade. Não dá para desfazer; baixe um backup antes, se precisar.</p><label for="pd">Apagar inscrições com mais de (dias)</label><input id="pd" type="number" min="30" value="${retention}" style="max-width:160px"><p><button class="btn danger" id="pgo">Apagar inscrições antigas</button></p></div>` : ''}
      <div class="notice" style="margin-top:18px">${TJ.icon('info')}<p><b>Como atender:</b> correção ou exclusão de <b>membro</b> — use Membros e cargos; de <b>candidato</b> — exclua a inscrição em Seleção › Triagem. Depois marque o pedido como atendido e escreva a resposta. O prazo de resposta combinado na Política é de 15 dias.</p></div>`;
    await TJ.crud($('#reqs', tc), {
      id: 'lgpd-req', table: 'data_requests', order: ['created_at', false], noCreate: true, canWrite: TJ.can('manage_users'), canDelete: false,
      filters: [{ k: 'status', label: 'Situação', opts: [['aberta', 'Aberta'], ['atendida', 'Atendida'], ['recusada', 'Recusada']] }],
      fields: [
        { k: 'requester_name', label: 'Quem pediu', ro: true }, { k: 'kind', label: 'Tipo', ro: true, type: 'select', opts: [['informacao', 'Informação / cópia dos dados'], ['correcao', 'Correção'], ['exclusao', 'Exclusão']] },
        { k: 'note', label: 'Mensagem', type: 'textarea', rows: 3, ro: true },
        { k: 'status', label: 'Situação', type: 'select', opts: [['aberta', 'Aberta'], ['atendida', 'Atendida'], ['recusada', 'Recusada']] },
        { k: 'response', label: 'Resposta ao titular', type: 'textarea', rows: 4, help: 'Quem pediu vê esta resposta em Minha conta.' },
      ],
      beforeSave: (p) => { p.handled_by = state.U.id; p.handled_at = new Date().toISOString(); },
      cols: [{ label: 'Quando', fmt: F.dt('created_at') }, { label: 'Quem', k: 'requester_name' }, { label: 'Tipo', fmt: (r) => esc({ informacao: 'Informação', correcao: 'Correção', exclusao: 'Exclusão' }[r.kind] || r.kind) }, { label: 'Situação', fmt: (r) => `<span class="tag ${{ aberta: 'warn', atendida: 'ok', recusada: 'gray' }[r.status]}">${esc(r.status)}</span>` }, { label: 'Mensagem', fmt: F.cut('note', 60) }],
    });
    const go = $('#pgo', tc);
    if (go) go.onclick = async () => {
      const d = Number($('#pd', tc).value);
      if (!(d >= 30)) return TJ.toast('Use 30 dias ou mais.', true);
      if (!confirm(`Apagar para sempre as inscrições de vagas encerradas com mais de ${d} dias?`)) return;
      const r = await sb().rpc('purge_old_applications', { p_days: d });
      TJ.toast(r.error ? r.error.message : `${r.data} inscrição(ões) apagada(s).`, !!r.error);
    };
  }

  // ---------- textos legais ----------
  async function tabTextos(tc) {
    const can = TJ.can('manage_site'), g = state.site.legal || {};
    const set = (k) => (p, v) => (p.legal = Object.assign({}, p.legal || state.site.legal || {}, { [k]: v }));
    TJ.siteForm(tc, [
      { k: 'lg_controller', label: 'Quem é o responsável pelos dados (aparece na Política e no rodapé)', get: () => g.controller, set: set('controller'), ph: 'Ex.: Coordenação do Tribunal de Justiça de Ilha Bela', help: 'Use o nome do projeto ou da coordenação, não precisa ser o seu nome real.' },
      { k: 'lg_contact', label: 'Como falar com a coordenação sobre dados', get: () => g.contact, set: set('contact'), ph: 'Ex.: pelo canal #coordenacao do Discord', help: 'Aparece depois de "Fale conosco…".' },
      { k: 'lg_retention', label: 'Guardar inscrições por quantos dias depois da vaga? (mínimo 30)', type: 'number', get: () => g.retention_days, set: set('retention_days') },
      { k: 'lg_credits', label: 'Créditos de imagens e materiais (opcional)', type: 'textarea', rows: 2, get: () => g.credits, set: set('credits'), help: 'Cite a fonte de imagens que não são suas.' },
      { k: 'lg_updated', label: 'Data da última atualização dos textos', get: () => g.updated, set: set('updated'), ph: VERSION_DATE },
      { k: 'lg_privacy', label: 'Texto da Política de Privacidade (vazio = texto padrão)', type: 'textarea', rows: 12, get: () => g.privacy_text, set: set('privacy_text') },
      { k: 'lg_terms', label: 'Texto dos Termos de uso (vazio = texto padrão)', type: 'textarea', rows: 12, get: () => g.terms_text, set: set('terms_text') },
    ], can, '<p class="muted small">Os textos padrão já estão prontos e usam os dados acima. Eles são modelos: revise antes de divulgar e adapte ao seu projeto. Não substituem orientação jurídica.</p>');
    tc.querySelector('#sf').insertAdjacentHTML('beforeend', `<p><button type="button" class="btn" id="seedp">Copiar texto padrão da Política</button> <button type="button" class="btn" id="seedt">Copiar texto padrão dos Termos</button></p>`);
    $('#seedp', tc).onclick = () => TJ.copy(TJ.legalDefaults().privacy, 'Texto padrão copiado. Cole no campo acima para editar.');
    $('#seedt', tc).onclick = () => TJ.copy(TJ.legalDefaults().terms, 'Texto padrão copiado. Cole no campo acima para editar.');
  }

  P.seguranca = async (el, [tab]) => {
    const c = TJ.can;
    const T = [['verificacao', 'Verificação', c('manage_site') || c('view_audit')], ['visitante', 'Testar como visitante', c('manage_site')], ['historico', 'Histórico', c('view_audit')], ['lgpd', 'Pedidos LGPD', c('manage_users')], ['textos', 'Textos legais', c('manage_site')]].filter((t) => t[2]).map((t) => [t[0], t[1]]);
    if (!T.length) { el.innerHTML = '<div class="card">Você não tem acesso a esta área.</div>'; return; }
    const cur = T.some((t) => t[0] === tab) ? tab : T[0][0];
    el.innerHTML = H.head('Segurança e privacidade', 'Verificações do site, histórico de alterações, pedidos de dados (LGPD) e textos legais.') + H.tabs('seguranca', T, cur) + '<div id="tc"></div>';
    const tc = $('#tc', el);
    ({ verificacao: tabVerificacao, visitante: tabVisitante, historico: (x) => P.auditoria(x, [], true), lgpd: tabLgpd, textos: tabTextos }[cur])(tc);
  };

  // =====================================================================
  // MINHA CONTA: meus dados (LGPD) e sessões
  // =====================================================================
  TJ.lgpdCard = async function (box) {
    const { data: mine } = await sb().from('data_requests').select('*').eq('user_id', state.U.id).order('created_at', { ascending: false }).limit(10);
    const KIND = { informacao: 'Informação', correcao: 'Correção', exclusao: 'Exclusão' };
    box.innerHTML = `<h3>Meus dados e privacidade</h3><p class="muted small">Você pode baixar uma cópia dos seus dados e pedir correção ou exclusão. Veja a <a href="#/privacidade">Política de Privacidade</a>.</p>
      <p class="row"><button class="btn sm" id="dl">${TJ.icon('download')} Baixar meus dados</button><button class="btn sm" id="rq">Pedir correção ou exclusão</button><button class="btn sm" id="gl">Sair de todos os aparelhos</button></p>
      ${(mine || []).length ? `<h4 style="margin-top:14px">Meus pedidos</h4>${mine.map((r) => `<div class="item"><span class="tag ${{ aberta: 'warn', atendida: 'ok', recusada: 'gray' }[r.status]}">${esc(r.status)}</span> <b>${esc(KIND[r.kind] || r.kind)}</b> <span class="small muted">${esc(TJ.fmtDate(r.created_at))}</span>${r.response ? `<div class="small">Resposta: ${esc(r.response)}</div>` : ''}</div>`).join('')}` : ''}`;
    $('#dl', box).onclick = async () => {
      const r = await sb().rpc('export_my_data');
      if (r.error) return TJ.toast(r.error.message, true);
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' }));
      a.download = 'meus-dados-tj.json'; document.body.appendChild(a); a.click(); a.remove(); TJ.toast('Arquivo baixado.');
    };
    $('#gl', box).onclick = async () => {
      if (!confirm('Encerrar a sessão em TODOS os aparelhos, inclusive este?')) return;
      await sb().auth.signOut({ scope: 'global' }); state.U = state.P = null; location.hash = '#/entrar'; TJ.route();
    };
    $('#rq', box).onclick = () => TJ.dlg(`<h3>Pedido sobre os meus dados</h3><label for="rk">O que você precisa?</label><select id="rk"><option value="informacao">Saber que dados vocês têm</option><option value="correcao">Corrigir um dado</option><option value="exclusao">Excluir meus dados</option></select><label for="rn">Explique (até 2000 caracteres)</label><textarea id="rn" maxlength="2000" rows="5"></textarea><p class="small muted">Excluir a conta tira o seu acesso. Alguns registros mínimos (como o histórico no Tribunal) podem ser mantidos por interesse legítimo e para evitar abusos.</p><p class="row"><button class="btn gold" id="rs">Enviar pedido</button><button class="btn" data-close>Cancelar</button></p>`, (d) => {
      d.querySelector('#rs').onclick = async () => {
        const ins = await sb().from('data_requests').insert({ user_id: state.U.id, requester_name: state.P.roblox_name, kind: d.querySelector('#rk').value, note: d.querySelector('#rn').value.trim().slice(0, 2000) || null });
        if (ins.error) return TJ.toast(ins.error.message, true);
        d.close(); TJ.toast('Pedido enviado. A resposta aparece aqui.'); TJ.lgpdCard(box);
      };
    });
  };
})();
