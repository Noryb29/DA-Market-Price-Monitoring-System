import { SupplyBadge, fmtPct } from "./Shared.jsx";

const FormB1Table = ({ data, activeCategory, expandedRow, setExpandedRow }) => {
  if (!data.length) {
    return (
      <tr>
        <td colSpan={10} className="text-center py-10 text-gray-500">
          No commodities found
        </td>
      </tr>
    );
  }

  let lastCat = null;

  return data.map((row, i) => {
    const catHeader  = row.commodity_category !== lastCat;
    lastCat          = row.commodity_category;
    const isExpanded = expandedRow === i;
    const hasRemarks = row.remarks?.trim();

    return [
      catHeader && activeCategory === "ALL" ? (
        <tr key={`cat-${i}`}>
          <td
            colSpan={10}
            className="bg-green-100 px-3 py-1.5 text-xs font-extrabold text-green-900 uppercase border-t-2 border-green-300"
          >
            {row.commodity_category}
          </td>
        </tr>
      ) : null,

      <tr
        key={i}
        onClick={() => hasRemarks && setExpandedRow(isExpanded ? null : i)}
        className={`border-b border-green-50 transition-colors
          ${hasRemarks ? "cursor-pointer" : "cursor-default"}
          ${i % 2 === 0 ? "bg-white hover:bg-green-50" : "bg-green-50/30 hover:bg-green-50"}`}
      >
        <td className="px-2.5 py-2 font-semibold whitespace-nowrap text-black">
          {hasRemarks && <span className="text-amber-400 mr-1 text-xs">💬</span>}
          {row.commodity}
        </td>
        <td className="px-2.5 py-2 text-gray-500 text-xs">{row.commodity_category}</td>
        <td className="px-2.5 py-2 text-gray-400 text-xs">{row.specification || "—"}</td>
        <td className="px-2.5 py-2 text-gray-500">{row.unit || "—"}</td>
        <td className="px-2.5 py-2 text-right text-red-600 font-semibold">
          {row.high_range !== null ? `₱${row.high_range}` : "—"}
        </td>
        <td className="px-2.5 py-2 text-right text-green-600 font-semibold">
          {row.low_range !== null ? `₱${row.low_range}` : "—"}
        </td>
        <td className="px-2.5 py-2 text-right font-bold text-green-900 text-sm">
          {row.prevailing_today !== null ? `₱${row.prevailing_today}` : "—"}
        </td>
        <td className="px-2.5 py-2 text-right text-gray-500">
          {row.prevailing_previous !== null ? `₱${row.prevailing_previous}` : "—"}
        </td>
        <td className="px-2.5 py-2 text-right">{fmtPct(row.pct_change)}</td>
        <td className="px-2.5 py-2">
          <SupplyBadge level={row.supply_level} />
        </td>
      </tr>,

      isExpanded && hasRemarks ? (
        <tr key={`remarks-${i}`}>
          <td colSpan={10} className="px-4 py-2.5 pl-7 bg-amber-50 border-b border-amber-200">
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

export default FormB1Table;