import { useState,useEffect } from "react"
import { useVegetableStore } from "../store/VegetableStore"
// ─── Price History Modal ──────────────────────────────────────────────────────
const PriceHistoryModal = ({ commodity, isOpen, onClose }) => {
  
  const { fetchCommodityPrices, commodityPrices } = useVegetableStore()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && commodity) {
      setLoading(true)
      fetchCommodityPrices(commodity.id).finally(() => setLoading(false))
    }
  }, [isOpen, commodity])

  if (!isOpen || !commodity) return null

  const fmt = (val) =>
  val != null ? `₱${Number(val).toFixed(2)}` : null
  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-3xl" style={{ maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-green-800">{commodity.name}</h3>
            <p className="text-sm text-gray-500">{commodity.specification || "Price History"}</p>
          </div>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <span className="loading loading-spinner loading-md text-green-600" />
          </div>
        ) : commodityPrices.length === 0 ? (
          <p className="text-center text-gray-400 py-10">No price records found.</p>
        ) : (
          <div className="overflow-auto flex-1">
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
                    <td className="text-center font-semibold text-green-700">{fmt(r.prevailing_price)}</td>
                    <td className="text-center">{fmt(r.high_price)}</td>
                    <td className="text-center">{fmt(r.low_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="modal-action mt-3">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

export default PriceHistoryModal;