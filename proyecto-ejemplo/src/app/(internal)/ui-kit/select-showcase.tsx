"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Label } from "@/components/ui/form-field";
import { ErrorMessage } from "@/components/ui/form-field";
import { HelperText } from "@/components/ui/form-field";
import {
  MultiSelect,
  SearchableSelect,
  Select,
  type SelectOption,
} from "@/components/ui/select";

const ROLE_OPTIONS: SelectOption[] = [
  { value: "admin", label: "Admin" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
  { value: "billing", label: "Billing" },
  { value: "guest", label: "Guest", disabled: true },
];

const COUNTRY_OPTIONS: SelectOption[] = [
  { value: "us", label: "United States" },
  { value: "gb", label: "United Kingdom" },
  { value: "de", label: "Germany" },
  { value: "fr", label: "France" },
  { value: "jp", label: "Japan" },
  { value: "br", label: "Brazil" },
  { value: "ca", label: "Canada" },
  { value: "au", label: "Australia" },
  { value: "in", label: "India" },
  { value: "mx", label: "Mexico" },
];

const TAG_OPTIONS: SelectOption[] = [
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature" },
  { value: "design", label: "Design" },
  { value: "docs", label: "Docs" },
  { value: "infra", label: "Infra" },
  { value: "perf", label: "Performance" },
  { value: "security", label: "Security" },
  { value: "deprecated", label: "Deprecated", disabled: true },
];

function Divider() {
  return <div className="h-px bg-zinc-100" />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-zinc-400">{children}</p>;
}

export function SelectShowcase() {
  const [role, setRole] = useState<string>();
  const [roleError, setRoleError] = useState<string>();

  const [country, setCountry] = useState<string>("us");
  const [tags, setTags] = useState<string[]>(["bug", "design"]);

  const [status, setStatus] = useState<string>();
  const [timezone, setTimezone] = useState<string>("utc");
  const [assignees, setAssignees] = useState<string[]>([]);

  return (
    <Card flat>
      <CardHeader>
        <CardTitle>Select</CardTitle>
        <span className="font-mono text-xs text-zinc-400">
          Select · SearchableSelect · MultiSelect
        </span>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Basic Select */}
        <div className="space-y-1.5">
          <SectionLabel>Select — basic dropdown</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField state={roleError ? "error" : "default"}>
              <Label required>Role</Label>
              <Select
                options={ROLE_OPTIONS}
                value={role}
                onChange={(v) => {
                  setRole(v);
                  setRoleError(undefined);
                }}
                placeholder="Choose a role…"
              />
              {roleError ? (
                <ErrorMessage>{roleError}</ErrorMessage>
              ) : (
                <HelperText>Controls access level.</HelperText>
              )}
            </FormField>

            <FormField state="error">
              <Label required>Status</Label>
              <Select
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                  { value: "pending", label: "Pending" },
                ]}
                value={status}
                onChange={setStatus}
                placeholder="Select status…"
              />
              <ErrorMessage>This field is required.</ErrorMessage>
            </FormField>

            <FormField>
              <Label>Priority</Label>
              <Select
                options={[
                  { value: "low", label: "Low" },
                  { value: "medium", label: "Medium" },
                  { value: "high", label: "High" },
                ]}
                value="medium"
                placeholder="Pick priority…"
                disabled
              />
              <HelperText>Disabled state.</HelperText>
            </FormField>
          </div>
        </div>

        <Divider />

        {/* Searchable Select */}
        <div className="space-y-1.5">
          <SectionLabel>SearchableSelect — filters options as you type</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField>
              <Label required>Country</Label>
              <SearchableSelect
                options={COUNTRY_OPTIONS}
                value={country}
                onChange={setCountry}
                placeholder="Search country…"
              />
              <HelperText>Type to filter 10+ options.</HelperText>
            </FormField>

            <FormField state="success">
              <Label>Timezone</Label>
              <SearchableSelect
                options={[
                  { value: "utc", label: "UTC" },
                  { value: "est", label: "Eastern Time (ET)" },
                  { value: "pst", label: "Pacific Time (PT)" },
                  { value: "cet", label: "Central European (CET)" },
                  { value: "jst", label: "Japan Standard (JST)" },
                ]}
                value={timezone}
                onChange={setTimezone}
                placeholder="Search timezone…"
              />
              <HelperText>Success state.</HelperText>
            </FormField>

            <FormField>
              <Label>Locale</Label>
              <SearchableSelect
                options={[
                  { value: "en-us", label: "English (US)" },
                  { value: "en-gb", label: "English (UK)" },
                  { value: "de", label: "German" },
                  { value: "fr", label: "French" },
                ]}
                placeholder="Search locale…"
                disabled
              />
              <HelperText>Disabled state.</HelperText>
            </FormField>
          </div>
        </div>

        <Divider />

        {/* Multi Select */}
        <div className="space-y-1.5">
          <SectionLabel>MultiSelect — multiple selection with tags</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField>
              <Label>Labels</Label>
              <MultiSelect
                options={TAG_OPTIONS}
                value={tags}
                onChange={setTags}
                placeholder="Add labels…"
              />
              <HelperText>
                {tags.length > 0
                  ? `${tags.length} selected`
                  : "Click to select labels."}
              </HelperText>
            </FormField>

            <FormField state="error">
              <Label required>Assignees</Label>
              <MultiSelect
                options={[
                  { value: "alice", label: "Alice" },
                  { value: "bob", label: "Bob" },
                  { value: "carol", label: "Carol" },
                  { value: "dan", label: "Dan" },
                ]}
                value={assignees}
                onChange={setAssignees}
                placeholder="Select assignees…"
              />
              <ErrorMessage>At least one assignee required.</ErrorMessage>
            </FormField>

            <FormField>
              <Label>Permissions</Label>
              <MultiSelect
                options={[
                  { value: "read", label: "Read" },
                  { value: "write", label: "Write" },
                  { value: "delete", label: "Delete" },
                ]}
                value={["read", "write"]}
                placeholder="Select permissions…"
                disabled
              />
              <HelperText>Disabled state.</HelperText>
            </FormField>
          </div>
        </div>

        <Divider />

        {/* Validate interaction */}
        <div className="space-y-1.5">
          <SectionLabel>Validation on submit</SectionLabel>
          <div className="flex items-end gap-4">
            <div className="w-56">
              <FormField state={roleError ? "error" : "default"}>
                <Label required>Role (required)</Label>
                <Select
                  options={ROLE_OPTIONS}
                  value={role}
                  onChange={(v) => {
                    setRole(v);
                    setRoleError(undefined);
                  }}
                  placeholder="Choose a role…"
                />
                {roleError && <ErrorMessage>{roleError}</ErrorMessage>}
              </FormField>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!role) setRoleError("Role is required.");
              }}
              className="mb-[1px] inline-flex h-8 items-center rounded-lg bg-indigo-600 px-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              Submit
            </button>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
