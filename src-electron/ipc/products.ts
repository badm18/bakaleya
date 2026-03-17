import { ipcMain } from 'electron';
import db from '../db/index';
import type { Product } from '../db/index';

export function registerProductHandlers() {
  ipcMain.handle('products:getList', (_event, offset = 0, limit = 100) => {
    const items = db
      .prepare(
        `
    SELECT * FROM products ORDER BY created_at DESC LIMIT ? OFFSET ?
  `,
      )
      .all(limit, offset);
    const total = (db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number })
      .count;
    return { items, total };
  });

  ipcMain.handle('products:search', (_event, query: string) =>
    db
      .prepare('SELECT * FROM products WHERE deleted_at IS NULL AND name LIKE ? ORDER BY name')
      .all(`%${query}%`),
  );

  ipcMain.handle(
    'products:create',
    (_event, data: Omit<Product, 'id' | 'created_at' | 'deleted_at'>) =>
      db
        .prepare(
          `
      INSERT INTO products (name, unit, price_buy, price_sell, kg_per_pcs)
      VALUES (@name, @unit, @price_buy, @price_sell, @kg_per_pcs)
    `,
        )
        .run(data),
  );

  ipcMain.handle(
    'products:update',
    (_event, id: number, data: Omit<Product, 'id' | 'created_at' | 'deleted_at'>) =>
      db
        .prepare(
          `
      UPDATE products
      SET name=@name, unit=@unit, price_buy=@price_buy, price_sell=@price_sell, kg_per_pcs=@kg_per_pcs
      WHERE id=@id
    `,
        )
        .run({ ...data, id }),
  );

  ipcMain.handle('products:delete', (_event, id: number) =>
    db.prepare('UPDATE products SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(id),
  );
}
