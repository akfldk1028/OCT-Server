export const ensureApi = () => {
  if (!window.api) {
    console.warn(
      'Electron API not available. Multi-server features will be limited.',
    );
    return null;
  }
  return window.api;
};

export const ensureOverlayApi = () => {
  if (!window.overlayAPI) {
    console.warn('Overlay API not available. Guide features will be limited.');
    return null;
  }
  return window.overlayAPI;
};
