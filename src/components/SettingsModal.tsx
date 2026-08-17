import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { loadSettings, saveSettings, clearSettings, DEFAULT_SETTINGS, type AiSettings } from '../lib/settings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after settings are saved so the app can react (e.g. clear chat). */
  onSaved?: () => void;
}

export function SettingsModal({ isOpen, onClose, onSaved }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [baseURL, setBaseURL] = useState('');
  const [model, setModel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const s = loadSettings();
      setApiKey(s.apiKey);
      setBaseURL(s.baseURL);
      setModel(s.model);
      setSaved(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    const next: AiSettings = { apiKey, baseURL, model };
    saveSettings(next);
    setSaved(true);
    onSaved?.();
    onClose();
  };

  const handleReset = () => {
    clearSettings();
    setApiKey(DEFAULT_SETTINGS.apiKey);
    setBaseURL(DEFAULT_SETTINGS.baseURL);
    setModel(DEFAULT_SETTINGS.model);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-[#0d0d0d] border-[#2d2d2d] text-foreground">
        <DialogHeader>
          <DialogTitle>AI Settings</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Configure any OpenAI-compatible endpoint (OpenAI, OpenRouter, Together, local LLMs, …).
            Values are stored locally in your browser and override the defaults from <code>.env</code>.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-background/50 border-border/50 pr-16"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground hover:text-foreground"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="base-url">Base URL</Label>
            <Input
              id="base-url"
              type="text"
              placeholder="https://api.openai.com/v1"
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
              className="bg-background/50 border-border/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              type="text"
              placeholder="gpt-4o-mini"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="bg-background/50 border-border/50"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={handleReset} className="text-muted-foreground">
            Reset to defaults
          </Button>
          <Button onClick={handleSave} disabled={!model.trim()}>
            {saved ? 'Saved' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
