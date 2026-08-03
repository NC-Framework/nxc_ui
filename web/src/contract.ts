/**
 * The NUI contract, in TypeScript.
 *
 * The other half of `shared/contracts.lua`. Both sides validate, in both
 * directions, because neither can trust the other for a different reason:
 *
 *   Lua does not trust the NUI because the browser runs on the player's machine.
 *   The NUI does not trust Lua because a malformed message renders a broken
 *   panel rather than raising an error, and a blank panel is indistinguishable
 *   from a broken one.
 *
 * KEEPING THE TWO IN STEP IS A REAL RISK and there is no compiler spanning them.
 * The shapes are stated once here and once in Lua, and the playground exercises
 * every message type so a divergence shows up as a component that will not
 * render rather than as a bug in production.
 */

export const MESSAGE = {
  NOTIFY: 'notify',
  CONFIRM: 'confirm',
  INPUT: 'input',
  CONTEXT_MENU: 'contextMenu',
  PROGRESS: 'progress',
  LOADING: 'loading',
  ERROR: 'error',
  EMPTY: 'empty',
  CLOSE: 'close',
} as const;

export type MessageType = (typeof MESSAGE)[keyof typeof MESSAGE];

export type Severity = 'info' | 'success' | 'warning' | 'error';

/** Mirrors Contracts.MIN_DURATION_MS / MAX_DURATION_MS. */
export const MIN_DURATION_MS = 1000;
export const MAX_DURATION_MS = 30000;
export const MAX_MENU_ITEMS = 200;

export interface NotifyMessage {
  type: typeof MESSAGE.NOTIFY;
  id: string;
  text: string;
  title?: string;
  severity?: Severity;
  durationMs?: number;
}

export interface ConfirmMessage {
  type: typeof MESSAGE.CONFIRM;
  id: string;
  surface: string;
  text: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm action as dangerous and never focuses it by default. */
  destructive?: boolean;
}

export interface InputField {
  name: string;
  label: string;
  kind?: 'text' | 'number' | 'password';
  placeholder?: string;
  required?: boolean;
}

export interface InputMessage {
  type: typeof MESSAGE.INPUT;
  id: string;
  surface: string;
  title?: string;
  fields: InputField[];
}

export interface MenuItem {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
  /** Why it is disabled. A greyed item with no reason is a dead end. */
  disabledReason?: string;
}

export interface ContextMenuMessage {
  type: typeof MESSAGE.CONTEXT_MENU;
  id: string;
  surface: string;
  title?: string;
  items: MenuItem[];
}

export interface ProgressMessage {
  type: typeof MESSAGE.PROGRESS;
  id: string;
  label: string;
  durationMs?: number;
  /** 0–1. Absent means indeterminate, which is different from zero. */
  value?: number;
}

export interface LoadingMessage {
  type: typeof MESSAGE.LOADING;
  id: string;
  label?: string;
}

export interface ErrorMessage {
  type: typeof MESSAGE.ERROR;
  id: string;
  text: string;
  title?: string;
  /** What the player can do about it. An error with no next step is a dead end. */
  action?: string;
}

export interface EmptyMessage {
  type: typeof MESSAGE.EMPTY;
  id: string;
  text: string;
  title?: string;
}

export interface CloseMessage {
  type: typeof MESSAGE.CLOSE;
  surface?: string;
}

export type NuiMessage =
  | NotifyMessage
  | ConfirmMessage
  | InputMessage
  | ContextMenuMessage
  | ProgressMessage
  | LoadingMessage
  | ErrorMessage
  | EmptyMessage
  | CloseMessage;

/**
 * What the NUI sends back.
 *
 * Deliberately narrow. It names the surface it is answering and what happened,
 * and nothing else — in particular it never names the acting player, because
 * that is a claim the server refuses. The Lua side rejects a callback carrying
 * `source`, `player`, or `account`, and this type is why nobody adds one by
 * accident.
 */
export interface NuiCallback {
  surface: string;
  action: string;
  values?: Record<string, string | number | boolean>;
  itemId?: string;
}

export interface ValidationResult {
  ok: boolean;
  problems: string[];
}

/**
 * Validate a message arriving from Lua.
 *
 * Returns problems rather than throwing. A thrown error inside a message handler
 * takes down the render loop, and then nothing works instead of one thing.
 */
export function validateMessage(message: unknown): ValidationResult {
  const problems: string[] = [];

  if (typeof message !== 'object' || message === null) {
    return { ok: false, problems: ['message must be an object'] };
  }

  const m = message as Record<string, unknown>;
  const known = (Object.values(MESSAGE) as string[]).includes(m.type as string);
  if (!known) {
    return { ok: false, problems: [`unknown message type: ${String(m.type)}`] };
  }

  const needsText = (): void => {
    if (typeof m.text !== 'string' || m.text.length === 0) problems.push('text is required');
  };

  switch (m.type) {
    case MESSAGE.NOTIFY: {
      needsText();
      if (m.durationMs !== undefined) {
        const d = m.durationMs;
        if (typeof d !== 'number' || d < MIN_DURATION_MS || d > MAX_DURATION_MS) {
          problems.push(`durationMs must be between ${MIN_DURATION_MS} and ${MAX_DURATION_MS}`);
        }
      }
      break;
    }
    case MESSAGE.CONFIRM:
    case MESSAGE.ERROR:
      needsText();
      break;
    case MESSAGE.EMPTY:
      if (typeof m.text !== 'string' || m.text.length === 0) {
        problems.push('an empty state must say what would fill it');
      }
      break;
    case MESSAGE.INPUT: {
      const fields = m.fields;
      if (!Array.isArray(fields) || fields.length === 0) {
        problems.push('an input dialog must ask for something');
      } else {
        fields.forEach((field: InputField, i: number) => {
          if (!field?.name) problems.push(`fields[${i}] needs a name`);
          if (!field?.label) problems.push(`fields[${i}] needs a label a player can read`);
        });
      }
      break;
    }
    case MESSAGE.CONTEXT_MENU: {
      const items = m.items;
      if (!Array.isArray(items) || items.length === 0) {
        problems.push('a menu must offer something');
      } else if (items.length > MAX_MENU_ITEMS) {
        problems.push(`at most ${MAX_MENU_ITEMS} items`);
      }
      break;
    }
    case MESSAGE.PROGRESS:
      if (typeof m.label !== 'string' || m.label.length === 0) {
        problems.push('a progress bar must say what it is doing');
      }
      break;
    default:
      break;
  }

  return { ok: problems.length === 0, problems };
}
