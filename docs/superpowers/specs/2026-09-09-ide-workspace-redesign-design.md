# Outlaw Code: Visual Studio / Cursor IDE Redesign Specification

**Date:** 2026-09-09  
**Status:** Approved  
**Author:** AI Engineering & User  
**Target:** Transform Outlaw Code from a landing-page "vibe coder" into a true Visual Studio / Cursor-style developer workspace.

---

## 1. Overview & Goals

Outlaw Code was originally configured as a landing-page generator ("vibe coder") that forced users into a full-screen prompt splash screen with pre-baked marketing site templates, followed by a preview-first view where the live iframe dominated and code editing was secondary.

This specification redesigns the application into an authentic, editor-first development environment modeled after Visual Studio and Cursor:
- **Direct-to-Editor Workflow:** Bypass any splash/landing-page prompt screen. Users authenticate and immediately enter an interactive IDE with the project file tree and main file loaded in Monaco.
- **Monaco Code Editor as the Primary Stage:** Multi-tab file management, syntax highlighting, line numbers, minimap, formatting, save shortcuts (`Ctrl+S`), and dirty file indicators.
- **Inline AI (`Ctrl+K`):** Trigger inline code editing and refactoring directly on selected code inside the Monaco editor with accept/reject capability.
- **Dockable Bottom Panel:** Collapsible/resizable panel beneath the editor containing:
  1. Interactive Sandbox Terminal (executing shell commands in the sandbox).
  2. Output / Build Logs.
  3. Live Web Preview (iframe housed cleanly in a tab rather than dominating the workspace).
- **Cursor-Style AI Assistant:** A dedicated, collapsible right-side AI chat panel with active file and selection context awareness, backed by an elite full-stack software engineering prompt rather than a landing-page generator prompt.

---

## 2. Architecture & UI Shell Layout

```
+-----------------------------------------------------------------------------------------------+
| Top Menubar: Outlaw Code | File  Edit  View  Terminal  AI | [Project Name] | AI Settings | ... |
+---+----------------------+----------------------------------------------+---------------------+
| A | Primary Sidebar      | Editor Group                                 | AI Assistant        |
| c | (Explorer / Search)  | +------------------------------------------+ | (Cursor Chat)       |
| t |                      | | Tabs: App.tsx • | index.css | package.json | |                     |
| i |                      | +------------------------------------------+ | Context:            |
| v |                      | Monaco Code Editor                           | 📄 App.tsx:10-25     |
| i |                      |                                              |                     |
| t |                      |   [Inline AI Prompt Widget (Ctrl+K)]         | Chat message        |
| y |                      |                                              | history...          |
|   |                      +----------------------------------------------+ |                     |
| B |                      | Bottom Panel (Tabs: Terminal | Output | Prev)| [Ask or /edit...]   |
| a |                      | $ npm test                                   |                     |
| r |                      | 3 passed, 0 failed                           |                     |
+---+----------------------+----------------------------------------------+---------------------+
| Status Bar: main* | Ln 12, Col 4 | TypeScript | UTF-8 | AI Ready                              |
+-----------------------------------------------------------------------------------------------+
```

### 2.1 UI Shell Hierarchy
1. **Titlebar / Menubar (`Header`):**
   - Left: Logo + Desktop-style menus (`File`, `Edit`, `View`, `Terminal`, `AI`).
   - Center: Current Workspace / Project Name badge.
   - Right: Quick action buttons: Toggle Sidebar, Toggle Bottom Panel, Toggle AI Chat, Settings modal trigger, Project History modal trigger, Logout.
2. **Activity Bar (Far Left Strip, 48px width):**
   - Vertical icon bar:
     - `Files` (toggles File Explorer sidebar)
     - `Search` (toggles Search in Workspace sidebar)
     - `Git` (Source Control status indicator)
     - `AI Chat` (toggles AI Assistant panel on the right)
     - `Settings` (opens AI/IDE settings)
