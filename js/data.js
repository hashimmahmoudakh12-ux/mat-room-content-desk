/* ============================================================
   data.js — state, persistence, seed data, shared helpers
   ============================================================ */

const STORAGE_KEY = 'matroom.contentdesk.v1';

const STATUSES = ['idea', 'scripted', 'filmed', 'edited', 'posted'];
const STATUS_LABEL = {
  idea: 'Idea',
  scripted: 'Scripted',
  filmed: 'Filmed',
  edited: 'Edited',
  posted: 'Posted'
};

/* ---------- tiny DOM helpers ---------- */
function $(sel, root) { return (root || document).querySelector(sel); }
function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

function el(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) {
    Object.keys(attrs).forEach(function (k) {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'text') node.textContent = v;
      else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    });
  }
  (children || []).forEach(function (c) {
    if (c === null || c === undefined || c === false) return;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return node;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function uid(prefix) {
  return (prefix || 'id') + '_' + Math.random().toString(36).slice(2, 9);
}

/* ---------- date helpers (all dates are local 'YYYY-MM-DD') ---------- */
function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}
function parseISO(s) {
  if (!s) return null;
  const p = String(s).split('-').map(Number);
  return new Date(p[0], p[1] - 1, p[2]);
}
function todayISO() { return toISO(new Date()); }
function addDays(iso, n) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}
function daysBetween(aISO, bISO) {
  return Math.round((parseISO(bISO) - parseISO(aISO)) / 86400000);
}
/* Monday-start week key */
function weekStart(iso) {
  const d = parseISO(iso);
  const shift = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - shift);
  return toISO(d);
}
function fmtDate(iso, opts) {
  if (!iso) return '—';
  const d = parseISO(iso);
  return d.toLocaleDateString('en-US', opts || { month: 'short', day: 'numeric' });
}
function fmtDateLong(iso) {
  if (!iso) return '—';
  return parseISO(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}
function relDay(iso) {
  const diff = daysBetween(todayISO(), iso);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff === -1) return 'yesterday';
  if (diff > 0) return 'in ' + diff + ' days';
  return Math.abs(diff) + ' days ago';
}
function initials(name) {
  return String(name || '?').trim().split(/\s+/).filter(function (w) {
    return !/^coach$/i.test(w);
  }).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
}

/* ============================================================
   STATE
   ============================================================ */
