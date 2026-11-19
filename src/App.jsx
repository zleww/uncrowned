import { useState } from 'react';
import * as actions from './state/actions.js';
import { loadState, saveState, saveTheme } from './utils/storage.js';
import CourtPage from './components/CourtPage.jsx';
import TodayPage from './components/TodayPage.jsx';
import HistoryPage from './components/HistoryPage.jsx';
import AllTimePage from './components/AllTimePage.jsx';

const TABS = [
  { key: 'main', label: 'Court' },
  { key: 'today', label: "Today's Stats" },
  { key: 'history', label: 'Game History' },
  { key: 'alltime', label: 'All-Time' },
];

// Native alert/confirm/prompt are kept on purpose for now (no behavior change).
// Milestone 3 replaces them with an accessible modal + toast system.

function copyToClipboard(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => alert('Summary copied to clipboard!'))
    .catch(() => prompt('Copy summary text:', text));
}

export default function App() {
  const [state, setState] = useState(loadState);
  const [page, setPage] = useState('main');
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme'));

  // Every change goes through here so it is saved right away, like saveAll().
  function commit(next) {
    setState(next);
    saveState(next);
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    saveTheme(next);
    setTheme(next);
  }

  function handleRegister(name) {
    const { state: next, status } = actions.registerTeam(state, name);
    if (status === 'duplicate') {
      alert('This team is already on court or in the queue!');
      return false;
    }
    if (status !== 'ok') return false;
    commit(next);
    return true;
  }

  function handleRemoveTeam(name) {
    if (!confirm(`Remove "${name}" from today's session?`)) return;
    commit(actions.deleteTeam(state, name));
  }

  function handleRemoveAllTimeTeam(name) {
    if (
      !confirm(
        `Permanently remove "${name}" from the All-Time Leaderboard? This also removes them from today's rotation.`,
      )
    )
      return;
    commit(actions.deleteAllTimeTeam(state, name));
  }

  function handleDeleteMatch(id) {
    const match = state.allMatchLogs.find((m) => m.id === id);
    if (!match) return;
    if (!confirm(`Delete match record: "${match.winner} def. ${match.loser}"? This will reverse their stats.`)) return;
    commit(actions.removeMatch(state, id));
  }

  function handleClearHistory() {
    if (
      !confirm(
        'Are you sure you want to clear ALL past match records? (Active teams and standings will remain, but match history will be emptied.)',
      )
    )
      return;
    commit(actions.clearAllHistory(state));
  }

  function handleNewDay() {
    if (
      !confirm(
        "Start a new day? This will clear the active court and queue, and reset today's leaderboard. Past game history and all-time records remain intact.",
      )
    )
      return;
    commit(actions.startNewDay(state));
  }

  function handleShare() {
    const summary = actions.buildTodaySummary(state);
    if (!summary) {
      alert('No matches or teams recorded today to share.');
      return;
    }
    if (navigator.share) {
      navigator.share(summary).catch(() => copyToClipboard(summary.text));
    } else {
      copyToClipboard(summary.text);
    }
  }

  return (
    <div className="container">
      {/* Top Bar */}
      <div className="top-bar">
        <h1>UNCROWNED</h1>
        <button id="themeToggleBtn" className="theme-toggle-btn" onClick={toggleTheme}>
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="nav-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`nav-btn${page === t.key ? ' active' : ''}`}
            onClick={() => setPage(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* All pages stay mounted (only hidden with CSS), like the original, so
          typed input and the history filter survive tab switches. */}
      <CourtPage
        active={page === 'main'}
        state={state}
        onShare={handleShare}
        onNewDay={handleNewDay}
        onWin={(idx) => commit(actions.recordResult(state, idx))}
        onRemove={handleRemoveTeam}
        onRegister={handleRegister}
      />
      <TodayPage
        active={page === 'today'}
        state={state}
        onRemove={handleRemoveTeam}
        onDeleteMatch={handleDeleteMatch}
      />
      <HistoryPage
        active={page === 'history'}
        state={state}
        onClearHistory={handleClearHistory}
        onDeleteMatch={handleDeleteMatch}
      />
      <AllTimePage active={page === 'alltime'} state={state} onRemove={handleRemoveAllTimeTeam} />
    </div>
  );
}
