import React, { useEffect, useState } from "react"
import { useVegetableStore } from "../store/VegetableStore"
import Swal from "sweetalert2"
import EditCommodityModal from "../helperComponents/EditCommodityModal.jsx"
import PriceHistoryModal from "../helperComponents/PriceHistoryModal.jsx"

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (val) =>
  val != null ? `₱${Number(val).toFixed(2)}` : null

const fmtDate = (dateStr) => {
  if (!dateStr) return "—"
  const [y, m, d] = String(dateStr).split("T")[0].split("-")
  return new Date(+y, +m - 1, +d).toLocaleDateString()
}

// ─── Main Component ───────────────────────────────────────────────────────────
const CommodityTable = ({ onAddPriceRecord, search = "", categoryFilter = "" }) => {
  const {
    vegetables,
    categories,
    fetchVegetables,
    fetchCategories,
    deleteCommodity,
    updateCommodity,
  } = useVegetableStore()

  const [editTarget, setEditTarget]                   = useState(null)
  const [historyTarget, setHistoryTarget]             = useState(null)
  const [expandedRespondents, setExpandedRespondents] = useState({})
  const [marketFilter, setMarketFilter]               = useState("")

  useEffect(() => {
    fetchVegetables()
    fetchCategories()
  }, [])

  // ── All markets (stable sorted) ───────────────────────────────────────────
  const allMarkets = [
    ...new Set(vegetables.flatMap((v) => Object.keys(v.markets ?? {}))),
  ]
    .filter(Boolean)
    .sort()

  // ── Auto-select first market once data loads; never allow empty selection ──
  useEffect(() => {
    if (allMarkets.length > 0 && !marketFilter) {
      setMarketFilter(allMarkets[0])
    }
  }, [allMarkets.join(",")])

  // ── Filter by search + category ───────────────────────────────────────────
  const filtered = vegetables.filter((v) => {
    const matchSearch = search
      ? v.name?.toLowerCase().includes(search.toLowerCase())
      : true
    const matchCat = categoryFilter
      ? v.categories?.toLowerCase() === categoryFilter.toLowerCase()
      : true
    return matchSearch && matchCat
  })

  // ── Group by category ─────────────────────────────────────────────────────
  const grouped = filtered.reduce((acc, v) => {
    const cat = v.categories || "Uncategorized"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(v)
    return acc
  }, {})

  // ── Visible columns — always exactly one market ───────────────────────────
  const visibleMarkets = allMarkets.filter((m) => m === marketFilter)
  const colSpanTotal   = 4 + visibleMarkets.length * 3 + 1

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleDelete = async (commodity) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete Commodity?",
      html: `<p>This will permanently delete <strong>${commodity.name}</strong> and all its price records.</p>`,
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      confirmButtonColor: "#ef4444",
      cancelButtonText: "Cancel",
    })
    if (result.isConfirmed) await deleteCommodity(commodity.id)
  }

  const handleSaveEdit = async (id, form) => {
    await updateCommodity(id, form)
    setEditTarget(null)
  }

  const toggleRespondents = (id) =>
    setExpandedRespondents((prev) => ({ ...prev, [id]: !prev[id] }))

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full">

      {/* Result count */}
      <div className="flex items-center justify-end">
        <span className="text-xs text-gray-400">
          {filtered.length} commodit{filtered.length !== 1 ? "ies" : "y"}
        </span>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto rounded-xl border border-base-300 bg-base-100">
        <table className="table table-sm table-zebra w-full">

          {/* ── Head ── */}
          <thead className="bg-base-200 z-10">

            {/* Row 1 */}
            <tr>
              <th rowSpan={2} className="align-bottom">Commodity</th>
              <th rowSpan={2} className="align-bottom">Specification</th>
              <th rowSpan={2} className="align-bottom">Category</th>
              <th rowSpan={2} className="align-bottom">Date</th>

              {/* Market header + dropdown */}
              <th
                colSpan={Math.max(visibleMarkets.length * 3, 1)}
                className="text-center border-l border-base-300 pb-2"
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs font-semibold text-gray-600">Market</span>
                  <select
                    className="select select-xs select-bordered font-normal text-xs max-w-[220px]"
                    value={marketFilter}
                    onChange={(e) => {
                      if (e.target.value) setMarketFilter(e.target.value)
                    }}
                  >
                    {allMarkets.length === 0 ? (
                      <option value="">No Market Selected</option>
                    ) : (
                      allMarkets.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))
                    )}
                  </select>
                </div>
              </th>

              <th rowSpan={2} className="text-center align-bottom">Actions</th>
            </tr>

            {/* Row 2: Prev / High / Low — or placeholder when no market yet */}
            <tr className="text-xs text-gray-400">
              {visibleMarkets.length > 0 ? (
                visibleMarkets.map((m) => (
                  <React.Fragment key={m}>
                    <th className="text-center font-normal border-l border-base-300">Prev.</th>
                    <th className="text-center font-normal">High</th>
                    <th className="text-center font-normal">Low</th>
                  </React.Fragment>
                ))
              ) : (
                <th className="text-center font-normal border-l border-base-300 text-gray-300 italic">
                  No Market Selected
                </th>
              )}
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody>
            {/* No market selected state */}
            {visibleMarkets.length === 0 ? (
              <tr>
                <td colSpan={colSpanTotal} className="text-center text-gray-400 py-10">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-2xl">🏪</span>
                    <span>No Market Selected</span>
                    <span className="text-xs text-gray-300">Select a market from the dropdown above to view prices.</span>
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {Object.entries(grouped).map(([category, rows]) => (
                  <React.Fragment key={category}>

                    {/* Category divider */}
                    <tr className="bg-green-50">
                      <td
                        colSpan={colSpanTotal}
                        className="text-xs font-bold text-green-700 uppercase tracking-wide py-2 px-4"
                      >
                        {category}
                      </td>
                    </tr>

                    {rows.map((veg) => (
                      <React.Fragment key={veg.id}>

                        <tr className="hover:bg-base-200 transition-colors">

                          <td className="font-medium whitespace-nowrap">{veg.name}</td>

                          <td className="text-gray-500 text-xs">{veg.specification || "—"}</td>

                          <td>
                            <span className="badge badge-outline badge-sm text-xs">
                              {veg.categories}
                            </span>
                          </td>

                          <td className="text-xs text-gray-500 whitespace-nowrap">
                            {fmtDate(veg.price_date)}
                          </td>

                          {visibleMarkets.map((m) => {
                            const prices = veg.markets?.[m]
                            return (
                              <React.Fragment key={m}>
                                <td className="text-center text-xs border-l border-base-300">
                                  {prices?.prevailing != null
                                    ? <span className="text-green-700 font-semibold">{fmt(prices.prevailing)}</span>
                                    : <span className="text-gray-300">—</span>}
                                </td>
                                <td className="text-center text-xs">
                                  {prices?.high != null
                                    ? <span>{fmt(prices.high)}</span>
                                    : <span className="text-gray-300">—</span>}
                                </td>
                                <td className="text-center text-xs">
                                  {prices?.low != null
                                    ? <span>{fmt(prices.low)}</span>
                                    : <span className="text-gray-300">—</span>}
                                </td>
                              </React.Fragment>
                            )
                          })}

                          {/* Actions */}
                          <td>
                            <div className="flex items-center gap-1 justify-center">
                              <button
                                className="btn btn-xs btn-ghost tooltip tooltip-top"
                                data-tip="Respondents"
                                onClick={() => toggleRespondents(veg.id)}
                              >
                                {expandedRespondents[veg.id] ? "▲" : "▼"}
                              </button>
                              <button
                                className="btn btn-xs btn-ghost tooltip tooltip-top"
                                data-tip="Price History"
                                onClick={() => setHistoryTarget(veg)}
                              >
                                📈
                              </button>
                              <button
                                className="btn btn-xs btn-ghost tooltip tooltip-top"
                                data-tip="Add Price Record"
                                onClick={() => onAddPriceRecord?.(veg)}
                              >
                                ➕
                              </button>
                              <button
                                className="btn btn-xs btn-ghost tooltip tooltip-top"
                                data-tip="Edit"
                                onClick={() => setEditTarget(veg)}
                              >
                                ✏️
                              </button>
                              <button
                                className="btn btn-xs btn-ghost text-red-400 tooltip tooltip-top"
                                data-tip="Delete"
                                onClick={() => handleDelete(veg)}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Respondents expandable row */}
                        {expandedRespondents[veg.id] && (
                          <tr className="bg-base-200">
                            <td colSpan={colSpanTotal} className="py-2 px-6">
                              <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                                <span className="font-semibold text-gray-500">Respondents:</span>
                                {[1, 2, 3, 4, 5].map((n) => {
                                    const prices = veg.markets?.[marketFilter]   // ← use marketFilter
                                    const val = prices?.[`respondent_${n}`]      // ← pull from market data
                                  return (
                                    <span key={n} className="flex items-center gap-1">
                                      <span className="badge badge-ghost badge-sm">R{n}</span>
                                      <span className={val != null ? "font-medium" : "text-gray-300"}>
                                        {val != null ? `₱${val}` : "n/a"}
                                      </span>
                                    </span>
                                  )
                                })}
                              </div>
                            </td>
                          </tr>
                        )}

                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))}

                {/* No commodities match filters */}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={colSpanTotal} className="text-center text-gray-400 py-10">
                      No commodities found.
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modals ── */}
      <EditCommodityModal
        commodity={editTarget}
        categories={categories}
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleSaveEdit}
      />

      <PriceHistoryModal
        commodity={historyTarget}
        isOpen={!!historyTarget}
        onClose={() => setHistoryTarget(null)}
      />
    </div>
  )
}

export default CommodityTable