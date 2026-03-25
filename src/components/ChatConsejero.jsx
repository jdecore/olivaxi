import { useState, useRef, useEffect } from 'react';
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
  const [messages, setMessages] = useState([
    { id: 1, role: 'bot', text: '¡Hola! Soy Olivo 🫒, tu Consejero del olivar con el conocimiento del internet. ¿De qué provincia eres?', showProvincias: true }
  ]);
  const [step, setStep] = useState(1);
  const [provincia, setProvincia] = useState('');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [climaActual, setClimaActual] = useState(null);
  const [modoOscuro, setModoOscuro] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.getAttribute('data-theme') === 'dark';
    }
    return false;
  });
  const [currentProvider, setCurrentProvider] = useState(null);
  const messagesEndRef = useRef(null);
  const currentBotIdRef = useRef(null);

  // Initialize theme detection on mount
  useEffect(() => {
    const theme = document.documentElement.getAttribute('data-theme');
    setModoOscuro(theme === 'dark');
  }, []);

  // Listen for theme changes from ThemeToggle
  useEffect(() => {
    const handleThemeChange = (e) => {
      setModoOscuro(e.detail.modoOscuro);
    };
    window.addEventListener('modoOscuroChange', handleThemeChange);
    return () => window.removeEventListener('modoOscuroChange', handleThemeChange);
  }, []);

  // Smart scroll - only auto-scroll if user is near bottom
  useEffect(() => {
    if (!messagesEndRef.current) return;
    
    const messagesContainer = messagesEndRef.current.parentElement;
    if (!messagesContainer) return;
    
    // Check if user is near bottom (within 100px)
    const isNearBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 100;
    
    // Only auto-scroll if user is near bottom or it's the first message
    if (isNearBottom || messages.length <= 2) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
    }
  }, [messages]);

  // Dynamic colors based on theme
  const colors = modoOscuro ? {
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

  const estilos = {
    wrapper: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      background: colors.wrapperBg,
      border: `2px solid ${colors.border}`,
      borderRadius: '8px',
      overflow: 'hidden'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '14px 24px',
      background: colors.wrapperBg,
      borderBottom: `2px solid ${colors.border}`,
      flexShrink: 0,
      position: 'relative',
      zIndex: 10
    },
    avatar: {
      width: '40px',
      height: '40px',
      background: colors.text,
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      color: colors.sal
    },
    headerInfo: { flex: 1 },
    headerName: { fontWeight: 'bold', fontSize: '16px', color: colors.text },
    headerStatus: { fontSize: '13px', color: colors.muted, display: 'flex', alignItems: 'center', gap: '6px' },
    statusDot: { width: '8px', height: '8px', background: colors.accent, borderRadius: '50%', animation: 'pulse 2s infinite' },
    messages: { flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px', background: colors.sal, minHeight: 0 },
    messageRow: { display: 'flex', alignItems: 'flex-start', gap: '10px', animation: 'slideIn 0.35s ease-out' },
    messageUser: { display: 'flex', justifyContent: 'flex-end' },
    avatarSmall: { width: '32px', height: '32px', background: colors.text, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: colors.sal, flexShrink: 0 },
    bubble: { padding: '14px 18px', maxWidth: '72%', fontSize: '15px', lineHeight: 1.65 },
    bubbleBot: { background: colors.bubbleBot, border: `2px solid ${colors.border}`, borderRadius: '0 6px 6px 6px', color: colors.text },
    bubbleUser: { background: colors.bubbleUser, color: colors.sal, borderRadius: '6px 0 6px 6px', maxWidth: '72%', width: 'fit-content', wordBreak: 'break-word' },
    thinkingDots: { display: 'flex', gap: '6px' },
    thinkingDot: { width: '8px', height: '8px', background: colors.muted, borderRadius: '50%', animation: 'bounce 1.2s ease-in-out infinite' },
    typingIndicator: { display: 'flex', gap: '4px', alignItems: 'center', padding: '4px 0' },
    typingDot: { width: '7px', height: '7px', borderRadius: '50%', background: colors.muted, animation: 'typingBounce 1.2s infinite' },
    provinceGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' },
    provinceBtn: { background: colors.wrapperBg, border: `2px solid ${colors.border}`, borderRadius: '4px', padding: '5px 14px', fontSize: '12px', fontWeight: '700', color: colors.text, cursor: 'pointer', transition: 'all 0.2s ease' },
    newQBtn: { background: colors.accent, color: colors.text, border: `2px solid ${colors.border}`, borderRadius: '4px', padding: '8px 18px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s ease' },
    quickButtonsGrid: { display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' },
    quickBtn: { background: colors.sal, border: `1px solid ${colors.border}`, borderRadius: '4px', padding: '6px 12px', fontSize: '12px', color: colors.text, cursor: 'pointer', transition: 'all 0.15s ease' },
    inputArea: { padding: '16px 20px', background: colors.wrapperBg, borderTop: `2px solid ${colors.border}`, display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0, marginTop: 'auto' },
    input: { flex: 1, height: '46px', borderRadius: '4px', border: `2px solid ${colors.border}`, padding: '0 20px', fontSize: '15px', background: colors.wrapperBg, color: colors.text, outline: 'none', transition: 'border-color 0.2s ease' },
    sendBtn: { width: '46px', height: '46px', borderRadius: '4px', background: colors.accent, color: colors.text, border: `2px solid ${colors.border}`, fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }
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

    fetch(apiUrl('/api/clima'))
      .then(res => res.json())
      .then(datos => {
        console.log('[Chat] Clima data:', datos);
        const provData = datos.find((p) => p.provincia === provNombre);
        if (provData) setClimaActual(provData);
      })
      .catch((e) => console.error('[Chat] Error fetching clima:', e));

    setTimeout(() => {
      setMessages(prev => prev.map(m => 
        m.isThinking 
          ? { ...m, isThinking: false, text: `Perfecto, conozco muy bien ${provNombre} 🌿 ¿Qué quieres saber hoy sobre tu olivar?`, showQuickButtons: true }
          : m
      ));
      setStep(2);
    }, 800);
  };

  const enviarPregunta = async () => {
    if (!input.trim() || isLoading) return;

    const pregunta = input.trim();
    const botId = Date.now();
    currentBotIdRef.current = botId;

    setInput('');
    setMessages(prev => [
      ...prev,
      { id: botId - 1, role: 'user', text: pregunta },
      { id: botId, role: 'bot', text: '', isThinking: true, isWaiting: true }
    ]);
    setStep(3);
    setIsLoading(true);
    setIsWaiting(true);

    try {
      const res = await fetch(apiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: pregunta, provincia })
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
            break;
          }

          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(6));
              const chunk = json.texto || '';
              // Capture provider from first chunk
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
    } finally {
      setIsLoading(false);
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
    if (!provincia || !climaActual) return;
    let pregunta = '';
    if (tipo === 'regar') pregunta = `¿Debo regar hoy en ${provincia} con ${climaActual.temperatura}°C y riesgo ${climaActual.riesgo}?`;
    else if (tipo === 'clima') pregunta = `¿Cómo afecta el clima actual (${climaActual.temperatura}°C, riesgo ${climaActual.riesgo}) a los olivares en ${provincia}?`;
    else if (tipo === 'semana') pregunta = `¿Qué debo hacer esta semana en mis olivares de ${provincia} considerando que hay ${climaActual.temperatura}°C y riesgo ${climaActual.riesgo}?`;
    setInput(pregunta);
    enviarPregunta();
  };

  return (
    <div style={estilos.wrapper}>
      <style>{`
        @keyframes pulse { 
          0%, 100% { opacity: 1; transform: scale(1); } 
          50% { opacity: 0.7; transform: scale(0.95); } 
        }
        @keyframes bounce { 
          0%, 100% { transform: translateY(0); opacity: 0.5; } 
          50% { transform: translateY(-4px); opacity: 1; } 
        }
        @keyframes typingBounce { 
          0%, 60%, 100% { transform: translateY(0); } 
          30% { transform: translateY(-5px); } 
        }
        @keyframes slideIn { 
          from { opacity: 0; transform: translateY(8px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        .typing-indicator { display: flex; gap: 4px; align-items: center; padding: 4px 2px; }
        .typing-indicator span { width: 7px; height: 7px; border-radius: 50%; background: var(--color-aceituna); animation: bounce 1.2s infinite; }
        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
          .typing-indicator span { animation: none !important; }
        }
      `}</style>

      <div style={estilos.header}>
        <div style={estilos.avatar}>🫒</div>
        <div style={estilos.headerInfo}>
          <div style={estilos.headerName}>Olivo</div>
          <div style={estilos.headerStatus}>
            {currentProvider ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={estilos.statusDot}></span>
                Powered by {currentProvider}
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={estilos.statusDot}></span>
                Consejero del olivar
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={estilos.messages} ref={messagesEndRef}>
        {messages.map(msg => (
          <div 
            key={msg.id} 
            style={{
              ...estilos.messageRow,
              ...(msg.role === 'user' ? estilos.messageUser : {})
            }}
          >
            {msg.role === 'bot' && <div style={estilos.avatarSmall}>🫒</div>}
            {msg.role === 'bot' ? (
              <div>
                <div style={{
                  ...estilos.bubble,
                  ...estilos.bubbleBot
                }}>
                  {msg.isWaiting ? (
                    <div className="typing-indicator">
                      <span></span><span></span><span></span>
                    </div>
                  ) : msg.isThinking ? (
                    <span style={estilos.thinkingDots}>
                      <span style={{...estilos.thinkingDot, animationDelay: '0s'}}></span>
                      <span style={{...estilos.thinkingDot, animationDelay: '0.4s'}}></span>
                      <span style={{...estilos.thinkingDot, animationDelay: '0.8s'}}></span>
                    </span>
                  ) : (
                    <span dangerouslySetInnerHTML={{ __html: formatText(msg.text) }} />
                  )}
                  
                  {msg.showProvincias && (
                    <div style={estilos.provinceGrid}>
                      {PROVINCIAS.map(p => (
                        <button
                          key={p.nombre}
                          style={estilos.provinceBtn}
                          onClick={() => seleccionarProvincia(p)}
                        >
                          {p.nombre} {p.emoji}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {msg.showNewQ && (
                    <div style={{ marginTop: '12px' }}>
                      <button
                        style={estilos.newQBtn}
                        onClick={nuevaPregunta}
                      >
                        Nueva pregunta →
                      </button>
                    </div>
                  )}
                  
                  {msg.showQuickButtons && (
                    <div style={estilos.quickButtonsGrid}>
                      <button style={estilos.quickBtn} onClick={() => enviarPreguntaQuick('regar')}>💧 ¿Debo regar hoy?</button>
                      <button style={estilos.quickBtn} onClick={() => enviarPreguntaQuick('clima')}>🌡️ ¿Cómo afecta este clima?</button>
                      <button style={estilos.quickBtn} onClick={() => enviarPreguntaQuick('semana')}>📅 ¿Qué hago esta semana?</button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{
                ...estilos.bubble,
                ...estilos.bubbleUser
              }}>
                <span>{msg.text}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={estilos.inputArea}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={step === 1 ? "Selecciona tu provincia arriba" : "Escribe tu pregunta..."}
          disabled={isLoading || step === 1}
          style={{
            ...estilos.input,
            opacity: (isLoading || step === 1) ? 0.6 : 1,
            cursor: (isLoading || step === 1) ? 'not-allowed' : 'text'
          }}
        />
        <button
          onClick={enviarPregunta}
          disabled={isLoading || !input.trim() || step === 1}
          style={{
            ...estilos.sendBtn,
            opacity: (isLoading || !input.trim() || step === 1) ? 0.5 : 1,
            cursor: (isLoading || !input.trim() || step === 1) ? 'not-allowed' : 'pointer'
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}