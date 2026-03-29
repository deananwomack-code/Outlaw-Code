import { blink } from './blink';

export async function createSandbox() {
  const sandbox = await (blink as any).sandbox.create({
    template: 'devtools-base',
    metadata: { type: 'code-editor' }
  });
  return sandbox;
}

export function getPreviewUrl(sandboxId: string, port: number = 5173) {
  return `https://${port}-${sandboxId}.preview-blink.com`;
}
