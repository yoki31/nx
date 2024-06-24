'use client';
// TODO@ben: refactor to use HeadlessUI tabs
import cx from 'classnames';
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

export const TabContext = createContext('');
export const SELECTED_TAB_KEY = 'selectedTab';
export const TAB_SELECTED_EVENT = 'tabSelectedEvent';

export function Tabs({
  labels,
  children,
}: {
  labels: string[];
  children: ReactNode;
}) {
  const [currentTab, setCurrentTab] = useState(labels[0]);
  useEffect(() => {
    const handleTabSelectedEvent = () => {
      const selectedTab = localStorage.getItem(SELECTED_TAB_KEY);
      if (selectedTab && labels.includes(selectedTab)) {
        setCurrentTab(selectedTab);
      }
    };
    handleTabSelectedEvent();
    window.addEventListener(TAB_SELECTED_EVENT, handleTabSelectedEvent);
    return () =>
      window.removeEventListener(TAB_SELECTED_EVENT, handleTabSelectedEvent);
  }, [labels]);

  return (
    <TabContext.Provider value={currentTab}>
      <section>
        <div className="not-prose ">
          <div className="border-b border-slate-200 dark:border-slate-800">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {labels.map((label: string) => (
                <button
                  key={label}
                  role="tab"
                  aria-selected={label === currentTab}
                  onClick={() => {
                    localStorage.setItem(SELECTED_TAB_KEY, label);
                    window.dispatchEvent(new Event(TAB_SELECTED_EVENT));
                    setCurrentTab(label);
                  }}
                  className={cx(
                    'whitespace-nowrap border-b-2 border-transparent p-2 text-sm font-medium',
                    label === currentTab
                      ? 'border-blue-500 text-slate-800 dark:border-sky-500 dark:text-slate-300'
                      : 'text-slate-500 hover:border-blue-500 hover:text-slate-800 dark:text-slate-400 dark:hover:border-sky-500 dark:hover:text-slate-300'
                  )}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>
        {children}
      </section>
    </TabContext.Provider>
  );
}

export function Tab({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const currentTab = useContext(TabContext);

  if (label !== currentTab) {
    return null;
  }

  return (
    <div className="prose prose-slate dark:prose-invert mt-4 max-w-none">
      {children}
    </div>
  );
}
