import { useState, useEffect } from "react"
import { useVegetableStore } from "../store/VegetableStore"
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  PointElement, LineElement, BarElement,
  Title, Tooltip, Legend, Filler,
} from "chart.js"
import { Line, Bar } from "react-chartjs-2"

ChartJS.register(
  CategoryScale, LinearScale,
  PointElement, LineElement, BarElement,
  Title, Tooltip, Legend, Filler
)

// ─── Per-market color palette ─────────────────────────────────────────────────
const MARKET_COLORS = [
  { border: "#16a34a", bg: "rgba(22,163,74,0.10)" },
  { border: "#3b82f6", bg: "rgba(59,130,246,0.10)" },
  { border: "#f97316", bg: "rgba(249,115,22,0.10)" },
  { border: "#a855f7", bg: "rgba(168,85,247,0.10)" },
  { border: "#ef4444", bg: "rgba(239,68,68,0.10)"  },
]

const getColor = (i) => MARKET_COLORS[i % MARKET_COLORS.length]

// ─── Price History Modal ──────────────────────────────────────────────────────
const PriceHistoryModal = ({ commodity, isOpen, onClose }) => {
  const { fetchCommodityPrices, commodityPrices } = useVegetableStore()
  const [loading, setLoading]   = useState(false)
  const [activeTab, setActiveTab] = useState("table")
  // Which price field to plot on the trend chart
  const [priceField, setPriceField] = useState("prevailing_price")

  useEffect(() => {
    if (isOpen && commodity) {
      setLoading(true)
      fetchCommodityPrices(commodity.id).finally(() => setLoading(false))
    }
  }, [isOpen, commodity])

  if (!isOpen || !commodity) return null

  const fmt = (val) =>
    val != null ? `₱${Number(val).toFixed(2)}` : "—"

  // Safely format a price_date regardless of whether it arrives as
  // "2025-01-05", "2025-01-05T00:00:00.000Z", or a JS Date object
  const formatDate = (raw) => {
    if (!raw) return "—"
    // Extract just the YYYY-MM-DD part so we never let UTC conversion shift the day
    const datePart = String(raw).slice(0, 10)
    const d = new Date(datePart + "T00:00:00")
    return isNaN(d.getTime())
      ? String(raw)
      : d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
  }

  // ── Derive unique sorted markets ─────────────────────────────────────────────
  const markets = [...new Set(commodityPrices.map((r) => r.market).filter(Boolean))].sort()

  // ── Derive unique sorted dates across ALL markets ─────────────────────────────
  const allDates = [
    ...new Set(
      commodityPrices.map((r) =>
        new Date(r.price_date).toISOString().split("T")[0]
      )
    ),
  ].sort()

  const dateLabels = allDates.map((d) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-PH", {
      month: "short", day: "numeric",
    })
  )

  // ── Build per-market lookup: market → { date → record } ─────────────────────
  const marketDateMap = {}
  for (const r of commodityPrices) {
    const mkt  = r.market
    const date = new Date(r.price_date).toISOString().split("T")[0]
    if (!marketDateMap[mkt]) marketDateMap[mkt] = {}
    marketDateMap[mkt][date] = r
  }

  // ── Line chart: one dataset per market for the selected price field ──────────
  const fieldLabel = {
    high_price: "High",
    low_price:"Low",
    prevailing_price:"Prevailing",
  }

  const lineData = {
    labels: dateLabels,
    datasets: markets.map((mkt, i) => {
      const color = getColor(i)
      return {
        label: mkt,
        data: allDates.map((d) => {
          const rec = marketDateMap[mkt]?.[d]
          return rec?.[priceField] != null ? Number(rec[priceField]) : null
        }),
        borderColor:          color.border,
        backgroundColor:      color.bg,
        borderWidth:          2.5,
        pointRadius:          4,
        pointHoverRadius:     6,
        pointBackgroundColor: color.border,
        tension:              0.35,
        fill:                 false,
        spanGaps:             true,
      }
    }),
  }

  const lineOptions = {
    responsive:          true,
    maintainAspectRatio: false,
    interaction:         { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "top",
        labels:   { boxWidth: 12, font: { size: 12 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            ctx.parsed.y != null
              ? `${ctx.dataset.label}: ₱${ctx.parsed.y.toFixed(2)}`
              : `${ctx.dataset.label}: —`,
        },
      },
    },
    scales: {
      x: {
        grid:  { color: "rgba(0,0,0,0.05)" },
        ticks: { font: { size: 11 }, maxTicksLimit: 10, maxRotation: 30 },
      },
      y: {
        grid:  { color: "rgba(0,0,0,0.05)" },
        ticks: { font: { size: 11 }, callback: (v) => `₱${v}` },
      },
    },
  }

  // ── Bar chart: avg prevailing price per market ───────────────────────────────
  const marketAvgs = markets.map((mkt) => {
    const records = commodityPrices.filter(
      (r) => r.market === mkt && r.prevailing_price != null
    )
    if (records.length === 0) return 0
    const sum = records.reduce((acc, r) => acc + Number(r.prevailing_price), 0)
    return Number((sum / records.length).toFixed(2))
  })

  const barData = {
    labels: markets,
    datasets: [
      {
        label:           "Avg Prevailing Price",
        data:            marketAvgs,
        backgroundColor: markets.map((_, i) => getColor(i).bg.replace("0.10", "0.75")),
        borderColor:     markets.map((_, i) => getColor(i).border),
        borderWidth:     1,
        borderRadius:    5,
        borderSkipped:   false,
      },
    ],
  }

  const barOptions = {
    responsive:          true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `Avg: ₱${ctx.parsed.y.toFixed(2)}`,
        },
      },
    },
    scales: {
      x: {
        grid:  { display: false },
        ticks: { font: { size: 11 }, maxRotation: 30 },
      },
      y: {
        grid:  { color: "rgba(0,0,0,0.05)" },
        ticks: { font: { size: 11 }, callback: (v) => `₱${v}` },
      },
    },
  }

  const tabs = [
    { key: "table", label: "📋 Table"     },
    { key: "line",  label: "📈 Trend"     },
    { key: "bar",   label: "🏪 By Market" },
  ]

  return (
    <div className="modal modal-open">
      <div
        className="modal-box w-11/12 max-w-3xl"
        style={{ maxHeight: "85vh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-green-800">{commodity.name}</h3>
            <p className="text-sm text-gray-500">
              {commodity.specification || "Price History"}
            </p>
          </div>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-boxed mb-4 bg-base-200">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              className={`tab ${activeTab === key ? "tab-active bg-green-600 text-white" : ""}`}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex justify-center py-10">
            <span className="loading loading-spinner loading-md text-green-600" />
          </div>
        ) : commodityPrices.length === 0 ? (
          <p className="text-center text-gray-400 py-10">No price records found.</p>
        ) : (
          <div className="overflow-auto flex-1">

            {/* ── Table: grouped by market ── */}
            {activeTab === "table" && (
              <div className="flex flex-col gap-4">
                {markets.map((mkt) => {
                  const mktRows = commodityPrices
                    .filter((r) => r.market === mkt)
                    .sort((a, b) => new Date(b.price_date) - new Date(a.price_date))
                  return (
                    <div key={mkt}>
                      <p className="text-xs font-bold text-green-700 uppercase tracking-wide px-1 mb-1">
                        🏪 {mkt}
                      </p>
                      <table className="table table-sm table-zebra w-full">
                        <thead className="bg-base-200">
                          <tr>
                            <th>Date</th>
                            <th className="text-center">High</th>
                            <th className="text-center">Low</th>
                            <th className="text-center">Prevailing</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mktRows.map((r, i) => (
                            <tr key={i}>
                              <td>{formatDate(r.price_date)}</td>
                              <td className="text-center">{fmt(r.high_price)}</td>
                              <td className="text-center">{fmt(r.low_price)}</td>
                              <td className="text-center font-semibold text-green-700">{fmt(r.prevailing_price)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Line Chart ── */}
            {activeTab === "line" && (
              <>
                {/* Price field selector */}
                <div className="flex gap-2 mb-3">
                  {[
                    { key: "high_price", label: "High" },
                    { key: "low_price",       label: "Low"       },
                    { key: "prevailing_price",        label: "Prevailing"        },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      className={`btn btn-xs ${priceField === key ? "btn-success" : "btn-ghost"}`}
                      onClick={() => setPriceField(key)}
                    >
                      {label}
                    </button>
                  ))}
                  <span className="text-xs text-gray-400 self-center ml-1">
                    — one line per market
                  </span>
                </div>
                <div style={{ position: "relative", height: 300 }}>
                  <Line data={lineData} options={lineOptions} />
                </div>
              </>
            )}

            {/* ── Bar Chart ── */}
            {activeTab === "bar" && (
              <div style={{ position: "relative", height: 300 }}>
                <Bar data={barData} options={barOptions} />
              </div>
            )}

          </div>
        )}

        <div className="modal-action mt-3">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

export default PriceHistoryModal