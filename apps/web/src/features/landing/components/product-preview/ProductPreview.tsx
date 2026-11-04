import { BrandLogo } from "../../../../components/layout/wordmark";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Phone,
  Wifi,
  Lightbulb,
  Check,
  Gift,
} from "lucide-react";
export function ProductPreview({
  dark = false,
  step = 0,
}: {
  dark?: boolean;
  step?: number;
}) {
  return (
    <div
      className={`w-full max-w-[330px] rounded-[30px] border p-6 shadow-2xl ${dark ? "border-white/10 bg-deep text-white" : "border-ink/5 bg-white text-ink"}`}
    >
      <div className="mb-6 flex items-center justify-between">
        <BrandLogo light={dark} placement="preview" />
        <span className="rounded-full bg-lime px-2 py-1 text-[10px] font-bold text-ink">
          EVERYDAY
        </span>
      </div>
      <p className="text-xs opacity-60">Wallet balance</p>
      <p className="mt-2 text-4xl font-bold tracking-tight">
        ₦25,000<span className="text-xl opacity-50">.00</span>
      </p>
      <div className="mt-5 flex gap-2 text-xs font-bold">
        <span className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-lime p-3 text-ink">
          <ArrowDownLeft size={15} /> Add money
        </span>
        <span className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-current/20 p-3">
          <ArrowUpRight size={15} /> Withdraw
        </span>
      </div>
      <div className="my-6 grid grid-cols-4 gap-3">
        {[Phone, Wifi, Lightbulb, Gift].map((Icon, i) => (
          <div key={i} className="text-center">
            <span
              className={`mx-auto mb-2 flex size-10 items-center justify-center rounded-xl ${dark ? "bg-white/10" : "bg-brand/5 text-brand"}`}
            >
              <Icon size={19} />
            </span>
            <span className="text-[10px]">
              {["Airtime", "Data", "Bills", "Gift cards"][i]}
            </span>
          </div>
        ))}
      </div>
      <div
        className={`flex items-center gap-3 rounded-xl p-3 ${dark ? "bg-white/10" : "bg-paper"}`}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
          <Check size={17} />
        </span>
        <div>
          <p className="text-xs font-bold">
            {
              [
                "All your payments, together",
                "Your payment, clearly reviewed",
                "A receipt you can come back to",
              ][step]
            }
          </p>
          <p className="mt-1 text-[10px] opacity-55">
            {
              [
                "One wallet. Your everyday.",
                "Amount, fees and recipient in view.",
                "Track it from start to finish.",
              ][step]
            }
          </p>
        </div>
      </div>
    </div>
  );
}
