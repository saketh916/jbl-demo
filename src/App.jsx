import { useState, useRef, useEffect } from 'react';
import { useAgent, useChat } from '@koreai/artemis-web-sdk/react';
import MessageRender, { parseContent } from './MessageRender';
import './App.css';

const MAIN_MENU =
  '{"type":"main_menu","input":false,"text":"What would you like to do next?","options":["Product specifications","Troubleshooting","Something else"]}';

const WELCOME_START = 'Hi! I am your JBL product expert';

function findCurrentProduct(list) {
  for (let i = list.length - 1; i >= 0; i--) {
    const m = list[i];
    if (m.role !== 'assistant') continue;
    const ui = parseContent(m.content);
    if (ui.type === 'spec_card' && ui.product?.product_name) return ui.product.product_name;
    if (ui.type === 'troubleshoot_steps' && ui.product) return ui.product;
  }
  return null;
}

export default function App() {
  const { messages, isTyping, sendMessage, isConnected } = useChat();
  const { sdk } = useAgent();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [localMessages, setLocalMessages] = useState([]);
  const [hiddenMessageIds, setHiddenMessageIds] = useState(() => new Set());
  const [isRestarting, setIsRestarting] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [showGreeting, setShowGreeting] = useState(true);
  const [everOpened, setEverOpened] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  let welcomeSeen = false;
  const allMessages = [...messages, ...localMessages]
    .filter((m) => !hiddenMessageIds.has(m.id))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .filter((m) => {
      if (m.role !== 'assistant') return true;
      if (!parseContent(m.content).text.startsWith(WELCOME_START)) return true;
      if (welcomeSeen) return false;
      welcomeSeen = true;
      return true;
    });

  const currentProduct = findCurrentProduct(allMessages);

  const lastAssistant = [...allMessages].reverse().find((m) => m.role === 'assistant');
  const lastUi = lastAssistant ? parseContent(lastAssistant.content) : null;
  const inputEnabled = isConnected && !isTyping && lastUi?.input !== false;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages.length, isTyping, open]);

  useEffect(() => {
    if (open && inputEnabled) inputRef.current?.focus();
  }, [open, inputEnabled]);

  function toggleChat() {
    setOpen(!open);
    setShowGreeting(false);
    setEverOpened(true);
  }

  function showMainMenu() {
    setLocalMessages((prev) => [
      ...prev,
      { id: 'local-' + Date.now(), role: 'assistant', content: MAIN_MENU, timestamp: new Date() },
    ]);
  }

  async function handleSend(text) {
    const isTyped = text === undefined;
    const value = (text ?? input).trim();
    if (!value || !isConnected) return;
    setInput('');

    if (value.toLowerCase() === 'main menu') {
      showMainMenu();
      return;
    }

    const outgoing = isTyped && currentProduct ? `${value} [context: ${currentProduct}]` : value;
    await sendMessage(outgoing);
  }

  async function startNewChat() {
    if (!sdk || isRestarting) return;

    const previousSessionId = sdk.getSessionId();
    setHiddenMessageIds((previous) => new Set([
      ...previous,
      ...messages.map((message) => message.id),
      ...localMessages.map((message) => message.id),
    ]));
    setIsRestarting(true);
    setSessionError('');
    try {
      if (sdk.isConnected()) {
        const disconnected = new Promise((resolve) => {
          const unsubscribe = sdk.on('disconnected', () => {
            unsubscribe();
            resolve();
          });
        });
        sdk.endSession();
        await disconnected;
      }

      setLocalMessages([]);
      setInput('');
      await sdk.connect();
      if (!sdk.getSessionId() || sdk.getSessionId() === previousSessionId) {
        throw new Error('The runtime did not create a new session. Please try again.');
      }
    } catch (error) {
      setSessionError(
        `Couldn't start a new chat: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsRestarting(false);
    }
  }

  return (
    <div className="page">
      <section className="hero">
        <span className="hero-badge">JBL Support</span>
        <h1>Sound help, <span>crystal clear.</span></h1>
        <p>Specs, fixes and recommendations for every JBL product, in one chat.</p>
      </section>

      {open && (
        <div className="chat-window">
          <header className="chat-header">
            <div className="brand">JBL</div>
            <div className="header-info">
              <h2>JBL Assistant</h2>
              <span className={isConnected ? 'status online' : 'status'}>
                {isRestarting ? 'Starting a new chat...' : isConnected ? 'Online · replies instantly' : 'Connecting...'}
              </span>
            </div>
            <button
              className="refresh-btn"
              onClick={startNewChat}
              disabled={!sdk || isRestarting}
              aria-label="Start a new chat"
              title="Start a new chat"
            >
              ↻
            </button>
            <button className="menu-btn" onClick={showMainMenu}>☰ Menu</button>
            <button className="close-btn" onClick={() => setOpen(false)}>✕</button>
          </header>

          <main className="chat-body">
            {sessionError && <div className="session-error" role="alert">{sessionError}</div>}
            {allMessages.map((m) => (
              <MessageRender
                key={m.id}
                message={m}
                isLatest={m.id === lastAssistant?.id}
                onSelect={handleSend}
              />
            ))}
            {isTyping && (
              <div className="typing">
                <div className="dots"><span></span><span></span><span></span></div>
                <span className="typing-label">JBL Assistant is typing…</span>
              </div>
            )}
            <div ref={bottomRef} />
          </main>

          <form
            className="chat-input"
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!inputEnabled}
              placeholder={inputEnabled ? 'Type your message...' : 'Choose an option above'}
            />
            <button type="submit" disabled={!inputEnabled || !input.trim()}>➤</button>
          </form>
        </div>
      )}

      {!open && showGreeting && (
        <div className="greeting">
          <span>👋 Need help with your JBL product?</span>
          <button className="greeting-close" onClick={() => setShowGreeting(false)}>✕</button>
        </div>
      )}

      <button className={everOpened ? 'launcher' : 'launcher pulse'} onClick={toggleChat}>
        {open ? '✕' : '💬'}
      </button>
    </div>
  );
}