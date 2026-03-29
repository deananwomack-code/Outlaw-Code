import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Eye, RefreshCw, ExternalLink } from 'lucide-react';
import { getPreviewUrl } from '../lib/sandbox';
import { cn } from '../lib/utils';
import { ChatPanel } from './ChatPanel';
import { LoadingAnimation } from './LoadingAnimation';
import { BuildingScreen } from './BuildingScreen';
import { Button } from './ui/button';

interface EditorLayoutProps {
  sandbox: any | null;
  initialPrompt?: string | null;
}

export function EditorLayout({ sandbox, initialPrompt }: EditorLayoutProps) {
  const [previewKey, setPreviewKey] = useState(0);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isWaitingForReload, setIsWaitingForReload] = useState(false);
  const [chatWidth, setChatWidth] = useState(450); // Default width for Chat Panel
  const [isResizing, setIsResizing] = useState(false);
  
  // Track previous build state to trigger auto-reload
  const prevBuildingRef = useRef(false);

  // Track build status
  const handleBuildStatusChange = (building: boolean) => {
    setIsBuilding(building);
  };

  const refreshPreview = () => setPreviewKey(prev => prev + 1);

  // Auto-reload preview when build finishes
  useEffect(() => {
    if (prevBuildingRef.current && !isBuilding) {
      // Build finished. Keep showing loader while we wait for server to be ready.
      setIsWaitingForReload(true);
      
      // Extended delay (2.5s) to ensure the dev server is fully listening
      // before we reload the iframe, preventing "Connection Refused" errors.
      const timer = setTimeout(() => {
        refreshPreview();
        setIsWaitingForReload(false);
      }, 2500);
      
      return () => clearTimeout(timer);
    }
    prevBuildingRef.current = isBuilding;
  }, [isBuilding]);

  const openInNewTab = () => {
    if (sandbox?.id) {
      window.open(getPreviewUrl(sandbox.id), '_blank');
    }
  };

  // Resizing Logic
  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        // Calculate new width based on mouse X (Left Panel)
        const newWidth = e.clientX;
        // Limits
        if (newWidth > 300 && newWidth < 800) {
          setChatWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  return (
    <div className="relative h-full w-full bg-background overflow-hidden flex flex-row">
      
      {/* CHAT PANEL (Left Side) */}
      <div 
        className={cn(
          "h-full z-20 bg-background border-r border-border shadow-xl flex flex-col relative shrink-0",
          isResizing && "select-none" // Disable interaction during resize
        )}
        style={{ width: chatWidth }}
      >
        <ChatPanel 
          key={sandbox?.id || 'no-sandbox'}
          sandbox={sandbox} 
          isEmbedded={true} 
          initialPrompt={initialPrompt} 
          onBuildStatusChange={handleBuildStatusChange} 
        />
        
        {/* Resizer Handle (Right Edge) */}
        <div 
          onMouseDown={startResizing}
          className="absolute right-0 top-0 bottom-0 w-1 -mr-0.5 cursor-ew-resize hover:bg-primary/50 transition-colors z-30 group flex items-center justify-center"
        >
          <div className="w-[1px] h-8 bg-border group-hover:bg-primary transition-colors" />
        </div>
      </div>

      {/* PREVIEW PANEL (Right Side / Flex-1) */}
      <div className="flex-1 h-full bg-card flex flex-col relative z-0 min-w-0">
        {/* Header */}
        <div className="h-10 border-b border-border flex items-center justify-between px-3 bg-background shrink-0">
          <div className="flex items-center gap-1">
            <div className="px-3 py-1.5 rounded-sm text-xs font-medium bg-card text-foreground shadow-sm flex items-center gap-2">
              <Eye size={14} />
              Preview
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={openInNewTab} title="Open in New Tab">
              <ExternalLink size={12} />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={refreshPreview} title="Refresh">
              <RefreshCw size={12} className={cn(isBuilding && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-hidden relative bg-black">
          {sandbox?.id ? (
            <>
              {/* Actual Preview Iframe */}
              <iframe
                key={previewKey}
                src={getPreviewUrl(sandbox.id)}
                className="w-full h-full border-none"
                title="App Preview"
              />
              
              {/* Building Screen Overlay */}
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
      </div>

      {/* Resize Overlay - Covers everything during resize to prevent iframe interaction issues */}
      {isResizing && (
        <div className="fixed inset-0 z-50 cursor-ew-resize bg-transparent" />
      )}
    </div>
  );
}