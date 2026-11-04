"use client";
import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
export const inputClass =
  "min-h-12 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:bg-ink/5 aria-invalid:border-red-600 aria-invalid:ring-1 aria-invalid:ring-red-600/20";
export function PasswordInput({
  label,
  id,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  id: string;
  error?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          {...props}
          id={id}
          type={show ? "text" : "password"}
          className={`${inputClass} pr-14`}
          aria-invalid={!!error}
          aria-describedby={
            [props["aria-describedby"], error ? `${id}-error` : ""]
              .filter(Boolean)
              .join(" ") || undefined
          }
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-label={`${show ? "Hide" : "Show"} ${label.toLowerCase()}`}
          aria-pressed={show}
          className="absolute right-1 top-1 flex size-11 items-center justify-center rounded-lg text-ink/60 hover:bg-brand/5"
        >
          {show ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
