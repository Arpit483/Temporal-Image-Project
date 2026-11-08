import React, { createContext, useContext, useState, useCallback } from 'react';
import { sendChatMessage } from '../api';
import type { ChatMessage, PageContext } from '../types';

const INITIAL_MESSAGE: ChatMessage = {
  role: 'assistant',
  content:
    "Hello! I'm FrameFill AI. Ask me what this satellite image shows, what its physical significance is, what the brightness temperature colors mean, or how the optical flow and RIFE neural models perform.",
  timestamp: Date.now(),
};

interface ChatContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  pageContext: PageContext;
  setPageContext: (ctx: Partial<PageContext>) => void;
  sendMessage: (text: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  clearChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageContext, setPageContextState] = useState<PageContext>({ page: 'predict' });

  const setPageContext = useCallback((ctx: Partial<PageContext>) => {
    setPageContextState((prev) => ({ ...prev, ...ctx }));
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMsg: ChatMessage = {
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
      };

      const updatedHistory = [...messages, userMsg];
      setMessages(updatedHistory);
      setIsLoading(true);
      setError(null);

      try {
        const replyText = await sendChatMessage(
          updatedHistory.map((m) => ({ role: m.role, content: m.content })),
          pageContext as unknown as Record<string, unknown>
        );

        const aiMsg: ChatMessage = {
          role: 'assistant',
          content: replyText,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, aiMsg]);
      } catch (err: any) {
        setError(err.message || 'Failed to get AI response. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, pageContext]
  );

  const retryLastMessage = useCallback(async () => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUser) {
      await sendMessage(lastUser.content);
    }
  }, [messages, sendMessage]);

  const clearChat = useCallback(() => {
    setMessages([INITIAL_MESSAGE]);
    setError(null);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        setIsOpen,
        messages,
        isLoading,
        error,
        pageContext,
        setPageContext,
        sendMessage,
        retryLastMessage,
        clearChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return ctx;
};
