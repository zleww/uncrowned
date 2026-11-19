import { useEffect, useState } from 'react';
import * as engine from './engine/queue.js';
import { getTodayString } from './utils/dates.js';
import { loadState, saveState, saveTheme } from './utils/storage.js';
import { useFeedback } from './components/Feedback.jsx';
import CourtPage from './components/CourtPage.jsx';
import TodayPage from './components/TodayPage.jsx';
import HistoryPage from './components/HistoryPage.jsx';
import AllTimePage from './components/AllTimePage.jsx';

const TABS = [
  { key: 'main', label: 'Court' },
  { key: 'today', label: 'Today' },
  { key: 'history', label: 'History' },
  { key: 'alltime', label: 'All-Time' },
];

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

const ShareIcon = () => (
  <svg {...iconProps}>
    <path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  </svg>
);

const SunIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const MoonIcon = () => (
  <svg {...iconProps}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

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
  const { confirm, notify, showText } = useFeedback();

  useEffect(() => saveState(state), [state]);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    saveTheme(next);
    setTheme(next);
  }

  function handleRegister(name) {
    const result = engine.registerTeam(state, name);
    if (result.status === 'ok') {
      setState(result.state);
      notify(
        result.state.activeMatch.includes(result.name)
          ? `${result.name} is on court`
          : `${result.name} joined the queue (#${result.state.queue.length})`,
      );
    }
    return result.status;
  }

  function handleWin(idx) {
    const winner = state.activeMatch[idx];
    const loser = state.activeMatch[idx === 0 ? 1 : 0];
    const next = engine.recordResult(state, idx);
    setState(next);
    const streak = next.todayStats[winner].streak;
    notify(
      streak === 0
        ? `${winner} beat ${loser}: ${engine.STREAK_LIMIT} straight, ${winner} rests`
        : `${winner} beat ${loser}: ${ordinal(streak)} win in a row`,
    );
  }

  async function handleRemoveTeam(name) {
    const ok = await confirm({
      title: `Remove ${name}?`,
      message: "They leave the court or queue and today's stats. All-time records stay.",
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!ok) return;
    setState((s) => engine.removeTeam(s, name));
    notify(`${name} removed`);
  }

  async function handleRemoveAllTimeTeam(name) {
    const ok = await confirm({
      title: `Delete ${name}'s record?`,
      message: "This permanently removes their all-time record and takes them out of today's rotation.",
      confirmLabel: 'Delete record',
      danger: true,
    });
    if (!ok) return;
    setState((s) => engine.removeTeamEverywhere(s, name));
    notify(`${name}'s record deleted`);
  }

  async function handleDeleteMatch(id) {
    const match = state.allMatchLogs.find((m) => m.id === id);
    if (!match) return;
    const ok = await confirm({
      title: 'Delete this match?',
      message: `${match.winner} def. ${match.loser}. Their win and loss are taken back off the stats.`,
      confirmLabel: 'Delete match',
      danger: true,
    });
    if (!ok) return;
    setState((s) => engine.removeMatch(s, id, getTodayString()));
    notify('Match deleted');
  }

  async function handleClearHistory() {
    const ok = await confirm({
      title: 'Clear all match history?',
      message: 'Every past match is deleted. Teams on court, the queue and all-time records stay.',
      confirmLabel: 'Clear history',
      danger: true,
    });
    if (!ok) return;
    setState((s) => engine.clearHistory(s));
    notify('Match history cleared');
  }

  async function handleNewDay() {
    const ok = await confirm({
      title: 'Start a new day?',
      message: "Clears the court, the queue and today's leaderboard. Match history and all-time records stay.",
      confirmLabel: 'Start new day',
      danger: true,
    });
    if (!ok) return;
    setState((s) => engine.startNewDay(s));
    notify('New day started');
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

      <nav className="nav-tabs" role="tablist" aria-label="Sections">
        {TABS.map((t) => (
          <button
            key={t.key}
            id={`tab-${t.key}`}
            role="tab"
            aria-selected={page === t.key}
            aria-controls={`page-${t.key}`}
            className="nav-btn"
            onClick={() => setPage(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* All pages stay mounted (just hidden) so typed input and the history
          filter survive tab switches. */}
      <main>
        <CourtPage
          active={page === 'main'}
          state={state}
          onNewDay={handleNewDay}
          onWin={handleWin}
          onRemove={handleRemoveTeam}
          onRegister={handleRegister}
        />
        <TodayPage active={page === 'today'} state={state} today={today} onDeleteMatch={handleDeleteMatch} />
        <HistoryPage
          active={page === 'history'}
          state={state}
          today={today}
          onClearHistory={handleClearHistory}
          onDeleteMatch={handleDeleteMatch}
        />
        <AllTimePage active={page === 'alltime'} state={state} onRemove={handleRemoveAllTimeTeam} />
      </main>
    </div>
  );
}
