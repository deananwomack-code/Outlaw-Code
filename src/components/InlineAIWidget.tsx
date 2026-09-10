import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Check, X, ArrowUp, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { streamChatCompletion } from '../lib/agent';

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
