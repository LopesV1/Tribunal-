/* Inicialização do site (arquivo separado para o site não precisar de script dentro do HTML) */
(function () {
  // anti-clickjacking: se alguém colocar o site dentro de outra página, ele sai do quadro (o GitHub Pages não deixa mandar o cabeçalho X-Frame-Options)
  if (window.top !== window.self) {
    try { window.top.location.replace(window.self.location.href); }
    catch (e) { document.documentElement.style.display = 'none'; }
    return;
  }
  if (window.TJ && typeof window.TJ.start === 'function') window.TJ.start();
})();
