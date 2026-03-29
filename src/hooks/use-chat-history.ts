import { useState, useEffect, useCallback } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  parts?: any[];
  timestamp: number;
}

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  sandboxId?: string;
}

const STORAGE_KEY = 'cursorai-chat-history';

export function useChatHistory() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);

  // Load chats from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Chat[];
        setChats(parsed);
        // Auto-select the most recent chat
        if (parsed.length > 0) {
          const sorted = [...parsed].sort((a, b) => b.updatedAt - a.updatedAt);
          setActiveChat(sorted[0]);
        }
      } catch (e) {
        console.error('Failed to parse chat history:', e);
      }
    }
  }, []);

  // Save chats to localStorage whenever they change
  const saveChats = useCallback((updatedChats: Chat[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedChats));
    setChats(updatedChats);
  }, []);

  // Create a new chat
  const createChat = useCallback((sandboxId?: string): Chat => {
    const newChat: Chat = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sandboxId,
    };
    const updatedChats = [newChat, ...chats];
    saveChats(updatedChats);
    setActiveChat(newChat);
    return newChat;
  }, [chats, saveChats]);

  // Update chat title (auto-generated from first message)
  const updateChatTitle = useCallback((chatId: string, title: string) => {
    const updatedChats = chats.map(chat => 
      chat.id === chatId 
        ? { ...chat, title: title.slice(0, 50), updatedAt: Date.now() } 
        : chat
    );
    saveChats(updatedChats);
    if (activeChat?.id === chatId) {
      setActiveChat(prev => prev ? { ...prev, title: title.slice(0, 50), updatedAt: Date.now() } : null);
    }
  }, [chats, activeChat, saveChats]);

  // Add message to chat
  const addMessage = useCallback((chatId: string, message: ChatMessage) => {
    const updatedChats = chats.map(chat => {
      if (chat.id === chatId) {
        const messages = [...chat.messages, message];
        // Auto-generate title from first user message
        let title = chat.title;
        if (chat.title === 'New Chat' && message.role === 'user') {
          title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
        }
        return { ...chat, messages, title, updatedAt: Date.now() };
      }
      return chat;
    });
    saveChats(updatedChats);
    
    // Update active chat if it's the current one
    if (activeChat?.id === chatId) {
      const updated = updatedChats.find(c => c.id === chatId);
      if (updated) setActiveChat(updated);
    }
  }, [chats, activeChat, saveChats]);

  // Update messages in chat (for streaming updates)
  const updateMessages = useCallback((chatId: string, messages: ChatMessage[]) => {
    const updatedChats = chats.map(chat => {
      if (chat.id === chatId) {
        // Auto-generate title from first user message
        let title = chat.title;
        if (chat.title === 'New Chat' && messages.length > 0) {
          const firstUserMsg = messages.find(m => m.role === 'user');
          if (firstUserMsg) {
            title = firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '');
          }
        }
        return { ...chat, messages, title, updatedAt: Date.now() };
      }
      return chat;
    });
    saveChats(updatedChats);
    
    if (activeChat?.id === chatId) {
      const updated = updatedChats.find(c => c.id === chatId);
      if (updated) setActiveChat(updated);
    }
  }, [chats, activeChat, saveChats]);

  // Delete a chat
  const deleteChat = useCallback((chatId: string) => {
    const updatedChats = chats.filter(chat => chat.id !== chatId);
    saveChats(updatedChats);
    
    if (activeChat?.id === chatId) {
      setActiveChat(updatedChats.length > 0 ? updatedChats[0] : null);
    }
  }, [chats, activeChat, saveChats]);

  // Clear all chats
  const clearAllChats = useCallback(() => {
    saveChats([]);
    setActiveChat(null);
  }, [saveChats]);

  // Select a chat
  const selectChat = useCallback((chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) setActiveChat(chat);
  }, [chats]);

  return {
    chats,
    activeChat,
    createChat,
    updateChatTitle,
    addMessage,
    updateMessages,
    deleteChat,
    clearAllChats,
    selectChat,
    setActiveChat,
  };
}
