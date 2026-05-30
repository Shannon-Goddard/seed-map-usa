(function() {
  const footer = document.getElementById('site-footer');
  if (!footer) return;
  footer.innerHTML = `
    <span>&copy; 2026 Loyal9 LLC &middot;</span>
    <span>
      <a href="privacy.html">Privacy</a> &middot;
      <a href="terms.html">Terms</a> &middot;
      <a href="disclaimer.html">Disclaimer</a>
    </span>
    <span>&middot;
      <a href="https://poweredby.ci" target="_blank" title="Powered by CI" style="display:inline-block;vertical-align:middle;">
        <img class="ci-badge" src="assets/img/ci-badge-color.svg" alt="Powered by CI">
      </a>
    </span>
  `;
})();
