
export enum Category {
  CRONICAS = 'CRONICAS',
  GRANDES_VALORES = 'VALORES',
  TERRA = 'TERRA',
  VIBRACIONES = 'VIBRACIONES'
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
}

export interface AlertData {
  title: string;
  severity: 'ALTA' | 'MEDIA' | 'INFO';
  timestamp: number;
}
