import React, { useEffect, useRef, useState, useLayoutEffect, useCallback } from 'react';
import {
  Send, Bot, Wrench, Loader2, ChevronRight, ChevronDown,
  Eye, RefreshCw, ExternalLink, Infinity as InfinityIcon, Check,
  FolderOpen, Globe, Maximize2, AtSign, Image as ImageIcon, MessageSquareText,
  Rocket, Palette, Briefcase, PenTool, Video, Ticket, Settings as SettingsIcon,
  FileCode, Copy, CheckCheck,
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
import { SettingsModal } from './SettingsModal';
import {
  streamChatCompletion,
  newMessageId,
  CODING_AGENT_SYSTEM_PROMPT,
  ASK_AGENT_SYSTEM_PROMPT,
  type ChatMessage,
} from '../lib/agent';
import { loadSettings, saveSettings, isConfigured } from '../lib/settings';

interface ChatPanelProps {
  sandbox: any | null;
  isEmbedded?: boolean;
  initialPrompt?: string | null;
  onBuildStatusChange?: (isBuilding: boolean) => void;
  activeFile?: string | null;
  selectedCode?: string | null;
  onApplyCode?: (code: string) => void;
}

const AI_MODELS = [
  { id: 'Gemini 3.6 flash', name: 'Gemini 3.6 Flash', subtitle: 'Google · model-id preset' },
  { id: 'Gemini 3.7 flash', name: 'Gemini 3.7 Flash', subtitle: 'Google · model-id preset' },
  { id: 'Gemini 3.8 Flash', name: 'Gemini 3.8 Flash', subtitle: 'Google · model-id preset' },
  { id: 'deepseek-ai/deepseek-v4-flash-0731', name: 'DeepSeek V4 Flash', subtitle: 'NVIDIA · model-id preset' },
  { id: 'nvidia/llama-3.1-nemotron-ultra-253b-v1', name: 'Nemotron Ultra 253B', subtitle: 'NVIDIA · model-id preset' },
  { id: 'moonshotai/kimi-k3', name: 'Kimi K3', subtitle: 'NVIDIA · model-id preset' },
  { id: 'grok-4.2', name: 'Grok 4.2', subtitle: 'xAI · model-id preset' },
  { id: 'grok-4.5', name: 'Grok 4.5', subtitle: 'xAI · model-id preset' },
  { id: 'grok-4.6', name: 'Grok 4.6', subtitle: 'xAI · model-id preset' },
];
