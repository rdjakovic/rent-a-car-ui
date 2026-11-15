import { useState, type FormEvent } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/api/errors";
import { login } from "@/lib/auth/session";
import { useAuthStore } from "@/lib/auth/authStore";

/** Only paths inside this app: no other sites ("//host") and no loop back to the login page */
export function safeReturnTo(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/login") ? value : "/";
}

export default function LoginPage() {
  const status = useAuthStore((state) => state.status);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get("returnTo"));

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  if (status === "authenticated") {
    return <Navigate to={returnTo} replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await login(username.trim(), password);
      navigate(returnTo, { replace: true });
    } catch (e) {
      setError(errorMessage(e));
      setPassword("");
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm grid gap-6">
        <div className="flex items-center justify-center gap-3">
          <img src="/logo.svg" alt="" className="h-12 w-12" />
          <h1 className="text-2xl font-semibold text-brand-navy">
            NextStep <span className="text-brand-emerald">RentACar</span>
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sign in</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-4" noValidate>
              <div className="grid gap-1">
                <label htmlFor="username" className="text-sm font-medium">Username or email</label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  required
                />
              </div>
              <div className="grid gap-1">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive" role="alert">
                  <AlertTitle>Could not sign in</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={pending || !username.trim() || !password}>
                {pending ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
