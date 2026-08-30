# AGENTS.md

## Project Overview

This repository is Richard's personal portfolio site built with:

- React
- TypeScript
- Vite
- LESS
- React Router
- GitHub
- Cloudflare Pages

The repository also contains **DartSync**, a darts scoring application available at:

`/dartsync`

DartSync is actively being developed and is currently the primary focus.

---

# Development Workflow

## Important: Work Incrementally

Make changes in small, understandable steps.

When working interactively with Richard:

1. Explain the next change before making it.
2. Prefer one logical change at a time.
3. Do not refactor unrelated code while implementing a feature.
4. Do not replace working implementations merely because another approach is cleaner.
5. Preserve existing behavior unless the requested change requires modifying it.
6. After significant changes, verify the application still builds.
7. Before large refactors, explain why the refactor is beneficial.

Richard wants to understand and participate in the React development rather than have large portions of the application rewritten automatically.

---

# DartSync

## Purpose

DartSync is intended to become a polished, installable darts scoring application.

Current primary game:

**House Rules Cricket**

The application currently has three primary UI stages:

1. Select Game
2. Select Players
3. Scoring

---

# House Rules Cricket

## Targets

The required targets are:

- 15
- 16
- 17
- 18
- 19
- 20
- Bull

Each target requires **3 marks** to close.

## Marks

- Single = 1 mark
- Double = 2 marks
- Triple = 3 marks

However, DartSync intentionally does NOT infer singles/doubles/triples from the dartboard.

The scorer manually taps the target the appropriate number of times.

Example:

A triple 20 is entered by tapping 20 three times.

There is no traditional Cricket point scoring.

---

# Closing and Winning

The first player to close every Cricket target becomes the:

**Provisional Winner**

The game does NOT immediately end.

Every other player receives one comeback turn.

The game therefore uses these phases:

- `normal`
- `comeback`
- `bullseye-showdown`
- `complete`

---

# Comeback Rules

Once the first player closes all targets:

1. That player becomes the provisional winner.
2. Every other player receives one final 3-dart comeback turn.
3. A comeback player who fails to close all targets cannot enter the showdown.
4. A comeback player who closes all targets joins the Bullseye Showdown.

If nobody else closes all targets during their comeback turn, the provisional winner wins.

---

# Bullseye Showdown

Bullseye Showdown counting begins **the moment a player closes all Cricket targets**.

Bulls hit before closing all targets do NOT count toward the showdown.

Once closed:

- Single Bull = 1 showdown bull
- Double Bull = 2 showdown bulls

These are still entered manually through taps.

## Important Example

Player 1 closes their final Cricket target with dart 1.

They then hit:

- dart 2: Single Bull
- dart 3: miss

Player 1 enters the showdown with:

`1 showdown bull`

Those bulls must be preserved when the formal showdown begins.

---

# Multi-Player Showdown

The showdown supports more than two players.

A player is eliminated when they finish their showdown turn with fewer showdown bulls than the current highest opponent score.

Example:

- Richard: 2
- Chris: 3
- Mike: 1

When Richard completes his turn at 2, he is behind Chris and is eliminated.

Mike is also eliminated if he completes his turn while still below the current leader.

Play continues among the remaining players until only one player remains.

## Ties

Tied players remain alive.

Example:

- Richard: 3
- Chris: 3
- Mike: 2

Richard and Chris remain in the showdown.

Mike must catch them or is eliminated.

The UI should display:

`Showdown Leader: Tied`

when the highest score is shared.

---

# Undo

Undo is supported.

Undo must correctly handle:

- normal Cricket marks
- showdown bulls
- closing a target
- undoing a player's final closing mark
- provisional-winner state
- showdown leader recalculation

If undoing the mark that originally caused the provisional winner to close all targets:

- remove their closed-out state
- remove provisional-winner status
- return the game to normal play
- clear the comeback sequence as appropriate

Do not break these behaviors when modifying scoring logic.

---

# Ending a Game

If a game is still active, manually ending it requires confirmation.

Completed games may be finished without that confirmation.

---

# Player Management — Planned

DartSync currently uses temporary/mock player data.

Player management will eventually support:

- Create player
- Edit player
- Player name
- Player statistics
- Wins
- Games played
- Player history
- Reset/clear an individual player's statistics
- Delete/remove a player

Resetting statistics and deleting a player are different actions.

## Reset Player Stats

Resetting should preserve the player but clear their accumulated statistics.

## Delete Player

Deleting removes the player from the active player list.

When persistent game history is implemented, carefully determine how historical games involving deleted players are retained.

Deleting a player should NOT corrupt historical game records.

---

# Persistence — Planned

Persistent storage is expected to use:

**Cloudflare D1**

Eventually persist:

- Players
- Player statistics
- Games
- Game results
- Winners
- Game history

The application should survive browser refreshes and future sessions.

Do not allow deleting a player to destroy historical game integrity.

---

# Statistics — Planned

Potential statistics include:

- Wins
- Games played
- Win percentage
- Game history
- Head-to-head results

Do not overbuild statistics until the persistent data model is established.

---

# Current Scoring UI

The desktop scoring screen is approximately:

- Left scoring panel: 33.333%
- Dartboard area: 66.667%

The overall scoring UI is constrained to:

`100vh`

The entire page should NOT vertically scroll during desktop scoring.

The left scoring panel should independently scroll when its content exceeds the viewport.

The dartboard remains visible.

---

# Scoring Panel

The left panel currently contains:

- Game label
- Active player name
- Player/game status
- Cricket scoring controls
- Next Player button
- Up Next players
- Compact Cricket marks

