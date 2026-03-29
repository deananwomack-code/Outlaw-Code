import { useEffect, useState, useRef } from 'react';
import { useBlinkAuth } from '@blinkdotnew/react';
import { createSandbox } from './lib/sandbox';
import { blink } from './lib/blink';
import { AdminLogin } from './components/AdminLogin';
import { PromptScreen } from './components/PromptScreen';
import { EditorLayout } from './components/EditorLayout';
import { HistoryModal, Project } from './components/HistoryModal';
import { PanelLeft, ChevronLeft, ChevronRight, Settings, History as HistoryIcon, Plus } from 'lucide-react';
import { Button } from './components/ui/button';
import gsap from 'gsap';
import { cn } from './lib/utils';

export default function App() {
  const { isAuthenticated, isLoading: authLoading } = useBlinkAuth();
  const [sandbox, setSandbox] = useState<any>(null);
  const [sandboxError, setSandboxError] = useState<string | null>(null);
  
  // Initialize state based on URL params to prevent flash of prompt screen on reload
  const hasUrlSandbox = typeof window !== 'undefined' && !!new URLSearchParams(window.location.search).get('sandboxId');
  
  const [hasPromptStarted, setHasPromptStarted] = useState(hasUrlSandbox);
  const [showEditor, setShowEditor] = useState(hasUrlSandbox);
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [shouldCreateProject, setShouldCreateProject] = useState(false);

  const promptScreenRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const handleStartPrompt = async (prompt: string) => {
    setInitialPrompt(prompt);
    setHasPromptStarted(true);
    setShouldCreateProject(true);

    if (sandbox?.id) {
      window.history.pushState({}, '', `?sandboxId=${sandbox.id}`);
    }

    // Transition animation
    const tl = gsap.timeline({
      onComplete: () => {
        setShowEditor(true);
      }
    });

    if (promptScreenRef.current) {
      tl.to(promptScreenRef.current, {
        opacity: 0,
        scale: 0.95,
        filter: "blur(10px)",
        duration: 0.8,
        ease: "power2.inOut"
      });
    }

    if (editorRef.current) {
      tl.fromTo(editorRef.current, 
        { opacity: 0, scale: 1.05, filter: "blur(10px)" },
        { opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.2, ease: "power3.out" },
        "-=0.4"
      );
    }
  };

  const handleSelectProject = async (project: Project) => {
    setShowHistory(false);
    setShouldCreateProject(false);
    
    // If selecting the same sandbox, do nothing
    if (sandbox?.id === project.sandboxId) return;

    // Update URL
    window.history.pushState({}, '', `?sandboxId=${project.sandboxId}`);

    // Reset UI to show loading/transition if needed, or just switch context
    // Ideally we keep the editor visible but show a loading state inside it.
    // For now, let's just connect.
    
    try {
      // Connect to the old sandbox
      const newSandbox = await (blink as any).sandbox.connect(project.sandboxId);
      setSandbox(newSandbox);
      setInitialPrompt(project.prompt);
      
      // If we are on prompt screen, switch to editor
      if (!showEditor) {
        setHasPromptStarted(true);
        setShowEditor(true);
        // Reset styles set by animation manually since we skipped animation
        if (promptScreenRef.current) promptScreenRef.current.style.display = 'none';
        if (editorRef.current) {
          editorRef.current.style.opacity = '1';
          editorRef.current.style.visibility = 'visible';
          editorRef.current.style.filter = 'blur(0px)';
          editorRef.current.style.transform = 'scale(1)';
        }
      }
    } catch (err) {
      console.error("Failed to connect to sandbox", err);
      alert("Could not connect to this sandbox. It might have expired.");
    }
  };

  useEffect(() => {
    if (isAuthenticated && !sandbox) {
      const initSandbox = async () => {
        try {
          // Check for sandboxId in URL
          const params = new URLSearchParams(window.location.search);
          const sandboxId = params.get('sandboxId');

          if (sandboxId) {
            try {
              const sb = await (blink as any).sandbox.connect(sandboxId);
              setSandbox(sb);
              // Restore view state for existing sandbox
              setHasPromptStarted(true);
              setShowEditor(true);
              return;
            } catch (err) {
              console.error("Failed to restore sandbox", err);
              // If failed, clear URL and fall back to creating new
              window.history.replaceState({}, '', '/');
              // Reset UI to prompt screen
              setHasPromptStarted(false);
              setShowEditor(false);
            }
          }

          const sb = await createSandbox();
          setSandbox(sb);
        } catch (err) {
          setSandboxError(err instanceof Error ? err.message : 'Failed to initialize sandbox');
        }
      };
      initSandbox();
    }
  }, [isAuthenticated, sandbox]);

  // Handle project creation when sandbox and prompt are ready
  useEffect(() => {
    const createProjectRecord = async () => {
      if (shouldCreateProject && sandbox?.id && initialPrompt && isAuthenticated) {
        try {
          const user = await blink.auth.me();
          if (user) {
            await blink.db.projects.create({
              userId: user.id,
              name: initialPrompt.slice(0, 30) + (initialPrompt.length > 30 ? '...' : ''),
              prompt: initialPrompt,
              sandboxId: sandbox.id,
              createdAt: new Date().toISOString()
            });
            setShouldCreateProject(false); // Mark as done
          }
        } catch (err) {
          console.error('Failed to save project history', err);
        }
      }
    };

    createProjectRecord();
  }, [shouldCreateProject, sandbox, initialPrompt, isAuthenticated]);

  const handleHome = () => {
    window.history.pushState({}, '', '/');
    window.location.reload();
  };

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted-foreground border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  return (
    <div className="h-screen w-screen bg-background relative overflow-hidden">
      {/* History Modal */}
      <HistoryModal 
        isOpen={showHistory} 
        onClose={() => setShowHistory(false)} 
        onSelectProject={handleSelectProject}
        currentSandboxId={sandbox?.id}
      />

      {/* Prompt Screen Layer */}
      <div 
        ref={promptScreenRef}
        className={cn(
          "absolute inset-0 z-50 bg-background transition-colors duration-500",
          hasPromptStarted && "pointer-events-none"
        )}
        style={{ display: showEditor ? 'none' : 'block' }}
      >
        <PromptScreen onStart={handleStartPrompt} />
        
        {/* History Button on Prompt Screen too? Optional but useful */}
        <div className="absolute top-4 right-4 z-50">
           <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground hover:text-foreground gap-2"
            onClick={() => setShowHistory(true)}
          >
            <HistoryIcon size={16} />
            History
          </Button>
        </div>
      </div>

      {/* Editor Layer */}
      <div 
        ref={editorRef}
        className={cn(
          "h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden font-sans",
          !hasPromptStarted ? "opacity-0 invisible" : "opacity-100 visible"
        )}
      >
        {/* Refined Header - Cursor Style */}
        <header className="h-10 border-b border-border flex items-center justify-between px-3 bg-background shrink-0 select-none">
          {/* Left Section */}
          <div className="flex items-center gap-2 px-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={handleHome}>
            <svg fill="none" height="22" viewBox="0 0 545 545" width="22" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g fill="currentColor"><path d="m466.383 137.073-206.469-119.2034c-6.63-3.8287-14.811-3.8287-21.441 0l-206.4586 119.2034c-5.5734 3.218-9.0144 9.169-9.0144 15.615v240.375c0 6.436 3.441 12.397 9.0144 15.615l206.4686 119.203c6.63 3.829 14.811 3.829 21.441 0l206.468-119.203c5.574-3.218 9.015-9.17 9.015-15.615v-240.375c0-6.436-3.441-12.397-9.015-15.615zm-12.969 25.25-199.316 345.223c-1.347 2.326-4.904 1.376-4.904-1.319v-226.048c0-4.517-2.414-8.695-6.33-10.963l-195.7577-113.019c-2.3263-1.347-1.3764-4.905 1.3182-4.905h398.6305c5.661 0 9.199 6.136 6.368 11.041h-.009z"></path></g></svg>
          </div>

          {/* Center Section */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">
              Cursor
            </span>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-0.5 px-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-muted-foreground hover:text-foreground hover:bg-transparent gap-1.5 px-2 mr-1"
              onClick={handleHome}
            >
              <Plus size={14} />
              <span className="text-[11px]">New Chat</span>
            </Button>

            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-muted-foreground hover:text-foreground hover:bg-transparent gap-1.5 px-2 mr-1"
              onClick={() => setShowHistory(true)}
            >
              <HistoryIcon size={14} />
              <span className="text-[11px]">History</span>
            </Button>

            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-transparent">
              <Settings size={14} />
            </Button>
          </div>
        </header>

        {/* Main Content - 3-Panel Layout */}
        <main className="flex-1 overflow-hidden">
          <EditorLayout sandbox={sandbox} initialPrompt={initialPrompt} />
        </main>
      </div>
    </div>
  );
}
