import { MindMapItem } from '@/lib/definitions';
import React, { createContext, useState, useContext, ReactNode } from 'react';

interface HeaderContextType {
  headerContent: ReactNode;
  chat_id: number;
  setChatId: (id: number) => void;
  mindmap_id: number;
  setMindmapId: (id: number) => void;
  current_problem_id: number;
  setCurrentProblemId: (id: number) => void;
  current_solution: string;
  setCurrentSolution: (solution: string) => void;
  current_problem_content: string;
  setCurrentProblemContent: (content: string) => void;
  current_mindmap: MindMapItem | null;
  setCurrentMindmap: (mindmap: MindMapItem | null) => void;
  setHeaderContent: (content: ReactNode) => void;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export const useHeader = (): HeaderContextType => {
  const context = useContext(HeaderContext);
  if (!context) {
    throw new Error('useHeader must be used within a HeaderProvider');
  }
  return context;
};

interface HeaderProviderProps {
  children: ReactNode;
}

export const HeaderProvider: React.FC<HeaderProviderProps> = ({ children }) => {
  const [headerContent, setHeaderContent] = useState<ReactNode>(null);
  const [chat_id, setChatId] = useState<number | null>(null);
  const [mindmap_id, setMindmapId] = useState<number | null>(null);
  const [current_problem_id, setCurrentProblemId] = useState<number | null>(null);
  const [current_solution, setCurrentSolution] = useState<string>("");
  const [current_problem_content, setCurrentProblemContent] = useState<string>("");
  const [current_mindmap, setCurrentMindmap] = useState<MindMapItem>(null);

  return (
    <HeaderContext.Provider value={{
      headerContent, setHeaderContent, chat_id, setChatId, mindmap_id, setMindmapId,
      current_problem_id, setCurrentProblemId, current_solution, setCurrentSolution,
      current_problem_content, setCurrentProblemContent, current_mindmap, setCurrentMindmap
    }}>
      {children}
    </HeaderContext.Provider>
  );
};

export const HeaderWrapper: React.FC = () => {
  const { headerContent } = useHeader();
  return headerContent
};
