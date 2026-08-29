/* ============================================================
   view-team.js — roster, personal streaks, shelves, leaderboard
   ============================================================ */

function renderTeam(view) {
  const today = todayISO();

  view.appendChild(el('div', { class: 'page-head' }, [
    el('div', {}, [
      el('div', { class: 'kicker kicker--red', text: 'Roster' }),
      el('h1', { text: 'The Team' }),
      el('p', { text: 'Personal streaks count filming dates hit on time. Editing sits with the owner on every item.' })
    ]),
    el('div', { class: 'page-head__right' }, [
      el('button', { class: 'btn btn--red', text: '+ Add person', onclick: openAddPerson })
    ])
  ]));

  /* ---------- leaderboard ---------- */
  const monthName = parseISO(today).toLocaleDateString('en-US', { month: 'long' });
  view.appendChild(el('div', { class: 'section-rule' }, [
    el('h2', { text: 'On-time board' }),
    el('span', { class: 'spacer' }),
    el('span', { text: monthName + ' · on-time work only, no penalties for a quiet month' })
  ]));

  const board = Streaks.monthBoard(today);
  const wrap = el('div', { class: 'board' });
  wrap.appendChild(el('div', { class: 'board__row is-head' }, [
    el('span', { text: '#' }), el('span', { text: 'Name' }),
    el('span', { text: 'Filmed', style: 'text-align:right' }),
    el('span', { text: 'On screen', style: 'text-align:right' }),
    el('span', { text: 'Edited', style: 'text-align:right' })
  ]));
  board.forEach(function (r, i) {
    wrap.appendChild(el('div', { class: 'board__row' + (i === 0 && r.total > 0 ? ' is-first' : '') }, [
      el('div', { class: 'board__rank', text: String(i + 1) }),
      el('div', { class: 'board__name' }, [
        el('div', { class: 'avatar', text: initials(r.person.name) }),
        el('span', { text: r.person.name })
      ]),
      el('div', { class: 'board__n num' + (r.filmed ? '' : ' dim'), text: String(r.filmed) }),
      el('div', { class: 'board__n num' + (r.onScreen ? '' : ' dim'), text: String(r.onScreen) }),
      el('div', { class: 'board__n num' + (r.edited ? '' : ' dim'), text: String(r.edited) })
    ]));
  });
  view.appendChild(wrap);
  view.appendChild(el('p', { class: 'hint', style: 'margin-top:10px', text: 'Counts reset with the calendar month. Nobody loses points for a slipped date here — that is what the streak is for.' }));

  /* ---------- person cards ---------- */
  view.appendChild(el('div', { class: 'section-rule' }, [ el('h2', { text: 'Streaks & shelves' }) ]));

  const grid = el('div', { class: 'team-grid' });
  Store.activePeople().forEach(function (p) {
    const s = Streaks.person(p.id, today);
    const t = Streaks.totals(p.id);
    const badges = Streaks.badgesFor(p.id);
    const isOwner = p.id === Store.data.settings.ownerId;

    const shelf = el('div', { class: 'badges' });
    badges.forEach(function (b) {
      shelf.appendChild(el('div', {
        class: 'badge' + (b.earned ? ' is-earned' : '') + (b.red ? ' badge--red' : ''),
        title: b.name + ' — ' + b.hint
      }, [
        document.createTextNode(b.icon),
        el('span', { class: 'badge__t', text: b.earned ? b.name : b.hint })
      ]));
    });

    const msg = s.current > 0
      ? (s.current >= 4 ? 'On a run. Do not be the reason it stops.' : 'Building. One more week locks it in.')
      : (s.hasData ? 'Counter is at zero — the next filming date starts it again.' : 'No filming dates assigned yet.');

    grid.appendChild(el('div', { class: 'person-card' }, [
      el('div', { class: 'person-card__head' }, [
        el('div', { class: 'avatar avatar--lg' + (s.current >= 4 ? ' avatar--red' : (s.current === 0 ? ' avatar--steel' : '')), text: initials(p.name) }),
        el('div', {}, [
          el('div', { class: 'person-card__name', text: p.name }),
          el('div', { class: 'person-card__role', html: esc(p.role === 'coach' ? 'Coach' : 'Athlete') + (isOwner ? ' · <span class="owner-tag">Editor</span>' : '') })
        ])
      ]),
      el('div', { class: 'person-streak' }, [
        flameSVG(s.current > 0),
        el('span', { class: 'person-streak__n num' + (s.current >= 4 ? ' is-hot' : ''), text: String(s.current) }),
        el('span', { class: 'person-streak__lbl', text: 'week streak · best ' + s.best })
      ]),
      el('p', { class: 'hint', text: msg }),
      el('div', { class: 'person-stats' }, [
        el('div', { class: 'person-stat' }, [ el('b', { class: 'num', text: String(t.filmed) }), el('span', { text: 'Filmed' }) ]),
        el('div', { class: 'person-stat' }, [ el('b', { class: 'num', text: String(t.appeared) }), el('span', { text: 'On screen' }) ]),
        el('div', { class: 'person-stat' }, [ el('b', { class: 'num', text: t.rate == null ? '—' : t.rate + '%' }), el('span', { text: 'On time' }) ])
      ]),
      el('div', { class: 'shelf' }, [
        el('div', { class: 'shelf__label', text: 'Trophy shelf · ' + badges.filter(function (b) { return b.earned; }).length + ' of ' + badges.length }),
        shelf
      ])
    ]));
  });
  view.appendChild(grid);

  /* ---------- roster editor ---------- */
  view.appendChild(el('div', { class: 'section-rule' }, [
    el('h2', { text: 'Edit roster' }),
    el('span', { class: 'spacer' }),
    el('span', { text: 'People can be added or retired at any time' })
  ]));

  const roster = el('div', { class: 'roster-edit' });
  Store.people().forEach(function (p) {
    const isOwner = p.id === Store.data.settings.ownerId;

    const nameIn = el('input', { type: 'text', value: p.name });
    nameIn.addEventListener('change', function () {
      const v = nameIn.value.trim();
      if (v) { Store.updatePerson(p.id, { name: v }); App.render(); }
      else nameIn.value = p.name;
    });

    const roleSel = el('select', { style: 'max-width:140px' });
    [['athlete', 'Athlete'], ['coach', 'Coach']].forEach(function (r) {
      const o = el('option', { value: r[0], text: r[1] });
      if (p.role === r[0]) o.selected = true;
      roleSel.appendChild(o);
    });
    roleSel.addEventListener('change', function () { Store.updatePerson(p.id, { role: roleSel.value }); App.render(); });

    roster.appendChild(el('div', { class: 'roster-row' }, [
      el('div', { class: 'avatar', text: initials(p.name) }),
      nameIn,
      roleSel,
      isOwner ? el('span', { class: 'flag flag--ontime', text: 'Owner · Editor' }) : null,
      p.active === false ? el('span', { class: 'flag flag--late', text: 'Retired' }) : null,
      el('span', { class: 'grow' }),
      isOwner ? null : el('button', {
        class: 'linkbtn',
        text: p.active === false ? 'Reactivate' : 'Retire',
        onclick: function () { Store.updatePerson(p.id, { active: p.active === false }); App.render(); }
      }),
      isOwner ? null : el('button', {
        class: 'linkbtn',
        text: 'Remove',
        onclick: function () {
          if (confirm('Remove ' + p.name + ' from the roster? They will be unassigned from every item.')) {
            Store.removePerson(p.id); App.render();
          }
        }
      })
    ]));
  });
  view.appendChild(roster);
}

