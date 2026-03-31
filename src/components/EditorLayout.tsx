import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Eye, RefreshCw, ExternalLink, Code2, Save } from 'lucide-react';
import { getPreviewUrl } from '../lib/sandbox';
import { cn } from '../lib/utils';
import { ChatPanel } from './ChatPanel';
import { FileExplorer } from './FileExplorer';
import { LoadingAnimation } from './LoadingAnimation';
import { BuildingScreen } from './BuildingScreen';
import { Button } from './ui/button';
import Editor from '@monaco-editor/react';

interface EditorLayoutProps {
  sandbox: any | null;
  initialPrompt?: string | null;
}

type CenterTab = 'code' | 'preview';

const EXPLORER_WIDTH = 220;

function getLanguage(path: string | null): string {
  if (!path) return 'plaintext';
  const ext = path.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    css: 'css', scss: 'scss', html: 'html', json: 'json', md: 'markdown',
    py: 'python', sh: 'shell', yml: 'yaml', yaml: 'yaml', toml: 'toml',
  };
  return map[ext || ''] || 'plaintext';
}

export function EditorLayout({ sandbox, initialPrompt }: EditorLayoutProps) {
  const [previewKey, setPreviewKey] = useState(0);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isWaitingForReload, setIsWaitingForReload] = useState(false);

  // File explorer / code editor state
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<CenterTab>('preview');

  // Chat panel width (on the right)
  const [chatWidth, setChatWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);

  const prevBuildingRef = useRef(false);
  // Stable ref to sandbox so callbacks can always access the latest value
  const sandboxRef = useRef<any>(null);
  sandboxRef.current = sandbox;
  const selectedFileRef = useRef<string | null>(null);
  // Stable ref to file content for save operations
  const fileContentRef = useRef<string | null>(null);
  fileContentRef.current = fileContent;
  // Stable ref to dirty flag so timer callbacks always read the latest value
  const hasUnsavedChangesRef = useRef(false);
  hasUnsavedChangesRef.current = hasUnsavedChanges;

  // When switching sandboxes, clear file selection and editor state
  useEffect(() => {
    setSelectedFile(null);
    setFileContent(null);
    setHasUnsavedChanges(false);
    setIsLoadingFile(false);
    selectedFileRef.current = null;
    fileContentRef.current = null;
  }, [sandbox?.id]);

  const handleBuildStatusChange = (building: boolean) => {
    setIsBuilding(building);
  };

  const refreshPreview = () => setPreviewKey(prev => prev + 1);

  /** Safely escape a filesystem path for use in single-quoted shell arguments. */
  const shellEscape = (path: string) => `'${path.replace(/'/g, "'\\''")}'`;

  const loadFileContent = useCallback(async (path: string) => {
    const sb = sandboxRef.current;
    if (!sb) return;
    setIsLoadingFile(true);
    try {
      const { stdout } = await sb.commands.run(`cat ${shellEscape(path)}`);
      // Only apply the result if this path is still the selected file.
      if (selectedFileRef.current === path) {
        setFileContent(stdout ?? '');
        setHasUnsavedChanges(false);
      }
    } catch (err) {
      console.error('Failed to read file:', err);
      // Only show the error placeholder if this path is still selected.
      if (selectedFileRef.current === path) {
        setFileContent('// Failed to read file');
        setHasUnsavedChanges(false);
      }
    } finally {
      // Avoid clearing the loading state for a newer in-flight request.
      if (selectedFileRef.current === path) {
        setIsLoadingFile(false);
      }
    }
  }, []);

  // Auto-reload preview when build finishes
  useEffect(() => {
    if (prevBuildingRef.current && !isBuilding) {
      setIsWaitingForReload(true);
      const timer = setTimeout(() => {
        refreshPreview();
        setIsWaitingForReload(false);
        // Refresh open file content so the editor stays in sync after a build,
        // but only if user has no unsaved edits to avoid silent data loss.
        if (selectedFileRef.current && !hasUnsavedChangesRef.current) {
          loadFileContent(selectedFileRef.current);
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
    prevBuildingRef.current = isBuilding;
  }, [isBuilding, loadFileContent]);

  const handleFileSelect = useCallback(async (path: string) => {
    selectedFileRef.current = path;
    setSelectedFile(path);
    setActiveTab('code');
    await loadFileContent(path);
  }, [loadFileContent]);

  /** Write the current editor content back to the sandbox filesystem. */
  const saveFile = useCallback(async () => {
    const sb = sandboxRef.current;
    const path = selectedFileRef.current;
    const content = fileContentRef.current;
    if (!sb || !path || content === null) return;
    setIsSaving(true);
    try {
      // Persist the current file contents using the sandbox filesystem API
      await sb.files.write(path, content);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Failed to save file:', err);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const openInNewTab = () => {
    if (sandbox?.id) {
      window.open(getPreviewUrl(sandbox.id), '_blank');
    }
  };

  // Chat panel resizing — drag the left edge of the chat panel
  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 280 && newWidth < 700) {
        setChatWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const fileName = selectedFile ? selectedFile.split('/').pop() : null;

  return (
    <div className={cn("relative h-full w-full bg-background overflow-hidden flex flex-row", isResizing && "select-none")}>

      {/* FILE EXPLORER (Far Left) */}
      <div className="h-full shrink-0" style={{ width: EXPLORER_WIDTH }}>
        <FileExplorer
          sandbox={sandbox}
          onFileSelect={handleFileSelect}
          selectedFile={selectedFile}
        />
      </div>

      {/* CENTER PANEL: Code Editor + Preview */}
      <div className="flex-1 h-full flex flex-col min-w-0">
        {/* Tab Bar */}
        <div className="h-9 border-b border-border flex items-center bg-background shrink-0 px-2 gap-1">
          <button
            onClick={() => setActiveTab('code')}
            className={cn(
              "h-7 px-3 rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors",
              activeTab === 'code'
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Code2 size={12} />
            {fileName ?? 'Code'}
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={cn(
              "h-7 px-3 rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors",
              activeTab === 'preview'
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Eye size={12} />
            Preview
          </button>

          <div className="ml-auto flex items-center gap-1">
            {activeTab === 'code' && selectedFile && (
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-6 w-6", hasUnsavedChanges ? "text-amber-400 hover:text-amber-300" : "text-muted-foreground")}
                onClick={saveFile}
                disabled={isSaving}
                title={hasUnsavedChanges ? "Save file (unsaved changes)" : "Save file"}
              >
                <Save size={11} className={cn(isSaving && "animate-pulse")} />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={openInNewTab} title="Open preview in new tab">
              <ExternalLink size={11} />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={refreshPreview} title="Refresh preview">
              <RefreshCw size={11} className={cn(isBuilding && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Code Editor */}
        {activeTab === 'code' && (
          <div className="flex-1 overflow-hidden bg-[#1e1e1e]">
            {isLoadingFile ? (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                Loading...
              </div>
            ) : selectedFile && fileContent !== null ? (
              <Editor
                height="100%"
                language={getLanguage(selectedFile)}
                value={fileContent}
                theme="vs-dark"
                options={{
                  minimap: { enabled: true },
                  fontSize: 13,
                  lineNumbers: 'on',
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                }}
                onChange={(value) => {
                  setFileContent(value ?? '');
                  setHasUnsavedChanges(true);
                }}
                onMount={(editor, monaco) => {
                  editor.addCommand(
                    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
                    () => saveFile()
                  );
                }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/50 gap-3">
                <Code2 size={32} className="opacity-30" />
                <p className="text-sm">Select a file from the explorer to view its code</p>
              </div>
            )}
          </div>
        )}

        {/* Preview */}
        {activeTab === 'preview' && (
          <div className="flex-1 overflow-hidden relative bg-black">
            {sandbox?.id ? (
              <>
                <iframe
                  key={previewKey}
                  src={getPreviewUrl(sandbox.id)}
                  className="w-full h-full border-none"
                  title="App Preview"
                />
                {(isBuilding || isWaitingForReload) && <BuildingScreen />}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-card text-muted-foreground text-sm">
                <div className="flex flex-col items-center gap-2 w-full h-full">
                  <LoadingAnimation steps={[
                    "Connecting to sandbox...",
                    "Establishing secure channel...",
                    "Verifying environment...",
                    "Syncing file system...",
                    "Preparing workspace..."
                  ]} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CHAT PANEL (Right Side) */}
      <div
        className="h-full z-20 bg-background border-l border-border flex flex-col relative shrink-0"
        style={{ width: chatWidth }}
      >
        {/* Resizer Handle (Left Edge of Chat) */}
        <div
          onMouseDown={startResizing}
          className="absolute left-0 top-0 bottom-0 w-1 -ml-0.5 cursor-ew-resize hover:bg-primary/50 transition-colors z-30 group flex items-center justify-center"
        >
          <div className="w-[1px] h-8 bg-border group-hover:bg-primary transition-colors" />
        </div>

        <ChatPanel
          key={sandbox?.id || 'no-sandbox'}
          sandbox={sandbox}
          isEmbedded={true}
          initialPrompt={initialPrompt}
          onBuildStatusChange={handleBuildStatusChange}
        />
      </div>

      {/* Resize Overlay - prevents iframe from stealing mouse events during resize */}
      {isResizing && (
        <div className="fixed inset-0 z-50 cursor-ew-resize bg-transparent" />
      )}
    </div>
  );
}