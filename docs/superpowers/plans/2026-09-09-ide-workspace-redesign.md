# Outlaw Code: Visual Studio & Cursor IDE Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Outlaw Code from a landing-page "vibe coder" into an authentic Visual Studio & Cursor-style developer workspace with direct-to-editor entry, Monaco multi-tabs, inline `Ctrl+K` AI editing, an interactive bottom panel (Terminal, Output, Preview), and an engineering copilot chat.

**Architecture:** Replace the splash/landing-page prompt screen entry with direct initialization into a multi-tab Monaco workspace. Add a VS Code Activity Bar on the far left, a multi-tab bar over Monaco, an inline AI floating widget (`Ctrl+K`), a collapsible bottom drawer for Terminal / Output / Preview, and re-align the AI system prompt and chat panel to act as a general programming copilot with active file and selection context.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Monaco Editor (`@monaco-editor/react`), Lucide React icons, Sandbox SDK.

---

### Task 1: Re-align AI Copilot System Prompt & Engineering Context

**Files:**
- Modify: `src/lib/agent.ts`

- [ ] **Step 1: Update `CODING_AGENT_SYSTEM_PROMPT` in `src/lib/agent.ts`**
Replace the marketing landing page prompt with a full-stack software engineering prompt:
```ts
export const CODING_AGENT_SYSTEM_PROMPT = `You are an elite software engineering copilot modeled after Cursor and Visual Studio.
You assist the developer in reading, architecting, debugging, refactoring, and writing full-stack code.

Guidelines:
- Be direct, technical, and concise. Avoid marketing fluff or filler.
- When writing or proposing code changes, provide clean, production-ready, type-safe implementations.
- Reference the active file and context when answering questions or writing code.
- Explain root causes clearly when debugging.
- Respect existing project conventions, packages, and architecture.`;
```

- [ ] **Step 2: Verify type check passes**
Run: `npm run lint:types`
Expected: PASS

- [ ] **Step 3: Commit**
```bash
git add src/lib/agent.ts
git commit -m "feat(ai): update agent system prompt to software engineering copilot"
```

---

### Task 2: Multi-Tab Bar Component (`EditorTabs.tsx`)

**Files:**
- Create: `src/components/EditorTabs.tsx`

- [ ] **Step 1: Create `EditorTabs.tsx`**
Implement the multi-tab bar with active tab styling, unsaved dirty indicator (`●`), close button (`×`), and file icons based on extension:
```tsx
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
```

- [ ] **Step 2: Verify type check passes**
Run: `npm run lint:types`
Expected: PASS

- [ ] **Step 3: Commit**
```bash
git add src/components/EditorTabs.tsx
git commit -m "feat(ui): add multi-tab bar component for Monaco editor"
```

---

### Task 3: Inline AI Prompt Widget (`InlineAIWidget.tsx`)

**Files:**
- Create: `src/components/InlineAIWidget.tsx`

- [ ] **Step 1: Create `InlineAIWidget.tsx`**
Implement the floating `Ctrl+K` inline prompt bar with streaming response and Accept / Reject buttons:
```tsx
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Check, X, ArrowUp, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { streamChatCompletion, newMessageId } from '../lib/agent';

interface InlineAIWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string | null;
  selectedText: string;
  fullFileContent: string;
  onAccept: (replacementCode: string) => void;
}

export function InlineAIWidget({
  isOpen,
  onClose,
  filePath,
  selectedText,
  fullFileContent,
  onAccept,
}: InlineAIWidgetProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPrompt('');
      setGeneratedCode(null);
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      abortRef.current?.abort();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGenerate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedCode('');

    abortRef.current = new AbortController();

    const systemPrompt = `You are an inline code modification assistant.
The user wants to modify code in ${filePath || 'active file'}.
Return ONLY the exact replacement code block without markdown backticks or commentary so it can be directly pasted into the editor.`;

    const userPrompt = `Existing Code:
${selectedText || fullFileContent.slice(0, 1500)}

Instruction:
${prompt}

