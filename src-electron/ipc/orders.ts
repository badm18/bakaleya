import { ipcMain } from 'electron';
import db from '../db/index';
import type { Order, OrderItem } from '../db/index';

export function registerOrderHandlers() {
  ipcMain.handle('orders:getList', (_event, offset = 0, limit = 50) => {
    const items = db
      .prepare(
        `
        SELECT
          o.id,
          o.organization_name,
          o.customer_id,
          o.customer_name,
          o.created_at,
          COALESCE(SUM(oi.total), 0) as total_sum
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

  ipcMain.handle('orders:getById', (_event, id: number) => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    const items = db
      .prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY serial_number ASC')
      .all(id);
    return { order, items };
  });

  ipcMain.handle(
    'orders:create',
    (
      _event,
      order: Pick<Order, 'organization_name' | 'customer_id' | 'customer_name'>,
      items: Omit<OrderItem, 'id' | 'order_id'>[],
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
        const { lastInsertRowid } = insertOrder.run(order);
        for (const item of items) {
          insertItem.run({ ...item, order_id: lastInsertRowid });
        }
        return Number(lastInsertRowid);
      });

      return transaction();
    },
  );

  ipcMain.handle(
    'orders:update',
    (
      _event,
      orderId: number,
      order: Pick<Order, 'organization_name' | 'customer_id' | 'customer_name'>,
      items: Omit<OrderItem, 'id' | 'order_id'>[],
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
        updateOrder.run({ ...order, id: orderId });
        deleteItems.run(orderId);
        for (const item of items) {
          insertItem.run({ ...item, order_id: orderId });
        }
      });

      transaction();
    },
  );

  ipcMain.handle('orders:delete', (_event, id: number) =>
    db.prepare('DELETE FROM orders WHERE id = ?').run(id),
  );
}
