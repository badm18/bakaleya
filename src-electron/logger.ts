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

const isExpectedOfflineNoise = (text: string) =>
  [
    'ERR_INTERNET_DISCONNECTED',
    'ERR_NETWORK_CHANGED',
    'ERR_NAME_NOT_RESOLVED',
    'net::ERR_INTERNET_DISCONNECTED',
    'net::ERR_NETWORK_CHANGED',
    'net::ERR_NAME_NOT_RESOLVED',
  ].some((pattern) => text.includes(pattern));

export const writeErrorLog = (message: string, details?: unknown) => {
  try {
    const detailsText = details === undefined ? '' : ` ${serialize(details)}`;

    if (isExpectedOfflineNoise(`${message}${detailsText}`)) {
      return;
    }

    const logDir = path.join(app.getPath('userData'), 'logs');
    fs.mkdirSync(logDir, { recursive: true });

    const line = `[${new Date().toISOString()}] [ERROR] ${message}${detailsText}\n`;

    fs.appendFileSync(path.join(logDir, 'app.log'), line, 'utf8');
  } catch {
    // Logging must never break the app flow.
  }
};