const Store = {
  data: null,

  load: function () {
    let raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { raw = null; }
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.people && parsed.items) {
          this.data = parsed;
          this.normalize();
          return this.data;
        }
      } catch (e) { /* fall through to seed */ }
    }
    this.data = seedData();
    this.save();
    return this.data;
  },

  normalize: function () {
    const d = this.data;
    d.ideas = d.ideas || [];
    d.meta = d.meta || {};
    d.meta.bestTeam = d.meta.bestTeam || 0;
    d.meta.bestPersonal = d.meta.bestPersonal || {};
    d.meta.celebratedMilestones = d.meta.celebratedMilestones || [];
    d.items.forEach(function (it) {
      it.performerIds = it.performerIds || [];
      if (!STATUSES.includes(it.status)) it.status = 'idea';
    });
  },

  save: function () {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); }
    catch (e) { console.warn('Could not persist state:', e); }
  },

  /* ---- people ---- */
  people: function () { return this.data.people; },
  activePeople: function () { return this.data.people.filter(function (p) { return p.active !== false; }); },
  person: function (id) { return this.data.people.find(function (p) { return p.id === id; }) || null; },
  personName: function (id) { const p = this.person(id); return p ? p.name : null; },
  owner: function () { return this.person(this.data.settings.ownerId); },

  addPerson: function (name, role) {
    const p = { id: uid('p'), name: name.trim(), role: role || 'athlete', active: true };
    this.data.people.push(p);
    this.save();
    return p;
  },
  updatePerson: function (id, patch) {
    const p = this.person(id);
    if (!p) return;
    Object.assign(p, patch);
    this.save();
  },
  removePerson: function (id) {
    if (id === this.data.settings.ownerId) return false;
    this.data.people = this.data.people.filter(function (p) { return p.id !== id; });
    this.data.items.forEach(function (it) {
      if (it.filmerId === id) it.filmerId = null;
      it.performerIds = it.performerIds.filter(function (x) { return x !== id; });
    });
    this.save();
    return true;
  },

  /* ---- items ---- */
  items: function () { return this.data.items; },
  item: function (id) { return this.data.items.find(function (i) { return i.id === id; }) || null; },

  addItem: function (patch) {
    const it = Object.assign({
      id: uid('c'),
      title: 'Untitled',
      hook: '',
      script: '',
      status: 'idea',
      filmerId: null,
      performerIds: [],
      editorId: this.data.settings.ownerId,
      filmDate: '',
      postDate: '',
      filmedAt: '',
      postedAt: '',
      createdAt: todayISO()
    }, patch || {});
    it.editorId = this.data.settings.ownerId;
    this.data.items.unshift(it);
    this.save();
    return it;
  },
  updateItem: function (id, patch) {
    const it = this.item(id);
    if (!it) return null;
    Object.assign(it, patch);
    it.editorId = this.data.settings.ownerId;
    this.save();
    return it;
  },
  removeItem: function (id) {
    this.data.items = this.data.items.filter(function (i) { return i.id !== id; });
    this.save();
  },

  /* ---- ideas ---- */
  ideas: function () { return this.data.ideas; },
  idea: function (id) { return this.data.ideas.find(function (i) { return i.id === id; }) || null; },
  addIdea: function (patch) {
    const idea = Object.assign({ id: uid('i'), title: '', hook: '', notes: '', createdAt: todayISO() }, patch || {});
    this.data.ideas.unshift(idea);
    this.save();
    return idea;
  },
  updateIdea: function (id, patch) {
    const i = this.idea(id);
    if (i) { Object.assign(i, patch); this.save(); }
    return i;
  },
  removeIdea: function (id) {
    this.data.ideas = this.data.ideas.filter(function (i) { return i.id !== id; });
    this.save();
  },
  promoteIdea: function (id, patch) {
    const idea = this.idea(id);
    if (!idea) return null;
    const item = this.addItem(Object.assign({
      title: idea.title, hook: idea.hook, script: idea.notes, status: 'idea'
    }, patch || {}));
    this.removeIdea(id);
    return item;
  },

  reset: function () {
    this.data = seedData();
    this.save();
  }
};

/* ============================================================
   ITEM LOGIC
   ============================================================ */
function statusIndex(s) { return STATUSES.indexOf(s); }
function isAtLeast(item, status) { return statusIndex(item.status) >= statusIndex(status); }

/* Did the film task land on time? */
function filmOnTime(item) {
  if (!item.filmDate || !isAtLeast(item, 'filmed')) return false;
  const done = item.filmedAt || item.filmDate;
  return done <= item.filmDate;
}
/* Did the post land on time? */
function postOnTime(item) {
  if (!item.postDate || item.status !== 'posted') return false;
  const done = item.postedAt || item.postDate;
  return done <= item.postDate;
}
/* A planned date that has passed with the work unfinished */
function filmMissed(item, today) {
  if (!item.filmDate) return false;
  if (isAtLeast(item, 'filmed')) return !filmOnTime(item);
  return item.filmDate < (today || todayISO());
}
function postMissed(item, today) {
  if (!item.postDate) return false;
  if (item.status === 'posted') return !postOnTime(item);
  return item.postDate < (today || todayISO());
}
/* Deadline inside the next 24h (i.e. due today or tomorrow) and not done */
function filmDueSoon(item, today) {
  if (!item.filmDate || isAtLeast(item, 'filmed')) return false;
  const d = daysBetween(today || todayISO(), item.filmDate);
  return d >= 0 && d <= 1;
}
function postDueSoon(item, today) {
  if (!item.postDate || item.status === 'posted') return false;
  const d = daysBetween(today || todayISO(), item.postDate);
  return d >= 0 && d <= 1;
}
function itemPeopleIds(item) {
  const ids = item.performerIds.slice();
  if (item.filmerId) ids.push(item.filmerId);
  return ids.filter(function (v, i, a) { return a.indexOf(v) === i; });
}

/* ============================================================
   SEED DATA — generated relative to today so the demo is alive
   ============================================================ */
