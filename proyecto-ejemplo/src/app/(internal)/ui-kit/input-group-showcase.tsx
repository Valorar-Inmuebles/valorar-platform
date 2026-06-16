"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, Label, HelperText, ErrorMessage } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputAffix } from "@/components/ui/input-group";
import { Select, type SelectOption } from "@/components/ui/select";
import {
  IconSearch,
  IconSettings,
} from "@/components/ui/icons";

// ── Section helpers ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-zinc-400">{children}</p>;
}

function Divider() {
  return <div className="h-px bg-zinc-100" />;
}

// ── Demo data ─────────────────────────────────────────────────────────────────

const COUNTRY_CODES: SelectOption[] = [
  { value: "+54",  label: "🇦🇷 +54"  },
  { value: "+1",   label: "🇺🇸 +1"   },
  { value: "+55",  label: "🇧🇷 +55"  },
  { value: "+56",  label: "🇨🇱 +56"  },
  { value: "+598", label: "🇺🇾 +598" },
  { value: "+52",  label: "🇲🇽 +52"  },
  { value: "+34",  label: "🇪🇸 +34"  },
];

const CURRENCIES: SelectOption[] = [
  { value: "ARS", label: "ARS $" },
  { value: "USD", label: "USD $" },
  { value: "EUR", label: "EUR €" },
  { value: "BRL", label: "BRL R$" },
];

// ── Interactive affix demos ───────────────────────────────────────────────────

function PhoneGroupDemo() {
  const [countryCode, setCountryCode] = useState("+54");
  const [phone, setPhone] = useState("");

  return (
    <FormField>
      <Label>Teléfono</Label>
      <InputGroup>
        <InputAffix side="left" interactive>
          <Select
            options={COUNTRY_CODES}
            value={countryCode}
            onChange={setCountryCode}
            placeholder="+54"
          />
        </InputAffix>
        <Input
          inputMode="numeric"
          maxLength={12}
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
          placeholder="1131716941"
        />
      </InputGroup>
      <HelperText>
        {phone
          ? `Número completo: ${countryCode} ${phone}`
          : "Ingrese el número sin el código de país"}
      </HelperText>
    </FormField>
  );
}

function CurrencyGroupDemo() {
  const [currency, setCurrency] = useState("ARS");
  const [amount, setAmount] = useState("");

  return (
    <FormField>
      <Label>Monto</Label>
      <InputGroup>
        <InputAffix side="left" interactive>
          <Select
            options={CURRENCIES}
            value={currency}
            onChange={setCurrency}
            placeholder="ARS"
          />
        </InputAffix>
        <Input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0,00"
        />
      </InputGroup>
      <HelperText>
        {amount ? `${currency} ${amount}` : "Ingrese el monto"}
      </HelperText>
    </FormField>
  );
}

// ── Showcase ─────────────────────────────────────────────────────────────────

