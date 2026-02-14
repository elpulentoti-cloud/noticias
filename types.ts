
export enum Category {
  CRONICAS = 'CRONICAS',
  PATRIMONIO = 'PATRIMONIO',
  GAIA = 'GAIA',
  COSMOS = 'COSMOS',
  ANALES = 'ANALES'
}

export interface RadarItem {
  id: string;
  source: string;
  headline: string;
  content: string;
  timestamp: number;
  category: Category;
  url?: string;
}

export interface ChileIndicators {
  uf: number;
  dolar: number;
  utm: number;
  ipc: number;
  ivp: number;
}

export interface AlertData {
  title: string;
  severity: 'ALTA' | 'MEDIA' | 'INFO';
  timestamp: number;
  desc?: string;
}

export interface AstroEvent {
  name: string;
  date: string;
  type: string;
  provider: string;
}
