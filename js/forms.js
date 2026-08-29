/* ============================================================
   forms.js — modal shell, item/idea editors, status transitions
   ============================================================ */

const Modal = {
  open: function (node) {
    const body = document.getElementById('modal-body');
    body.innerHTML = '';
    body.appendChild(node);
    document.getElementById('modal').hidden = false;
    document.body.style.overflow = 'hidden';
    const first = body.querySelector('input, textarea, select');
    if (first) setTimeout(function () { first.focus(); }, 40);
  },
  close: function () {
    document.getElementById('modal').hidden = true;
    document.getElementById('modal-body').innerHTML = '';
    document.body.style.overflow = '';
  }
};

/* ============================================================
   STATUS TRANSITIONS + CELEBRATION
   ============================================================ */
function setStatus(id, next, origin) {
  const item = Store.item(id);
  if (!item || item.status === next) return;

  const before = Streaks.team();
  const patch = { status: next };
  const today = todayISO();

  if (statusIndex(next) >= statusIndex('filmed') && !item.filmedAt) patch.filmedAt = today;
  if (statusIndex(next) < statusIndex('filmed')) { patch.filmedAt = ''; patch.postedAt = ''; }
  if (next === 'posted' && !item.postedAt) patch.postedAt = today;
  if (next !== 'posted') patch.postedAt = '';

  Store.updateItem(id, patch);
  const updated = Store.item(id);

  if (next === 'posted') {
    if (postOnTime(updated)) {
      FX.confetti(origin);
      FX.toast('Posted on time', updated.title, 'win');
    } else if (updated.postDate) {
      FX.toast('Posted', 'Past the planned date — still shipped. That counts for something.', 'soft');
    } else {
      FX.toast('Posted', updated.title);
    }
  } else if (next === 'filmed' && filmOnTime(updated)) {
    FX.toast('Filmed on time', (Store.personName(updated.filmerId) || 'Team') + ' hit the date.', 'win');
  }

  checkMilestone(before);
  App.render();
}

function checkMilestone(before) {
  const after = Streaks.team();
  const meta = Store.data.meta;
  if (meta.lastCelebrated == null) meta.lastCelebrated = 0;
  if (after.current < meta.lastCelebrated) meta.lastCelebrated = 0;   /* run reset — milestones can be earned again */

  const marks = [1, 4, 10];
  if (after.current > before.current && marks.indexOf(after.current) !== -1 && after.current > meta.lastCelebrated) {
    meta.lastCelebrated = after.current;
    Store.save();
    setTimeout(function () { FX.milestone(after.current); }, 260);
  } else {
    Store.save();
  }
}

/* ============================================================
   PEOPLE PICKERS
   ============================================================ */
function personSelect(name, value, opts) {
  opts = opts || {};
  const sel = el('select', { name: name, id: name });
  sel.appendChild(el('option', { value: '', text: opts.blank || '— Unassigned —' }));
  Store.activePeople().forEach(function (p) {
    const o = el('option', { value: p.id, text: p.name });
    if (p.id === value) o.selected = true;
    sel.appendChild(o);
  });
  return sel;
}

function performerChecks(selected) {
  const wrap = el('div', { class: 'checkline' });
  Store.activePeople().forEach(function (p) {
    const input = el('input', { type: 'checkbox', name: 'performer', value: p.id });
    if (selected.indexOf(p.id) !== -1) input.checked = true;
    wrap.appendChild(el('label', {}, [input, document.createTextNode(p.name)]));
  });
  return wrap;
}

function statusSelect(value) {
  const sel = el('select', { name: 'status', id: 'status' });
  STATUSES.forEach(function (s) {
    const o = el('option', { value: s, text: STATUS_LABEL[s] });
    if (s === value) o.selected = true;
    sel.appendChild(o);
  });
  return sel;
}

/* ============================================================
   ITEM EDITOR
   ============================================================ */
