import React, { useEffect, useState } from "react"
import { useVegetableStore } from "../store/VegetableStore.js"
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from "chart.js"

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

const VegetableModal = ({ isOpen, OnClose, vegetable }) => {
  const { fetchCommodityPrices } = useVegetableStore()

  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [marketFilter, setMarketFilter] = useState("")
  const [dateFilter, setDateFilter] = useState("")

  const marketNames = vegetable ? Object.keys(vegetable.markets) : []
  const firstMarket = marketNames[0]
  const price = firstMarket ? vegetable.markets[firstMarket] : null

  useEffect(() => {
    if (vegetable && isOpen) fetchHistory()
  }, [vegetable, isOpen])

  const fetchHistory = async () => {
    try {
      setLoading(true)
      const data = await fetchCommodityPrices(vegetable.id)
      setHistory(data)
    } catch (err) {
      console.error("History fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !vegetable) return null

  // Filtered history based on selected filters
  const filteredHistory = history.filter((row) => {
    const marketMatch = marketFilter ? row.market === marketFilter : true
    const dateMatch = dateFilter ? new Date(row.price_date).toLocaleDateString() === dateFilter : true
    return marketMatch && dateMatch
  })

  // Prepare chart data only for filtered history
  const marketCharts = marketNames
    .filter((market) => !marketFilter || market === marketFilter)
    .map((market) => {
      const marketData = filteredHistory
        .filter((row) => row.market === market)
        .sort((a, b) => new Date(a.price_date) - new Date(b.price_date))

      return {
        market,
        data: {
          labels: marketData.map((r) => new Date(r.price_date).toLocaleDateString()),
          datasets: [
            {
              label: "Prevailing",
              data: marketData.map((r) => r.prevailing_price),
              borderColor: "#3B82F6",
              backgroundColor: "#3B82F6",
              tension: 0.1,
              borderWidth: 1,
              pointRadius: 4
            },
            {
              label: "High",
              data: marketData.map((r) => r.high_price),
              borderColor: "#10B981",
              backgroundColor: "#10B981",
              tension: 0.2,
              borderWidth: 2,
              pointRadius: 2
            },
            {
              label: "Low",
              data: marketData.map((r) => r.low_price),
              borderColor: "#EF4444",
              backgroundColor: "#EF4444",
              tension: 0.2,
              borderWidth: 2,
              pointRadius: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "top", labels: { boxWidth: 10, font: { size: 10 } } },
            title: { display: true, text: `${market} Price Trend`, font: { size: 12 } }
          },
          scales: {
            x: { ticks: { font: { size: 10 } } },
            y: { ticks: { font: { size: 10 } } }
          }
        }
      }
    })

  // Generate unique dates for the date filter dropdown
  const uniqueDates = [...new Set(history.map(h => new Date(h.price_date).toLocaleDateString()))]

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-6xl p-4">

        {/* HEADER */}
        <h2 className="text-2xl font-bold mb-1">{vegetable.name}</h2>
        <p className="text-sm text-gray-500 mb-4">{vegetable.categories}</p>


        {/* FLEX CONTAINER */}
        <div className="flex flex-col lg:flex-row gap-4">

          {/* LEFT: Chart */}
          <div className="flex-1">
            {marketCharts.map((chart, i) => (
              <div key={i} className="mb-4 h-40 w-full">
                <Line data={chart.data} options={chart.options} />
              </div>
            ))}
          </div>

          {/* RIGHT: Current Price + Table */}
          <div className="flex-1 space-y-4">
            {/* CURRENT PRICE */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div className="stat bg-base-200 rounded-lg p-2 text-center">
                <div className="stat-title text-xs">Prevailing</div>
                <div className="stat-value text-primary text-lg">₱{price?.prevailing || "-"}</div>
              </div>
              <div className="stat bg-base-200 rounded-lg p-2 text-center">
                <div className="stat-title text-xs">High</div>
                <div className="stat-value text-success text-lg">₱{price?.high || "-"}</div>
              </div>
              <div className="stat bg-base-200 rounded-lg p-2 text-center">
                <div className="stat-title text-xs">Low</div>
                <div className="stat-value text-error text-lg">₱{price?.low || "-"}</div>
              </div>
            </div>

            {/* PRICE HISTORY TABLE */}
            <h3 className="font-semibold mb-2 text-sm">Price History</h3>
            {loading ? (
              <span className="loading loading-spinner"></span>
            ) : (
              <div className="overflow-y-auto h-50 text-xs">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Market</th>
                      <th>Prevailing</th>
                      <th>High</th>
                      <th>Low</th>
                    </tr>
                  </thead>
                  <tbody>

                    {/* AVERAGE ROW */}
                    {filteredHistory.length > 0 && (
                      <tr className="font-semibold">
                        <td colSpan={2} className="text-center">Average</td>
                        <td>
                          ₱{(
                            filteredHistory.reduce((sum, r) => sum + Number(r.prevailing_price), 0) /
                            filteredHistory.length
                          ).toFixed(2)}
                        </td>
                        <td>
                          ₱{(
                            filteredHistory.reduce((sum, r) => sum + Number(r.high_price), 0) /
                            filteredHistory.length
                          ).toFixed(2)}
                        </td>
                        <td>
                          ₱{(
                            filteredHistory.reduce((sum, r) => sum + Number(r.low_price), 0) /
                            filteredHistory.length
                          ).toFixed(2)}
                        </td>
                      </tr>
                    )}
                    
                    {filteredHistory.map((row, i) => (
                      <tr key={i}>
                        <td>{new Date(row.price_date).toLocaleDateString()}</td>
                        <td>{row.market}</td>
                        <td>₱{row.prevailing_price}</td>
                        <td>₱{row.high_price}</td>
                        <td>₱{row.low_price}</td>
                      </tr>
                    ))}

                  </tbody>
                </table>
              </div>
            )}

            {/* FILTERS */}
        <div className="flex gap-2 mb-4">
          <select
            className="select select-bordered text-xs"
            value={marketFilter}
            onChange={(e) => setMarketFilter(e.target.value)}
          >
            <option value="">All Markets</option>
            {marketNames.map((market) => (
              <option key={market} value={market}>{market}</option>
            ))}
          </select>

          <select
            className="select select-bordered text-xs"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="">All Dates</option>
            {uniqueDates.map((date) => (
              <option key={date} value={date}>{new Date(date).toDateString()}</option>
            ))}
          </select>

          {(marketFilter || dateFilter) && (
            <button
              className="btn btn-sm btn-error"
              onClick={() => {
                setMarketFilter("")
                setDateFilter("")
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

          </div>
        </div>

        {/* CLOSE */}
        <div className="modal-action">
          <button className="btn btn-error btn-sm" onClick={OnClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default VegetableModal