import { ipcMain } from 'electron';
import db from '../db/index';
import type { Customer } from '../db/index';

export function registerCustomerHandlers() {
  ipcMain.handle('customers:getAll', () => {
    const items = db
      .prepare(
        `
    SELECT
      id,
      name,
      created_at
    FROM customers
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC
  `,
      )
      .all();
    const total = (
      db.prepare('SELECT COUNT(*) as count FROM customers WHERE deleted_at IS NULL').get() as {
        count: number;
      }
    ).count;
    return { items, total };
  });

  ipcMain.handle('customers:search', (_event, name: string) => {
    const query = `%${name.toLowerCase()}%`;

    const items = db
      .prepare(
        `
      SELECT id, name, created_at
      FROM customers
      WHERE deleted_at IS NULL AND LOWER(name) LIKE ?
      ORDER BY name
    `,
      )
      .all(query);

    const total = (
      db
        .prepare(
          `
        SELECT COUNT(*) as count
        FROM customers
        WHERE deleted_at IS NULL AND LOWER(name) LIKE ?
      `,
        )
        .get(query) as { count: number }
    ).count;

    return { items, total };
  });

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
