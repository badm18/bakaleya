import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const projectRoot = path.resolve(import.meta.dirname, '..');
const require = createRequire(path.join(projectRoot, 'package.json'));
const Database = require('better-sqlite3');
const source = readFileSync(path.join(projectRoot, 'src-electron/db/index.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;

function openAppDatabase(userData, version = '1.2.0') {
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    exports: module.exports,
    module,
    require: (name) =>
      name === 'electron' ? { app: { getPath: () => userData, getVersion: () => version } } : require(name),
    console: { log() {} },
  }, { filename: 'src-electron/db/index.ts' });
  return module.exports;
}

async function makeLegacyDatabase(userData) {
  const appDatabase = openAppDatabase(userData);
  await appDatabase.runMigrations();
  appDatabase.default.exec(`
    DROP TABLE product_price_history;
    DELETE FROM migrations WHERE id IN (7, 8);
  `);
  appDatabase.default.close();

  const db = new Database(path.join(userData, 'database.db'));
  db.pragma('journal_mode = WAL');
  db.exec(`
    INSERT INTO products (id, name, name_lower, unit, price_buy, price_sell)
      VALUES (1, 'Арбуз', 'арбуз', 'kg', 300, 400);
    INSERT INTO customers (id, name, name_lower)
      VALUES (1, 'Клиент', 'клиент');
    INSERT INTO orders (id, customer_id, customer_name)
      VALUES (1, 1, 'Клиент');
    INSERT INTO order_items
      (order_id, product_id, serial_number, product_name, unit, price_sell, quantity, total)
      VALUES (1, 1, 1, 'Арбуз', 'kg', 400, 2, 800);
  `);
  return db;
}

test('upgrade preserves old data and backs up the pre-migration WAL state', async () => {
  const userData = mkdtempSync(path.join(os.tmpdir(), 'bakaleya-upgrade-'));
  let legacy;
  let upgraded;
  try {
    legacy = await makeLegacyDatabase(userData);
    upgraded = openAppDatabase(userData);
    await upgraded.runMigrations();

    const backups = readdirSync(path.join(userData, 'backups')).filter((name) => name.endsWith('.db'));
    assert.equal(backups.length, 1);
    const standaloneBackupPath = path.join(userData, 'standalone-copy.db');
    copyFileSync(path.join(userData, 'backups', backups[0]), standaloneBackupPath);
    const backup = new Database(standaloneBackupPath, {
      readonly: true,
    });
    try {
      assert.equal(backup.pragma('quick_check', { simple: true }), 'ok');
      assert.equal(backup.prepare('SELECT COUNT(*) AS count FROM migrations').get().count, 6);
      assert.equal(backup.prepare('SELECT name FROM products WHERE id = 1').get().name, 'Арбуз');
      assert.equal(backup.prepare('SELECT total FROM order_items WHERE id = 1').get().total, 800);
    } finally {
      backup.close();
    }

    assert.equal(upgraded.default.prepare('SELECT COUNT(*) AS count FROM migrations').get().count, 8);
    assert.equal(upgraded.default.prepare('SELECT name FROM products WHERE id = 1').get().name, 'Арбуз');
    assert.equal(upgraded.default.prepare('SELECT name FROM customers WHERE id = 1').get().name, 'Клиент');
    assert.equal(upgraded.default.prepare('SELECT total FROM order_items WHERE id = 1').get().total, 800);
    assert.equal(upgraded.default.prepare('SELECT price_sell FROM product_price_history WHERE product_id = 1').get().price_sell, 400);

    await upgraded.runMigrations();
    assert.equal(readdirSync(path.join(userData, 'backups')).filter((name) => name.endsWith('.db')).length, 1);
  } finally {
    upgraded?.default.close();
    legacy?.close();
    rmSync(userData, { recursive: true, force: true });
  }
});

test('a failed backup prevents schema changes', async () => {
  const userData = mkdtempSync(path.join(os.tmpdir(), 'bakaleya-backup-failure-'));
  let legacy;
  let upgraded;
  try {
    legacy = await makeLegacyDatabase(userData);
    writeFileSync(path.join(userData, 'backups'), 'blocks the backup directory');
    upgraded = openAppDatabase(userData);
    await assert.rejects(upgraded.runMigrations());
    assert.equal(upgraded.default.prepare('SELECT COUNT(*) AS count FROM migrations').get().count, 6);
    assert.equal(upgraded.default.prepare('SELECT name FROM products WHERE id = 1').get().name, 'Арбуз');
  } finally {
    upgraded?.default.close();
    legacy?.close();
    rmSync(userData, { recursive: true, force: true });
  }
});

test('existing data is backed up on first start of a new version without migrations', async () => {
  const userData = mkdtempSync(path.join(os.tmpdir(), 'bakaleya-version-backup-'));
  let database;
  try {
    database = openAppDatabase(userData, '1.2.0');
    await database.runMigrations();
    database.default.prepare(
      "INSERT INTO products (name, name_lower, unit, price_sell) VALUES ('Арбуз', 'арбуз', 'kg', 400)",
    ).run();
    database.default.close();

    database = openAppDatabase(userData, '1.3.0');
    await database.runMigrations();
    const backups = () => readdirSync(path.join(userData, 'backups')).filter((name) => name.endsWith('.db'));
    assert.equal(backups().length, 1);
    const backup = new Database(path.join(userData, 'backups', backups()[0]), { readonly: true });
    try {
      assert.equal(backup.prepare('SELECT name FROM products').get().name, 'Арбуз');
    } finally {
      backup.close();
    }
    database.default.close();

    database = openAppDatabase(userData, '1.3.0');
    await database.runMigrations();
    assert.equal(backups().length, 1);
  } finally {
    database?.default.close();
    rmSync(userData, { recursive: true, force: true });
  }
});
