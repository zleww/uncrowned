# UNCROWNED

A winner-stays queue manager for pickup basketball. Teams register, two play, the winner stays on court and the loser goes to the back of the queue. A team that wins 3 in a row has to rest. The app tracks today's standings, match history and all-time records, and can share a summary to a group chat.

> Work in progress: being migrated from a single HTML file to a React + Vite project. Screenshots, a live demo and the architecture diagram are coming.

## Rules

1. The first two registered teams go on court; the rest join the queue in order.
2. Declaring a winner gives the winner +1 streak and resets the loser's streak to 0.
3. Normally the loser goes to the back of the queue and the next team in the queue takes their spot.
4. When a team reaches a 3-win streak, its streak resets, the loser goes to the queue first, then the winner, and the next two queued teams take the court.
5. If nobody is waiting in the queue, the loser stays on court and the same two teams play again.
6. Removing a team takes it off the court or out of the queue; an open court spot is filled from the queue.
7. "Start New Day" clears the court, queue and today's stats. History and all-time records stay.

Every rule is covered by unit tests in `src/engine/queue.test.js`.

## Run it locally

Needs [Node.js](https://nodejs.org/) 20 or newer.

```bash
npm install
npm run dev      # starts the dev server at http://localhost:5173
npm run build    # production build into dist/
npm run preview  # serves the production build
npm test         # runs the unit tests once
npm run test:watch  # re-runs tests on every save
```

## Project structure

```
index.html              page shell
src/
  main.jsx              entry point (applies saved theme, mounts React)
  App.jsx               app state, tab navigation, action handlers
  engine/queue.js       court rules as pure functions (no DOM, no storage)
  engine/queue.test.js  unit tests for every rule
  components/           one component per page, MatchItem, Feedback (modal + toasts)
  utils/dates.js        Manila-time date helpers
  utils/storage.js      localStorage load/save that never crashes on bad data
  styles/tokens.css     colors, type, spacing (dark + light themes)
  styles/base.css       page background glow, grain texture, resets
  styles/components.css component styles
  styles/contrast.test.js  checks every text color meets WCAG contrast
```

Data is currently stored in the browser's `localStorage`.

## Tech

React 19, Vite, Vitest.
