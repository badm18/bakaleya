// Элемент в списке заявок
export interface IOrderItem {
  id: number;
  organization_name: string;
  customer_id: number | null;
  customer_name: string;
  created_at: string;
  total_sum: number;
}

// Позиция заявки
export interface IDetailItem {
  id: number;
  order_id: number;
  product_id: number | null;
  product_name: string;
  serial_number: number;
  unit: 'kg' | 'pcs';
  price_sell: number;
  quantity: number;
  total: number;
}

// Детальная заявка (для редактирования)
export interface IOrderDetail {
  order: IOrderItem;
  items: IDetailItem[];
}

// Payload для создания/обновления
export interface IOrderPayload {
  organization_name: string;
  customer_id: number | null;
  customer_name: string;
}

export interface IOrderData {
  order: IOrderItem;
  items: IDetailItem[];
}
