import React from 'react';
import { X, FileCode, FileText, FileJson } from 'lucide-react';
import { cn } from '../lib/utils';

export interface TabItem {
  path: string;
  isDirty?: boolean;
}

interface EditorTabsProps {
  tabs: TabItem[];
  activeTab: string | null;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string, e: React.MouseEvent) => void;
}

function getFileIcon(path: string) {
  const ext = path.split('.').pop()?.toLowerCase();
  if (ext === 'json') return <FileJson size={13} className="text-amber-400 shrink-0" />;
  if (['ts', 'tsx', 'js', 'jsx'].includes(ext || '')) return <FileCode size={13} className="text-blue-400 shrink-0" />;
  return <FileText size={13} className="text-muted-foreground shrink-0" />;
}

export function EditorTabs({ tabs, activeTab, onSelectTab, onCloseTab }: EditorTabsProps) {
  if (tabs.length === 0) return null;

  return (
    <div className="h-9 bg-[#18181b] border-b border-border/50 flex items-center overflow-x-auto scrollbar-none select-none px-1">
      {tabs.map((tab) => {
        const isActive = tab.path === activeTab;
        const fileName = tab.path.split('/').pop() || tab.path;
        return (
          <div
            key={tab.path}
            onClick={() => onSelectTab(tab.path)}
            title={tab.path}
            className={cn(
              "group h-8 px-3 flex items-center gap-2 text-[12px] font-sans border-r border-border/30 cursor-pointer transition-colors max-w-[200px] shrink-0",
              isActive
                ? "bg-[#1e1e1e] text-foreground border-t-2 border-t-[#007acc] font-medium"
                : "bg-transparent text-muted-foreground hover:bg-[#202024] hover:text-foreground"
            )}
          >
            {getFileIcon(tab.path)}
            <span className="truncate">{fileName}</span>
            {tab.isDirty ? (
              <span
                onClick={(e) => onCloseTab(tab.path, e)}
                className="w-4 h-4 flex items-center justify-center rounded hover:bg-muted/50 transition-colors ml-0.5"
              >
                <span className="w-2 h-2 rounded-full bg-white group-hover:hidden" />
                <X size={12} className="hidden group-hover:block text-muted-foreground hover:text-foreground" />
              </span>
            ) : (
              <button
                onClick={(e) => onCloseTab(tab.path, e)}
                className="w-4 h-4 flex items-center justify-center rounded hover:bg-muted/50 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
              >
                <X size={12} className="text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
