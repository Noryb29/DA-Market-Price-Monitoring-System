import React, { useEffect, useState } from "react"
import {
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from "recharts"
import { useVegetableStore } from "../store/VegetableStore.js"
import { useAnalyticsStore } from "../store/AnalyticsStore.js"

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (v) => v != null ? `₱${Number(v).toFixed(2)}` : "—"

const fmtDate = (d) => {
  if (!d) return "—"
  const [y, m, dd] = String(d).split("T")[0].split("-")
  return new Date(+y, +m - 1, +dd).toLocaleDateString("en-PH", { month: "short", day: "numeric" })
}

const COLORS = [
  "#22c55e","#3b82f6","#f59e0b","#ef4444",
  "#8b5cf6","#06b6d4","#ec4899","#14b8a6",
]

// ── small presentational pieces ───────────────────────────────────────────────
const StatCard = ({ label, value, sub, color = "text-green-600" }) => (
  <div className="bg-base-100 rounded-2xl border border-base-200 p-5 flex flex-col gap-1 shadow-sm">
    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</span>
    <span className={`text-3xl font-bold ${color}`}>{value ?? "—"}</span>
    {sub && <span className="text-xs text-gray-400">{sub}</span>}
  </div>
)

const SectionTitle = ({ children }) => (
  <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-3">{children}</h2>
)

const ChartShell = ({ title, loading, empty, emptyIcon = "📊", emptyText = "No data", height = 220, children }) => (
  <div className="bg-base-100 rounded-2xl border border-base-200 p-5 shadow-sm">
    <SectionTitle>{title}</SectionTitle>
    {loading
      ? <div className="skeleton rounded-xl" style={{ height }} />
      : empty
        ? (
          <div className="flex items-center justify-center flex-col gap-2 text-gray-300 text-sm" style={{ height }}>
            <span className="text-3xl">{emptyIcon}</span>
            <span>{emptyText}</span>
          </div>
        )
        : children
    }
  </div>
)

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-base-100 border border-base-300 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-600 mb-1">{fmtDate(label) || label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{fmt(p.value)}</strong>
        </p>
      ))}
    </div>
  )
}