function openItemForm(id, prefill) {
  const item = id ? Store.item(id) : null;
  const v = item || Object.assign({
    title: '', hook: '', script: '', status: 'idea',
    filmerId: '', performerIds: [], filmDate: '', postDate: '', filmedAt: '', postedAt: ''
  }, prefill || {});

  const form = el('form', { class: 'form' });
  form.appendChild(el('h2', { text: item ? 'Edit Content Item' : 'New Content Item' }));
  form.appendChild(el('p', { class: 'form__sub', text: item ? 'Anything here can change — the streak maths follows the dates.' : 'Title and hook carry the whole card. Keep the hook to one line.' }));

  const grid = el('div', { class: 'form__grid' });

  grid.appendChild(el('div', { class: 'field span2' }, [
    el('label', { for: 'title', text: 'Title' }),
    el('input', { type: 'text', id: 'title', name: 'title', value: v.title, required: true, placeholder: 'Blast Double From Collar Tie' })
  ]));

  grid.appendChild(el('div', { class: 'field span2' }, [
    el('label', { for: 'hook', text: 'Hook — shown under the title' }),
    el('input', { type: 'text', id: 'hook', name: 'hook', value: v.hook, placeholder: 'One line that makes someone stop scrolling' })
  ]));

  grid.appendChild(el('div', { class: 'field span2' }, [
    el('label', { for: 'script', text: 'Script / notes' }),
    el('textarea', { id: 'script', name: 'script', placeholder: 'Shot list, talking points, edit notes…' }, [document.createTextNode(v.script || '')])
  ]));

  grid.appendChild(el('div', { class: 'field' }, [
    el('label', { for: 'status', text: 'Status' }), statusSelect(v.status)
  ]));

  grid.appendChild(el('div', { class: 'field' }, [
    el('label', { text: 'Editor' }),
    el('div', { class: 'locked-field' }, [
      el('span', { class: 'lock', text: 'Locked' }),
      el('span', { text: Store.owner().name })
    ])
  ]));

  grid.appendChild(el('div', { class: 'field' }, [
    el('label', { for: 'filmerId', text: 'Filmer' }), personSelect('filmerId', v.filmerId)
  ]));

  grid.appendChild(el('div', { class: 'field' }, [
    el('label', { text: 'Performers' }), performerChecks(v.performerIds || [])
  ]));

  grid.appendChild(el('div', { class: 'field' }, [
    el('label', { for: 'filmDate', text: 'Planned film date' }),
    el('input', { type: 'date', id: 'filmDate', name: 'filmDate', value: v.filmDate || '' })
  ]));

  grid.appendChild(el('div', { class: 'field' }, [
    el('label', { for: 'postDate', text: 'Planned post date' }),
    el('input', { type: 'date', id: 'postDate', name: 'postDate', value: v.postDate || '' })
  ]));

  grid.appendChild(el('div', { class: 'field' }, [
    el('label', { for: 'filmedAt', text: 'Actually filmed on' }),
    el('input', { type: 'date', id: 'filmedAt', name: 'filmedAt', value: v.filmedAt || '' }),
    el('span', { class: 'hint', text: 'Set automatically when you move it to Filmed.' })
  ]));

  grid.appendChild(el('div', { class: 'field' }, [
    el('label', { for: 'postedAt', text: 'Actually posted on' }),
    el('input', { type: 'date', id: 'postedAt', name: 'postedAt', value: v.postedAt || '' }),
    el('span', { class: 'hint', text: 'On or before the planned date keeps the streak alive.' })
  ]));

  form.appendChild(grid);

  const foot = el('div', { class: 'form__foot' }, [
    el('button', { class: 'btn btn--red', type: 'submit', text: item ? 'Save changes' : 'Add to log' }),
    el('button', { class: 'btn btn--ghost', type: 'button', text: 'Cancel', onclick: Modal.close }),
    el('span', { class: 'spacer' })
  ]);
  if (item) {
    foot.appendChild(el('button', {
      class: 'linkbtn', type: 'button', text: 'Delete item',
      onclick: function () {
        if (confirm('Delete "' + item.title + '"? This cannot be undone.')) {
          Store.removeItem(item.id); Modal.close(); App.render();
          FX.toast('Item deleted', item.title, 'soft');
        }
      }
    }));
  }
  form.appendChild(foot);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const fd = new FormData(form);
    const performers = $$('input[name=performer]', form).filter(function (i) { return i.checked; }).map(function (i) { return i.value; });
    const patch = {
      title: (fd.get('title') || '').trim() || 'Untitled',
      hook: (fd.get('hook') || '').trim(),
      script: (fd.get('script') || '').trim(),
      status: fd.get('status'),
      filmerId: fd.get('filmerId') || null,
      performerIds: performers,
      filmDate: fd.get('filmDate') || '',
      postDate: fd.get('postDate') || '',
      filmedAt: fd.get('filmedAt') || '',
      postedAt: fd.get('postedAt') || ''
    };
    if (statusIndex(patch.status) >= statusIndex('filmed') && !patch.filmedAt) patch.filmedAt = todayISO();
    if (patch.status === 'posted' && !patch.postedAt) patch.postedAt = todayISO();

    const before = Streaks.team();
    if (item) {
      const wasPosted = item.status === 'posted';
      Store.updateItem(item.id, patch);
      if (!wasPosted && patch.status === 'posted' && postOnTime(Store.item(item.id))) FX.confetti();
    } else {
      const created = Store.addItem(patch);
      FX.toast('Added to the log', created.title);
      if (patch.status === 'posted' && postOnTime(created)) FX.confetti();
    }
    checkMilestone(before);
    Modal.close();
    App.render();
  });

  Modal.open(form);
}

