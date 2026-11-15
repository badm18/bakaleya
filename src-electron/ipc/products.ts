import db from '../db/index';
import type { Product, ProductPriceHistoryEntry } from '../db/index';
import { registerLoggedIpcHandler } from './registerLoggedIpcHandler';

const PRICE_HISTORY_LIMIT = 200;
const DB_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/;

interface PriceHistoryQuery {
  from: string | null;
  to: string | null;
  before: { id: number; recorded_at: string } | null;
}

function isPriceHistoryQuery(value: unknown): value is PriceHistoryQuery {
  if (typeof value !== 'object' || value === null) return false;
  const query = value as Partial<PriceHistoryQuery>;
  const validTimestamp = (timestamp: unknown): timestamp is string | null =>
    timestamp === null || (typeof timestamp === 'string' && DB_TIMESTAMP_PATTERN.test(timestamp));
  const { from, to, before } = query;
  if (!validTimestamp(from) || !validTimestamp(to)) return false;
  if (from !== null && to !== null && from >= to) return false;
  return (
    before === null ||
    (typeof before === 'object' &&
      before !== null &&
      Number.isInteger(before.id) &&
      before.id > 0 &&
      typeof before.recorded_at === 'string' &&
      DB_TIMESTAMP_PATTERN.test(before.recorded_at))
  );
}

export function registerProductHandlers() {
  registerLoggedIpcHandler('products:getPriceHistory', (_event, id, query) => {
    if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
      throw new Error('Некорректный идентификатор товара');
    }
    if (!isPriceHistoryQuery(query)) {
      throw new Error('Некорректный диапазон истории цен');
    }

    const conditions = ['product_id = @product_id'];
    const params: Record<string, number | string> = {
      product_id: id,
      limit: PRICE_HISTORY_LIMIT + 1,
    };
    if (query.from !== null) {
      conditions.push('recorded_at >= @date_from');
      params.date_from = query.from;
    }
    if (query.to !== null) {
      conditions.push('recorded_at < @date_to');
      params.date_to = query.to;
    }
    if (query.before !== null) {
      conditions.push(
        '(recorded_at < @before_date OR (recorded_at = @before_date AND id < @before_id))',
      );
      params.before_date = query.before.recorded_at;
      params.before_id = query.before.id;
    }

    const rows = db
      .prepare(
        `SELECT id, product_id, price_buy, price_sell, recorded_at, source
         FROM product_price_history
         WHERE ${conditions.join(' AND ')}
         ORDER BY recorded_at DESC, id DESC
         LIMIT @limit`,
      )
      .all(params) as ProductPriceHistoryEntry[];

    return {
      entries: rows.slice(0, PRICE_HISTORY_LIMIT).reverse(),
      hasMore: rows.length > PRICE_HISTORY_LIMIT,
    };
  });

  registerLoggedIpcHandler('products:getAll', () => {
    const items = db
      .prepare(
        `
        SELECT
          p.id,
          p.name,
          p.unit,
          p.main_category_id,
          c.name as main_category_name,
          p.price_buy,
          p.price_sell,
          p.kg_per_pcs,
          p.created_at
        FROM products p
               LEFT JOIN categories c ON c.id = p.main_category_id AND c.deleted_at IS NULL
        WHERE p.deleted_at IS NULL
        ORDER BY p.created_at DESC
      `,
      )
      .all();

    const total = (
      db.prepare('SELECT COUNT(*) as count FROM products WHERE deleted_at IS NULL').get() as {
        count: number;
      }
    ).count;

    return { items, total };
  });

  registerLoggedIpcHandler('products:search', (_event, name) => {
    if (typeof name !== 'string') {
      throw new Error('products:search expects string query');
    }

    const query = `%${name.toLowerCase()}%`;

    const items = db
      .prepare(
        `
        SELECT
          p.id,
          p.name,
          p.unit,
          p.main_category_id,
          c.name as main_category_name,
          p.price_buy,
          p.price_sell,
          p.kg_per_pcs,
          p.created_at
        FROM products p
               LEFT JOIN categories c ON c.id = p.main_category_id AND c.deleted_at IS NULL
        WHERE p.deleted_at IS NULL AND p.name_lower LIKE ?
        ORDER BY p.name
      `,
      )
      .all(query);

    const total = (
      db
        .prepare(
          `
          SELECT COUNT(*) as count
          FROM products
          WHERE deleted_at IS NULL AND name_lower LIKE ?
        `,
        )
        .get(query) as { count: number }
    ).count;

    return { items, total };
  });

  registerLoggedIpcHandler('products:create', (_event, data) => {
    const product = data as Product;

    return db.transaction(() => {
      const result = db
        .prepare(
          `
          INSERT INTO products (name, name_lower, unit, main_category_id, price_buy, price_sell, kg_per_pcs)
          VALUES (@name, @name_lower, @unit, @main_category_id, @price_buy, @price_sell, @kg_per_pcs)
        `,
        )
        .run({
          name: product.name,
          name_lower: product.name.toLowerCase(),
          unit: product.unit,
          main_category_id: product.main_category_id ?? null,
          price_buy: product.price_buy ?? null,
          price_sell: product.price_sell ?? null,
          kg_per_pcs: product.kg_per_pcs ?? null,
        });

      if (product.price_buy != null || product.price_sell != null) {
        db.prepare(
          `INSERT INTO product_price_history (product_id, price_buy, price_sell, source)
             VALUES (?, ?, ?, 'baseline')`,
        ).run(result.lastInsertRowid, product.price_buy ?? null, product.price_sell ?? null);
      }

      return result;
    })();
  });

  registerLoggedIpcHandler('products:update', (_event, id, data) => {
    const product = data as Product;

    return db.transaction(() => {
      const previous = db
        .prepare('SELECT price_buy, price_sell FROM products WHERE id = ? AND deleted_at IS NULL')
        .get(id) as Pick<Product, 'price_buy' | 'price_sell'> | undefined;
      if (!previous) throw new Error('Товар не найден');

      const priceBuy = product.price_buy ?? null;
      const priceSell = product.price_sell ?? null;
      const result = db
        .prepare(
          `
          UPDATE products
          SET name=@name, name_lower=@name_lower, unit=@unit,
              main_category_id=@main_category_id,
              price_buy=@price_buy, price_sell=@price_sell, kg_per_pcs=@kg_per_pcs
          WHERE id=@id AND deleted_at IS NULL
        `,
        )
        .run({
          name: product.name,
          name_lower: product.name.toLowerCase(),
          unit: product.unit,
          main_category_id: product.main_category_id ?? null,
          price_buy: priceBuy,
          price_sell: priceSell,
          kg_per_pcs: product.kg_per_pcs ?? null,
          id,
        });

      if (previous.price_buy !== priceBuy || previous.price_sell !== priceSell) {
        db.prepare(
          `INSERT INTO product_price_history (product_id, price_buy, price_sell, source)
             VALUES (?, ?, ?, 'change')`,
        ).run(id, priceBuy, priceSell);
      }

      return result;
    })();
  });

  registerLoggedIpcHandler('products:delete', (_event, id) =>
    db.prepare('UPDATE products SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(id),
  );
}
