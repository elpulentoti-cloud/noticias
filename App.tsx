
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Eye, 
  Triangle, 
  Globe, 
  Activity, 
  Flame, 
  ChevronRight,
  ShieldAlert,
  Zap,
  Boxes,
  Compass,
  ArrowUpRight,
  RefreshCcw
} from 'lucide-react';
import { Category, RadarItem, ChileIndicators, AlertData } from './types';
import { analyzeChileanWork } from './services/geminiService';

// --- Components ---

const IndicatorBox: React.FC<{ label: string; value: string; unit: string }> = ({ label, value, unit }) => (
  <div className="bg-[#0a0a0a] border border-gold/20 p-3 flex flex-col items-start min-w-[120px]">
    <span className="text-[9px] mono text-gray-500 uppercase tracking-tighter">{label}</span>
    <div className="flex items-baseline gap-1">
      <span className="text-sm font-bold cinzel text-white">{value}</span>
      <span className="text-[8px] mono text-gold/60">{unit}</span>
    </div>
  </div>
);

const NewsCard: React.FC<{ item: RadarItem }> = ({ item }) => (
  <div className="bg-[#080808] border-l-2 border-gold/40 p-4 mb-3 active:bg-white/5 transition-colors">
    <div className="flex justify-between items-center mb-1">
      <span className="text-[9px] mono text-gold/70 tracking-widest uppercase">Nodo: {item.source}</span>
      <span className="text-[9px] mono text-gray-600">{new Date(item.timestamp).toLocaleTimeString()}</span>
    </div>
    <h3 className="text-sm font-bold leading-snug mb-2 cinzel tracking-wide">{item.headline}</h3>
    <a href={item.url} target="_blank" className="flex items-center gap-1 text-[10px] mono text-amber-600/80 uppercase">
      Auditar Fuente <ArrowUpRight size={10} />
    </a>
  </div>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Category>(Category.CRONICAS);
  const [items, setItems] = useState<RadarItem[]>([]);
  const [indicators, setIndicators] = useState<ChileIndicators | null>(null);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [wisdom, setWisdom] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchChileanContext = async () => {
    try {
      // Indicadores Chilenos
      const resInd = await fetch('https://mindicador.cl/api');
      const dataInd = await resInd.json();
      setIndicators({
        uf: dataInd.uf.valor,
        dolar: dataInd.dolar.valor,
        utm: dataInd.utm.valor,
        ipc: dataInd.ipc.valor
      });

      // Noticias Chile (vía Reddit para mayor estabilidad en móvil sin servidor proxy)
      const resNews = await fetch('https://www.reddit.com/r/chile/new.json?limit=10');
      const dataNews = await resNews.json();
      const news = dataNews.data.children.map((c: any) => ({
        id: c.data.id,
        source: 'CRONICA_AUSTRAL',
        headline: c.data.title,
        content: c.data.selftext,
        timestamp: c.data.created_utc * 1000,
        category: Category.CRONICAS,
        url: `https://reddit.com${c.data.permalink}`
      }));
      setItems(news);

      // Emergencias USGS (Chile Focus: Mag 4.5+)
      const resQuakes = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson');
      const dataQuakes = await resQuakes.json();
      const chileQuakes = dataQuakes.features
        .filter((f: any) => f.properties.place.toLowerCase().includes('chile'))
        .map((f: any) => ({
          title: `Sismo Mag ${f.properties.mag} - ${f.properties.place}`,
          severity: f.properties.mag > 6 ? 'ALTA' : 'MEDIA',
          timestamp: f.properties.time
        }));
      setAlerts(chileQuakes);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChileanContext();
    const interval = setInterval(fetchChileanContext, 60000 * 10);
    return () => clearInterval(interval);
  }, []);

  const getWisdom = useCallback(async () => {
    if (items.length > 0 && !wisdom) {
      const res = await analyzeChileanWork(items.slice(0, 5));
      setWisdom(res);
    }
  }, [items, wisdom]);

  useEffect(() => {
    if (!loading) getWisdom();
  }, [loading, getWisdom]);

  return (
    <div className="flex flex-col h-screen max-h-screen">
      {/* Ticker Superior (La Cadena de Unión) */}
      <div className="bg-black border-b border-gold/30 h-8 flex items-center overflow-hidden z-50">
        <div className="ticker-wrap flex gap-10 px-4">
          {indicators && (
            <>
              <span className="text-[10px] mono text-gold uppercase">UF: ${indicators.uf}</span>
              <span className="text-[10px] mono text-white uppercase">USD: ${indicators.dolar}</span>
              <span className="text-[10px] mono text-gold uppercase">UTM: ${indicators.utm}</span>
              <span className="text-[10px] mono text-white uppercase">IPC: {indicators.ipc}%</span>
              {/* Repetición para loop infinito */}
              <span className="text-[10px] mono text-gold uppercase">UF: ${indicators.uf}</span>
              <span className="text-[10px] mono text-white uppercase">USD: ${indicators.dolar}</span>
            </>
          )}
        </div>
      </div>

      {/* Header Principal */}
      <header className="px-5 py-4 flex justify-between items-center bg-[#050505] shadow-lg relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="p-1 border-2 border-gold rotate-45">
            <Triangle size={18} className="text-gold -rotate-45" />
          </div>
          <div>
            <h1 className="cinzel text-lg font-black tracking-[0.2em] text-gold glow-gold leading-none">PROJECT 33</h1>
            <p className="text-[8px] mono text-gray-500 uppercase tracking-widest mt-1">Chilean Chapter // Nodo Austral</p>
          </div>
        </div>
        <button onClick={() => {setLoading(true); fetchChileanContext();}} className="text-gold opacity-60">
           <RefreshCcw size={18} />
        </button>
      </header>

      {/* Area de Contenido */}
      <main className="flex-1 overflow-y-auto px-5 py-6 pb-24 relative">
        {/* Pilares Visuales (Solo decoración estética) */}
        <div className="fixed left-0 top-0 bottom-0 pillar-gradient" style={{ left: '2px' }} />
        <div className="fixed right-0 top-0 bottom-0 pillar-gradient" style={{ right: '2px' }} />

        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 animate-pulse">
             <Compass size={40} className="text-gold animate-spin" />
             <p className="cinzel text-xs text-gold uppercase tracking-[0.3em]">Nivelando el Templo...</p>
          </div>
        ) : (
          <>
            {/* Sección de Sabiduría IA (El Ojo) */}
            <div className="mb-8 p-4 bg-gold/5 border border-gold/20 relative overflow-hidden group">
               <div className="absolute top-[-10px] right-[-10px] opacity-10 group-hover:rotate-12 transition-transform">
                  <Eye size={80} className="text-gold" />
               </div>
               <div className="flex items-center gap-2 mb-3">
                  <Zap size={14} className="text-gold" />
                  <h4 className="cinzel text-xs font-bold text-gold uppercase tracking-widest">El Ojo del Arquitecto</h4>
               </div>
               {wisdom ? (
                 <div className="space-y-3 relative z-10">
                   <p className="text-[11px] leading-relaxed text-gray-300 italic">"{wisdom.frecuencia_nacional}"</p>
                   <div className="grid grid-cols-1 gap-2">
                     {wisdom.conclusiones.slice(0, 2).map((c: any, i: number) => (
                       <div key={i} className="bg-black/40 p-2 rounded-sm border-l border-gold/30">
                          <p className="text-[9px] font-bold text-gold uppercase mb-1">{c.punto}</p>
                          <p className="text-[10px] text-gray-400 leading-tight">{c.explicacion}</p>
                       </div>
                     ))}
                   </div>
                 </div>
               ) : (
                 <p className="text-[10px] mono text-gray-600">Analizando el gran diseño de hoy...</p>
               )}
            </div>

            {/* Selector de Categoría (Móvil) */}
            <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2">
               {Object.values(Category).map((cat) => (
                 <button 
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={`px-4 py-2 text-[10px] mono uppercase tracking-widest border transition-all whitespace-nowrap ${
                    activeTab === cat ? 'bg-gold text-black border-gold' : 'bg-transparent text-gray-500 border-white/10'
                  }`}
                 >
                   {cat}
                 </button>
               ))}
            </div>

            {/* Feed Dinámico */}
            <div className="space-y-2">
              {activeTab === Category.CRONICAS && (
                items.map(item => <NewsCard key={item.id} item={item} />)
              )}

              {activeTab === Category.GRANDES_VALORES && indicators && (
                <div className="grid grid-cols-2 gap-3">
                   <IndicatorBox label="Unidad Fomento" value={`$${indicators.uf}`} unit="CLP" />
                   <IndicatorBox label="Dólar Obs." value={`$${indicators.dolar}`} unit="CLP" />
                   <IndicatorBox label="UTM Mensual" value={`$${indicators.utm}`} unit="CLP" />
                   <IndicatorBox label="IPC Anual" value={`${indicators.ipc}%`} unit="RATIO" />
                </div>
              )}

              {activeTab === Category.TERRA && (
                <div className="space-y-3">
                   {alerts.length > 0 ? alerts.map((a, i) => (
                     <div key={i} className={`p-4 border ${a.severity === 'ALTA' ? 'border-red-500 bg-red-500/10' : 'border-amber-500/30 bg-amber-500/5'} flex gap-3 items-center`}>
                        <ShieldAlert className={a.severity === 'ALTA' ? 'text-red-500' : 'text-amber-500'} size={20} />
                        <div>
                           <p className="text-xs font-bold uppercase tracking-tighter">{a.title}</p>
                           <p className="text-[9px] mono text-gray-500">{new Date(a.timestamp).toLocaleString()}</p>
                        </div>
                     </div>
                   )) : (
                     <div className="p-10 text-center">
                        <Activity size={32} className="mx-auto text-gray-700 mb-2" />
                        <p className="text-[10px] mono text-gray-600 uppercase">La Tierra duerme en este cuadrante.</p>
                     </div>
                   )}
                </div>
              )}

              {activeTab === Category.VIBRACIONES && (
                <div className="text-center py-10 opacity-40">
                   <Boxes size={40} className="mx-auto mb-4" />
                   <p className="cinzel text-xs tracking-widest">En preparación para el siguiente grado.</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Navegación Inferior (Barra de Grados) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#080808] border-t border-gold/20 h-16 flex items-center justify-around safe-bottom z-50 px-4">
        <button 
          onClick={() => setActiveTab(Category.CRONICAS)}
          className={`flex flex-col items-center gap-1 ${activeTab === Category.CRONICAS ? 'text-gold' : 'text-gray-600'}`}
        >
          <Globe size={20} />
          <span className="text-[8px] mono uppercase font-bold">Mundo</span>
        </button>
        <button 
          onClick={() => setActiveTab(Category.GRANDES_VALORES)}
          className={`flex flex-col items-center gap-1 ${activeTab === Category.GRANDES_VALORES ? 'text-gold' : 'text-gray-600'}`}
        >
          <Activity size={20} />
          <span className="text-[8px] mono uppercase font-bold">Valores</span>
        </button>
        <div className="relative -top-6">
           <div className="bg-gold p-3 rounded-full shadow-2xl shadow-gold/40 border-4 border-[#050505] active:scale-95 transition-transform">
              <Eye size={24} className="text-black" />
           </div>
        </div>
        <button 
          onClick={() => setActiveTab(Category.TERRA)}
          className={`flex flex-col items-center gap-1 ${activeTab === Category.TERRA ? 'text-gold' : 'text-gray-600'}`}
        >
          <Flame size={20} />
          <span className="text-[8px] mono uppercase font-bold">Gaia</span>
        </button>
        <button 
          onClick={() => setActiveTab(Category.VIBRACIONES)}
          className={`flex flex-col items-center gap-1 ${activeTab === Category.VIBRACIONES ? 'text-gold' : 'text-gray-600'}`}
        >
          <Boxes size={20} />
          <span className="text-[8px] mono uppercase font-bold">Obra</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