3. **Primary Sidebar (Left, default 240px, resizable):**
   - Explorer view: Directory tree with file/folder expand/collapse, active file highlight, file creation, folder creation, deletion, and refresh.
   - Search view: Global text search across workspace files.
4. **Main Editor Group (Center, flex-1):**
   - **Editor Tab Bar:** Displays open files with active tab, dirty dots (`●`), and close icons (`×`).
   - **Monaco Editor:** Active file editor with full language services, syntax coloring, shortcuts, and inline widget support.
   - **Bottom Panel (collapsible, resizable, default height 220px):**
     - Tabs: `Terminal`, `Output`, `Preview`.
     - Controls: Maximize, minimize/close panel, clear terminal, refresh preview, open preview in external browser tab.
5. **AI Assistant Panel (Right, default 360px, resizable, collapsible):**
   - Cursor-style chat interface.
   - Model switcher dropdown.
   - Active file & selection context pills.
   - Streaming markdown responses with "Insert at Cursor", "Copy", and "Run in Terminal" action buttons.
6. **Status Bar (Bottom strip, 22px):**
   - Git branch, active line/col, language, tab size, bottom panel toggle status, AI connectivity status.

---

## 3. Detailed Component Specifications

### 3.1 Direct-to-Editor & Workspace Lifecycle (`App.tsx`)
- On authentication, immediately instantiate or connect to the sandbox.
- Remove the `PromptScreen` overlay as the primary view.
- When sandbox connects:
  - Default open file: `src/App.tsx` (or `index.html` / `package.json` if `App.tsx` doesn't exist).
  - Add to initial open tabs.
  - Editor layout renders immediately without blocking on an initial user prompt.

### 3.2 Monaco Editor & Multi-Tab State (`EditorLayout.tsx` & new `EditorTabs.tsx`)
- **State Management:**
  ```ts
  interface OpenFile {
    path: string;
    content: string;
    originalContent: string;
    isDirty: boolean;
    language: string;
  }
  ```
- **Operations:**
  - `openFile(path: string)`: If already in `openFiles`, make it `activeFilePath`. Otherwise, read from sandbox (`sb.commands.run("cat ...")` or filesystem API), create tab, and set active.
  - `closeFile(path: string)`: If closing active file, switch to neighboring tab. If file has unsaved changes, prompt or allow fast save.
  - `updateFileContent(path: string, content: string)`: Updates local buffer and sets `isDirty = (content !== originalContent)`.
  - `saveFile(path: string)`: Writes buffer to sandbox (`sb.files.write` or shell write), sets `originalContent = content`, clears `isDirty`.
  - `saveAll()`: Saves all dirty files.
- **Shortcuts:**
  - `Ctrl+S` / `Cmd+S`: Save active file.
  - `Ctrl+W`: Close active tab.
  - `Ctrl+P`: Quick Open file modal.
  - `Ctrl+K`: Open Inline AI widget.
  - `Ctrl+L`: Toggle AI Chat focus.
  - `Ctrl+\``: Toggle bottom terminal panel.

### 3.3 Inline AI Prompt (`InlineAIWidget.tsx`)
- Embedded in the Monaco editor layout.
- Activated via `Ctrl+K` or editor context menu / floating action button.
- Captures:
  - Active file path.
  - Selected code (or current line/surrounding function if no selection).
  - Surrounding file context (up to 200 lines around selection).
- UI: Floating input bar with prompt input, Model selector, and "Generate" button.
- Stream response: Calls `streamChatCompletion` with prompt `Refactor/modify the selected code per user instruction. Return ONLY the replacement code.`
- Displays diff preview or replaced code directly with **Accept (`Enter` / button)** or **Reject (`Esc` / button)**.

### 3.4 Interactive Sandbox Terminal (`TerminalPanel.tsx`)
- Embedded in the bottom panel.
- Uses the connected sandbox's execution capability:
  - Interactive command input line with prompt symbol (`$ `).
  - Output log container supporting terminal output styling (ansi color support or formatted monospace log output).
  - Command history with Up / Down arrow navigation.
  - Quick action buttons: `npm run dev`, `npm test`, `npm run build`, `Clear`.
  - Runs commands via `sandbox.commands.run(command)`.

### 3.5 Live Web Preview Panel (`PreviewPanel.tsx`)
- Embedded as a tab in the bottom panel (or can be undocked/opened in separate tab).
- Address bar with current sandbox preview URL (`https://<sandbox-id>.preview.outlaw...`).
- Refresh button, open external button, responsive width toggle (100%, 768px, 375px).
- Hot-reload awareness: reloads iframe when files are saved or build completes.

### 3.6 AI System Prompt & Engineering Re-alignment (`src/lib/agent.ts`)
- Replace `CODING_AGENT_SYSTEM_PROMPT` with:
  ```ts
  export const CODING_AGENT_SYSTEM_PROMPT = `You are an elite software engineer and programming copilot modeled after Cursor and Visual Studio.
  You assist the user in reading, architecting, debugging, writing, and refactoring full-stack code.
  
  Guidelines:
  - Be direct, technical, and concise. Avoid marketing jargon or fluff.
  - When writing code, provide clean, production-ready, type-safe implementations.
  - Format file changes clearly so they can be easily understood or applied.
  - When debugging, identify root causes with precision and explain the fix.
  - Tailor your code to the user's active codebase, frameworks, and packages.`;
  ```
- Remove all landing-page prompt suggestions from `ChatPanel.tsx` and replace with developer prompts:
  - *"Explain the architecture of this project"*
  - *"Find potential bugs or performance issues in the active file"*
  - *"Add unit tests for the selected code"*
  - *"Refactor this component for better maintainability"*

---

## 4. State Management & Data Flow

1. **Workspace State:**
   - Managed in `EditorLayout` or custom hook `useWorkspace`:
     - `openTabs: string[]`
     - `activeFilePath: string | null`
     - `fileBuffers: Record<string, { content: string, original: string, isDirty: boolean }>`
     - `layoutState: { sidebarOpen: boolean, bottomPanelOpen: boolean, aiPanelOpen: boolean, activeBottomTab: 'terminal' | 'output' | 'preview' }`
2. **Persistence:**
   - Recent open files and layout sizes saved to `localStorage`.
   - Sandbox filesystem is the single source of truth for file persistence on disk.
3. **AI Context Flow:**
   - Active editor selection is passed to `ChatPanel` and `InlineAIWidget` via ref or state.
   - When user prompts in Chat or Inline AI, the active file path, full or partial content, and cursor selection are sent as context blocks.

---

## 5. Error Handling & Edge Cases

- **File Read / Write Errors:** Clear toast notification if a file fails to load or save in the sandbox, preserving local changes in the editor buffer without data loss.
- **Unsaved Changes Protection:** Closing a tab with dirty edits prompts the user to save or discard.
- **Sandbox Reconnection:** If sandbox connection drops, status bar displays reconnecting status with a manual retry button.
- **AI Streaming Errors:** Graceful error display in chat or inline widget with a "Retry" button.

---

## 6. Verification & Acceptance Criteria

1. **Shell Verification:**
   - App loads directly into Monaco editor without presenting the old landing-page prompt splash.
   - Top menubar, activity bar, file tree sidebar, Monaco editor, bottom panel, and AI chat panel all render with authentic dark IDE styling.
2. **Editor & Tabs Verification:**
   - Opening multiple files creates tabs.
   - Editing marks tab with dirty indicator (`●`).
   - `Ctrl+S` / `Cmd+S` saves file to sandbox filesystem and clears dirty indicator.
   - Closing tabs works without crashing.
3. **Terminal Verification:**
   - Terminal tab in bottom panel executes commands (e.g. `ls`, `pwd`, `node -v`) and displays output.
4. **Inline AI Verification:**
   - `Ctrl+K` opens inline prompt widget on editor selection.
   - Prompt streams suggested code, and accepting it updates the editor text.
5. **AI Chat Verification:**
   - Chat includes current file context and answers software engineering questions without reverting to landing-page boilerplate.
