const { contextBridge } = require('electron');

const aiProxyPrefix = '--outlaw-code-ai-proxy=';
const aiProxyTokenPrefix = '--outlaw-code-ai-proxy-token=';
const aiProxyArg = process.argv.find((arg) => arg.startsWith(aiProxyPrefix));
const aiProxyTokenArg = process.argv.find((arg) => arg.startsWith(aiProxyTokenPrefix));
const aiProxyBaseURL = aiProxyArg?.slice(aiProxyPrefix.length);
const aiProxyToken = aiProxyTokenArg?.slice(aiProxyTokenPrefix.length);

contextBridge.exposeInMainWorld('outlawCode', {
  platform: process.platform,
  aiProxyBaseURL,
  aiProxyToken,
});
