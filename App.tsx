
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ShieldCheck, 
  BarChart3, 
  Globe2, 
  Star, 
  History, 
  AlertTriangle,
  RefreshCw,
  Rocket,
  ArrowUpRight,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  TrendingUp,
  MapPin
} from 'lucide-react';
import { Category, RadarItem, ChileIndicators, AlertData, AstroEvent } from './types';
import { getTraditionInsights } from './services/geminiService';

const UPDATE_INTERVAL = 15 * 60 * 1000; // 15 minutos exactos

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Category>(Category.CRONICAS);
  const [items, setItems] = useState<RadarItem[]>([]);
  const [indicators, setIndicators] = useState<ChileIndicators | null>(null);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [astro, setAstro] = useState<AstroEvent[]>([]);
  const [tradition, setTradition] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  const seenIds = useRef<Set<string>>(new Set());
  const audioCtx = useRef<AudioContext | null>(null);

  // Sintetizador de audio optimizado para evitar bloqueos
  const playNotificationSound = useCallback(async () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtx.current || audioCtx.current.state === 'closed') {
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtx.current.state === 'suspended') {
        await audioCtx.current.resume();
      }
      
      const ctx = audioCtx.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, ctx.currentTime); // Si (B5) - Sonido "limpio"
      osc.frequency.exponentialRampToValueAtTime(493.88, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.warn("Interacción de usuario requerida para el audio.");
    }
  }, [soundEnabled]);

  const sendNotification = useCallback((title: string, body: string) => {
    if (Notification.permission === 'granted') {
      new Notification(`BCH | ${title}`, {
        body,
        icon: 'https://cdn-icons-png.flaticon.com/512/2583/2583158.png'
      });
      playNotificationSound();
    }
  }, [playNotificationSound]);

  const requestPermissions = async () => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotificationsEnabled(true);
      sendNotification("Terminal Activada", "Vigilancia de 15 minutos en curso.");
    }
  };

  const fetchData = async (isInitial = false) => {
    setLoading(true);
    try {
      // 1. Indicadores Económicos (Patrimonio)
      const resInd = await fetch('https://mindicador.cl/api');
      const dataInd = await resInd.json();
      setIndicators({
        uf: dataInd.uf.valor,
        dolar: dataInd.dolar.valor,
        utm: dataInd.utm.valor,
        ipc: dataInd.ipc.valor,
        ivp: dataInd.ivp.valor
      });

      // 2. Noticias (Crónicas)
      const resNews = await fetch('https://www.reddit.com/r/chile/new.json?limit=12');
      const dataNews = await resNews.json();
      const newsItems: RadarItem[] = dataNews.data.children.map((c: any) => ({
        id: c.data.id,
        source: 'SISTEMA_CENTRAL',
        headline: c.data.title,
        content: c.data.selftext,
        timestamp: c.data.created_utc * 1000,
        category: Category.CRONICAS,
        url: `https://reddit.com${c.data.permalink}`
      }));

      // Notificar novedades
      newsItems.forEach(item => {
        if (!seenIds.current.has(item.id)) {
          if (!isInitial) sendNotification("Nueva Crónica", item.headline);
          seenIds.current.add(item.id);
        }
      });
      setItems(newsItems);

      // 3. Sismos y Geología (Gaia)
      const resQuakes = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson');
      const dataQuakes = await resQuakes.json();
      const localQuakes = dataQuakes.features
        .filter((f: any) => f.properties.place.toLowerCase().includes('chile'))
        .map((f: any) => ({
          title: `Sismo Mag ${f.properties.mag}`,
          desc: f.properties.place,
          severity: f.properties.mag > 5.2 ? 'ALTA' : 'MEDIA',
          timestamp: f.properties.time,
          id: f.id
        }));
      
      localQuakes.forEach((q: any) => {
        if (!seenIds.current.has(q.id)) {
          if (!isInitial) sendNotification("Alerta Gaia", q.title);
          seenIds.current.add(q.id);
        }
      });
      setAlerts(localQuakes);

      // 4. Cosmos (Lanzamientos)
      const resAstro = await fetch('https://lldev.thespacedevs.com/2.2.0/launch/upcoming/?limit=4');
      const dataAstro = await resAstro.json();
      setAstro(dataAstro.results.map((r: any) => ({
        name: r.name,
        date: r.net,
        type: 'LANZAMIENTO',
        provider: r.launch_service_provider.name
      })));

      // 5. Inteligencia Gemini (Efemérides y Directrices)
      const traditionData = await getTraditionInsights(newsItems.slice(0, 5));
      setTradition(traditionData);

      setLastUpdate(new Date());

      // Mantenimiento de memoria (limitar set de IDs)
      if (seenIds.current.size > 200) {
        const ids = Array.from(seenIds.current);
        seenIds.current = new Set(ids.slice(-100));
      }

    } catch (e) {
      console.error("Error en sincronización BCH:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), UPDATE_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-screen max-h-screen bg-[#010816] text-white">
      
      {/* Alerta Roja Crítica */}
      {alerts.some(a => a.severity === 'ALTA') && (
        <div className="alert-banner bg-red-700 text-white px-4 py-2 flex items-center justify-between z-[100] border-b-2 border-[#A3895D] shadow-xl animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} />
            <span className="text-[10px] font-black uppercase tracking-tighter">Evento Crítico Detectado: Prioridad Máxima</span>
          </div>
          <span className="text-[9px] mono font-bold">ZONA_SUR_33</span>
        </div>
      )}

      {/* Header Institucional */}
      <header className="bg-[#002464] px-6 py-5 flex justify-between items-center border-b border-[#A3895D]/40 shadow-2xl relative z-50">
        <div className="flex items-center gap-4">
          <div className="bg-white p-2.5 rounded shadow-xl border border-[#A3895D]/50 transition-transform active:scale-95 cursor-pointer">
            <ShieldCheck size={26} className="text-[#002464]" />
          </div>
          <div>
            <h1 className="cinzel text-xl font-black tracking-widest text-white leading-none">GESTIÓN 33</h1>
            <p className="text-[9px] mono text-[#A3895D] font-bold uppercase tracking-[0.4em] mt-1.5">Nodo Austral • Chile</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={requestPermissions}
            className={`p-2.5 rounded-full bg-white/5 transition-all ${notificationsEnabled ? 'text-[#A3895D] border border-[#A3895D]' : 'text-white/20 border border-white/5'}`}
          >
            {notificationsEnabled ? <Bell size={20} /> : <BellOff size={20} />}
          </button>
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-full bg-white/5 transition-all ${soundEnabled ? 'text-[#A3895D] border border-[#A3895D]' : 'text-white/20 border border-white/5'}`}
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>
      </header>

      {/* Ticker de Indicadores con Efecto Loop */}
      <div className="bg-[#001233] border-b border-[#A3895D]/20 h-10 flex items-center overflow-hidden">
        <div className="animate-ticker">
          {[1, 2].map(loop => (
            <div key={loop} className="flex gap-12 px-6 items-center">
              {indicators ? (
                <>
                  <Indicator label="UF" value={`$${indicators.uf.toLocaleString('es-CL')}`} />
                  <Indicator label="DÓLAR" value={`$${indicators.dolar}`} />
                  <Indicator label="UTM" value={`$${indicators.utm.toLocaleString('es-CL')}`} />
                  <Indicator label="IPC" value={`${indicators.ipc}%`} />
                  <div className="flex items-center gap-2 text-[10px] text-[#A3895D] font-bold">
                    <RefreshCw size={12} /> SYNC: {lastUpdate.toLocaleTimeString()}
                  </div>
                </>
              ) : <span className="text-[10px] text-white/30 uppercase tracking-widest">Sincronizando flujos económicos...</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Feed Principal */}
      <main className="flex-1 overflow-y-auto pb-28 bg-[#010816] no-scrollbar">
        
        {loading && !items.length ? (
          <div className="flex flex-col items-center justify-center h-full text-white/10 space-y-6">
            <RefreshCw size={48} className="animate-spin text-[#A3895D]" />
            <div className="text-center">
              <p className="cinzel text-sm uppercase tracking-[0.4em]">Verificando Canales</p>
              <p className="text-[9px] mono mt-2">AUTENTICANDO_ACCESO_BCH_V33</p>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-6">
            
            {/* Sección de la Tradición (AI Insights) */}
            {tradition && (
              <div className="bg-white rounded-2xl p-6 shadow-2xl border-t-8 border-[#002464] relative overflow-hidden">
                 <div className="absolute -right-6 -bottom-6 opacity-[0.04] text-[#002464]">
                    <History size={140} />
                 </div>
                 <div className="flex items-center gap-2.5 mb-3">
                    <History size={16} className="text-[#002464]" />
                    <span className="text-[10px] font-black text-[#002464] uppercase tracking-[0.2em]">Crónica Institucional</span>
                 </div>
                 <h2 className="text-2xl font-black text-[#002464] cinzel mb-2 leading-tight">{tradition.efemeride.titulo}</h2>
                 <p className="text-sm text-gray-700 leading-relaxed font-medium mb-5">{tradition.efemeride.descripcion}</p>
                 <div className="bg-[#002464]/5 border-l-4 border-[#A3895D] p-4 rounded-r-lg">
                    <p className="text-[9px] font-black text-[#A3895D] uppercase mb-1.5 flex items-center gap-1.5">
                      <Star size={10} /> Directriz del Directorio
                    </p>
                    <p className="text-[13px] font-bold text-[#002464] italic tracking-tight">"{tradition.directriz}"</p>
                 </div>
              </div>
            )}

            {/* Navegación por Pestañas */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 sticky top-0 bg-[#010816]/90 backdrop-blur-md z-40">
               {Object.values(Category).map((cat) => (
                 <button 
                  key={cat}
                  onClick={() => { setActiveTab(cat); playNotificationSound(); }}
                  className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                    activeTab === cat 
                      ? 'bg-[#A3895D] text-white border-[#A3895D] shadow-lg shadow-[#A3895D]/20' 
                      : 'bg-transparent text-white/40 border-white/5 hover:border-white/20'
                  }`}
                 >
                   {cat}
                 </button>
               ))}
            </div>

            {/* Listados de Datos */}
            <div className="space-y-4">
               {activeTab === Category.CRONICAS && items.map(item => (
                 <div key={item.id} className="bg-[#001a4d] border border-white/5 p-6 rounded-2xl hover:bg-[#00468B] transition-all group shadow-xl">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <Globe2 size={12} className="text-[#A3895D]" />
                        <span className="text-[9px] mono text-[#A3895D] font-black uppercase tracking-widest">{item.source}</span>
                      </div>
                      <span className="text-[9px] text-white/30 font-bold">{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <h3 className="text-base font-bold text-white leading-snug mb-4 group-hover:text-white transition-colors">{item.headline}</h3>
                    <a href={item.url} target="_blank" className="flex items-center justify-between gap-2 text-[10px] font-black text-[#A3895D] uppercase bg-white/5 px-4 py-2.5 rounded-xl border border-[#A3895D]/20 hover:bg-[#A3895D] hover:text-white transition-all">
                      Sincronizar Archivo <ArrowUpRight size={14} />
                    </a>
                 </div>
               ))}

               {activeTab === Category.PATRIMONIO && indicators && (
                 <div className="grid grid-cols-1 gap-4">
                    <MetricCard label="Unidad de Fomento" value={`$${indicators.uf.toLocaleString('es-CL')}`} trend="+0.01%" />
                    <MetricCard label="Dólar Observado" value={`$${indicators.dolar}`} trend="-0.45%" />
                    <MetricCard label="UTM Mensual" value={`$${indicators.utm.toLocaleString('es-CL')}`} trend="NOMINAL" />
                    <div className="bg-[#002464] p-6 rounded-2xl border border-[#A3895D]/30 flex items-center justify-between">
                       <div>
                         <p className="text-[10px] text-[#A3895D] font-black uppercase tracking-widest">Estado de Obra</p>
                         <p className="text-sm font-bold text-white mt-1 italic">{tradition?.clima_social || 'Estabilizando...'}</p>
                       </div>
                       <TrendingUp className="text-[#A3895D]" size={32} />
                    </div>
                 </div>
               )}

               {activeTab === Category.GAIA && (
                  <div className="space-y-4">
                    {alerts.length > 0 ? alerts.map((a, i) => (
                      <div key={i} className={`p-5 rounded-2xl border-l-8 ${a.severity === 'ALTA' ? 'border-red-600 bg-red-600/10' : 'border-[#A3895D] bg-white/5'} flex gap-5 items-start shadow-xl`}>
                        <div className={`p-3 rounded-xl ${a.severity === 'ALTA' ? 'bg-red-600 shadow-lg shadow-red-600/30' : 'bg-[#A3895D] shadow-lg shadow-[#A3895D]/30'}`}>
                          <MapPin size={22} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-base font-bold text-white tracking-tight">{a.title}</h4>
                          <p className="text-[11px] text-white/60 uppercase font-medium mt-1">{a.desc}</p>
                          <div className="flex justify-between items-center mt-3">
                            <span className="text-[9px] mono text-white/30">{new Date(a.timestamp).toLocaleString()}</span>
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded border ${a.severity === 'ALTA' ? 'border-red-500 text-red-500' : 'border-[#A3895D] text-[#A3895D]'}`}>PRIORIDAD_{a.severity}</span>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-20 opacity-20">
                        <Globe2 size={64} className="mx-auto mb-4" />
                        <p className="cinzel text-sm uppercase tracking-widest">Sin Anomalías Geológicas</p>
                      </div>
                    )}
                  </div>
               )}

               {activeTab === Category.COSMOS && (
                  <div className="space-y-4">
                    <div className="bg-[#A3895D]/5 border border-[#A3895D]/20 p-6 rounded-3xl relative overflow-hidden">
                      <div className="absolute right-[-20px] top-[-20px] text-[#A3895D] opacity-10">
                        <Star size={100} />
                      </div>
                      <h4 className="text-[11px] font-black text-[#A3895D] uppercase mb-6 flex items-center gap-2">
                        <Rocket size={18} /> Planificación Aeroespacial
                      </h4>
                      <div className="space-y-6">
                        {astro.map((a, i) => (
                          <div key={i} className="flex justify-between items-center border-b border-white/5 pb-5 last:border-0 group">
                            <div className="flex-1">
                              <p className="text-[9px] text-[#A3895D] font-black uppercase tracking-widest">{a.provider}</p>
                              <p className="text-sm font-bold text-white leading-tight mt-1.5 group-hover:text-[#A3895D] transition-colors">{a.name}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-[11px] font-black text-[#A3895D] mono bg-[#A3895D]/10 px-2 py-1 rounded">
                                {new Date(a.date).toLocaleDateString([], {day:'2-digit', month:'short'})}
                              </span>
                              <p className="text-[8px] text-white/30 uppercase mt-1.5 font-bold">Lanzamiento T-0</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
               )}
            </div>
          </div>
        )}
      </main>

      {/* Navegación de Control Inferior */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#002464] border-t-2 border-[#A3895D]/30 h-24 flex items-center justify-around safe-bottom z-50 shadow-[0_-15px_40px_rgba(0,0,0,0.6)] px-4">
        <NavButton active={activeTab === Category.CRONICAS} onClick={() => setActiveTab(Category.CRONICAS)} icon={<Globe2 size={22}/>} label="Radar" />
        <NavButton active={activeTab === Category.PATRIMONIO} onClick={() => setActiveTab(Category.PATRIMONIO)} icon={<BarChart3 size={22}/>} label="Valores" />
        
        <div className="relative -top-6">
           <div 
            onClick={() => fetchData(false)}
            className="bg-[#A3895D] p-5 rounded-3xl shadow-2xl border-4 border-[#002464] active:scale-90 transition-all hover:rotate-180 cursor-pointer flex items-center justify-center group"
          >
              <ShieldCheck size={32} className="text-[#002464] group-hover:scale-110 transition-transform" />
           </div>
           <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#A3895D] rounded-full animate-ping" />
        </div>

        <NavButton active={activeTab === Category.GAIA} onClick={() => setActiveTab(Category.GAIA)} icon={<AlertTriangle size={22}/>} label="Gaia" />
        <NavButton active={activeTab === Category.COSMOS} onClick={() => setActiveTab(Category.COSMOS)} icon={<Star size={22}/>} label="Cosmos" />
      </nav>

    </div>
  );
};

// Componentes Reutilizables de Interfaz
const Indicator: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center gap-2">
    <span className="text-[10px] font-black text-[#A3895D] uppercase tracking-tighter">{label}:</span>
    <span className="text-[10px] font-black text-white">{value}</span>
  </div>
);

const MetricCard: React.FC<{ label: string; value: string; trend: string }> = ({ label, value, trend }) => (
  <div className="bg-white p-6 rounded-2xl border-l-8 border-[#A3895D] shadow-2xl flex justify-between items-center group active:scale-95 transition-transform">
    <div>
      <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{label}</span>
      <h3 className="text-2xl font-black text-[#002464] cinzel mt-1.5">{value}</h3>
    </div>
    <div className="text-right">
      <span className={`text-[10px] font-black px-2 py-1 rounded bg-[#002464]/5 ${trend.startsWith('+') ? 'text-green-600' : 'text-[#A3895D]'}`}>
        {trend}
      </span>
    </div>
  </div>
);

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick} 
    className={`flex flex-col items-center gap-1.5 transition-all w-16 ${active ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
  >
    <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-[#A3895D]/20 text-[#A3895D]' : ''}`}>{icon}</div>
    <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default App;
