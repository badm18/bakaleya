type ElectronAPI = Window['electronAPI'];

let cachedElectronAPI: ElectronAPI | null = null;

export const getElectronAPI = (): ElectronAPI => {
  const api = cachedElectronAPI ?? (window as Window & { electronAPI?: ElectronAPI }).electronAPI;

  if (!api) {
    throw new Error('Внутренний API приложения недоступен: preload bridge не инициализирован');
  }

  cachedElectronAPI = api;

  return api;
};
