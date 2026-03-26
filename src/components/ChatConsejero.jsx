import { createSignal, onMount, onCleanup, For, Show } from 'solid-js';
import { apiUrl } from '../lib/api.ts';

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
  
  let messagesEndRef;

  const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';
  
  const theme = () => {
    const dark = isDark();
    return {
      bg: dark ? '#1a1a1a' : '#FFFFFF',
      border: dark ? '#F7F4EE' : '#1C1C1C',
      text: dark ? '#F7F4EE' : '#1C1C1C',
      muted: dark ? '#a0a095' : '#4a4a40',
      accent: '#D4E849',
      sal: dark ? '#000000' : '#F7F4EE',
      bubbleBot: dark ? '#1a1a1a' : '#FFFFFF',
      bubbleUser: dark ? '#F7F4EE' : '#1C1C1C',
    };
  };

  onMount(() => {
    const handleThemeChange = () => {
      setMessages([...messages()]); 
    };
    window.addEventListener('modoOscuroChange', handleThemeChange);
    onCleanup(() => window.removeEventListener('modoOscuroChange', handleThemeChange));
  });

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      messagesEndRef?.scrollIntoView({ behavior: 'auto', block: 'end' });
    });
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
    setMessages(prev => prev.map(m => m.id === botId ? { ...m, isThinking: false, isWaiting: false, showNewQ: true } : m));
    setStep(2);
    scrollToBottom();
  };

  const nuevaPregunta = () => setMessages(prev => prev.map(m => m.showNewQ ? { ...m, showNewQ: false } : m));

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
    <div class="chat-wrapper-optimized">
      <style>{`
        .chat-wrapper-optimized { display: flex; flex-direction: column; height: 100%; width: 100%; background: ${() => t().bg}; border: 2px solid ${() => t().border}; border-radius: 8px; overflow: hidden; }
        .chat-header { display: flex; align-items: center; gap: 12px; padding: 14px 24px; background: ${() => t().bg}; border-bottom: 2px solid ${() => t().border}; flex-shrink: 0; }
        .chat-avatar { width: 40px; height: 40px; background: ${() => t().text}; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 20px; color: ${() => t().sal}; }
        .chat-header-info { flex: 1; }
        .chat-name { font-weight: bold; font-size: 16px; color: ${() => t().text}; }
        .chat-status { font-size: 13px; color: ${() => t().muted}; display: flex; align-items: center; gap: 6px; }
        .status-dot { width: 8px; height: 8px; background: #D4E849; border-radius: 50%; animation: pulse 2s infinite; }
        .chat-messages { flex: 1; overflow-y: auto; padding: 24px 20px; display: flex; flex-direction: column; gap: 16px; background: ${() => t().sal}; }
        .msg-row { display: flex; align-items: flex-start; gap: 10px; animation: slideIn 0.3s; }
        .msg-row.user { justify-content: flex-end; }
        .msg-avatar-small { width: 32px; height: 32px; background: ${() => t().text}; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 14px; color: ${() => t().sal}; flex-shrink: 0; }
        .msg-bubble { padding: 14px 18px; max-width: 72%; font-size: 15px; line-height: 1.65; }
        .msg-bubble.bot { background: ${() => t().bubbleBot}; border: 2px solid ${() => t().border}; border-radius: 0 6px 6px 6px; color: ${() => t().text}; }
        .msg-bubble.user { background: ${() => t().bubbleUser}; color: ${() => t().sal}; border-radius: 6px 0 6px 6px; width: fit-content; word-break: break-word; }
        .typing-dots { display: flex; gap: 6px; }
        .typing-dots span { width: 8px; height: 8px; background: ${() => t().muted}; border-radius: 50%; animation: bounce 1.2s infinite; }
        .province-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
        .province-btn { background: ${() => t().bg}; border: 2px solid ${() => t().border}; border-radius: 4px; padding: 5px 14px; font-size: 12px; font-weight: 700; color: ${() => t().text}; cursor: pointer; transition: all 0.2s; }
        .new-q-btn { background: #D4E849; color: ${() => t().text}; border: 2px solid ${() => t().border}; border-radius: 4px; padding: 8px 18px; font-size: 14px; font-weight: 700; cursor: pointer; margin-top: 12px; }
        .quick-btns { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
        .quick-btn { background: ${() => t().sal}; border: 1px solid ${() => t().border}; border-radius: 4px; padding: 6px 12px; font-size: 12px; color: ${() => t().text}; cursor: pointer; }
        .chat-input-area { padding: 16px 20px; background: ${() => t().bg}; border-top: 2px solid ${() => t().border}; display: flex; gap: 10px; flex-shrink: 0; }
        .chat-input { flex: 1; height: 46px; border-radius: 4px; border: 2px solid ${() => t().border}; padding: 0 20px; font-size: 15px; background: ${() => t().bg}; color: ${() => t().text}; }
        .chat-send-btn { width: 46px; height: 46px; border-radius: 4px; background: #D4E849; color: ${() => t().text}; border: 2px solid ${() => t().border}; font-size: 18px; cursor: pointer; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div class="chat-header">
        <div class="chat-avatar">🫒</div>
        <div class="chat-header-info">
          <div class="chat-name">Olivo</div>
          <div class="chat-status">
            <span class="status-dot"></span>
            <Show when={currentProvider()} fallback="Consejero del olivar">{`Powered by ${currentProvider()}`}</Show>
          </div>
        </div>
      </div>

      <div class="chat-messages">
        <For each={msgs()}>{(msg) => (
          <div class={`msg-row ${msg.role}`}>
            <Show when={msg.role === 'bot'}><div class="msg-avatar-small">🫒</div></Show>
            <Show when={msg.role === 'bot'} fallback={<div class="msg-bubble user">{msg.text}</div>}>
              <div class="msg-bubble bot">
                <Show when={msg.isWaiting}><div class="typing-dots"><span></span><span></span><span></span></div></Show>
                <Show when={msg.isThinking && !msg.isWaiting}><span style={{ color: t().muted }}>...</span></Show>
                <Show when={!msg.isWaiting && !msg.isThinking}><span innerHTML={formatText(msg.text)}></span></Show>
                <Show when={msg.showProvincias}>
                  <div class="province-grid"><For each={PROVINCIAS}>{(p) => <button class="province-btn" onClick={() => seleccionarProvincia(p)}>{p.nombre} {p.emoji}</button>}</For></div>
                </Show>
                <Show when={msg.showNewQ}><button class="new-q-btn" onClick={nuevaPregunta}>Nueva pregunta →</button></Show>
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
        <input class="chat-input" type="text" value={input()} onInput={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && enviarPregunta()} placeholder={step() === 1 ? "Selecciona tu provincia arriba" : "Escribe tu pregunta..."} disabled={isLoading() || step() === 1} />
        <button class="chat-send-btn" onClick={enviarPregunta} disabled={isLoading() || !input().trim() || step() === 1}>➤</button>
      </div>
    </div>
  );
}