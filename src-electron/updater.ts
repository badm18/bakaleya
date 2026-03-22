import { autoUpdater } from 'electron-updater';
import { dialog } from 'electron';

export function initUpdater() {
  autoUpdater.autoDownload = false;

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
          void autoUpdater.downloadUpdate();
        };
      });
  });

  autoUpdater.on('update-downloaded', () => {
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

  autoUpdater.on('error', (err) => {
    console.error('Updater error:', err);
  });

  // Проверяем обновления при старте
  void autoUpdater.checkForUpdates();
}
