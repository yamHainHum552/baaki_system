"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { BaakiLoader } from "@/components/baaki-loader";

export function AuthFormShell({
  action,
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  className?: string;
  children: ReactNode;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <>
      <form
        action={action}
        className={className}
        onSubmit={() => {
          setIsSubmitting(true);
        }}
      >
        {children}
      </form>

      {isSubmitting ? (
        <div className="dialog-backdrop fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="dialog-panel flex min-h-[180px] w-full max-w-xs items-center justify-center p-8">
            <BaakiLoader compact />
          </div>
        </div>
      ) : null}
    </>
  );
}
