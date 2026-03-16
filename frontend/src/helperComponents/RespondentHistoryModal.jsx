import { useState, useEffect } from "react"
import { useVegetableStore } from "../store/VegetableStore"

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (raw) => {
  if (!raw) return "—"
  const datePart = String(raw).slice(0, 10)
  const d = new Date(datePart + "T00:00:00")
  return isNaN(d.getTime())
    ? String(raw)
    : d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
}

const fmtPrice = (val) =>
  val != null ? `₱${Number(val).toFixed(2)}` : null

// ─── Dot indicator for each respondent slot ───────────────────────────────────
const RespondentDot = ({ value }) => {
  if (value == null) return (
    <span className="rh-dot rh-dot--empty" title="No data" />
  )
  return (
    <span className="rh-dot rh-dot--filled" title={`₱${Number(value).toFixed(2)}`} />
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
const RespondentHistoryModal = ({ commodity, isOpen, onClose }) => {
  const { fetchCommodityPrices, commodityPrices } = useVegetableStore()
  const [loading, setLoading]       = useState(false)
  const [activeMarket, setActiveMarket] = useState(null)

  useEffect(() => {
    if (isOpen && commodity) {
      setLoading(true)
      fetchCommodityPrices(commodity.id).finally(() => setLoading(false))
    }
  }, [isOpen, commodity])

  // Reset active market when data loads
  useEffect(() => {
    if (!loading && commodityPrices.length > 0) {
      const markets = [...new Set(commodityPrices.map((r) => r.market).filter(Boolean))].sort()
      if (!activeMarket || !markets.includes(activeMarket)) {
        setActiveMarket(markets[0] ?? null)
      }
    }
  }, [loading, commodityPrices])

  if (!isOpen || !commodity) return null

  const markets = [...new Set(commodityPrices.map((r) => r.market).filter(Boolean))].sort()

  const marketRows = commodityPrices
    .filter((r) => r.market === activeMarket)
    .sort((a, b) => new Date(b.price_date) - new Date(a.price_date))

  // Stats for the active market
  const allRespondentValues = marketRows.flatMap((r) =>
    [1, 2, 3, 4, 5]
      .map((n) => r[`respondent_${n}`])
      .filter((v) => v != null)
      .map(Number)
  )
  const hasStats = allRespondentValues.length > 0
  const statsMin = hasStats ? Math.min(...allRespondentValues) : null
  const statsMax = hasStats ? Math.max(...allRespondentValues) : null
  const statsAvg = hasStats
    ? Math.round((allRespondentValues.reduce((a, b) => a + b, 0) / allRespondentValues.length) * 100) / 100
    : null
  const filledSlots = allRespondentValues.length
  const totalSlots  = marketRows.length * 5
  const fillRate    = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');

        .rh-overlay {
          position: fixed; inset: 0;
          background: rgba(8, 18, 8, 0.65);
          backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          z-index: 9999;
          animation: rh-fade 0.2s ease;
        }
        @keyframes rh-fade { from { opacity: 0 } to { opacity: 1 } }

        .rh-box {
          background: #0f1a0f;
          border: 1px solid rgba(74,144,64,0.25);
          border-radius: 18px;
          width: 680px;
          max-width: calc(100vw - 24px);
          max-height: 88vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow:
            0 0 0 1px rgba(74,144,64,0.1),
            0 24px 80px rgba(0,0,0,0.6),
            inset 0 1px 0 rgba(255,255,255,0.04);
          animation: rh-up 0.3s cubic-bezier(0.22,1,0.36,1);
          font-family: 'DM Mono', monospace;
        }
        @keyframes rh-up {
          from { opacity: 0; transform: translateY(16px) scale(0.98) }
          to   { opacity: 1; transform: translateY(0)    scale(1)    }
        }

        /* ── Header ── */
        .rh-header {
          padding: 24px 28px 20px;
          border-bottom: 1px solid rgba(74,144,64,0.15);
          position: relative;
          background: linear-gradient(180deg, rgba(22,50,18,0.8) 0%, transparent 100%);
        }
        .rh-eyebrow {
          font-family: 'Syne', sans-serif;
          font-size: 10px; font-weight: 700; letter-spacing: 0.15em;
          text-transform: uppercase; color: #4a9040;
          margin-bottom: 6px;
          display: flex; align-items: center; gap: 8px;
        }
        .rh-eyebrow::before {
          content: ''; display: block;
          width: 20px; height: 1px; background: #4a9040;
        }
        .rh-title {
          font-family: 'Syne', sans-serif;
          font-size: 22px; font-weight: 800;
          color: #e8f4e5; margin: 0; line-height: 1.2;
        }
        .rh-spec {
          font-size: 11px; color: rgba(200,220,196,0.45);
          margin-top: 3px; font-weight: 300;
        }
        .rh-close {
          position: absolute; top: 20px; right: 20px;
          background: rgba(74,144,64,0.1);
          border: 1px solid rgba(74,144,64,0.2);
          border-radius: 8px; width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #7ab870; font-size: 16px;
          transition: all 0.15s;
        }
        .rh-close:hover { background: rgba(74,144,64,0.2); color: #a8d4a4 }

        /* ── Market tabs ── */
        .rh-market-tabs {
          padding: 14px 28px 0;
          display: flex; gap: 6px;
          border-bottom: 1px solid rgba(74,144,64,0.12);
        }
        .rh-tab {
          padding: 7px 16px;
          border-radius: 8px 8px 0 0;
          border: 1px solid transparent;
          border-bottom: none;
          font-family: 'Syne', sans-serif;
          font-size: 12px; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
          color: rgba(200,220,196,0.45);
          background: transparent;
          position: relative; bottom: -1px;
        }
        .rh-tab:hover { color: #a8d4a4; background: rgba(74,144,64,0.08) }
        .rh-tab.active {
          color: #c8f0c4;
          background: #0f1a0f;
          border-color: rgba(74,144,64,0.25);
          border-bottom-color: #0f1a0f;
        }

        /* ── Stats strip ── */
        .rh-stats {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 1px; background: rgba(74,144,64,0.1);
          border-bottom: 1px solid rgba(74,144,64,0.12);
        }
        .rh-stat {
          padding: 12px 16px; background: #0f1a0f;
          display: flex; flex-direction: column; gap: 2px;
        }
        .rh-stat-label {
          font-size: 9px; font-weight: 500; letter-spacing: 0.1em;
          text-transform: uppercase; color: rgba(200,220,196,0.35);
        }
        .rh-stat-val {
          font-size: 15px; font-weight: 500; color: #7ab870;
        }
        .rh-stat-val.accent { color: #4a9040 }

        /* ── Body ── */
        .rh-body {
          overflow-y: auto; flex: 1;
          padding: 0;
        }
        .rh-body::-webkit-scrollbar { width: 4px }
        .rh-body::-webkit-scrollbar-track { background: transparent }
        .rh-body::-webkit-scrollbar-thumb { background: rgba(74,144,64,0.3); border-radius: 4px }

        /* ── Table ── */
        .rh-table {
          width: 100%; border-collapse: collapse;
          font-size: 12px;
        }
        .rh-table thead th {
          padding: 10px 16px;
          text-align: left;
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.1em;
          text-transform: uppercase; color: rgba(200,220,196,0.35);
          border-bottom: 1px solid rgba(74,144,64,0.12);
          background: rgba(22,40,18,0.5);
          position: sticky; top: 0; z-index: 1;
        }
        .rh-table thead th.center { text-align: center }
        .rh-table tbody tr {
          border-bottom: 1px solid rgba(74,144,64,0.07);
          transition: background 0.1s;
        }
        .rh-table tbody tr:hover { background: rgba(74,144,64,0.06) }
        .rh-table tbody tr:last-child { border-bottom: none }
        .rh-table td {
          padding: 10px 16px; vertical-align: middle;
          color: rgba(200,220,196,0.75);
        }
        .rh-table td.date-cell {
          color: rgba(200,220,196,0.45);
          font-size: 11px; white-space: nowrap;
        }

        /* ── Respondent cells ── */
        .rh-r-cell {
          text-align: center;
          font-variant-numeric: tabular-nums;
        }
        .rh-r-val {
          color: #7ab870; font-weight: 500;
        }
        .rh-r-empty {
          color: rgba(200,220,196,0.18);
        }

        /* ── Dot indicators ── */
        .rh-dot {
          display: inline-block;
          width: 7px; height: 7px; border-radius: 50%;
          vertical-align: middle;
        }
        .rh-dot--filled { background: #4a9040 }
        .rh-dot--empty  { background: rgba(74,144,64,0.15); border: 1px solid rgba(74,144,64,0.2) }

        /* ── Prevailing chip ── */
        .rh-prevailing {
          display: inline-block;
          padding: 2px 8px; border-radius: 5px;
          background: rgba(74,144,64,0.15);
          border: 1px solid rgba(74,144,64,0.25);
          color: #a8d4a4; font-weight: 500; font-size: 11px;
        }

        /* ── Fill bar ── */
        .rh-fill-bar-wrap {
          height: 3px; background: rgba(74,144,64,0.12);
          border-radius: 2px; overflow: hidden; width: 40px;
          display: inline-block; vertical-align: middle; margin-left: 4px;
        }
        .rh-fill-bar { height: 100%; background: #4a9040; border-radius: 2px }

        /* ── Empty / loading ── */
        .rh-center {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 48px 24px; gap: 10px;
          color: rgba(200,220,196,0.3); font-size: 13px;
        }
        .rh-spinner {
          width: 22px; height: 22px;
          border: 2px solid rgba(74,144,64,0.2);
          border-top-color: #4a9040; border-radius: 50%;
          animation: rh-spin 0.7s linear infinite;
        }
        @keyframes rh-spin { to { transform: rotate(360deg) } }

        /* ── Footer ── */
        .rh-footer {
          padding: 14px 28px;
          border-top: 1px solid rgba(74,144,64,0.12);
          display: flex; justify-content: flex-end;
          background: rgba(8,14,8,0.5);
        }
        .rh-btn-close {
          padding: 8px 22px; border-radius: 8px;
          border: 1px solid rgba(74,144,64,0.25);
          background: transparent;
          font-family: 'Syne', sans-serif;
          font-size: 12px; font-weight: 600;
          color: rgba(200,220,196,0.55); cursor: pointer;
          transition: all 0.15s;
        }
        .rh-btn-close:hover {
          background: rgba(74,144,64,0.1);
          color: #a8d4a4; border-color: rgba(74,144,64,0.4);
        }
      `}</style>

      <div className="rh-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="rh-box">

          {/* Header */}
          <div className="rh-header">
            <div className="rh-eyebrow">Respondent History</div>
            <h2 className="rh-title">{commodity.name}</h2>
            {commodity.specification && (
              <p className="rh-spec">{commodity.specification}</p>
            )}
            <button className="rh-close" onClick={onClose}>✕</button>
          </div>

          {loading ? (
            <div className="rh-center">
              <div className="rh-spinner" />
              <span>Loading records…</span>
            </div>
          ) : commodityPrices.length === 0 ? (
            <div className="rh-center">
              <span style={{ fontSize: 28 }}>📭</span>
              <span>No price records found.</span>
            </div>
          ) : (
            <>
              {/* Market tabs */}
              <div className="rh-market-tabs">
                {markets.map((m) => (
                  <button
                    key={m}
                    className={`rh-tab ${activeMarket === m ? "active" : ""}`}
                    onClick={() => setActiveMarket(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* Stats strip */}
              <div className="rh-stats">
                <div className="rh-stat">
                  <span className="rh-stat-label">Records</span>
                  <span className="rh-stat-val">{marketRows.length}</span>
                </div>
                <div className="rh-stat">
                  <span className="rh-stat-label">Avg Price</span>
                  <span className="rh-stat-val accent">
                    {statsAvg != null ? `₱${statsAvg}` : "—"}
                  </span>
                </div>
                <div className="rh-stat">
                  <span className="rh-stat-label">Range</span>
                  <span className="rh-stat-val" style={{ fontSize: 12 }}>
                    {statsMin != null ? `₱${statsMin} – ₱${statsMax}` : "—"}
                  </span>
                </div>
                <div className="rh-stat">
                  <span className="rh-stat-label">Fill Rate</span>
                  <span className="rh-stat-val" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {fillRate}%
                    <span className="rh-fill-bar-wrap">
                      <span className="rh-fill-bar" style={{ width: `${fillRate}%` }} />
                    </span>
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="rh-body">
                {marketRows.length === 0 ? (
                  <div className="rh-center">
                    <span>No records for this market.</span>
                  </div>
                ) : (
                  <table className="rh-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th className="center">R1</th>
                        <th className="center">R2</th>
                        <th className="center">R3</th>
                        <th className="center">R4</th>
                        <th className="center">R5</th>
                        <th className="center">Prevailing</th>
                        <th className="center">High</th>
                        <th className="center">Low</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marketRows.map((r, i) => (
                        <tr key={i}>
                          <td className="date-cell">{formatDate(r.price_date)}</td>
                          {[1, 2, 3, 4, 5].map((n) => {
                            const val = r[`respondent_${n}`]
                            return (
                              <td key={n} className="rh-r-cell">
                                {val != null
                                  ? <span className="rh-r-val">{fmtPrice(val)}</span>
                                  : <span className="rh-r-empty">—</span>}
                              </td>
                            )
                          })}
                          <td className="rh-r-cell">
                            {r.prevailing_price != null
                              ? <span className="rh-prevailing">{fmtPrice(r.prevailing_price)}</span>
                              : <span className="rh-r-empty">—</span>}
                          </td>
                          <td className="rh-r-cell">
                            {r.high_price != null
                              ? <span className="rh-r-val">{fmtPrice(r.high_price)}</span>
                              : <span className="rh-r-empty">—</span>}
                          </td>
                          <td className="rh-r-cell">
                            {r.low_price != null
                              ? <span className="rh-r-val">{fmtPrice(r.low_price)}</span>
                              : <span className="rh-r-empty">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* Footer */}
          <div className="rh-footer">
            <button className="rh-btn-close" onClick={onClose}>Close</button>
          </div>

        </div>
      </div>
    </>
  )
}

export default RespondentHistoryModal