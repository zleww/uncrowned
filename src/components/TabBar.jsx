import { useRef } from 'react';
import { CourtIcon, HistoryIcon, TodayIcon, TrophyIcon } from './Icons.jsx';

export const TABS = [
  { key: 'main', label: 'Court', Icon: CourtIcon },
  { key: 'today', label: 'Today', Icon: TodayIcon },
  { key: 'history', label: 'History', Icon: HistoryIcon },
  { key: 'alltime', label: 'All-Time', Icon: TrophyIcon },
];

// Tabs following the ARIA tabs pattern: only the selected tab is in the Tab
// order, and the arrow keys (plus Home/End) move between tabs.
// On phones CSS pins this bar to the bottom of the screen, within thumb
// reach; on wide screens it sits under the header.
export default function TabBar({ tabs, current, onChange }) {
  const listRef = useRef(null);

  function onKeyDown(e) {
    const i = tabs.findIndex((t) => t.key === current);
    const next = {
      ArrowRight: (i + 1) % tabs.length,
      ArrowLeft: (i - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    onChange(tabs[next].key);
    listRef.current.querySelectorAll('[role="tab"]')[next].focus();
  }

  return (
    <nav className="tab-bar" aria-label="Sections">
      <div role="tablist" ref={listRef} className="tab-list" onKeyDown={onKeyDown}>
        {tabs.map(({ key, label, Icon }) => (
          <button
            key={key}
            id={`tab-${key}`}
            role="tab"
            type="button"
            aria-selected={current === key}
            aria-controls={`page-${key}`}
            tabIndex={current === key ? 0 : -1}
            className="tab"
            onClick={() => onChange(key)}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
