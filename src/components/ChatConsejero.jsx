import { createSignal, createEffect, onMount, onCleanup, For, Show } from 'solid-js';
import { apiUrl } from '../lib/api';
import OlivaxiEcosistema, { PROVINCIAS } from '../lib/ecosistema';

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
  plagas: 'Eres un experto en control de plagas del olivo. Enfoca tus respuestas en mosca, polilla, tuberculosis, y control integrado de plagas.',
  fenologia: 'Eres un experto en fenología del olivo. Enfoca tus respuestas en las fases del ciclo: brotación, floración, cuaje, endurecimiento del hueso, envero, recolección.',
};

const modoColores = {
  libre:     { border: '#97c459', dot: '#639922' },
  calor:     { border: '#ef9f27', dot: '#ba7517' },
  drought:   { border: '#d85a30', dot: '#993c1d' },
  frio:      { border: '#378add', dot: '#185fa5' },
  humedad:   { border: '#5dcaa5', dot: '#0f6e56' },
  plagas:    { border: '#e24b4a', dot: '#a32d2d' },
  fenologia: { border: '#7f77dd', dot: '#534ab7' }
};

const modoAvatares = {
  libre:     '🌿',
  calor:     '🌡️',
  drought:   '🏜️',
  frio:      '❄️',
  humedad:   '💧',
  plagas:    '🦟',
  fenologia: '🌸'
};

const modoIntro = {
  libre:     'Puedo ayudarte con cualquier aspecto de tu olivar.',
  calor:     'Estoy enfocado en proteger tu olivar del calor.',
  drought:   'Estoy enfocado en gestionar el estrés hídrico.',
  frio:      'Estoy enfocado en proteger tus olivos del frío.',
  humedad:   'Estoy enfocado en el control de humedad y riego.',
  plagas:    'Estoy enfocado en el estado fitosanitario de tu zona.',
  fenologia: 'Estoy enfocado en el ciclo fenológico actual.'
};

const formatText = (text) => {
  if (!text) return '';
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
};

