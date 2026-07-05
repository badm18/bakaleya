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
