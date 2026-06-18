import db from '../db/index';
import type { Order, OrderItem } from '../db/index';
import { registerLoggedIpcHandler } from './registerLoggedIpcHandler';

export function registerOrderHandlers() {
  registerLoggedIpcHandler('orders:getList', (_event, offset = 0, limit = 50) => {
    const items = db
      .prepare(
        `
          SELECT
            o.id,
            o.organization_name,
            o.customer_id,
            o.customer_name,
            o.created_at,
            CAST(COALESCE(SUM(oi.total), 0) AS REAL) as total_sum
          FROM orders o
                 LEFT JOIN order_items oi ON oi.order_id = o.id
          GROUP BY o.id
          ORDER BY o.created_at DESC
            LIMIT ? OFFSET ?
        `,
      )
      .all(limit, offset);

    const total = (db.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number })
      .count;

    return { items, total };
  });

  registerLoggedIpcHandler('orders:getById', (_event, id) => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    const items = db
      .prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY serial_number ASC')
      .all(id);
    return { order, items };
  });

  registerLoggedIpcHandler(
    'orders:create',
    (
      _event,
      order,
      items,
    ) => {
      const insertOrder = db.prepare(`
        INSERT INTO orders (organization_name, customer_id, customer_name)
        VALUES (@organization_name, @customer_id, @customer_name)
      `);
      const insertItem = db.prepare(`
        INSERT INTO order_items (order_id, serial_number, product_id, product_name, unit, price_sell, quantity, total)
        VALUES (@order_id, @serial_number, @product_id, @product_name, @unit, @price_sell, @quantity, @total)
      `);

      const transaction = db.transaction(() => {
        const { lastInsertRowid } = insertOrder.run(
          order as Pick<Order, 'organization_name' | 'customer_id' | 'customer_name'>,
        );
        for (const item of items as Omit<OrderItem, 'id' | 'order_id'>[]) {
          insertItem.run({ ...item, order_id: lastInsertRowid });
        }
        return Number(lastInsertRowid);
      });

      return transaction();
    },
  );

  registerLoggedIpcHandler(
    'orders:update',
    (
      _event,
      orderId,
      order,
      items,
    ) => {
      const updateOrder = db.prepare(`
        UPDATE orders
        SET organization_name=@organization_name, customer_id=@customer_id, customer_name=@customer_name
        WHERE id=@id
      `);
      const deleteItems = db.prepare('DELETE FROM order_items WHERE order_id = ?');
      const insertItem = db.prepare(`
        INSERT INTO order_items (order_id, serial_number, product_id, product_name, unit, price_sell, quantity, total)
        VALUES (@order_id, @serial_number, @product_id, @product_name, @unit, @price_sell, @quantity, @total)
      `);

      const transaction = db.transaction(() => {
        updateOrder.run({
          ...(order as Pick<Order, 'organization_name' | 'customer_id' | 'customer_name'>),
          id: orderId,
        });
        deleteItems.run(orderId);
        for (const item of items as Omit<OrderItem, 'id' | 'order_id'>[]) {
          insertItem.run({ ...item, order_id: orderId });
        }
      });

      transaction();
    },
  );

  registerLoggedIpcHandler('orders:delete', (_event, id) =>
    db.prepare('DELETE FROM orders WHERE id = ?').run(id),
  );
}