export default function ChatConsejero() {
  const [messages, setMessages] = createSignal([]);
  const [provincia, setProvincia] = createSignal(OlivaxiEcosistema.provincia || (OlivaxiEcosistema.variedad ? 'Jaén' : ''));
  const [variedad, setVariedad] = createSignal(OlivaxiEcosistema.variedad || '');
  const [input, setInput] = createSignal('');
  const [isLoading, setIsLoading] = createSignal(false);
  const [climaActual, setClimaActual] = createSignal(null);
  const [activeSkill, setActiveSkill] = createSignal(null);
  const [titleText, setTitleText] = createSignal('');
  const [showContext, setShowContext] = createSignal(false);
  const [showLoading, setShowLoading] = createSignal(false);
  const [showProvinceDropdown, setShowProvinceDropdown] = createSignal(false);
  const [showModeDropdown, setShowModeDropdown] = createSignal(false);
  const [showCleanMenu, setShowCleanMenu] = createSignal(false);
  const [showWelcome, setShowWelcome] = createSignal(true);
  
  let messagesEndRef;

  const generateWelcomeMessage = () => {
    const prov = provincia();
    const clima = climaActual();
    
    if (!prov) {
      return 'Selecciona tu provincia arriba para que pueda darte consejos personalizados.';
    }
    
    const temp = clima?.temperatura ?? '—';
    const tipoSuelo = clima?.tipoSuelo || 'suelo';
    const riesgos = clima?.riesgosActivos || [];
    const riesgoNivel = clima?.riesgo || 'bajo';
    
    let pestInfo = '';
    if (clima?.plagas) {
      const entries = Object.entries(clima.plagas);
      const alta = entries.find(([k, v]) => v?.nivel === 'alto');
      if (alta) pestInfo = `, ${alta[0]} en nivel alto`;
      else {
        const media = entries.find(([k, v]) => v?.nivel === 'medio');
        if (media) pestInfo = `, ${media[0]} en nivel medio`;
      }
    }
    
    let sueloInfo = '';
    if (clima?.suelo_humedad !== undefined) {
      const hum = clima.suelo_humedad <= 1 ? Math.round(clima.suelo_humedad * 100) : clima.suelo_humedad;
      if (hum < 30) sueloInfo = 'suelo seco';
      else if (hum > 70) sueloInfo = 'suelo húmedo';
      else sueloInfo = tipoSuelo;
    } else {
      sueloInfo = tipoSuelo;
    }
    
    let msg = `He cargado los datos de ${prov}: ${temp}°C, ${sueloInfo}`;
    if (pestInfo) msg += pestInfo;
    if (riesgoNivel === 'alto') msg += ', riesgo alto';
    else if (riesgoNivel === 'medio') msg += ', riesgo medio';
    msg += '.';
    
    return msg;
  };

  const quickQuestions = [
    '¿Debo regar hoy?',
    '¿Qué plagas vigilar?',
    'Consejos para este clima'
  ];

  const sendQuickQuestion = (question) => {
    setShowWelcome(false);
    enviarPregunta(question);
  };

  const getContextStrip = () => {
    const clima = climaActual();
    const prov = provincia();
    if (!prov) {
      return { text: '📍 Selecciona tu provincia para personalizar el consejo', level: 'none', html: null };
    }
    
    const temp = clima?.temperatura ?? '—';
    const tipoSuelo = clima?.tipoSuelo ? `${clima.tipoSuelo}` : '';
    const riesgos = clima?.riesgosActivos || [];
    const riesgoNivel = clima?.riesgo || 'bajo';
    
    let pest = '';
    if (clima?.plagas) {
      const entries = Object.entries(clima.plagas);
      const alta = entries.find(([k, v]) => v?.nivel === 'alto');
      if (alta) pest = `· ${alta[0]} activa`;
      else {
        const media = entries.find(([k, v]) => v?.nivel === 'medio');
        if (media) pest = `· ${media[0]} media`;
      }
    }
    
    let sueloInfo = '';
    if (clima?.suelo_humedad !== undefined) {
      const hum = clima.suelo_humedad <= 1 ? Math.round(clima.suelo_humedad * 100) : clima.suelo_humedad;
      if (hum < 30) sueloInfo = '· Suelo seco';
      else if (hum > 70) sueloInfo = '· Suelo húmedo';
    }
    
    const parts = [`${prov}`, `${temp}°C`, pest, sueloInfo].filter(p => p);
    const text = parts.join(' · ');
    
    return { text, level: riesgoNivel, html: text };
  };

  const toChatClima = (d) => d?.ok ? ({
    provincia: d.provincia,
    temperatura: d.clima?.temperatura,
    humedad: d.clima?.humedad,
    lluvia: d.clima?.lluvia,
    estado: d.clima?.estado,
    suelo_temp: d.suelo?.temperatura,
    suelo_humedad: d.suelo?.humedad,
    evapotranspiracion: d.suelo?.evapotranspiracion,
    necesidadRiego: d.sueloAnalitica?.necesidadRiego,
    deficitRiego: d.sueloAnalitica?.deficitRiego,
    tipoSuelo: d.provinciaInfo?.tipoSuelo,
    altitud: d.provinciaInfo?.altitud,
    pluviometriaAnual: d.provinciaInfo?.pluviometriaAnual,
    variedadPredominante: d.provinciaInfo?.variedadPredominante,
    plagas: d.plagas || {},
    riesgosActivos: d.riesgosActivos || [],
    riesgo: d.clima?.riesgo || 'bajo',
  }) : null;

  const initChat = async () => {
    const savedProv = OlivaxiEcosistema.provincia;
    const savedVar = OlivaxiEcosistema.variedad;
    if (savedProv) {
      setProvincia(savedProv);
      try {
        const d = await OlivaxiEcosistema.fetchDashboard();
        const provData = toChatClima(d);
        if (provData) setClimaActual(provData);
      } catch (e) {
        console.warn('[ChatConsejero] initChat dashboard error:', e);
      }
    }
    if (savedVar) setVariedad(savedVar);
  };

  const seleccionarProvincia = async (prov) => {
    setProvincia(prov);
    OlivaxiEcosistema.setProvincia(prov);
    try {
      const d = await OlivaxiEcosistema.fetchDashboard();
      const provData = toChatClima(d);
      if (provData) setClimaActual(provData);
    } catch (e) {
      console.warn('[ChatConsejero] seleccionarProvincia error:', e);
    }
  };

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      messagesEndRef?.parentElement?.scrollTo({ top: messagesEndRef.parentElement.scrollHeight, behavior: 'smooth' });
    });
  };

  onMount(() => {
    initChat();
    const handleDocClick = (e) => {
      if (!e.target.closest('.prov-dropdown-wrap')) setShowProvinceDropdown(false);
      if (!e.target.closest('.mode-pill-inline')) setShowModeDropdown(false);
      if (!e.target.closest('.clean-btn-wrapper')) setShowCleanMenu(false);
    };
    document.addEventListener('click', handleDocClick);
    // Escuchar cambios de estado (provincia y variedad) desde cualquier página
    const offEcosistema = OlivaxiEcosistema.onChange((state) => {
      if (state.provincia && state.provincia !== provincia()) seleccionarProvincia(state.provincia);
      if (state.variedad && state.variedad !== variedad()) setVariedad(state.variedad);
    });
    // Auto-enviar pregunta desde URL
    const params = new URLSearchParams(window.location.search);
    const autoPregunta = params.get('q')?.trim();
    if (autoPregunta) {
      const sendAutoQuestion = async () => {
        const provEcosistema = OlivaxiEcosistema.provincia || provincia();
        if (provEcosistema) {
          if (provEcosistema !== provincia()) await seleccionarProvincia(provEcosistema);
          setActiveSkill('libre');
          await new Promise(r => setTimeout(r, 80));
          await enviarPregunta(autoPregunta);
        } else {
          setInput(autoPregunta);
        }
      };
      // Evita re-disparar la misma pregunta al refrescar.
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(sendAutoQuestion, 250);
    }
    onCleanup(() => {
      document.removeEventListener('click', handleDocClick);
      offEcosistema();
    });
  });

  createEffect(() => {
    provincia();
    climaActual();
    if (messages().length === 0) {
      setShowWelcome(true);
    }
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
    } catch (e) {
      console.warn('[ChatConsejero] historial inválido:', e);
      return [];
    }
  };

  const saveHistorial = (msgs) => {
      const userMsgs = msgs.filter(m => m.role === 'user').map(m => m.text).slice(-3);
    try {
      localStorage.setItem('olivaxi_chat_historial', JSON.stringify(userMsgs));
    } catch (e) {
      console.warn('[ChatConsejero] no se pudo guardar historial:', e);
    }
  };

  // getClimaData now uses the ecosistema shared cache
  const getClimaData = async () => {
    return await OlivaxiEcosistema.fetchClima();
  };

  const enviarPregunta = async (forcedText = '') => {
    const text = (forcedText || input()).trim();
    if (!text || isLoading() || isAtLimit()) return;

    setShowWelcome(false);
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
      const res = await fetch(apiUrl('/api/chat'), { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ mensaje: pregunta, provincia: provincia(), skill: activeSkill(), systemPrompt: skillPrompt, historial, variedad: variedad() }) 
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
            } catch (e) {
              console.warn('[ChatConsejero] SSE chunk inválido:', e);
            }
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
    const nextSkill = activeSkill() === skillId ? null : skillId;
    setActiveSkill(nextSkill);
  };

  const nuevoChat = () => {
    setMessages([]);
    setInput('');
    setActiveSkill(null);
    setIsLoading(false);
    try {
      localStorage.removeItem('olivaxi_chat_historial');
    } catch (e) {
      console.warn('[ChatConsejero] no se pudo limpiar historial:', e);
    }
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

  const contextStrip = () => getContextStrip();

  return (
    <div class="chat-container" style={{ background: '#f5f0e8' }}>
      <style>{`
        .chat-container { width: 100%; height: 100%; display: flex; flex-direction: column; background: #f5f0e8; padding: 0; box-sizing: border-box; overflow: hidden; }
        .chat-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; max-width: 900px; margin: 0 auto; width: 100%; padding: 12px 16px; }
        
        /* Context Strip */
        .context-strip { padding: 10px 16px; border-radius: 10px; font-size: 13px; font-weight: 600; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; flex-shrink: 0; }
        .context-strip.high { background: #fcebeb; border: 1.5px solid #f09595; color: #991b1b; }
        .context-strip.medium { background: #faeeda; border: 1.5px solid #fac775; color: #92400e; }
        .context-strip.none { background: #f5f0e8; border: 0.5px solid #ccc; color: #666; }
        .context-strip-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .prov-change-btn { background: transparent; border: none; color: inherit; font-size: 12px; font-weight: 600; cursor: pointer; text-decoration: underline; padding: 4px 8px; white-space: nowrap; }
        .prov-change-btn:hover { opacity: 0.8; }
        
        /* Province Dropdown inline */
        .prov-dropdown-wrap { position: relative; }
        .prov-dropdown-inline { position: absolute; top: 100%; left: 0; margin-top: 6px; background: #fff; border: 1px solid #ccc; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.12); display: none; z-index: 50; max-height: 250px; overflow-y: auto; }
        .prov-dropdown-inline.show { display: block; }
        .prov-option { padding: 10px 14px; font-size: 13px; cursor: pointer; border-bottom: 1px solid #eee; }
        .prov-option:hover { background: #eaf3de; }
        .prov-option:last-child { border-bottom: none; }

        /* Skills Pills */
        .skills-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; flex-shrink: 0; }
        .skill-pill { padding: 8px 16px; border-radius: 20px; border: 0.5px solid #ccc; background: #f5f0e8; color: #666; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; }
        .skill-pill:hover { border-color: #3b6d11; color: #3b6d11; }
        .skill-pill.active { background: #3b6d11; border-color: #3b6d11; color: #eaf3de; }

        /* Messages */
        .chat-messages { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding: 8px 0; min-height: 0; scroll-behavior: smooth; }
        .msg-row { display: flex; align-items: flex-start; gap: 8px; width: 100%; }
        .msg-row.user { justify-content: flex-end; }
        .msg-row.bot { justify-content: flex-start; }
        .msg-bubble { padding: 12px 16px; max-width: 85%; font-size: 14px; line-height: 1.5; word-break: break-word; }
        .msg-bubble.user { background: #3b6d11; color: #eaf3de; border-radius: 12px 12px 2px 12px; }
        .msg-bubble.bot { background: #fff; border: 0.5px solid #e0e0e0; border-radius: 12px 12px 12px 2px; color: #1C1C1C; }
        .typing-dots { display: flex; gap: 5px; padding: 8px 0; }
        .typing-dots span { width: 6px; height: 6px; background: #999; border-radius: 50%; animation: bounce 1s ease-in-out infinite; }
        .typing-dots .dot2 { animation-delay: 0.15s; }
        .typing-dots .dot3 { animation-delay: 0.3s; }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }

        /* Input Area */
        .input-row { flex-shrink: 0; display: flex; align-items: center; gap: 10px; padding: 12px; background: #fff; border-radius: 12px; border: 1px solid #ddd; }
        .input-row:focus-within { border-color: #3b6d11; box-shadow: 0 0 0 2px rgba(59,109,17,0.1); }
        .mode-select { padding: 10px 12px; border: none; background: #f5f0e8; border-radius: 8px; font-size: 13px; font-weight: 500; color: #1C1C1C; cursor: pointer; min-width: 110px; }
        .chat-input { flex: 1; border: none; background: transparent; font-size: 15px; color: #1C1C1C; outline: none; padding: 8px; }
        .chat-input::placeholder { color: #999; }
        .chat-input:disabled { opacity: 0.6; }
        .clean-btn { background: #f5f0e8; border: none; border-radius: 8px; padding: 8px 12px; font-size: 16px; cursor: pointer; }
        
        /* Limit message */
        .limit-message { background: #fff; border: 1px solid #ddd; border-radius: 10px; padding: 14px; text-align: center; color: #666; font-size: 13px; }
        .limit-btn { background: #3b6d11; border: none; border-radius: 6px; padding: 8px 16px; color: #eaf3de; font-size: 13px; cursor: pointer; margin-top: 10px; }

        /* Welcome message */
        .welcome-row { display: flex; align-items: flex-start; gap: 10px; width: 100%; margin-bottom: 12px; }
        .welcome-avatar { width: 32px; height: 32px; background: #3b6d11; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #eaf3de; font-size: 16px; font-weight: 700; flex-shrink: 0; }
        .welcome-content { flex: 1; }
        .welcome-bubble { background: #fff; border: 0.5px solid #e0e0e0; border-radius: 12px 12px 12px 2px; padding: 14px 16px; font-size: 14px; line-height: 1.5; color: #1C1C1C; margin-bottom: 10px; }
        .welcome-bubble p { margin: 0 0 8px 0; }
        .welcome-bubble p:last-child { margin-bottom: 0; }
        
        /* Quick questions */
        .quick-questions { display: flex; flex-wrap: wrap; gap: 8px; }
        .quick-btn { padding: 8px 14px; border-radius: 20px; border: 1px solid #3b6d11; background: transparent; color: #3b6d11; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; }
        .quick-btn:hover { background: #3b6d11; color: #eaf3de; }

        @media (max-width: 640px) {
          .context-strip { font-size: 12px; padding: 8px 12px; flex-wrap: wrap; }
          .skills-row { gap: 6px; }
          .skill-pill { padding: 6px 12px; font-size: 12px; }
          .msg-bubble { max-width: 90%; padding: 10px 12px; font-size: 13px; }
          .input-row { padding: 8px; gap: 8px; }
          .mode-select { min-width: 90px; font-size: 12px; padding: 8px; }
          .quick-questions { gap: 6px; }
          .quick-btn { padding: 6px 12px; font-size: 12px; }
        }
      `}</style>

      <div class="chat-main">
        {/* Context Strip */}
        <div 
          class={`context-strip ${contextStrip().level}`}
          style={activeSkill() ? `border-left: 4px solid ${modoColores[activeSkill()]?.border || '#97c459'}` : ''}
        >
          <span class="context-strip-text">{contextStrip().text}</span>
          <div class="prov-dropdown-wrap">
            <button class="prov-change-btn" onClick={() => setShowProvinceDropdown(!showProvinceDropdown())}>
              {provincia() ? 'Cambiar ▾' : 'Elegir ▾'}
            </button>
            <div class={`prov-dropdown-inline ${showProvinceDropdown() ? 'show' : ''}`}>
              <For each={PROVINCIAS}>{(prov) => (
                <div class="prov-option" onClick={() => { seleccionarProvincia(prov); setShowProvinceDropdown(false); }}>
                  {prov}
                </div>
              )}</For>
            </div>
          </div>
        </div>

        {/* Skills Pills */}
        <div class="skills-row">
          <For each={SKILLS}>{(skill) => (
            <button 
              class={`skill-pill ${activeSkill() === skill.id ? 'active' : ''}`}
              onClick={() => selectSkill(skill.id)}
            >
              {skill.label}
            </button>
          )}</For>
        </div>

        {/* Messages */}
        <div class="chat-messages">
          <Show when={showWelcome() && messages().length === 0}>
            <div class="welcome-row">
              <div class="welcome-avatar">{modoAvatares[activeSkill()] || modoAvatares.libre}</div>
              <div class="welcome-content">
                <div class="welcome-bubble">
                  <p>Hola 👋 Soy tu counsellor de olivaξ.</p>
                  <p>{modoIntro[activeSkill()] || modoIntro.libre}</p>
                  <p>{generateWelcomeMessage()}</p>
                  <p>¿Qué necesitas hoy?</p>
                </div>
                <div class="quick-questions">
                  <For each={quickQuestions}>{(q) => (
                    <button class="quick-btn" onClick={() => sendQuickQuestion(q)}>{q}</button>
                  )}</For>
                </div>
              </div>
            </div>
          </Show>
          
          <For each={messages()}>{(msg) => (
            <div class="msg-row">
              <Show when={msg.role === 'bot'} fallback={<div class="msg-bubble user">{msg.text}</div>}>
                <div class="msg-bubble bot">
                  <Show when={msg.isWaiting}>
                    <div class="typing-dots"><span class="dot1"></span><span class="dot2"></span><span class="dot3"></span></div>
                  </Show>
                  <Show when={!msg.isWaiting}>
                    <span style={{ 'white-space': 'pre-wrap' }} innerHTML={formatText(msg.text)}></span>
                  </Show>
                </div>
              </Show>
            </div>
          )}</For>
          
          <Show when={isAtLimit() && !isLoading()}>
            <div class="limit-message">
              <span>Llegaste al límite de memoria</span>
              <button class="limit-btn" onClick={() => { setMessages([]); setIsLoading(false); }}>🧹 Nuevo chat</button>
            </div>
          </Show>
          
          <div ref={messagesEndRef}></div>
        </div>

        {/* Input */}
        <div class="input-row">
          <select 
            class="mode-select" 
            value={activeSkill() || ''}
            onChange={(e) => selectSkill(e.target.value)}
          >
            <option value="">🎯 Elegir modo</option>
            <For each={SKILLS}>{(skill) => (
              <option value={skill.id}>{skill.label}</option>
            )}</For>
          </select>
          <input 
            class="chat-input" 
            type="text" 
            value={input()} 
            onInput={(e) => setInput(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && enviarPregunta()} 
            placeholder={isLoading() ? "Escribiendo..." : "Escribe tu pregunta..."}
            disabled={isLoading() || isAtLimit()} 
            autofocus
          />
          <button class="clean-btn" onClick={() => isAtLimit() ? (setMessages([]), setIsLoading(false)) : descargarChat()}>
            {isAtLimit() ? '🧹' : '💾'}
          </button>
        </div>
      </div>
    </div>
  );
}
