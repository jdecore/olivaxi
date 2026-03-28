import { createSignal, onMount, onCleanup, For, Show, createEffect } from 'solid-js';
import { apiUrl } from '../lib/api';

const PROVINCIAS = [
  'Jaén', 'Córdoba', 'Sevilla', 'Granada', 'Málaga', 
  'Badajoz', 'Toledo', 'Ciudad Real', 'Almería', 'Huelva'
];

const formatText = (text) => text?.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') || '';

const getInitialProvincia = () => {
  if (typeof window === 'undefined') return '';
  try {
    const saved = localStorage.getItem('olivaxi_provincia');
    if (saved) return saved;
    const savedVariedad = localStorage.getItem('olivaxi_variedad');
    if (savedVariedad) return 'Jaén';
  } catch {}
  return '';
};

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
  const [provincia, setProvincia] = createSignal(getInitialProvincia());
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
      const saved = localStorage.getItem('olivaxi_provincia');
      if (saved) return saved;
      const savedVariedad = localStorage.getItem('olivaxi_variedad');
      if (savedVariedad) return 'Jaén';
    } catch {}
    return null;
  };

  const [showProvinceDropdown, setShowProvinceDropdown] = createSignal(false);
  
  const initChat = async () => {
    setInitComplete(true);
    
    const savedProv = getProvinciaFromStorage();
    
    if (savedProv) {
      setProvincia(savedProv);
      try {
        const res = await fetch(apiUrl('/api/clima'));
        const data = await res.json();
        const provData = data.find((p) => p.provincia === savedProv);
        if (provData) setClimaActual(provData);
      } catch {}
    }
  };

  const seleccionarProvincia = async (prov) => {
    setProvincia(prov);
    setShowProvinceDropdown(false);
    try {
      const res = await fetch(apiUrl('/api/clima'));
      const data = await res.json();
      const provData = data.find((p) => p.provincia === prov);
      if (provData) setClimaActual(provData);
    } catch {}
  };

  onMount(() => {
    initChat();
    const handleThemeChange = () => setMessages([...messages()]);
    window.addEventListener('modoOscuroChange', handleThemeChange);
    onCleanup(() => window.removeEventListener('modoOscuroChange', handleThemeChange));
    
    const handleStorageChange = () => {
      const prov = getProvinciaFromStorage();
      if (prov && prov !== provincia()) {
        seleccionarProvincia(prov);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(() => {
      const prov = getProvinciaFromStorage();
      if (prov && prov !== provincia()) {
        seleccionarProvincia(prov);
      }
    }, 1000);
    onCleanup(() => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    });
  });

  createEffect(() => {
    if (messagesEndRef && messages().length > 0) {
      messagesEndRef.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  });

  const scrollToBottom = (smooth = false) => {
    requestAnimationFrame(() => {
      const container = messagesEndRef?.parentElement;
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto'
        });
      }
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
          scrollToBottom(true);
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
      
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'bot', text: `Perfecto, tengo información de ${provMatch}.` }]);
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
    scrollToBottom(true);

    if (!provincia()) {
      const found = await handleProvinciaInput(pregunta);
      setIsLoading(false);
      setMessages(prev => prev.map(m => m.id === botId ? { ...m, isWaiting: false, text: found ? `Perfecto, tengo información de ${provincia()}. ¿Qué quieres saber sobre tu olivar?` : 'No he entendido la provincia. Por favor, escribe el nombre de una provincia olivarera española (Jaén, Córdoba, Sevilla, Granada, Málaga, Badajoz, Toledo, Ciudad Real, Almería o Huelva).' } : m));
      scrollToBottom(true);
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
                scrollToBottom(true);
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
    scrollToBottom(true);
  };

  const limpiarChat = () => {
    stopTypingAnimation();
    setActiveSkill(null);
    initChat();
  };

  const selectSkill = (skillId) => {
    if (activeSkill() === skillId) {
      setActiveSkill(null);
      setInputExpanded(false);
    } else {
      setActiveSkill(skillId);
      setInputExpanded(true);
    }
  };

  const t = () => ({ bg: '#fff', text: '#1C1C1C', muted: '#6B6B5E', accent: '#D4E849', inputBg: '#f7f5f0' });
  const msgs = () => messages();

  const allModes = () => ['Auto', ...SKILLS.map(s => s.label)];
  
  return (
    <div class="chat-container">
      <style>{`
        .chat-container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background: #f5efe8;
          padding: 8px;
          box-sizing: border-box;
          overflow: hidden;
        }
        .chat-hero {
          text-align: center;
          margin-bottom: 4px;
          flex-shrink: 0;
        }
        .chat-hero h1 {
          font-family: 'Playfair Display', Georgia, serif;
          font-weight: 800;
          font-size: 20px;
          color: #000;
          margin: 0;
          letter-spacing: -0.02em;
        }
        .chat-with-input {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-height: 0;
        }
        .input-area {
          flex-shrink: 0;
          padding-top: 4px;
          background: #f5efe8;
        }
        .province-select-card {
          max-width: 280px;
          margin: 0 auto 4px;
          background: #fff;
          border-radius: 10px;
          padding: 8px 12px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.04);
        }
        .province-dropdown {
          width: 100%;
          padding: 8px 12px;
          font-size: 14px;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          background: #fff;
          color: #333;
          cursor: pointer;
          outline: none;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 16px center;
        }
        .province-dropdown:focus {
          border-color: #1C1C1C;
        }
        .skills-card {
          max-width: 300px;
          margin: 0 auto 4px;
          background: #fff;
          border-radius: 10px;
          padding: 8px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.04);
          flex-shrink: 0;
        }
        .skills-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          justify-content: center;
        }
        .skill-btn {
          padding: 5px 10px;
          border-radius: 16px;
          border: none;
          background: #D4E849;
          color: #1C1C1C;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .skill-btn:hover {
          background: #c5d93e;
        }
        .skill-btn.selected {
          background: #1C1C1C;
          border-color: #1C1C1C;
          color: #fff;
        }
        .input-section {
          max-width: 600px;
          margin: 0 auto 20px;
          width: 100%;
        }
        .chat-messages {
          flex: 1;
          overflow-y: hidden;
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-width: 350px;
          width: 100%;
          margin: 0 auto;
          padding-bottom: 4px;
          min-height: 0;
        }
        .msg-row {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          animation: msgSlideIn 0.4s ease-out forwards;
          opacity: 0;
        }
        @keyframes msgSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .msg-row.user {
          justify-content: flex-end;
        }
        .msg-bubble {
          padding: 6px 10px;
          max-width: 72%;
          font-size: 12px;
          line-height: 1.4;
        }
        .msg-bubble.bot {
          background: #fff;
          border-radius: 4px 12px 12px 12px;
          color: #1C1C1C;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        }
        .msg-bubble.user {
          background: #1C1C1C;
          color: #F7F4EE;
          border-radius: 14px 4px 14px 14px;
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
          background: #999;
          border-radius: 50%;
        }
        .dot1 { animation: bounce 1.2s ease-in-out infinite; }
        .dot2 { animation: bounce 1.2s ease-in-out 0.2s infinite; }
        .dot3 { animation: bounce 1.2s ease-in-out 0.4s infinite; }
        .limit-message {
          background: #fff;
          border-radius: 12px;
          padding: 16px 20px;
          text-align: center;
          color: #666;
          font-weight: 500;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          max-width: 700px;
          margin: 0 auto;
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
          max-width: 280px;
          width: 100%;
          margin: 0 auto 4px;
          padding: 4px 6px;
          background: #fff;
          border-radius: 6px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.03);
          transition: transform 0.3s ease, opacity 0.3s ease;
        }
        .chat-input-wrapper.responding {
          transform: translateY(4px);
          opacity: 0.7;
        }
        .chat-input {
          width: 100%;
          height: 24px;
          border: none;
          background: transparent;
          font-size: 14px;
          color: #1C1C1C;
          outline: none;
          padding: 0;
        }
        .chat-input::placeholder {
          color: #999;
        }
        .chat-input:disabled {
          opacity: 0.6;
        }
        .active-mode {
          display: flex;
          align-items: center;
          gap: 3px;
          margin-bottom: 3px;
          justify-content: center;
        }
        .active-mode-badge {
          background: #1C1C1C;
          color: #fff;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 2px;
        }
        .active-mode-clear {
          background: transparent;
          border: 1px solid #ccc;
          color: #666;
          padding: 3px 6px;
          border-radius: 24px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .active-mode-clear:hover {
          border-color: #1C1C1C;
          color: #1C1C1C;
        }
        .skill-btn {
          padding: 8px 16px;
          border-radius: 20px;
          border: none;
          background: #D4E849;
          color: #1C1C1C;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .skill-btn:hover {
          background: #c5d93e;
        }
        .skill-btn.selected {
          background: #1C1C1C;
          color: #fff;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>

      <div class="chat-hero">
        <h1>¿Qué modo quieres usar?</h1>
      </div>

      <Show when={initComplete()}>
        <Show when={!provincia()}>
          <div class="province-select-card">
            <select 
              class="province-dropdown"
              value=""
              onChange={(e) => seleccionarProvincia(e.target.value)}
            >
              <option value="" disabled>Selecciona tu provincia</option>
              <For each={PROVINCIAS}>{(prov) => (
                <option value={prov}>{prov}</option>
              )}</For>
            </select>
          </div>
        </Show>

        <Show when={provincia() && !activeSkill()}>
          <div class="skills-card">
            <div class="skills-grid">
              <For each={SKILLS}>{(skill) => (
                <button 
                  class={`skill-btn ${activeSkill() === skill.id ? 'selected' : ''}`}
                  onClick={() => selectSkill(skill.id)}
                >
                  {skill.label}
                </button>
              )}</For>
            </div>
          </div>
        </Show>

        <Show when={provincia() && activeSkill()}>
        <div class="chat-with-input">
          <div class="chat-messages">
            <For each={msgs()}>{(msg) => (
              <div class="msg-row">
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

          <div class="input-area">
            <div class="active-mode">
              <div class="active-mode-badge">
                {SKILLS.find(s => s.id === activeSkill())?.label}
              </div>
              <button class="active-mode-clear" onClick={() => setActiveSkill(null)}>
                Cambiar
              </button>
            </div>
          
            <div class={`chat-input-wrapper ${isLoading() ? 'responding' : ''}`}>
              <input 
                class="chat-input" 
                type="text" 
                value={input()} 
                onInput={(e) => setInput(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && enviarPregunta()} 
                placeholder={isLoading() ? "Escribiendo..." : "Escribe tu mensaje..."}
                disabled={isLoading() || isAtLimit()} 
              />
            </div>
          </div>
        </div>
      </Show>
      </Show>
    </div>
  );
}
