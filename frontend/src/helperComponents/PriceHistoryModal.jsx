import { useState, useEffect, useRef } from "react"
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

// ─── Price History Modal ──────────────────────────────────────────────────────
const PriceHistoryModal = ({ commodity, isOpen, onClose }) => {
  const { fetchCommodityPrices, commodityPrices } = useVegetableStore()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("table")

  useEffect(() => {
    if (isOpen && commodity) {
      setLoading(true)
      fetchCommodityPrices(commodity.id).finally(() => setLoading(false))
    }
  }, [isOpen, commodity])

  if (!isOpen || !commodity) return null

  const fmt = (val) =>
    val != null ? `₱${Number(val).toFixed(2)}` : null

  // ── Sorted oldest → newest for trend chart ──────────────────────────────────
  const sorted = [...commodityPrices].sort(
    (a, b) => new Date(a.price_date) - new Date(b.price_date)
  )

  const labels = sorted.map((r) =>
    new Date(r.price_date).toLocaleDateString("en-PH", {
      month: "short", day: "numeric",
    })
  )

  // ── Line chart data ──────────────────────────────────────────────────────────
  const lineData = {
    labels,
    datasets: [
      {
        label: "Prevailing",
        data: sorted.map((r) => r.prevailing_price != null ? Number(r.prevailing_price) : null),
        borderColor: "#16a34a",
        backgroundColor: "rgba(22,163,74,0.12)",
        borderWidth: 2.5,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "#16a34a",
        tension: 0.35,
        fill: true,
        spanGaps: true,
      },
      {
        label: "High",
        data: sorted.map((r) => r.high_price != null ? Number(r.high_price) : null),
        borderColor: "#f97316",
        backgroundColor: "transparent",
        borderWidth: 1.5,
        borderDash: [5, 3],
        pointRadius: 2,
        pointHoverRadius: 4,
        tension: 0.35,
        spanGaps: true,
      },
      {
        label: "Low",
        data: sorted.map((r) => r.low_price != null ? Number(r.low_price) : null),
        borderColor: "#3b82f6",
        backgroundColor: "transparent",
        borderWidth: 1.5,
        borderDash: [5, 3],
        pointRadius: 2,
        pointHoverRadius: 4,
        tension: 0.35,
        spanGaps: true,
      },
    ],
  }

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "top",
        labels: { boxWidth: 12, font: { size: 12 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            ctx.parsed.y != null
              ? `${ctx.dataset.label}: ₱${ctx.parsed.y.toFixed(2)}`
              : null,
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(0,0,0,0.05)" },
        ticks: { font: { size: 11 }, maxTicksLimit: 10, maxRotation: 30 },
      },
      y: {
        grid: { color: "rgba(0,0,0,0.05)" },
        ticks: {
          font: { size: 11 },
          callback: (v) => `₱${v}`,
        },
      },
    },
  }

  // ── Bar chart: avg prevailing price per market ───────────────────────────────
  const marketMap = {}
  commodityPrices.forEach((r) => {
    if (!marketMap[r.market]) marketMap[r.market] = { sum: 0, count: 0 }
    if (r.prevailing_price != null) {
      marketMap[r.market].sum += Number(r.prevailing_price)
      marketMap[r.market].count += 1
    }
  })
  const marketEntries = Object.entries(marketMap)
  const marketLabels = marketEntries.map(([m]) => m)
  const marketAvgs = marketEntries.map(([, { sum, count }]) =>
    count > 0 ? Number((sum / count).toFixed(2)) : 0
  )

  const barData = {
    labels: marketLabels,
    datasets: [
      {
        label: "Avg Prevailing Price",
        data: marketAvgs,
        backgroundColor: marketAvgs.map((_, i) =>
          i % 2 === 0 ? "rgba(22,163,74,0.75)" : "rgba(22,163,74,0.45)"
        ),
        borderColor: "#15803d",
        borderWidth: 1,
        borderRadius: 5,
        borderSkipped: false,
      },
    ],
  }

  const barOptions = {
    responsive: true,
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
        grid: { display: false },
        ticks: { font: { size: 11 }, maxRotation: 30 },
      },
      y: {
        grid: { color: "rgba(0,0,0,0.05)" },
        ticks: {
          font: { size: 11 },
          callback: (v) => `₱${v}`,
        },
      },
    },
  }

  const tabs = [
    { key: "table", label: "📋 Table" },
    { key: "line",  label: "📈 Trend" },
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

            {/* ── Table ── */}
            {activeTab === "table" && (
              <table className="table table-sm table-zebra w-full">
                <thead className="sticky top-0 bg-base-200">
                  <tr>
                    <th>Date</th>
                    <th>Market</th>
                    <th className="text-center">Prevailing</th>
                    <th className="text-center">High</th>
                    <th className="text-center">Low</th>
                  </tr>
                </thead>
                <tbody>
                  {commodityPrices.map((r, i) => (
                    <tr key={i}>
                      <td>{new Date(r.price_date).toLocaleDateString()}</td>
                      <td>{r.market}</td>
                      <td className="text-center font-semibold text-green-700">
                        {fmt(r.prevailing_price)}
                      </td>
                      <td className="text-center">{fmt(r.high_price)}</td>
                      <td className="text-center">{fmt(r.low_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* ── Line Chart ── */}
            {activeTab === "line" && (
              <div style={{ position: "relative", height: 320 }}>
                <Line data={lineData} options={lineOptions} />
              </div>
            )}

            {/* ── Bar Chart ── */}
            {activeTab === "bar" && (
              <div style={{ position: "relative", height: 320 }}>
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