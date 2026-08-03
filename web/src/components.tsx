/**
 * The eight required components (directive 25.4, MDD 5.2).
 *
 * Notification, confirmation, input, context menu, progress, loading, error,
 * empty.
 *
 * Two of those are usually afterthoughts and are deliberately not:
 *
 *   An EMPTY state says what would fill it and how. A blank panel is
 *   indistinguishable from a broken one.
 *
 *   An ERROR state shows a safe message and a next step. "Something went wrong"
 *   with no action is a dead end wearing an apology.
 *
 * Every component here styles from tokens only. A hardcoded colour is a
 * component that will not follow the next theme change, and nothing will find it
 * except reading every file.
 */

import { useEffect, useRef, useState } from 'react';
import type {
  ConfirmMessage,
  ContextMenuMessage,
  EmptyMessage,
  ErrorMessage,
  InputMessage,
  LoadingMessage,
  NotifyMessage,
  ProgressMessage,
  Severity,
} from './contract';
import { MAX_DURATION_MS } from './contract';

const severityColour = (severity: Severity = 'info'): string =>
  ({
    info: 'var(--nxc-info)',
    success: 'var(--nxc-success)',
    warning: 'var(--nxc-warning)',
    error: 'var(--nxc-danger)',
  })[severity];

const panel: React.CSSProperties = {
  background: 'var(--nxc-surface-1)',
  border: '1px solid var(--nxc-border)',
  borderRadius: 'var(--nxc-radius)',
  boxShadow: 'var(--nxc-shadow-2)',
  padding: 'var(--nxc-space-5)',
  maxWidth: '28rem',
};

const button = (variant: 'primary' | 'ghost' | 'danger'): React.CSSProperties => ({
  padding: 'var(--nxc-space-2) var(--nxc-space-4)',
  borderRadius: 'var(--nxc-radius-sm)',
  border: '1px solid transparent',
  font: 'inherit',
  fontSize: 'var(--nxc-text-sm)',
  cursor: 'pointer',
  transition: `background var(--nxc-duration-fast) var(--nxc-ease)`,
  ...(variant === 'primary' && {
    background: 'var(--nxc-accent)',
    color: 'var(--nxc-on-severity)',
  }),
  ...(variant === 'danger' && {
    background: 'var(--nxc-danger)',
    color: 'var(--nxc-on-severity)',
  }),
  ...(variant === 'ghost' && {
    background: 'transparent',
    color: 'var(--nxc-text-secondary)',
    borderColor: 'var(--nxc-border-strong)',
  }),
});

/* ------------------------------------------------------------- notification */