function openAddPerson() {
  const form = el('form', { class: 'form' });
  form.appendChild(el('h2', { text: 'Add To Roster' }));
  form.appendChild(el('p', { class: 'form__sub', text: 'New people can be assigned as filmer or performer straight away.' }));

  const grid = el('div', { class: 'form__grid' });
  grid.appendChild(el('div', { class: 'field' }, [
    el('label', { for: 'name', text: 'Name' }),
    el('input', { type: 'text', id: 'name', name: 'name', required: true, placeholder: 'Coach Dana' })
  ]));
  const roleSel = el('select', { name: 'role' });
  roleSel.appendChild(el('option', { value: 'athlete', text: 'Athlete' }));
  roleSel.appendChild(el('option', { value: 'coach', text: 'Coach' }));
  grid.appendChild(el('div', { class: 'field' }, [ el('label', { for: 'role', text: 'Role' }), roleSel ]));
  form.appendChild(grid);

  form.appendChild(el('div', { class: 'form__foot' }, [
    el('button', { class: 'btn btn--red', type: 'submit', text: 'Add person' }),
    el('button', { class: 'btn btn--ghost', type: 'button', text: 'Cancel', onclick: Modal.close })
  ]));

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const fd = new FormData(form);
    const name = (fd.get('name') || '').trim();
    if (!name) return;
    Store.addPerson(name, fd.get('role'));
    Modal.close();
    FX.toast('Welcome aboard', name + ' is on the roster.');
    App.render();
  });

  Modal.open(form);
}
