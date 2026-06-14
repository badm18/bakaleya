import { app } from 'electron';
import fs from 'fs';
import path from 'path';

const serialize = (value: unknown): string => {
  if (value instanceof Error) {
    return `${value.name}: ${value.message}\n${value.stack ?? ''}`;
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const writeErrorLog = (message: string, details?: unknown) => {
  try {
    const logDir = path.join(app.getPath('userData'), 'logs');
    fs.mkdirSync(logDir, { recursive: true });

    const detailsText = details === undefined ? '' : ` ${serialize(details)}`;
    const line = `[${new Date().toISOString()}] [ERROR] ${message}${detailsText}\n`;

    fs.appendFileSync(path.join(logDir, 'app.log'), line, 'utf8');
  } catch {
    // Logging must never break the app flow.
  }
};
