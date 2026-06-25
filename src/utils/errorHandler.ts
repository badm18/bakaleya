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

const stringifyForConsole = (value: unknown) => {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const notifyError = (message: string) => {
  Notify.create({
    type: 'negative',
    message,
    timeout: 5000,
  });
};

let lastNotification = '';
let lastNotificationAt = 0;

export const errorHandler = (
  error: unknown,
  fallback = 'Произошла ошибка',
  context?: Record<string, unknown>,
) => {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : fallback;
  const details = {
    error: serializeError(error),
    context,
    url: window.location.href,
    trace: new Error('Renderer error trace').stack,
    preloadBridgeAvailable: Boolean(window.electronAPI?.log?.error),
  };

  console.error(`[renderer-error] ${stringifyForConsole({ message, ...details })}`);

  try {
    window.electronAPI?.log?.error(message, details);
  } catch (logError) {
    console.error(
      `[renderer-error-log-failed] ${stringifyForConsole({
        message,
        logError: serializeError(logError),
        trace: new Error('Renderer log failure trace').stack,
      })}`,
    );
  }

  const now = Date.now();
  if (message !== lastNotification || now - lastNotificationAt > 2000) {
    lastNotification = message;
    lastNotificationAt = now;
    notifyError(message);
  }
};
