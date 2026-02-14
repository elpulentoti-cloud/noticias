
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Compass, 
  Eye, 
  BarChart3, 
  Globe2, 
  History, 
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Sun,
  Settings as SettingsIcon,
  Zap,
  Waves,
  CloudLightning,
  Activity,
  ShieldCheck,
  ShieldAlert,
  TrendingUp,
  Search,
  Newspaper,
  Edit3,
  Clock
} from 'lucide-react';
import { Category, RadarItem, ChileIndicators, AlertData, DataSource, SourceType, UserSettings, AlertType } from './types';
import { getTraditionInsights } from './services/geminiService';

const PROXY_URL = "https://api.allorigins.win/get?url=";

const DEFAULT_SOURCES: DataSource[] = [
  { id: 'reddit-chile', name: 'Oriente Reddit', url: 'https://www.reddit.com/r/chile/new.json?limit=12', type: SourceType.API, enabled: true, category: Category.CRONICAS },
  { id: 'cooperativa-noticias', name: 'Cooperativa Noticias', url: 'https://www.cooperativa.cl/noticias/site/tax/port/all/rss____1.xml', type: SourceType.RSS, enabled: true, category: Category.CRONICAS },
  { id: 'google-trends-cl', name: 'Tendencias (Google CL)', url: 'https://trends.google.com/trends/trendingsearches/daily/rss?geo=CL', type: SourceType.RSS, enabled: true, category: Category.VANGUARDIA },
  { id: 'mindicador', name: 'Tesoro Nacional', url: 'https://mindicador.cl/api', type: SourceType.SYSTEM, enabled: true, category: Category.PATRIMONIO },
  { id: 'usgs-gaia', name: 'Vibraciones Gaia (USGS)', url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson', type: SourceType.API, enabled: true, category: Category.GAIA },
  { id: 'dmc-clima', name: 'Alerta DMC (Meteorología)', url: 'https://www.meteochile.gob.cl/js/avisosAvisos.json', type: SourceType.API, enabled: true, category: Category.GAIA },
  { id: 'shoa-mar', name: 'SHOA (Estado del Mar)', url: 'https://www.shoa.cl/php/rss.php', type: SourceType.RSS, enabled: true, category: Category.GAIA },
  { id: 'noaa-solar', name: 'Clima Espacial (NOAA)', url: 'https://services.swpc.noaa.gov/products/alerts.json', type: SourceType.API, enabled: true, category: Category.GAIA }
];

export default function App() {
  const [sources, setSources] = useState<DataSource[]>(() => {
    const saved = localStorage.getItem('bch_sources');
    return saved ? JSON.parse(saved) : DEFAULT_SOURCES;
  });

  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('bch_settings');
    return saved ? JSON.parse(saved) : { 
      refreshInterval: 15, 
      soundEnabled: true, 
      soundVolume: 0.5,
      notificationsEnabled: false,
      notificationPriorityOnly: true
    };
  });

  const [activeTab, setActiveTab] = useState<Category>(Category.CRONICAS);
  const [items, setItems] = useState<RadarItem[]>([]);
  const [indicators, setIndicators] = useState<ChileIndicators | null>(null);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [tradition, setTradition] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  const seenIds = useRef<Set<string>>(new Set());
  const lastFetchTimestamps = useRef<Record<string, number>>({});
  const audioCtx = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem('bch_sources', JSON.stringify(sources));
  }, [sources]);

  useEffect(() => {
    localStorage.setItem('bch_settings', JSON.stringify(settings));
  }, [settings]);

  const playMasonicChime = useCallback(async (isCritical: boolean = false) => {
    if (!settings.soundEnabled) return;
    try {
      if (!audioCtx.current || audioCtx.current.state === 'closed') {
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtx.current.state === 'suspended') await audioCtx.current.resume();
      
      const ctx = audioCtx.current;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(settings.soundVolume * (isCritical ? 0.3 : 0.15), ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (isCritical ? 1.5 : 0.8));
      gain.connect(ctx.destination);

      const frequencies = isCritical ? [528, 660, 792, 1056] : [528, 660];
      
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = i === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.connect(gain);
        osc.start();
        osc.stop(ctx.currentTime + (isCritical ? 1.5 : 0.8));
      });
    } catch (e) {}
  }, [settings.soundEnabled, settings.soundVolume]);

  const requestNotificationPermission = useCallback(async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === 'granted') {
      setSettings(prev => ({ ...prev, notificationsEnabled: !prev.notificationsEnabled }));
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setSettings(prev => ({ ...prev, notificationsEnabled: true }));
      }
    }
    playMasonicChime();
  }, [playMasonicChime]);

  const notifyPlancha = useCallback((title: string, body: string, severity: 'ALTA' | 'MEDIA' | 'INFO') => {
    if (!settings.notificationsEnabled) return;
    if (settings.notificationPriorityOnly && severity !== 'ALTA') return;

    if (Notification.permission === 'granted') {
      new Notification(`RADAR 33 | ${String(title)}`, { body: String(body), silent: true });
      playMasonicChime(severity === 'ALTA');
    }
  }, [settings.notificationsEnabled, settings.notificationPriorityOnly, playMasonicChime]);

  const syncAll = async (forceAll = false) => {
    setLoading(true);
    const now = Date.now();
    const newItems: RadarItem[] = [...items];
    let currentAlerts: AlertData[] = [...alerts];
    let newIndicators: ChileIndicators | null = indicators;
    let itemsChanged = false;

    try {
      for (const source of sources) {
        if (!source.enabled) continue;

        const intervalMs = (source.customRefreshInterval || settings.refreshInterval) * 60 * 1000;
        const lastSync = lastFetchTimestamps.current[source.id] || 0;

        if (!forceAll && now - lastSync < intervalMs) continue;

        try {
          const targetUrl = (source.type === SourceType.RSS || source.id === 'dmc-clima') 
            ? `${PROXY_URL}${encodeURIComponent(source.url)}` 
            : source.url;

          const res = await fetch(targetUrl).catch(() => null);
          if (!res) continue;
          
          const rawData = await res.json().catch(() => null);
          const data = (source.type === SourceType.RSS || source.id === 'dmc-clima') ? (rawData?.contents || rawData) : rawData;
          if (!data) continue;

          lastFetchTimestamps.current[source.id] = now;

          if (source.id === 'mindicador') {
            newIndicators = {
              uf: Number(data.uf?.valor || 0),
              dolar: Number(data.dolar?.valor || 0),
              utm: Number(data.utm?.valor || 0),
              ipc: Number(data.ipc?.valor || 0),
              ivp: Number(data.ivp?.valor || 0)
            };
          } else if (source.id === 'reddit-chile') {
            const news = (data.data?.children || []).map((c: any) => ({
              id: String(c.data.id),
              source: String(source.name),
              headline: String(c.data.title),
              content: String(c.data.selftext),
              timestamp: Number(c.data.created_utc || 0) * 1000,
              category: Category.CRONICAS,
              url: `https://reddit.com${c.data.permalink}`
            }));
            const filtered = newItems.filter(i => i.source !== source.name);
            newItems.length = 0;
            newItems.push(...filtered, ...news);
            itemsChanged = true;
          } else if (source.id === 'cooperativa-noticias') {
            const parser = new DOMParser();
            const xml = parser.parseFromString(data, "text/xml");
            const entries = xml.querySelectorAll("item");
            const news = Array.from(entries).map(item => ({
              id: `coop-${item.querySelector("guid")?.textContent || Math.random()}`,
              source: String(source.name),
              headline: String(item.querySelector("title")?.textContent || 'Noticia'),
              content: String(item.querySelector("description")?.textContent || ''),
              timestamp: new Date(item.querySelector("pubDate")?.textContent || Date.now()).getTime(),
              category: Category.CRONICAS,
              url: item.querySelector("link")?.textContent || '#'
            }));
            const filtered = newItems.filter(i => i.source !== source.name);
            newItems.length = 0;
            newItems.push(...filtered, ...news);
            itemsChanged = true;
          } else if (source.id === 'google-trends-cl') {
            const parser = new DOMParser();
            const xml = parser.parseFromString(data, "text/xml");
            const entries = xml.querySelectorAll("item");
            const trends = Array.from(entries).map(item => ({
              id: `trend-${item.querySelector("title")?.textContent}-${Date.now()}`,
              source: 'Vanguardia Google',
              headline: String(item.querySelector("title")?.textContent || 'Tendencia'),
              content: String(item.querySelector("description")?.textContent || ''),
              timestamp: new Date(item.querySelector("pubDate")?.textContent || Date.now()).getTime(),
              category: Category.VANGUARDIA,
              url: item.querySelector("link")?.textContent || '#',
              extra: String(item.getElementsByTagName("ht:approx_traffic")[0]?.textContent || '')
            }));
            const filtered = newItems.filter(i => i.category !== Category.VANGUARDIA);
            newItems.length = 0;
            newItems.push(...filtered, ...trends);
            itemsChanged = true;
          } else if (source.id === 'usgs-gaia') {
            const quakes: AlertData[] = (data.features || [])
              .filter((f: any) => f.properties.place.toLowerCase().includes('chile'))
              .map((f: any) => ({
                id: String(f.id),
                title: `Sismo: ${f.properties.mag}`,
                desc: String(f.properties.place),
                severity: (f.properties.mag > 6.0 ? 'ALTA' : 'MEDIA') as 'ALTA' | 'MEDIA' | 'INFO',
                timestamp: Number(f.properties.time),
                type: 'SISMO' as AlertType,
                source: 'USGS'
              }));
            currentAlerts = [...currentAlerts.filter(a => a.source !== 'USGS'), ...quakes];
          } else if (source.id === 'dmc-clima') {
            const dmcData = typeof data === 'string' ? JSON.parse(data) : data;
            if (dmcData?.avisos) {
              const weather = dmcData.avisos.map((a: any) => ({
                id: `dmc-${a.id}`,
                title: String(a.titulo || 'Alerta Climática'),
                desc: String(a.descripcion || ''),
                severity: (a.prioridad === 'roja' ? 'ALTA' : 'MEDIA') as 'ALTA' | 'MEDIA' | 'INFO',
                timestamp: Date.now(),
                type: 'CLIMA' as AlertType,
                source: 'DMC'
              }));
              currentAlerts = [...currentAlerts.filter(a => a.source !== 'DMC'), ...weather];
            }
          } else if (source.id === 'shoa-mar') {
            const parser = new DOMParser();
            const xml = parser.parseFromString(data, "text/xml");
            const entries = xml.querySelectorAll("item");
            const shoa = Array.from(entries).map(item => ({
              id: `shoa-${item.querySelector("guid")?.textContent || Math.random()}`,
              title: String(item.querySelector("title")?.textContent || 'Estado del Mar'),
              desc: String(item.querySelector("description")?.textContent || ''),
              severity: (item.querySelector("title")?.textContent?.toLowerCase().includes('alerta') ? 'ALTA' : 'INFO') as 'ALTA' | 'MEDIA' | 'INFO',
              timestamp: new Date(item.querySelector("pubDate")?.textContent || Date.now()).getTime(),
              type: 'MAR' as AlertType,
              source: 'SHOA'
            }));
            currentAlerts = [...currentAlerts.filter(a => a.source !== 'SHOA'), ...shoa];
          } else if (source.id === 'noaa-solar') {
             const solarAlerts: AlertData[] = (data || []).slice(0, 5).map((a: any) => {
                const message = String(a.message || '');
                const isUrgent = message.toLowerCase().includes('warning') || message.toLowerCase().includes('alert');
                return {
                  id: `noaa-${a.product_id}-${a.issue_datetime}`,
                  title: String(message.split('\n')[0].substring(0, 50) || 'Evento Solar'),
                  desc: String(message.split('\n').slice(0, 2).join(' ')),
                  severity: (isUrgent ? 'ALTA' : 'INFO') as 'ALTA' | 'MEDIA' | 'INFO',
                  timestamp: new Date(a.issue_datetime + ' UTC').getTime(),
                  type: 'SOLAR' as AlertType,
                  source: 'NOAA SWPC'
                };
             });
             currentAlerts = [...currentAlerts.filter(a => a.source !== 'NOAA SWPC'), ...solarAlerts];
          }
        } catch (e) {
          console.warn(`Error en fuente ${source.name}:`, e);
        }
      }

      const finalAlerts = currentAlerts.sort((a, b) => b.timestamp - a.timestamp);
      finalAlerts.forEach(alert => {
        if (!seenIds.current.has(alert.id)) {
          if (!forceAll) notifyPlancha(`GAIA: ${alert.source}`, alert.title, alert.severity);
          seenIds.current.add(alert.id);
        }
      });

      if (itemsChanged) setItems([...newItems]);
      setAlerts([...finalAlerts]);
      if (newIndicators) setIndicators({...newIndicators});
      
      if (itemsChanged && newItems.length > 0) {
        const newsSlice = newItems.filter(i => i.category === Category.CRONICAS).slice(0, 5);
        if (newsSlice.length > 0) {
          const insights = await getTraditionInsights(newsSlice);
          if (insights) setTradition(insights);
        }
      }
      setLastUpdate(new Date());
    } catch (e) {
      console.error("Fallo Nodo Austral:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncAll(true);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => syncAll(false), 60 * 1000); 
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [settings.refreshInterval, sources]);

  const updateSource = (id: string, updates: Partial<DataSource>) => {
    setSources(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const tesoroSource = sources.find(s => s.id === 'mindicador');
  const highPriorityAlert = alerts.find(a => a.severity === 'ALTA');

  return (
    <div className="flex flex-col h-screen max-h-screen bg-[#00050D] text-[#EAEAEA] selection:bg-[#C5A059]/40 relative overflow-hidden">
      
      {highPriorityAlert && activeTab !== Category.AJUSTES && (
        <div className="bg-red-700 text-white px-6 py-2 flex items-center justify-between z-[100] font-black uppercase tracking-[0.2em] text-[10px] animate-pulse border-b-2 border-[#00050D]">
          <div className="flex items-center gap-3">
            <AlertTriangle size={14} className="fill-white" />
            <span>ALERTA CRÍTICA: {String(highPriorityAlert.title)}</span>
          </div>
          <span className="mono bg-white text-red-700 px-2 py-0.5 rounded">MODO_VIGILANCIA</span>
        </div>
      )}

      <header className="bg-[#000B1E] px-6 py-6 border-b-2 border-[#C5A059]/40 shadow-2xl flex justify-between items-center relative z-50">
        <div className="flex items-center gap-4">
          <div className="bg-[#00050D] p-2.5 rounded-xl border border-[#C5A059] shadow-inner cursor-pointer active:scale-90 transition-all" onClick={() => { syncAll(true); playMasonicChime(); }}>
            <Compass size={28} className="text-[#C5A059]" />
          </div>
          <div>
            <h1 className="cinzel text-xl font-black tracking-[0.2em] text-[#C5A059]">RADAR 33</h1>
            <p className="text-[8px] mono text-[#C5A059]/50 font-bold uppercase tracking-[0.4em] mt-1">Ojo del Arquitecto</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={requestNotificationPermission} className={`p-2.5 rounded-full border ${settings.notificationsEnabled ? 'text-[#C5A059] border-[#C5A059] bg-[#C5A059]/10' : 'text-white/10 border-white/5'}`}>
            {settings.notificationsEnabled ? <Bell size={18} /> : <BellOff size={18} />}
          </button>
          <button onClick={() => { setSettings(s => ({ ...s, soundEnabled: !s.soundEnabled })); playMasonicChime(); }} className={`p-2.5 rounded-full border ${settings.soundEnabled ? 'text-[#C5A059] border-[#C5A059] bg-[#C5A059]/10' : 'text-white/10 border-white/5'}`}>
            {settings.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </header>

      <div className="bg-[#00050D] border-b border-[#C5A059]/10 h-10 flex items-center overflow-hidden">
        <div className="animate-ticker">
          {[1, 2].map(l => (
            <div key={l} className="flex gap-14 px-8 items-center">
              {indicators ? (
                <>
                  <TickerVal label={String(tesoroSource?.name || "UF")} val={`$${indicators.uf.toLocaleString()}`} />
                  <TickerVal label="DÓLAR" val={`$${indicators.dolar}`} />
                  <TickerVal label="UTM" val={`$${indicators.utm.toLocaleString()}`} />
                  <div className="flex items-center gap-2 text-[9px] text-[#C5A059] font-bold opacity-60 uppercase tracking-widest">
                    <Sun size={12} /> PULSO: {settings.refreshInterval}m • {lastUpdate.toLocaleTimeString()}
                  </div>
                </>
              ) : <span className="text-[10px] uppercase tracking-[0.3em] opacity-20">Alineando los metales...</span>}
            </div>
          ))}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto pb-32 no-scrollbar bg-[radial-gradient(circle_at_top,_#000B1E_0%,_#00050D_100%)] relative z-10">
        <div className="p-6 space-y-8 max-w-2xl mx-auto">
          {loading && !items.length ? (
            <div className="flex flex-col items-center justify-center h-[50vh] opacity-20 animate-pulse">
              <RefreshCw size={60} className="animate-spin text-[#C5A059]" />
              <p className="cinzel mt-6 tracking-[0.5em]">Consultando la Gran Obra...</p>
            </div>
          ) : activeTab === Category.AJUSTES ? (
            <div className="space-y-10">
              <h2 className="cinzel text-xl text-[#C5A059] border-b border-[#C5A059]/20 pb-2">Ajustes de la Cantera</h2>
              
              <div className="bg-[#000B1E] p-6 rounded-2xl border border-[#C5A059]/10 space-y-8">
                 <div>
                    <h3 className="text-[12px] font-black uppercase tracking-widest text-[#C5A059] mb-6 flex items-center gap-2">
                       <Zap size={14} /> Control de Sintonía Global
                    </h3>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[11px] font-black uppercase tracking-widest text-white/70">Frecuencia General</span>
                      <span className="mono text-[#C5A059]">{settings.refreshInterval}m</span>
                    </div>
                    <input type="range" min="1" max="60" value={settings.refreshInterval} onChange={(e) => setSettings(s => ({ ...s, refreshInterval: parseInt(e.target.value) }))} className="w-full h-1.5 bg-white/5 rounded-lg appearance-none accent-[#C5A059]" />
                 </div>

                 <button onClick={() => setSettings(s => ({ ...s, notificationPriorityOnly: !s.notificationPriorityOnly }))} className="w-full flex items-center justify-between p-4 rounded-xl border border-white/5 bg-[#00050D]">
                    <div className="text-left">
                      <p className="text-[11px] font-black uppercase tracking-widest text-white">Nivel de Notificación</p>
                      <p className="text-[9px] text-white/40 mt-1 uppercase">{settings.notificationPriorityOnly ? "Solo Alta Prioridad" : "Notificar Todo"}</p>
                    </div>
                    {settings.notificationPriorityOnly ? <ShieldAlert className="text-red-500" /> : <ShieldCheck className="text-[#C5A059]" />}
                 </button>
              </div>

              {tesoroSource && (
                <div className="bg-[#000B1E] p-6 rounded-2xl border border-[#C5A059]/10 space-y-6">
                  <h3 className="text-[12px] font-black uppercase tracking-widest text-[#C5A059] mb-4 flex items-center gap-2">
                     <BarChart3 size={14} /> Gestión de Indicadores Económicos
                  </h3>
                  
                  <div className="space-y-4">
                    <label className="block">
                      <span className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-2 block">Nombre de la Fuente</span>
                      <div className="relative">
                        <Edit3 className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C5A059]/40" size={14} />
                        <input 
                          type="text" 
                          value={String(tesoroSource.name)} 
                          onChange={(e) => updateSource(tesoroSource.id, { name: String(e.target.value) })}
                          className="w-full bg-[#00050D] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm font-bold focus:border-[#C5A059] outline-none transition-all"
                        />
                      </div>
                    </label>

                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-white/40 tracking-widest flex items-center gap-2">
                           <Clock size={12} /> Intervalo Independiente
                        </span>
                        <span className="mono text-[#C5A059] text-[11px] font-bold">{Number(tesoroSource.customRefreshInterval || settings.refreshInterval)}m</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="120" 
                        value={Number(tesoroSource.customRefreshInterval || settings.refreshInterval)} 
                        onChange={(e) => updateSource(tesoroSource.id, { customRefreshInterval: parseInt(e.target.value) })}
                        className="w-full h-1.5 bg-white/5 rounded-lg appearance-none accent-[#C5A059]" 
                      />
                      <p className="text-[9px] text-white/20 uppercase tracking-tighter">Define qué tan seguido se consultan los metales de la nación.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {tradition && activeTab === Category.CRONICAS && tradition.efemeride && (
                <div className="bg-[#000B1E] p-7 rounded-2xl border-2 border-[#C5A059]/20 shadow-2xl relative overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 opacity-[0.05] text-[#C5A059]"><Eye size={180} /></div>
                  <div className="flex items-center gap-2 mb-4">
                    <History size={16} className="text-[#C5A059]" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C5A059]">Revelación del Septentrión</span>
                  </div>
                  <h2 className="text-2xl font-black cinzel text-white mb-3">{String(tradition.efemeride.titulo)}</h2>
                  <p className="text-sm text-white/70 italic mb-6">"{String(tradition.efemeride.descripcion)}"</p>
                  <div className="bg-[#00050D] border-l-4 border-[#C5A059] p-4 rounded-r-xl">
                    <p className="text-[13px] font-bold text-[#C5A059] leading-snug">{String(tradition.directriz || '')}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 sticky top-0 bg-[#00050D]/80 backdrop-blur-xl z-40 border-b border-white/5">
                {Object.values(Category).filter(c => c !== Category.AJUSTES).map((cat) => (
                  <button key={cat} onClick={() => { setActiveTab(cat); playMasonicChime(); }} className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border-2 transition-all shrink-0 ${activeTab === cat ? 'bg-[#C5A059] text-[#00050D] border-[#C5A059]' : 'bg-transparent text-white/30 border-white/5'}`}>{String(cat)}</button>
                ))}
              </div>

              <div className="space-y-5">
                {activeTab === Category.CRONICAS && items.filter(i => i.category === Category.CRONICAS).map(item => (
                  <div key={item.id} className="bg-[#000B1E]/60 border border-white/5 p-6 rounded-2xl group shadow-xl">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] mono text-[#C5A059] font-black uppercase tracking-widest flex items-center gap-2"><Newspaper size={10} /> {String(item.source)}</span>
                      <span className="text-[9px] text-white/20">{new Date(item.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <h3 className="text-base font-bold text-white mb-4 group-hover:text-[#C5A059] transition-colors">{String(item.headline)}</h3>
                    <a href={String(item.url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[10px] font-black text-[#C5A059] uppercase border border-[#C5A059]/10 px-4 py-2 rounded-lg hover:bg-[#C5A059] hover:text-[#00050D] transition-all">Sintonizar <ArrowUpRight size={14} /></a>
                  </div>
                ))}

                {activeTab === Category.VANGUARDIA && items.filter(i => i.category === Category.VANGUARDIA).map(item => (
                  <div key={item.id} className="bg-[#000B1E]/60 border border-white/5 p-6 rounded-2xl group shadow-xl relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-4 opacity-5"><TrendingUp size={64} /></div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] mono text-[#C5A059] font-black uppercase tracking-widest flex items-center gap-2"><Search size={10} /> {String(item.source)}</span>
                      {item.extra && <span className="text-[9px] bg-[#C5A059]/10 text-[#C5A059] px-2 py-0.5 rounded font-black">{String(item.extra)} BÚSQUEDAS</span>}
                    </div>
                    <h3 className="text-lg font-black cinzel text-white mb-2 group-hover:text-[#C5A059] transition-colors">{String(item.headline)}</h3>
                    <p className="text-[11px] text-white/50 line-clamp-2 mb-4 uppercase">{String(item.content).replace(/<[^>]*>?/gm, '')}</p>
                    <a href={String(item.url)} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-[#C5A059] uppercase hover:underline">Examinar Tendencia <ArrowUpRight className="inline" size={14} /></a>
                  </div>
                ))}

                {activeTab === Category.GAIA && (
                  <div className="space-y-4">
                    {alerts.length === 0 ? <p className="text-center opacity-20 py-10">Gaia permanece en sintonía...</p> : alerts.map(a => (
                      <div key={a.id} className={`p-6 rounded-2xl border-l-4 ${a.severity === 'ALTA' ? 'border-red-600 bg-red-600/5' : 'border-[#C5A059] bg-white/5'} flex gap-6 shadow-xl`}>
                        <div className={`p-4 rounded-xl flex items-center justify-center h-fit ${a.severity === 'ALTA' ? 'bg-red-600' : 'bg-[#C5A059]'}`}>
                          {a.type === 'SISMO' ? <Activity className="text-white" /> : a.type === 'MAR' ? <Waves className="text-white" /> : a.type === 'SOLAR' ? <Sun className="text-white" /> : <CloudLightning className="text-white" />}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-base font-black text-white">{String(a.title)}</h4>
                          <p className="text-[11px] text-white/60 uppercase mt-1">{String(a.desc || '')}</p>
                          <p className="text-[9px] text-[#C5A059] mt-3 font-black">{new Date(a.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === Category.PATRIMONIO && indicators && (
                  <div className="grid grid-cols-1 gap-4">
                    <MetricCard label={String(tesoroSource?.name || "Unidad de Fomento")} value={`$${indicators.uf.toLocaleString()}`} />
                    <MetricCard label="Dólar Oriente" value={`$${indicators.dolar}`} />
                    <MetricCard label="UTM Nodo" value={`$${indicators.utm.toLocaleString()}`} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-[#000B1E] border-t-2 border-[#C5A059] h-24 flex items-center justify-around safe-bottom z-50 shadow-2xl px-6">
        <NavBtn active={activeTab === Category.CRONICAS} onClick={() => setActiveTab(Category.CRONICAS)} icon={<Globe2 size={22}/>} label="Crónicas" />
        <NavBtn active={activeTab === Category.VANGUARDIA} onClick={() => setActiveTab(Category.VANGUARDIA)} icon={<TrendingUp size={22}/>} label="Vanguardia" />
        <div className="relative -top-8">
           <div onClick={() => { syncAll(true); playMasonicChime(); }} className="bg-[#C5A059] p-5 rounded-full shadow-[0_0_30px_rgba(197,160,89,0.3)] border-4 border-[#000B1E] active:scale-90 cursor-pointer group">
              <Eye size={36} className="text-[#000B1E] group-hover:rotate-180 transition-transform duration-700" />
           </div>
           {highPriorityAlert && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full border-2 border-[#000B1E] animate-bounce" />}
        </div>
        <NavBtn active={activeTab === Category.GAIA} onClick={() => setActiveTab(Category.GAIA)} icon={<AlertTriangle size={22}/>} label="Gaia" />
        <NavBtn active={activeTab === Category.AJUSTES} onClick={() => setActiveTab(Category.AJUSTES)} icon={<SettingsIcon size={22}/>} label="Ajustes" />
      </nav>
    </div>
  );
}

function TickerVal({ label, val }: { label: string, val: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-black text-[#C5A059] uppercase whitespace-nowrap">{String(label)}:</span>
      <span className="text-[10px] font-black text-white/80">{String(val)}</span>
    </div>
  );
}

function NavBtn({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1.5 transition-all ${active ? 'text-[#C5A059]' : 'text-white/20 hover:text-white/40'}`}>
      <div className={`p-2 rounded-xl ${active ? 'bg-[#C5A059]/10' : ''}`}>{icon}</div>
      <span className="text-[9px] font-black uppercase tracking-widest">{String(label)}</span>
    </button>
  );
}

function MetricCard({ label, value }: { label: string, value: string }) {
  return (
    <div className="bg-[#000B1E] p-6 rounded-2xl border border-white/5 flex justify-between items-center shadow-lg transition-all hover:border-[#C5A059]/30">
      <div>
        <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-widest">{String(label)}</span>
        <h3 className="text-2xl font-black cinzel text-white mt-1">{String(value)}</h3>
      </div>
      <ArrowUpRight size={24} className="text-[#C5A059]/20" />
    </div>
  );
}
