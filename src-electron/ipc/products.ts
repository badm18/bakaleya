import { ipcMain } from 'electron';
import db from '../db/index';
import type { Product } from '../db/index';

export function registerProductHandlers() {
  ipcMain.handle('products:getAll', () => {
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

  ipcMain.handle('products:search', (_event, name: string) => {
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

  ipcMain.handle(
    'products:create',
    (_event, data: Omit<Product, 'id' | 'created_at' | 'deleted_at' | 'name_lower'>) =>
      db
        .prepare(
          `
          INSERT INTO products (name, name_lower, unit, price_buy, price_sell, kg_per_pcs)
          VALUES (@name, @name_lower, @unit, @price_buy, @price_sell, @kg_per_pcs)
        `,
        )
        .run({ ...data, name_lower: data.name.toLowerCase() }),
  );

  ipcMain.handle(
    'products:update',
    (_event, id: number, data: Omit<Product, 'id' | 'created_at' | 'deleted_at' | 'name_lower'>) =>
      db
        .prepare(
          `
          UPDATE products
          SET name=@name, name_lower=@name_lower, unit=@unit,
              price_buy=@price_buy, price_sell=@price_sell, kg_per_pcs=@kg_per_pcs
          WHERE id=@id
        `,
        )
        .run({ ...data, name_lower: data.name.toLowerCase(), id }),
  );

  ipcMain.handle('products:delete', (_event, id: number) =>
    db.prepare('UPDATE products SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(id),
  );
}
