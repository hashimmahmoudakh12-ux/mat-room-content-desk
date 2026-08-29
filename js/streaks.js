/* ============================================================
   streaks.js — consistency engine
   ------------------------------------------------------------
   A "week" runs Monday → Sunday.

   TEAM STREAK   consecutive weeks in which every post planned for
                 that week actually went out on or before its date.
   PERSON STREAK consecutive weeks in which every filming task the
                 person was assigned (as filmer or performer) was
                 completed on or before its planned film date.

   Weeks with nothing planned are neutral: they neither add to a
   streak nor break it. The current week only counts once every
   planned item in it is resolved — until then the run is "live".
   ============================================================ */

const Streaks = {

  /* ---------- bucket planned work by week ---------- */
  teamWeeks: function (items, today) {
    today = today || todayISO();
    const map = {};
    items.forEach(function (it) {
      if (!it.postDate) return;
      const k = weekStart(it.postDate);
      const b = map[k] || (map[k] = { key: k, planned: [], onTime: [], missed: [], pending: [] });
      b.planned.push(it);
      if (it.status === 'posted') (postOnTime(it) ? b.onTime : b.missed).push(it);
      else if (it.postDate < today) b.missed.push(it);
      else b.pending.push(it);
    });
    return map;
  },

  personTasks: function (items, personId) {
    return items.filter(function (it) {
      return it.filmDate && (it.filmerId === personId || it.performerIds.indexOf(personId) !== -1);
    });
  },

  personWeeks: function (items, personId, today) {
    today = today || todayISO();
    const map = {};
    this.personTasks(items, personId).forEach(function (it) {
      const k = weekStart(it.filmDate);
      const b = map[k] || (map[k] = { key: k, planned: [], onTime: [], missed: [], pending: [] });
      b.planned.push(it);
      if (isAtLeast(it, 'filmed')) (filmOnTime(it) ? b.onTime : b.missed).push(it);
      else if (it.filmDate < today) b.missed.push(it);
      else b.pending.push(it);
    });
    return map;
  },

  /* ---------- walk the buckets ---------- */
  run: function (map, today) {
    today = today || todayISO();
    const keys = Object.keys(map).sort();
    const result = {
      current: 0, best: 0, live: false, brokeThisWeek: false,
      lastMissWeek: null, weeks: keys.length, hasData: keys.length > 0
    };
    if (!keys.length) return result;

    const curKey = weekStart(today);
    const earliest = keys[0];

    /* current run — walk backwards from this week */
    let cursor = curKey, guard = 0;
    while (cursor >= earliest && guard++ < 600) {
      const b = map[cursor];
      if (b && b.planned.length) {
        if (b.missed.length) {
          if (cursor === curKey) result.brokeThisWeek = true;
          result.lastMissWeek = cursor;
          break;
        }
        if (b.pending.length) {
          if (cursor === curKey) result.live = true;
          else break; /* an unresolved past week cannot be counted */
        } else {
          result.current++;
        }
      }
      cursor = addDays(cursor, -7);
    }

    /* best run ever — walk forwards through every recorded week */
    let run = 0;
    keys.forEach(function (k) {
      const b = map[k];
      if (!b.planned.length) return;
      if (b.missed.length) { run = 0; return; }
      if (b.pending.length) return;   /* neutral, still open */
      run++;
      if (run > result.best) result.best = run;
    });
    if (result.current > result.best) result.best = result.current;
    return result;
  },

  team: function (today) {
    const r = this.run(this.teamWeeks(Store.items(), today), today);
    const floor = Store.data.meta.bestTeam || 0;
    r.best = Math.max(r.best, floor);
    if (r.best > floor) { Store.data.meta.bestTeam = r.best; Store.save(); }
    return r;
  },

  person: function (personId, today) {
    const r = this.run(this.personWeeks(Store.items(), personId, today), today);
    const floor = (Store.data.meta.bestPersonal || {})[personId] || 0;
    r.best = Math.max(r.best, floor);
    if (r.best > floor) {
      Store.data.meta.bestPersonal[personId] = r.best;
      Store.save();
    }
    return r;
  },

  /* last N weeks as a compact history strip */
  history: function (map, n, today) {
    today = today || todayISO();
    const out = [];
    let cursor = weekStart(today);
    for (let i = 0; i < n; i++) {
      const b = map[cursor];
      let state = 'none';
      if (b && b.planned.length) {
        if (b.missed.length) state = 'missed';
        else if (b.pending.length) state = 'open';
        else state = 'clean';
      }
      out.unshift({ key: cursor, state: state, count: b ? b.planned.length : 0 });
      cursor = addDays(cursor, -7);
    }
    return out;
  },

  /* ---------- attention list ---------- */
  attention: function (today) {
    today = today || todayISO();
    const rows = [];
    Store.items().forEach(function (it) {
      if (filmDueSoon(it, today)) {
        rows.push({ item: it, kind: 'film', tone: 'soon', date: it.filmDate,
          who: it.filmerId ? Store.personName(it.filmerId) : 'Unassigned' });
      } else if (filmMissed(it, today) && !isAtLeast(it, 'filmed')) {
        rows.push({ item: it, kind: 'film', tone: 'late', date: it.filmDate,
          who: it.filmerId ? Store.personName(it.filmerId) : 'Unassigned' });
      }
      if (postDueSoon(it, today)) {
        rows.push({ item: it, kind: 'post', tone: 'soon', date: it.postDate, who: Store.personName(it.editorId) });
      } else if (postMissed(it, today) && it.status !== 'posted') {
        rows.push({ item: it, kind: 'post', tone: 'late', date: it.postDate, who: Store.personName(it.editorId) });
      }
    });
    const order = { soon: 0, late: 1 };
    rows.sort(function (a, b) {
      return (order[a.tone] - order[b.tone]) || a.date.localeCompare(b.date);
    });
    return rows;
  },

  /* ---------- leaderboard (calendar month) ---------- */
  monthBoard: function (today) {
    today = today || todayISO();
    const month = today.slice(0, 7);
    const rows = Store.activePeople().map(function (p) {
      let filmed = 0, onScreen = 0, edited = 0;
      Store.items().forEach(function (it) {
        if (it.filmerId === p.id && it.filmDate && it.filmDate.slice(0, 7) === month && filmOnTime(it)) filmed++;
        if (it.performerIds.indexOf(p.id) !== -1 && it.postDate && it.postDate.slice(0, 7) === month && postOnTime(it)) onScreen++;
        if (it.editorId === p.id && it.postDate && it.postDate.slice(0, 7) === month && postOnTime(it)) edited++;
      });
      return { person: p, filmed: filmed, onScreen: onScreen, edited: edited, total: filmed + onScreen + edited };
    });
    rows.sort(function (a, b) { return b.total - a.total || b.filmed - a.filmed || a.person.name.localeCompare(b.person.name); });
    return rows;
  },

  /* ---------- lifetime counts ---------- */
  totals: function (personId) {
    let filmed = 0, appeared = 0, tasks = 0, onTimeTasks = 0;
    Store.items().forEach(function (it) {
      if (it.filmerId === personId && filmOnTime(it)) filmed++;
      if (it.performerIds.indexOf(personId) !== -1 && it.status === 'posted') appeared++;
      if (it.filmDate && (it.filmerId === personId || it.performerIds.indexOf(personId) !== -1)) {
        if (isAtLeast(it, 'filmed')) { tasks++; if (filmOnTime(it)) onTimeTasks++; }
      }
    });
    return {
      filmed: filmed, appeared: appeared, tasks: tasks, onTimeTasks: onTimeTasks,
      rate: tasks ? Math.round((onTimeTasks / tasks) * 100) : null
    };
  },

  /* ---------- badge shelf ---------- */
  BADGES: [
    { id: 'first',   icon: '🎬', name: 'First Reel',    hint: 'Film one item on time',        test: function (c) { return c.totals.filmed >= 1; } },
    { id: 'week1',   icon: '🔥', name: 'Week One',      hint: 'A one-week personal streak',   test: function (c) { return c.streak.best >= 1; } },
    { id: 'week3',   icon: '⚡', name: 'Three Straight', hint: 'Three weeks in a row',        test: function (c) { return c.streak.best >= 3; }, red: true },
    { id: 'month',   icon: '🏆', name: 'Month Strong',  hint: 'Four weeks in a row',          test: function (c) { return c.streak.best >= 4; }, red: true },
    { id: 'ten',     icon: '💎', name: 'Ten Weeks',     hint: 'Ten weeks in a row',           test: function (c) { return c.streak.best >= 10; }, red: true },
    { id: 'ten_films', icon: '📼', name: 'Ten Films',   hint: 'Ten on-time films',            test: function (c) { return c.totals.filmed >= 10; } },
    { id: 'onscreen',  icon: '🤼', name: 'On Screen',   hint: 'Appear in five posted items',  test: function (c) { return c.totals.appeared >= 5; } },
    { id: 'clean',   icon: '🎯', name: 'Clean Sheet',   hint: 'Every task on time (5+ tasks)', test: function (c) { return c.totals.tasks >= 5 && c.totals.rate === 100; }, red: true }
  ],

  badgesFor: function (personId) {
    const ctx = { streak: this.person(personId), totals: this.totals(personId) };
    return this.BADGES.map(function (b) {
      return { id: b.id, icon: b.icon, name: b.name, hint: b.hint, red: !!b.red, earned: !!b.test(ctx) };
    });
  }
};

