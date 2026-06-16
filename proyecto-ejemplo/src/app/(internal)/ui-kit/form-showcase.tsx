"use client";

import { useState } from "react";
import {
  FormField,
  Label,
  HelperText,
  ErrorMessage,
  useField,
} from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";

// ── Live validation form ───────────────────────────────────────────────────────

export function FormValidationShowcase() {
  const name     = useField("", { required: true, minLength: 2 });
  const email    = useField("", { required: true, email: true });
  const password = useField("", { required: true, minLength: 8 });

  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Touch all fields so errors appear
    name.touch();
    email.touch();
    password.touch();
    if (!name.getError() && !email.getError() && !password.getError()) {
      setSubmitted(true);
    }
  }

  function handleReset() {
    setSubmitted(false);
    // Re-mount by using key — simplest approach is to clear via empty string
    // (fields track their own state; parent resets via form reset)
  }

  return (
    <div className="space-y-8">

      {/* ── Live validation ── */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-zinc-400">
          Live validation — blur to validate · submit to force-check all fields
        </p>

        {submitted ? (
          <div className="flex max-w-sm items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0 text-emerald-500" aria-hidden>
                <circle cx="8" cy="8" r="6.25" />
                <polyline points="5,8.5 7,10.5 11,6" />
              </svg>
              <span className="text-sm font-medium text-emerald-700">Account created!</span>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-emerald-600 underline-offset-2 hover:underline"
            >
              Reset
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="max-w-sm space-y-4">
            <FormField state={name.state}>
              <Label required>Full name</Label>
              <Input
                placeholder="Jane Smith"
                value={name.value}
                onChange={name.onChange}
                onBlur={name.onBlur}
                autoComplete="name"
              />
              {name.error
                ? <ErrorMessage>{name.error}</ErrorMessage>
                : <HelperText>At least 2 characters.</HelperText>}
            </FormField>

            <FormField state={email.state}>
              <Label required>Email</Label>
              <Input
                type="email"
                placeholder="jane@example.com"
                value={email.value}
                onChange={email.onChange}
                onBlur={email.onBlur}
                autoComplete="email"
              />
              {email.error && <ErrorMessage>{email.error}</ErrorMessage>}
            </FormField>

            <FormField state={password.state}>
              <Label required>Password</Label>
              <Input
                type="password"
                placeholder="Min. 8 characters"
                value={password.value}
                onChange={password.onChange}
                onBlur={password.onBlur}
                autoComplete="new-password"
              />
              {password.error
                ? <ErrorMessage>{password.error}</ErrorMessage>
                : <HelperText>Minimum 8 characters.</HelperText>}
            </FormField>

            <Button type="submit" variant="primary" size="sm">
              Create account
            </Button>
          </form>
        )}
      </div>

      {/* ── Loading state ── */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-zinc-400">
          Loading state — simulates async username check
        </p>
        <UsernameChecker />
      </div>

    </div>
  );
}

// ── Username availability checker (loading demo) ───────────────────────────────

function UsernameChecker() {
  const username = useField("", { required: true, minLength: 3 });
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  function check() {
    if (username.getError()) {
      username.touch();
      return;
    }
    setAvailable(null);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Simulate: names starting with "a" are taken
      setAvailable(!username.value.toLowerCase().startsWith("a"));
    }, 1500);
  }

  const checkedState =
    available === true ? "success"
    : available === false ? "error"
    : username.state;

  return (
    <div className="max-w-xs space-y-2">
      <div className="flex items-end gap-2">
        <FormField state={checkedState} className="flex-1">
          <Label required>Username</Label>
          <Input
            placeholder="e.g. janedoe"
            value={username.value}
            onChange={(e) => {
              username.onChange(e);
              setAvailable(null);
            }}
            onBlur={username.onBlur}
            loading={loading}
            autoComplete="username"
          />
        </FormField>
        <Button
          variant="secondary"
          size="sm"
          onClick={check}
          disabled={loading}
          className="shrink-0"
        >
          Check
        </Button>
      </div>

      {username.error && <ErrorMessage>{username.error}</ErrorMessage>}
      {!loading && available === true && (
        <p className="flex items-center gap-1 text-xs text-emerald-600">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="size-3 shrink-0" aria-hidden>
            <circle cx="8" cy="8" r="6.25" /><polyline points="5,8.5 7,10.5 11,6" />
          </svg>
          Username is available
        </p>
      )}
      {!loading && available === false && (
        <ErrorMessage>Username is already taken. Try another.</ErrorMessage>
      )}
    </div>
  );
}

// ── CurrencyInput showcase ────────────────────────────────────────────────────

export function CurrencyInputShowcase() {
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [price,  setPrice]  = useState<number | undefined>(1250.5);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

      {/* Uncontrolled-style: empty on mount */}
      <div className="space-y-1.5">
        <CurrencyInput
          label="Amount"
          hint={amount != null ? `Value: ${amount}` : "Empty"}
          value={amount}
          onChange={setAmount}
        />
      </div>

      {/* Pre-filled value */}
      <div className="space-y-1.5">
        <CurrencyInput
          label="Price"
          hint="Focus to edit, blur to reformat"
          value={price}
          onChange={setPrice}
        />
      </div>

      {/* Error state via FormField */}
      <FormField state="error">
        <Label required>Minimum deposit</Label>
        <CurrencyInput value={50} onChange={() => {}} />
        <ErrorMessage>Minimum is $ 100,00.</ErrorMessage>
      </FormField>

      {/* Disabled */}
      <CurrencyInput
        label="Fixed fee"
        value={299.99}
        hint="Read-only"
        disabled
      />

    </div>
  );
}
