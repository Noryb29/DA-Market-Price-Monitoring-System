import React, { useEffect, useState } from "react"
import { useVegetableStore } from "../store/VegetableStore"
import Swal from "sweetalert2"
import EditCommodityModal from "../helperComponents/EditCommodityModal.jsx"
import PriceHistoryModal from "../helperComponents/PriceHistoryModal.jsx"
import RespondentHistoryModal from "../helperComponents/RespondentHistoryModal.jsx"
import AddPriceRecordModal from './AddPriceRecordModal.jsx'

const fmt = (val) => val != null ? `₱${Number(val).toFixed(2)}` : null

const fmtDate = (dateStr) => {
  if (!dateStr) return "—"
  const [y, m, d] = String(dateStr).split("T")[0].split("-")
  return new Date(+y, +m - 1, +d).toLocaleDateString()
}

const CountBadge = ({ count }) => {
  const n = Number(count ?? 0)
  if (n === 0) return <span className="text-[10px] text-gray-300 leading-none">0</span>
  return (
    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold leading-none">
      {n > 99 ? "99+" : n}
    </span>
  )
}

const CommodityTable = ({ search = "", categoryFilter = "" }) => {
  const {
    vegetables,
    categories,
    fetchVegetables,
    fetchCategories,
    deleteCommodity,
    updateCommodity,
  } = useVegetableStore()

  const [editTarget, setEditTarget]             = useState(null)
  const [historyTarget, setHistoryTarget]       = useState(null)
  const [addPriceTarget, setAddPriceTarget]     = useState(null)
  const [respondentTarget, setRespondentTarget] = useState(null)
  const [marketFilter, setMarketFilter]         = useState("")

  useEffect(() => {
    fetchVegetables()
    fetchCategories()
  }, [])

  const allMarkets = [...new Set(vegetables.flatMap((v) => Object.keys(v.markets ?? {})))]
    .filter(Boolean)
    .sort()

  useEffect(() => {
    if (allMarkets.length > 0 && !marketFilter) setMarketFilter(allMarkets[0])
  }, [allMarkets.join(",")])

  const filtered = vegetables.filter((v) => {
    const matchSearch = search ? v.name?.toLowerCase().includes(search.toLowerCase()) : true
    const matchCat    = categoryFilter ? v.categories?.toLowerCase() === categoryFilter.toLowerCase() : true
    return matchSearch && matchCat
  })

  const grouped = filtered.reduce((acc, v) => {
    const cat = v.categories || "Uncategorized"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(v)
    return acc
  }, {})

  const visibleMarkets = allMarkets.filter((m) => m === marketFilter)
  const colSpanTotal   = 4 + visibleMarkets.length * 3 + 1

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

  const handleAddPriceClose = () => {
    setAddPriceTarget(null)
    fetchVegetables()
  }

  return (
    <div className="flex flex-col gap-4 w-full">

      <div className="flex items-center justify-end">
        <span className="text-xs text-gray-400">
          {filtered.length} commodit{filtered.length !== 1 ? "ies" : "y"}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-base-300 bg-base-100">
        <table className="table table-sm table-zebra w-full">

          <thead className="bg-base-200 z-10">
            <tr>
              <th rowSpan={2} className="align-bottom">Commodity</th>
              <th rowSpan={2} className="align-bottom">Specification</th>
              <th rowSpan={2} className="align-bottom">Category</th>
              <th rowSpan={2} className="align-bottom">Date</th>
              <th
                colSpan={Math.max(visibleMarkets.length * 3, 1)}
                className="text-center border-l border-base-300 pb-2"
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs font-semibold text-gray-600">Market</span>
                  <select
                    className="select select-xs select-bordered font-normal text-xs max-w-[220px]"
                    value={marketFilter}
                    onChange={(e) => { if (e.target.value) setMarketFilter(e.target.value) }}
                  >
                    {allMarkets.length === 0
                      ? <option value="">No Market Selected</option>
                      : allMarkets.map((m) => <option key={m} value={m}>{m}</option>)
                    }
                  </select>
                </div>
              </th>
              <th rowSpan={2} className="text-center align-bottom">Actions</th>
            </tr>

            <tr className="text-xs text-gray-400">
              {visibleMarkets.length > 0 ? (
                visibleMarkets.map((m) => (
                  <React.Fragment key={m}>
                    <th className="text-center font-normal border-l border-base-300">High</th>
                    <th className="text-center font-normal">Low</th>
                    <th className="text-center font-normal font-semibold text-green-700">Prevailing</th>
                  </React.Fragment>
                ))
              ) : (
                <th className="text-center font-normal border-l border-base-300 text-gray-300 italic">
                  No Market Selected
                </th>
              )}
            </tr>
          </thead>

          <tbody>
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

                    <tr className="bg-green-50">
                      <td colSpan={colSpanTotal} className="text-xs font-bold text-green-700 uppercase tracking-wide py-2 px-4">
                        {category}
                      </td>
                    </tr>

                    {rows.map((veg) => (
                      <tr key={veg.id} className="hover:bg-base-200 transition-colors">
                        <td className="font-medium whitespace-nowrap">{veg.name}</td>
                        <td className="text-gray-500 text-xs">{veg.specification || "—"}</td>
                        <td>
                          <span className="badge badge-outline badge-sm text-xs">{veg.categories}</span>
                        </td>
                        <td className="text-xs text-gray-500 whitespace-nowrap">{fmtDate(veg.price_date)}</td>

                        {visibleMarkets.map((m) => {
                          const prices = veg.markets?.[m]
                          return (
                            <React.Fragment key={m}>
                              <td className="text-center text-xs border-l border-base-300">
                                {prices?.high != null
                                  ? <span className="font-semibold">{fmt(prices.high)}</span>
                                  : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="text-center text-xs">
                                {prices?.low != null
                                  ? <span>{fmt(prices.low)}</span>
                                  : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="text-center text-xs">
                                {prices?.prevailing != null
                                  ? <span className="font-semibold text-green-700">{fmt(prices.prevailing)}</span>
                                  : <span className="text-gray-300">—</span>}
                              </td>
                            </React.Fragment>
                          )
                        })}

                        <td>
                          <div className="flex items-center gap-2 justify-center">

                            <div className="flex flex-col items-center gap-0.5">
                              <button
                                className="btn btn-xs btn-ghost tooltip tooltip-top"
                                data-tip="Respondent History"
                                onClick={() => setRespondentTarget(veg)}
                              >
                                📋
                              </button>
                              <CountBadge count={veg.respondent_count} />
                            </div>

                            <div className="flex flex-col items-center gap-0.5">
                              <button
                                className="btn btn-xs btn-ghost tooltip tooltip-top"
                                data-tip="Price History"
                                onClick={() => setHistoryTarget(veg)}
                              >
                                📈
                              </button>
                              <CountBadge count={veg.price_count} />
                            </div>

                            <button
                              className="btn btn-xs btn-ghost tooltip tooltip-top"
                              data-tip="Add Price Record"
                              onClick={() => setAddPriceTarget(veg)}
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
                    ))}
                  </React.Fragment>
                ))}

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
      <AddPriceRecordModal
        isOpen={!!addPriceTarget}
        defaultCommodity={addPriceTarget}
        OnClose={handleAddPriceClose}
      />
      <RespondentHistoryModal
        commodity={respondentTarget}
        isOpen={!!respondentTarget}
        onClose={() => setRespondentTarget(null)}
      />
    </div>
  )
}

export default CommodityTable