import { createSignal, onMount, onCleanup, For, Show } from 'solid-js';
import { apiUrl } from '../lib/api';

const PROVINCIAS = ['Jaén', 'Córdoba', 'Sevilla', 'Granada', 'Málaga', 'Badajoz', 'Toledo', 'Ciudad Real', 'Almería', 'Huelva'];

const SKILLS = [
  { id: 'libre', label: '💬 Libre', condition: 'conversación general', color: '#f5efe8' },
  { id: 'calor', label: '🔥 Calor', condition: 'altas temperaturas', color: '#FFE4D6' },
  { id: 'drought', label: '🏜️ Sequía', condition: 'estrés hídrico', color: '#FFF3E0' },
  { id: 'frio', label: '❄️ Frío', condition: 'bajas temperaturas', color: '#E3F2FD' },
  { id: 'humedad', label: '💧 Humedad', condition: 'exceso de humedad', color: '#ECEFF1' },
  { id: 'plagas', label: '🐛 Plagas', condition: 'control de plagas', color: '#E8F5E9' },
  { id: 'fenologia', label: '🌱 Fenología', condition: 'ciclo del olivo', color: '#F3E5F5' },
];

const SKILL_PROMPTS = {
  drought: 'Eres un experto en gestión del estrés hídrico en olivares. Enfoca tus respuestas en técnicas de riego, cubiertas vegetales, y manejo del suelo para conservar agua.',
  calor: 'Eres un experto en protección térmica de olivares. Enfoca tus respuestas en estrategias de sombreo, riego temprano, y protección contra olas de calor extremas.',
  frio: 'Eres un experto en protección contra heladas en olivares. Enfoca tus respuestas en técnicas de protección, momento de poda, prevención de daños por frío.',
  humedad: 'Eres un experto en enfermedades fúngicas del olivo. Enfoca tus respuestas en repilo, aceituna jabonosa, control de humedad, y tratamientos preventivos.',
  plaga: 'Eres un experto en control de plagas del olivo. Enfoca tus respuestas en mosca, polilla, tuberculosis, y control integrado de plagas.',
  fenologia: 'Eres un experto en fenología del olivo. Enfoca tus respuestas en las fases del ciclo: brotación, floración, cuaje, endurecimiento del hueso, envero, recolección.',
};

const formatText = (text) => text?.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') || '';

const getInitialProvincia = () => {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem('olivaxi_provincia') || (localStorage.getItem('olivaxi_variedad') ? 'Jaén' : '');
  } catch { return ''; }
};

