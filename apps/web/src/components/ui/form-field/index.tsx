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
