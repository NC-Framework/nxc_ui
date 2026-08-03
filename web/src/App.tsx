import { useEffect } from 'react';
import { useUi } from './store';
import { onMessage, post } from './nui';
import type {
  ConfirmMessage, ContextMenuMessage, EmptyMessage, ErrorMessage,
  InputMessage, LoadingMessage, NotifyMessage, ProgressMessage,
} from './contract';
import {
  Confirm, ContextMenu, EmptyState, ErrorState, InputDialog, Loading,
  Notification, Progress,
} from './components';

/**
 * The single NUI.
 *
 * One browser instance for the whole framework rather than one per resource.
 * Every NUI is a browser inside the game client, and a server running eight of
 * them is paying for eight of them (directive 19).
 */
export function App(): React.JSX.Element {
  const { notifications, surface, receive, dismiss, close } = useUi();

  useEffect(() => onMessage(receive), [receive]);

  const respond = (action: string, extra: Record<string, unknown> = {}): void => {
    const currentSurface = surface && 'surface' in surface ? surface.surface : undefined;
    if (!currentSurface) return;
    // The callback names the surface and what happened, and nothing else. It
    // never names the acting player — the server resolves that from the session,
    // and the Lua side refuses a payload that tries.
    void post('callback', { surface: currentSurface, action, ...extra });
    close();
  };

  return (
    <>
      {/* Notifications stack, and never take focus. */}
      <div
        style={{
          position: 'fixed',
          top: 'var(--nxc-space-5)',
          right: 'var(--nxc-space-5)',
          width: '22rem',
        }}
      >
        {notifications.map((n) => (
          <Notification key={(n as NotifyMessage).id} message={n as NotifyMessage} onDismiss={dismiss} />
        ))}
      </div>

      {/* One surface at a time. A second dialog while one is open is a caller
          bug, not something to render. */}
      {surface && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {surface.type === 'confirm' && (
            <Confirm
              message={surface as ConfirmMessage}
              onRespond={(confirmed) => respond(confirmed ? 'confirm' : 'cancel')}
            />
          )}
          {surface.type === 'input' && (
            <InputDialog
              message={surface as InputMessage}
              onSubmit={(values) => respond('submit', { values })}
              onCancel={() => respond('cancel')}
            />
          )}
          {surface.type === 'contextMenu' && (
            <ContextMenu
              message={surface as ContextMenuMessage}
              onChoose={(itemId) => respond('choose', { itemId })}
            />
          )}
          {surface.type === 'progress' && <Progress message={surface as ProgressMessage} />}
          {surface.type === 'loading' && <Loading message={surface as LoadingMessage} />}
          {surface.type === 'error' && (
            <ErrorState message={surface as ErrorMessage} onDismiss={close} />
          )}
          {surface.type === 'empty' && <EmptyState message={surface as EmptyMessage} />}
        </div>
      )}
    </>
  );
}