Output ONLY the replacement code:`;

    try {
      let accumulated = '';
      await streamChatCompletion({
        messages: [],
        prompt: userPrompt,
        systemPrompt,
        signal: abortRef.current.signal,
        onDelta: (delta) => {
          accumulated += delta;
          setGeneratedCode(accumulated);
        },
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err?.message || 'Failed to generate code edit');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = () => {
    if (generatedCode !== null) {
      // Strip markdown code fences if model returned them
      const cleaned = generatedCode.replace(/^```[a-z]*\n?/i, '').replace(/```\n?$/i, '');
      onAccept(cleaned);
      onClose();
    }
  };

  return (
    <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl bg-[#202024] border border-[#007acc] rounded-lg shadow-2xl overflow-hidden font-sans text-foreground p-3 space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground pb-1 border-b border-border/30">
        <span className="flex items-center gap-1.5 font-medium text-[#007acc]">
          <Sparkles size={13} />
          Inline Edit with AI (Ctrl+K)
        </span>
        <span className="text-[11px] text-muted-foreground">
          {selectedText ? `${selectedText.split('\n').length} lines selected` : filePath || 'Buffer'}
        </span>
      </div>

      <form onSubmit={handleGenerate} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Add TypeScript types, optimize this loop, handle errors..."
          className="flex-1 bg-[#18181b] border border-border/40 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[#007acc]"
          disabled={isGenerating}
        />
        <Button
          type="submit"
          size="sm"
          disabled={isGenerating || !prompt.trim()}
          className="h-8 px-3 bg-[#007acc] hover:bg-[#0062a3] text-white text-xs gap-1.5"
        >
          {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <ArrowUp size={13} />}
          Generate
        </Button>
      </form>

      {error && <div className="text-xs text-red-400 px-1">{error}</div>}

      {generatedCode !== null && (
        <div className="space-y-2 pt-1 border-t border-border/30">
          <div className="max-h-48 overflow-y-auto bg-[#18181b] p-2 rounded text-[11px] font-mono text-emerald-300 border border-emerald-950/50">
            <pre className="whitespace-pre-wrap">{generatedCode}</pre>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <X size={12} />
              Reject (Esc)
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAccept}
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1"
            >
              <Check size={12} />
              Accept
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify type check passes**
Run: `npm run lint:types`
Expected: PASS

- [ ] **Step 3: Commit**
```bash
git add src/components/InlineAIWidget.tsx
git commit -m "feat(ai): add inline Ctrl+K code modification widget"
```

---

### Task 4: Interactive Terminal Panel (`TerminalPanel.tsx`)

**Files:**
- Create: `src/components/TerminalPanel.tsx`

- [ ] **Step 1: Create `TerminalPanel.tsx`**
Implement an interactive sandbox terminal supporting command execution, command history, and clear:
```tsx
import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TermIcon, Trash2, Play, CornerDownLeft } from 'lucide-react';
import { Button } from './ui/button';

interface TerminalPanelProps {
  sandbox: any | null;
}

interface CommandEntry {
  id: string;
  command: string;
  output: string;
  exitCode?: number;
  timestamp: string;
}

