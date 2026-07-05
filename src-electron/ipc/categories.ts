import db from '../db/index';
import type { Category } from '../db/index';
import { registerLoggedIpcHandler } from './registerLoggedIpcHandler';

export function registerCategoryHandlers() {
  registerLoggedIpcHandler('categories:getAll', () => {
    const items = db
      .prepare(
        `
        SELECT id, name, created_at
        FROM categories
        WHERE deleted_at IS NULL
        ORDER BY name
      `,
      )
      .all();

    const total = (
      db.prepare('SELECT COUNT(*) as count FROM categories WHERE deleted_at IS NULL').get() as {
        count: number;
      }
    ).count;

    return { items, total };
  });

  registerLoggedIpcHandler('categories:create', (_event, data) =>
    db
      .prepare('INSERT INTO categories (name, name_lower) VALUES (@name, @name_lower)')
      .run({
        name: (data as Pick<Category, 'name'>).name,
        name_lower: (data as Pick<Category, 'name'>).name.toLowerCase(),
      }),
  );

  registerLoggedIpcHandler('categories:update', (_event, id, data) =>
    db
      .prepare('UPDATE categories SET name=@name, name_lower=@name_lower WHERE id=@id')
      .run({
        name: (data as Pick<Category, 'name'>).name,
        name_lower: (data as Pick<Category, 'name'>).name.toLowerCase(),
        id,
      }),
  );

  registerLoggedIpcHandler('categories:delete', (_event, id) => {
    const transaction = db.transaction(() => {
      db.prepare('UPDATE products SET main_category_id = NULL WHERE main_category_id = ?').run(id);
      db.prepare('UPDATE categories SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
    });

    transaction();
  });
}
