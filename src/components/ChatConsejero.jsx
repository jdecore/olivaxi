import { createSignal, onMount, onCleanup, For, Show, createEffect } from 'solid-js';
import { apiUrl } from '../lib/api';

const PROVINCIAS = [
  { nombre: 'Jaén', emoji: '🏔️' },
  { nombre: 'Córdoba', emoji: '🌸' },
  { nombre: 'Sevilla', emoji: '💃' },
  { nombre: 'Granada', emoji: '❄️' },
  { nombre: 'Málaga', emoji: '🌊' },
  { nombre: 'Badajoz', emoji: '🌾' },
  { nombre: 'Toledo', emoji: '⚔️' },
  { nombre: 'Ciudad Real', emoji: '🏰' },
  { nombre: 'Almería', emoji: '☀️' },
  { nombre: 'Huelva', emoji: '🍓' },
];

const formatText = (text) => text?.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') || '';

export default function ChatConsejero() {
  const MAX_MESSAGES = 20;
  
  const [messages, setMessages] = createSignal([
    { id: 1, role: 'bot', text: '¡Hola! Soy Olivo 🫒, tu Consejero del olivar con el conocimiento del internet. ¿De qué provincia eres?', showProvincias: true }
  ]);
  const [step, setStep] = createSignal(1);
  const [provincia, setProvincia] = createSignal('');
  const [input, setInput] = createSignal('');
  const [isLoading, setIsLoading] = createSignal(false);
  const [isWaiting, setIsWaiting] = createSignal(false);
  const [climaActual, setClimaActual] = createSignal(null);
  const [currentProvider, setCurrentProvider] = createSignal(null);
  const [displayedText, setDisplayedText] = createSignal('');
  const [fullText, setFullText] = createSignal('');
  const [typingMessageId, setTypingMessageId] = createSignal(null);
  const [chatStarted, setChatStarted] = createSignal(false); // Para contar desde primera pregunta real
  const [showMemoryModal, setShowMemoryModal] = createSignal(false);
  
  let typingInterval;
  let messagesEndRef;

  const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';
  
  const theme = () => {
    const dark = isDark();
    return {
      bg: dark ? '#1a1a1a' : '#FFFFFF',
      border: dark ? '#F7F4EE' : '#E8EDE0',
      text: dark ? '#F7F4EE' : '#1C1C1C',
      muted: dark ? '#a0a095' : '#6B6B5E',
      accent: '#D4E849',
      sal: dark ? '#000000' : '#F9F8F4',
      bubbleBot: dark ? '#1a1a1a' : '#FFFFFF',
      bubbleUser: dark ? '#F7F4EE' : '#2D4A1E',
      bubbleUserText: dark ? '#1C1C1C' : '#FFFFFF',
    };
  };

  onMount(() => {
    const handleThemeChange = () => {
      setMessages([...messages()]); 
    };
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
      const speed = 30;
      
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
    if (fullText()) {
      setDisplayedText(fullText());
    }
    setTypingMessageId(null);
    setFullText('');
  };

  const seleccionarProvincia = (prov) => {
    const provNombre = prov.nombre;
    setProvincia(provNombre);

    setMessages(prev => {
      const updated = prev.map(m => m.showProvincias ? { ...m, showProvincias: false } : m);
      return [...updated, { id: Date.now(), role: 'user', text: provNombre }, { id: Date.now() + 1, role: 'bot', text: '', isThinking: true }];
    });

    setStep(3);
    scrollToBottom();

    fetch(apiUrl('/api/clima')).then(r => r.json()).then(d => {
      const data = d.find((p) => p.provincia === provNombre);
      if (data) setClimaActual(data);
    });

    setTimeout(() => {
      setMessages(prev => prev.map(m => m.isThinking ? { ...m, isThinking: false, text: `Perfecto, conozco muy bien ${provNombre} 🌿 ¿Qué quieres saber hoy sobre tu olivar?`, showQuickButtons: true } : m));
      setStep(2);
      scrollToBottom();
    }, 800);
  };

  const enviarPregunta = async () => {
    const text = input().trim();
    if (!text || isLoading()) return;

    // Contar solo intercambios (pregunta usuario + respuesta bot)
    const intercambios = Math.floor(messages().length / 2);
    if (chatStarted() && intercambios >= MAX_MESSAGES) {
      setShowMemoryModal(true);
      return;
    }

    if (!chatStarted()) setChatStarted(true);

    const pregunta = text;
    const botId = Date.now();

    setInput('');
    setMessages(prev => [...prev, { id: botId - 1, role: 'user', text: pregunta }, { id: botId, role: 'bot', text: '', isThinking: true, isWaiting: true }]);
    setStep(3);
    setIsLoading(true);
    setIsWaiting(true);
    scrollToBottom();

    try {
      const res = await fetch(apiUrl('/api/chat'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensaje: pregunta, provincia: provincia() }) });
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
                if (!firstChunk) { firstChunk = true; setIsWaiting(false); }
                setMessages(prev => prev.map(m => m.id === botId ? { ...m, text: m.text + json.texto } : m));
                startTypingAnimation(botId, json.texto);
                scrollToBottom();
              }
            } catch {}
          }
        }
      }
    } catch { setMessages(prev => prev.map(m => m.id === botId ? { ...m, isThinking: false, isWaiting: false, text: 'Lo siento, hubo un error. Intenta de nuevo.' } : m)); setStep(2); }
  };

  const finishMessage = (botId) => {
    setIsLoading(false);
    setIsWaiting(false);
    stopTypingAnimation();
    setMessages(prev => prev.map(m => m.id === botId ? { ...m, isThinking: false, isWaiting: false, showNewQ: true } : m));
    setStep(2);
    scrollToBottom();
  };

  const nuevaPregunta = () => setMessages(prev => prev.map(m => m.showNewQ ? { ...m, showNewQ: false } : m));

  const limpiarChat = () => {
    stopTypingAnimation();
    setMessages([
      { id: 1, role: 'bot', text: '¡Hola! Soy Olivo 🫒, tu Consejero del olivar. ¿De qué provincia eres?', showProvincias: true }
    ]);
    setStep(1);
    setProvincia('');
    setClimaActual(null);
    setCurrentProvider(null);
    setChatStarted(false);
    setShowMemoryModal(false);
  };

  const descargarChat = () => {
    const chatText = messages().map(m => {
      const rol = m.role === 'user' ? '👤 Tú' : '🫒 Olivo';
      return `${rol}: ${m.text || '(mensaje)'}`;
    }).join('\n\n');
    
    const blob = new Blob([chatText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oliva-xi-chat-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const quickQuestion = (tipo) => {
    const prov = provincia();
    const clima = climaActual();
    if (!prov || !clima) return;
    const map = { regar: `¿Debo regar hoy en ${prov} con ${clima.temperatura}°C y riesgo ${clima.riesgo}?`, clima: `¿Cómo afecta el clima actual (${clima.temperatura}°C, riesgo ${clima.riesgo}) a los olivares en ${prov}?`, semana: `¿Qué debo hacer esta semana en mis olivares de ${prov} considerando que hay ${clima.temperatura}°C y riesgo ${clima.riesgo}?` };
    setInput(map[tipo]);
    enviarPregunta();
  };

  const t = () => theme();
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
          background: white;
          border-bottom: 1px solid #E8EDE0;
          padding: 14px 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }
        .chat-avatar {
          width: 40px;
          height: 40px;
          background: #2D4A1E;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          color: white;
          flex-shrink: 0;
        }
        .chat-header-info { flex: 1; }
        .chat-name {
          font-weight: bold;
          font-size: 16px;
          color: #1C1C1C;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .chat-status {
          font-size: 13px;
          color: #6B6B5E;
          display: flex;
          align-items: center;
          gap: 6px;
          flex: 1;
        }
        .online-dot {
          width: 8px;
          height: 8px;
          background: #4CAF6F;
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
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
          background: #2D4A1E;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          color: white;
          flex-shrink: 0;
        }
        .msg-bubble {
          padding: 14px 18px;
          max-width: 72%;
          font-size: 15px;
          line-height: 1.65;
        }
        .msg-bubble.bot {
          background: white;
          border: 1px solid #EAEDE5;
          border-radius: 4px 18px 18px 18px;
          color: #1C1C1C;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .msg-bubble.user {
          background: #2D4A1E;
          color: white;
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
        .province-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 12px;
        }
        .province-btn {
          background: #F4F1EA;
          border: 1.5px solid #C5D4A8;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 500;
          color: #2D4A1E;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }
        .province-btn:hover {
          background: #E8EDE0;
        }
        .quick-btns {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          flex-wrap: wrap;
        }
        .quick-btn {
          background: #F0F7EC;
          border: 1.5px solid #A8C890;
          border-radius: 20px;
          padding: 8px 14px;
          font-size: 13px;
          color: #2D4A1E;
          cursor: pointer;
          transition: all 0.2s;
        }
        .quick-btn:hover {
          background: #E8EDE0;
        }
        .new-q-btn {
          background: #F0F7EC;
          color: #2D4A1E;
          border: 1.5px solid #A8C890;
          border-radius: 20px;
          padding: 8px 18px;
          font-size: 14px;
          cursor: pointer;
          margin-top: 12px;
          transition: all 0.2s;
        }
        .new-q-btn:hover {
          background: #E8EDE0;
        }
        .chat-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .clear-btn {
          background: #DC3545;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }
        .clear-btn:hover {
          background: #c82333;
        }
        .chat-memory-indicator {
          background: var(--color-sal);
          color: var(--color-muted);
          border: 1px solid var(--color-border);
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .chat-memory-indicator:hover {
          background: var(--color-limon);
          color: var(--color-aceituna);
        }
        .chat-memory-indicator.warning {
          background: #fef3c7;
          color: #b45309;
          border-color: #f59e0b;
        }
        .download-btn {
          background: transparent;
          border: 1px solid var(--color-border);
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .download-btn:hover {
          background: var(--color-limon);
        }
        .memory-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .memory-modal {
          background: white;
          border-radius: 12px;
          padding: 24px;
          max-width: 400px;
          text-align: center;
        }
        .memory-modal h3 { margin: 0 0 16px; }
        .memory-modal p { color: var(--color-muted); margin-bottom: 20px; }
        .memory-modal-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        .memory-modal-btn {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
          border: none;
        }
        .memory-modal-btn.download { background: #4CAF6F; color: white; }
        .memory-modal-btn.clear { background: #DC3545; color: white; }
        .memory-modal-btn.cancel { background: #f0f0f0; color: #666; }
        .memory-btn {
          background: var(--color-sal);
          border: 1px solid var(--color-border);
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 12px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }
        .memory-btn:hover { background: var(--color-limon); }
        .memory-btn.warning { background: #fef3c7; border-color: #f59e0b; color: #b45309; }
        .chat-input-area {
          background: white;
          border-top: 1px solid #E8EDE0;
          padding: 16px 20px;
          display: flex;
          gap: 10px;
          align-items: center;
          flex-shrink: 0;
        }
        .chat-input {
          flex: 1;
          height: 46px;
          border-radius: 23px;
          border: 1.5px solid #D4DFC4;
          padding: 0 20px;
          font-size: 15px;
          background: #FAFAF8;
          color: #1C1C1C;
          outline: none;
          transition: border-color 0.2s;
        }
        .chat-input:focus {
          border-color: #4CAF6F;
        }
        .chat-input::placeholder {
          color: #6B6B5E;
        }
        .chat-send-btn {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: #4CAF6F;
          color: white;
          border: none;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .chat-send-btn:hover:not(:disabled) {
          background: #3d8b5a;
        }
        .chat-send-btn:disabled {
          background: #B8D4C0;
          cursor: not-allowed;
        }
        .bubble {
          animation: fadeInUp 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
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
        <div class="chat-status">
          <span class="online-dot"></span>
          <span>Consejero del olivar · En línea</span>
          <Show when={currentProvider()}>
            <span style="margin-left: 4px;">· {currentProvider()}</span>
          </Show>
        </div>
        <div class="chat-header-right">
          <div class="chat-name">Olivo</div>
          <div class="chat-avatar">🫒</div>
          <button class="clear-btn" onClick={() => setShowMemoryModal(true)}>Limpiar</button>
        </div>
      </div>

      <div class="chat-messages">
        <For each={msgs()}>{(msg) => (
          <div class={`msg-row ${msg.role} ${!msg.isWaiting && !msg.isThinking ? 'bubble' : ''}`}>
            <Show when={msg.role === 'bot'}>
              <div class="msg-avatar-small">🫒</div>
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
                <Show when={msg.isThinking && !msg.isWaiting}>
                  <span style={{ color: '#6B6B5E' }}>...</span>
                </Show>
                <Show when={!msg.isWaiting && !msg.isThinking}>
                  <span innerHTML={formatText(typingMessageId() === msg.id ? displayedText() : msg.text)}></span>
                  <span style={typingMessageId() === msg.id && displayedText() !== fullText() ? "animation: blink 1s infinite; display: inline;" : "display: none;"}>▊</span>
                </Show>
                <Show when={msg.showProvincias}>
                  <div class="province-grid">
                    <For each={PROVINCIAS}>{(p) => (
                      <button class="province-btn" onClick={() => seleccionarProvincia(p)}>
                        {p.nombre} {p.emoji}
                      </button>
                    )}</For>
                  </div>
                </Show>

                <Show when={msg.showQuickButtons}>
                  <div class="quick-btns">
                    <button class="quick-btn" onClick={() => quickQuestion('regar')}>💧 ¿Debo regar hoy?</button>
                    <button class="quick-btn" onClick={() => quickQuestion('clima')}>🌡️ ¿Cómo afecta este clima?</button>
                    <button class="quick-btn" onClick={() => quickQuestion('semana')}>📅 ¿Qué hago esta semana?</button>
                  </div>
                </Show>
              </div>
            </Show>
          </div>
        )}</For>
        <div ref={messagesEndRef}></div>
      </div>

      <div class="chat-input-area">
        <button 
          class={`memory-btn ${chatStarted() && Math.floor(messages().length / 2) >= 15 ? 'warning' : ''}`} 
          onClick={() => setShowMemoryModal(true)}
        >
          💾 {chatStarted() ? Math.floor(messages().length / 2) : 0}/{MAX_MESSAGES}
        </button>
        <input 
          class="chat-input" 
          type="text" 
          value={input()} 
          onInput={(e) => setInput(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && enviarPregunta()} 
          placeholder={step() === 1 ? "Selecciona tu provincia arriba" : "Escribe tu pregunta..."} 
          disabled={isLoading() || step() === 1} 
        />
        <button 
          class="chat-send-btn" 
          onClick={enviarPregunta} 
          disabled={isLoading() || !input().trim() || step() === 1}
        >
          ➤
        </button>
        <button class="download-btn" onClick={descargarChat} title="Descargar chat">📥</button>
      </div>

      <Show when={showMemoryModal()}>
        <div class="memory-modal-overlay" onClick={() => setShowMemoryModal(false)}>
          <div class="memory-modal" onClick={(e) => e.stopPropagation()}>
            <h3>💾 Memoria del Chat</h3>
            <p>Has usado {chatStarted() ? Math.floor(messages().length / 2) : 0} de {MAX_MESSAGES} intercambios.<br/>
            {chatStarted() && Math.floor(messages().length / 2) >= MAX_MESSAGES ? 'El chat ha llegado al límite. Descarga el chat antes de borrar.' : 'Puedes descargar el chat o limpiarlo cuando quieras.'}</p>
            <div class="memory-modal-buttons">
              <button class="memory-modal-btn download" onClick={() => { descargarChat(); setShowMemoryModal(false); }}>📥 Descargar</button>
              <button class="memory-modal-btn clear" onClick={() => { limpiarChat(); setShowMemoryModal(false); }}>🗑️ Borrar todo</button>
              <button class="memory-modal-btn cancel" onClick={() => setShowMemoryModal(false)}>✖️ Cerrar</button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
