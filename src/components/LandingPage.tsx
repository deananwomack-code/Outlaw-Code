import React from 'react';
import { Zap } from 'lucide-react';
import { blink } from '../lib/blink';

export function LandingPage() {
  const handleLogin = () => {
    blink.auth.login();
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/cursor_logo.png" alt="Cursor" className="w-8 h-8" />
            <span className="font-bold text-lg tracking-tight">Cursor</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleLogin}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </button>
            <button 
              onClick={handleLogin}
              className="px-4 py-2 text-sm font-medium rounded-full bg-white text-black hover:bg-white/90 transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/20 rounded-full blur-[120px] -z-10 opacity-50" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-purple-500/10 rounded-full blur-[100px] -z-10 opacity-30" />

        <div className="container mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-primary mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Zap className="w-3 h-3" />
            <span>Now with GPT-5.2 & Claude 4.5 Sonnet</span>
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            Build software <br />
            <span className="text-white">at the speed of thought.</span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg text-muted-foreground mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            The AI-first code editor designed for pair programming. 
            Build, edit, and chat with your codebase using state-of-the-art AI models.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <button 
              onClick={handleLogin}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white hover:bg-white/90 text-black font-semibold text-lg transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)] hover:scale-105"
            >
              Start Coding Now
            </button>
            <button 
              onClick={handleLogin}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-lg border border-white/10 transition-all backdrop-blur-sm"
            >
              View Demo
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
