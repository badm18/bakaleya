import db from '../db/index';
import type { Customer } from '../db/index';
import { registerLoggedIpcHandler } from './registerLoggedIpcHandler';

export function registerCustomerHandlers() {
  registerLoggedIpcHandler('customers:getAll', () => {
    const items = db
      .prepare(
        `
        SELECT id, name, created_at
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

  registerLoggedIpcHandler('customers:search', (_event, name) => {
    if (typeof name !== 'string') {
      throw new Error('customers:search expects string query');
    }

    const query = `%${name.toLowerCase()}%`;

    const items = db
      .prepare(
        `
        SELECT id, name, created_at
        FROM customers
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
          FROM customers
          WHERE deleted_at IS NULL AND name_lower LIKE ?
        `,
        )
        .get(query) as { count: number }
    ).count;

    return { items, total };
  });

  registerLoggedIpcHandler('customers:create', (_event, data) =>
    db
      .prepare('INSERT INTO customers (name, name_lower) VALUES (@name, @name_lower)')
      .run({
        name: (data as Pick<Customer, 'name'>).name,
        name_lower: (data as Pick<Customer, 'name'>).name.toLowerCase(),
      }),
  );

  registerLoggedIpcHandler('customers:update', (_event, id, data) =>
    db
      .prepare('UPDATE customers SET name=@name, name_lower=@name_lower WHERE id=@id')
      .run({
        name: (data as Pick<Customer, 'name'>).name,
        name_lower: (data as Pick<Customer, 'name'>).name.toLowerCase(),
        id,
      }),
  );

  registerLoggedIpcHandler('customers:delete', (_event, id) =>
    db.prepare('UPDATE customers SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(id),
  );
}
