/* ============================================================
   view-calendar.js — film dates and post dates on one grid
   ============================================================ */

const CalState = { month: null };   /* 'YYYY-MM' */

function renderCalendar(view) {
  const today = todayISO();
  if (!CalState.month) CalState.month = today.slice(0, 7);

  const year = Number(CalState.month.slice(0, 4));
  const monthIdx = Number(CalState.month.slice(5, 7)) - 1;
  const first = new Date(year, monthIdx, 1);
  const monthLabel = first.toLocaleDateString('en-US', { month: 'long' });

  function shift(n) {
    const d = new Date(year, monthIdx + n, 1);
    CalState.month = toISO(d).slice(0, 7);
    App.render();
  }

  view.appendChild(el('div', { class: 'page-head' }, [
    el('div', {}, [
      el('div', { class: 'kicker kicker--red', text: 'Schedule' }),
      el('h1', { text: 'Calendar' }),
      el('p', { text: 'Film dates and post dates on the same grid. Solid marks are done; dashed marks slipped past their date.' })
    ]),
    el('div', { class: 'page-head__right' }, [
      el('button', { class: 'btn btn--ghost btn--sm', text: '‹ Prev', onclick: function () { shift(-1); } }),
      el('button', { class: 'btn btn--ghost btn--sm', text: 'Today', onclick: function () { CalState.month = todayISO().slice(0, 7); App.render(); } }),
      el('button', { class: 'btn btn--ghost btn--sm', text: 'Next ›', onclick: function () { shift(1); } })
    ])
  ]));

  view.appendChild(el('div', { class: 'cal-head' }, [
    el('div', { class: 'cal-title', html: esc(monthLabel) + ' <span>' + year + '</span>' }),
    el('div', { class: 'cal-legend' }, [
      el('span', { class: 'legend-item' }, [ el('span', { class: 'legend-swatch sw-film' }), document.createTextNode('Film date') ]),
      el('span', { class: 'legend-item' }, [ el('span', { class: 'legend-swatch sw-post' }), document.createTextNode('Post date') ]),
      el('span', { class: 'legend-item' }, [ el('span', { class: 'legend-swatch sw-done' }), document.createTextNode('Completed') ])
    ])
  ]));

  /* ---------- events by day ---------- */
  const byDay = {};
  function push(iso, ev) { (byDay[iso] || (byDay[iso] = [])).push(ev); }

  Store.items().forEach(function (it) {
    if (it.filmDate) {
      const done = isAtLeast(it, 'filmed');
      push(it.filmDate, {
        item: it, kind: 'film',
        done: done && filmOnTime(it),
        miss: filmMissed(it, today),
        label: 'Film',
        who: Store.personName(it.filmerId) || 'Unassigned'
      });
    }
    if (it.postDate) {
      push(it.postDate, {
        item: it, kind: 'post',
        done: it.status === 'posted' && postOnTime(it),
        miss: postMissed(it, today),
        label: 'Post',
        who: STATUS_LABEL[it.status]
      });
    }
  });

  /* ---------- grid ---------- */
  const cal = el('div', { class: 'cal' });
  const dow = el('div', { class: 'cal__dow' });
  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(function (d) { dow.appendChild(el('div', { text: d })); });
  cal.appendChild(dow);

  const grid = el('div', { class: 'cal__grid' });
  const lead = (first.getDay() + 6) % 7;
  const startISO = addDays(toISO(first), -lead);
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const cells = Math.ceil((lead + daysInMonth) / 7) * 7;

  for (let i = 0; i < cells; i++) {
    const iso = addDays(startISO, i);
    const inMonth = iso.slice(0, 7) === CalState.month;
    const cell = el('div', {
      class: 'cal-day' + (inMonth ? '' : ' is-out') + (iso === today ? ' is-today' : '')
    }, [
      el('div', { class: 'cal-day__n', text: String(parseISO(iso).getDate()) })
    ]);

    (byDay[iso] || []).sort(function (a, b) { return a.kind === b.kind ? 0 : (a.kind === 'film' ? -1 : 1); })
      .forEach(function (ev) {
        cell.appendChild(el('button', {
          class: 'cal-ev' + (ev.kind === 'post' ? ' cal-ev--post' : '') + (ev.done ? ' cal-ev--done' : '') + (ev.miss && !ev.done ? ' cal-ev--miss' : ''),
          title: ev.label.toUpperCase() + ' · ' + ev.item.title + ' · ' + ev.who,
          onclick: function () { openItemDetail(ev.item.id); }
        }, [
          el('b', { text: ev.label + (ev.done ? ' ✓' : '') }),
          document.createTextNode(ev.item.title)
        ]));
      });

    grid.appendChild(cell);
  }
  cal.appendChild(grid);
  view.appendChild(cal);

  /* ---------- month summary ---------- */
  const monthItems = Store.items().filter(function (i) { return i.postDate && i.postDate.slice(0, 7) === CalState.month; });
  const posted = monthItems.filter(function (i) { return i.status === 'posted'; });
  const onTime = posted.filter(postOnTime);
  view.appendChild(el('div', { class: 'section-rule' }, [
    el('h2', { text: monthLabel + ' at a glance' }),
    el('span', { class: 'spacer' }),
    el('span', { text: monthItems.length + ' planned posts · ' + posted.length + ' out · ' + onTime.length + ' on time' })
  ]));
}
