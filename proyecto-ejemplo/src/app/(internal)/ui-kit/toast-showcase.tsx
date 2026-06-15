"use client";

import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

export function ToastShowcase() {
  const { toast } = useToast();

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => toast.success("Profile saved successfully")}
      >
        Success
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => toast.error("Failed to save changes")}
      >
        Error
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => toast.info("A new version is available")}
      >
        Info
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => toast.warning("You're running low on storage")}
      >
        Warning
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() =>
          toast.success("invoice_march.pdf uploaded", { title: "Upload complete" })
        }
      >
        With title
      </Button>
    </div>
  );
}
