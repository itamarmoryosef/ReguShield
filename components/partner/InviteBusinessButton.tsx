"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { InviteBusinessModal } from "./InviteBusinessModal";

export function InviteBusinessButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
      >
        <Plus className="h-4 w-4" />
        הוסף עסק חדש
      </button>
      <InviteBusinessModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
