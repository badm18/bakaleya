import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { writeErrorLog } from '../logger';

type IpcHandler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown;

export const registerLoggedIpcHandler = (channel: string, handler: IpcHandler) => {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await handler(event, ...args);
    } catch (error) {
      writeErrorLog(`IPC handler failed: ${channel}`, {
        channel,
        args,
        error,
      });
      throw error;
    }
  });
};
