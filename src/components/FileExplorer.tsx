import React, { useEffect, useRef, useState } from 'react';
import { Folder, File as FileIcon, ChevronRight, ChevronDown, RefreshCw, FileUp, FolderUp, Upload } from 'lucide-react';
import { cn } from '../lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import {
  IMPORT_FILES_EVENT,
  IMPORT_FOLDER_EVENT,
  importFileList,
} from '../lib/import-files';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

interface FileExplorerProps {
  sandbox: any;
  onFileSelect: (path: string) => void;
  selectedFile: string | null;
  className?: string;
  onImportComplete?: (paths: string[]) => void;
}

export function FileExplorer({ sandbox, onFileSelect, selectedFile, className, onImportComplete }: FileExplorerProps) {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // React doesn't reliably render the non-standard `webkitdirectory`
  // attribute, and without it the folder picker degrades to a single-file
  // picker. Set it imperatively so folder selection always works.
  const setFolderInputRef = (el: HTMLInputElement | null) => {
    folderInputRef.current = el;
    if (el) {
      el.setAttribute('webkitdirectory', '');
      el.setAttribute('directory', '');
    }
  };

  const fetchFiles = async () => {
    if (!sandbox) return;
    setIsLoading(true);
    setError(null);

    try {
      // Use ls -R to get recursive listing
      // -F adds / to directories
      const { stdout } = await sandbox.commands.run('find /home/user/app -not -path "*/node_modules/*" -not -path "*/.git/*" | head -2000');
      
      if (!stdout) {
        setFiles([]);
        return;
      }

      const paths = stdout.trim().split('\n').filter(Boolean);
      const tree = buildFileTree(paths);
      setFiles(tree);
      
      // Auto-expand src folder if it exists
      if (tree.some(n => n.name === 'src')) {
        setExpandedFolders(prev => new Set([...prev, '/home/user/app/src']));
      }
    } catch (err) {
      console.error('Failed to list files:', err);
      // Don't show error if it's just that the app doesn't exist yet
      if (err instanceof Error && !err.message.includes('No such file')) {
        setError('Failed to load files');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
    // Poll for file changes every 5 seconds if sandbox is active
    const interval = setInterval(fetchFiles, 5000);
    return () => clearInterval(interval);
  }, [sandbox]);

  // Import entries: file picker, folder picker, drag-drop, and global menu events.
  const handleImportList = async (list: FileList | null) => {
    if (!list || list.length === 0 || !sandbox || isImporting) return;
    setIsImporting(true);
    setImportStatus(`Importing ${list.length} file(s)...`);
    try {
      const { imported, skipped } = await importFileList(sandbox, list);
      await fetchFiles();
      if (imported.length > 0) {
        // Auto-expand the full ancestor chain of the first import so nested
        // folder contents are actually visible (not just the leaf parent).
        const ancestors = new Set<string>();
        let acc = imported[0].split('/').slice(0, -1).join('/');
        while (acc.startsWith('/home/user/app') && acc !== '/home/user/app') {
          ancestors.add(acc);
          acc = acc.slice(0, acc.lastIndexOf('/'));
        }
        setExpandedFolders((prev) => new Set([...prev, ...ancestors]));
        setImportStatus(`Imported ${imported.length} file(s)`);
        onImportComplete?.(imported);
      } else {
        setImportStatus('Nothing imported');
      }
      if (skipped.length > 0) {
        console.warn('Skipped on import:', skipped);
        setImportStatus((prev) =>
          imported.length > 0
            ? `${prev} (${skipped.length} skipped)`
            : `${skipped.length} file(s) skipped (binary/too large)`
        );
      }
    } catch (err) {
      console.error('Import failed:', err);
      setImportStatus('Import failed');
    } finally {
      setIsImporting(false);
      // Clear picker values so the same file/folder can be picked again.
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
      setTimeout(() => setImportStatus(null), 4000);
    }
  };

  // Allow the top-level File menu (App.tsx) to open these pickers.
  useEffect(() => {
    const openFiles = () => fileInputRef.current?.click();
    const openFolder = () => folderInputRef.current?.click();
    window.addEventListener(IMPORT_FILES_EVENT, openFiles);
    window.addEventListener(IMPORT_FOLDER_EVENT, openFolder);
    return () => {
      window.removeEventListener(IMPORT_FILES_EVENT, openFiles);
      window.removeEventListener(IMPORT_FOLDER_EVENT, openFolder);
    };
  }, []);

  const toggleFolder = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const renderTree = (nodes: FileNode[], depth = 0) => {
    // Sort directories first, then files
    const sortedNodes = [...nodes].sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'directory' ? -1 : 1;
    });

    return sortedNodes.map((node) => {
      const isExpanded = expandedFolders.has(node.path);
      const isSelected = selectedFile === node.path;
      const paddingLeft = depth * 12 + 12;

      return (
        <div key={node.path}>
          <div
            className={cn(
              "flex items-center gap-1.5 py-1 px-2 cursor-pointer text-sm hover:bg-[#2a2a2a] transition-colors select-none",
              isSelected && "bg-[#37373d] text-white",
              !isSelected && "text-muted-foreground"
            )}
            style={{ paddingLeft: `${paddingLeft}px` }}
            onClick={(e) => {
              if (node.type === 'directory') {
                toggleFolder(node.path, e);
              } else {
                onFileSelect(node.path);
              }
            }}
          >
            {node.type === 'directory' ? (
              <span className="flex items-center gap-1.5 overflow-hidden">
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-70" />
                )}
                <Folder className={cn("w-3.5 h-3.5 shrink-0", isExpanded ? "text-blue-400" : "text-blue-300")} />
                <span className="truncate">{node.name}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 overflow-hidden">
                <span className="w-3.5" /> {/* Spacer for alignment */}
                <FileIcon className="w-3.5 h-3.5 shrink-0 opacity-70" />
                <span className={cn("truncate", isSelected ? "text-white" : "text-gray-300")}>
                  {node.name}
                </span>
              </span>
            )}
          </div>
          {node.type === 'directory' && isExpanded && node.children && (
            <div>{renderTree(node.children, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div
      className={cn("flex flex-col h-full bg-[#181818] border-r border-[#2b2b2b] relative", className)}
      onDragEnter={(e) => {
        e.preventDefault();
        dragCounter.current += 1;
        if (e.dataTransfer?.types?.includes('Files')) setIsDragOver(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        e.preventDefault();
        dragCounter.current = Math.max(0, dragCounter.current - 1);
        if (dragCounter.current === 0) setIsDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        dragCounter.current = 0;
        setIsDragOver(false);
        void handleImportList(e.dataTransfer?.files ?? null);
      }}
    >
      <div className="h-9 px-3 flex items-center justify-between border-b border-[#2b2b2b] shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Explorer</span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-[#333]"
            title="Import file(s)..."
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
          >
            <FileUp className={cn("w-3 h-3", isImporting && "animate-pulse")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-[#333]"
            title="Import folder..."
            onClick={() => folderInputRef.current?.click()}
            disabled={isImporting}
          >
            <FolderUp className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-[#333]" title="Refresh" onClick={fetchFiles}>
            <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Hidden pickers: one for files, one for folders (webkitdirectory) */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => void handleImportList(e.target.files)}
      />
      <input
        ref={setFolderInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => void handleImportList(e.target.files)}
      />

      {error && (
        <div className="px-3 py-1.5 text-[11px] text-red-400 border-b border-[#2b2b2b]">{error}</div>
      )}
      {(importStatus || isImporting) && (
        <div className="px-3 py-1.5 text-[11px] text-zinc-400 border-b border-[#2b2b2b] flex items-center gap-1.5">
          <Upload size={11} className={cn(isImporting && "animate-pulse")} />
          <span className="truncate">{importStatus ?? 'Importing...'}</span>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="py-2">
          {files.length === 0 ? (
            <div className="px-4 py-8 text-center space-y-3">
              <p className="text-xs text-muted-foreground">
                {isLoading ? 'Loading...' : isImporting ? 'Importing...' : 'No files found'}
              </p>
              {!isLoading && (
                <div className="flex flex-col gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] gap-1.5"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                  >
                    <FileUp size={12} />
                    Import files...
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] gap-1.5"
                    onClick={() => folderInputRef.current?.click()}
                    disabled={isImporting}
                  >
                    <FolderUp size={12} />
                    Import folder...
                  </Button>
                  <p className="text-[10px] text-muted-foreground/70">or drag &amp; drop here</p>
                </div>
              )}
            </div>
          ) : (
            renderTree(files)
          )}
        </div>
      </ScrollArea>

      {/* Drag-drop overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-10 bg-[#007acc]/10 border-2 border-dashed border-[#007acc]/60 flex items-center justify-center pointer-events-none">
          <div className="text-center space-y-1">
            <Upload size={20} className="mx-auto text-[#007acc]" />
            <p className="text-xs text-[#007acc] font-medium">Drop files / folders to import</p>
          </div>
        </div>
      )}
    </div>
  );
}

function buildFileTree(paths: string[]): FileNode[] {
  const root: FileNode[] = [];
  const nodeMap = new Map<string, FileNode>();
  const PREFIX = '/home/user/app';

  // Any path that is a proper prefix of another listed path is a directory,
  // even when `find` output doesn't list it explicitly (the stub sandbox
  // only returns file paths, so intermediate folders would otherwise vanish).
  const dirPaths = new Set<string>();
  for (const p of paths) {
    if (!p.startsWith(PREFIX)) continue;
    let rest = p.slice(PREFIX.length);
    // Collect every ancestor dir below PREFIX
    let idx = rest.lastIndexOf('/');
    while (idx > 0) {
      dirPaths.add(PREFIX + rest.slice(0, idx));
      idx = rest.slice(0, idx).lastIndexOf('/');
    }
  }

  const ensureDir = (dirPath: string): FileNode => {
    const hit = nodeMap.get(dirPath);
    if (hit) {
      hit.type = 'directory';
      if (!hit.children) hit.children = [];
      return hit;
    }
    const node: FileNode = {
      name: dirPath.split('/').pop() || dirPath,
      path: dirPath,
      type: 'directory',
      children: [],
    };
    nodeMap.set(dirPath, node);
    const parentPath = dirPath.slice(0, dirPath.lastIndexOf('/'));
    if (dirPath === PREFIX) {
      // virtual root, never rendered
    } else if (!parentPath || parentPath === PREFIX) {
      root.push(node);
    } else {
      ensureDir(parentPath).children!.push(node);
    }
    return node;
  };

  for (const path of paths) {
    if (!path.startsWith(PREFIX) || path === PREFIX) continue;
    if (dirPaths.has(path)) {
      ensureDir(path);
      continue;
    }
    const fileNode: FileNode = {
      name: path.split('/').pop() || path,
      path,
      type: 'file',
    };
    // If a later path nests under this one, it gets promoted to a directory.
    nodeMap.set(path, fileNode);
    const parentPath = path.slice(0, path.lastIndexOf('/'));
    if (!parentPath || parentPath === PREFIX) {
      root.push(fileNode);
    } else {
      const parent = ensureDir(parentPath);
      // Promote a leaf previously added as a file if it now has children
      const existing = parent.children!.find((c) => c.path === path);
      if (!existing) parent.children!.push(fileNode);
    }
  }

  // Promote leaves that turned out to be parents (listed explicitly AND nested under)
  for (const dirPath of dirPaths) {
    const node = nodeMap.get(dirPath);
    if (node && node.type === 'file') {
      node.type = 'directory';
      node.children = [];
    }
  }

  return root;
}
