import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { useAgent } from '@blinkdotnew/react';
import { codingAgent, askAgent } from '../lib/agent';
import { 
  Send, Bot, User, Wrench, Loader2, ChevronRight, ChevronDown, 
  Eye, RefreshCw, ExternalLink, Infinity, Check,
  Terminal, FolderOpen, Search, Globe, Maximize2, AtSign, Image as ImageIcon, Mic, MessageSquareText, Play,
  Rocket, Palette, Briefcase, PenTool, Video, Ticket
} from 'lucide-react';
import { getPreviewUrl } from '../lib/sandbox';
import { cn } from '../lib/utils';
import gsap from 'gsap';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';

interface ChatPanelProps {
  sandbox: any | null;
  isEmbedded?: boolean;
  initialPrompt?: string | null;
  onBuildStatusChange?: (isBuilding: boolean) => void;
}

const AI_MODELS = [
  { id: 'gpt-5.2', name: 'GPT-5.2', provider: 'OpenAI' },
  { id: 'claude-4.5-sonnet', name: 'Claude 4.5 Sonnet', provider: 'Anthropic' },
  { id: 'gemini-3-flash', name: 'Gemini 3 Flash', provider: 'Google' },
];

const AGENT_MODES = [
  { id: 'agent', name: 'Agent', icon: Infinity },
  { id: 'ask', name: 'Ask', icon: MessageSquareText },
];

const SUGGESTED_PROMPTS = [
  {
    title: "AI Startup Landing Page",
    prompt: "Build a sleek landing page for an AI startup that automates customer support. Use a dark theme with glass morphism, scroll-animated hero that pins while scrolling, and floating UI mockups. Cyan/teal accent colors.",
    icon: Rocket
  },
  {
    title: "Personal Portfolio",
    prompt: "Create a bold portfolio for a creative developer using kinetic typography - massive scrolling name in the hero, horizontal scroll project showcase, and neo-brutalist style with hard shadows and high contrast.",
    icon: Palette
  },
  {
    title: "Startup Pitch Page",
    prompt: "Create an editorial-style pitch website for a seed-stage startup. Serif typography (Playfair Display), cream/paper background, animated stat counters on scroll, and elegant asymmetric layouts.",
    icon: Briefcase
  },
  {
    title: "Design Agency Website",
    prompt: "Build a striking agency website with horizontal scroll portfolio section, neo-brutalist design with thick borders and bold color blocking. Include a kinetic marquee of client logos.",
    icon: PenTool
  },
  {
    title: "AI Tool or Web App",
    prompt: "Create a minimal web app UI for an AI writing tool. Vercel/Linear aesthetic with near-black sidebar, subtle hover states, and clean typography. Include a mock editor with floating toolbar.",
    icon: Bot
  },
  {
    title: "Creator / YouTuber Page",
    prompt: "Build an energetic personal brand site for a content creator. Use kinetic typography hero with scroll-triggered video grid, bold gradients, and playful micro-interactions on hover.",
    icon: Video
  },
  {
    title: "Event or Conference Page",
    prompt: "Create a dynamic conference landing page with pinned hero that reveals speaker cards on scroll, countdown timer animation, and a schedule section with staggered entrance animations. Dark theme with neon accent.",
    icon: Ticket
  },
];

