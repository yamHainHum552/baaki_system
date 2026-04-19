"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  idle: string;
  pending?: string;
  className?: string;
  disabled?: boolean;
};

export function SubmitButton({
  idle,
  pending = "Saving...",
  className = "",
  disabled = false,
}: SubmitButtonProps) {
  const { pending: isPending } = useFormStatus();

  return (
    <button
      type="submit"
      className={className}
      disabled={disabled || isPending}
      aria-busy={isPending}
    >
      {isPending ? pending : idle}
    </button>
  );
}
