const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('outlawCode', {
  platform: process.platform,
});