export function ChatPanel({ sandbox, isEmbedded = false, initialPrompt = null, onBuildStatusChange }: ChatPanelProps) {
  const sandboxId = sandbox?.id || null;
  const [previewKey, setPreviewKey] = useState(0);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [trustDelayPassed, setTrustDelayPassed] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0]); // Default to GPT-5.2 as per screenshot
  const [agentMode, setAgentMode] = useState(AGENT_MODES[0]); // Default to Agent

  const currentAgent = agentMode.id === 'ask' ? askAgent : codingAgent;

  // Load chat history from localStorage if available
  const savedMessages = React.useMemo(() => {
    if (!sandboxId) return [];
    try {
      const saved = localStorage.getItem(`chat_history_${sandboxId}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load chat history:', e);
      return [];
    }
  }, [sandboxId]);

  const { messages, input, handleSubmit, handleInputChange, isLoading, sendMessage, setInput } = useAgent({
    agent: currentAgent,
    sandbox: sandbox,
    initialMessages: savedMessages,
  });

  // Save chat history to localStorage
  useEffect(() => {
    if (messages.length > 0 && sandboxId) {
      localStorage.setItem(`chat_history_${sandboxId}`, JSON.stringify(messages));
    }
  }, [messages, sandboxId]);

  // Notify parent about build status
  useEffect(() => {
    if (onBuildStatusChange) {
      // Only report building status if we are NOT in ask mode
      // In ask mode, we are just chatting/reading, not building
      const isBuildingAgent = agentMode.id !== 'ask';
      onBuildStatusChange(isBuildingAgent && isLoading);
    }
  }, [isLoading, onBuildStatusChange, agentMode.id]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialFormRef = useRef<HTMLDivElement>(null);
  const prevHasMessages = useRef(false);
  const initialPromptProcessed = useRef(false);
  
  const hasMessages = messages.length > 0;

  // Reset processed flag when sandbox changes (for history switching)
  useEffect(() => {
    if (sandboxId) {
      initialPromptProcessed.current = false;
    }
  }, [sandboxId]);

  // Handle initial prompt
  useEffect(() => {
    if (initialPrompt && sandboxId && !initialPromptProcessed.current) {
      initialPromptProcessed.current = true;
      sendMessage(initialPrompt);
    }
  }, [initialPrompt, sandboxId]);

  // Initial entrance animation for the centered form
  useEffect(() => {
    if (!hasMessages && initialFormRef.current) {
      gsap.fromTo(initialFormRef.current,
        {
          y: 30,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
        }
      );
    }
  }, []);

  // GSAP Animation for sidebar transition
  useLayoutEffect(() => {
    // Only trigger when transitioning from no messages to has messages
    if (hasMessages && !prevHasMessages.current && sidebarRef.current && previewRef.current) {
      prevHasMessages.current = true;
      
      // Set initial states for smooth entrance
      gsap.set(sidebarRef.current, {
        x: -320,
        opacity: 0,
      });
      gsap.set(previewRef.current, {
        opacity: 0,
        scale: 0.95,
        x: 50,
      });

      // Create timeline for smooth, coordinated animation
      const tl = gsap.timeline({
        defaults: {
          ease: 'power3.out',
        },
        onComplete: () => setHasAnimated(true),
      });

      // Animate sidebar sliding in from left with a professional feel
      tl.to(sidebarRef.current, {
        x: 0,
        opacity: 1,
        duration: 0.7,
        ease: 'power4.out',
      });

      // Animate preview panel fading in with scale and position
      tl.to(previewRef.current, {
        opacity: 1,
        scale: 1,
        x: 0,
        duration: 0.6,
        ease: 'power3.out',
      }, '-=0.5'); // Overlap with sidebar animation for fluid feel

      // Stagger animate the chat messages for polish
      const chatMessages = sidebarRef.current.querySelectorAll('[data-chat-message]');
      if (chatMessages.length > 0) {
        tl.fromTo(chatMessages, 
          {
            y: 15,
            opacity: 0,
          },
          {
            y: 0,
            opacity: 1,
            duration: 0.35,
            stagger: 0.08,
            ease: 'power2.out',
          },
          '-=0.35'
        );
      }

      // Animate the preview header for extra polish
      const previewHeader = previewRef.current.querySelector('[data-preview-header]');
      if (previewHeader) {
        tl.fromTo(previewHeader,
          {
            y: -10,
            opacity: 0,
          },
          {
            y: 0,
            opacity: 1,
            duration: 0.3,
            ease: 'power2.out',
          },
          '-=0.3'
        );
      }
    }
  }, [hasMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Preview trust delay
  useEffect(() => {
    if (isLoading) {
      setTrustDelayPassed(false);
    } else {
      const timer = setTimeout(() => setTrustDelayPassed(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  const onFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sandbox || !input.trim()) return;
    await sendMessage(input);
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
  };

  const toggleToolExpand = (toolId: string) => {
    const newExpanded = new Set(expandedTools);
    if (newExpanded.has(toolId)) {
      newExpanded.delete(toolId);
    } else {
      newExpanded.add(toolId);
    }
    setExpandedTools(newExpanded);
  };

  const refreshPreview = () => setPreviewKey(prev => prev + 1);
  
  const openInNewTab = () => {
    if (sandboxId) {
      window.open(getPreviewUrl(sandboxId), '_blank');
    }
  };

  // Embedded mode in 3-panel layout
  if (isEmbedded) {
    return (
      <div className="h-full flex flex-col bg-secondary/30 overflow-hidden" ref={containerRef}>
        {/* Chat Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full max-w-sm mx-auto space-y-6">
              <div className="space-y-2 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Bot size={24} className="text-primary" />
                </div>
                <h3 className="text-sm font-medium text-foreground">AI Chat</h3>
                <p className="text-xs text-muted-foreground/60 max-w-[240px] mx-auto">
                  Ask Cursor to build anything. The agent can write code, run commands, and preview the app.
                </p>
              </div>

              <div className="w-full space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/40 font-semibold text-center mb-3">
                  Suggestions
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {SUGGESTED_PROMPTS.slice(0, 4).map((item, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestedPrompt(item.prompt)}
                      className="group flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border/30 hover:bg-secondary hover:border-border/60 transition-all text-left w-full"
                    >
                      <div className="p-1.5 rounded-md bg-background/50 text-muted-foreground group-hover:text-foreground transition-colors">
                        <item.icon size={14} />
                      </div>
                      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors truncate">
                        {item.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div 
                key={m.id || i} 
                className={cn(
                  "flex flex-col gap-1",
                  m.role === 'user' ? "items-end" : "items-start"
                )}
                data-chat-message
              >
                {/* User Message */}
                {m.role === 'user' && (
                  <div className="bg-[#2d2d2d] text-foreground rounded-2xl px-4 py-2.5 text-[13px] max-w-[90%] shadow-sm">
                    <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  </div>
                )}
                
                {/* Assistant Message */}
                {m.role !== 'user' && (
                  <div className="text-foreground/90 text-[13px] px-1 max-w-full overflow-hidden">
                    {m.content && (
                      <p className="whitespace-pre-wrap leading-relaxed mb-2">{m.content}</p>
                    )}
                    
                    {m.parts?.filter(p => p.type === 'tool-invocation').map((part: any, idx: number) => {
                      const toolId = `${m.id || i}-${idx}`;
                      const isExpanded = expandedTools.has(toolId);
                      
                      return (
                        <div 
                          key={idx} 
                          className="bg-secondary/50 rounded border border-border/30 overflow-hidden mb-1.5 last:mb-0"
                        >
                          <button
                            onClick={() => toggleToolExpand(toolId)}
                            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-left hover:bg-secondary/70 transition-colors"
                          >
                            <Wrench className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                            <span className="text-[10px] font-mono text-muted-foreground flex-1 truncate">
                              {part.toolName}
                            </span>
                            <span className={cn(
                              "text-[9px] px-1 py-0.5 rounded font-medium shrink-0",
                              part.state === 'pending' 
                                ? "text-amber-500" 
                                : "text-emerald-500"
                            )}>
                              {part.state === 'pending' ? '...' : '✓'}
                            </span>
                            {isExpanded 
                              ? <ChevronDown className="w-2.5 h-2.5 text-muted-foreground shrink-0" /> 
                              : <ChevronRight className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                            }
                          </button>
                          
                          {isExpanded && part.input && (
                            <div className="px-2 pb-1.5 border-t border-border/20">
                              <pre className="text-[9px] font-mono text-muted-foreground/60 mt-1.5 overflow-x-auto whitespace-pre-wrap break-all">
                                {JSON.stringify(part.input, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex items-start px-1 mt-1">
              <span className="text-[13px] font-medium animate-shimmer bg-clip-text text-transparent bg-[linear-gradient(110deg,#939393,45%,#e5e5e5,55%,#939393)] bg-[length:250%_100%]">
                Planning next moves
              </span>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="p-3 border-t border-border bg-background shrink-0">
          <form onSubmit={onFormSubmit} className="relative group bg-[#18181b] rounded-xl border border-border/40 focus-within:border-border/60 focus-within:ring-1 focus-within:ring-border/40 transition-all shadow-sm">
            <textarea
              value={input}
              onChange={handleInputChange}
              placeholder={isLoading ? "Agent is working..." : !sandboxId ? "Initializing sandbox..." : "Ask Cursor to build..."}
              className="w-full bg-transparent px-4 py-3 pr-10 text-[13px] leading-relaxed focus:outline-none min-h-[80px] max-h-[200px] resize-none placeholder:text-muted-foreground/50 font-normal"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!isLoading && sandboxId && input.trim()) {
                    onFormSubmit(e as any);
                  }
                }
              }}
              rows={1}
              disabled={!sandboxId}
            />
            
            <div className="px-3 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-1.5 hover:text-foreground/80 transition-colors focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-1">
                        <agentMode.icon size={12} />
                        <span>{agentMode.name}</span>
                        <ChevronDown size={10} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-[#1a1a1a] border-border/50 text-xs z-50">
                      {AGENT_MODES.map((mode) => (
                        <DropdownMenuItem 
                          key={mode.id} 
                          onClick={() => setAgentMode(mode)}
                          className="gap-2 cursor-pointer focus:bg-[#252525]"
                        >
                          <mode.icon size={12} />
                          {mode.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="w-[1px] h-3 bg-border/50 mx-1" />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-1.5 hover:text-foreground/80 transition-colors focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-1">
                        <span>{selectedModel.name}</span>
                        <ChevronDown size={10} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-[#1a1a1a] border-border/50 text-xs min-w-[140px] z-50">
                      {AI_MODELS.map((model) => (
                        <DropdownMenuItem 
                          key={model.id} 
                          onClick={() => setSelectedModel(model)}
                          className="flex items-center justify-between gap-2 cursor-pointer focus:bg-[#252525] py-2 px-3"
                        >
                          <div className="flex flex-col items-start gap-0.5">
                            <span className="font-medium text-foreground">{model.name}</span>
                            <span className="text-[10px] text-muted-foreground/60">{model.provider}</span>
                          </div>
                          {selectedModel.id === model.id && (
                            <Check size={12} className="text-foreground" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              <div className="flex items-center gap-1 text-muted-foreground/40">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 hover:text-foreground">
                  <AtSign size={14} />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 hover:text-foreground">
                  <Globe size={14} />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 hover:text-foreground">
                  <ImageIcon size={14} />
                </Button>
                {isLoading ? (
                  <div className="ml-2 p-1.5 bg-amber-500/10 text-amber-500 rounded-md flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim() || !sandboxId}
                    className="ml-2 p-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Initial state: centered input (full screen mode)
  if (!hasMessages) {
    return (
      <div className="h-full flex bg-background" ref={containerRef}>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
          {/* Logo and Shortcuts */}
          <div className="mb-12 flex flex-col items-center">
            <div className="w-20 h-20 mb-8 opacity-20">
              <img src="/cursor_logo.png" alt="Cursor" className="w-full h-full" />
            </div>
            
            {/* Suggestions Grid for Full Screen Mode */}
            <div className="w-full max-w-2xl mt-8">
              <div className="grid grid-cols-2 gap-3 text-left">
                {SUGGESTED_PROMPTS.slice(0, 6).map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestedPrompt(item.prompt)}
                    className="group flex items-center gap-3 p-3 rounded-xl bg-[#18181b] border border-white/[0.03] hover:border-white/[0.08] hover:bg-[#202020] transition-all"
                  >
                    <div className="p-2 rounded-lg bg-white/[0.03] text-muted-foreground group-hover:text-foreground transition-colors">
                      <item.icon size={16} />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[13px] font-medium text-foreground/80 group-hover:text-foreground transition-colors truncate">
                        {item.title}
                      </span>
                      <span className="text-[11px] text-muted-foreground/50 truncate">
                        {item.prompt.slice(0, 40)}...
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="absolute left-4 top-4 text-[13px] font-medium text-foreground">
            New Chat
            <div className="inline-flex items-center gap-2 ml-4">
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                <span className="text-lg leading-none">+</span>
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                <RefreshCw size={12} />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                <span className="text-lg leading-none">...</span>
              </Button>
            </div>
          </div>

          <div className="w-full max-w-xl fixed left-4 top-20" ref={initialFormRef}>
            <form onSubmit={onFormSubmit} className="relative group bg-[#18181b] rounded-xl border border-border/40 shadow-2xl">
              <textarea
                value={input}
                onChange={handleInputChange}
                placeholder="Ask Cursor to build..."
                className="relative w-full bg-transparent px-4 py-4 pr-14 text-[13px] leading-relaxed focus:outline-none min-h-[140px] max-h-[300px] resize-none placeholder:text-muted-foreground/50 font-normal rounded-xl"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onFormSubmit(e as any);
                  }
                }}
                disabled={isLoading || !sandboxId}
              />
              
              <div className="relative px-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1.5 hover:text-foreground/80 transition-colors focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                          <Infinity size={12} />
                          <span>Agent</span>
                          <ChevronDown size={10} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="bg-[#1a1a1a] border-border/50 text-xs">
                        <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-[#252525]">
                          <Infinity size={12} />
                          Agent
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-[#252525]">
                          <MessageSquareText size={12} />
                          Ask
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="w-[1px] h-3 bg-border/50 mx-1" />

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1.5 hover:text-foreground/80 transition-colors focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                          <span>{selectedModel.name}</span>
                          <ChevronDown size={10} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="bg-[#1a1a1a] border-border/50 text-xs min-w-[140px]">
                        {AI_MODELS.map((model) => (
                          <DropdownMenuItem 
                            key={model.id} 
                            onClick={() => setSelectedModel(model)}
                            className="flex items-center justify-between gap-2 cursor-pointer focus:bg-[#252525] py-2 px-3"
                          >
                            <div className="flex flex-col items-start gap-0.5">
                              <span className="font-medium text-foreground">{model.name}</span>
                              <span className="text-[10px] text-muted-foreground/60">{model.provider}</span>
                            </div>
                            {selectedModel.id === model.id && (
                              <Check size={12} className="text-foreground" />
                            )}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 text-muted-foreground/40">
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-foreground">
                    <AtSign size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-foreground">
                    <Globe size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-foreground">
                    <ImageIcon size={14} />
                  </Button>
                </div>
              </div>
            </form>
            
            <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground/40 px-1">
              <FolderOpen size={12} />
              <span>Local</span>
              <ChevronDown size={10} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // After first message: Left sidebar (chat) + Right panel (preview)
  return (
    <div className="h-full flex bg-background" ref={containerRef}>
      {/* Left Sidebar - Chat */}
      <div className="w-[320px] border-r border-border flex flex-col bg-secondary/30 shrink-0" ref={sidebarRef}>
        {/* Chat Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.map((m, i) => (
            <div 
              key={m.id || i} 
              className={cn(
                "flex flex-col gap-1",
                m.role === 'user' ? "items-end" : "items-start"
              )}
              data-chat-message // Added for GSAP stagger
            >
              {/* User Message */}
              {m.role === 'user' && (
                <div className="bg-[#2d2d2d] text-foreground rounded-2xl px-4 py-2.5 text-[13px] max-w-[90%] shadow-sm">
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </div>
              )}
              
              {/* Assistant Message */}
              {m.role !== 'user' && (
                <div className="text-foreground/90 text-[13px] px-1 max-w-full overflow-hidden">
                  {m.content && (
                    <p className="whitespace-pre-wrap leading-relaxed mb-2">{m.content}</p>
                  )}
                  
                  {m.parts?.filter(p => p.type === 'tool-invocation').map((part: any, idx: number) => {
                    const toolId = `${m.id || i}-${idx}`;
                    const isExpanded = expandedTools.has(toolId);
                    
                    return (
                      <div 
                        key={idx} 
                        className="bg-secondary/50 rounded border border-border/30 overflow-hidden mb-1.5 last:mb-0"
                      >
                        <button
                          onClick={() => toggleToolExpand(toolId)}
                          className="w-full flex items-center gap-1.5 px-2 py-1.5 text-left hover:bg-secondary/70 transition-colors"
                        >
                          <Wrench className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                          <span className="text-[10px] font-mono text-muted-foreground flex-1 truncate">
                            {part.toolName}
                          </span>
                          <span className={cn(
                            "text-[9px] px-1 py-0.5 rounded font-medium shrink-0",
                            part.state === 'pending' 
                              ? "text-amber-500" 
                              : "text-emerald-500"
                          )}>
                            {part.state === 'pending' ? '...' : '✓'}
                          </span>
                          {isExpanded 
                            ? <ChevronDown className="w-2.5 h-2.5 text-muted-foreground shrink-0" /> 
                            : <ChevronRight className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                          }
                        </button>
                        
                        {isExpanded && part.input && (
                          <div className="px-2 pb-1.5 border-t border-border/20">
                            <pre className="text-[9px] font-mono text-muted-foreground/60 mt-1.5 overflow-x-auto whitespace-pre-wrap break-all">
                              {JSON.stringify(part.input, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-start px-1 mt-1">
              <span className="text-[13px] font-medium animate-shimmer bg-clip-text text-transparent bg-[linear-gradient(110deg,#939393,45%,#e5e5e5,55%,#939393)] bg-[length:250%_100%]">
                Planning next moves
              </span>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="p-3 border-t border-border bg-background shrink-0">
          <form onSubmit={onFormSubmit} className="relative group bg-[#18181b] rounded-xl border border-border/40 focus-within:border-border/60 focus-within:ring-1 focus-within:ring-border/40 transition-all shadow-sm">
            <textarea
              value={input}
              onChange={handleInputChange}
              placeholder={isLoading ? "Agent is working..." : !sandboxId ? "Initializing sandbox..." : "Ask Cursor to build..."}
              className="w-full bg-transparent px-4 py-3 pr-10 text-[13px] leading-relaxed focus:outline-none min-h-[100px] max-h-[300px] resize-none placeholder:text-muted-foreground/50 font-normal"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!isLoading && sandboxId && input.trim()) {
                    onFormSubmit(e as any);
                  }
                }
              }}
              rows={1}
              disabled={!sandboxId}
            />
            
            <div className="px-3 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-1.5 hover:text-foreground/80 transition-colors focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-1">
                        <agentMode.icon size={12} />
                        <span>{agentMode.name}</span>
                        <ChevronDown size={10} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-[#1a1a1a] border-border/50 text-xs z-50">
                      {AGENT_MODES.map((mode) => (
                        <DropdownMenuItem 
                          key={mode.id} 
                          onClick={() => setAgentMode(mode)}
                          className="gap-2 cursor-pointer focus:bg-[#252525]"
                        >
                          <mode.icon size={12} />
                          {mode.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="w-[1px] h-3 bg-border/50 mx-1" />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-1.5 hover:text-foreground/80 transition-colors focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-1">
                        <span>{selectedModel.name}</span>
                        <ChevronDown size={10} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-[#1a1a1a] border-border/50 text-xs min-w-[140px] z-50">
                      {AI_MODELS.map((model) => (
                        <DropdownMenuItem 
                          key={model.id} 
                          onClick={() => setSelectedModel(model)}
                          className="flex items-center justify-between gap-2 cursor-pointer focus:bg-[#252525] py-2 px-3"
                        >
                          <div className="flex flex-col items-start gap-0.5">
                            <span className="font-medium text-foreground">{model.name}</span>
                            <span className="text-[10px] text-muted-foreground/60">{model.provider}</span>
                          </div>
                          {selectedModel.id === model.id && (
                            <Check size={12} className="text-foreground" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              <div className="flex items-center gap-1 text-muted-foreground/40">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 hover:text-foreground">
                  <AtSign size={14} />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 hover:text-foreground">
                  <Globe size={14} />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 hover:text-foreground">
                  <ImageIcon size={14} />
                </Button>
                {isLoading ? (
                  <div className="ml-2 p-1.5 bg-amber-500/10 text-amber-500 rounded-md flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim() || !sandboxId}
                    className="ml-2 p-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Right Panel - Preview Only */}
      <div className="flex-1 flex flex-col bg-background min-w-0" ref={previewRef}>
        {/* Preview Header */}
        <div className="h-10 border-b border-border flex items-center justify-between px-3 bg-secondary shrink-0" data-preview-header>
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground/70">Preview</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={openInNewTab}
              className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"
              title="Open in new tab"
              disabled={!sandboxId}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={refreshPreview}
              className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"
              title="Refresh Preview"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        
        {/* Preview Content */}
        <div className="flex-1 overflow-hidden">
          {sandboxId && trustDelayPassed ? (
            <iframe
              key={previewKey}
              src={getPreviewUrl(sandboxId)}
              className="w-full h-full border-none bg-white"
              title="App Preview"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary text-muted-foreground text-sm">
              {!sandboxId ? 'Waiting for sandbox...' : 'Loading preview...'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
