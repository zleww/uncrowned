import { useEffect, useRef, useState } from 'react';
import * as engine from './engine/queue.js';
import { getTodayString } from './utils/dates.js';
import { loadState, saveState, saveTheme } from './utils/storage.js';
import { downloadFile, matchesToCSV, stateToJSON } from './utils/export.js';
import { useMediaQuery } from './hooks/useMediaQuery.js';
import { useFeedback } from './components/Feedback.jsx';
import { MoonIcon, PlusIcon, ShareIcon, SunIcon } from './components/Icons.jsx';
import TabBar, { TABS } from './components/TabBar.jsx';
import CourtPage from './components/CourtPage.jsx';
import TodayPage from './components/TodayPage.jsx';
import HistoryPage from './components/HistoryPage.jsx';
import AllTimePage from './components/AllTimePage.jsx';
import AddTeamSheet from './components/AddTeamSheet.jsx';

// At this width the court and today's stats fit side by side.
const WIDE_QUERY = '(min-width: 900px)';

const ordinal = (n) => {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th';
  return `${n}${suffix}`;
};

// Manila date, re-checked every 30s so "today" rolls over at midnight even
// if nobody touches the app.
function useToday() {
  const [today, setToday] = useState(() => getTodayString());
  useEffect(() => {
    const timer = setInterval(() => setToday(getTodayString()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return today;
}

export default function App() {
  const [state, setState] = useState(loadState);
  const [page, setPage] = useState('main');
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme'));
  const today = useToday();
  const wide = useMediaQuery(WIDE_QUERY);
  const { confirm, notify, showText } = useFeedback();
  // The latest state, for callbacks that outlive a render (a toast's Undo
  // button is created with the state of the moment it was shown).
  const stateRef = useRef(state);
  const addSheetRef = useRef(null);

  useEffect(() => {
    stateRef.current = state;
    saveState(state);
  }, [state]);

  // Sets the state right away, so a second tap before React re-renders
  // already sees the new state.
  function commit(next) {
    stateRef.current = next;
    setState(next);
  }

  // Runs an action and shows a toast with Undo. Undo puts back the whole
  // state from before, but only if nothing else has changed since.
  function commitWithUndo(next, message, undoneMessage) {
    const before = stateRef.current;
    commit(next);
    notify(message, {
      key: 'result',
      action: {
        label: 'Undo',
        onClick: () => {
          if (stateRef.current !== next) {
            notify("That can't be undone anymore.", { key: 'result' });
            return;
          }
          commit(before);
          notify(undoneMessage, { key: 'result' });
        },
      },
    });
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    saveTheme(next);
    setTheme(next);
  }

  function handleRegister(name) {
    const result = engine.registerTeam(stateRef.current, name);
    if (result.status !== 'ok') return { status: result.status };
    commit(result.state);
    const message = result.state.activeMatch.includes(result.name)
      ? `${result.name} is on court`
      : `${result.name} joined the queue (#${result.state.queue.length})`;
    notify(message);
    return { status: 'ok', message };
  }

  function handleWin(idx) {
    const current = stateRef.current;
    const winner = current.activeMatch[idx];
    const loser = current.activeMatch[idx === 0 ? 1 : 0];
    const next = engine.recordResult(current, idx);
    commit(next);
    const streak = next.todayStats[winner].streak;
    const matchId = next.allMatchLogs[0].id;
    notify(
      streak === 0
        ? `${winner} beat ${loser}: ${engine.STREAK_LIMIT} straight, ${winner} rests`
        : `${winner} beat ${loser}: ${ordinal(streak)} win in a row`,
      { key: 'result', action: { label: 'Undo', onClick: () => handleUndo(matchId) } },
    );
  }

  // Undo is only for the newest game, and only while it is still the newest:
  // `matchId` stops a stale button from undoing a later game.
  function handleUndo(matchId) {
    const current = stateRef.current;
    const match = engine.getUndoableMatch(current);
    const next = engine.undoLastResult(current, matchId);
    if (next === current) {
      notify("That game can't be undone anymore.", { key: 'result' });
      return;
    }
    commit(next);
    notify(`Undone: ${match.winner} def. ${match.loser}`, { key: 'result' });
  }

  // No confirm box: removing is quick to undo from the toast.
  function handleRemoveTeam(name) {
    commitWithUndo(engine.removeTeam(stateRef.current, name), `${name} removed`, `${name} is back`);
  }

  async function handleRemoveAllTimeTeam(name) {
    const ok = await confirm({
      title: `Delete ${name}'s record?`,
      message: "This removes their all-time record and takes them out of today's rotation.",
      confirmLabel: 'Delete record',
      danger: true,
    });
    if (!ok) return;
    commitWithUndo(engine.removeTeamEverywhere(stateRef.current, name), `${name}'s record deleted`, `${name}'s record is back`);
  }

  async function handleDeleteMatch(id) {
    const match = stateRef.current.allMatchLogs.find((m) => m.id === id);
    if (!match) return;
    const ok = await confirm({
      title: 'Delete this match?',
      message: `${match.winner} def. ${match.loser}. The win and loss come off the records. Streaks and the queue stay as they are.`,
      confirmLabel: 'Delete match',
      danger: true,
    });
    if (!ok) return;
    commitWithUndo(engine.removeMatch(stateRef.current, id, getTodayString()), 'Match deleted', 'Match is back');
  }

  async function handleClearHistory() {
    const ok = await confirm({
      title: 'Clear all match history?',
      message: 'Every past match is deleted. Teams on court, the queue and all-time records stay. Export a backup first if you want to keep it.',
      confirmLabel: 'Clear history',
      danger: true,
    });
    if (!ok) return;
    commitWithUndo(engine.clearHistory(stateRef.current), 'Match history cleared', 'Match history is back');
  }

  async function handleNewDay() {
    const ok = await confirm({
      title: 'Start a new day?',
      message: "Clears the court, the queue and today's leaderboard. Match history and all-time records stay.",
      confirmLabel: 'Start new day',
      danger: true,
    });
    if (!ok) return;
    commitWithUndo(engine.startNewDay(stateRef.current), 'New day started', 'Back to the previous session');
  }

  function handleExport(format) {
    const day = getTodayString();
    if (format === 'csv') {
      downloadFile(`uncrowned-matches-${day}.csv`, matchesToCSV(state.allMatchLogs), 'text/csv;charset=utf-8');
      notify('Match history saved as CSV');
    } else {
      downloadFile(`uncrowned-backup-${day}.json`, stateToJSON(state), 'application/json');
      notify('Backup saved as JSON');
    }
  }

  async function handleShare() {
    const summary = engine.buildSummary(state);
    if (!summary) {
      notify('Nothing to share yet: no teams or matches today.');
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share(summary);
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return; // user closed the share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(summary.text);
      notify('Summary copied. Paste it in the GC.');
    } catch {
      showText({ title: 'Copy summary', message: 'Copy this and paste it in the GC.', text: summary.text });
    }
  }

  const undoable = engine.getUndoableMatch(state);
  // On wide screens "Today" sits beside the court, so it isn't a tab.
  const tabs = wide ? TABS.filter((t) => t.key !== 'today') : TABS;
  const view = wide && page === 'today' ? 'main' : page;
  const split = wide && view === 'main';

  return (
    <div className="container">
      <header className="top-bar">
        <h1 className="brand">
          Uncrowned
          <span className="brand-dot" aria-hidden="true" />
        </h1>
        <button className="icon-btn framed" onClick={handleShare} aria-label="Share today's summary" title="Share summary">
          <ShareIcon />
        </button>
        <button
          className="icon-btn framed"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </header>

      <TabBar tabs={tabs} current={view} onChange={setPage} />

      {/* All pages stay mounted (just hidden) so typed input and the history
          filter survive tab switches. */}
      <main className={split ? 'split' : undefined}>
        <CourtPage
          active={view === 'main'}
          wide={wide}
          state={state}
          onNewDay={handleNewDay}
          onWin={handleWin}
          onRemove={handleRemoveTeam}
          onRegister={handleRegister}
          onOpenAdd={() => addSheetRef.current?.open()}
          undoable={undoable}
          onUndo={handleUndo}
        />
        <TodayPage
          active={view === 'today' || split}
          asSidePanel={wide}
          state={state}
          today={today}
          undoableId={undoable?.id}
          onUndo={handleUndo}
          onDeleteMatch={handleDeleteMatch}
        />
        <HistoryPage
          active={view === 'history'}
          state={state}
          today={today}
          undoableId={undoable?.id}
          onUndo={handleUndo}
          onClearHistory={handleClearHistory}
          onDeleteMatch={handleDeleteMatch}
          onExport={handleExport}
        />
        <AllTimePage active={view === 'alltime'} state={state} onRemove={handleRemoveAllTimeTeam} />
      </main>

      {!wide && view === 'main' && (
        <button className="fab" onClick={() => addSheetRef.current?.open()} aria-label="Add a team" aria-haspopup="dialog">
          <PlusIcon />
        </button>
      )}
      {!wide && (
        <AddTeamSheet
          ref={addSheetRef}
          onRegister={handleRegister}
          queueLength={state.queue.length}
          onCourt={state.activeMatch.length}
        />
      )}
    </div>
  );
}
