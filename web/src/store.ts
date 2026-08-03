import { create } from 'zustand';
import type { NuiMessage } from './contract';
import { validateMessage } from './contract';

/**
 * What is currently on screen.
 *
 * Notifications are a LIST and everything else is a single slot, because that is
 * the actual behaviour: several notifications stack, and a second dialog while
 * one is open is a bug in the caller rather than something to render.
 */
interface UiState {
  notifications: NuiMessage[];
  surface: NuiMessage | null;
  /** Messages the NUI refused. Shown in the playground; never in game. */
  rejected: { message: unknown; problems: string[] }[];
  receive: (message: unknown) => void;
  dismiss: (id: string) => void;
  close: () => void;
}

export const useUi = create<UiState>((set) => ({
  notifications: [],
  surface: null,
  rejected: [],

  receive: (message) => {
    const verdict = validateMessage(message);
    if (!verdict.ok) {
      // Recorded rather than thrown. An exception in a message handler takes
      // down the render loop, and then nothing works instead of one thing.
      set((s) => ({ rejected: [...s.rejected, { message, problems: verdict.problems }] }));
      return;
    }

    const m = message as NuiMessage;
    if (m.type === 'close') {
      set({ surface: null });
      return;
    }
    if (m.type === 'notify') {
      set((s) => ({ notifications: [...s.notifications, m] }));
      return;
    }
    set({ surface: m });
  },

  dismiss: (id) =>
    set((s) => ({
      notifications: s.notifications.filter((n) => 'id' in n && n.id !== id),
    })),

  close: () => set({ surface: null }),
}));
