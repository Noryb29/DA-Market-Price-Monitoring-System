import { SUPPLY_META } from "./constants.js";

export const fmtPct = (v) => {
  if (v === null || v === undefined || v === "-" || v === "") return "—";
  if (typeof v === "string") return v;
  const pct        = (v * 100).toFixed(2);
  const colorClass = v > 0 ? "text-red-600" : v < 0 ? "text-green-600" : "text-gray-500";
  return (
    <span className={`${colorClass} font-semibold`}>
      {v > 0 ? "+" : ""}{pct}%
    </span>
  );
};

export const SupplyBadge = ({ level }) => {
  const meta = SUPPLY_META[level] || SUPPLY_META["NONE"];
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border
        ${meta.color} ${meta.bg} ${meta.border}`}
    >
      {level}
    </span>
  );
};

/**
 * Signatory card — shows name in bold, title below in muted text.
 * Used in the document footer to mirror the physical form layout.
 */
export const SignatoryCard = ({ label, name, title }) => {
  if (!name) return null;
  return (
    <div className="flex flex-col items-center text-center min-w-40">
      <span className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">{label}</span>
      <span className="text-sm font-bold text-gray-800 underline underline-offset-2 decoration-dotted">
        {name}
      </span>
      {title && (
        <span className="text-[11px] text-gray-500 mt-0.5 italic">{title}</span>
      )}
    </div>
  );
};