import { useState, useEffect } from "react"
import { useVegetableStore } from "../store/VegetableStore"

const formatDate = (raw) => {
  if (!raw) return "—"
  const d = new Date(String(raw).slice(0, 10) + "T00:00:00")
  return isNaN(d.getTime())
    ? String(raw)
    : d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
}

const fmtPrice = (val) => (val != null ? `₱${Number(val).toFixed(2)}` : null)

const RespondentHistoryModal = ({ commodity, isOpen, onClose }) => {
  const { fetchCommodityPrices, commodityPrices } = useVegetableStore()
  const [loading, setLoading] = useState(false)
  const [activeMarket, setActiveMarket] = useState(null)

  useEffect(() => {
    if (isOpen && commodity) {
      setLoading(true)
      fetchCommodityPrices(commodity.id).finally(() => setLoading(false))
    }
  }, [isOpen, commodity])

  useEffect(() => {
    if (!loading && commodityPrices.length > 0) {
      const markets = [...new Set(commodityPrices.map((r) => r.market).filter(Boolean))].sort()
      if (!activeMarket || !markets.includes(activeMarket))
        setActiveMarket(markets[0] ?? null)
    }
  }, [loading, commodityPrices])

  if (!isOpen || !commodity) return null

  const markets = [...new Set(commodityPrices.map((r) => r.market).filter(Boolean))].sort()
  const marketRows = commodityPrices
    .filter((r) => r.market === activeMarket)
    .sort((a, b) => new Date(b.price_date) - new Date(a.price_date))

  const allValues = marketRows
    .flatMap((r) => [1,2,3,4,5].map((n) => r[`respondent_${n}`]).filter((v) => v != null).map(Number))
  const hasStats = allValues.length > 0
  const statsMin = hasStats ? Math.min(...allValues) : null
  const statsMax = hasStats ? Math.max(...allValues) : null
  const statsAvg = hasStats
    ? Math.round((allValues.reduce((a, b) => a + b, 0) / allValues.length) * 100) / 100
    : null
  const fillRate = marketRows.length > 0
    ? Math.round((allValues.length / (marketRows.length * 5)) * 100) : 0

  const stats = [
    { label: "Records", value: marketRows.length },
    { label: "Avg", value: statsAvg != null ? `₱${statsAvg}` : "—" },
    { label: "Range", value: statsMin != null ? `₱${statsMin} – ₱${statsMax}` : "—" },
    { label: "Fill", value: `${fillRate}%` },
  ]

  const Cell = ({ val, chip }) => {
    if (val == null) return <span className="text-gray-300">—</span>
    if (chip) return (
      <span className="inline-block px-2 py-0.5 rounded bg-green-50 border border-green-200 text-green-700 text-xs font-medium">
        {fmtPrice(val)}
      </span>
    )
    return <span className="text-green-700 font-medium">{fmtPrice(val)}</span>
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-xl border border-gray-100">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-green-600 mb-0.5">
              Respondent History
            </p>
            <h2 className="text-lg font-bold text-gray-800 leading-tight">{commodity.name}</h2>
            {commodity.specification && (
              <p className="text-xs text-gray-400 mt-0.5">{commodity.specification}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-gray-500 transition-colors text-lg leading-none mt-0.5"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3 text-gray-400">
            <div className="w-5 h-5 border-2 border-gray-100 border-t-green-500 rounded-full animate-spin" />
            <span className="text-sm">Loading records…</span>
          </div>
        ) : commodityPrices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2 text-gray-400">
            <span className="text-3xl">📭</span>
            <span className="text-sm">No price records found.</span>
          </div>
        ) : (
          <>
            {/* Market tabs */}
            <div className="flex gap-1 px-5 pt-3 border-b border-gray-100">
              {markets.map((m) => (
                <button
                  key={m}
                  onClick={() => setActiveMarket(m)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-t transition-colors border-b-2 -mb-px ${
                    activeMarket === m
                      ? "border-green-500 text-green-600"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-4 border-b border-gray-100 divide-x divide-gray-100">
              {stats.map(({ label, value }) => (
                <div key={label} className="px-4 py-2.5">
                  <p className="text-[9px] uppercase tracking-wider text-gray-400 font-medium mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-gray-700">{value}</p>
                </div>
              ))}
            </div>

            {/* Table */}
            <div className="overflow-y-auto flex-1 text-xs">
              {marketRows.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-sm text-gray-400">
                  No records for this market.
                </div>
              ) : (
                <table className="w-full">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      {["Date","R1","R2","R3","R4","R5","Prevailing","High","Low"].map((h, i) => (
                        <th
                          key={h}
                          className={`px-3 py-2 font-semibold uppercase tracking-wide text-[9px] text-gray-400 border-b border-gray-100 ${i > 0 ? "text-center" : "text-left"}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {marketRows.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{formatDate(r.price_date)}</td>
                        {[1,2,3,4,5].map((n) => (
                          <td key={n} className="px-3 py-2.5 text-center">
                            <Cell val={r[`respondent_${n}`]} />
                          </td>
                        ))}
                        <td className="px-3 py-2.5 text-center"><Cell val={r.prevailing_price} chip /></td>
                        <td className="px-3 py-2.5 text-center"><Cell val={r.high_price} /></td>
                        <td className="px-3 py-2.5 text-center"><Cell val={r.low_price} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )
}

export default RespondentHistoryModal