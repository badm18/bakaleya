import db from '../db/index';
import type { Product } from '../db/index';
import { registerLoggedIpcHandler } from './registerLoggedIpcHandler';

export function registerProductHandlers() {
  registerLoggedIpcHandler('products:getAll', () => {
    const items = db
      .prepare(
        `
        SELECT id, name, unit, price_buy, price_sell, kg_per_pcs, created_at
        FROM products
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
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
        SELECT id, name, unit, price_buy, price_sell, kg_per_pcs, created_at
        FROM products
        WHERE deleted_at IS NULL AND name_lower LIKE ?
        ORDER BY name
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
    (_event, data) =>
      db
        .prepare(
          `
          INSERT INTO products (name, name_lower, unit, price_buy, price_sell, kg_per_pcs)
          VALUES (@name, @name_lower, @unit, @price_buy, @price_sell, @kg_per_pcs)
        `,
        )
        .run({
          ...(data as Omit<Product, 'id' | 'created_at' | 'deleted_at' | 'name_lower'>),
          name_lower: (data as Product).name.toLowerCase(),
        }),
  );

  registerLoggedIpcHandler(
    'products:update',
    (_event, id, data) =>
      db
        .prepare(
          `
          UPDATE products
          SET name=@name, name_lower=@name_lower, unit=@unit,
              price_buy=@price_buy, price_sell=@price_sell, kg_per_pcs=@kg_per_pcs
          WHERE id=@id
        `,
        )
        .run({
          ...(data as Omit<Product, 'id' | 'created_at' | 'deleted_at' | 'name_lower'>),
          name_lower: (data as Product).name.toLowerCase(),
          id,
        }),
  );

  registerLoggedIpcHandler('products:delete', (_event, id) =>
    db.prepare('UPDATE products SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(id),
  );
}
