/* ============================================================
   app.js — router, chrome wiring, boot
   ============================================================ */

const ROUTES = {
  dashboard: renderDashboard,
  log: renderLog,
  ideas: renderIdeas,
  calendar: renderCalendar,
  team: renderTeam
};

const App = {
  route: 'dashboard',

  currentRoute: function () {
    const r = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
    return ROUTES[r] ? r : 'dashboard';
  },

  render: function () {
    this.route = this.currentRoute();
    const view = document.getElementById('view');
    view.innerHTML = '';
    ROUTES[this.route](view);

    $$('#nav a').forEach(function (a) {
      a.classList.toggle('is-active', a.getAttribute('data-route') === App.route);
    });

    const items = Store.items();
    document.getElementById('footer-count').textContent =
      items.length + ' items · ' + Store.ideas().length + ' ideas · ' + Store.activePeople().length + ' on roster';
  },

  go: function (route) {
    if (location.hash === '#/' + route) this.render();
    else location.hash = '#/' + route;
  }
};

/* ============================================================
   IMPORT / EXPORT
   ============================================================ */
function exportJSON() {
  const blob = new Blob([JSON.stringify(Store.data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: 'matroom-content-' + todayISO() + '.json' });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  FX.toast('Exported', 'Backup file saved.');
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = function () {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed || !parsed.people || !parsed.items) throw new Error('Unrecognised file');
      Store.data = parsed;
      Store.normalize();
      Store.save();
      App.render();
      FX.toast('Imported', parsed.items.length + ' items loaded.');
    } catch (e) {
      FX.toast('Could not import', 'That file is not a Content Desk backup.', 'soft');
    }
  };
  reader.readAsText(file);
}

/* ============================================================
   BOOT
   ============================================================ */
(function boot() {
  Store.load();

  document.getElementById('masthead-date').textContent =
    new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  window.addEventListener('hashchange', function () { App.render(); window.scrollTo(0, 0); });

  document.getElementById('btn-new').addEventListener('click', function () { openItemForm(null); });

  /* modal dismissal */
  document.getElementById('modal').addEventListener('click', function (e) {
    if (e.target.hasAttribute('data-close')) Modal.close();
  });
  document.getElementById('milestone-close').addEventListener('click', FX.closeMilestone);
  document.getElementById('milestone').addEventListener('click', function (e) {
    if (e.target.id === 'milestone') FX.closeMilestone();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!document.getElementById('milestone').hidden) FX.closeMilestone();
    else if (!document.getElementById('modal').hidden) Modal.close();
  });

  /* mobile nav */
  const nav = document.getElementById('nav');
  document.getElementById('nav-toggle').addEventListener('click', function () { nav.classList.toggle('is-open'); });
  nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') nav.classList.remove('is-open'); });

  /* footer utilities */
  document.getElementById('btn-export').addEventListener('click', exportJSON);
  const fileInput = document.getElementById('file-input');
  document.getElementById('btn-import').addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () {
    if (fileInput.files && fileInput.files[0]) importJSON(fileInput.files[0]);
    fileInput.value = '';
  });
  document.getElementById('btn-reset').addEventListener('click', function () {
    if (confirm('Reset everything back to the sample data? Your current items will be lost.')) {
      Store.reset();
      App.render();
      FX.toast('Reset', 'Sample data restored.', 'soft');
    }
  });

  App.render();
})();
