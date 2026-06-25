import { app } from 'electron';
import fs from 'fs';
import path from 'path';

const normalizeForLog = (value: unknown, depth = 0): unknown => {
  if (depth > 6) {
    return '[MaxDepth]';
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      cause: value.cause === undefined ? undefined : normalizeForLog(value.cause, depth + 1),
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeForLog(item, depth + 1));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeForLog(item, depth + 1)]),
    );
  }

  return value;
};

const serialize = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(normalizeForLog(value));
  } catch {
    return String(value);
  }
};

export const getErrorLogPath = () => path.join(app.getPath('userData'), 'logs', 'app.log');

export const writeErrorLog = (message: string, details?: unknown) => {
  try {
    const detailsText = details === undefined ? '' : ` ${serialize(details)}`;

    const logPath = getErrorLogPath();
    const logDir = path.dirname(logPath);
    fs.mkdirSync(logDir, { recursive: true });

    const line = `[${new Date().toISOString()}] [ERROR] ${message}${detailsText}\n`;

    fs.appendFileSync(logPath, line, 'utf8');
  } catch {
    // Logging must never break the app flow.
  }
};
