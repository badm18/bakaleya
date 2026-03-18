export interface IProductItem {
  id: number;
  name: string;
  unit: 'kg' | 'pcs';
  price_buy: number | null;
  price_sell: number | null;
  kg_per_pcs: number | null;
  created_at: string;
}