// ── main component ─────────────────────────────────────────────────────────────
const Charts = () => {
  // ── stores — hooks must be called inside the component ───────────────────
  const { vegetables, markets, categories, fetchVegetables, fetchMarkets, fetchCategories } =
    useVegetableStore()

  const {
    analytics, analyticsLoading: al,
    fetchDashboardStats,
    fetchPriceTrend,
    fetchAvgByMarket,
    fetchPriceComparison,
    // fetchPriceVolatility,
    // fetchMarketCoverage,
  } = useAnalyticsStore()

  const { stats, trend, avgByMarket, comparison } = analytics

  // ── local filter / control state ──────────────────────────────────────────
  const [search, setSearch]                 = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [trendCommodity, setTrendCommodity] = useState("")
  const [trendMarket, setTrendMarket]       = useState("")
  const [compMarket, setCompMarket]         = useState("")

  // ── mount: load reference data + static charts ────────────────────────────
  useEffect(() => {
    fetchVegetables()
    fetchMarkets()
    fetchCategories()
    fetchDashboardStats()
    // fetchMarketCoverage()
  }, [])

  // auto-select first commodity
  useEffect(() => {
    if (vegetables.length > 0 && !trendCommodity) {
      setTrendCommodity(String(vegetables[0].id))
    }
  }, [vegetables])

  // re-fetch trend charts when commodity / market selection changes
  useEffect(() => {
    if (!trendCommodity) return
    fetchPriceTrend(trendCommodity, { market_id: trendMarket || undefined })
    fetchAvgByMarket(trendCommodity)
  }, [trendCommodity, trendMarket])

  // re-fetch comparison / volatility when market or category filter changes
  useEffect(() => {
    const cat = categories.find((c) => c.name === categoryFilter)
    fetchPriceComparison({ market_id: compMarket || undefined, category_id: cat?.id })
    // fetchPriceVolatility({ market_id: compMarket || undefined, category_id: cat?.id })
  }, [compMarket, categoryFilter, categories])

  // ── derived ───────────────────────────────────────────────────────────────
  const filteredVegetables = vegetables.filter((v) => {
    const matchSearch = search ? v.name?.toLowerCase().includes(search.toLowerCase()) : true
    const matchCat    = categoryFilter ? v.categories?.toLowerCase() === categoryFilter.toLowerCase() : true
    return matchSearch && matchCat
  })

  const selectedName = vegetables.find((v) => String(v.id) === trendCommodity)?.name ?? ""

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-screen bg-base-200">

      {/* ══ LEFT SIDEBAR ══════════════════════════════════════════════════ */}
      <div className="w-64 shrink-0 bg-base-100 shadow-lg p-5 flex flex-col gap-4 text-base-content overflow-y-auto">

        {/* Filter Options */}
        <div className="collapse collapse-arrow bg-base-200 rounded-box">
          <input type="checkbox" defaultChecked />
          <div className="collapse-title font-semibold text-sm">Filter Options</div>
          <div className="collapse-content flex flex-col gap-4 pt-1">

            <div>
              <label className="text-xs font-semibold mb-1 block text-gray-500">Category</label>
              <select
                className="select select-bordered select-sm w-full"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold mb-1 block text-gray-500">Search</label>
              <label className="input input-bordered input-sm flex items-center gap-2">
                🔍
                <input
                  type="text"
                  className="grow"
                  placeholder="Search commodity..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            </div>

          </div>
        </div>

        {/* Chart Controls */}
        <div className="collapse collapse-arrow bg-base-200 rounded-box">
          <input type="checkbox" defaultChecked />
          <div className="collapse-title font-semibold text-sm">Chart Controls</div>
          <div className="collapse-content flex flex-col gap-4 pt-1">

            <div>
              <label className="text-xs font-semibold mb-1 block text-gray-500">Trend: Commodity</label>
              <select
                className="select select-bordered select-sm w-full"
                value={trendCommodity}
                onChange={(e) => setTrendCommodity(e.target.value)}
              >
                <option value="">— pick one —</option>
                {filteredVegetables.map((v) => (
                  <option key={v.id} value={String(v.id)}>{v.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold mb-1 block text-gray-500">Trend: Market</label>
              <select
                className="select select-bordered select-sm w-full"
                value={trendMarket}
                onChange={(e) => setTrendMarket(e.target.value)}
              >
                <option value="">All Markets</option>
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold mb-1 block text-gray-500">Comparison: Market</label>
              <select
                className="select select-bordered select-sm w-full"
                value={compMarket}
                onChange={(e) => setCompMarket(e.target.value)}
              >
                <option value="">All Markets</option>
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* Commodity quick-pick list (visible while searching) */}
        {search && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide px-1">
              {filteredVegetables.length} result{filteredVegetables.length !== 1 ? "s" : ""}
            </span>
            <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
              {filteredVegetables.slice(0, 20).map((v) => (
                <button
                  key={v.id}
                  className={`text-left text-xs px-2 py-1.5 rounded-lg transition-colors
                    ${trendCommodity === String(v.id)
                      ? "bg-green-100 text-green-700 font-semibold"
                      : "hover:bg-base-200 text-gray-600"}`}
                  onClick={() => setTrendCommodity(String(v.id))}
                >
                  {v.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══ MAIN CONTENT ══════════════════════════════════════════════════ */}
      <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-8">

        {/* ── STAT CARDS ───────────────────────────────────────────────── */}
        <section>
          <SectionTitle>Overview</SectionTitle>
          {al.stats ? (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard label="Commodities"   value={stats?.totals?.total_commodities}   color="text-green-600" />
              <StatCard label="Markets"       value={stats?.totals?.total_markets}       color="text-blue-500" />
              <StatCard label="Categories"    value={stats?.totals?.total_categories}    color="text-amber-500" />
              <StatCard label="Price Records" value={stats?.totals?.total_price_records} color="text-purple-500" />
              <StatCard
                label="Latest Entry"
                value={fmtDate(stats?.totals?.latest_price_date)}
                color="text-gray-600"
                sub="most recent price date"
              />
            </div>
          )}
        </section>

        {/* ── TREND + AVG BY MARKET ─────────────────────────────────────── */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          <ChartShell
            title={`Price Trend${selectedName ? ` — ${selectedName}` : ""}`}
            loading={al.trend}
            empty={trend.length === 0}
            emptyIcon="📈"
            emptyText="Select a commodity to view its trend"
            height={220}
          >
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="price_date" tickFormatter={fmtDate} tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `₱${v}`} tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="prevailing_price" name="Prevailing" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="high_price"       name="High"       stroke="#3b82f6" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                <Line type="monotone" dataKey="low_price"        name="Low"        stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </ChartShell>

          <ChartShell
            title={`Avg Price by Market${selectedName ? ` — ${selectedName}` : ""}`}
            loading={al.avgByMarket}
            empty={avgByMarket.length === 0}
            emptyIcon="🏪"
            emptyText="No data"
            height={220}
          >
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={avgByMarket} margin={{ top: 5, right: 10, bottom: 30, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="market_name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                <YAxis tickFormatter={(v) => `₱${v}`} tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avg_prevailing" name="Avg Prevailing" radius={[6, 6, 0, 0]}>
                  {avgByMarket.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartShell>
        </section>

        {/* ── PRICE COMPARISON ──────────────────────────────────────────── */}
        <section>
          <ChartShell
            title="Latest Price Comparison (Top 15)"
            loading={al.comparison}
            empty={comparison.length === 0}
            emptyIcon="🥦"
            emptyText="No comparison data available"
            height={280}
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={comparison.slice(0, 15)}
                margin={{ top: 5, right: 10, bottom: 60, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="commodity_name" tick={{ fontSize: 10 }} angle={-40} textAnchor="end" interval={0} />
                <YAxis tickFormatter={(v) => `₱${v}`} tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="high_price"       name="High"       fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="prevailing_price" name="Prevailing" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="low_price"        name="Low"        fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartShell>
        </section>

        {/* ── TOP COMMODITIES TABLE ─────────────────────────────────────── */}
        {stats?.topCommodities?.length > 0 && (
          <section>
            <div className="bg-base-100 rounded-2xl border border-base-200 p-5 shadow-sm">
              <SectionTitle>Top Commodities by Record Count</SectionTitle>
              <div className="overflow-x-auto">
                <table className="table table-sm table-zebra w-full">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Commodity</th>
                      <th>Category</th>
                      <th className="text-right">Records</th>
                      <th className="text-right">Avg Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topCommodities.map((c, i) => (
                      <tr key={i}>
                        <td className="text-gray-400">{i + 1}</td>
                        <td className="font-medium">{c.name}</td>
                        <td><span className="badge badge-outline badge-sm">{c.category}</span></td>
                        <td className="text-right">{c.record_count}</td>
                        <td className="text-right font-semibold text-green-600">{fmt(c.avg_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ── CATEGORY BREAKDOWN ───────────────────────────────────────── */}
        {stats?.categoryBreakdown?.length > 0 && (
          <section>
            <ChartShell title="Category Breakdown" loading={false} empty={false} height={200}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={stats.categoryBreakdown}
                  margin={{ top: 5, right: 10, bottom: 40, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="commodity_count" name="Commodities" fill="#22c55e" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="record_count"    name="Records"     fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartShell>
          </section>
        )}

      </div>
    </div>
  )
}

export default Charts