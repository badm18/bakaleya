import db from '../db/index';
import { registerLoggedIpcHandler } from './registerLoggedIpcHandler';

interface ReportPeriod {
  date_from: string;
  date_to: string;
}

export function registerReportHandlers() {
  registerLoggedIpcHandler('reports:getRevenueByCategory', (_event, period) => {
    const { date_from, date_to } = period as ReportPeriod;

    if (typeof date_from !== 'string' || typeof date_to !== 'string') {
      throw new Error('reports:getRevenueByCategory expects date_from and date_to strings');
    }

    const items = db
      .prepare(
        `
        SELECT
          COALESCE(c.id, 0) as main_category_id,
          COALESCE(c.name, 'Без категории') as main_category_name,
          CAST(COALESCE(SUM(oi.total), 0) AS REAL) as total_sum,
          COUNT(oi.id) as items_count
        FROM order_items oi
               INNER JOIN orders o ON o.id = oi.order_id
               LEFT JOIN products p ON p.id = oi.product_id
               LEFT JOIN categories c ON c.id = p.main_category_id AND c.deleted_at IS NULL
        WHERE date(o.created_at) >= date(@date_from)
          AND date(o.created_at) <= date(@date_to)
        GROUP BY COALESCE(c.id, 0), COALESCE(c.name, 'Без категории')
        ORDER BY total_sum DESC
      `,
      )
      .all({ date_from, date_to });

    const summary = db
      .prepare(
        `
        SELECT
          CAST(COALESCE(SUM(oi.total), 0) AS REAL) as total_sum,
          COUNT(DISTINCT o.id) as orders_count,
          COUNT(oi.id) as items_count
        FROM order_items oi
               INNER JOIN orders o ON o.id = oi.order_id
        WHERE date(o.created_at) >= date(@date_from)
          AND date(o.created_at) <= date(@date_to)
      `,
      )
      .get({ date_from, date_to });

    return { items, summary };
  });
}
