/* ============================================================
   view-log.js — the content log
   ============================================================ */

const LogFilter = { status: 'all', person: 'all', q: '' };

function itemFlags(it, today) {
  const flags = [];
  if (it.status === 'posted') {
    flags.push(postOnTime(it)
      ? { cls: 'flag--ontime', text: 'Posted on time' }
      : { cls: 'flag--late', text: 'Posted late' });
  } else {
    if (filmDueSoon(it, today)) flags.push({ cls: 'flag--soon', text: 'Film ' + relDay(it.filmDate) });
    else if (filmMissed(it, today) && !isAtLeast(it, 'filmed')) flags.push({ cls: 'flag--late', text: 'Film date passed' });
    if (postDueSoon(it, today)) flags.push({ cls: 'flag--soon', text: 'Post ' + relDay(it.postDate) });
    else if (postMissed(it, today)) flags.push({ cls: 'flag--late', text: 'Post date passed' });
  }
  return flags;
}

function renderLog(view) {
  const today = todayISO();

  view.appendChild(el('div', { class: 'page-head' }, [
    el('div', {}, [
      el('div', { class: 'kicker kicker--red', text: 'Pipeline' }),
      el('h1', { text: 'Content Log' }),
      el('p', { text: 'Every item from first idea to posted. Move the status as work lands — dates decide whether it counted.' })
    ]),
    el('div', { class: 'page-head__right' }, [
      el('button', { class: 'btn btn--red', text: '+ New Item', onclick: function () { openItemForm(null); } })
    ])
  ]));

  /* ---------- filters ---------- */
  const chips = el('div', { class: 'chips' });
  ['all'].concat(STATUSES).forEach(function (s) {
    chips.appendChild(el('button', {
      class: 'chip' + (LogFilter.status === s ? ' is-on chip--red' : ''),
      text: s === 'all' ? 'All' : STATUS_LABEL[s],
      onclick: function () { LogFilter.status = s; App.render(); }
    }));
  });

  const personSel = el('select');
  personSel.appendChild(el('option', { value: 'all', text: 'Everyone' }));
  Store.activePeople().forEach(function (p) {
    const o = el('option', { value: p.id, text: p.name });
    if (LogFilter.person === p.id) o.selected = true;
    personSel.appendChild(o);
  });
  personSel.addEventListener('change', function () { LogFilter.person = personSel.value; App.render(); });

  const search = el('input', { type: 'search', placeholder: 'Search titles, hooks, notes…', value: LogFilter.q });
  search.addEventListener('input', function () {
    LogFilter.q = search.value;
    renderRows();
  });

  view.appendChild(el('div', { class: 'filters' }, [
    el('div', { class: 'field' }, [ el('label', { text: 'Status' }), chips ]),
    el('div', { class: 'field' }, [ el('label', { text: 'Assigned person' }), personSel ]),
    el('div', { class: 'field filters__search' }, [ el('label', { text: 'Search' }), search ])
  ]));

  const count = el('div', { class: 'hint', style: 'margin-top:14px' });
  view.appendChild(count);
  const list = el('div', { class: 'log-list' });
  view.appendChild(list);

  function matches(it) {
    if (LogFilter.status !== 'all' && it.status !== LogFilter.status) return false;
    if (LogFilter.person !== 'all' && itemPeopleIds(it).indexOf(LogFilter.person) === -1 && it.editorId !== LogFilter.person) return false;
    const q = LogFilter.q.trim().toLowerCase();
    if (q) {
      const hay = (it.title + ' ' + it.hook + ' ' + it.script).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }

  function renderRows() {
    list.innerHTML = '';
    const rows = Store.items().filter(matches).sort(function (a, b) {
      const ap = a.status === 'posted', bp = b.status === 'posted';
      if (ap !== bp) return ap ? 1 : -1;                    /* live work first */
      const ad = a.postDate || a.filmDate || '9999';
      const bd = b.postDate || b.filmDate || '9999';
      return ap ? bd.localeCompare(ad) : ad.localeCompare(bd);
    });

    count.textContent = rows.length + ' of ' + Store.items().length + ' items';

    if (!rows.length) {
      list.appendChild(el('div', { class: 'empty' }, [
        el('strong', { text: 'Nothing here' }),
        el('span', { text: 'No item matches these filters. Clear them, or add a new item.' })
      ]));
      return;
    }

    rows.forEach(function (it) {
      const flags = itemFlags(it, today);

      const tags = el('div', { class: 'item__tags' });
      flags.forEach(function (f) { tags.appendChild(el('span', { class: 'flag ' + f.cls, text: f.text })); });
      tags.appendChild(el('span', { class: 'tag', html: 'Film <b>' + esc(fmtDate(it.filmDate)) + '</b>' }));
      tags.appendChild(el('span', { class: 'tag', html: 'Post <b>' + esc(fmtDate(it.postDate)) + '</b>' }));

      const main = el('div', { class: 'item__main' }, [
        el('div', { class: 'item__title', text: it.title, onclick: function () { openItemDetail(it.id); } }),
        it.hook ? el('div', { class: 'item__hook', text: it.hook }) : null,
        tags
      ]);

      const performers = it.performerIds.map(function (p) { return Store.personName(p); }).filter(Boolean).join(', ');
      const people = el('div', { class: 'item__people' }, [
        el('div', { class: 'role-line' }, [
          el('span', { class: 'role', text: 'Filmer' }),
          el('span', { class: 'who' + (it.filmerId ? '' : ' unset'), text: Store.personName(it.filmerId) || 'Unassigned' })
        ]),
        el('div', { class: 'role-line' }, [
          el('span', { class: 'role', text: 'On screen' }),
          el('span', { class: 'who' + (performers ? '' : ' unset'), text: performers || 'Unassigned' })
        ]),
        el('div', { class: 'role-line' }, [
          el('span', { class: 'role', text: 'Editor' }),
          el('span', { class: 'who', text: Store.personName(it.editorId) || '—' })
        ])
      ]);

      const pipeline = el('div', { class: 'pipeline' });
      STATUSES.forEach(function (s, i) {
        const done = statusIndex(it.status) >= i;
        pipeline.appendChild(el('div', {
          class: 'pipeline__step' + (done ? ' is-done' : '') + (i === STATUSES.length - 1 ? ' is-last' : ''),
          title: STATUS_LABEL[s]
        }));
      });

      const sel = statusSelect(it.status);
      sel.addEventListener('change', function (e) {
        const r = sel.getBoundingClientRect();
        setStatus(it.id, sel.value, { x: r.left + r.width / 2, y: r.top });
        e.stopPropagation();
      });

      const nextIdx = statusIndex(it.status) + 1;
      const ctrlRow = el('div', { class: 'item__ctrl-row' }, [
        nextIdx < STATUSES.length ? el('button', {
          class: 'btn btn--sm ' + (STATUSES[nextIdx] === 'posted' ? 'btn--red' : 'btn--ghost'),
          text: '→ ' + STATUS_LABEL[STATUSES[nextIdx]],
          onclick: function (e) { setStatus(it.id, STATUSES[nextIdx], { x: e.clientX, y: e.clientY }); }
        }) : el('span', { class: 'flag flag--ontime', text: 'Complete' }),
        el('button', { class: 'btn btn--sm btn--ghost', text: 'Edit', onclick: function () { openItemForm(it.id); } })
      ]);

      const ctrl = el('div', { class: 'item__ctrl' }, [pipeline, sel, ctrlRow]);

      list.appendChild(el('div', { class: 'item', 'data-status': it.status }, [
        el('div', { class: 'item__bar' }), main, people, ctrl
      ]));
    });
  }

  renderRows();
}
