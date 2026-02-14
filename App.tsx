
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Compass, 
  Eye, 
  Shield, 
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
  Triangle,
  Sun
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

  const playRitualSound = useCallback(async () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtx.current || audioCtx.current.state === 'closed') {
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtx.current.state === 'suspended') await audioCtx.current.resume();
      
      const ctx = audioCtx.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle'; // Sonido más rico, armónico
      osc.frequency.setValueAtTime(1320, ctx.currentTime); // E6
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
      
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      // Ignorar si el audio no está listo
    }
  }, [soundEnabled]);

  const sendAlert = useCallback((title: string, body: string) => {
    if (Notification.permission === 'granted') {
      new Notification(`RADAR 33 | ${title}`, { body });
      playRitualSound();
    }
  }, [playRitualSound]);

  const requestAccess = async () => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotificationsEnabled(true);
      sendAlert("Vigilancia Activa", "El Ojo del Arquitecto ha sido abierto.");
    }
  };

  const syncLogia = async (isInitial = false) => {
    setLoading(true);
    try {
      // 1. Columnas Económicas
      const resInd = await fetch('https://mindicador.cl/api');
      const dataInd = await resInd.json();
      setIndicators({
        uf: dataInd.uf.valor,
        dolar: dataInd.dolar.valor,
        utm: dataInd.utm.valor,
        ipc: dataInd.ipc.valor,
        ivp: dataInd.ivp.valor
      });

      // 2. Crónicas del Mundo (Reddit Chile)
      const resNews = await fetch('https://www.reddit.com/r/chile/new.json?limit=10');
      const dataNews = await resNews.json();
      const newsItems: RadarItem[] = dataNews.data.children.map((c: any) => ({
        id: c.data.id,
        source: 'ORIENTE',
        headline: c.data.title,
        content: c.data.selftext,
        timestamp: c.data.created_utc * 1000,
        category: Category.CRONICAS,
        url: `https://reddit.com${c.data.permalink}`
      }));

      newsItems.forEach(item => {
        if (!seenIds.current.has(item.id)) {
          if (!isInitial) sendAlert("Nueva Crónica", item.headline);
          seenIds.current.add(item.id);
        }
      });
      setItems(newsItems);

      // 3. Alertas Gaia (Sismos)
      const resQuakes = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson');
      const dataQuakes = await resQuakes.json();
      const chQuakes = dataQuakes.features
        .filter((f: any) => f.properties.place.toLowerCase().includes('chile'))
        .map((f: any) => ({
          title: `Temblor Mag ${f.properties.mag}`,
          desc: f.properties.place,
          severity: f.properties.mag > 5.0 ? 'ALTA' : 'MEDIA',
          timestamp: f.properties.time,
          id: f.id
        }));
      
      chQuakes.forEach((q: any) => {
        if (!seenIds.current.has(q.id)) {
          if (!isInitial) sendAlert("Movimiento Gaia", q.title);
          seenIds.current.add(q.id);
        }
      });
      setAlerts(chQuakes);

      // 4. Sabiduría del Gran Arquitecto (Gemini)
      const tradData = await getTraditionInsights(newsItems.slice(0, 5));
      setTradition(tradData);

      setLastUpdate(new Date());

    } catch (e) {
      console.error("Fallo en sincronización de la Logia:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncLogia(true);
    const interval = setInterval(() => syncLogia(false), UPDATE_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-screen max-h-screen bg-[#00091A] text-[#F2F2F2] selection:bg-[#D4AF37]/30">
      
      {/* Banner de Emergencia Masónico */}
      {alerts.some(a => a.severity === 'ALTA') && (
        <div className="bg-[#D4AF37] text-[#00091A] px-4 py-1.5 flex items-center justify-between z-[100] font-black uppercase tracking-tighter text-[10px] animate-pulse">
          <div className="flex items-center gap-2">
            <Triangle size={14} className="fill-[#00091A]" />
            <span>Alerta de la Columna: Inestabilidad en el Septentrión</span>
          </div>
          <span className="mono">0.0.0.33</span>
        </div>
      )}

      {/* Cabecera del Gran Arquitecto */}
      <header className="bg-[#001B4D] px-6 py-6 border-b-2 border-[#D4AF37]/50 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex justify-between items-center relative z-50">
        <div className="flex items-center gap-4">
          <div className="bg-[#00091A] p-2.5 rounded-lg border border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)]">
            <Compass size={28} className="text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="cinzel text-xl font-black tracking-[0.2em] text-[#D4AF37]">RADAR 33</h1>
            <p className="text-[8px] mono text-[#F2F2F2]/60 font-bold uppercase tracking-[0.5em] mt-1">El Ojo del Arquitecto</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={requestAccess}
            className={`p-2.5 rounded-full transition-all ${notificationsEnabled ? 'text-[#D4AF37] bg-[#D4AF37]/10' : 'text-white/20'}`}
          >
            {notificationsEnabled ? <Bell size={20} /> : <BellOff size={20} />}
          </button>
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-full transition-all ${soundEnabled ? 'text-[#D4AF37] bg-[#D4AF37]/10' : 'text-white/20'}`}
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>
      </header>

      {/* Ticker del Tesoro */}
      <div className="bg-[#00091A] border-b border-[#D4AF37]/10 h-10 flex items-center overflow-hidden">
        <div className="animate-ticker">
          {[1, 2].map(l => (
            <div key={l} className="flex gap-14 px-8 items-center">
              {indicators ? (
                <>
                  <WealthItem label="UF" value={`$${indicators.uf.toLocaleString('es-CL')}`} />
                  <WealthItem label="DÓLAR" value={`$${indicators.dolar}`} />
                  <WealthItem label="UTM" value={`$${indicators.utm.toLocaleString('es-CL')}`} />
                  <WealthItem label="IPC" value={`${indicators.ipc}%`} />
                  <div className="flex items-center gap-2 text-[9px] text-[#D4AF37]/60 font-bold">
                    <Sun size={12} /> ÚLTIMO RITO: {lastUpdate.toLocaleTimeString()}
                  </div>
                </>
              ) : <span className="text-[10px] uppercase tracking-widest opacity-20">Apertura de los Libros...</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Área Ritual de Datos */}
      <main className="flex-1 overflow-y-auto pb-32 no-scrollbar bg-[radial-gradient(circle_at_center,_#001B4D_0%,_#00091A_100%)]">
        
        {loading && !items.length ? (
          <div className="flex flex-col items-center justify-center h-full opacity-10 scale-150">
            <RefreshCw size={64} className="animate-spin text-[#D4AF37]" />
            <p className="cinzel mt-4 tracking-[0.5em]">Iniciando</p>
          </div>
        ) : (
          <div className="p-5 space-y-6">
            
            {/* La Sabiduría del Grado */}
            {tradition && (
              <div className="bg-[#001B4D] rounded-xl p-6 border-2 border-[#D4AF37] shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
                 <div className="absolute -right-8 -bottom-8 opacity-5 text-[#D4AF37]">
                    <Eye size={160} />
                 </div>
                 <div className="flex items-center gap-2 mb-4">
                    <History size={16} className="text-[#D4AF37]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">Anales del Gran Oriente</span>
                 </div>
                 <h2 className="text-2xl font-black cinzel text-[#F2F2F2] mb-3">{tradition.efemeride.titulo}</h2>
                 <p className="text-sm text-white/80 leading-relaxed italic mb-6">"{tradition.efemeride.descripcion}"</p>
                 <div className="bg-[#00091A]/50 border-l-4 border-[#D4AF37] p-4">
                    <p className="text-[9px] font-black text-[#D4AF37] uppercase mb-1">Mandato para la Logia</p>
                    <p className="text-[13px] font-bold text-[#F2F2F2] leading-tight">{tradition.directriz}</p>
                 </div>
              </div>
            )}

            {/* Navegación por Grados */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 sticky top-0 bg-[#00091A]/80 backdrop-blur-md z-40">
               {Object.values(Category).map((cat) => (
                 <button 
                  key={cat}
                  onClick={() => { setActiveTab(cat); playRitualSound(); }}
                  className={`px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] transition-all border ${
                    activeTab === cat 
                      ? 'bg-[#D4AF37] text-[#00091A] border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.3)]' 
                      : 'bg-transparent text-[#D4AF37]/40 border-[#D4AF37]/10 hover:border-[#D4AF37]/40'
                  }`}
                 >
                   {cat}
                 </button>
               ))}
            </div>

            {/* Listado de Revelaciones */}
            <div className="space-y-4">
               {activeTab === Category.CRONICAS && items.map(item => (
                 <div key={item.id} className="bg-[#001B4D]/30 border border-[#D4AF37]/10 p-5 rounded-xl hover:bg-[#D4AF37]/5 transition-all group">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[9px] mono text-[#D4AF37] font-black uppercase tracking-widest flex items-center gap-2">
                        <Triangle size={10} className="fill-[#D4AF37]" /> {item.source}
                      </span>
                      <span className="text-[9px] text-white/20 font-bold">{new Date(item.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <h3 className="text-base font-bold text-white mb-4 group-hover:text-[#D4AF37] transition-colors">{item.headline}</h3>
                    <a href={item.url} target="_blank" className="inline-flex items-center gap-2 text-[9px] font-black text-[#D4AF37] uppercase border border-[#D4AF37]/30 px-4 py-2 rounded hover:bg-[#D4AF37] hover:text-[#00091A] transition-all">
                      Abrir Archivo <ArrowUpRight size={12} />
                    </a>
                 </div>
               ))}

               {activeTab === Category.PATRIMONIO && indicators && (
                 <div className="grid grid-cols-1 gap-4">
                    <RitualCard label="Unidad de Fomento" value={`$${indicators.uf.toLocaleString('es-CL')}`} />
                    <RitualCard label="Dólar Oriente" value={`$${indicators.dolar}`} />
                    <RitualCard label="UTM Logia" value={`$${indicators.utm.toLocaleString('es-CL')}`} />
                    <div className="p-6 bg-[#001B4D] border-2 border-[#D4AF37]/20 rounded-xl">
                       <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest mb-2">Estado de la Obra</p>
                       <p className="text-lg font-bold italic">{tradition?.clima_social || 'Vigilancia en curso...'}</p>
                    </div>
                 </div>
               )}

               {activeTab === Category.GAIA && (
                  <div className="space-y-4">
                    {alerts.map((a, i) => (
                      <div key={i} className={`p-5 rounded-xl border-l-4 ${a.severity === 'ALTA' ? 'border-red-600 bg-red-600/5' : 'border-[#D4AF37] bg-white/5'} flex gap-5`}>
                        <div className={`p-3 rounded-lg ${a.severity === 'ALTA' ? 'bg-red-600' : 'bg-[#D4AF37]'}`}>
                           <AlertTriangle size={20} className="text-white" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white">{a.title}</h4>
                          <p className="text-[10px] text-white/50 uppercase mt-1">{a.desc}</p>
                          <p className="text-[9px] text-white/20 mt-2">{new Date(a.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
               )}
            </div>
          </div>
        )}
      </main>

      {/* Panel de Control de la Logia */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#001B4D] border-t-2 border-[#D4AF37] h-24 flex items-center justify-around safe-bottom z-50 shadow-[0_-20px_50px_rgba(0,0,0,0.8)]">
        <MasonicNav active={activeTab === Category.CRONICAS} onClick={() => setActiveTab(Category.CRONICAS)} icon={<Globe2 size={22}/>} label="Vigilancia" />
        <MasonicNav active={activeTab === Category.PATRIMONIO} onClick={() => setActiveTab(Category.PATRIMONIO)} icon={<BarChart3 size={22}/>} label="Tesoro" />
        
        <div className="relative -top-8">
           <div 
            onClick={() => { syncLogia(false); playRitualSound(); }}
            className="bg-[#D4AF37] p-5 rounded-full shadow-[0_0_30px_rgba(212,175,55,0.5)] border-4 border-[#001B4D] active:scale-90 transition-all cursor-pointer group"
          >
              <Eye size={36} className="text-[#001B4D] group-hover:rotate-180 transition-transform duration-700" />
           </div>
        </div>

        <MasonicNav active={activeTab === Category.GAIA} onClick={() => setActiveTab(Category.GAIA)} icon={<AlertTriangle size={22}/>} label="Gaia" />
        <MasonicNav active={activeTab === Category.ANALES} onClick={() => setActiveTab(Category.ANALES)} icon={<History size={22}/>} label="Anales" />
      </nav>

    </div>
  );
};

const WealthItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center gap-2">
    <span className="text-[9px] font-black text-[#D4AF37] uppercase">{label}:</span>
    <span className="text-[10px] font-black text-white/80">{value}</span>
  </div>
);

const RitualCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-[#001B4D] p-6 rounded-xl border border-[#D4AF37]/20 flex justify-between items-center group active:scale-95 transition-transform">
    <div>
      <span className="text-[9px] font-black text-[#D4AF37] uppercase tracking-widest">{label}</span>
      <h3 className="text-2xl font-black cinzel text-white mt-1">{value}</h3>
    </div>
    <ArrowUpRight size={24} className="text-[#D4AF37]/30 group-hover:text-[#D4AF37] transition-colors" />
  </div>
);

const MasonicNav: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 transition-all ${active ? 'text-[#D4AF37]' : 'text-white/30'}`}>
    <div className={`p-2 rounded-xl ${active ? 'bg-[#D4AF37]/10' : ''}`}>{icon}</div>
    <span className="text-[9px] font-black uppercase tracking-[0.1em]">{label}</span>
  </button>
);

export default App;
