import { Notify } from 'quasar';

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
  notifyError(message);
}
