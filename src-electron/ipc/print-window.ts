import { BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../db/index';
import { writeErrorLog } from '../logger';
import { registerLoggedIpcHandler } from './registerLoggedIpcHandler';

const currentDir = fileURLToPath(new URL('.', import.meta.url));
const isDev = process.env.DEV === 'true';
let activePrintWindow: BrowserWindow | null = null;

const parseOrderIds = (ids: unknown): number[] => {
  if (!Array.isArray(ids) || !ids.every((id) => Number.isInteger(id))) {
    throw new Error('print:orders expects array of order ids');
  }

  return ids;
};

export function registerPrintHandlers() {
  // Получение данных заявок для печати
  registerLoggedIpcHandler('print:getOrdersData', (_event, ids) => {
    return parseOrderIds(ids).map((id) => {
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);

      if (!order) {
        const error = new Error(`Заявка #${id} не найдена`);
        writeErrorLog('print:getOrdersData order not found', { id });
        throw error;
      }

      const items = db
        .prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY serial_number ASC')
        .all(id);
      return { order, items };
    });
  });

  // Открытие окна печати
  registerLoggedIpcHandler('print:orders', (_event, ids) => {
    const orderIds = parseOrderIds(ids);

    if (activePrintWindow && !activePrintWindow.isDestroyed()) {
      activePrintWindow.close();
    }

    const printWin = new BrowserWindow({
      show: isDev,
      width: isDev ? 900 : 0,
      height: isDev ? 800 : 0,
      skipTaskbar: !isDev,
      autoHideMenuBar: true,
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
    activePrintWindow = printWin;

    printWin.on('closed', () => {
      if (activePrintWindow === printWin) {
        activePrintWindow = null;
      }
    });

    printWin.webContents.on('preload-error', (_event, preloadPath, error) => {
      writeErrorLog('Print preload script failed', { preloadPath, error });
    });

    printWin.webContents.on(
      'did-fail-load',
      (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
        writeErrorLog('Print window load failed', {
          errorCode,
          errorDescription,
          validatedURL,
          isMainFrame,
        });
      },
    );

    printWin.webContents.on('render-process-gone', (_event, details) => {
      writeErrorLog('Print renderer process gone', details);
      if (!printWin.isDestroyed()) {
        printWin.close();
      }
    });

    const idsParam = encodeURIComponent(JSON.stringify(orderIds));

    if (isDev) {
      void printWin.loadURL(`${process.env.APP_URL}#/print?ids=${idsParam}`);
    } else {
      void printWin.loadFile('index.html', { hash: `/print?ids=${idsParam}` });
    }
  });

  registerLoggedIpcHandler('print:trigger', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    win.webContents.print({ silent: !isDev, printBackground: false }, (_success, failureReason) => {
      if (failureReason) {
        writeErrorLog('Print failed', { failureReason });
      }

      if (!isDev && !win.isDestroyed()) {
        win.close();
      }
    });
  });
}