function seedData() {
  const today = todayISO();
  const thisWeek = weekStart(today);

  const people = [
    { id: 'p_adrian', name: 'Coach Adrian', role: 'coach', active: true },
    { id: 'p_naweed', name: 'Coach Naweed', role: 'coach', active: true },
    { id: 'p_hashim', name: 'Hashim', role: 'athlete', active: true },
    { id: 'p_ismael', name: 'Ismael', role: 'athlete', active: true },
    { id: 'p_massi', name: 'Massi', role: 'athlete', active: true }
  ];
  const OWNER = 'p_hashim';

  /* day n of the week that started `weeksAgo` weeks ago (0 = Monday) */
  function slot(weeksAgo, dow) {
    return addDays(thisWeek, -7 * weeksAgo + dow);
  }

  const titles = [
    ['Blast Double From Collar Tie', 'Most doubles die at the knee — this one starts at the ear.'],
    ['Front Headlock: Snap To Go-Behind', 'Three seconds of pressure buys you two points.'],
    ['Why Your Single Leg Keeps Getting Stuffed', 'You are finishing the shot you already lost.'],
    ['Mat Return Chain For Bottom-Heavy Rooms', 'Ride the hips, not the hands.'],
    ['Sprawl Recovery Drill — 40 Seconds', 'Defense is just offense you started late.'],
    ['Warm-Up The Room Actually Does', 'No jogging in circles. Ten minutes, all live positions.'],
    ['Ankle Pick Off The Level Change', 'They react to the shot that never comes.'],
    ['Coach Adrian On Cutting Weight Wrong', 'The scale is not the opponent.'],
    ['Underhook To Duck: The Two-Beat Rule', 'Count it out loud until it is automatic.'],
    ['Bottom Escapes For Heavier Wrestlers', 'Stop wrestling like you weigh 130.'],
    ['Practice Room Tour — 6AM Session', 'The part nobody posts.'],
    ['Head Outside Single Finish Menu', 'Four finishes, one entry.'],
    ['Tilt Series From The Legs', 'Cheap points hiding in plain sight.'],
    ['Naweed Breaks Down A State Final', 'One bad hand-fight decided the whole match.'],
    ['Neutral Hand Fighting Ladder', 'Win the hands, win the takedown.'],
    ['Recovery Day: What We Actually Do', 'Not a highlight reel. Still matters.'],
    ['Stand-Up That Beats A Tight Waist', 'Hips first. Always hips first.'],
    ['First-Year Wrestler Mistakes', 'Every one of these is fixable in a week.'],
    ['Duck Under From The Elbow Pass', 'The elbow is the door handle.'],
    ['Cradle Setups Nobody Teaches', 'Head and knee. That is the whole sport.'],
    ['Live Go: Hashim vs Ismael', 'Six minutes, no edits, no music.'],
    ['Building A Home Drilling Routine', 'Twenty minutes on a hallway rug.'],
    ['Snap Down To Shuck — Timing Drill', 'You are shucking too early. Here is the tell.']
  ];

  const items = [];
  let t = 0;
  function nextTitle() { const x = titles[t % titles.length]; t++; return x; }

  function make(cfg) {
    const tt = nextTitle();
    return {
      id: uid('c'),
      title: tt[0],
      hook: tt[1],
      script: cfg.script || '',
      status: cfg.status,
      filmerId: cfg.filmerId || null,
      performerIds: cfg.performerIds || [],
      editorId: OWNER,
      filmDate: cfg.filmDate || '',
      postDate: cfg.postDate || '',
      filmedAt: cfg.filmedAt || '',
      postedAt: cfg.postedAt || '',
      createdAt: cfg.createdAt || cfg.filmDate || today
    };
  }

  const cast = [
    { filmerId: 'p_ismael', performerIds: ['p_hashim', 'p_adrian'] },
    { filmerId: 'p_massi', performerIds: ['p_ismael'] },
    { filmerId: 'p_hashim', performerIds: ['p_naweed', 'p_massi'] },
    { filmerId: 'p_adrian', performerIds: ['p_hashim'] },
    { filmerId: 'p_naweed', performerIds: ['p_massi', 'p_ismael'] },
    { filmerId: 'p_massi', performerIds: ['p_adrian'] },
    { filmerId: 'p_ismael', performerIds: ['p_naweed'] },
    { filmerId: 'p_hashim', performerIds: ['p_ismael', 'p_massi'] }
  ];
  let c = 0;
  function nextCast() { const x = cast[c % cast.length]; c++; return { filmerId: x.filmerId, performerIds: x.performerIds.slice() }; }

  /* --- weeks 12..7 back: one clean post each week (older best run) --- */
  for (let w = 12; w >= 7; w--) {
    const roles = nextCast();
    items.push(make(Object.assign({
      status: 'posted',
      filmDate: slot(w, 1), filmedAt: slot(w, 1),
      postDate: slot(w, 4), postedAt: slot(w, 4)
    }, roles)));
  }

  /* --- week 6 back: the break. One post slipped past its date. --- */
  (function () {
    const a = nextCast(), b = nextCast();
    items.push(make(Object.assign({
      status: 'posted',
      filmDate: slot(6, 1), filmedAt: slot(6, 1),
      postDate: slot(6, 3), postedAt: slot(6, 3)
    }, a)));
    items.push(make(Object.assign({
      status: 'posted',
      filmDate: slot(6, 2), filmedAt: slot(6, 4),
      postDate: slot(6, 5), postedAt: slot(6, 6)
    }, b)));
  })();

  /* --- weeks 5..1 back: the current clean run, two posts a week --- */
  for (let w = 5; w >= 1; w--) {
    const a = nextCast(), b = nextCast();
    items.push(make(Object.assign({
      status: 'posted',
      filmDate: slot(w, 1), filmedAt: slot(w, 1),
      postDate: slot(w, 3), postedAt: slot(w, 3)
    }, a)));
    items.push(make(Object.assign({
      status: 'posted',
      filmDate: slot(w, 2), filmedAt: slot(w, 2),
      postDate: slot(w, 6), postedAt: slot(w, 5)
    }, b)));
  }

  /* --- this week: live work in the pipeline --- */
  items.push(make(Object.assign({
    status: 'edited',
    filmDate: addDays(today, -2), filmedAt: addDays(today, -2),
    postDate: addDays(today, 1),
    script: 'Cold open on the failed shot, then rewind. Keep it under 45s.'
  }, nextCast())));

  items.push(make(Object.assign({
    status: 'scripted',
    filmDate: addDays(today, 1),
    postDate: addDays(today, 4),
    script: 'Three finishes, one entry. Shoot wide, then two tight angles.'
  }, nextCast())));

  items.push(make(Object.assign({
    status: 'filmed',
    filmDate: addDays(today, -1), filmedAt: addDays(today, -1),
    postDate: addDays(today, 4)
  }, nextCast())));

  items.push(make(Object.assign({
    status: 'idea',
    filmDate: addDays(today, 5),
    postDate: addDays(today, 9)
  }, nextCast())));

  const ideas = [
    { id: uid('i'), title: 'Referee Signals In 60 Seconds', hook: 'Half the room still does not know what the hand means.', notes: 'Could be a series. One signal per short.', createdAt: addDays(today, -9) },
    { id: uid('i'), title: 'What Is In A Wrestler\'s Bag', hook: 'Everything in here has been used at least once. Except one thing.', notes: 'Film Massi\'s bag — it is the worst one.', createdAt: addDays(today, -6) },
    { id: uid('i'), title: 'Two-On-One Series For Short Arms', hook: 'You are not too small. You are too square.', notes: 'Coach Naweed has the full breakdown already.', createdAt: addDays(today, -4) },
    { id: uid('i'), title: 'Post-Practice Cooldown, 8 Minutes', hook: 'The eight minutes that decide how tomorrow feels.', notes: '', createdAt: addDays(today, -2) },
    { id: uid('i'), title: 'Room Rules We Actually Enforce', hook: 'Number four gets people sent home.', notes: 'Talking head with Adrian, cut over practice b-roll.', createdAt: addDays(today, -1) }
  ];

  return {
    version: 1,
    settings: { ownerId: OWNER, teamName: 'Mat Room' },
    people: people,
    items: items,
    ideas: ideas,
    meta: { bestTeam: 0, bestPersonal: {}, celebratedMilestones: [] }
  };
}
