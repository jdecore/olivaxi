import { createSignal, onMount, onCleanup, For, Show, createEffect } from 'solid-js';
import { apiUrl } from '../lib/api';

const PROVINCIAS = [
  'Jaén', 'Córdoba', 'Sevilla', 'Granada', 'Málaga', 
  'Badajoz', 'Toledo', 'Ciudad Real', 'Almería', 'Huelva'
];

const formatText = (text) => text?.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') || '';

const SKILLS = [
  { id: 'calor', label: '🔥 Calor' },
  { id: 'drought', label: '🏜️ Sequía' },
  { id: 'frio', label: '❄️ Frío' },
  { id: 'humedad', label: '💧 Humedad' },
  { id: 'plagas', label: '🐛 Plagas' },
  { id: 'fenologia', label: '🌱 Fenología' },
];

const SKILL_PROMPTS = {
  drought: 'Eres un experto en gestión del estrés hídrico en olivares. Enfoca tus respuestas en técnicas de riego, cubiertas vegetales, y manejo del suelo para conservar agua.',
  calor: 'Eres un experto en protección térmica de olivares. Enfoca tus respuestas en estrategias de sombreo, riego temprano, y protección contra olas de calor extremas.',
  frio: 'Eres un experto en protección contra heladas en olivares. Enfoca tus respuestas en técnicas de protección, momento de poda, y prevención de daños por frío.',
  humedad: 'Eres un experto en enfermedades fúngicas del olivo. Enfoca tus respuestas en repilo, aceituna jabonosa, control de humedad, y tratamientos preventivos.',
  plaga: 'Eres un experto en control de plagas del olivo. Enfoca tus respuestas en mosca, polilla, tuberculosis, y control integrado de plagas.',
  fenologia: 'Eres un experto en fenología del olivo. Enfoca tus respuestas en las fases del ciclo: brotación, floración, cuaje, endurecimiento del hueso, envero, recolección.',
};

