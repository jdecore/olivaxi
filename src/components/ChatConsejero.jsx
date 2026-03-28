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

  const allModes = () => ['Auto', ...SKILLS.map(s => s.label)];
  
  return (
    <div class="chat-container">
      <style>{`
        .chat-container {
          width: 100%;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #f5efe8;
          padding: 40px 20px;
        }
        .chat-greeting {
          text-align: center;
          margin-bottom: 32px;
        }
        .chat-greeting h1 {
          font-family: system-ui, -apple-system, sans-serif;
          font-weight: 700;
          font-size: 22px;
          color: #000;
          margin: 0;
        }
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-width: 700px;
          width: 100%;
          margin: 0 auto;
        }
        .msg-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .msg-row.user {
          justify-content: flex-end;
        }
        .msg-bubble {
          padding: 14px 18px;
          max-width: 72%;
          font-size: 15px;
          line-height: 1.65;
        }
        .msg-bubble.bot {
          background: #fff;
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
          max-width: 700px;
          width: 100%;
          margin: 24px auto 0;
        }
        .chat-input {
          width: 100%;
          height: 48px;
          border: none;
          background: transparent;
          font-size: 15px;
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
        .chat-toolbar {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 8px;
          gap: 8px;
          flex-wrap: wrap;
        }
        .mode-btn {
          padding: 8px 14px;
          border-radius: 20px;
          border: 1px solid #e0e0e0;
          background: transparent;
          color: #666;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }
        .mode-btn:hover {
          border-color: #999;
          color: #333;
        }
        .mode-btn.active {
          background: #1C1C1C;
          border-color: #1C1C1C;
          color: #fff;
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
      `}</style>

      <div class="chat-greeting">
        <h1>¿Qué modo quieres usar?</h1>
      </div>

      <div class="chat-messages">
        <For each={msgs()}>{(msg) => (
          <div class={`msg-row ${msg.role} ${!msg.isWaiting ? 'bubble' : ''}`}>
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
          placeholder={`Message ${allModes().join(' · ')}`}
          disabled={isLoading() || isAtLimit()} 
        />
        
        <div class="chat-toolbar">
          <button 
            class={`mode-btn ${!activeSkill() ? 'active' : ''}`} 
            onClick={() => setActiveSkill(null)}
          >
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
      </div>
    </div>
  );
}
