import { create } from "zustand";
import type { SystemCommand } from "@/core/permissions/PermissionEngine";

let activeResolver: ((approved: boolean) => void) | null = null;

interface PermissionPromptState {
  pendingCommand?: SystemCommand;
  openConfirmation: (command: SystemCommand) => Promise<boolean>;
  approve: () => void;
  reject: () => void;
}

export const usePermissionPromptStore = create<PermissionPromptState>((set) => ({
  pendingCommand: undefined,
  openConfirmation: (command) =>
    new Promise<boolean>((resolve) => {
      activeResolver?.(false);
      activeResolver = resolve;
      set({ pendingCommand: command });
    }),
  approve: () => {
    activeResolver?.(true);
    activeResolver = null;
    set({ pendingCommand: undefined });
  },
  reject: () => {
    activeResolver?.(false);
    activeResolver = null;
    set({ pendingCommand: undefined });
  },
}));