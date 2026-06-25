import { BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../db/index';
import { writeErrorLog } from '../logger';
import { attachWindowErrorLogging } from '../window-error-logging';
import { registerLoggedIpcHandler } from './registerLoggedIpcHandler';

const currentDir = fileURLToPath(new URL('.', import.meta.url));
const isDev = process.env.DEV === 'true';
let activePrintWindow: BrowserWindow | null = null;
let printQueue = Promise.resolve();

const parseOrderIds = (ids: unknown): number[] => {
  if (!Array.isArray(ids) || !ids.every((id) => Number.isInteger(id))) {
    throw new Error('print:orders expects array of order ids');
  }

  return ids;
};

const focusVisibleAppWindow = (closedWindow: BrowserWindow) => {
  const visibleWindow = BrowserWindow.getAllWindows().find(
    (win) => win !== closedWindow && !win.isDestroyed() && win.isVisible(),
  );

  if (!visibleWindow) {
    return;
  }

  if (visibleWindow.isMinimized()) {
    visibleWindow.restore();
  }

  visibleWindow.focus();
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
  registerLoggedIpcHandler('print:orders', async (_event, ids) => {
    const orderIds = parseOrderIds(ids);

    const printJob = printQueue.then(() => openPrintWindow(orderIds));
    printQueue = printJob.catch(() => undefined);

    await printJob;
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

const openPrintWindow = (orderIds: number[]) =>
  new Promise<void>((resolve, reject) => {
    let isSettled = false;
    let loadFailed = false;
    let timeout: NodeJS.Timeout | null = null;

    const settle = (error?: Error) => {
      if (isSettled) {
        return;
      }

      isSettled = true;

      if (timeout) {
        clearTimeout(timeout);
      }

      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };

    const printWin = new BrowserWindow({
      show: isDev,
      width: 900,
      height: 800,
      focusable: isDev,
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
    attachWindowErrorLogging(printWin, 'Print window');

    timeout = setTimeout(() => {
      writeErrorLog('Print window timed out', { orderIds });

      if (!printWin.isDestroyed()) {
        printWin.close();
      }

      settle(new Error('Печать не завершилась за отведенное время'));
    }, 30000);

    printWin.on('closed', () => {
      if (activePrintWindow === printWin) {
        activePrintWindow = null;
      }

      focusVisibleAppWindow(printWin);

      if (loadFailed) {
        settle(new Error('Не удалось открыть окно печати'));
        return;
      }

      settle();
    });

    printWin.webContents.on('preload-error', () => {
      loadFailed = true;
    });

    printWin.webContents.on(
      'did-fail-load',
      () => {
        loadFailed = true;
      },
    );

    printWin.webContents.on('render-process-gone', () => {
      loadFailed = true;
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
