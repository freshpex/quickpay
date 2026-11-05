"use client";
import { phone } from "@quickpay/contracts";
import type { InputHTMLAttributes } from "react";
import { inputClass } from "../password-input";
export function Field({
  label,
  error,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  id: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold">
        {label}
      </label>
      <input
        {...props}
        id={id}
        onInput={(e) => {
          if (props.type === "tel" || props.inputMode === "tel") {
            const input = e.currentTarget;
            input.setCustomValidity(
              input.value && !phone.safeParse(input.value).success
                ? "Enter a valid Nigerian mobile number."
                : "",
            );
          }
          props.onInput?.(e);
        }}
        className={inputClass}
        aria-invalid={!!error}
        aria-describedby={
          [props["aria-describedby"], error ? `${id}-error` : ""]
            .filter(Boolean)
            .join(" ") || undefined
        }
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
