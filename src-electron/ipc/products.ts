import db from '../db/index';
import type { Product } from '../db/index';
import { registerLoggedIpcHandler } from './registerLoggedIpcHandler';

export function registerProductHandlers() {
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

  registerLoggedIpcHandler(
    'products:create',
    (_event, data) => {
      const product = data as Product;

      return db
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
    },
  );

  registerLoggedIpcHandler(
    'products:update',
    (_event, id, data) => {
      const product = data as Product;

      return db
        .prepare(
          `
          UPDATE products
          SET name=@name, name_lower=@name_lower, unit=@unit,
              main_category_id=@main_category_id,
              price_buy=@price_buy, price_sell=@price_sell, kg_per_pcs=@kg_per_pcs
          WHERE id=@id
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
          id,
        });
    },
  );

  registerLoggedIpcHandler('products:delete', (_event, id) =>
    db.prepare('UPDATE products SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(id),
  );
}
