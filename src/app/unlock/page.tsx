"use client";

/*
 * THESIS: The gate should feel like part of the gym, not a bouncer.
 * OWN-WORLD: The same graphite lockup and single accent as the home hero.
 * STORY: Recognize your app, type the shared password once, get back to training.
 * FORM: One centered card, one field, one button. Nothing else to parse.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Button, Card, Input, Logo } from "@/components/ui";

export default function UnlockPage() {
  return (
    <Suspense>
      <UnlockForm />
    </Suspense>
  );
}

function UnlockForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error ?? "Something went wrong. Try again.");
        setSubmitting(false);
        return;
      }

      const from = searchParams.get("from");
      // Only same-origin paths; anything else falls back to home.
      router.replace(from?.startsWith("/") && !from.startsWith("//") ? from : "/");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-10">
      <Card bordered padding="lg" className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <Logo size="3rem" withWordmark />
          <h1 className="mt-6 text-h2 font-bold tracking-tight">This deck is private</h1>
          <p className="mt-2 text-body text-muted">
            Enter the password to get back to training.
          </p>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            error={error ?? undefined}
            onChange={(event) => {
              setPassword(event.target.value);
              setError(null);
            }}
          />
          <Button type="submit" fullWidth size="lg" loading={submitting} disabled={!password}>
            Unlock
          </Button>
        </form>
      </Card>
    </div>
  );
}