/* ============================================================
   IDEA EDITOR
   ============================================================ */
function openIdeaForm(id) {
  const idea = id ? Store.idea(id) : null;
  const v = idea || { title: '', hook: '', notes: '' };
  const form = el('form', { class: 'form' });
  form.appendChild(el('h2', { text: idea ? 'Edit Idea' : 'New Idea' }));
  form.appendChild(el('p', { class: 'form__sub', text: 'Ideas carry no dates. Promote one when it is ready for the calendar.' }));

  const grid = el('div', { class: 'form__grid' });
  grid.appendChild(el('div', { class: 'field span2' }, [
    el('label', { for: 'title', text: 'Title' }),
    el('input', { type: 'text', id: 'title', name: 'title', value: v.title, required: true })
  ]));
  grid.appendChild(el('div', { class: 'field span2' }, [
    el('label', { for: 'hook', text: 'Hook' }),
    el('input', { type: 'text', id: 'hook', name: 'hook', value: v.hook, placeholder: 'The line that makes it worth filming' })
  ]));
  grid.appendChild(el('div', { class: 'field span2' }, [
    el('label', { for: 'notes', text: 'Notes' }),
    el('textarea', { id: 'notes', name: 'notes' }, [document.createTextNode(v.notes || '')])
  ]));
  form.appendChild(grid);

  const foot = el('div', { class: 'form__foot' }, [
    el('button', { class: 'btn btn--red', type: 'submit', text: idea ? 'Save idea' : 'Bank it' }),
    el('button', { class: 'btn btn--ghost', type: 'button', text: 'Cancel', onclick: Modal.close }),
    el('span', { class: 'spacer' })
  ]);
  if (idea) {
    foot.appendChild(el('button', {
      class: 'linkbtn', type: 'button', text: 'Delete idea',
      onclick: function () { Store.removeIdea(idea.id); Modal.close(); App.render(); }
    }));
  }
  form.appendChild(foot);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const fd = new FormData(form);
    const patch = {
      title: (fd.get('title') || '').trim() || 'Untitled idea',
      hook: (fd.get('hook') || '').trim(),
      notes: (fd.get('notes') || '').trim()
    };
    if (idea) Store.updateIdea(idea.id, patch);
    else { Store.addIdea(patch); FX.toast('Banked', patch.title); }
    Modal.close();
    App.render();
  });

  Modal.open(form);
}

/* ============================================================
   PROMOTE AN IDEA INTO THE LOG
   ============================================================ */
