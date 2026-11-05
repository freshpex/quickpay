"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { inputClass } from "../../components/ui/password-input";
export function BankSelect({
  banks,
  value,
  onChange,
  disabled,
}: {
  banks: { code: string; name: string }[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId(),
    root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState(""),
    [active, setActive] = useState(0);
  const filtered = banks.filter((b) =>
    b.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  useEffect(() => {
    if (open)
      document
        .getElementById(`${id}-option-${active}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, open, id]);
  const choose = (code: string) => {
    onChange(code);
    setOpen(false);
    trigger.current?.focus();
  };
  return (
    <div ref={root} className="relative">
      <label id={`${id}-label`} className="mb-2 block text-sm font-semibold">
        Bank
      </label>
      <button
        ref={trigger}
        id="bankCode"
        type="button"
        role="combobox"
        aria-labelledby={`${id}-label`}
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => {
          setOpen(!open);
          setSearch("");
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (["ArrowDown", "ArrowUp"].includes(e.key)) {
            e.preventDefault();
            setOpen(true);
            setSearch("");
            setActive(0);
          }
        }}
        className={`${inputClass} flex items-center justify-between gap-3 text-left disabled:opacity-50`}
      >
        <span className="truncate">
          {banks.find((b) => b.code === value)?.name || "Choose a bank"}
        </span>
        <ChevronDown size={18} className="shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-brand/20 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-ink/10 p-3">
            <Search size={18} className="shrink-0 text-brand" />
            <input
              autoFocus
              type="search"
              aria-label="Search banks"
              placeholder="Type a bank name"
              value={search}
              aria-controls={`${id}-list`}
              aria-activedescendant={
                filtered[active] ? `${id}-option-${active}` : undefined
              }
              onChange={(e) => {
                setSearch(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  setOpen(false);
                  trigger.current?.focus();
                } else if (e.key === "Tab") setOpen(false);
                else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((n) =>
                    Math.max(
                      0,
                      Math.min(
                        filtered.length - 1,
                        n + (e.key === "ArrowDown" ? 1 : -1),
                      ),
                    ),
                  );
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (filtered[active]) choose(filtered[active].code);
                }
              }}
              className="min-h-11 w-full min-w-0 bg-transparent text-sm outline-none"
            />
          </div>
          <div
            id={`${id}-list`}
            role="listbox"
            aria-labelledby={`${id}-label`}
            className="max-h-64 overflow-y-auto overscroll-contain p-1"
          >
            {filtered.map((b, i) => (
              <button
                id={`${id}-option-${i}`}
                key={b.code}
                role="option"
                aria-selected={value === b.code}
                tabIndex={-1}
                type="button"
                onClick={() => choose(b.code)}
                onPointerMove={() => setActive(i)}
                className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm ${active === i ? "bg-brand/10 text-brand" : "text-ink"}`}
              >
                {b.name}
                {value === b.code && (
                  <Check size={17} className="shrink-0 text-brand" />
                )}
              </button>
            ))}
            {!filtered.length && (
              <p role="status" className="p-4 text-sm text-ink/60">
                No matching banks. Try another name.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