export function InputGroupShowcase() {
  const [url, setUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [amount, setAmount] = useState("");

  return (
    <Card flat>
      <CardHeader>
        <CardTitle>InputGroup / InputAffix</CardTitle>
        <span className="font-mono text-xs text-zinc-400">
          static · interactive · left · right · both · states · disabled
        </span>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* ── Interactive affixes ── */}
        <div className="space-y-1.5">
          <SectionLabel>
            Interactive affix — <code className="font-mono text-zinc-500">interactive</code> prop · Select control embedded in left affix
          </SectionLabel>
          <div className="grid gap-6 sm:grid-cols-2">
            <PhoneGroupDemo />
            <CurrencyGroupDemo />
          </div>
        </div>

        <Divider />

        {/* ── Interactive states ── */}
        <div className="space-y-1.5">
          <SectionLabel>Interactive affix — states (error · success)</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2">

            <FormField state="error">
              <Label required>Teléfono (error)</Label>
              <InputGroup state="error">
                <InputAffix side="left" interactive>
                  <Select
                    options={COUNTRY_CODES}
                    value="+54"
                    state="error"
                  />
                </InputAffix>
                <Input defaultValue="abc" />
              </InputGroup>
              <ErrorMessage>Ingrese solo dígitos.</ErrorMessage>
            </FormField>

            <FormField state="success">
              <Label required>Teléfono (success)</Label>
              <InputGroup state="success">
                <InputAffix side="left" interactive>
                  <Select
                    options={COUNTRY_CODES}
                    value="+54"
                    state="success"
                  />
                </InputAffix>
                <Input defaultValue="1131716941" />
              </InputGroup>
              <HelperText>Número válido</HelperText>
            </FormField>

          </div>
        </div>

        <Divider />

        {/* ── Interactive disabled ── */}
        <div className="space-y-1.5">
          <SectionLabel>Interactive affix — disabled</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2">

            <FormField>
              <Label>Teléfono (deshabilitado)</Label>
              <InputGroup>
                <InputAffix side="left" interactive>
                  <Select
                    options={COUNTRY_CODES}
                    value="+54"
                    disabled
                  />
                </InputAffix>
                <Input defaultValue="1131716941" disabled />
              </InputGroup>
            </FormField>

            <FormField>
              <Label>Monto (deshabilitado)</Label>
              <InputGroup>
                <InputAffix side="left" interactive>
                  <Select
                    options={CURRENCIES}
                    value="USD"
                    disabled
                  />
                </InputAffix>
                <Input defaultValue="1500,00" disabled />
              </InputGroup>
            </FormField>

          </div>
        </div>

        <Divider />

        {/* ── Text prefix ── */}
        <div className="space-y-1.5">
          <SectionLabel>Static prefix — side=&quot;left&quot;</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

            <FormField>
              <Label>Sitio web</Label>
              <InputGroup>
                <InputAffix side="left">https://</InputAffix>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="example.com"
                />
              </InputGroup>
              <HelperText>
                {url ? `Valor: "${url}"` : "Ingrese el dominio sin prefijo"}
              </HelperText>
            </FormField>

            <FormField>
              <Label>Usuario</Label>
              <InputGroup>
                <InputAffix side="left">@</InputAffix>
                <Input placeholder="nombre.apellido" />
              </InputGroup>
            </FormField>

            <FormField>
              <Label>Extensión telefónica</Label>
              <InputGroup>
                <InputAffix side="left">ext.</InputAffix>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="3456"
                />
              </InputGroup>
            </FormField>

          </div>
        </div>

        <Divider />

        {/* ── Text suffix ── */}
        <div className="space-y-1.5">
          <SectionLabel>Static suffix — side=&quot;right&quot;</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

            <FormField>
              <Label>Slug</Label>
              <InputGroup>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="mi-expediente"
                />
                <InputAffix side="right">.jurilexia.ar</InputAffix>
              </InputGroup>
              <HelperText>
                {slug ? `URL: "${slug}.jurilexia.ar"` : "URL pública del expediente"}
              </HelperText>
            </FormField>

            <FormField>
              <Label>Honorarios</Label>
              <InputGroup>
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  inputMode="decimal"
                  placeholder="0,00"
                />
                <InputAffix side="right">ARS</InputAffix>
              </InputGroup>
            </FormField>

            <FormField>
              <Label>Tasa de interés</Label>
              <InputGroup>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  placeholder="0"
                />
                <InputAffix side="right">%</InputAffix>
              </InputGroup>
            </FormField>

          </div>
        </div>

        <Divider />

        {/* ── Both sides ── */}
        <div className="space-y-1.5">
          <SectionLabel>Both sides — prefix + suffix</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

            <FormField>
              <Label>Importe</Label>
              <InputGroup>
                <InputAffix side="left">$</InputAffix>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0,00"
                />
                <InputAffix side="right">ARS</InputAffix>
              </InputGroup>
              <HelperText>Pesos argentinos</HelperText>
            </FormField>

            <FormField>
              <Label>Búsqueda con iconos</Label>
              <InputGroup>
                <InputAffix side="left">
                  <IconSearch className="size-3.5" aria-hidden />
                </InputAffix>
                <Input placeholder="Buscar expediente…" />
                <InputAffix side="right">
                  <IconSettings className="size-3.5" aria-hidden />
                </InputAffix>
              </InputGroup>
            </FormField>

            <FormField>
              <Label>Tasa nominal anual</Label>
              <InputGroup>
                <InputAffix side="left">Tasa</InputAffix>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0,00"
                />
                <InputAffix side="right">% TNA</InputAffix>
              </InputGroup>
            </FormField>

          </div>
        </div>

        <Divider />

        {/* ── States (static) ── */}
        <div className="space-y-1.5">
          <SectionLabel>Static affix — states</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-3">

            <FormField>
              <Label>Default</Label>
              <InputGroup state="default">
                <InputAffix side="left">https://</InputAffix>
                <Input placeholder="example.com" />
              </InputGroup>
              <HelperText>Ingrese el dominio</HelperText>
            </FormField>

            <FormField state="error">
              <Label required>Error</Label>
              <InputGroup state="error">
                <InputAffix side="left">https://</InputAffix>
                <Input defaultValue="no es una url válida" />
              </InputGroup>
              <ErrorMessage>URL inválida.</ErrorMessage>
            </FormField>

            <FormField state="success">
              <Label required>Success</Label>
              <InputGroup state="success">
                <InputAffix side="left">https://</InputAffix>
                <Input defaultValue="jurilexia.ar" />
              </InputGroup>
              <HelperText>URL válida</HelperText>
            </FormField>

          </div>
        </div>

        <Divider />

        {/* ── Disabled (static) ── */}
        <div className="space-y-1.5">
          <SectionLabel>Static affix — disabled</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

            <FormField>
              <Label>Prefijo</Label>
              <InputGroup>
                <InputAffix side="left">https://</InputAffix>
                <Input defaultValue="jurilexia.ar" disabled />
              </InputGroup>
            </FormField>

            <FormField>
              <Label>Sufijo</Label>
              <InputGroup>
                <Input defaultValue="15.000" disabled />
                <InputAffix side="right">ARS</InputAffix>
              </InputGroup>
            </FormField>

            <FormField>
              <Label>Ambos</Label>
              <InputGroup>
                <InputAffix side="left">$</InputAffix>
                <Input defaultValue="75.000" disabled />
                <InputAffix side="right">ARS</InputAffix>
              </InputGroup>
            </FormField>

          </div>
        </div>

        <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 space-y-1.5">
          <p className="text-xs leading-relaxed text-zinc-500">
            <span className="font-medium text-zinc-700">Radius:</span>{" "}
            <code className="rounded bg-white px-1 font-mono text-zinc-700">InputGroup</code>{" "}
            automatically resolves corner radius based on child position.
            No manual <code className="rounded bg-white px-1 font-mono text-zinc-700">rounded-*</code>{" "}
            overrides are needed on <code className="rounded bg-white px-1 font-mono text-zinc-700">Input</code>.
          </p>
          <p className="text-xs leading-relaxed text-zinc-500">
            <span className="font-medium text-zinc-700">Interactive:</span>{" "}
            <code className="rounded bg-white px-1 font-mono text-zinc-700">interactive</code>{" "}
            turns the affix into a transparent container and uses{" "}
            <code className="rounded bg-white px-1 font-mono text-zinc-700">[&amp;_button]</code>{" "}
            descendant selectors to reshape the child control&apos;s trigger.
            Pass <code className="rounded bg-white px-1 font-mono text-zinc-700">state</code> explicitly
            to the child control to match the group border color.
          </p>
        </div>

      </CardContent>
    </Card>
  );
}
