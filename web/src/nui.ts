import type { NuiCallback } from './contract';

/**
 * The browser side of the bridge.
 *
 * `fetch` to `https://<resource>/<name>` is how a NUI calls back into Lua. The
 * resource name comes from the parent window rather than being hardcoded, since
 * a renamed resource would otherwise silently stop responding.
 */
declare global {
  interface Window {
    GetParentResourceName?: () => string;
  }
}

const resourceName = (): string =>
  typeof window.GetParentResourceName === 'function'
    ? window.GetParentResourceName()
    : 'nxc_ui';

/**
 * Send a callback to Lua.
 *
 * Never throws. A failed callback must not take the interface down with it — the
 * player would be left looking at a dialog whose buttons do nothing, which is
 * worse than a dialog that closes.
 */
export async function post(name: string, body: NuiCallback): Promise<unknown> {
  try {
    const response = await fetch(`https://${resourceName()}/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(body),
    });
    return await response.json();
  } catch {
    return null;
  }
}

/** Subscribe to messages from Lua. Returns an unsubscribe function. */
export function onMessage(handler: (data: unknown) => void): () => void {
  const listener = (event: MessageEvent): void => handler(event.data);
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}