export default function ChatConsejero() {
  const [messages, setMessages] = createSignal([]);
  const [provincia, setProvincia] = createSignal(getInitialProvincia());
  const [input, setInput] = createSignal('');
  const [isLoading, setIsLoading] = createSignal(false);
  const [climaActual, setClimaActual] = createSignal(null);
  const [activeSkill, setActiveSkill] = createSignal(null);
  const [showLoading, setShowLoading] = createSignal(true);
  const [titleText, setTitleText] = createSignal('');
  const [showModeDropdown, setShowModeDropdown] = createSignal(false);
  const [showCleanMenu, setShowCleanMenu] = createSignal(false);
  
  let messagesEndRef;

  const getProvinciaFromStorage = () => {
    try {
      return localStorage.getItem('olivaxi_provincia') || (localStorage.getItem('olivaxi_variedad') ? 'Jaén' : null);
    } catch { return null; }
  };

  const getSkillColor = (skillId) => SKILLS.find(s => s.id === skillId)?.color || '#f5efe8';

  const initChat = async () => {
    setTimeout(() => setShowLoading(false), 1500);
    const savedProv = getProvinciaFromStorage();
    if (savedProv) {
      setProvincia(savedProv);
      try {
        const data = await getClimaData(true); // Forzar refresh en init
        const provData = data.find((p) => p.provincia === savedProv);
        if (provData) setClimaActual(provData);
      } catch {}
    }
  };

  const seleccionarProvincia = async (prov) => {
    setProvincia(prov);
    try {
      const data = await getClimaData();
      const provData = data.find((p) => p.provincia === prov);
      if (provData) setClimaActual(provData);
    } catch {}
  };

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      messagesEndRef?.parentElement?.scrollTo({ top: messagesEndRef.parentElement.scrollHeight, behavior: 'smooth' });
    });
  };

  onMount(() => {
    initChat();
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.mode-pill-inline')) setShowModeDropdown(false);
      if (!e.target.closest('.clean-btn-wrapper')) setShowCleanMenu(false);
    });
    // Escuchar cambios de estado desde otras páginas
    window.addEventListener('olivaxi-state-change', (e) => {
      const { provincia, variedad } = e.detail;
      if (provincia && provincia !== provincia()) {
        seleccionarProvincia(provincia);
      }
    });
    const interval = setInterval(() => {
      const prov = getProvinciaFromStorage();
      if (prov && prov !== provincia()) seleccionarProvincia(prov);
    }, 1000);
    onCleanup(() => clearInterval(interval));
  });

  const handleProvinciaInput = async (text) => {
    const provMatch = PROVINCIAS.find(p => text.toLowerCase().includes(p.toLowerCase()));
    if (provMatch) {
      await seleccionarProvincia(provMatch);
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'bot', text: `Perfecto, tengo información de ${provMatch}.` }]);
      scrollToBottom();
      return true;
    }
    return false;
  };

  const isAtLimit = () => messages().filter(m => m.role === 'bot' && !m.isWaiting).length >= 20;

  const getHistorial = () => {
    try {
      const hist = localStorage.getItem('olivaxi_chat_historial');
      return hist ? JSON.parse(hist) : [];
    } catch { return []; }
  };

  const saveHistorial = (msgs) => {
    const userMsgs = msgs.filter(m => m.role === 'user').map(m => m.text).slice(-3);
    try { localStorage.setItem('olivaxi_chat_historial', JSON.stringify(userMsgs)); } catch {}
  };

  const getVariedad = () => {
    try { return localStorage.getItem('olivaxi_variedad') || ''; } catch { return ''; }
  };

  // Cache en memoria para clima (evita llamadas innecesarias a Open-Meteo)
  let climaCache = null;
  let climaCacheTime = 0;
  const CLIMA_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  const getClimaData = async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && climaCache && now - climaCacheTime < CLIMA_CACHE_TTL) {
      return climaCache;
    }
    try {
      const res = await fetch(apiUrl('/api/clima'));
      const data = await res.json();
      climaCache = data;
      climaCacheTime = now;
      return data;
    } catch { return climaCache || []; }
  };

  const enviarPregunta = async () => {
    const text = input().trim();
    if (!text || isLoading() || isAtLimit()) return;

    const pregunta = text;
    const botId = Date.now();

    setInput('');
    const newMessages = [...messages(), { id: botId - 1, role: 'user', text: pregunta }, { id: botId, role: 'bot', text: '', isWaiting: true }];
    setMessages(newMessages);
    saveHistorial(newMessages);
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
      const historial = getHistorial();
      const variedad = getVariedad();
      const res = await fetch(apiUrl('/api/chat'), { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ mensaje: pregunta, provincia: provincia(), skill: activeSkill(), systemPrompt: skillPrompt, historial, variedad }) 
      });
      
      if (!res.ok) throw new Error('API error');
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith('data: [DONE]')) {
            setIsLoading(false);
            setMessages(prev => prev.map(m => m.id === botId ? { ...m, text: fullResponse, isWaiting: false } : m));
            scrollToBottom();
            return;
          }
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(6));
              if (json.texto) {
                fullResponse += json.texto;
                setMessages(prev => prev.map(m => m.id === botId ? { ...m, text: fullResponse, isWaiting: false } : m));
                scrollToBottom();
              }
              if (json.error) throw new Error(json.error);
            } catch {}
          }
        }
      }
    } catch (e) { 
      console.error('Chat error:', e);
      setMessages(prev => prev.map(m => m.id === botId ? { ...m, isWaiting: false, text: 'Lo siento, hubo un error. Intenta de nuevo.' } : m)); 
      setIsLoading(false);
    }
  };

  const selectSkill = (skillId) => {
    setActiveSkill(activeSkill() === skillId ? null : skillId);
    if (activeSkill()) {
      const skill = SKILLS.find(s => s.id === activeSkill());
      if (skill) setTitleText(`En qué te puedo ayudar... ${skill.condition}`);
    }
  };

  const nuevoChat = () => {
    setMessages([]);
    setInput('');
    setActiveSkill(null);
    setTitleText('');
    setIsLoading(false);
    try { localStorage.removeItem('olivaxi_chat_historial'); } catch {}
  };

  const descargarChat = () => {
    const chatContent = messages().map(m => `${m.role === 'user' ? 'Tú' : 'Olivo'}:\n${m.text}\n`).join('\n');
    const blob = new Blob([chatContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `olivaxi-chat-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div class="chat-container" style={{ background: activeSkill() ? getSkillColor(activeSkill()) : '#f5efe8' }}>
      <style>{`
        .chat-container { width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #f5efe8; padding: 16px 24px; box-sizing: border-box; overflow: hidden; }
        .chat-hero { text-align: center; margin-bottom: 18px; flex-shrink: 0; width: 100%; max-width: 1200px; }
        .chat-hero h1 { font-family: 'Playfair Display', Georgia, serif; font-weight: 800; font-size: 50px; color: #000; margin: 0; }
        .title-typewriter { font-family: 'Playfair Display', Georgia, serif; font-weight: 800; font-size: 40px; color: #000; min-height: 50px; }
        .chat-with-input { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
        .input-area { flex-shrink: 0; padding: 20px 24px; background: inherit; display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 1200px; box-sizing: border-box; min-height: 110px; }
        .mode-pill-inline { position: relative; display: inline-flex; align-items: center; flex-shrink: 0; }
        .mode-pill-button { padding: 10px 18px; font-size: 14px; border: 2px solid #1C1C1C; border-radius: 24px; background: #D4E849; color: #1C1C1C; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px; white-space: nowrap; }
        .mode-pill-inline.expanded .mode-pill-button { background: #1C1C1C; color: #D4E849; }
        .mode-pill-dropdown { position: absolute; bottom: 100%; left: 0; margin-bottom: 8px; background: #fff; border: 2px solid #1C1C1C; border-radius: 12px; box-shadow: 0 -4px 12px rgba(0,0,0,0.15); display: none; min-width: 240px; z-index: 100; overflow: hidden; }
        .mode-pill-dropdown.show { display: block; }
        .mode-option { padding: 12px 16px; font-size: 14px; color: #1C1C1C; cursor: pointer; border-bottom: 1px solid #eee; }
        .mode-option:last-child { border-bottom: none; }
        .mode-option:hover { background: #D4E849; }
        .chat-messages { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; width: 100%; max-width: 1200px; padding: 0 24px; box-sizing: border-box; min-height: 0; background: inherit; scroll-behavior: smooth; }
        .province-select-card { max-width: 280px; margin: 0 auto 4px; background: #fff; border-radius: 10px; padding: 8px 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.04); }
        .province-dropdown { width: 100%; padding: 8px 12px; font-size: 14px; border: 1px solid #e0e0e0; border-radius: 12px; background: #fff; color: #333; cursor: pointer; outline: none; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 16px center; }
        .skills-card { max-width: 950px; margin: 0 auto 4px; background: #fff; border-radius: 10px; padding: 16px 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.04); flex-shrink: 0; min-height: 100px; }
        .skills-grid { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
        .skill-btn { padding: 8px 16px; border-radius: 20px; border: 2px solid #1C1C1C; background: #D4E849; color: #1C1C1C; font-size: 13px; font-weight: 600; cursor: pointer; }
        .msg-row { display: flex; align-items: flex-start; gap: 6px; width: 100%; }
        .msg-row.user { justify-content: flex-end; }
        .msg-row.bot { justify-content: flex-start; }
        .msg-bubble { padding: 12px 20px; max-width: 95%; font-size: 15px; line-height: 1.5; }
        .msg-bubble.bot { background: #fff; border-radius: 4px 16px 16px 16px; color: #1C1C1C; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .msg-bubble.user { background: #1C1C1C; color: #F7F4EE; border-radius: 16px 4px 16px 16px; width: fit-content; word-break: break-word; }
        .typing-dots { display: flex; gap: 6px; padding: 4px 0; }
        .typing-dots span { width: 8px; height: 8px; background: #999; border-radius: 50%; animation: bounce 1.2s ease-in-out infinite; }
        .typing-dots .dot2 { animation-delay: 0.2s; }
        .typing-dots .dot3 { animation-delay: 0.4s; }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .limit-message { background: #fff; border-radius: 12px; padding: 16px 20px; text-align: center; color: #666; font-weight: 500; max-width: 700px; margin: 0 auto; }
        .limit-btn { background: #1C1C1C; border: none; border-radius: 8px; padding: 10px 20px; color: #F7F4EE; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 8px; margin: 12px auto 0; }
        .chat-input-wrapper { max-width: 100%; width: 100%; margin: 0; padding: 8px 16px; background: #fff; border-radius: 16px; border: 2px solid #1C1C1C; box-shadow: 0 2px 8px rgba(0,0,0,0.08); box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 70px; }
        .input-left { display: flex; align-items: center; gap: 10px; flex: 1; }
        .clean-btn { background: #f5efe8; border: 2px solid #1C1C1C; border-radius: 12px; padding: 8px 12px; font-size: 18px; cursor: pointer; flex-shrink: 0; }
        .clean-menu { position: absolute; bottom: 100%; right: 0; margin-bottom: 8px; background: #fff; border: 2px solid #1C1C1C; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: none; min-width: 180px; z-index: 100; overflow: hidden; }
        .clean-menu.show { display: block; }
        .clean-option { padding: 10px 14px; font-size: 13px; color: #1C1C1C; cursor: pointer; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 8px; }
        .clean-option:hover { background: #D4E849; }
        .clean-btn-wrapper { position: relative; display: inline-flex; }
        .chat-input { flex: 1; height: 36px; border: none; background: transparent; font-size: 16px; color: #1C1C1C; outline: none; padding: 0; }
        .chat-input::placeholder { color: #999; }
        .chat-input:disabled { opacity: 0.6; }
        .loading-screen { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #F7F4EE; z-index: 100; }
        .loading-olive { font-size: 4rem; margin-bottom: 1rem; animation: float 2s ease-in-out infinite; }
        .loading-text { font-size: 1.5rem; font-weight: 600; color: #1C1C1C; }
        .loading-subtext { font-size: 0.875rem; color: #4a4a40; margin-top: 0.5rem; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
      `}</style>

      <Show when={showLoading()}>
        <div class="loading-screen">
          <div class="loading-olive">🌿</div>
          <div class="loading-text">Hola, soy Olivaxi</div>
          <div class="loading-subtext">Cargando tu asesor agrícola...</div>
        </div>
      </Show>

      <Show when={!showLoading()}>
        <div class="chat-hero">
          <Show when={!activeSkill()} fallback={<div class="title-typewriter">{titleText()}</div>}>
            <h1>¿Qué modo quieres usar?</h1>
          </Show>
        </div>

        <Show when={!provincia()}>
          <div class="province-select-card">
            <select class="province-dropdown" value="" onChange={(e) => seleccionarProvincia(e.target.value)}>
              <option value="" disabled>Selecciona tu provincia</option>
              <For each={PROVINCIAS}>{(prov) => <option value={prov}>{prov}</option>}</For>
            </select>
          </div>
        </Show>

        <Show when={provincia() && !activeSkill()}>
          <div class="skills-card">
            <div class="skills-grid">
              <For each={SKILLS}>{(skill) => (
                <button class="skill-btn" onClick={() => selectSkill(skill.id)}>{skill.label}</button>
              )}</For>
            </div>
          </div>
        </Show>

        <Show when={provincia() && activeSkill()}>
          <div class="chat-with-input">
            <div class="chat-messages">
              <For each={messages()}>{(msg) => (
                <div class="msg-row">
                  <Show when={msg.role === 'bot'} fallback={<div class="msg-bubble user">{msg.text}</div>}>
                    <div class="msg-bubble bot">
                      <Show when={msg.isWaiting}>
                        <div class="typing-dots"><span class="dot1"></span><span class="dot2"></span><span class="dot3"></span></div>
                      </Show>
                      <Show when={!msg.isWaiting}>
                        <span innerHTML={formatText(msg.text)}></span>
                      </Show>
                    </div>
                  </Show>
                </div>
              )}</For>
              
              <Show when={isAtLimit() && !isLoading()}>
                <div class="limit-message">
                  <span>Llegaste al límite de memoria 🧹</span>
                  <button class="limit-btn" onClick={() => { setMessages([]); setIsLoading(false); }}>🤖🧹 Limpiar chat</button>
                </div>
              </Show>
              
              <div ref={messagesEndRef}></div>
            </div>

            <div class="input-area">
              <div class="chat-input-wrapper">
                <div class="input-left">
                  <div class={`mode-pill-inline ${showModeDropdown() ? 'expanded' : ''}`}>
                    <button class="mode-pill-button" onClick={() => setShowModeDropdown(!showModeDropdown())}>
                      {showModeDropdown() ? '🎯 Elegir modo' : (activeSkill() ? SKILLS.find(s => s.id === activeSkill())?.label : '🎯 Elegir')}
                    </button>
                    <div class={`mode-pill-dropdown ${showModeDropdown() ? 'show' : ''}`}>
                      <For each={SKILLS}>{(skill) => (
                        <div class="mode-option" onClick={() => { selectSkill(skill.id); setShowModeDropdown(false); }}>
                          {skill.label} - {skill.condition}
                        </div>
                      )}</For>
                    </div>
                  </div>
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
                <div class="clean-btn-wrapper">
                  <button class="clean-btn" onClick={() => isAtLimit() ? setShowCleanMenu(!showCleanMenu()) : setShowCleanMenu(true)}>
                    {isAtLimit() ? '🧹' : '💾'}
                  </button>
                  <div class={`clean-menu ${showCleanMenu() ? 'show' : ''}`}>
                    <div class="clean-option" onClick={() => { descargarChat(); setShowCleanMenu(false); }}>📥 Descargar chat</div>
                    <Show when={isAtLimit()}>
                      <div class="clean-option" onClick={() => { nuevoChat(); setShowCleanMenu(false); }}>✨ Nuevo chat</div>
                    </Show>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Show>
      </Show>
    </div>
  );
}