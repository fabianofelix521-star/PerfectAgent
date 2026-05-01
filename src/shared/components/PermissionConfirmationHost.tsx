import { useEffect } from "react";
import { permissionEngine } from "@/core/permissions/PermissionEngine";
import { CommandConfirmationModal } from "@/shared/components/CommandConfirmationModal";
import { usePermissionPromptStore } from "@/shared/permissions/permissionPromptStore";

export function PermissionConfirmationHost() {
  const pendingCommand = usePermissionPromptStore((s) => s.pendingCommand);
  const approve = usePermissionPromptStore((s) => s.approve);
  const reject = usePermissionPromptStore((s) => s.reject);

  useEffect(() => {
    permissionEngine.onNeedsConfirmation((command) =>
      usePermissionPromptStore.getState().openConfirmation(command),
    );
  }, []);

  if (!pendingCommand) return null;

  return (
    <CommandConfirmationModal
      command={pendingCommand}
      onApprove={approve}
      onReject={reject}
    />
  );
}