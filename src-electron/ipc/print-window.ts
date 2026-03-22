import { BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../db/index';

const currentDir = fileURLToPath(new URL('.', import.meta.url));
const isDev = !!process.env.DEV;

export function registerPrintHandlers() {
  // Получение данных заявок для печати
  ipcMain.handle('print:getOrdersData', (_event, ids: number[]) => {
    return ids.map((id) => {
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
      const items = db
        .prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY serial_number ASC')
        .all(id);
      return { order, items };
    });
  });

  // Открытие окна печати
  ipcMain.handle('print:orders', (_event, ids: number[]) => {
    const printWin = new BrowserWindow({
      show: isDev,
      width: isDev ? 900 : 0,
      height: isDev ? 800 : 0,
      webPreferences: {
        contextIsolation: true,
        preload: path.resolve(
          currentDir,
          path.join(
            process.env.QUASAR_ELECTRON_PRELOAD_FOLDER,
            'electron-preload' + process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION,
          ),
        ),
      },
    });

    const idsParam = encodeURIComponent(JSON.stringify(ids));

    if (isDev) {
      void printWin.loadURL(`${process.env.APP_URL}#/print?ids=${idsParam}`);
    } else {
      void printWin.loadFile('index.html', { hash: `/print?ids=${idsParam}` });
    }

    // В проде — автопечать после загрузки
    if (!isDev) {
      printWin.webContents.on('did-finish-load', () => {
        setTimeout(() => {
          printWin.webContents.print({ silent: true, printBackground: false }, () => {
            printWin.close();
          });
        }, 800);
      });
    }
  });

  ipcMain.handle('print:trigger', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    win.webContents.print({ silent: false, printBackground: false }, () => {});
  });
}
