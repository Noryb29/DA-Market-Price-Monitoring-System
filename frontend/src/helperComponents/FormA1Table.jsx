import { fmt } from "./helpers.js";
import { SupplyBadge } from "./Shared.jsx";

const FormA1Table = ({ data, activeCategory, expandedRow, setExpandedRow }) => {
  if (!data.length) {
    return (
      <tr>
        <td colSpan={14} className="text-center py-10 text-gray-500">
          No commodities found
        </td>
      </tr>
    );
  }

  let lastCat = null;

  return data.map((row, i) => {
    const catHeader = row.commodity_category !== lastCat;
    lastCat         = row.commodity_category;
    const isExpanded = expandedRow === i;
    const hasRemarks = row.remarks?.trim();

    return [
      catHeader && activeCategory === "ALL" ? (
        <tr key={`cat-${i}`}>
          <td
            colSpan={14}
            className="bg-green-100 px-3 py-1.5 text-xs font-extrabold text-green-900 uppercase border-t-2 border-green-300"
          >
            {row.commodity_category}
          </td>
        </tr>
      ) : null,

      <tr
        key={i}
        onClick={() => hasRemarks && setExpandedRow(isExpanded ? null : i)}
        className={`text-black border-b border-green-50 transition-colors
          ${hasRemarks ? "cursor-pointer" : "cursor-default"}
          ${i % 2 === 0 ? "bg-white hover:bg-green-50" : "bg-green-50/30 hover:bg-green-50"}`}
      >
        <td className="px-2.5 py-2 font-semibold whitespace-nowrap">
          {hasRemarks && <span className="text-amber-400 mr-1 text-xs">💬</span>}
          {row.commodity}
        </td>
        <td className="px-2.5 py-2 text-gray-500 text-xs">{row.commodity_category}</td>
        <td className="px-2.5 py-2 text-gray-400 text-xs">{row.specification || "—"}</td>
        <td className="px-2.5 py-2 text-gray-500">{row.unit || "—"}</td>
        {[row.respondent_1, row.respondent_2, row.respondent_3, row.respondent_4, row.respondent_5].map((v, ri) => (
          <td key={ri} className={`px-2.5 py-2 text-right ${v !== null ? "text-gray-900" : "text-gray-300"}`}>
            {v ?? "—"}
          </td>
        ))}
        <td className="px-2.5 py-2 text-right text-red-600 font-semibold">{fmt(row.high_range)}</td>
        <td className="px-2.5 py-2 text-right text-green-600 font-semibold">{fmt(row.low_range)}</td>
        <td className="px-2.5 py-2 text-right text-gray-500">{fmt(row.no_mode)}</td>
        <td className="px-2.5 py-2 text-right font-bold text-green-900 text-sm">
          {row.prevailing_price !== null ? `₱${row.prevailing_price}` : "—"}
        </td>
        <td className="px-2.5 py-2">
          <SupplyBadge level={row.supply_level} />
        </td>
      </tr>,

      isExpanded && hasRemarks ? (
        <tr key={`remarks-${i}`}>
          <td colSpan={14} className="px-4 py-2.5 pl-7 bg-amber-50 border-b border-amber-200">
            <div className="flex gap-2">
              <span>📝</span>
              <div>
                <div className="text-xs font-bold text-amber-800 mb-1 uppercase">Remarks</div>
                <div className="text-xs text-amber-900 leading-relaxed">{row.remarks}</div>
              </div>
            </div>
          </td>
        </tr>
      ) : null,
    ];
  });
};

export default FormA1Table;