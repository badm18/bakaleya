import type { BrowserWindow, Event, WebContentsConsoleMessageEventParams } from 'electron';
import { writeErrorLog } from './logger';

const parseRendererErrorMessage = (message: string) => {
  const prefixes = ['[renderer-error] ', '[renderer-error-log-failed] '];
  const prefix = prefixes.find((item) => message.startsWith(item));

  if (!prefix) {
    return null;
  }

  try {
    return {
      prefix: prefix.trim(),
      payload: JSON.parse(message.slice(prefix.length)),
    };
  } catch {
    return null;
  }
};

export const attachWindowErrorLogging = (win: BrowserWindow, label: string) => {
  win.webContents.on(
    'console-message',
    (event: Event<WebContentsConsoleMessageEventParams>) => {
      const { level, message, lineNumber, sourceId } = event;

      if (level !== 'error') {
        return;
      }

      const rendererError = parseRendererErrorMessage(message);

      if (rendererError) {
        writeErrorLog(`${label} ${rendererError.prefix}`, {
          level,
          line: lineNumber,
          sourceId,
          ...rendererError.payload,
        });
        return;
      }

      writeErrorLog(`${label} console message`, { level, message, line: lineNumber, sourceId });
    },
  );

  win.webContents.on('preload-error', (_event, preloadPath, error) => {
    writeErrorLog(`${label} preload script failed`, { preloadPath, error });
  });

  win.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      writeErrorLog(`${label} load failed`, {
        errorCode,
        errorDescription,
        validatedURL,
        isMainFrame,
      });
    },
  );

  win.webContents.on(
    'did-fail-provisional-load',
    (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      writeErrorLog(`${label} provisional load failed`, {
        errorCode,
        errorDescription,
        validatedURL,
        isMainFrame,
      });
    },
  );

  win.webContents.on('render-process-gone', (_event, details) => {
    writeErrorLog(`${label} renderer process gone`, details);
  });

  win.on('unresponsive', () => {
    writeErrorLog(`${label} window unresponsive`);
  });
};
