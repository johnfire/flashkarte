// Apply the saved/system theme before paint to avoid a flash.
// Kept as an external same-origin file (not inline) so it is allowed by the
// production CSP `script-src 'self'` — an inline script would be blocked there,
// which previously meant the saved theme was never restored on the live site.
(function () {
  try {
    var t = localStorage.getItem("theme");
    var dark = t
      ? t === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
