import { boot } from 'quasar/wrappers';
import { errorHandler } from 'src/utils/errorHandler';

export default boot(({ app }) => {
  app.config.errorHandler = (error, _instance, info) => {
    errorHandler(error, 'Ошибка интерфейса', { source: 'vue', info });
  };

  window.addEventListener('error', (event) => {
    errorHandler(event.error ?? event.message, 'Ошибка интерфейса', {
      source: 'window.error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    errorHandler(event.reason, 'Необработанная ошибка', { source: 'unhandledrejection' });
  });
});
