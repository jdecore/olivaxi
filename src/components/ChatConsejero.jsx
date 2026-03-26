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

const formatText = (text) => {
  if (!text) return '';
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
};

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
  const [modoOscuro, setModoOscuro] = createSignal(false);
  const [currentProvider, setCurrentProvider] = createSignal(null);
  
  let messagesEndRef;

  onMount(() => {
    const theme = document.documentElement.getAttribute('data-theme');
    setModoOscuro(theme === 'dark');
    
    const handleThemeChange = (e) => {
      setModoOscuro(e.detail.modoOscuro);
    };
    window.addEventListener('modoOscuroChange', handleThemeChange);
    onCleanup(() => window.removeEventListener('modoOscuroChange', handleThemeChange));
  });

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesEndRef && messagesEndRef.parentElement) {
        const container = messagesEndRef.parentElement;
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        if (isNearBottom || messages().length <= 2) {
          messagesEndRef.scrollIntoView({ behavior: 'auto', block: 'end' });
        }
      }
    }, 10);
  };

  const colors = () => modoOscuro() ? {
    wrapperBg: 'var(--color-white-surface)',
    border: 'var(--color-border)',
    text: 'var(--color-aceituna)',
    muted: 'var(--color-muted)',
    accent: 'var(--color-limon)',
    sal: 'var(--color-sal)',
    bubbleBot: 'var(--color-white-surface)',
    bubbleUser: 'var(--color-aceituna)',
  } : {
    wrapperBg: '#FFFFFF',
    border: '#1C1C1C',
    text: '#1C1C1C',
    muted: '#4a4a40',
    accent: '#D4E849',
    sal: '#F7F4EE',
    bubbleBot: '#FFFFFF',
    bubbleUser: '#1C1C1C',
  };

  const seleccionarProvincia = (prov) => {
    const provNombre = prov.nombre;
    setProvincia(provNombre);

    setMessages(prev => {
      const updated = prev.map(m => m.showProvincias ? { ...m, showProvincias: false } : m);
      return [
        ...updated,
        { id: Date.now(), role: 'user', text: provNombre },
        { id: Date.now() + 1, role: 'bot', text: '', isThinking: true }
      ];
    });

    setStep(3);
    scrollToBottom();

    fetch(apiUrl('/api/clima'))
      .then(res => res.json())
      .then(datos => {
        const provData = datos.find((p) => p.provincia === provNombre);
        if (provData) setClimaActual(provData);
      });

    setTimeout(() => {
      setMessages(prev => prev.map(m => 
        m.isThinking 
          ? { ...m, isThinking: false, text: `Perfecto, conozco muy bien ${provNombre} 🌿 ¿Qué quieres saber hoy sobre tu olivar?`, showQuickButtons: true }
          : m
      ));
      setStep(2);
      scrollToBottom();
    }, 800);
  };

  const enviarPregunta = async () => {
    if (!input().trim() || isLoading()) return;

    const pregunta = input().trim();
    const botId = Date.now();

    setInput('');
    setMessages(prev => [
      ...prev,
      { id: botId - 1, role: 'user', text: pregunta },
      { id: botId, role: 'bot', text: '', isThinking: true, isWaiting: true }
    ]);
    setStep(3);
    setIsLoading(true);
    setIsWaiting(true);
    scrollToBottom();

    try {
      const res = await fetch(apiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: pregunta, provincia: provincia() })
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let firstChunkReceived = false;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          setIsLoading(false);
          setIsWaiting(false);
          setMessages(prev => prev.map(m => 
            m.id === botId
              ? { ...m, isThinking: false, isWaiting: false, showNewQ: true }
              : m
          ));
          setStep(2);
          scrollToBottom();
          break;
        }

        const decoded = decoder.decode(value, { stream: true });
        buffer += decoded;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: [DONE]')) {
            setIsLoading(false);
            setIsWaiting(false);
            setMessages(prev => prev.map(m => 
              m.id === botId
                ? { ...m, isThinking: false, isWaiting: false, showNewQ: true }
                : m
            ));
            setStep(2);
            scrollToBottom();
            break;
          }

          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(6));
              const chunk = json.texto || '';
              if (json.provider && !firstChunkReceived) {
                setCurrentProvider(json.provider);
              }
              if (chunk) {
                if (!firstChunkReceived) {
                  firstChunkReceived = true;
                  setIsWaiting(false);
                }
                setMessages(prev => prev.map(m =>
                  m.id === botId
                    ? { ...m, text: m.text + chunk }
                    : m
                ));
                scrollToBottom();
              }
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      setIsLoading(false);
      setIsWaiting(false);
      setMessages(prev => prev.map(m =>
        m.id === botId
          ? { ...m, isThinking: false, isWaiting: false, text: 'Lo siento, hubo un error. Intenta de nuevo.' }
          : m
      ));
      setStep(2);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') enviarPregunta();
  };

  const nuevaPregunta = () => {
    setMessages(prev => prev.map(m =>
      m.showNewQ ? { ...m, showNewQ: false } : m
    ));
    setIsLoading(false);
  };

  const enviarPreguntaQuick = (tipo) => {
    if (!provincia() || !climaActual()) return;
    let pregunta = '';
    const prov = provincia();
    const clima = climaActual();
    if (tipo === 'regar') pregunta = `¿Debo regar hoy en ${prov} con ${clima.temperatura}°C y riesgo ${clima.riesgo}?`;
    else if (tipo === 'clima') pregunta = `¿Cómo afecta el clima actual (${clima.temperatura}°C, riesgo ${clima.riesgo}) a los olivares en ${prov}?`;
    else if (tipo === 'semana') pregunta = `¿Qué debo hacer esta semana en mis olivares de ${prov} considerando que hay ${clima.temperatura}°C y riesgo ${clima.riesgo}?`;
    setInput(pregunta);
    enviarPregunta();
  };

  const c = () => colors();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      background: c().wrapperBg,
      border: `2px solid ${c().border}`,
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(0.95); } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); opacity: 0.5; } 50% { transform: translateY(-4px); opacity: 1; } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 24px',
        background: c().wrapperBg,
        borderBottom: `2px solid ${c().border}`,
        flexShrink: 0,
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{ width: '40px', height: '40px', background: c().text, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: c().sal }}>🫒</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', fontSize: '16px', color: c().text }}>Olivo</div>
          <div style={{ fontSize: '13px', color: c().muted, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Show when={currentProvider()} fallback={
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', background: c().accent, borderRadius: '50%', animation: 'pulse 2s infinite' }}></span>
                Consejero del olivar
              </span>
            }>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', background: c().accent, borderRadius: '50%', animation: 'pulse 2s infinite' }}></span>
                Powered by {currentProvider()}
              </span>
            </Show>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px', background: c().sal, minHeight: 0 }}>
        <For each={messages()}>{(msg) => (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', animation: 'slideIn 0.35s ease-out', ...(msg.role === 'user' ? { justifyContent: 'flex-end' } : {}) }}>
            <Show when={msg.role === 'bot'}>
              <div style={{ width: '32px', height: '32px', background: c().text, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: c().sal, flexShrink: 0 }}>🫒</div>
            </Show>
            <Show when={msg.role === 'bot'} fallback={
              <div style={{ padding: '14px 18px', background: c().bubbleUser, color: c().sal, borderRadius: '6px 0 6px 6px', maxWidth: '72%', width: 'fit-content', wordBreak: 'break-word', fontSize: '15px', lineHeight: 1.65 }}>{msg.text}</div>
            }>
              <div style={{ padding: '14px 18px', maxWidth: '72%', fontSize: '15px', lineHeight: 1.65, background: c().bubbleBot, border: `2px solid ${c().border}`, borderRadius: '0 6px 6px 6px', color: c().text }}>
                <Show when={msg.isWaiting}>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '4px 0' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: c().muted, animation: 'bounce 1.2s infinite' }}></span>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: c().muted, animation: 'bounce 1.2s infinite', animationDelay: '0.2s' }}></span>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: c().muted, animation: 'bounce 1.2s infinite', animationDelay: '0.4s' }}></span>
                  </div>
                </Show>
                <Show when={msg.isThinking && !msg.isWaiting}>
                  <span style={{ display: 'flex', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', background: c().muted, borderRadius: '50%', animation: 'bounce 1.2s ease-in-out infinite', animationDelay: '0s' }}></span>
                    <span style={{ width: '8px', height: '8px', background: c().muted, borderRadius: '50%', animation: 'bounce 1.2s ease-in-out infinite', animationDelay: '0.4s' }}></span>
                    <span style={{ width: '8px', height: '8px', background: c().muted, borderRadius: '50%', animation: 'bounce 1.2s ease-in-out infinite', animationDelay: '0.8s' }}></span>
                  </span>
                </Show>
                <Show when={!msg.isWaiting && !msg.isThinking}>
                  <span innerHTML={formatText(msg.text)}></span>
                </Show>
                
                <Show when={msg.showProvincias}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                    <For each={PROVINCIAS}>{(p) => (
                      <button onClick={() => seleccionarProvincia(p)} style={{ background: c().wrapperBg, border: `2px solid ${c().border}`, borderRadius: '4px', padding: '5px 14px', fontSize: '12px', fontWeight: '700', color: c().text, cursor: 'pointer', transition: 'all 0.2s ease' }}>{p.nombre} {p.emoji}</button>
                    )}</For>
                  </div>
                </Show>
                
                <Show when={msg.showNewQ}>
                  <div style={{ marginTop: '12px' }}>
                    <button onClick={nuevaPregunta} style={{ background: c().accent, color: c().text, border: `2px solid ${c().border}`, borderRadius: '4px', padding: '8px 18px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s ease' }}>Nueva pregunta →</button>
                  </div>
                </Show>
                
                <Show when={msg.showQuickButtons}>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                    <button onClick={() => enviarPreguntaQuick('regar')} style={{ background: c().sal, border: `1px solid ${c().border}`, borderRadius: '4px', padding: '6px 12px', fontSize: '12px', color: c().text, cursor: 'pointer', transition: 'all 0.15s ease' }}>💧 ¿Debo regar hoy?</button>
                    <button onClick={() => enviarPreguntaQuick('clima')} style={{ background: c().sal, border: `1px solid ${c().border}`, borderRadius: '4px', padding: '6px 12px', fontSize: '12px', color: c().text, cursor: 'pointer', transition: 'all 0.15s ease' }}>🌡️ ¿Cómo afecta este clima?</button>
                    <button onClick={() => enviarPreguntaQuick('semana')} style={{ background: c().sal, border: `1px solid ${c().border}`, borderRadius: '4px', padding: '6px 12px', fontSize: '12px', color: c().text, cursor: 'pointer', transition: 'all 0.15s ease' }}>📅 ¿Qué hago esta semana?</button>
                  </div>
                </Show>
              </div>
            </Show>
          </div>
        )}</For>
        <div ref={messagesEndRef}></div>
      </div>

      <div style={{ padding: '16px 20px', background: c().wrapperBg, borderTop: `2px solid ${c().border}`, display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0, marginTop: 'auto' }}>
        <input type="text" value={input()} onInput={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={step() === 1 ? "Selecciona tu provincia arriba" : "Escribe tu pregunta..."} disabled={isLoading() || step() === 1} style={{ flex: 1, height: '46px', borderRadius: '4px', border: `2px solid ${c().border}`, padding: '0 20px', fontSize: '15px', background: c().wrapperBg, color: c().text, outline: 'none', transition: 'border-color 0.2s ease', opacity: (isLoading() || step() === 1) ? 0.6 : 1, cursor: (isLoading() || step() === 1) ? 'not-allowed' : 'text' }} />
        <button onClick={enviarPregunta} disabled={isLoading() || !input().trim() || step() === 1} style={{ width: '46px', height: '46px', borderRadius: '4px', background: c().accent, color: c().text, border: `2px solid ${c().border}`, fontSize: '18px', cursor: (isLoading() || !input().trim() || step() === 1) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', opacity: (isLoading() || !input().trim() || step() === 1) ? 0.5 : 1 }}>➤</button>
      </div>
    </div>
  );
}