The visual hierarchy should emphasize:

1. Active player
2. Cricket scoring
3. Next Player action
4. Waiting players

---

# Cricket Mark SVG

Text marks such as:

- `/`
- `X`
- circled X

were replaced with a custom SVG.

The SVG contains three visual paths:

- `.state-1`
- `.state-2`
- `.state-3`

These progressively illuminate as marks are recorded.

Expected behavior:

### 0 marks

All three paths are faint/inactive.

### 1 mark

`state-1` active.

### 2 marks

`state-1` and `state-2` active.

### 3 marks

All three states active.

The same SVG system is used for:

- main scoring targets
- compact marks for waiting players

Do not replace this with text glyphs.

Do not change the SVG path classes back to IDs. Multiple SVG instances are rendered on the page, so classes intentionally avoid duplicate DOM IDs.

---

# Dartboard

The dartboard is an interactive SVG.

It scales responsively while retaining click/tap behavior.

Current maximum desktop width is approximately:

`900px`

Cricket targets visually indicate how many marks remain.

Closed targets return to the normal/muted board appearance.

## Mobile Tap Behavior

Interactive SVG wedges use:

`-webkit-tap-highlight-color: transparent`

This intentionally prevents mobile browsers from flashing a rectangular SVG bounding-box highlight when a dartboard segment is tapped.

Do not remove this without a replacement.

---

# Current UI Direction

The desired DartSync visual style is based on a modern dark analytics/dashboard aesthetic.

Design characteristics:

- Very dark navy/charcoal page background
- Slightly lighter cards and panels
- Thin cool-gray borders
- Restrained blue/cyan accents
- Bright white primary text
- Muted blue-gray secondary text
- Modest corner radii
- Minimal shadows
- Strong information hierarchy
- Clean spacing
- Avoid excessive decoration

Sections should generally be separated through:

- subtle background changes
- thin borders
- spacing

rather than large shadows or heavy outlines.

The scoring UI should feel like a polished application/dashboard, not a collection of generic HTML buttons.

---

# Next Player

The Next Player button is intentionally visually prominent.

It currently uses a light/white treatment against the dark scoring UI because advancing the turn is the primary action.

Do not make scoring targets compete visually with the Next Player action.

---

# Up Next

Waiting-player cards display:

- player initials/avatar
- player name
- `NEXT` indicator for the next player
- compact Cricket marks

Eliminated players must disappear from Up Next during Bullseye Showdown.

During showdown, the list should be derived from the active `showdownQueue`, not all original game players.

---

# PWA

DartSync has basic PWA support.

PWA assets live under:

`public/dartsync/`

They include:

- `favicon.svg`
- `favicon.ico`
- `favicon-96x96.png`
- `apple-touch-icon.png`
- `web-app-manifest-192x192.png`
- `web-app-manifest-512x512.png`
- `site.webmanifest`
- `sw.js`

The manifest uses:

- Name: DartSync
- Short name: DartSync
- ID: `/dartsync`
- Start URL: `/dartsync`
- Scope: `/dartsync`
- Display: `standalone`

DartSync dynamically switches to its own favicon and manifest while the `/dartsync` React component is mounted.

The service worker is registered from DartSync.

Chrome has verified that:

- the manifest is recognized
- the service worker is activated/running
- DartSync is installable

## Offline Support

The current service worker is intentionally minimal.

True offline application caching has NOT yet been implemented.

Do not assume DartSync is fully offline-capable.

This can be added later.

---

# Routing

DartSync is served from:

`/dartsync`

It is part of the larger portfolio React application.

Changes made specifically for DartSync should avoid unintentionally altering the rest of the portfolio.

---

# Hosting

Repository:

`creo11/richard-portfolio`

Production hosting:

**Cloudflare Pages**

Production branch:

`main`

Build command:

`npm run build`

Output directory:

`dist`

GitHub pushes to `main` trigger Cloudflare Pages deployments.

---

# Build Expectations

Before committing significant DartSync changes, run:

`npm run build`

TypeScript warnings/errors that fail the production build must be resolved before deployment.

A previous Vite warning about JavaScript chunks larger than 500 kB is known and is not currently blocking deployment.

Code splitting may be addressed later.

---

# Git Workflow

Do not automatically commit every small experimental UI change.

Commit at meaningful checkpoints.

Before committing:

1. Run `git status`.
2. Review the changed files.
3. Stage only intended files.
4. Run the production build when appropriate.
5. Commit with a descriptive message.
6. Push to `main` when the checkpoint is ready for Cloudflare deployment.

Recent known checkpoint:

`f9e21cf Add DartSync PWA support and refine scoring UI`

---

# Remaining Major Work

The approximate remaining feature areas are:

## 1. Scoring UI Polish

Continue improving:

- desktop layout
- left-panel styling
- dartboard-area styling
- responsive behavior
- mobile usability
- tablet usability
- fullscreen experience
- visual consistency

## 2. Player Management

Implement persistent player management including:

- create
- edit
- reset statistics
- delete player

## 3. Cloudflare D1 Persistence

Persist:

- players
- statistics
- games
- results
- history

## 4. Statistics and History

Build useful player/game statistics once persistence exists.

## 5. Production Polish

Eventually address:

- offline PWA support
- loading/error states
- edge cases
- responsive testing
- accessibility
- performance/code splitting
- final production testing

---

# Current Priority

Unless Richard requests otherwise, continue with:

**DartSync scoring UI polish**

Use the dark dashboard visual direction described above.

Preserve the working House Rules Cricket engine while modifying presentation.

Do not refactor the game engine as part of visual work unless necessary.