function openPromoteForm(id) {
  const idea = Store.idea(id);
  if (!idea) return;

  const form = el('form', { class: 'form' });
  form.appendChild(el('div', { class: 'kicker kicker--red', text: 'Promote to content log' }));
  form.appendChild(el('h2', { text: idea.title }));
  form.appendChild(el('p', { class: 'form__sub', text: idea.hook || 'No hook yet — worth writing one before it films.' }));

  const grid = el('div', { class: 'form__grid' });
  grid.appendChild(el('div', { class: 'field' }, [
    el('label', { for: 'filmerId', text: 'Filmer' }), personSelect('filmerId', '')
  ]));
  grid.appendChild(el('div', { class: 'field' }, [
    el('label', { text: 'Performers' }), performerChecks([])
  ]));
  grid.appendChild(el('div', { class: 'field' }, [
    el('label', { for: 'filmDate', text: 'Planned film date' }),
    el('input', { type: 'date', id: 'filmDate', name: 'filmDate', value: addDays(todayISO(), 3) })
  ]));
  grid.appendChild(el('div', { class: 'field' }, [
    el('label', { for: 'postDate', text: 'Planned post date' }),
    el('input', { type: 'date', id: 'postDate', name: 'postDate', value: addDays(todayISO(), 7) })
  ]));
  grid.appendChild(el('div', { class: 'field span2' }, [
    el('label', { text: 'Editor' }),
    el('div', { class: 'locked-field' }, [
      el('span', { class: 'lock', text: 'Locked' }),
      el('span', { text: Store.owner().name })
    ])
  ]));
  form.appendChild(grid);

  form.appendChild(el('div', { class: 'form__foot' }, [
    el('button', { class: 'btn btn--red', type: 'submit', text: 'Move to log' }),
    el('button', { class: 'btn btn--ghost', type: 'button', text: 'Cancel', onclick: Modal.close })
  ]));

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const fd = new FormData(form);
    const performers = $$('input[name=performer]', form).filter(function (i) { return i.checked; }).map(function (i) { return i.value; });
    Store.promoteIdea(idea.id, {
      status: 'scripted',
      filmerId: fd.get('filmerId') || null,
      performerIds: performers,
      filmDate: fd.get('filmDate') || '',
      postDate: fd.get('postDate') || ''
    });
    Modal.close();
    FX.toast('On the log', idea.title + ' is scheduled.');
    location.hash = '#/log';
    App.render();
  });

  Modal.open(form);
}

/* ============================================================
   ITEM DETAIL (read view with quick actions)
   ============================================================ */
function openItemDetail(id) {
  const it = Store.item(id);
  if (!it) return;
  const wrap = el('div', { class: 'form' });
  wrap.appendChild(el('div', { class: 'kicker kicker--red', text: STATUS_LABEL[it.status] }));
  wrap.appendChild(el('h2', { text: it.title }));
  if (it.hook) wrap.appendChild(el('p', { class: 'item__hook', text: it.hook }));

  const grid = el('div', { class: 'form__grid', style: 'margin-top:22px' });
  function row(label, value) {
    return el('div', { class: 'field' }, [
      el('label', { text: label }),
      el('div', { text: value, style: 'font-size:14px;font-weight:500' })
    ]);
  }
  grid.appendChild(row('Filmer', Store.personName(it.filmerId) || 'Unassigned'));
  grid.appendChild(row('Performers', it.performerIds.map(function (p) { return Store.personName(p); }).filter(Boolean).join(', ') || 'None set'));
  grid.appendChild(row('Editor', Store.personName(it.editorId) || '—'));
  grid.appendChild(row('Status', STATUS_LABEL[it.status]));
  grid.appendChild(row('Planned film', fmtDateLong(it.filmDate) + (it.filmedAt ? '  ·  filmed ' + fmtDate(it.filmedAt) : '')));
  grid.appendChild(row('Planned post', fmtDateLong(it.postDate) + (it.postedAt ? '  ·  posted ' + fmtDate(it.postedAt) : '')));
  wrap.appendChild(grid);

  if (it.script) {
    wrap.appendChild(el('div', { class: 'field', style: 'margin-top:18px' }, [
      el('label', { text: 'Script / notes' }),
      el('p', { text: it.script, style: 'white-space:pre-wrap;font-size:14px;line-height:1.65' })
    ]));
  }

  wrap.appendChild(el('div', { class: 'form__foot' }, [
    el('button', { class: 'btn btn--red', type: 'button', text: 'Edit', onclick: function () { openItemForm(it.id); } }),
    el('button', { class: 'btn btn--ghost', type: 'button', text: 'Close', onclick: Modal.close })
  ]));

  Modal.open(wrap);
}