export function TerminalPanel({ sandbox }: TerminalPanelProps) {
  const [history, setHistory] = useState<CommandEntry[]>([
    {
      id: 'init',
      command: 'echo "Workspace sandbox connected. Ready for commands."',
      output: 'Workspace sandbox connected. Ready for commands.',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history, isRunning]);

  const runCommand = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed || isRunning) return;

    if (trimmed === 'clear') {
      setHistory([]);
      setCurrentInput('');
      return;
    }

    setIsRunning(true);
    setCurrentInput('');
    setHistoryIndex(null);

    const entryId = crypto.randomUUID();
    const newEntry: CommandEntry = {
      id: entryId,
      command: trimmed,
      output: '',
      timestamp: new Date().toLocaleTimeString(),
    };

    setHistory((prev) => [...prev, newEntry]);

    try {
      if (!sandbox) {
        throw new Error('No sandbox connected');
      }
      const res = await sandbox.commands.run(trimmed);
      setHistory((prev) =>
        prev.map((e) =>
          e.id === entryId
            ? { ...e, output: (res.stdout || '') + (res.stderr ? `\n${res.stderr}` : ''), exitCode: res.exitCode }
            : e
        )
      );
    } catch (err: any) {
      setHistory((prev) =>
        prev.map((e) =>
          e.id === entryId
            ? { ...e, output: err?.message || 'Command failed' }
            : e
        )
      );
    } finally {
      setIsRunning(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      runCommand(currentInput);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const newIdx = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIdx);
      setCurrentInput(history[newIdx]?.command || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === null) return;
      const newIdx = historyIndex + 1;
      if (newIdx >= history.length) {
        setHistoryIndex(null);
        setCurrentInput('');
      } else {
        setHistoryIndex(newIdx);
        setCurrentInput(history[newIdx]?.command || '');
      }
    }
  };

  return (
    <div className="h-full w-full bg-[#18181b] flex flex-col font-mono text-[12px] text-zinc-300">
      {/* Terminal Toolbar */}
      <div className="h-7 px-3 bg-[#202024] border-b border-border/30 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2 text-zinc-400">
          <TermIcon size={12} className="text-[#007acc]" />
          <span>bash (sandbox)</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-zinc-400 hover:text-zinc-200"
            onClick={() => setHistory([])}
            title="Clear terminal"
          >
            <Trash2 size={11} />
          </Button>
        </div>
      </div>

      {/* Terminal Output */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {history.map((entry) => (
          <div key={entry.id} className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <span className="text-[#007acc] font-bold">$</span>
              <span className="text-zinc-200">{entry.command}</span>
              <span className="text-[10px] text-zinc-600 ml-auto">{entry.timestamp}</span>
            </div>
            {entry.output && (
              <pre className="text-zinc-400 whitespace-pre-wrap pl-3 leading-relaxed">
                {entry.output}
              </pre>
            )}
          </div>
        ))}
        {isRunning && (
          <div className="flex items-center gap-2 text-amber-400 pl-3">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            <span>Running...</span>
          </div>
        )}
      </div>

      {/* Command Input */}
      <div className="h-8 border-t border-border/30 bg-[#1e1e22] px-3 flex items-center gap-2 shrink-0">
        <span className="text-[#007acc] font-bold">$</span>
        <input
          ref={inputRef}
          type="text"
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type command (e.g. npm test, ls -la, git status)..."
          disabled={isRunning}
          className="flex-1 bg-transparent border-none outline-none text-zinc-200 placeholder:text-zinc-600 font-mono text-[12px]"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-zinc-400 hover:text-[#007acc]"
          disabled={isRunning || !currentInput.trim()}
          onClick={() => runCommand(currentInput)}
        >
          <CornerDownLeft size={12} />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify type check passes**
Run: `npm run lint:types`
Expected: PASS

- [ ] **Step 3: Commit**
```bash
git add src/components/TerminalPanel.tsx
git commit -m "feat(terminal): add interactive sandbox terminal panel"
```

---

### Task 5: Bottom Panel & Preview Tab (`BottomPanel.tsx`)

**Files:**
- Create: `src/components/BottomPanel.tsx`

- [ ] **Step 1: Create `BottomPanel.tsx`**
Create the collapsible bottom drawer hosting Terminal, Output, and Live Preview tabs:
```tsx
import React, { useState } from 'react';
import { Terminal as TermIcon, FileText, Globe, RefreshCw, ExternalLink, ChevronDown, ChevronUp, X } from 'lucide-react';
import { TerminalPanel } from './TerminalPanel';
import { getPreviewUrl } from '../lib/sandbox';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

export type BottomTab = 'terminal' | 'output' | 'preview';

interface BottomPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  height: number;
  sandbox: any | null;
  buildLogs?: string[];
}

export function BottomPanel({
  isOpen,
  onToggle,
  height,
  sandbox,
  buildLogs = [],
}: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<BottomTab>('terminal');
  const [previewKey, setPreviewKey] = useState(0);

  if (!isOpen) return null;

  const previewUrl = sandbox?.id ? getPreviewUrl(sandbox.id) : null;

  return (
    <div
      style={{ height }}
      className="w-full bg-[#18181b] border-t border-border/50 flex flex-col shrink-0 select-none font-sans"
    >
      {/* Bottom Panel Tab Header */}
      <div className="h-8 bg-[#202024] border-b border-border/30 px-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('terminal')}
            className={cn(
              "h-6 px-2.5 rounded text-[11px] flex items-center gap-1.5 transition-colors",
              activeTab === 'terminal'
                ? "bg-[#18181b] text-white font-medium border-t border-t-[#007acc]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <TermIcon size={12} />
            Terminal
          </button>

          <button
            onClick={() => setActiveTab('output')}
            className={cn(
              "h-6 px-2.5 rounded text-[11px] flex items-center gap-1.5 transition-colors",
              activeTab === 'output'
                ? "bg-[#18181b] text-white font-medium border-t border-t-[#007acc]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileText size={12} />
            Output
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={cn(
              "h-6 px-2.5 rounded text-[11px] flex items-center gap-1.5 transition-colors",
              activeTab === 'preview'
                ? "bg-[#18181b] text-white font-medium border-t border-t-[#007acc]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Globe size={12} />
            Preview
          </button>
        </div>

        <div className="flex items-center gap-1">
          {activeTab === 'preview' && previewUrl && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-muted-foreground hover:text-foreground"
                onClick={() => setPreviewKey((k) => k + 1)}
                title="Refresh preview"
              >
                <RefreshCw size={11} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-muted-foreground hover:text-foreground"
                onClick={() => window.open(previewUrl, '_blank')}
                title="Open preview in new tab"
              >
                <ExternalLink size={11} />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-muted-foreground hover:text-foreground"
            onClick={onToggle}
            title="Close panel"
          >
            <X size={12} />
          </Button>
        </div>
      </div>

      {/* Bottom Panel Content */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'terminal' && <TerminalPanel sandbox={sandbox} />}

        {activeTab === 'output' && (
          <div className="h-full w-full bg-[#18181b] p-3 overflow-y-auto font-mono text-[11px] text-zinc-300">
            {buildLogs.length > 0 ? (
              buildLogs.map((log, i) => <div key={i}>{log}</div>)
            ) : (
              <div className="text-zinc-600">No output logs recorded.</div>
            )}
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="h-full w-full bg-black relative">
            {previewUrl ? (
              <iframe
                key={previewKey}
                src={previewUrl}
                className="w-full h-full border-none"
                title="Application Live Preview"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                Connecting to preview sandbox...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify type check passes**
Run: `npm run lint:types`
Expected: PASS

- [ ] **Step 3: Commit**
```bash
git add src/components/BottomPanel.tsx
git commit -m "feat(ui): add bottom panel with terminal, output, and preview tabs"
```

---

### Task 6: VS Code Activity Bar (`ActivityBar.tsx`)

**Files:**
- Create: `src/components/ActivityBar.tsx`

- [ ] **Step 1: Create `ActivityBar.tsx`**
Implement the narrow vertical icon strip on the far left of the window:
```tsx
import React from 'react';
import { Files, Search, GitBranch, Sparkles, Settings } from 'lucide-react';
import { cn } from '../lib/utils';

export type ActivityView = 'explorer' | 'search' | 'git';

interface ActivityBarProps {
  activeView: ActivityView;
  onSelectView: (view: ActivityView) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  aiPanelOpen: boolean;
  onToggleAIPanel: () => void;
  onOpenSettings: () => void;
}

export function ActivityBar({
  activeView,
  onSelectView,
  sidebarOpen,
  onToggleSidebar,
  aiPanelOpen,
  onToggleAIPanel,
  onOpenSettings,
}: ActivityBarProps) {
  const handleItemClick = (view: ActivityView) => {
    if (activeView === view && sidebarOpen) {
      onToggleSidebar();
    } else {
      onSelectView(view);
      if (!sidebarOpen) onToggleSidebar();
    }
  };

  return (
    <div className="w-12 bg-[#18181b] border-r border-border/40 flex flex-col items-center py-2 shrink-0 select-none z-10">
      {/* Top Activity Icons */}
      <div className="flex flex-col items-center gap-1 w-full">
        <button
          onClick={() => handleItemClick('explorer')}
          title="Explorer (Ctrl+Shift+E)"
          className={cn(
            "w-10 h-10 flex items-center justify-center rounded-md transition-colors relative",
            sidebarOpen && activeView === 'explorer'
              ? "text-white before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#007acc]"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
          )}
        >
          <Files size={18} />
        </button>

        <button
          onClick={() => handleItemClick('search')}
          title="Search (Ctrl+Shift+F)"
          className={cn(
            "w-10 h-10 flex items-center justify-center rounded-md transition-colors relative",
            sidebarOpen && activeView === 'search'
              ? "text-white before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#007acc]"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
          )}
        >
          <Search size={18} />
        </button>

        <button
          onClick={() => handleItemClick('git')}
          title="Source Control"
          className={cn(
            "w-10 h-10 flex items-center justify-center rounded-md transition-colors relative",
            sidebarOpen && activeView === 'git'
              ? "text-white before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#007acc]"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
          )}
        >
          <GitBranch size={18} />
        </button>
      </div>

      {/* Bottom Activity Icons */}
      <div className="mt-auto flex flex-col items-center gap-1 w-full">
        <button
          onClick={onToggleAIPanel}
          title="Toggle AI Assistant (Ctrl+L)"
          className={cn(
            "w-10 h-10 flex items-center justify-center rounded-md transition-colors",
            aiPanelOpen ? "text-[#007acc] bg-[#007acc]/10" : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
          )}
        >
          <Sparkles size={18} />
        </button>

        <button
          onClick={onOpenSettings}
          title="Settings"
          className="w-10 h-10 flex items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
        >
          <Settings size={18} />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify type check passes**
Run: `npm run lint:types`
Expected: PASS

- [ ] **Step 3: Commit**
```bash
git add src/components/ActivityBar.tsx
git commit -m "feat(ui): add VS Code Activity Bar component"
```

---

### Task 7: Update `ChatPanel.tsx` with Developer Prompts & Active Context

**Files:**
- Modify: `src/components/ChatPanel.tsx`

- [ ] **Step 1: Replace landing page starter prompts with developer prompts**
In `src/components/ChatPanel.tsx`, replace `SUGGESTED_PROMPTS` with software engineering starter questions:
```tsx
const SUGGESTED_PROMPTS = [
  {
    title: "Explain Architecture",
    prompt: "Can you analyze this project structure and explain the key components, data flow, and architecture?",
    icon: Bot,
  },
  {
    title: "Find Bugs & Security Issues",
    prompt: "Review the active file for potential edge-case bugs, performance bottlenecks, or security oversights.",
    icon: Wrench,
  },
  {
    title: "Write Unit Tests",
    prompt: "Write comprehensive unit tests for the functions or components in the active file.",
    icon: Check,
  },
  {
    title: "Refactor Component",
    prompt: "Refactor this code to follow clean code standards, improve readability, and strengthen TypeScript types.",
    icon: Sparkles,
  },
];
```

- [ ] **Step 2: Add Active File Context Pill to Chat Header / Prompt Bar**
Accept `activeFile: string | null` and `selectedCode?: string` as props in `ChatPanelProps`. Display an active context badge above the input: `📄 activeFile (selected)`.

- [ ] **Step 3: Verify type check passes**
Run: `npm run lint:types`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add src/components/ChatPanel.tsx
git commit -m "feat(chat): update ChatPanel with developer prompts and active file context"
```

---

### Task 8: Refactor `EditorLayout.tsx` for Multi-Tab & IDE Structure

**Files:**
- Modify: `src/components/EditorLayout.tsx`

- [ ] **Step 1: Update `EditorLayout.tsx`**
Re-engineer `EditorLayout` to:
1. Integrate `ActivityBar` on the left.
2. Render `FileExplorer` when activeView is `'explorer'` (collapsible).
3. Manage multi-tab open files: `openTabs: TabItem[]`, `activeFilePath: string | null`, `fileBuffers: Record<string, string>`.
4. Render `EditorTabs` above Monaco.
5. Provide `Ctrl+K` handler to toggle `InlineAIWidget` over Monaco.
6. Render `BottomPanel` (Terminal / Output / Preview) with drag resize.
7. Support `Ctrl+S` saving to sandbox filesystem (`sb.files.write`).
8. Connect selection listener on Monaco to pass selection to Chat & Inline AI.

- [ ] **Step 2: Verify type check passes**
Run: `npm run lint:types`
Expected: PASS

- [ ] **Step 3: Commit**
```bash
git add src/components/EditorLayout.tsx
git commit -m "feat(workspace): refactor EditorLayout with multi-tabs, bottom drawer, and activity bar"
```

---

### Task 9: Refactor `App.tsx` for Direct-to-Editor IDE Workflow

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update `App.tsx`**
Remove the `PromptScreen` landing-page generator requirement:
1. Default `showEditor` and `hasPromptStarted` to `true` on authentication.
2. Drop directly into the full IDE layout with default project name (`Outlaw Code - Workspace`).
3. Add a VS Code top menubar with `File`, `Edit`, `View`, `Terminal`, `AI` dropdowns, project title, and layout toggle buttons.
4. Keep `SettingsModal` and `HistoryModal` accessible from top bar.

- [ ] **Step 2: Verify type check passes**
Run: `npm run lint:types`
Expected: PASS

- [ ] **Step 3: Commit**
```bash
git add src/App.tsx
git commit -m "feat(app): enable direct-to-editor entry and IDE titlebar menu"
```

---

### Task 10: Build & End-to-End Verification

**Files:**
- Verify build & lint: `package.json`

- [ ] **Step 1: Run full TypeScript check**
Run: `npm run lint:types`
Expected: No type errors.

- [ ] **Step 2: Run full build**
Run: `npm run build`
Expected: Production build successfully generated in `dist/`.

- [ ] **Step 3: Commit any final polishing touches**
```bash
git add .
git commit -m "chore: complete Visual Studio & Cursor IDE transformation"
```
