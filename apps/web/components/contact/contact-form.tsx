"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@repo/ui/button";
import {
  ErrorMessage,
  FormField,
  Label,
  useField,
} from "@repo/ui/form-field";
import { Input } from "@repo/ui/input";
import { Select } from "@repo/ui/select";
import { useToast } from "@repo/ui/toast";
import { CONTACT_FORM_TOAST_MESSAGE } from "@/lib/contact/contact-content";
import {
  CONTACT_INQUIRY_OPTIONS,
  EMPTY_CONTACT_FORM_VALUES,
  type ContactFormValues,
  type ContactInquiryReason,
} from "@/lib/contact/contact-form";

function ContactTextarea({
  id,
  value,
  onChange,
  onBlur,
  state,
  rows = 5,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur: () => void;
  state: "default" | "error" | "success";
  rows?: number;
  placeholder?: string;
}) {
  const borderStyles = {
    default:
      "border-zinc-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10",
    error:
      "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-500/10",
    success:
      "border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10",
  };

  return (
    <textarea
      id={id}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      rows={rows}
      placeholder={placeholder}
      aria-invalid={state === "error" || undefined}
      className={`min-h-32 w-full resize-y rounded-lg border bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-all duration-150 placeholder:text-zinc-400 ${borderStyles[state]}`}
    />
  );
}

export function ContactForm() {
  const { toast } = useToast();
  const firstName = useField("", { required: "El nombre es obligatorio." });
  const lastName = useField("");
  const email = useField("", {
    required: "El email es obligatorio.",
    email: "Ingresá un email válido.",
  });
  const phone = useField("");
  const [messageValue, setMessageValue] = useState("");
  const [messageTouched, setMessageTouched] = useState(false);

  const [inquiryReason, setInquiryReason] = useState<string>(
    EMPTY_CONTACT_FORM_VALUES.inquiryReason,
  );
  const [consent, setConsent] = useState(false);
  const [consentTouched, setConsentTouched] = useState(false);

  function buildPayload(): ContactFormValues {
    return {
      firstName: firstName.value.trim(),
      lastName: lastName.value.trim(),
      email: email.value.trim(),
      phone: phone.value.trim(),
      inquiryReason: inquiryReason as ContactInquiryReason | "",
      message: messageValue.trim(),
      consent,
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    firstName.touch();
    email.touch();
    setMessageTouched(true);
    setConsentTouched(true);

    const consentErrorOnSubmit = !consent;
    const hasFieldErrors =
      Boolean(firstName.getError()) ||
      Boolean(email.getError()) ||
      !messageValue.trim();

    if (hasFieldErrors || consentErrorOnSubmit) {
      return;
    }

    void buildPayload();

    toast.info(CONTACT_FORM_TOAST_MESSAGE, {
      title: "Funcionalidad en desarrollo",
    });
  }

  const consentError =
    consentTouched && !consent
      ? "Debés aceptar la comunicación para enviar la consulta."
      : undefined;

  const messageError =
    messageTouched && !messageValue.trim()
      ? "El mensaje es obligatorio."
      : undefined;

  const messageState = messageError
    ? "error"
    : messageTouched && messageValue.trim()
      ? "success"
      : "default";

  return (
    <form
      id="contacto-form"
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl border border-border-default bg-surface-card p-6 md:p-8"
    >
      <h2 className="text-xl font-semibold tracking-tight text-text-primary md:text-2xl">
        Envianos tu consulta
      </h2>
      <p className="mt-2 text-sm text-text-secondary">
        Completá el formulario y nos pondremos en contacto a la brevedad.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <FormField state={firstName.state}>
          <Label required>Nombre</Label>
          <Input
            name="firstName"
            autoComplete="given-name"
            value={firstName.value}
            onChange={firstName.onChange}
            onBlur={firstName.onBlur}
            placeholder="Tu nombre"
            className="h-11"
          />
          {firstName.error ? (
            <ErrorMessage>{firstName.error}</ErrorMessage>
          ) : null}
        </FormField>

        <FormField state={lastName.state}>
          <Label>Apellido</Label>
          <Input
            name="lastName"
            autoComplete="family-name"
            value={lastName.value}
            onChange={lastName.onChange}
            onBlur={lastName.onBlur}
            placeholder="Tu apellido"
            className="h-11"
          />
        </FormField>

        <FormField state={email.state}>
          <Label required>Email</Label>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            value={email.value}
            onChange={email.onChange}
            onBlur={email.onBlur}
            placeholder="tu@email.com"
            className="h-11"
          />
          {email.error ? <ErrorMessage>{email.error}</ErrorMessage> : null}
        </FormField>

        <FormField state={phone.state}>
          <Label>Teléfono</Label>
          <Input
            name="phone"
            type="tel"
            autoComplete="tel"
            value={phone.value}
            onChange={phone.onChange}
            onBlur={phone.onBlur}
            placeholder="11 0000-0000"
            className="h-11"
          />
        </FormField>
      </div>

      <div className="mt-5">
        <FormField>
          <Label>Motivo de consulta</Label>
          <Select
            options={CONTACT_INQUIRY_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            value={inquiryReason}
            onChange={setInquiryReason}
            placeholder="Seleccioná un motivo"
            className="[&_button]:h-11"
          />
        </FormField>
      </div>

      <div className="mt-5">
        <FormField state={messageState}>
          <Label required>Mensaje</Label>
          <ContactTextarea
            id="contact-message"
            value={messageValue}
            onChange={(event) => setMessageValue(event.target.value)}
            onBlur={() => setMessageTouched(true)}
            state={messageState}
            placeholder="Contanos en qué podemos ayudarte"
          />
          {messageError ? <ErrorMessage>{messageError}</ErrorMessage> : null}
        </FormField>
      </div>

      <div className="mt-5">
        <label className="flex items-start gap-3 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => {
              setConsent(event.target.checked);
              setConsentTouched(true);
            }}
            className="mt-0.5 size-4 shrink-0 rounded border-border-default text-brand-green focus:ring-brand-green/30"
          />
          <span>Acepto que Valorar Inmuebles se comunique conmigo.</span>
        </label>
        {consentError ? (
          <p className="mt-2 text-xs text-red-500" role="alert">
            {consentError}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        className="mt-8 h-12 w-full rounded-xl bg-brand-green text-sm font-semibold text-white hover:brightness-110 sm:w-auto sm:px-8"
      >
        Enviar consulta
      </Button>
    </form>
  );
}
