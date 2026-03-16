import React, { useState, useEffect, forwardRef, useMemo } from "react"
import { useVegetableStore } from "../store/VegetableStore.js"
import { IoCloseCircle, IoCalendar } from "react-icons/io5"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"

const CustomInput = forwardRef(({ value, onClick }, ref) => (
  <div className="apr-date-wrap" onClick={onClick} ref={ref}>
    <input readOnly value={value} placeholder="Select a date…" className="apr-input" />
    <IoCalendar className="apr-date-icon" size={16} />
  </div>
))

const calcPrevailing = (nums) => {
  if (nums.length === 0) return ""
  if (nums.length === 1) return nums[0]
  const freq = {}
  for (const v of nums) freq[v] = (freq[v] || 0) + 1
  const maxFreq = Math.max(...Object.values(freq))
  const modes = Object.keys(freq).filter((k) => freq[k] === maxFreq).map(Number)
  if (modes.length > 1) return Math.round((modes.reduce((a, b) => a + b, 0) / modes.length) * 100) / 100
  if (maxFreq > 1) return modes[0]
  if (nums.length < 3) return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100
}

const AddPriceRecordModal = ({ isOpen, OnClose, defaultCommodity = null }) => {
  const { addPriceRecord, commodities, markets, fetchCommodities, fetchMarkets } =
    useVegetableStore()

  const emptyForm = {
    commodity_id: "",
    market_id: "",
    price_date: new Date(),
    respondent_1: "",
    respondent_2: "",
    respondent_3: "",
    respondent_4: "",
    respondent_5: "",
  }

  const [form, setForm]             = useState(emptyForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError]           = useState("")

  // Whether a commodity was pre-selected from the table (locks the dropdown)
  const isCommodityLocked = !!defaultCommodity

  useEffect(() => {
    if (isOpen) {
      fetchCommodities()
      fetchMarkets()
      setForm({ ...emptyForm, commodity_id: defaultCommodity?.id ?? "" })
      setError("")
    }
  }, [isOpen, defaultCommodity])

  const respondentNums = [1, 2, 3, 4, 5]
    .map((n) => parseFloat(form[`respondent_${n}`]))
    .filter((v) => !isNaN(v) && v > 0)

  const computed = useMemo(() => {
    if (respondentNums.length === 0) return { prevailing: "", high: "", low: "" }
    return {
      prevailing: calcPrevailing(respondentNums),
      high: Math.max(...respondentNums),
      low:  Math.min(...respondentNums),
    }
  }, [form.respondent_1, form.respondent_2, form.respondent_3, form.respondent_4, form.respondent_5])

  const handleChange     = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setError("") }
  const handleDateChange = (date) => setForm({ ...form, price_date: date })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    if (!form.commodity_id)        return setError("Please select a commodity.")
    if (!form.market_id)           return setError("Please select a market.")
    if (!form.price_date)          return setError("Please select a date.")
    if (computed.prevailing === "") return setError("Enter at least one respondent price.")

    setIsSubmitting(true)
    try {
      const result = await addPriceRecord({
        commodity_id:     form.commodity_id,
        market_id:        form.market_id,
        price_date:       form.price_date.toISOString().split("T")[0],
        respondent_1:     form.respondent_1 !== "" ? parseFloat(form.respondent_1) : null,
        respondent_2:     form.respondent_2 !== "" ? parseFloat(form.respondent_2) : null,
        respondent_3:     form.respondent_3 !== "" ? parseFloat(form.respondent_3) : null,
        respondent_4:     form.respondent_4 !== "" ? parseFloat(form.respondent_4) : null,
        respondent_5:     form.respondent_5 !== "" ? parseFloat(form.respondent_5) : null,
        prevailing_price: computed.prevailing,
        high_price:       computed.high,
        low_price:        computed.low,
      })
      if (result?.duplicate) return setError("A record for this commodity, market, and date already exists.")
      OnClose()
    } catch {
      setError("Failed to add price record. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

        .apr-overlay {
          position: fixed; inset: 0;
          background: rgba(15,30,15,0.55);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          z-index: 9999;
          animation: apr-fade 0.2s ease;
        }
        @keyframes apr-fade { from { opacity:0 } to { opacity:1 } }

        .apr-box {
          background: #faf9f6;
          border-radius: 20px;
          width: 500px;
          max-width: calc(100vw - 32px);
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 2px 4px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(80,120,60,0.08);
          animation: apr-up 0.28s cubic-bezier(0.34,1.56,0.64,1);
          font-family: 'DM Sans', sans-serif;
        }
        @keyframes apr-up {
          from { opacity:0; transform:translateY(20px) scale(0.97) }
          to   { opacity:1; transform:translateY(0)    scale(1)    }
        }

        .apr-box::-webkit-scrollbar { width: 5px }
        .apr-box::-webkit-scrollbar-track { background: transparent }
        .apr-box::-webkit-scrollbar-thumb { background: #c8d8c4; border-radius: 10px }

        .apr-header {
          background: linear-gradient(135deg, #2d5a27 0%, #3d7a35 60%, #4a9040 100%);
          padding: 28px 28px 24px;
          position: relative; overflow: hidden;
          border-radius: 20px 20px 0 0;
        }
        .apr-header::before {
          content:''; position:absolute; top:-40px; right:-40px;
          width:130px; height:130px; border-radius:50%;
          background:rgba(255,255,255,0.06);
        }
        .apr-header::after {
          content:''; position:absolute; bottom:-20px; left:40px;
          width:80px; height:80px; border-radius:50%;
          background:rgba(255,255,255,0.04);
        }
        .apr-tag {
          display:inline-flex; align-items:center; gap:6px;
          background:rgba(255,255,255,0.15);
          border:1px solid rgba(255,255,255,0.2);
          border-radius:100px; padding:4px 12px;
          font-size:11px; font-weight:600; letter-spacing:0.08em;
          text-transform:uppercase; color:rgba(255,255,255,0.85);
          margin-bottom:10px;
        }
        .apr-title {
          font-family:'DM Serif Display',serif;
          font-size:26px; color:#fff; margin:0; line-height:1.2;
          position:relative; z-index:1;
        }
        .apr-subtitle {
          font-size:13px; color:rgba(255,255,255,0.6);
          margin-top:4px; font-weight:400; position:relative; z-index:1;
        }
        .apr-close {
          position:absolute; top:20px; right:20px;
          background:rgba(255,255,255,0.12); border:none; border-radius:50%;
          width:34px; height:34px;
          display:flex; align-items:center; justify-content:center;
          cursor:pointer; transition:background 0.15s;
          color:rgba(255,255,255,0.8); z-index:2;
        }
        .apr-close:hover { background:rgba(255,255,255,0.22); color:#fff }

        .apr-body { padding:24px 28px; display:flex; flex-direction:column; gap:16px }

        .apr-field { display:flex; flex-direction:column; gap:6px }
        .apr-label {
          font-size:11.5px; font-weight:600; letter-spacing:0.06em;
          text-transform:uppercase; color:#5a6a55;
        }
        .apr-label span { font-weight:400; color:#aaa; text-transform:none; letter-spacing:0 }

        .apr-input, .apr-select {
          width:100%; padding:11px 14px;
          border-radius:10px; border:1.5px solid #e2e8de;
          background:#fff; font-family:'DM Sans',sans-serif;
          font-size:14px; color:#1a2e18; outline:none;
          transition:border-color 0.15s, box-shadow 0.15s;
          appearance:none; -webkit-appearance:none;
          box-sizing: border-box;
        }
        .apr-input::placeholder { color:#bdc9ba }
        .apr-input:focus, .apr-select:focus {
          border-color:#3d7a35;
          box-shadow:0 0 0 3px rgba(61,122,53,0.12);
        }

        /* Locked commodity display */
        .apr-locked {
          width:100%; padding:11px 14px;
          border-radius:10px; border:1.5px solid #e2e8de;
          background:#f4f7f2; font-family:'DM Sans',sans-serif;
          font-size:14px; color:#3a5235; outline:none;
          box-sizing: border-box;
          display:flex; align-items:center; justify-content:space-between;
          cursor:default;
        }
        .apr-locked-badge {
          font-size:10px; font-weight:600; letter-spacing:0.06em;
          text-transform:uppercase; color:#7a9475;
          background:#e4efe2; border-radius:6px; padding:2px 7px;
        }

        .apr-select-wrap { position:relative }
        .apr-select-wrap::after {
          content:''; position:absolute; right:14px; top:50%;
          transform:translateY(-50%);
          width:0; height:0;
          border-left:5px solid transparent;
          border-right:5px solid transparent;
          border-top:5px solid #7a9475;
          pointer-events:none;
        }

        .apr-date-wrap {
          position:relative; cursor:pointer;
          display:flex; align-items:center;
        }
        .apr-date-wrap .apr-input { padding-right:38px; cursor:pointer }
        .apr-date-icon {
          position:absolute; right:13px;
          color:#7a9475; pointer-events:none;
        }

        .apr-respondents {
          display:grid; grid-template-columns:repeat(5,1fr); gap:8px;
        }
        .apr-respondent-cell { display:flex; flex-direction:column; align-items:center; gap:5px }
        .apr-r-label {
          font-size:11px; font-weight:600; color:#7a9475;
          letter-spacing:0.05em;
        }
        .apr-r-input {
          width:100%; padding:9px 6px;
          border-radius:10px; border:1.5px solid #e2e8de;
          background:#fff; font-family:'DM Sans',sans-serif;
          font-size:13px; color:#1a2e18; outline:none; text-align:center;
          transition:border-color 0.15s, box-shadow 0.15s;
          appearance:none; -webkit-appearance:none;
          box-sizing: border-box;
        }
        .apr-r-input:focus {
          border-color:#3d7a35;
          box-shadow:0 0 0 3px rgba(61,122,53,0.12);
        }
        .apr-r-input::placeholder { color:#cdd9ca }

        .apr-computed {
          background:linear-gradient(135deg,#f0f7ee,#e8f4e5);
          border:1.5px solid #c8dfc4;
          border-radius:12px; padding:16px 20px;
        }
        .apr-computed-title {
          font-size:11px; font-weight:700; letter-spacing:0.08em;
          text-transform:uppercase; color:#4a7a42; margin-bottom:12px;
          display:flex; align-items:center; gap:6px;
        }
        .apr-computed-title::before {
          content:''; display:block; width:6px; height:6px;
          border-radius:50%; background:#4a7a42;
        }
        .apr-computed-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px }
        .apr-computed-item {
          background:rgba(255,255,255,0.7); border-radius:8px;
          padding:10px 12px; text-align:center;
          border:1px solid rgba(200,223,196,0.6);
        }
        .apr-computed-item-label {
          font-size:10.5px; color:#7a9475; font-weight:500;
          letter-spacing:0.04em; text-transform:uppercase; margin-bottom:4px;
        }
        .apr-computed-item-val { font-size:17px; font-weight:700; }
        .apr-computed-item-val.prevailing { color:#2d5a27 }
        .apr-computed-item-val.high       { color:#3d7a35 }
        .apr-computed-item-val.low        { color:#5a9050 }
        .apr-computed-item-val.empty      { color:#cdd9ca; font-weight:400; font-size:14px }

        .apr-error {
          background:#fff5f5; border:1.5px solid #fcc; border-radius:10px;
          padding:10px 14px; font-size:13px; color:#c0392b; text-align:center;
        }

        .apr-divider { height:1px; background:#edf0ea; margin:0 }

        .apr-footer {
          padding:20px 28px; display:flex; gap:10px; justify-content:flex-end;
        }
        .apr-btn-cancel {
          padding:10px 20px; border-radius:10px;
          border:1.5px solid #dde5d9; background:transparent;
          font-family:'DM Sans',sans-serif; font-size:13.5px; font-weight:500;
          color:#5a6a55; cursor:pointer; transition:all 0.15s;
        }
        .apr-btn-cancel:hover { background:#f0f4ee; border-color:#c5d4c0 }
        .apr-btn-submit {
          padding:10px 24px; border-radius:10px; border:none;
          background:linear-gradient(135deg,#2d5a27,#3d7a35);
          font-family:'DM Sans',sans-serif; font-size:13.5px; font-weight:600;
          color:#fff; cursor:pointer; transition:all 0.15s;
          display:flex; align-items:center; gap:8px;
          box-shadow:0 2px 8px rgba(45,90,39,0.25);
        }
        .apr-btn-submit:hover:not(:disabled) {
          background:linear-gradient(135deg,#255020,#347030);
          box-shadow:0 4px 14px rgba(45,90,39,0.35);
          transform:translateY(-1px);
        }
        .apr-btn-submit:disabled { opacity:0.65; cursor:not-allowed; transform:none }

        .apr-spinner {
          width:14px; height:14px;
          border:2px solid rgba(255,255,255,0.35);
          border-top-color:#fff; border-radius:50%;
          animation:apr-spin 0.6s linear infinite;
        }
        @keyframes apr-spin { to { transform:rotate(360deg) } }

        .react-datepicker { font-family:'DM Sans',sans-serif !important; border-radius:12px !important; border:1.5px solid #e2e8de !important; overflow:hidden }
        .react-datepicker__header { background:#f0f7ee !important; border-bottom:1px solid #e2e8de !important }
        .react-datepicker__current-month { color:#2d5a27 !important; font-weight:600 !important }
        .react-datepicker__day--selected { background:#3d7a35 !important; border-radius:8px !important }
        .react-datepicker__day:hover { background:#e8f4e5 !important; border-radius:8px !important }
        .react-datepicker__navigation-icon::before { border-color:#5a6a55 !important }
      `}</style>

      <div className="apr-overlay" onClick={(e) => e.target === e.currentTarget && OnClose()}>
        <div className="apr-box">

          {/* Header */}
          <div className="apr-header">
            <button className="apr-close" onClick={OnClose}>
              <IoCloseCircle size={18} />
            </button>
            <div className="apr-tag">📊 Price Entry</div>
            <h2 className="apr-title">Add Price Record</h2>
            <p className="apr-subtitle">Prevailing, high &amp; low are auto-computed from respondents</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="apr-body">

              {/* Commodity + Market side by side */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>

                {/* Commodity — locked display when opened from table, dropdown otherwise */}
                <div className="apr-field">
                  <label className="apr-label">Commodity</label>
                  {isCommodityLocked ? (
                    <div className="apr-locked">
                      <span>{defaultCommodity.name}{defaultCommodity.category ? ` (${defaultCommodity.category})` : ""}</span>
                      <span className="apr-locked-badge">locked</span>
                    </div>
                  ) : (
                    <div className="apr-select-wrap">
                      <select name="commodity_id" className="apr-select" value={form.commodity_id} onChange={handleChange}>
                        <option value="">Select…</option>
                        {commodities.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}{c.category ? ` (${c.category})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="apr-field">
                  <label className="apr-label">Market</label>
                  <div className="apr-select-wrap">
                    <select name="market_id" className="apr-select" value={form.market_id} onChange={handleChange}>
                      <option value="">Select…</option>
                      {markets.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Date */}
              <div className="apr-field">
                <label className="apr-label">Date</label>
                <DatePicker
                  selected={form.price_date}
                  onChange={handleDateChange}
                  customInput={<CustomInput />}
                  dateFormat="MMMM d, yyyy"
                  maxDate={new Date()}
                  showMonthDropdown
                  showYearDropdown
                  dropdownMode="select"
                  todayButton="Today"
                />
              </div>

              {/* Respondents */}
              <div className="apr-field">
                <label className="apr-label">
                  Respondent Prices <span>(leave blank if unavailable)</span>
                </label>
                <div className="apr-respondents">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div key={n} className="apr-respondent-cell">
                      <span className="apr-r-label">R{n}</span>
                      <input
                        name={`respondent_${n}`}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="₱"
                        className="apr-r-input"
                        value={form[`respondent_${n}`]}
                        onChange={handleChange}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Computed preview */}
              <div className="apr-computed">
                <div className="apr-computed-title">Auto-computed Prices</div>
                <div className="apr-computed-grid">
                  {[
                    { key:"prevailing", label:"Prevailing", val:computed.prevailing },
                    { key:"high",       label:"High",       val:computed.high },
                    { key:"low",        label:"Low",        val:computed.low  },
                  ].map(({ key, label, val }) => (
                    <div className="apr-computed-item" key={key}>
                      <div className="apr-computed-item-label">{label}</div>
                      <div className={`apr-computed-item-val ${val !== "" ? key : "empty"}`}>
                        {val !== "" ? `₱${val}` : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && <div className="apr-error">{error}</div>}

            </div>

            <div className="apr-divider" />

            <div className="apr-footer">
              <button type="button" className="apr-btn-cancel" onClick={OnClose}>Cancel</button>
              <button type="submit" className="apr-btn-submit" disabled={isSubmitting}>
                {isSubmitting
                  ? <><div className="apr-spinner" /> Saving…</>
                  : <>+ Add Record</>}
              </button>
            </div>
          </form>

        </div>
      </div>
    </>
  )
}

export default AddPriceRecordModal