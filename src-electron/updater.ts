import { dialog, type BrowserWindow } from 'electron';
import { writeErrorLog } from './logger';

import pkg from 'electron-updater';
const { autoUpdater } = pkg;

type DownloadState = {
  status: 'starting' | 'downloading' | 'downloaded' | 'error';
  percent: number;
  transferred: number;
  total: number;
};

export function initUpdater(getWindow: () => BrowserWindow | undefined) {
  autoUpdater.autoDownload = false;
  let downloadInProgress = false;

  const sendState = (state: DownloadState) => {
    const window = getWindow();
    if (window && !window.isDestroyed()) {
      window.webContents.send('app:update-download-state', state);
      window.setProgressBar(state.status === 'downloading' ? state.percent / 100 : -1);
    }
  };

  const handleDownloadError = (error: unknown) => {
    writeErrorLog('Updater error', error);
    if (!downloadInProgress) return;

    downloadInProgress = false;
    sendState({ status: 'error', percent: 0, transferred: 0, total: 0 });
    const options = {
      type: 'error' as const,
      title: 'Ошибка обновления',
      message: 'Не удалось скачать обновление.',
      detail: String(error),
      buttons: ['Понятно'],
    };
    const window = getWindow();
    void (window && !window.isDestroyed()
      ? dialog.showMessageBox(window, options)
      : dialog.showMessageBox(options));
  };

  autoUpdater.on('update-available', (info) => {
    void dialog
      .showMessageBox({
        type: 'info',
        title: 'Доступно обновление',
        message: `Версия ${info.version} доступна. Скачать?`,
        buttons: ['Да', 'Нет'],
      })
      .then(({ response }) => {
        if (response === 0) {
          downloadInProgress = true;
          sendState({ status: 'starting', percent: 0, transferred: 0, total: 0 });
          void autoUpdater.downloadUpdate().catch((error: unknown) => {
            if (downloadInProgress) handleDownloadError(error);
          });
        }
      });
  });

  autoUpdater.on('download-progress', (info) => {
    if (!downloadInProgress) return;
    sendState({
      status: 'downloading',
      percent: Number.isFinite(info.percent) ? Math.min(100, Math.max(0, info.percent)) : 0,
      transferred: info.transferred,
      total: info.total,
    });
  });

  autoUpdater.on('update-downloaded', () => {
    downloadInProgress = false;
    sendState({ status: 'downloaded', percent: 100, transferred: 0, total: 0 });
    void dialog
      .showMessageBox({
        type: 'info',
        title: 'Обновление готово',
        message: 'Обновление загружено. Приложение перезапустится.',
        buttons: ['Перезапустить'],
      })
      .then(() => {
        autoUpdater.quitAndInstall();
      });
  });

  autoUpdater.on('error', handleDownloadError);

  // Проверяем обновления при старте
  void autoUpdater.checkForUpdates().catch((error: unknown) => {
    writeErrorLog('Updater check failed', error);
  });
}
