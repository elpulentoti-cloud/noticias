
export enum Category {
  CRONICAS = 'CRONICAS',
  VANGUARDIA = 'VANGUARDIA',
  PATRIMONIO = 'PATRIMONIO',
  GAIA = 'GAIA',
  AJUSTES = 'AJUSTES'
}

export enum SourceType {
  API = 'API',
  RSS = 'RSS',
  SYSTEM = 'SYSTEM'
}

export interface DataSource {
  id: string;
  name: string;
  url: string;
  type: SourceType;
  enabled: boolean;
  category: Category;
  customRefreshInterval?: number; // En minutos, para sintonía independiente
}

export interface RadarItem {
  id: string;
  source: string;
  headline: string;
  content: string;
  timestamp: number;
  category: Category;
  url?: string;
  extra?: string; // Para tráfico de búsquedas u otros datos
}

export interface ChileIndicators {
  uf: number;
  dolar: number;
  utm: number;
  ipc: number;
  ivp: number;
}

export type AlertType = 'CLIMA' | 'MAR' | 'SISMO' | 'SOLAR' | 'GENERAL';

export interface AlertData {
  id: string;
  title: string;
  severity: 'ALTA' | 'MEDIA' | 'INFO';
  timestamp: number;
  desc?: string;
  type: AlertType;
  source: string;
}

export interface UserSettings {
  refreshInterval: number; // en minutos (global)
  soundEnabled: boolean;
  soundVolume: number; // 0 a 1
  notificationsEnabled: boolean;
  notificationPriorityOnly: boolean; // solo notificar severidad 'ALTA'
}
