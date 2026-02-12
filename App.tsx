
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Eye, 
  Hexagon, 
  Triangle, 
  Globe, 
  TrendingUp, 
  Activity, 
  Zap, 
  Lock, 
  Cpu,
  ShieldAlert,
  Compass
} from 'lucide-react';
import { Category, RadarItem, MarketData, EarthquakeData } from './types';
import { getInitiateInsights } from './services/geminiService';

// --- Helper Components ---

const TickerBar: React.FC<{ markets: MarketData[] }> = ({ markets }) => (
  <div className="w-full bg-black border-y border-gold/30 h-10 flex items-center overflow-hidden whitespace-nowrap z-50 sticky top-0">
    <div className="flex animate-ticker gap-12">
      {markets.map((m, idx) => (
        <div key={idx} className="flex items-center gap-2 text-xs font-bold mono">
          <span className="text-amber-500">{m.symbol}</span>
          <span>{m.price.toFixed(m.category === 'crypto' ? 2 : 4)}</span>
          <span className={m.change24h >= 0 ? 'text-green-500' : 'text-red-500'}>
            {m.change24h >= 0 ? '▲' : '▼'} {Math.abs(m.change24h).toFixed(2)}%
          </span>
        </div>
      ))}
      {/* Repeat for seamless scroll */}
      {markets.map((m, idx) => (
        <div key={`dup-${idx}`} className="flex items-center gap-2 text-xs font-bold mono">
          <span className="text-amber-500">{m.symbol}</span>
          <span>{m.price.toFixed(m.category === 'crypto' ? 2 : 4)}</span>
          <span className={m.change24h >= 0 ? 'text-green-500' : 'text-red-500'}>
            {m.change24h >= 0 ? '▲' : '▼'} {Math.abs(m.change24h).toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  </div>
);

const SidebarItem: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
  onClick: () => void 
}> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-4 py-4 border-l-2 transition-all ${
      active 
        ? 'border-amber-500 bg-amber-500/10 text-amber-500' 
        : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'
    }`}
  >
    {icon}
    <span className="cinzel text-xs tracking-[0.2em] uppercase font-bold">{label}</span>
  </button>
);

const NewsCard: React.FC<{ item: RadarItem }> = ({ item }) => (
  <div className="bg-[#0a0a0a] border border-gold/20 p-4 mb-4 group hover:border-gold/50 transition-all cursor-pointer relative overflow-hidden">
    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30">
      <Hexagon size={40} className="text-amber-500" />
    </div>
    <div className="flex justify-between items-start mb-2">
      <span className="text-[10px] mono text-amber-500/70 uppercase tracking-widest">{item.source}</span>
      <span className="text-[10px] mono text-gray-600">{new Date(item.timestamp).toLocaleTimeString()}</span>
    </div>
    <h3 className="text-lg font-bold leading-tight mb-2 group-hover:text-amber-200 transition-colors">
      {item.headline}
    </h3>
    <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed mb-3">
      {item.content}
    </p>
    <div className="flex items-center gap-2">
       <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[10px] mono text-amber-600 hover:text-amber-400 uppercase tracking-tighter">
         [ VERIFICAR ORIGEN ]
       </a>
    </div>
  </div>
);

// --- Main App Component ---

const App: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<Category>(Category.NEWS);
  const [items, setItems] = useState<RadarItem[]>([]);
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [earthquakes, setEarthquakes] = useState<EarthquakeData[]>([]);
  const [insights, setInsights] = useState<{ insights: any[], globalMood: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMarkets = async () => {
    try {
      // Frankfurter (Fiat)
      const resFiat = await fetch('https://api.frankfurter.app/latest?from=USD');
      const dataFiat = await resFiat.json();
      
      // CoinGecko (Crypto)
      const resCrypto = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,cardano,solana&vs_currencies=usd&include_24hr_change=true');
      const dataCrypto = await resCrypto.json();

      const newMarkets: MarketData[] = [
        { symbol: 'BTC', price: dataCrypto.bitcoin.usd, change24h: dataCrypto.bitcoin.usd_24h_change, category: 'crypto' },
        { symbol: 'ETH', price: dataCrypto.ethereum.usd, change24h: dataCrypto.ethereum.usd_24h_change, category: 'crypto' },
        { symbol: 'SOL', price: dataCrypto.solana.usd, change24h: dataCrypto.solana.usd_24h_change, category: 'crypto' },
        { symbol: 'EUR/USD', price: dataFiat.rates.EUR, change24h: 0.1, category: 'fiat' },
        { symbol: 'GBP/USD', price: dataFiat.rates.GBP, change24h: -0.05, category: 'fiat' },
      ];
      setMarkets(newMarkets);
    } catch (e) {
      console.error("Markets error", e);
    }
  };

  const fetchNews = async () => {
    try {
      // For Demo purposes without backend, we simulate RSS processing or use JSON APIs
      // Using Reddit JSON for live world news as it's CORS-friendly and reliable
      const resReddit = await fetch('https://www.reddit.com/r/worldnews/hot.json?limit=15');
      const dataReddit = await resReddit.json();
      
      const newsItems: RadarItem[] = dataReddit.data.children.map((child: any) => ({
        id: child.data.id,
        source: 'REDDIT_WORLD_NEWS',
        type: 'ARTICLE',
        headline: child.data.title,
        content: child.data.selftext || `Resumen de eventos globales en ${child.data.subreddit}. Relevancia alta para el gran diseño.`,
        timestamp: child.data.created_utc * 1000,
        category: Category.NEWS,
        url: `https://reddit.com${child.data.permalink}`
      }));
      setItems(newsItems);
    } catch (e) {
      console.error("News error", e);
    }
  };

  const fetchEarthquakes = async () => {
    try {
      const res = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson');
      const data = await res.json();
      const quakes = data.features.slice(0, 5).map((f: any) => ({
        place: f.properties.place,
        mag: f.properties.mag,
        time: f.properties.time,
        url: f.properties.url
      }));
      setEarthquakes(quakes);
    } catch (e) {
      console.error("Quakes error", e);
    }
  };

  const generateAIInsights = useCallback(async () => {
    if (items.length > 0 && !insights) {
      const res = await getInitiateInsights(items.slice(0, 5));
      if (res) setInsights(res);
    }
  }, [items, insights]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchMarkets(), fetchNews(), fetchEarthquakes()]);
      setLoading(false);
    };
    init();
    
    const interval = setInterval(() => {
      fetchMarkets();
      fetchNews();
      fetchEarthquakes();
    }, 60000 * 5); // 5 mins
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!loading) {
      generateAIInsights();
    }
  }, [loading, generateAIInsights]);

  return (
    <div className="min-h-screen flex flex-col">
      <TickerBar markets={markets} />
      
      <header className="px-6 py-4 flex justify-between items-center bg-black border-b border-gold/10">
        <div className="flex items-center gap-4">
          <div className="p-2 border border-amber-500 rounded-sm">
            <Triangle size={24} className="text-amber-500" />
          </div>
          <div>
            <h1 className="cinzel text-xl font-bold tracking-[0.3em] text-amber-500 glow-gold">PROJECT 33</h1>
            <p className="text-[10px] mono text-gray-600 uppercase tracking-widest">Global Architecture Surveillance Terminal</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right hidden md:block">
            <p className="text-[10px] mono text-gray-500 uppercase">Synchronicity Status</p>
            <p className="text-xs font-bold text-green-500 mono">ONLINE // ALIGNED</p>
          </div>
          <div className="w-10 h-10 rounded-full border border-gold/30 flex items-center justify-center bg-amber-500/5">
            <Eye size={20} className="text-amber-500" />
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Navigation - The Pillars */}
        <nav className="w-20 md:w-64 border-r border-gold/10 bg-[#070707] flex flex-col shrink-0">
          <SidebarItem 
            icon={<Globe size={20} />} 
            label="Mundo" 
            active={activeCategory === Category.NEWS} 
            onClick={() => setActiveCategory(Category.NEWS)} 
          />
          <SidebarItem 
            icon={<TrendingUp size={20} />} 
            label="Mercados" 
            active={activeCategory === Category.MARKETS} 
            onClick={() => setActiveCategory(Category.MARKETS)} 
          />
          <SidebarItem 
            icon={<Activity size={20} />} 
            label="Geología" 
            active={activeCategory === Category.GEOLOGY} 
            onClick={() => setActiveCategory(Category.GEOLOGY)} 
          />
          <SidebarItem 
            icon={<Zap size={20} />} 
            label="Tendencias" 
            active={activeCategory === Category.TRENDS} 
            onClick={() => setActiveCategory(Category.TRENDS)} 
          />
          
          <div className="mt-auto p-4 border-t border-gold/10">
            <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-sm flex flex-col items-center gap-2">
              <Lock size={16} className="text-amber-500" />
              <span className="text-[9px] mono text-amber-500 uppercase tracking-widest text-center">Nivel de Acceso: Iniciado</span>
            </div>
          </div>
        </nav>

        {/* Main Feed - The Temple */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#050505]">
          <div className="max-w-4xl mx-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                <Compass size={48} className="text-amber-500 mb-4 animate-spin" />
                <p className="cinzel text-amber-500 tracking-widest uppercase">Consultando el Oráculo...</p>
              </div>
            ) : (
              <>
                <div className="mb-8 border-b border-gold/20 pb-4 flex justify-between items-end">
                   <div>
                      <h2 className="cinzel text-2xl font-bold uppercase tracking-[0.2em] mb-1">
                        {activeCategory === Category.NEWS && 'Crónicas Globales'}
                        {activeCategory === Category.MARKETS && 'Pulso de los Metales'}
                        {activeCategory === Category.GEOLOGY && 'Susurros de Gaia'}
                        {activeCategory === Category.TRENDS && 'Vibración Colectiva'}
                      </h2>
                      <p className="text-xs mono text-gray-500 uppercase">Geometría informativa en tiempo real</p>
                   </div>
                   <div className="text-xs mono text-amber-600">
                     [ 33.33.33 N | 00.00.00 W ]
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                   {activeCategory === Category.MARKETS && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        {markets.map((m, idx) => (
                           <div key={idx} className="bg-black border border-gold/20 p-4 rounded-sm flex justify-between items-center">
                              <div>
                                 <p className="text-[10px] text-gray-500 mono uppercase">{m.category}</p>
                                 <h4 className="text-lg font-bold text-amber-500">{m.symbol}</h4>
                              </div>
                              <div className="text-right">
                                 <p className="text-xl mono font-bold">${m.price.toLocaleString()}</p>
                                 <p className={`text-xs mono ${m.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                   {m.change24h >= 0 ? '+' : ''}{m.change24h.toFixed(2)}%
                                 </p>
                              </div>
                           </div>
                        ))}
                     </div>
                   )}

                   {activeCategory === Category.GEOLOGY && (
                     <div className="space-y-4 mb-8">
                        <div className="bg-red-900/10 border border-red-500/30 p-4 rounded-sm flex items-center gap-4">
                           <ShieldAlert className="text-red-500" />
                           <div>
                              <p className="text-xs font-bold text-red-500 uppercase">Alertas de Estabilidad Planetaria</p>
                              <p className="text-xs text-red-200/70">Monitoreo activo de placas y eventos cinéticos.</p>
                           </div>
                        </div>
                        {earthquakes.map((q, idx) => (
                          <div key={idx} className="bg-black border border-white/5 p-4 flex justify-between items-center group hover:bg-white/5 cursor-default">
                            <div className="flex gap-4 items-center">
                               <div className={`w-10 h-10 flex items-center justify-center border font-bold mono ${q.mag >= 5 ? 'border-red-500 text-red-500' : 'border-gray-500 text-gray-400'}`}>
                                  {q.mag.toFixed(1)}
                               </div>
                               <div>
                                  <p className="text-sm font-semibold">{q.place}</p>
                                  <p className="text-[10px] text-gray-500 mono">{new Date(q.time).toLocaleString()}</p>
                               </div>
                            </div>
                            <a href={q.url} target="_blank" className="text-xs text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">DATA</a>
                          </div>
                        ))}
                     </div>
                   )}

                   {items.filter(i => activeCategory === Category.NEWS || i.category === activeCategory).map((item) => (
                     <NewsCard key={item.id} item={item} />
                   ))}
                </div>
              </>
            )}
          </div>
        </main>

        {/* Sidebar Insights - Initiate Wisdom */}
        <aside className="w-80 border-l border-gold/10 bg-[#070707] hidden xl:flex flex-col p-6 overflow-y-auto">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Cpu size={18} className="text-amber-500" />
              <h3 className="cinzel text-sm font-bold tracking-widest text-amber-500">PROCESAMIENTO LUZ</h3>
            </div>
            
            {insights ? (
              <div className="space-y-6">
                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-sm">
                   <p className="text-[10px] mono text-amber-600 mb-1 uppercase">Frecuencia Global</p>
                   <p className="text-xs font-semibold leading-relaxed text-amber-100 italic">"{insights.globalMood}"</p>
                </div>

                <div className="space-y-4">
                   {insights.insights.map((ins, i) => (
                     <div key={i} className="relative pl-6">
                        <div className="absolute left-0 top-1 text-amber-500"><Hexagon size={12} fill="currentColor" /></div>
                        <h4 className="text-[11px] font-bold uppercase tracking-wider mb-1 text-gray-300">{ins.title}</h4>
                        <p className="text-[11px] text-gray-500 leading-relaxed italic">{ins.insight}</p>
                     </div>
                   ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-white/5 rounded-sm" />
                ))}
              </div>
            )}
          </div>

          <div className="mt-auto">
            <div className="text-[10px] mono text-gray-600 leading-loose border-t border-white/5 pt-4">
              <p>LA VERDAD NO ES PARA TODOS.</p>
              <p>SOLO PARA QUIENES SABEN MIRAR.</p>
              <p className="text-amber-700 mt-2">SIGIL: 0x93A...E2</p>
            </div>
          </div>
        </aside>
      </div>

      <footer className="h-6 bg-amber-500 flex items-center px-4 justify-between z-50">
        <span className="text-[10px] font-bold text-black mono">STATUS: SECURE_LINK_ACTIVE</span>
        <div className="flex gap-4">
           <span className="text-[10px] font-bold text-black mono">ENTROPY: 0.1293</span>
           <span className="text-[10px] font-bold text-black mono">COORD: 33°N</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
