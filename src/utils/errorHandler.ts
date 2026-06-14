import { Notify } from 'quasar';

const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return error;
};

const notifyError = (message: string) => {
  Notify.create({
    type: 'negative',
    message,
    timeout: 5000,
  });
}

export const errorHandler = (error: unknown, fallback = 'Произошла ошибка') => {
  console.error(error);
  const message = error instanceof Error ? error.message : fallback;
  window.electronAPI?.log?.error(message, serializeError(error));
  notifyError(message);
}
