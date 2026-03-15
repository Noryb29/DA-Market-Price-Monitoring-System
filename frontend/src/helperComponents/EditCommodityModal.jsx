import { useState,useEffect } from "react"
import { useVegetableStore } from "../store/VegetableStore"

// ─── Edit Commodity Modal ─────────────────────────────────────────────────────

const EditCommodityModal = ({ commodity, categories, isOpen, onClose, onSave }) => {
  const [form, setForm] = useState({ name: "", specification: "", category_id: "" })

  useEffect(() => {
    if (commodity) {
      setForm({
        name: commodity.name ?? "",
        specification: commodity.specification ?? "",
        category_id: commodity.category_id ?? "",
      })
    }
  }, [commodity])

  if (!isOpen || !commodity) return null

  const handleSave = () => {
    if (!form.name || !form.category_id) {
      Swal.fire({ icon: "warning", title: "Missing Fields", text: "Name and category are required." })
      return
    }
    onSave(commodity.id, form)
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-green-800">Edit Commodity</h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-sm font-semibold mb-1 block">Category</label>
            <select
              className="select select-bordered w-full"
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold mb-1 block">Name</label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-semibold mb-1 block">Specification</label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={form.specification}
              onChange={(e) => setForm({ ...form, specification: e.target.value })}
            />
          </div>
        </div>

        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-success" onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  )
}

export default EditCommodityModal;