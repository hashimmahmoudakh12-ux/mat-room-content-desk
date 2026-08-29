/* ============================================================
   view-dashboard.js — home: team streak, warnings, people
   ============================================================ */

function nextMilestone(n) {
  if (n < 1) return 1;
  if (n < 4) return 4;
  if (n < 10) return 10;
  return Math.ceil((n + 1) / 10) * 10;
}

function renderDashboard(view) {
  const today = todayISO();
  const team = Streaks.team(today);
  const copy = StreakCopy.team(team);

  /* ---------- page head ---------- */
  const head = el('div', { class: 'page-head' }, [
    el('div', {}, [
      el('div', { class: 'kicker kicker--red', text: Store.data.settings.teamName + ' · Consistency Desk' }),
      el('h1', { text: 'The Streak' }),
      el('p', { text: 'A week counts when every post planned inside it goes out on or before its date. Weeks with nothing planned sit neutral.' })
    ]),
    el('div', { class: 'page-head__right' }, [
      el('button', { class: 'btn btn--ghost', text: 'Ideas Bank', onclick: function () { location.hash = '#/ideas'; } }),
      el('button', { class: 'btn', text: 'Open Log', onclick: function () { location.hash = '#/log'; } })
    ])
  ]);
  view.appendChild(head);

  /* ---------- streak block ---------- */
  const target = nextMilestone(team.current);
  const pct = Math.max(4, Math.min(100, Math.round((team.current / target) * 100)));

  const main = el('div', { class: 'streak-main' }, [
    el('div', { class: 'streak-main__top' }, [
      el('span', { class: 'kicker', text: 'Team streak — consecutive clean weeks' }),
      team.live ? el('span', { class: 'flag flag--soon flag--dot', text: 'Week in progress' }) : null
    ]),
    el('div', { class: 'streak-figure' }, [
      el('div', { class: 'streak-count num' + (team.current >= 3 ? ' is-hot' : ''), text: String(team.current) }),
      el('div', { class: 'streak-unit' }, [
        el('strong', { text: team.current === 1 ? 'Week' : 'Weeks' }),
        el('span', { text: 'clean in a row' })
      ])
    ]),
    flameRow(team.current, 10),
    el('p', { class: 'streak-msg', html: '<b>' + esc(copy.head) + '</b> ' + esc(copy.body) }),
    el('div', { class: 'streak-progress' }, [
      el('div', { class: 'streak-progress__bar' }, [
        el('div', { class: 'streak-progress__fill', style: 'width:' + pct + '%' })
      ]),
      el('div', { class: 'streak-progress__labels' }, [
        el('span', { text: team.current + ' of ' + target }),
        el('span', { text: target === 1 ? 'Next: first clean week' : (target === 4 ? 'Next: one month' : 'Next: ' + target + ' weeks') })
      ])
    ])
  ]);

  /* side stats */
  const weekKey = weekStart(today);
  const weekItems = Store.items().filter(function (i) { return i.postDate && weekStart(i.postDate) === weekKey; });
  const weekDone = weekItems.filter(function (i) { return i.status === 'posted'; }).length;
  const inFlight = Store.items().filter(function (i) { return i.status !== 'posted' && (i.filmDate || i.postDate); }).length;

  const side = el('div', { class: 'streak-side' }, [
    el('div', { class: 'streak-stat' }, [
      el('span', { class: 'streak-stat__label', text: 'Best streak ever' }),
      el('span', { class: 'streak-stat__val num', html: team.best + '<small>wks</small>' })
    ]),
    el('div', { class: 'streak-stat' }, [
      el('span', { class: 'streak-stat__label', text: 'Posts due this week' }),
      el('span', { class: 'streak-stat__val num', html: weekDone + '<small>/ ' + weekItems.length + '</small>' })
    ]),
    el('div', { class: 'streak-stat' }, [
      el('span', { class: 'streak-stat__label', text: 'In the pipeline' }),
      el('span', { class: 'streak-stat__val num', text: String(inFlight) })
    ])
  ]);

  view.appendChild(el('div', { class: 'streak-block' }, [main, side]));

  /* ---------- two column body ---------- */
  const left = el('div');
  const right = el('div');

  /* attention */
  const rows = Streaks.attention(today);
  left.appendChild(el('div', { class: 'section-rule' }, [
    el('h2', { text: 'On the clock' }),
    el('span', { class: 'spacer' }),
    el('span', { text: rows.length ? rows.length + ' item' + (rows.length === 1 ? '' : 's') + ' need a nudge' : 'Nothing overdue' })
  ]));

  if (!rows.length) {
    left.appendChild(el('div', { class: 'empty' }, [
      el('strong', { text: 'Board is clear' }),
      el('span', { text: 'No deadline inside 24 hours, nothing past its date. Good week to bank an idea.' })
    ]));
  } else {
    const list = el('div', { class: 'alert-list' });
    rows.slice(0, 8).forEach(function (r) {
      const kindLabel = r.kind === 'film' ? 'Film' : 'Post';
      const when = r.tone === 'soon'
        ? kindLabel + ' date ' + relDay(r.date) + ' (' + fmtDate(r.date) + ')'
        : kindLabel + ' date passed ' + relDay(r.date);
      list.appendChild(el('div', { class: 'alert' + (r.tone === 'late' ? ' alert--late' : '') }, [
        el('div', { class: 'alert__bar' }),
        el('div', { class: 'alert__body' }, [
          el('div', { class: 'alert__title', text: r.item.title }),
          el('div', { class: 'alert__meta', html: '<b>' + esc(when) + '</b> · ' + esc(r.who || 'Unassigned') + ' · ' + esc(STATUS_LABEL[r.item.status]) })
        ]),
        el('div', { class: 'alert__act' }, [
          el('button', {
            class: 'btn btn--sm btn--ghost', text: 'Open',
            onclick: function () { openItemDetail(r.item.id); }
          })
        ])
      ]));
    });
    left.appendChild(list);
  }

  /* this week's slate */
  left.appendChild(el('div', { class: 'section-rule' }, [
    el('h2', { text: 'This week' }),
    el('span', { class: 'spacer' }),
    el('span', { text: fmtDate(weekKey) + ' – ' + fmtDate(addDays(weekKey, 6)) })
  ]));
  if (!weekItems.length) {
    left.appendChild(el('div', { class: 'empty' }, [
      el('strong', { text: 'No posts planned' }),
      el('span', { text: 'A week with nothing scheduled will not break the streak — but it will not build it either.' })
    ]));
  } else {
    const list = el('div', { class: 'alert-list' });
    weekItems.sort(function (a, b) { return a.postDate.localeCompare(b.postDate); }).forEach(function (it) {
      const done = it.status === 'posted';
      const late = postMissed(it, today);
      list.appendChild(el('div', { class: 'alert' + (done ? ' alert--ok' : (late ? ' alert--late' : '')) }, [
        el('div', { class: 'alert__bar' }),
        el('div', { class: 'alert__body' }, [
          el('div', { class: 'alert__title', text: it.title }),
          el('div', { class: 'alert__meta', text: 'Posts ' + fmtDate(it.postDate) + ' · ' + STATUS_LABEL[it.status] + (done ? (postOnTime(it) ? ' · on time' : ' · late') : '') })
        ]),
        el('div', { class: 'alert__act' }, [
          done ? el('span', { class: 'flag flag--ontime', text: 'Done' })
               : el('button', {
                   class: 'btn btn--sm btn--red', text: 'Mark posted',
                   onclick: function (e) { setStatus(it.id, 'posted', { x: e.clientX, y: e.clientY }); }
                 })
        ])
      ]));
    });
    left.appendChild(list);
  }

  /* individual streaks */
  right.appendChild(el('div', { class: 'section-rule' }, [ el('h2', { text: 'Personal streaks' }) ]));
  const people = el('div', { class: 'mini-people' });
  Store.activePeople().map(function (p) {
    return { p: p, s: Streaks.person(p.id, today) };
  }).sort(function (a, b) { return b.s.current - a.s.current || a.p.name.localeCompare(b.p.name); })
    .forEach(function (row) {
      people.appendChild(el('div', { class: 'mini-person' }, [
        el('div', { class: 'avatar' + (row.s.current >= 4 ? ' avatar--red' : (row.s.current === 0 ? ' avatar--steel' : '')), text: initials(row.p.name) }),
        el('div', { class: 'mini-person__name', text: row.p.name }),
        el('div', { class: 'mini-person__streak' }, [
          flameSVG(row.s.current > 0),
          el('span', { class: 'num', text: row.s.current + 'w' })
        ])
      ]));
    });
  right.appendChild(people);
  right.appendChild(el('p', { class: 'hint', style: 'margin-top:10px', text: 'Personal streaks track filming dates only — they move independently of the team streak.' }));

  /* leaderboard preview */
  const board = Streaks.monthBoard(today);
  const monthName = parseISO(today).toLocaleDateString('en-US', { month: 'long' });
  right.appendChild(el('div', { class: 'section-rule' }, [
    el('h2', { text: 'On-time board' }),
    el('span', { class: 'spacer' }),
    el('span', { text: monthName })
  ]));
  const max = Math.max(1, board[0] ? board[0].total : 1);
  const boardWrap = el('div', { class: 'board' });
  board.slice(0, 5).forEach(function (r, i) {
    boardWrap.appendChild(el('div', { class: 'board__row' + (i === 0 && r.total > 0 ? ' is-first' : ''), style: 'grid-template-columns:36px 1fr 44px' }, [
      el('div', { class: 'board__rank', text: String(i + 1) }),
      el('div', {}, [
        el('div', { class: 'board__name', text: r.person.name }),
        el('div', { class: 'board__bar' }, [ el('i', { style: 'width:' + Math.round((r.total / max) * 100) + '%' }) ])
      ]),
      el('div', { class: 'board__n num' + (r.total ? '' : ' dim'), text: String(r.total) })
    ]));
  });
  right.appendChild(boardWrap);
  right.appendChild(el('button', { class: 'linkbtn', style: 'margin-top:12px', text: 'Full team page →', onclick: function () { location.hash = '#/team'; } }));

  view.appendChild(el('div', { class: 'dash-grid' }, [left, right]));
}
