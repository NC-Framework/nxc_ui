import { useUi } from './store';
import { App } from './App';
import type { NuiMessage } from './contract';

/**
 * The component playground (NXC-P1-028).
 *
 * Every message type, exercised in a browser, so a component can be looked at
 * without a running game server. It is also the only place the two halves of the
 * contract meet: a message shape that Lua would send and this cannot render
 * shows up here as a component that does not appear.
 *
 * The rejected list is shown deliberately. A message the NUI refused is
 * invisible in game by design, and this is where that becomes visible instead.
 */
const SAMPLES: { label: string; message: NuiMessage }[] = [
  {
    label: 'Notification — success',
    message: { type: 'notify', id: 'n1', title: 'Paid', text: 'Your wages arrived.', severity: 'success' },
  },
  {
    label: 'Notification — error',
    message: { type: 'notify', id: 'n2', text: 'The bank is unreachable.', severity: 'error' },
  },
  {
    label: 'Confirm — destructive',
    message: {
      type: 'confirm', id: 'c1', surface: 'delete_character',
      title: 'Delete this character?',
      text: 'Everything they own goes with them. This cannot be undone.',
      confirmLabel: 'Delete', destructive: true,
    },
  },
  {
    label: 'Input',
    message: {
      type: 'input', id: 'i1', surface: 'withdraw', title: 'Withdraw',
      fields: [
        { name: 'amount', label: 'Amount', kind: 'number', required: true },
        { name: 'note', label: 'Note', placeholder: 'Optional' },
      ],
    },
  },
  {
    label: 'Context menu',
    message: {
      type: 'contextMenu', id: 'm1', surface: 'vehicle', title: 'Vehicle',
      items: [
        { id: 'lock', label: 'Lock' },
        { id: 'boot', label: 'Open boot', description: 'Currently empty' },
        { id: 'repair', label: 'Repair', disabled: true, disabledReason: 'You need a repair kit' },
      ],
    },
  },
  { label: 'Progress — determinate', message: { type: 'progress', id: 'p1', label: 'Repairing…', value: 0.4 } },
  { label: 'Progress — indeterminate', message: { type: 'progress', id: 'p2', label: 'Searching…' } },
  { label: 'Loading', message: { type: 'loading', id: 'l1', label: 'Loading your character…' } },
  {
    label: 'Error',
    message: {
      type: 'error', id: 'e1', title: 'Could not load your inventory',
      text: 'The server did not respond in time.',
      action: 'Try again in a moment. If it keeps happening, tell an administrator.',
    },
  },
  {
    label: 'Empty',
    message: {
      type: 'empty', id: 'em1', title: 'No vehicles',
      text: 'Vehicles you buy or are given will appear here.',
    },
  },
  // Deliberately invalid. The playground must show what the NUI refuses, or the
  // refusal is only ever visible as nothing happening.
  { label: 'REJECTED — no text', message: { type: 'notify', id: 'bad1' } as unknown as NuiMessage },
  { label: 'REJECTED — unknown type', message: { type: 'wobble' } as unknown as NuiMessage },
];

export function Playground(): React.JSX.Element {
  const { receive, rejected, close } = useUi();

  return (
    <div style={{ pointerEvents: 'auto', minHeight: '100%', background: 'var(--nxc-surface-0)' }}>
      <div style={{ padding: 'var(--nxc-space-5)', maxWidth: '60rem', margin: '0 auto' }}>
        <h1 style={{ fontSize: 'var(--nxc-text-xl)' }}>Nexus Core UI playground</h1>
        <p style={{ color: 'var(--nxc-text-muted)', fontSize: 'var(--nxc-text-sm)' }}>
          Not shipped in game. Rendered only when GetParentResourceName is absent.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--nxc-space-2)' }}>
          {SAMPLES.map((sample) => (
            <button
              key={sample.label}
              onClick={() => receive(sample.message)}
              style={{
                padding: 'var(--nxc-space-2) var(--nxc-space-3)',
                background: 'var(--nxc-surface-2)',
                border: '1px solid var(--nxc-border)',
                borderRadius: 'var(--nxc-radius-sm)',
                color: 'var(--nxc-text-primary)',
                font: 'inherit',
                fontSize: 'var(--nxc-text-sm)',
                cursor: 'pointer',
              }}
            >
              {sample.label}
            </button>
          ))}
          <button
            onClick={close}
            style={{
              padding: 'var(--nxc-space-2) var(--nxc-space-3)',
              background: 'var(--nxc-accent)',
              border: 'none',
              borderRadius: 'var(--nxc-radius-sm)',
              color: 'var(--nxc-on-severity)',
              font: 'inherit',
              fontSize: 'var(--nxc-text-sm)',
              cursor: 'pointer',
            }}
          >
            Close surface
          </button>
        </div>

        {rejected.length > 0 && (
          <div
            style={{
              marginTop: 'var(--nxc-space-5)',
              padding: 'var(--nxc-space-4)',
              border: '1px solid var(--nxc-danger)',
              borderRadius: 'var(--nxc-radius)',
            }}
          >
            <strong style={{ color: 'var(--nxc-danger)' }}>Refused by the NUI</strong>
            <ul style={{ color: 'var(--nxc-text-secondary)', fontSize: 'var(--nxc-text-sm)' }}>
              {rejected.map((r, i) => (
                <li key={i}>{r.problems.join('; ')}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <App />
    </div>
  );
}
