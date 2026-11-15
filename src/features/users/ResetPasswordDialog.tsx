import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { errorMessage } from "@/lib/api/errors";
import { resetUserPassword, type UserResponseDto } from "@/lib/api/queries";

/** Administrators set a new password for an account; the user's sessions end. */
export default function ResetPasswordDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserResponseDto | null;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setPassword("");
    setConfirm("");
    setError("");
  }, [open]);

  const tooShort = password !== "" && password.length < 8;
  const mismatch = confirm !== "" && password !== confirm;
  const canSubmit = password.length >= 8 && password === confirm;

  const reset = useMutation({
    mutationFn: () => resetUserPassword(user!.id!, password),
    onSuccess: () => {
      toast({ title: "Password reset", description: `${user?.username} must sign in with the new password.` });
      onOpenChange(false);
    },
    onError: (e) => setError(errorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Set a new password for {user?.firstName} {user?.lastName} ({user?.username}). Their sessions end.
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) {
              setError("");
              reset.mutate();
            }
          }}
        >
          <div className="grid gap-1">
            <label htmlFor="reset-password" className="text-sm font-medium">New password</label>
            <Input id="reset-password" type="password" autoComplete="new-password" value={password}
                   onChange={(e) => setPassword(e.target.value)} />
            {tooShort && <p className="text-xs text-destructive">At least 8 characters.</p>}
          </div>
          <div className="grid gap-1">
            <label htmlFor="reset-confirm" className="text-sm font-medium">Confirm password</label>
            <Input id="reset-confirm" type="password" autoComplete="new-password" value={confirm}
                   onChange={(e) => setConfirm(e.target.value)} />
            {mismatch && <p className="text-xs text-destructive">The passwords do not match.</p>}
          </div>

          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!canSubmit || reset.isPending}>
              {reset.isPending ? "Saving…" : "Reset password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
