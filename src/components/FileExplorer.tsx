import React, { useEffect, useState } from 'react';
import { Folder, File as FileIcon, ChevronRight, ChevronDown, RefreshCw, FolderOpen } from 'lucide-react';
import { cn } from '../lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';

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
}

export function FileExplorer({ sandbox, onFileSelect, selectedFile, className }: FileExplorerProps) {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = async () => {
    if (!sandbox) return;
    setIsLoading(true);
    setError(null);

    try {
      // Use ls -R to get recursive listing
      // -F adds / to directories
      const { stdout } = await sandbox.commands.run('find /home/user/app -maxdepth 3 -not -path "*/node_modules/*" -not -path "*/.git/*"');
      
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
    <div className={cn("flex flex-col h-full bg-[#181818] border-r border-[#2b2b2b]", className)}>
      <div className="h-9 px-3 flex items-center justify-between border-b border-[#2b2b2b] shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Explorer</span>
        <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-[#333]" onClick={fetchFiles}>
          <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="py-2">
          {files.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              {isLoading ? 'Loading...' : 'No files found'}
            </div>
          ) : (
            renderTree(files)
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function buildFileTree(paths: string[]): FileNode[] {
  const root: FileNode[] = [];
  const map: Record<string, FileNode> = {};

  paths.forEach(path => {
    // Skip the root app dir itself if listed
    if (path === '/home/user/app') return;

    const parts = path.split('/');
    const fileName = parts.pop()!;
    const parentPath = parts.join('/');
    
    // Only process files inside /home/user/app
    if (!path.startsWith('/home/user/app')) return;

    const node: FileNode = {
      name: fileName,
      path,
      type: 'file', // Assume file initially
      children: []
    };

    map[path] = node;

    // Determine if it's likely a directory (if it's a parent of another path)
    // Actually `find` command doesn't distinguish easily without -type d
    // But since we are building a tree, if we see this path as a parent later, we'll know
  });

  // Re-process to structure the tree
  paths.forEach(path => {
    if (!path.startsWith('/home/user/app') || path === '/home/user/app') return;
    
    const parts = path.split('/');
    const fileName = parts.pop()!;
    const parentPath = parts.join('/');
    
    const node = map[path];
    if (!node) return;

    if (parentPath === '/home/user/app') {
      root.push(node);
    } else {
      let parent = map[parentPath];
      // If parent not found (maybe filtered out), we might need to create it or skip
      // For simplicity, we just look up the parent in map.
      if (parent) {
        parent.type = 'directory'; // It has children, so it's a dir
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      }
    }
  });

  return root;
}