export default function ChatConsejero() {
  const MAX_MESSAGES = 20;
  
  const [messages, setMessages] = createSignal([]);
  const [provincia, setProvincia] = createSignal('');
  const [input, setInput] = createSignal('');
  const [isLoading, setIsLoading] = createSignal(false);
  const [climaActual, setClimaActual] = createSignal(null);
  const [currentProvider, setCurrentProvider] = createSignal(null);
  const [displayedText, setDisplayedText] = createSignal('');
  const [fullText, setFullText] = createSignal('');
  const [typingMessageId, setTypingMessageId] = createSignal(null);
  const [activeSkill, setActiveSkill] = createSignal(null);
  const [initComplete, setInitComplete] = createSignal(false);
  
  let typingInterval;
  let messagesEndRef;

  const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';

  const getProvinciaFromStorage = () => {
    try {
      const saved = localStorage.getItem('oliva_provincia');
      if (saved) return saved;
      const savedVariedad = localStorage.getItem('oliva_variedad');
      if (savedVariedad) return 'Jaén';
    } catch {}
    return null;
  };

  const initChat = async () => {
    const savedProv = getProvinciaFromStorage();
    
    if (savedProv) {
      setProvincia(savedProv);
      try {
        const res = await fetch(apiUrl('/api/clima'));
        const data = await res.json();
        const provData = data.find((p) => p.provincia === savedProv);
        if (provData) setClimaActual(provData);
      } catch {}
      
      setMessages([
        { id: 1, role: 'bot', text: `¡Hola! Soy Olivo 🫒, tu Consejero del olivar. Estoy listo para ayudarte con tu olivar en ${savedProv}. ¿Qué quieres saber?` }
      ]);
    } else {
      setMessages([
        { id: 1, role: 'bot', text: '¡Hola! Soy Olivo 🫒, tu Consejero del olivar. Para ayudarte mejor, ¿de qué provincia es tu olivar?' }
      ]);
    }
    setInitComplete(true);
  };

  onMount(() => {
    initChat();
    const handleThemeChange = () => setMessages([...messages()]);
    window.addEventListener('modoOscuroChange', handleThemeChange);
    onCleanup(() => window.removeEventListener('modoOscuroChange', handleThemeChange));
  });

  createEffect(() => {
    if (messagesEndRef && messages().length > 0) {
      messagesEndRef.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  });

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      messagesEndRef?.scrollIntoView({ behavior: 'auto', block: 'end' });
    });
  };

  const startTypingAnimation = (botId, newText) => {
    if (!typingMessageId()) {
      setTypingMessageId(botId);
      setFullText(newText);
      setDisplayedText('');
      if (typingInterval) clearInterval(typingInterval);
      let charIndex = 0;
      const speed = 25;
      typingInterval = setInterval(() => {
        if (charIndex < fullText().length) {
          setDisplayedText(fullText().slice(0, charIndex + 1));
          charIndex++;
          scrollToBottom();
        } else {
          clearInterval(typingInterval);
          typingInterval = null;
        }
      }, speed);
    } else {
      setFullText(prev => prev + newText);
    }
  };

  const stopTypingAnimation = () => {
    if (typingInterval) {
      clearInterval(typingInterval);
      typingInterval = null;
    }
    if (fullText()) setDisplayedText(fullText());
    setTypingMessageId(null);
    setFullText('');
  };

  const handleProvinciaInput = async (text) => {
    const provMatch = PROVINCIAS.find(p => text.toLowerCase().includes(p.toLowerCase()));
    if (provMatch) {
      setProvincia(provMatch);
      try {
        const res = await fetch(apiUrl('/api/clima'));
        const data = await res.json();
        const provData = data.find((p) => p.provincia === provMatch);
        if (provData) setClimaActual(provData);
      } catch {}
      
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'bot', text: `Perfecto, tengo información de ${provMatch}. ¿Qué quieres saber sobre tu olivar?` }]);
      scrollToBottom();
      return true;
    }
    return false;
  };

  const getRespuestasBotCount = () => messages().filter(m => m.role === 'bot' && !m.isWaiting).length;
  const isAtLimit = () => getRespuestasBotCount() >= MAX_MESSAGES;

  const enviarPregunta = async () => {
    const text = input().trim();
    if (!text || isLoading() || isAtLimit()) return;

    const pregunta = text;
    const botId = Date.now();

    setInput('');
    setMessages(prev => [...prev, 
      { id: botId - 1, role: 'user', text: pregunta }, 
      { id: botId, role: 'bot', text: '', isWaiting: true }
    ]);
    setIsLoading(true);
    scrollToBottom();

    if (!provincia()) {
      const found = await handleProvinciaInput(pregunta);
      setIsLoading(false);
      setMessages(prev => prev.map(m => m.id === botId ? { ...m, isWaiting: false, text: found ? `Perfecto, tengo información de ${provincia()}. ¿Qué quieres saber sobre tu olivar?` : 'No he entendido la provincia. Por favor, escribe el nombre de una provincia olivarera española (Jaén, Córdoba, Sevilla, Granada, Málaga, Badajoz, Toledo, Ciudad Real, Almería o Huelva).' } : m));
      scrollToBottom();
      return;
    }

    try {
      const skillPrompt = activeSkill() ? SKILL_PROMPTS[activeSkill()] : '';
      const res = await fetch(apiUrl('/api/chat'), { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ mensaje: pregunta, provincia: provincia(), skill: activeSkill(), systemPrompt: skillPrompt }) 
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let firstChunk = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) { finishMessage(botId); break; }
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith('data: [DONE]')) { finishMessage(botId); break; }
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(6));
              if (json.provider && !firstChunk) { firstChunk = true; setCurrentProvider(json.provider); }
              if (json.texto) {
                if (!firstChunk) { firstChunk = true; setIsLoading(false); }
                setMessages(prev => prev.map(m => m.id === botId ? { ...m, text: m.text + json.texto } : m));
                startTypingAnimation(botId, json.texto);
                scrollToBottom();
              }
            } catch {}
          }
        }
      }
    } catch { 
      setMessages(prev => prev.map(m => m.id === botId ? { ...m, isWaiting: false, text: 'Lo siento, hubo un error. Intenta de nuevo.' } : m)); 
      setIsLoading(false);
    }
  };

  const finishMessage = (botId) => {
    setIsLoading(false);
    stopTypingAnimation();
    setMessages(prev => prev.map(m => m.id === botId ? { ...m, isWaiting: false } : m));
    scrollToBottom();
  };

  const limpiarChat = () => {
    stopTypingAnimation();
    setActiveSkill(null);
    initChat();
  };

  const selectSkill = (skillId) => {
    if (activeSkill() === skillId) {
      setActiveSkill(null);
    } else {
      setActiveSkill(skillId);
    }
  };

  const t = () => ({ bg: '#fff', text: '#1C1C1C', muted: '#6B6B5E', accent: '#D4E849', inputBg: '#f7f5f0' });
  const msgs = () => messages();

  return (
    <div class="chat-container">
      <style>{`
        .chat-container {
          width: 100%;
          height: calc(100vh - 64px - (100vh * 0.01));
          display: flex;
          flex-direction: column;
          max-width: 900px;
          margin: 0 auto;
          background: #F9F8F4;
        }
        .chat-header {
          background: #fff;
          border-bottom: 1px solid #E8EDE0;
          padding: 16px 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          flex-shrink: 0;
        }
        .chat-logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .chat-logo-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .chat-logo-icon svg {
          width: 100%;
          height: 100%;
        }
        .chat-title {
          font-weight: 700;
          font-size: 18px;
          color: #1C1C1C;
        }
        .chat-provider {
          font-size: 12px;
          color: #6B6B5E;
        }
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: #F9F8F4;
        }
        .msg-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .msg-row.user {
          justify-content: flex-end;
        }
        .msg-avatar-small {
          width: 32px;
          height: 32px;
          background: #1C1C1C;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .msg-avatar-small svg {
          width: 18px;
          height: 18px;
          fill: #D4E849;
        }
        .msg-bubble {
          padding: 14px 18px;
          max-width: 72%;
          font-size: 15px;
          line-height: 1.65;
        }
        .msg-bubble.bot {
          background: #fff;
          border: 1px solid #E8EDE0;
          border-radius: 4px 18px 18px 18px;
          color: #1C1C1C;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .msg-bubble.user {
          background: #1C1C1C;
          color: #F7F4EE;
          border-radius: 18px 4px 18px 18px;
          width: fit-content;
          word-break: break-word;
        }
        .typing-dots {
          display: flex;
          gap: 6px;
          padding: 4px 0;
        }
        .typing-dots span {
          width: 8px;
          height: 8px;
          background: #6B6B5E;
          border-radius: 50%;
        }
        .dot1 { animation: bounce 1.2s ease-in-out infinite; }
        .dot2 { animation: bounce 1.2s ease-in-out 0.2s infinite; }
        .dot3 { animation: bounce 1.2s ease-in-out 0.4s infinite; }
        .limit-message {
          background: #fff;
          border: 1px solid #f59e0b;
          border-radius: 12px;
          padding: 16px 20px;
          text-align: center;
          color: #b45309;
          font-weight: 500;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .limit-btn {
          background: #1C1C1C;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          color: #F7F4EE;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }
        .limit-btn:hover {
          background: #D4E849;
          color: #1C1C1C;
        }
        .chat-input-wrapper {
          background: #f7f5f0;
          border-radius: 16px;
          padding: 12px 16px;
          margin: 0 16px 16px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
        }
        .chat-input {
          width: 100%;
          height: 44px;
          border: none;
          background: transparent;
          font-size: 15px;
          color: #1C1C1C;
          outline: none;
          padding: 0;
        }
        .chat-input::placeholder {
          color: #6B6B5E;
        }
        .chat-input:disabled {
          opacity: 0.6;
        }
        .chat-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(0,0,0,0.06);
        }
        .toolbar-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .toolbar-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1.5px solid #ddd;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          padding: 0;
        }
        .toolbar-btn:hover {
          border-color: #1C1C1C;
        }
        .toolbar-btn svg {
          width: 16px;
          height: 16px;
        }
        .mode-btns {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .mode-btn {
          padding: 6px 12px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: #6B6B5E;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .mode-btn:hover {
          background: rgba(0,0,0,0.05);
          color: #1C1C1C;
        }
        .mode-btn.active {
          background: #D4E849;
          color: #1C1C1C;
        }
        .mode-btn-auto {
          background: transparent;
          border: 1px solid #ddd;
        }
        .mode-btn-auto:hover {
          border-color: #D4E849;
        }
        .mode-btn-auto.active {
          background: #D4E849;
          border-color: #D4E849;
        }
        .toolbar-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .send-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: none;
          background: #111;
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .send-btn:hover:not(:disabled) {
          background: #D4E849;
        }
        .send-btn:hover:not(:disabled) svg {
          fill: #111;
        }
        .send-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        .send-btn svg {
          width: 18px;
          height: 18px;
          fill: #fff;
          transition: fill 0.15s;
        }
        .active-mode-badge {
          background: #D4E849;
          color: #1C1C1C;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .bubble {
          animation: fadeInUp 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>

      <div class="chat-header">
        <div class="chat-logo">
          <div class="chat-logo-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="14" r="8" stroke="#1C1C1C" stroke-width="2"/>
              <path d="M12 6C12 6 8 2 6 2C4 2 3 4 3 6C3 10 12 14 12 14" stroke="#1C1C1C" stroke-width="2" stroke-linecap="round"/>
              <path d="M12 6C12 6 16 2 18 2C20 2 21 4 21 6C21 10 12 14 12 14" stroke="#1C1C1C" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <span class="chat-title">Olivo</span>
        </div>
        <Show when={currentProvider()}>
          <span class="chat-provider">· {currentProvider()}</span>
        </Show>
      </div>

      <div class="chat-messages">
        <For each={msgs()}>{(msg) => (
          <div class={`msg-row ${msg.role} ${!msg.isWaiting ? 'bubble' : ''}`}>
            <Show when={msg.role === 'bot'}>
              <div class="msg-avatar-small">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="14" r="8"/>
                  <path d="M12 6C12 6 8 2 6 2C4 2 3 4 3 6C3 10 12 14 12 14" fill="none" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 6C12 6 16 2 18 2C20 2 21 4 21 6C21 10 12 14 12 14" fill="none" stroke="currentColor" stroke-width="2"/>
                </svg>
              </div>
            </Show>
            <Show when={msg.role === 'bot'} fallback={
              <div class="msg-bubble user">{msg.text}</div>
            }>
              <div class="msg-bubble bot">
                <Show when={msg.isWaiting}>
                  <div class="typing-dots">
                    <span class="dot1"></span>
                    <span class="dot2"></span>
                    <span class="dot3"></span>
                  </div>
                </Show>
                <Show when={!msg.isWaiting}>
                  <span innerHTML={formatText(typingMessageId() === msg.id ? displayedText() : msg.text)}></span>
                </Show>
              </div>
            </Show>
          </div>
        )}</For>
        
        <Show when={isAtLimit() && !isLoading()}>
          <div class="limit-message">
            <span>Llegaste al límite de memoria 🧹</span>
            <button class="limit-btn" onClick={limpiarChat}>
              🤖🧹 Limpiar chat
            </button>
          </div>
        </Show>
        
        <div ref={messagesEndRef}></div>
      </div>

      <div class="chat-input-wrapper">
        <input 
          class="chat-input" 
          type="text" 
          value={input()} 
          onInput={(e) => setInput(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && enviarPregunta()} 
          placeholder={provincia() ? `${SKILLS.map(s => s.label).join(' · ')}` : '¿De qué provincia es tu olivar?'}
          disabled={isLoading() || isAtLimit()} 
        />
        
        <div class="chat-toolbar">
          <div class="toolbar-left">
            <button class="toolbar-btn" title="Adjuntar">
              <svg viewBox="0 0 24 24" fill="none" stroke="#6B6B5E" stroke-width="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </button>
          </div>
          
          <Show when={!activeSkill()} fallback={
            <div class="toolbar-right">
              <div class="active-mode-badge">
                {SKILLS.find(s => s.id === activeSkill())?.label}
              </div>
              <button class={`mode-btn mode-btn-auto`} onClick={() => setActiveSkill(null)}>
                Auto
              </button>
            </div>
          }>
            <div class="mode-btns">
              <button class={`mode-btn mode-btn-auto ${!activeSkill() ? 'active' : ''}`} onClick={() => setActiveSkill(null)}>
                Auto
              </button>
              <For each={SKILLS}>{(skill) => (
                <button 
                  class={`mode-btn ${activeSkill() === skill.id ? 'active' : ''}`} 
                  onClick={() => selectSkill(skill.id)}
                >
                  {skill.label}
                </button>
              )}</For>
            </div>
          </Show>
          
          <div class="toolbar-right">
            <button 
              class="send-btn" 
              onClick={enviarPregunta} 
              disabled={isLoading() || !input().trim() || isAtLimit()}
            >
              <svg viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
