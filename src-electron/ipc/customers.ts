import { ipcMain } from 'electron';
import db from '../db/index';
import type { Customer } from '../db/index';

export function registerCustomerHandlers() {
  ipcMain.handle('customers:getList', (_event, offset = 0, limit = 100) => {
    const items = db
      .prepare(
        `
    SELECT * FROM customers ORDER BY created_at DESC LIMIT ? OFFSET ?
  `,
      )
      .all(limit, offset);
    const total = (db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number })
      .count;
    return { items, total };
  });

  ipcMain.handle('customers:search', (_event, query: string) =>
    db
      .prepare('SELECT * FROM customers WHERE deleted_at IS NULL AND name LIKE ? ORDER BY name')
      .all(`%${query}%`),
  );

  ipcMain.handle('customers:create', (_event, data: Pick<Customer, 'name'>) =>
    db.prepare('INSERT INTO customers (name) VALUES (@name)').run(data),
  );

  ipcMain.handle('customers:update', (_event, id: number, data: Pick<Customer, 'name'>) =>
    db.prepare('UPDATE customers SET name=@name WHERE id=@id').run({ ...data, id }),
  );

  ipcMain.handle('customers:delete', (_event, id: number) =>
    db.prepare('UPDATE customers SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(id),
  );
}
