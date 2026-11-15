export interface IProductItem {
  id: number;
  name: string;
  unit: 'kg' | 'pcs';
  main_category_id: number | null;
  main_category_name: string | null;
  price_buy: number | null;
  price_sell: number | null;
  kg_per_pcs: number | null;
  created_at: string;
}

export interface IProductPriceHistoryEntry {
  id: number;
  product_id: number;
  price_buy: number | null;
  price_sell: number | null;
  recorded_at: string;
  source: 'baseline' | 'change';
}

export interface IProductPriceHistoryResult {
  entries: IProductPriceHistoryEntry[];
  hasMore: boolean;
}

export interface IProductPriceHistoryQuery {
  from: string | null;
  to: string | null;
  before: Pick<IProductPriceHistoryEntry, 'id' | 'recorded_at'> | null;
}
