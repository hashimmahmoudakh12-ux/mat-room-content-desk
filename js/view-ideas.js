/* ============================================================
   view-ideas.js — the ideas bank
   ============================================================ */

function renderIdeas(view) {
  view.appendChild(el('div', { class: 'page-head' }, [
    el('div', {}, [
      el('div', { class: 'kicker kicker--red', text: 'Unscheduled' }),
      el('h1', { text: 'Ideas Bank' }),
      el('p', { text: 'No dates, no owners, no pressure. When one is ready, promote it and it becomes a dated item on the log.' })
    ]),
    el('div', { class: 'page-head__right' }, [
      el('span', { class: 'hint', text: Store.ideas().length + ' banked' })
    ])
  ]));

  /* ---------- quick add strip ---------- */
  const titleIn = el('input', { type: 'text', placeholder: 'Cradle setups nobody teaches' });
  const hookIn = el('input', { type: 'text', placeholder: 'Head and knee. That is the whole sport.' });

  function add() {
    const t = titleIn.value.trim();
    if (!t) { titleIn.focus(); return; }
    Store.addIdea({ title: t, hook: hookIn.value.trim() });
    FX.toast('Banked', t);
    App.render();
  }
  titleIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') add(); });
  hookIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') add(); });

  view.appendChild(el('div', { class: 'quick-add' }, [
    el('div', { class: 'field' }, [ el('label', { text: 'Title' }), titleIn ]),
    el('div', { class: 'field' }, [ el('label', { text: 'Hook (optional)' }), hookIn ]),
    el('button', { class: 'btn btn--red', text: 'Bank it', onclick: add })
  ]));

  /* ---------- grid ---------- */
  const ideas = Store.ideas();
  if (!ideas.length) {
    view.appendChild(el('div', { class: 'empty', style: 'margin-top:26px' }, [
      el('strong', { text: 'The bank is empty' }),
      el('span', { text: 'Drop half-formed concepts here. The good ones get dates later.' })
    ]));
    return;
  }

  const grid = el('div', { class: 'ideas-grid', style: 'margin-top:26px' });
  ideas.forEach(function (idea, i) {
    grid.appendChild(el('div', { class: 'idea' }, [
      el('div', { class: 'idea__num', text: String(i + 1).padStart(2, '0') + ' · ' + fmtDate(idea.createdAt) }),
      el('div', { class: 'idea__title', text: idea.title }),
      idea.hook ? el('div', { class: 'idea__hook', text: idea.hook }) : null,
      idea.notes ? el('div', { class: 'idea__notes', text: idea.notes }) : null,
      el('div', { class: 'idea__foot' }, [
        el('button', { class: 'btn btn--sm btn--red', text: 'Promote', onclick: function () { openPromoteForm(idea.id); } }),
        el('button', { class: 'btn btn--sm btn--ghost', text: 'Edit', onclick: function () { openIdeaForm(idea.id); } })
      ])
    ]));
  });
  view.appendChild(grid);
}
