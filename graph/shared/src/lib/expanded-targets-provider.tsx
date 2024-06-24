import { createContext, useState } from 'react';

export const ExpandedTargetsContext = createContext<{
  expandedTargets?: string[];
  setExpandedTargets?: (expandedTargets: string[]) => void;
  toggleTarget?: (targetName: string) => void;
  collapseAllTargets?: () => void;
}>({});

export const ExpandedTargetsProvider = ({ children }) => {
  const [expandedTargets, setExpandedTargets] = useState<string[]>([]);

  const toggleTarget = (targetName: string) => {
    setExpandedTargets((prevExpandedTargets) => {
      if (prevExpandedTargets.includes(targetName)) {
        return prevExpandedTargets.filter((name) => name !== targetName);
      }
      return [...prevExpandedTargets, targetName];
    });
  };

  const collapseAllTargets = () => {
    setExpandedTargets([]);
  };

  return (
    <ExpandedTargetsContext.Provider
      value={{
        expandedTargets,
        setExpandedTargets,
        toggleTarget,
        collapseAllTargets,
      }}
    >
      {children}
    </ExpandedTargetsContext.Provider>
  );
};
