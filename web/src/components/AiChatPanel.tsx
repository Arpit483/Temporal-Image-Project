import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bot,
  Send,
  X,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { useChat } from '../context/ChatContext';

export const AiChatPanel: React.FC = () => {
  const {
    isOpen,
    setIsOpen,
    messages,
    isLoading,
    error,
    pageContext,
    sendMessage,
    retryLastMessage,
    clearChat,
  } = useChat();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [isOpen, messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput('');
    await sendMessage(text);
  };

  const getQuickPrompts = () => {
    switch (pageContext.page) {
      case 'predict':
        return [
          'What physical storm dynamics are shown here?',
          'Explain the Band 13 brightness temperature scale.',
          'How does the 50/50 DIS + RIFE ensemble work?',
        ];
      case 'viewer':
        return [
          'What does this image show and what is its significance?',
          'How to identify differences between synthetic and observed frames?',
          'Why are rapid convective cloud tops difficult to interpolate?',
        ];
      case 'difference':
        return [
          'What does a -10 K vs +10 K difference mean physically?',
          'Why do largest residual errors appear in convective cores?',
          'Explain dynamic-pixel RMSE metric calculation.',
        ];
      case 'results':
        return [
          'What do these benchmark results demonstrate about the models?',
          'Why did the 50/50 blend outperform DIS across all test days?',
          'Why was RIFE scale 2.0 chosen over scale 1.0?',
        ];
      case 'sequence':
        return [
          'Explain the meteorological significance of this storm sequence.',
          'What is the difference between OBSERVED and SYNTHETIC frames?',
          'What do the cold overshooting tops indicate?',
        ];
      case 'insat':
        return [
          'Why is INSAT-3DS interpolation not claimed or demonstrated?',
          'What sensor domain shifts exist between GOES and INSAT?',
        ];
      default:
        return [
          'Explain the GOES-19 Ch13 clean thermal infrared band.',
          'Why are synthetic frames forbidden for operational forecasting?',
          'How does optical flow backward-warping work in Kelvin?',
        ];
    }
  };

  const quickPrompts = getQuickPrompts();

  return (
    <>
      {/* Friendly Bottom Floating Launcher (kept down as requested) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-[var(--ff-workspace)] hover:bg-[var(--ff-panel)] border border-[var(--ff-border)] hover:border-[var(--ff-accent)] text-[var(--ff-text)] shadow-xl transition-all duration-200 hover:scale-105 group focus:outline-none"
          aria-label="Open AI Assistant"
          title="Ask AI about this satellite image or model"
        >
          <Bot size={17} className="text-[var(--ff-accent)] shrink-0" />
          <span className="text-sm font-semibold tracking-tight">Ask AI</span>
          <span className="text-xs font-mono text-[var(--ff-text-secondary)] border-l border-[var(--ff-border)] pl-2">
            Nemotron
          </span>
        </button>
      )}

      {/* Floating Bottom Drawer / Modal */}
      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 w-[92vw] sm:w-[480px] h-[600px] max-h-[85vh] flex flex-col rounded-lg bg-[var(--ff-workspace)] border border-[var(--ff-border)] shadow-2xl overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-bottom-4"
          role="dialog"
          aria-label="FrameFill Explainable AI Chat"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[var(--ff-panel)] border-b border-[var(--ff-border)] select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded flex items-center justify-center bg-[var(--ff-workspace)] border border-[var(--ff-border)]">
                <Bot size={16} className="text-[var(--ff-accent)]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--ff-text)]">
                    FrameFill AI
                  </span>
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[var(--ff-panel-subtle)] text-[var(--ff-text-secondary)] border border-[var(--ff-border)]">
                    Nemotron 550B
                  </span>
                </div>
                <div className="text-xs text-[var(--ff-text-secondary)] font-mono">
                  Context: <span className="text-[var(--ff-text)] capitalize font-medium">{pageContext.page}</span>
                  {pageContext.method_used && <span className="text-[var(--ff-text-muted)]"> ({pageContext.method_used})</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={clearChat}
                className="p-1.5 rounded text-[var(--ff-text-secondary)] hover:text-[var(--ff-text)] hover:bg-[var(--ff-workspace)] transition-colors"
                title="Reset conversation"
                aria-label="Reset conversation"
              >
                <RotateCcw size={15} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded text-[var(--ff-text-secondary)] hover:text-[var(--ff-text)] hover:bg-[var(--ff-workspace)] transition-colors"
                title="Close chat"
                aria-label="Close chat"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-sm">
            {messages.map((m, i) => {
              const isAi = m.role === 'assistant';
              return (
                <div
                  key={i}
                  className={`flex gap-2.5 ${isAi ? 'items-start' : 'items-start flex-row-reverse'}`}
                >
                  <div
                    className={`w-6 h-6 rounded shrink-0 flex items-center justify-center text-xs font-mono font-medium ${
                      isAi
                        ? 'bg-[var(--ff-panel)] text-[var(--ff-accent)] border border-[var(--ff-border)]'
                        : 'bg-[var(--ff-accent)] text-black font-semibold'
                    }`}
                  >
                    {isAi ? <Bot size={13} /> : 'U'}
                  </div>

                  {isAi ? (
                    <div className="w-full max-w-[94%] rounded p-3 leading-relaxed bg-[var(--ff-panel)] text-[var(--ff-text)] border border-[var(--ff-border)]">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({ children }) => (
                            <div className="overflow-x-auto my-2 rounded border border-[var(--ff-border)] bg-[var(--ff-workspace)] max-w-full">
                              <table className="min-w-full text-xs font-mono divide-y divide-[var(--ff-border)] text-left">
                                {children}
                              </table>
                            </div>
                          ),
                          thead: ({ children }) => (
                            <thead className="bg-[var(--ff-panel)] text-[var(--ff-text)] font-semibold">{children}</thead>
                          ),
                          tbody: ({ children }) => (
                            <tbody className="divide-y divide-[var(--ff-border-subtle)]">{children}</tbody>
                          ),
                          tr: ({ children }) => (
                            <tr className="hover:bg-[var(--ff-workspace)] transition-colors">{children}</tr>
                          ),
                          th: ({ children }) => (
                            <th className="px-2.5 py-1.5 font-semibold text-[var(--ff-text)] text-left border-b border-[var(--ff-border)] whitespace-nowrap">
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td className="px-2.5 py-1.5 text-[var(--ff-text-secondary)] align-top leading-normal">
                              {children}
                            </td>
                          ),
                          h1: ({ children }) => (
                            <h1 className="text-sm font-bold text-[var(--ff-text)] mt-2 mb-1 pb-0.5 border-b border-[var(--ff-border)]">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-sm font-semibold text-[var(--ff-accent)] mt-2 mb-1">
                              {children}
                            </h2>
                          ),
                          p: ({ children }) => (
                            <p className="mb-2 last:mb-0 leading-relaxed text-[var(--ff-text)]">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc pl-4 space-y-1 mb-2 text-[var(--ff-text-secondary)]">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal pl-4 space-y-1 mb-2 text-[var(--ff-text-secondary)]">{children}</ol>
                          ),
                          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                          code: ({ children, className }) => {
                            const isInline = !className?.includes('language-');
                            if (isInline) {
                              return (
                                <code className="px-1.5 py-0.5 rounded text-xs font-mono bg-[var(--ff-workspace)] text-[var(--ff-accent)] border border-[var(--ff-border)]">
                                  {children}
                                </code>
                              );
                            }
                            return (
                              <pre className="overflow-x-auto p-2.5 rounded bg-[var(--ff-workspace)] border border-[var(--ff-border)] my-2 text-xs font-mono text-[var(--ff-text-secondary)]">
                                <code>{children}</code>
                              </pre>
                            );
                          },
                          strong: ({ children }) => (
                            <strong className="font-semibold text-[var(--ff-text)]">{children}</strong>
                          ),
                          hr: () => <hr className="border-t border-[var(--ff-border)] my-2" />,
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-2 border-[var(--ff-accent)] pl-2.5 py-0.5 my-2 text-[var(--ff-text-secondary)] italic">
                              {children}
                            </blockquote>
                          ),
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[var(--ff-accent)] underline hover:text-[var(--ff-accent-hover)]"
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="max-w-[85%] rounded px-3.5 py-2 leading-relaxed bg-[var(--ff-accent)] text-black font-medium text-sm whitespace-pre-wrap">
                      {m.content}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded shrink-0 bg-[var(--ff-panel)] text-[var(--ff-accent)] border border-[var(--ff-border)] flex items-center justify-center">
                  <Bot size={13} />
                </div>
                <div className="bg-[var(--ff-panel)] border border-[var(--ff-border)] rounded px-3 py-2 text-[var(--ff-text-secondary)] flex items-center gap-2 text-xs font-mono">
                  <span>Synthesizing physical interpretation...</span>
                </div>
              </div>
            )}

            {/* Error banner with retry */}
            {error && (
              <div className="p-2.5 rounded border border-[var(--ff-error)] bg-[var(--ff-error-bg)] text-[var(--ff-error)] text-xs flex items-center justify-between gap-2 font-mono">
                <div className="flex items-center gap-1.5 truncate">
                  <AlertCircle size={14} className="shrink-0" />
                  <span className="truncate">{error}</span>
                </div>
                <button
                  onClick={retryLastMessage}
                  className="px-2 py-1 rounded text-xs font-mono bg-[var(--ff-error)] text-white shrink-0"
                >
                  Retry
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Inquiries */}
          <div className="px-3 py-2 bg-[var(--ff-panel-subtle)] border-t border-[var(--ff-border-subtle)] overflow-x-auto flex gap-1.5 no-scrollbar">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(q)}
                disabled={isLoading}
                className="whitespace-nowrap px-2.5 py-1 rounded text-xs font-mono bg-[var(--ff-workspace)] hover:bg-[var(--ff-panel)] text-[var(--ff-text-secondary)] hover:text-[var(--ff-text)] border border-[var(--ff-border)] transition-colors shrink-0 disabled:opacity-40"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Prompt Input Form */}
          <form
            onSubmit={handleSend}
            className="p-3 bg-[var(--ff-panel)] border-t border-[var(--ff-border)] flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about this image or model..."
              disabled={isLoading}
              maxLength={400}
              className="flex-1 bg-[var(--ff-workspace)] text-[var(--ff-text)] placeholder-[var(--ff-text-muted)] text-sm px-3 py-2 rounded border border-[var(--ff-border)] focus:ring-1 focus:ring-[var(--ff-accent)] focus:border-[var(--ff-accent)] focus:outline-none"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2 rounded bg-[var(--ff-accent)] hover:bg-[var(--ff-accent-hover)] text-black font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Send query"
              aria-label="Send question"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default AiChatPanel;
