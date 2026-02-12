
export enum Category {
  NEWS = 'NEWS',
  MARKETS = 'MARKETS',
  GEOLOGY = 'GEOLOGY',
  TRENDS = 'TRENDS'
}

export interface RadarItem {
  id: string;
  source: string;
  type: string;
  headline: string;
  content: string;
  timestamp: number;
  category: Category;
  url?: string;
  severity?: 'low' | 'medium' | 'high';
}

export interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  category: 'crypto' | 'fiat';
}

export interface EarthquakeData {
  place: string;
  mag: number;
  time: number;
  url: string;
}
