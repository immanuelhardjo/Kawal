import { useEffect, useRef, useState } from 'react';
import { useConversationHistory, type ChatMessage } from './hooks.js';

interface ChatPanelProps {
  readonly caseId: string;
  readonly onCitedSourceTap: (sourceId: string) => void;
}

export function ChatPanel({ caseId, onCitedSourceTap }: ChatPanelProps): JSX.Element {
  const { messages, loading, sendQuestion, sending } = useConversationHistory(caseId);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function handleSend() {
    const q = input.trim();
    if (!q || sending) return;
    setInput('');
    void sendQuestion(q);
  }

  return (
    <section className="flex h-full flex-col border-r border-rule bg-board" aria-label="Tanya AI">
      <header className="border-b border-rule px-3 py-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-chalk-muted">Tanya AI</h2>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {loading ? (
          <p className="text-sm text-chalk-muted">Memuat riwayat…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-chalk-muted">Belum ada percakapan. Ajukan pertanyaan di bawah.</p>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} onCitedSourceTap={onCitedSourceTap} />)
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-rule p-2 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Tanyakan sesuatu…"
          className="flex-1 rounded-md border border-rule bg-board px-2 py-1.5 text-sm text-chalk placeholder:text-chalk-muted focus:outline-none focus:ring-1 focus:ring-amber-pin"
          disabled={sending}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="rounded-md bg-amber-pin px-3 py-1.5 text-xs font-medium text-board disabled:opacity-40"
        >
          {sending ? '…' : 'Kirim'}
        </button>
      </div>
    </section>
  );
}

function MessageBubble({
  message,
  onCitedSourceTap,
}: {
  message: ChatMessage;
  onCitedSourceTap: (id: string) => void;
}): JSX.Element {
  return (
    <div className="space-y-1">
      <div className="ml-auto max-w-[85%] rounded-lg bg-amber-pin/10 px-3 py-2 text-sm text-chalk">
        {message.question}
      </div>
      {message.pending ? (
        <div className="max-w-[85%] rounded-lg border border-rule px-3 py-2 text-sm text-chalk-muted">
          Memproses…
        </div>
      ) : (
        <div className="max-w-[85%] space-y-1.5 rounded-lg border border-rule px-3 py-2 text-sm text-chalk">
          <p className="whitespace-pre-wrap">{message.answerText}</p>
          {message.citedSourceIds.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {message.citedSourceIds.map((id, i) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onCitedSourceTap(id)}
                  className="rounded border border-rule px-1.5 py-0.5 text-xs text-chalk-muted hover:border-amber-pin hover:text-chalk"
                >
                  Sumber {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
