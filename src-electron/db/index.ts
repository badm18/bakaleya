import { app } from 'electron';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(app.getPath('userData'), 'database.db');
console.log(dbPath);
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// --- Migrations ---

const migrations = [
  {
    id: 1,
    name: 'create_products',
    sql: `
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,                                    -- название товара
        unit TEXT NOT NULL CHECK(unit IN ('kg', 'pcs')),      -- единица измерения: kg или pcs
        price_buy REAL,                                        -- цена закупки
        price_sell REAL,                                       -- цена продажи
        kg_per_pcs REAL,                                       -- кг в 1 штуке (только для pcs, необязательно)
        parent_id INTEGER REFERENCES products(id),             -- родительская папка (NULL = корень)
        is_folder BOOLEAN NOT NULL DEFAULT FALSE,                  -- 1 = папка, 0 = элемент
        deleted_at DATETIME,                                   -- soft delete, NULL = активен
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `,
  },
  {
    id: 2,
    name: 'create_customers',
    sql: `
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,                                    -- название клиента
        parent_id INTEGER REFERENCES customers(id),            -- родительская папка (NULL = корень)
        is_folder BOOLEAN NOT NULL DEFAULT FALSE,              -- 1 = папка, 0 = элемент
        deleted_at DATETIME,                                   -- soft delete, NULL = активен
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `,
  },
  {
    id: 3,
    name: 'create_orders',
    sql: `
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL, -- ссылка на клиента (NULL если клиент удалён)
        customer_name TEXT NOT NULL,                           -- snapshot имени клиента на момент заявки
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `,
  },
  {
    id: 4,
    name: 'create_order_items',
    sql: `
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE, -- при удалении заявки удаляются позиции
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,     -- ссылка на товар (NULL если товар удалён)
        serial_number INTEGER NOT NULL,                        -- порядковый номер позиции в заявке
        product_name TEXT NOT NULL,                            -- snapshot названия товара на момент заявки
        unit TEXT NOT NULL,                                    -- snapshot единицы измерения
        price_sell REAL NOT NULL,                              -- snapshot цены продажи на момент заявки
        quantity REAL NOT NULL,                                -- количество (дробное для kg, целое для pcs)
        total REAL NOT NULL,                                   -- итого = price_sell * quantity
        UNIQUE(order_id, serial_number)
        );
    `,
  },
];
export function runMigrations() {
  const apply = db.transaction(() => {
    // Сначала создаём таблицу миграций если её нет
    db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Применяем только те миграции которых ещё нет
    for (const migration of migrations) {
      const applied = db.prepare('SELECT id FROM migrations WHERE id = ?').get(migration.id);

      if (!applied) {
        db.exec(migration.sql);
        db.prepare('INSERT INTO migrations (id, name) VALUES (?, ?)').run(
          migration.id,
          migration.name,
        );
      }
    }
  });

  apply();
}

// --- Types ---

export interface Product {
  id: number;
  name: string;
  unit: 'kg' | 'pcs';
  price_buy: number | null;
  price_sell: number | null;
  kg_per_pcs: number | null;
  deleted_at: string | null;
  created_at: string;
}

export interface Customer {
  id: number;
  name: string;
  deleted_at: string | null;
  created_at: string;
}

export interface Order {
  id: number;
  customer_id: number | null;
  customer_name: string;
  created_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number | null;
  product_name: string;
  serial_number: number;
  unit: 'kg' | 'pcs';
  price_sell: number;
  quantity: number;
  total: number;
}

export default db;
