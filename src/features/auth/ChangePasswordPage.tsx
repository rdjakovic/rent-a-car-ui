import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { changePassword } from "@/lib/api/queries";
import { errorMessage } from "@/lib/api/errors";

/** Changing one's own password. Needs the current one; the backend signs out the user's other sessions. */
export default function ChangePasswordPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const mismatch = confirm !== "" && next !== confirm;
  const tooShort = next !== "" && next.length < 8;
  const canSubmit = !!current && next.length >= 8 && next === confirm;

  const change = useMutation({
    mutationFn: () => changePassword({ currentPassword: current, newPassword: next }),
    onSuccess: () => {
      toast({ title: "Password changed", description: "Your other sessions have been signed out." });
      setCurrent("");
      setNext("");
      setConfirm("");
      setError("");
    },
    onError: (e) => setError(errorMessage(e)),
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setError("");
    change.mutate();
  }

  return (
    <div className="container mx-auto py-6 px-4 grid gap-6 max-w-lg">
      <div>
        <h1 className="text-3xl font-bold text-charcoal">Change password</h1>
        <p className="text-muted-foreground">Use at least 8 characters.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your password</CardTitle>
          <CardDescription>Your other sessions end when the new password is saved. This one stays signed in.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4" noValidate>
            <div className="grid gap-1">
              <label htmlFor="current-password" className="text-sm font-medium">Current password</label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1">
              <label htmlFor="new-password" className="text-sm font-medium">New password</label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
              />
              {tooShort && <p className="text-xs text-destructive">The new password needs at least 8 characters.</p>}
            </div>
            <div className="grid gap-1">
              <label htmlFor="confirm-password" className="text-sm font-medium">Confirm new password</label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
              {mismatch && <p className="text-xs text-destructive">The passwords do not match.</p>}
            </div>

            {error && (
              <Alert variant="destructive" role="alert">
                <AlertTitle>Could not change the password</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div>
              <Button type="submit" disabled={!canSubmit || change.isPending}>
                {change.isPending ? "Saving…" : "Change password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
