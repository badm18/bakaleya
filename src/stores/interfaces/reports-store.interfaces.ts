export interface IRevenueByCategoryItem {
  main_category_id: number;
  main_category_name: string;
  total_sum: number;
  items_count: number;
}

export interface IRevenueByCategorySummary {
  total_sum: number;
  orders_count: number;
  items_count: number;
}

export interface IRevenueByCategoryReport {
  items: IRevenueByCategoryItem[];
  summary: IRevenueByCategorySummary;
}
