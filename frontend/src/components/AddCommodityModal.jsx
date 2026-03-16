import React, { useState, useEffect } from "react"
import { useVegetableStore } from "../store/VegetableStore.js"
import { IoCloseCircle } from "react-icons/io5"

const AddCommodityModal = ({ isOpen, OnClose }) => {
  const { categories, fetchCategories, addCommodity } = useVegetableStore()

  const [form, setForm] = useState({
    category_id: "",
    name: "",
    specification: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [focused, setFocused] = useState("")

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    const result = await addCommodity(form)
    setIsSubmitting(false)
    if (result?.success) {
      setForm({ category_id: "", name: "", specification: "" })
    }
  }

  if (!isOpen) return null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

        .acm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 30, 15, 0.55);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: acm-fade-in 0.2s ease;
        }

        @keyframes acm-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        @keyframes acm-slide-up {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }

        .acm-box {
          background: #faf9f6;
          border-radius: 20px;
          width: 420px;
          max-width: calc(100vw - 32px);
          box-shadow:
            0 2px 4px rgba(0,0,0,0.04),
            0 12px 40px rgba(0,0,0,0.12),
            0 0 0 1px rgba(80,120,60,0.08);
          animation: acm-slide-up 0.28s cubic-bezier(0.34,1.56,0.64,1);
          overflow: hidden;
          font-family: 'DM Sans', sans-serif;
        }

        .acm-header {
          background: linear-gradient(135deg, #2d5a27 0%, #3d7a35 60%, #4a9040 100%);
          padding: 28px 28px 24px;
          position: relative;
          overflow: hidden;
        }

        .acm-header::before {
          content: '';
          position: absolute;
          top: -40px; right: -40px;
          width: 130px; height: 130px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
        }

        .acm-header::after {
          content: '';
          position: absolute;
          bottom: -20px; left: 40px;
          width: 80px; height: 80px;
          border-radius: 50%;
          background: rgba(255,255,255,0.04);
        }

        .acm-label-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 100px;
          padding: 4px 12px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.85);
          margin-bottom: 10px;
        }

        .acm-title {
          font-family: 'DM Serif Display', serif;
          font-size: 26px;
          color: #fff;
          margin: 0;
          line-height: 1.2;
          position: relative;
          z-index: 1;
        }

        .acm-subtitle {
          font-size: 13px;
          color: rgba(255,255,255,0.6);
          margin-top: 4px;
          font-weight: 400;
          position: relative;
          z-index: 1;
        }

        .acm-close {
          position: absolute;
          top: 20px; right: 20px;
          background: rgba(255,255,255,0.12);
          border: none;
          border-radius: 50%;
          width: 34px; height: 34px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: background 0.15s;
          color: rgba(255,255,255,0.8);
          z-index: 2;
        }
        .acm-close:hover {
          background: rgba(255,255,255,0.22);
          color: #fff;
        }

        .acm-body {
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .acm-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .acm-field-label {
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #5a6a55;
        }

        .acm-field-label span {
          font-weight: 400;
          color: #aaa;
          text-transform: none;
          letter-spacing: 0;
        }

        .acm-input, .acm-select {
          width: 100%;
          padding: 11px 14px;
          border-radius: 10px;
          border: 1.5px solid #e2e8de;
          background: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: #1a2e18;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          appearance: none;
          -webkit-appearance: none;
        }

        .acm-input::placeholder {
          color: #bdc9ba;
        }

        .acm-input:focus, .acm-select:focus {
          border-color: #3d7a35;
          box-shadow: 0 0 0 3px rgba(61,122,53,0.12);
        }

        .acm-select-wrap {
          position: relative;
        }

        .acm-select-wrap::after {
          content: '';
          position: absolute;
          right: 14px; top: 50%;
          transform: translateY(-50%);
          width: 0; height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 5px solid #7a9475;
          pointer-events: none;
        }

        .acm-divider {
          height: 1px;
          background: #edf0ea;
          margin: 4px 0;
        }

        .acm-footer {
          padding: 0 28px 24px;
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .acm-btn-cancel {
          padding: 10px 20px;
          border-radius: 10px;
          border: 1.5px solid #dde5d9;
          background: transparent;
          font-family: 'DM Sans', sans-serif;
          font-size: 13.5px;
          font-weight: 500;
          color: #5a6a55;
          cursor: pointer;
          transition: all 0.15s;
        }
        .acm-btn-cancel:hover {
          background: #f0f4ee;
          border-color: #c5d4c0;
        }

        .acm-btn-submit {
          padding: 10px 24px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #2d5a27, #3d7a35);
          font-family: 'DM Sans', sans-serif;
          font-size: 13.5px;
          font-weight: 600;
          color: #fff;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 2px 8px rgba(45,90,39,0.25);
        }
        .acm-btn-submit:hover:not(:disabled) {
          background: linear-gradient(135deg, #255020, #347030);
          box-shadow: 0 4px 14px rgba(45,90,39,0.35);
          transform: translateY(-1px);
        }
        .acm-btn-submit:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          transform: none;
        }

        .acm-spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: acm-spin 0.6s linear infinite;
        }
        @keyframes acm-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="acm-overlay" onClick={(e) => e.target === e.currentTarget && OnClose()}>
        <div className="acm-box">

          {/* Header */}
          <div className="acm-header">
            <button className="acm-close" onClick={OnClose}>
              <IoCloseCircle size={18} />
            </button>
            <div className="acm-label-tag">
              <span>🌿</span> Inventory
            </div>
            <h2 className="acm-title">Add Commodity</h2>
            <p className="acm-subtitle">Register a new commodity to the price monitor</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="acm-body">

              {/* Category */}
              <div className="acm-field">
                <label className="acm-field-label">Category</label>
                <div className="acm-select-wrap">
                  <select
                    name="category_id"
                    className="acm-select"
                    value={form.category_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select a category…</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Name */}
              <div className="acm-field">
                <label className="acm-field-label">Commodity Name</label>
                <input
                  type="text"
                  name="name"
                  className="acm-input"
                  placeholder="e.g. Ampalaya, Bangus, Pork Kasim"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Specification */}
              <div className="acm-field">
                <label className="acm-field-label">
                  Specification <span>(optional)</span>
                </label>
                <input
                  type="text"
                  name="specification"
                  className="acm-input"
                  placeholder="e.g. 4-5 pcs/kg, med(3-4pcs/kg)"
                  value={form.specification}
                  onChange={handleChange}
                />
              </div>

            </div>

            <div className="acm-divider" style={{ margin: "0 28px" }} />

            {/* Footer */}
            <div className="acm-footer">
              <button type="button" className="acm-btn-cancel" onClick={OnClose}>
                Cancel
              </button>
              <button type="submit" className="acm-btn-submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <><div className="acm-spinner" /> Saving…</>
                ) : (
                  <>+ Add Commodity</>
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    </>
  )
}

export default AddCommodityModal