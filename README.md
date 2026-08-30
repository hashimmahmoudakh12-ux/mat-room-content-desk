# Mat Room — Content Desk

A content-planning and consistency tracker for a small wrestling media team.
Plan items, move them through the pipeline, watch the deadlines, and keep the
team's on-time streak alive.

This is a self-contained static app. There is no build step, no server, and no
account system — open the file and it runs. All data lives in the browser's
`localStorage`, with JSON export/import for backups and for moving the board
between machines.

## Running it

```
# simplest
open index.html

# or serve it (any static server works)
npx http-server . -p 8080
```

It is a static site, so GitHub Pages serves it as-is — point Pages at the
`main` branch, root folder, and it works with no configuration.

**A fresh board starts empty.** The five-person roster is pre-filled, but there
are no content items, no ideas, and every streak reads zero — the dashboard only
ever reports work that actually happened.

Two footer buttons control that:

- **Load sample data** — fills the board with a realistic demo (roster, ~22 items
  backdated across twelve weeks, an ideas bank, a live streak) generated relative
  to today's date. Useful for seeing what a running team looks like. None of it
  is real; clear it before you start tracking.
- **Clear board** — wipes every item and idea, keeps the roster, and resets the
  streak counters.

## Loading a board

`boards/` holds ready-made boards as JSON. To load one: download the file, then
**Import** in the footer and pick it. Import replaces the whole board — items,
ideas and roster — so export first if the current one matters.

- `boards/mat-room-sept-2026.json` — the Sept 2026 schedule: two weeks, three
  posts a week (Mon motivational, Wed technique, Fri skit). Post dates are set,
  film dates are deliberately blank until the room's filming days are decided.

## Pages

| Page | What it does |
| --- | --- |
| **Dashboard** | The team streak, the 24-hour warning list, this week's slate, personal streaks, and the month's on-time board. |
| **Content Log** | Every item as a row: title, hook underneath, people, pipeline bar, and a status control. Filter by status, by assigned person, or search. |
| **Ideas Bank** | Undated concepts. Quick-add from the top strip; "Promote" turns one into a dated item on the log. |
| **Calendar** | Film dates and post dates on one month grid, colour-coded by type. |
| **Team** | Editable roster, personal streaks, trophy shelves, and the full on-time board. |

## Data model

A content item carries:

- `title`, `hook` (rendered directly under the title), `script`
- `status` — `idea → scripted → filmed → edited → posted`
- `filmerId`, `performerIds[]` — anyone on the roster
- `editorId` — always the owner; the field is locked in the UI
- `filmDate`, `postDate` — the plan
- `filmedAt`, `postedAt` — what actually happened (set automatically on a status
  change, editable afterwards)

The roster is data, not code: people can be added, renamed, retired, or removed
on the Team page. The owner (`settings.ownerId`, Hashim by default) is the sole
editor and cannot be removed.

## How the streaks work

A **week** runs Monday → Sunday.

- **Team streak** — consecutive weeks in which *every* post planned for that week
  went out on or before its planned date.
- **Personal streak** — consecutive weeks in which every filming task a person was
  assigned (as filmer or performer) was completed on or before its film date.
  Independent of the team streak.
- A week with nothing planned is **neutral**: it neither builds nor breaks a run.
- The current week only counts once everything in it is resolved. Until then the
  run shows as *in progress* rather than breaking.
- **Best ever** is computed across all recorded weeks and kept as a floor in
  `meta`, so a past achievement survives later edits.

Deadline states:

- **Due soon** — a planned date inside the next 24 hours with the work unfinished.
- **Passed** — the date is behind us and the work never landed. Shown in steel
  grey, never alarm red.

## Celebrations

- Confetti and an "on time" toast when an item is marked posted on or before its
  post date.
- A full-screen milestone at team streaks of **1 week, 4 weeks (a month), and
  10 weeks**. Each milestone fires once per run; if a streak breaks and rebuilds,
  it can be earned again.
- A trophy shelf per person (eight badges: first reel, streak tiers, ten films,
  on-screen, clean sheet).
- A monthly on-time leaderboard that only counts work that landed — no penalties,
  no negative numbers.
- Broken streaks get a lighthearted restart line, not a warning.

All motion respects `prefers-reduced-motion`.

## Design

Typography-first sports-editorial layout: condensed uppercase display type
(Barlow Condensed) against Inter for UI, hierarchy carried by type size, sharp
1px corners, hairline rules, and generous whitespace.

Palette: ink black `#0B0B0C`, signal red `#DA291C`, bone `#F2EFE8`, with cold
steel `#6E757C` / `#E3E2DE` as the secondary neutral for cards and dividers.
Green and amber appear only as small state marks (completed / due soon).

## Files

```
.
├── index.html            page shell, nav, modal + overlay mounts
├── css/style.css         the whole design system
└── js/
    ├── data.js           state, persistence, empty + sample boards, date helpers
    ├── streaks.js        streak engine, leaderboard, badges, copy
    ├── fx.js             confetti, toasts, milestone overlay, flame marks
    ├── forms.js          modal, item/idea editors, status transitions
    ├── view-dashboard.js
    ├── view-log.js
    ├── view-ideas.js
    ├── view-calendar.js
    ├── view-team.js
    └── app.js            hash router, chrome wiring, import/export
```
