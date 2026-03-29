import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Sparkles, UserCircle } from 'lucide-react';

interface SimpleLoginProps {
  onLogin: (name: string) => void;
}

export function SimpleLogin({ onLogin }: SimpleLoginProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoading(true);
    // Simulate slight delay for effect
    setTimeout(() => {
      onLogin(name.trim());
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans overflow-hidden relative">
      {/* Animated neon background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-3/4 left-1/2 w-64 h-64 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="container relative mx-auto px-6 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md border-border/30 bg-card/80 backdrop-blur-xl shadow-2xl neon-box-glow">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <UserCircle className="h-10 w-10 text-primary neon-glow" />
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                Welcome
              </CardTitle>
            </div>
            <CardDescription className="text-center text-muted-foreground">
              Please enter your name to start coding
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Alex"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-background/50 border-border/50 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold py-3 transition-all duration-300 hover:scale-[1.02] shadow-lg neon-box-glow"
                disabled={loading || !name.trim()}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Sparkles className="h-4 w-4 animate-spin" />
                    Entering...
                  </span>
                ) : (
                  'Start Session'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