/* ---------- copy that keeps the tone right ---------- */
const StreakCopy = {
  team: function (r) {
    if (r.current >= 10) return { head: 'Ten weeks and holding.', body: 'This is not luck any more. This is the standard.' };
    if (r.current >= 4)  return { head: 'A month of clean weeks.', body: 'Every planned post has gone out on time. Keep the calendar honest.' };
    if (r.current >= 2)  return { head: 'The run is real.', body: 'Two weeks clean. The third is where habits set.' };
    if (r.current === 1) return { head: 'Week one is on the board.', body: 'One clean week. Stack another on top of it.' };
    if (r.brokeThisWeek) return { head: 'Streak reset — no drama.', body: 'One post slipped. The counter starts at zero, the room does not. Next week is week one.' };
    if (!r.hasData)      return { head: 'Nothing planned yet.', body: 'Add a post date to a content item and the counter starts moving.' };
    return { head: 'Fresh start.', body: 'Every streak on this board began at zero. Plan a post, hit the date, and it begins again.' };
  },
  milestone: function (n) {
    if (n === 1)  return { kicker: 'MILESTONE', title: 'One Week Clean', body: 'Every post planned this week went out on time. That is the whole game, repeated.' };
    if (n === 4)  return { kicker: 'MILESTONE', title: 'One Month Clean', body: 'Four straight weeks without a missed post. The room is running itself.' };
    if (n === 10) return { kicker: 'MILESTONE', title: 'Ten Weeks Clean', body: 'Ten weeks. Nobody stumbles into this one — put it on the wall.' };
    return null;
  }
};