export function Notification({
  message,
  onDismiss,
}: {
  message: NotifyMessage;
  onDismiss: (id: string) => void;
}): React.JSX.Element {
  const { id, durationMs } = message;

  useEffect(() => {
    // Clamped rather than trusted. Lua validates too, but a notification that
    // never leaves is the failure this prevents, and it costs one line.
    const ms = Math.min(durationMs ?? 5000, MAX_DURATION_MS);
    const timer = window.setTimeout(() => onDismiss(id), ms);
    return () => window.clearTimeout(timer);
  }, [id, durationMs, onDismiss]);

  return (
    <div
      className="nxc-interactive"
      /* polite, not assertive: a notification is not an emergency, and assertive
       * interrupts a screen reader mid-sentence. */
      role="status"
      aria-live="polite"
      style={{
        ...panel,
        padding: 'var(--nxc-space-3) var(--nxc-space-4)',
        borderLeft: `3px solid ${severityColour(message.severity)}`,
        marginBottom: 'var(--nxc-space-2)',
        pointerEvents: 'auto',
      }}
    >
      {message.title && (
        <div style={{ fontSize: 'var(--nxc-text-sm)', fontWeight: 600 }}>{message.title}</div>
      )}
      <div style={{ fontSize: 'var(--nxc-text-sm)', color: 'var(--nxc-text-secondary)' }}>
        {message.text}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- confirmation */

export function Confirm({
  message,
  onRespond,
}: {
  message: ConfirmMessage;
  onRespond: (confirmed: boolean) => void;
}): React.JSX.Element {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // A DESTRUCTIVE dialog focuses Cancel, not Confirm. Enter is muscle memory,
    // and defaulting to the destructive action turns a reflex into data loss.
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onRespond(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onRespond]);

  return (
    <div className="nxc-interactive" role="alertdialog" aria-modal="true" style={panel}>
      {message.title && (
        <h2 style={{ margin: 0, fontSize: 'var(--nxc-text-lg)' }}>{message.title}</h2>
      )}
      <p style={{ color: 'var(--nxc-text-secondary)' }}>{message.text}</p>
      <div style={{ display: 'flex', gap: 'var(--nxc-space-2)', justifyContent: 'flex-end' }}>
        <button ref={cancelRef} style={button('ghost')} onClick={() => onRespond(false)}>
          {message.cancelLabel ?? 'Cancel'}
        </button>
        <button
          style={button(message.destructive ? 'danger' : 'primary')}
          onClick={() => onRespond(true)}
        >
          {message.confirmLabel ?? 'Confirm'}
        </button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- input */

export function InputDialog({
  message,
  onSubmit,
  onCancel,
}: {
  message: InputMessage;
  onSubmit: (values: Record<string, string>) => void;
  onCancel: () => void;
}): React.JSX.Element {
  const [values, setValues] = useState<Record<string, string>>({});
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    first.current?.focus();
  }, []);

  const missing = message.fields
    .filter((f) => f.required && !(values[f.name] ?? '').trim())
    .map((f) => f.label);

  return (
    <form
      className="nxc-interactive"
      role="dialog"
      aria-modal="true"
      style={panel}
      onSubmit={(e) => {
        e.preventDefault();
        if (missing.length === 0) onSubmit(values);
      }}
    >
      {message.title && (
        <h2 style={{ margin: 0, fontSize: 'var(--nxc-text-lg)' }}>{message.title}</h2>
      )}
      {message.fields.map((field, index) => (
        <label
          key={field.name}
          style={{ display: 'block', marginBlock: 'var(--nxc-space-3)' }}
        >
          <span style={{ fontSize: 'var(--nxc-text-sm)', color: 'var(--nxc-text-secondary)' }}>
            {field.label}
            {field.required && <span aria-hidden="true"> *</span>}
          </span>
          <input
            ref={index === 0 ? first : undefined}
            type={field.kind ?? 'text'}
            placeholder={field.placeholder}
            required={field.required}
            value={values[field.name] ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
            style={{
              width: '100%',
              marginTop: 'var(--nxc-space-1)',
              padding: 'var(--nxc-space-2)',
              background: 'var(--nxc-surface-2)',
              border: '1px solid var(--nxc-border)',
              borderRadius: 'var(--nxc-radius-sm)',
              color: 'var(--nxc-text-primary)',
              font: 'inherit',
            }}
          />
        </label>
      ))}
      <div style={{ display: 'flex', gap: 'var(--nxc-space-2)', justifyContent: 'flex-end' }}>
        <button type="button" style={button('ghost')} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" style={button('primary')} disabled={missing.length > 0}>
          Submit
        </button>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------- context menu */

export function ContextMenu({
  message,
  onChoose,
}: {
  message: ContextMenuMessage;
  onChoose: (itemId: string) => void;
}): React.JSX.Element {
  return (
    <div className="nxc-interactive" role="menu" style={{ ...panel, padding: 'var(--nxc-space-2)' }}>
      {message.title && (
        <div
          style={{
            padding: 'var(--nxc-space-2)',
            fontSize: 'var(--nxc-text-xs)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--nxc-text-muted)',
          }}
        >
          {message.title}
        </div>
      )}
      {message.items.map((item) => (
        <button
          key={item.id}
          role="menuitem"
          disabled={item.disabled}
          /* A greyed item with no reason is a dead end. The reason is the tooltip
           * AND the accessible name, so it is not mouse-only. */
          title={item.disabledReason}
          aria-description={item.disabledReason}
          onClick={() => onChoose(item.id)}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: 'var(--nxc-space-2) var(--nxc-space-3)',
            background: 'transparent',
            border: 'none',
            borderRadius: 'var(--nxc-radius-sm)',
            color: item.disabled ? 'var(--nxc-text-muted)' : 'var(--nxc-text-primary)',
            font: 'inherit',
            fontSize: 'var(--nxc-text-sm)',
            cursor: item.disabled ? 'not-allowed' : 'pointer',
          }}
        >
          {item.label}
          {item.description && (
            <div style={{ fontSize: 'var(--nxc-text-xs)', color: 'var(--nxc-text-muted)' }}>
              {item.description}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ progress */

export function Progress({ message }: { message: ProgressMessage }): React.JSX.Element {
  const indeterminate = message.value === undefined;
  return (
    <div
      className="nxc-interactive"
      role="progressbar"
      aria-label={message.label}
      /* Indeterminate is not zero, and announcing it as zero tells a screen
       * reader the task has not started when it has. */
      aria-valuenow={indeterminate ? undefined : Math.round((message.value ?? 0) * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{ ...panel, padding: 'var(--nxc-space-3) var(--nxc-space-4)', minWidth: '18rem' }}
    >
      <div style={{ fontSize: 'var(--nxc-text-sm)', marginBottom: 'var(--nxc-space-2)' }}>
        {message.label}
      </div>
      <div
        style={{
          height: '4px',
          background: 'var(--nxc-surface-3)',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: indeterminate ? '40%' : `${(message.value ?? 0) * 100}%`,
            background: 'var(--nxc-accent)',
            transition: `width var(--nxc-duration) var(--nxc-ease)`,
          }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- loading */

export function Loading({ message }: { message: LoadingMessage }): React.JSX.Element {
  return (
    <div
      className="nxc-interactive"
      role="status"
      aria-live="polite"
      style={{ ...panel, textAlign: 'center' }}
    >
      <div style={{ color: 'var(--nxc-text-secondary)', fontSize: 'var(--nxc-text-sm)' }}>
        {message.label ?? 'Loading…'}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- error */

export function ErrorState({
  message,
  onDismiss,
}: {
  message: ErrorMessage;
  onDismiss: () => void;
}): React.JSX.Element {
  return (
    <div
      className="nxc-interactive"
      role="alert"
      style={{ ...panel, borderColor: 'var(--nxc-danger)' }}
    >
      <h2 style={{ margin: 0, fontSize: 'var(--nxc-text-lg)', color: 'var(--nxc-danger)' }}>
        {message.title ?? 'Something went wrong'}
      </h2>
      <p style={{ color: 'var(--nxc-text-secondary)' }}>{message.text}</p>
      {/* The next step. An error without one is a dead end wearing an apology. */}
      {message.action && (
        <p style={{ color: 'var(--nxc-text-muted)', fontSize: 'var(--nxc-text-sm)' }}>
          {message.action}
        </p>
      )}
      <button style={button('ghost')} onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}

/* --------------------------------------------------------------------- empty */

export function EmptyState({ message }: { message: EmptyMessage }): React.JSX.Element {
  return (
    <div className="nxc-interactive" style={{ ...panel, textAlign: 'center' }}>
      <h2 style={{ margin: 0, fontSize: 'var(--nxc-text-base)', color: 'var(--nxc-text-secondary)' }}>
        {message.title ?? 'Nothing here yet'}
      </h2>
      {/* What would fill it, and how. Not decoration — the whole point. */}
      <p style={{ color: 'var(--nxc-text-muted)', fontSize: 'var(--nxc-text-sm)' }}>
        {message.text}
      </p>
    </div>
  );
}
