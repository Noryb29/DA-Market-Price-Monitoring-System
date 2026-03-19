import React, { useRef, useState, useEffect } from "react"
import * as XLSX from "xlsx"
import Swal from "sweetalert2"
import { useVegetableStore } from "../store/VegetableStore"

// ─── Helper: robust numeric parsing ──────────────────────────────────────────
const parseNumeric = (val) => {
  if (val === null || val === undefined) return null
  const str = String(val).trim().toLowerCase()
  if (str === "" || str === "n/a" || str === "na" || str === "-" || str === "--" || str === "n.m." || str === "nm") return null
  const f = parseFloat(val)
  return isNaN(f) ? null : f
}

// ─── Helper: detect if row is a category header ───────────────────────────────
const isCategoryRow = (row) => {
  if (!row || row.length < 3) return false
  const commodity = row[0]
  const unit = row[2]
  const hasCommodity = commodity !== null && String(commodity).trim().length > 0
  const hasUnit = unit !== null && String(unit).trim().length > 0
  const respondents = [row[3], row[4], row[5], row[6], row[7]]
  const hasNumeric = respondents.some((v) => parseNumeric(v) !== null)
  return hasCommodity && !hasUnit && !hasNumeric
}

// ─── Helper: find data start row ───────────────────────────────────────────────
const findDataStartRow = (raw) => {
  for (let i = 0; i < Math.min(30, raw.length); i++) {
    const row = raw[i]
    if (!row || row.length < 3) continue
    const cell0 = String(row[0] ?? "").toLowerCase()
    if (cell0.includes("commodity") || cell0.includes("item") || cell0.includes("description")) {
      return i + 1
    }
  }
  return 8
}

// ─── Prevailing Price Formula ─────────────────────────────────────────────────
const calcPrevailing = (values) => {
  const nums = values.map((v) => parseFloat(v)).filter((v) => !isNaN(v))
  if (nums.length === 0) return null
  if (nums.length === 1) return nums[0]

  const freq = {}
  for (const v of nums) freq[v] = (freq[v] || 0) + 1

  const maxFreq = Math.max(...Object.values(freq))
  const modes = Object.keys(freq).filter((k) => freq[k] === maxFreq).map(Number)

  if (modes.length > 1) {
    const sum = modes.reduce((a, b) => a + b, 0)
    return Math.round((sum / modes.length) * 100) / 100
  }

  if (maxFreq > 1) return modes[0]

  if (nums.length < 3) {
    return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100
  }

  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100
}

// ─── DA Bantay Presyo Form A1 Parser ─────────────────────────────────────────
const parseDAExcel = (workbook) => {
  const sheetName = workbook.SheetNames.includes("FORM A1")
    ? "FORM A1"
    : workbook.SheetNames[0]

  const ws = workbook.Sheets[sheetName]
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })

  // ── Extract metadata from header rows ────────────────────────────────────
  let marketName = null
  let priceDate = null

  for (let i = 0; i < Math.min(20, raw.length); i++) {
    const row = raw[i]
    if (!row) continue
    
    const cell0 = String(row[0] ?? "")
    const cell1 = String(row[1] ?? "")
    
    if (/MARKET:/i.test(cell0) || /MARKET\s*NAME/i.test(cell0)) {
      const rawVal = cell0.replace(/.*MARKET\s*:\s*/i, "").trim() || cell1.trim()
      marketName = rawVal.replace(/\s*market\s*$/i, "").trim()
    }
    if (/Date/i.test(cell0) || /Date/i.test(cell1)) {
      const datePart = cell0.replace(/.*Date\s*:\s*/i, "").trim() || cell1.replace(/Date\s*:\s*/i, "").trim()
      if (datePart) {
        const parsed = new Date(datePart)
        priceDate = !isNaN(parsed) ? parsed.toISOString().split("T")[0] : datePart
      }
    }
  }

  // ── Find actual data start ────────────────────────────────────────────────
  const dataStartRow = findDataStartRow(raw)

  // ── Parse commodity rows ──────────────────────────────────────────────────
  let currentCategory = null
  const results = []

  for (let i = dataStartRow; i < raw.length; i++) {
    const row = raw[i]
    if (!row || !Array.isArray(row)) continue
    
    // Only process rows with 13 columns
    if (row.length < 13) continue

    // Skip completely empty rows
    if (row.every((c) => c === null || c === undefined || String(c).trim() === "")) continue

    const commodityRaw = row[0]
    if (commodityRaw === null || commodityRaw === undefined) continue
    
    const commodityName = String(commodityRaw).trim()
    if (!commodityName) continue

    const specification = row[1]
    const unit = row[2]
    const rawRespondents = [row[3], row[4], row[5], row[6], row[7]].map(v => v ?? null)

    const respondents = rawRespondents.map((v) => parseNumeric(v))
    const numericOnly = respondents.filter((v) => v !== null)

    // Category header detection
    if (isCategoryRow(row)) {
      currentCategory = commodityName.replace(/\s+/g, " ").trim()
      continue
    }

    // Calculate prevailing only if there are numeric values
    const prevailing = numericOnly.length > 0 ? calcPrevailing(numericOnly) : null
    const high = numericOnly.length > 0 ? Math.max(...numericOnly) : null
    const low = numericOnly.length > 0 ? Math.min(...numericOnly) : null

    results.push({
      category: currentCategory,
      commodity_name: commodityName,
      specification: specification ? String(specification).trim() : "",
      unit: unit ? String(unit).trim() : "",
      market_name: marketName,
      price_date: priceDate,
      respondent_1: respondents[0],
      respondent_2: respondents[1],
      respondent_3: respondents[2],
      respondent_4: respondents[3],
      respondent_5: respondents[4],
      prevailing_price: prevailing,
      high_price: high,
      low_price: low,
    })
  }

  return { marketName, priceDate, rows: results }
}

// ─── Component ────────────────────────────────────────────────────────────────
const ImportExcelModal = ({ isOpen, OnClose }) => {
  const {
    commodities,
    markets,
    categories,
    fetchCommodities,
    fetchMarkets,
    fetchCategories,
    addPriceRecord,
    addCommodity,
    addCategory,
    addMarket,
    fetchVegetables,
  } = useVegetableStore()

  const fileInputRef = useRef(null)
  const [rows, setRows] = useState([])
  const [fileName, setFileName] = useState("")
  const [metaInfo, setMetaInfo] = useState({ marketName: null, priceDate: null })
  const [isDragging, setIsDragging] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitProgress, setSubmitProgress] = useState({ current: 0, total: 0 })
  const [step, setStep] = useState("upload")
  const [existingPrices, setExistingPrices] = useState([])

  useEffect(() => {
    if (isOpen) {
      fetchCommodities()
      fetchMarkets()
      fetchCategories()
    }
  }, [isOpen])


  // ── Lookup helpers ────────────────────────────────────────────────────────

  // FIX: match commodity by BOTH name AND category to avoid collisions like
  // "Special" under "Imported Commercial Rice" vs "Local Commercial Rice"
  const findCommodity = (name, categoryId) => {
    if (!name) return null
    const normalName = name.trim().toLowerCase()

    // First: try exact match on name + category_id (most specific)
    if (categoryId) {
      const exact = commodities.find(
        (c) =>
          c.name?.trim().toLowerCase() === normalName &&
          c.category_id === categoryId
      )
      if (exact) return exact
    }

    // Fallback: match by name only if category is unknown / not yet resolved
    return commodities.find((c) => c.name?.trim().toLowerCase() === normalName) ?? null
  }

  const findMarket = (name) =>
    markets.find((m) => m.name?.trim().toLowerCase() === name?.trim().toLowerCase()) ?? null

  const findCategory = (name) =>
    categories.find((c) => c.name?.trim().toLowerCase() === name?.trim().toLowerCase()) ?? null


  // ── Annotate rows ─────────────────────────────────────────────────────────
  const annotateRows = (parsed) =>
    parsed.map((row, index) => {
      // Resolve category first so we can use its id for the commodity lookup
      const category = findCategory(row.category)
      const categoryId = category?.id ?? null

      // FIX: pass categoryId so "Special (Imported)" and "Special (Local)" don't collide
      const commodity = findCommodity(row.commodity_name, categoryId)
      const market = findMarket(row.market_name)

      const willCreate = []
      if (!category) willCreate.push(`category "${row.category}"`)
      if (!commodity) willCreate.push(`commodity "${row.commodity_name}"`)
      if (!market) willCreate.push(`market "${row.market_name}"`)

      const errors = []
      if (!row.price_date) errors.push("Missing price date")


      return {
        ...row,
        commodity_id: commodity?.id ?? null,
        market_id: market?.id ?? null,
        category_id: categoryId,
        _index: index + 1,
        _willCreate: willCreate,
        _errors: errors,
      }
    })

  // ── Parse file ────────────────────────────────────────────────────────────
  const parseFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: "binary", cellDates: true })
        const { marketName, priceDate, rows: parsed } = parseDAExcel(workbook)

        if (parsed.length === 0) {
          Swal.fire({ icon: "warning", title: "No Data Found", text: "Could not extract any commodity rows." })
          return
        }

        setRows(annotateRows(parsed))
        setMetaInfo({ marketName, priceDate })
        setFileName(file.name)
        setStep("preview")
      } catch (err) {
        console.error(err)
        Swal.fire({ icon: "error", title: "Parse Error", text: "Failed to read the Excel file." })
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleFileChange = (e) => parseFile(e.target.files[0])
  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    parseFile(e.dataTransfer.files[0])
  }

  // ── Submit with auto-create chain ─────────────────────────────────────────
  const handleSubmit = async () => {
    const processableRows = rows.filter((r) => r._errors.length === 0 )

    if (processableRows.length === 0) {
      Swal.fire({ icon: "warning", title: "No Valid Rows", text: "All rows have errors or are duplicates." })
      return
    }

    setIsSubmitting(true)
    setSubmitProgress({ current: 0, total: processableRows.length })

    // Per-import caches keyed by "name::categoryId" to avoid same-name collisions
    const categoryCache = {}
    const commodityCache = {}  // key: `${commodity_name}::${category_id}`
    const marketCache = {}

    let successCount = 0
    let failCount = 0
    let createdCount = 0

    for (let i = 0; i < processableRows.length; i++) {
      const row = processableRows[i]
      setSubmitProgress({ current: i + 1, total: processableRows.length })

      try {
        // 1. Resolve or create CATEGORY
        let category_id = row.category_id
        if (!category_id) {
          const catName = row.category
          if (categoryCache[catName]) {
            category_id = categoryCache[catName]
          } else {
            const res = await addCategory(catName)
            if (!res?.id) { failCount++; continue }
            category_id = res.id
            categoryCache[catName] = category_id
            createdCount++
          }
        }

        // 2. Resolve or create COMMODITY
        // FIX: cache key includes category_id so same-named commodities in
        // different categories are treated as distinct entries
        const commodityCacheKey = `${row.commodity_name}::${category_id}`
        let commodity_id = row.commodity_id ?? commodityCache[commodityCacheKey]
        if (!commodity_id) {
          const res = await addCommodity({
            category_id,
            name: row.commodity_name,
            specification: row.specification || null,
          })
          if (!res?.id) { failCount++; continue }
          commodity_id = res.id
          commodityCache[commodityCacheKey] = commodity_id
          createdCount++
        }

        // 3. Resolve or create MARKET
        let market_id = row.market_id ?? marketCache[row.market_name]
        if (!market_id) {
          const res = await addMarket(row.market_name)
          if (!res?.id) { failCount++; continue }
          market_id = res.id
          marketCache[row.market_name] = market_id
          createdCount++
        }

        // 4. Insert PRICE RECORD
        const result = await addPriceRecord({
          commodity_id,
          market_id,
          price_date: row.price_date,
          respondent_1: row.respondent_1,
          respondent_2: row.respondent_2,
          respondent_3: row.respondent_3,
          respondent_4: row.respondent_4,
          respondent_5: row.respondent_5,
          prevailing_price: row.prevailing_price,
          high_price: row.high_price,
          low_price: row.low_price,
        })

        if (result?.success) successCount++
        else failCount++

      } catch (err) {
        console.error("Row error:", err)
        failCount++
      }
    }

    const skipped = rows.filter((r) => r._errors.length > 0).length

    setIsSubmitting(false)
    setSubmitProgress({ current: 0, total: 0 })

    Swal.fire({
      icon: failCount === 0 ? "success" : "warning",
      title: "Import Complete",
      html: `
        <p><strong>${successCount}</strong> price record(s) inserted.</p>
        ${createdCount > 0 ? `<p><strong>${createdCount}</strong> new entry/entries auto-created.</p>` : ""}
        ${failCount > 0 ? `<p><strong>${failCount}</strong> row(s) failed.</p>` : ""}
        ${skipped > 0 ? `<p><strong>${skipped}</strong> row(s) skipped due to validation errors.</p>` : ""}
      `,
    })

    fetchVegetables()
    fetchCommodities()
    fetchMarkets()
    fetchCategories()
    handleClose()
  }

  const handleClose = () => {
    setRows([])
    setFileName("")
    setMetaInfo({ marketName: null, priceDate: null })
    setStep("upload")
    setIsSubmitting(false)
    setSubmitProgress({ current: 0, total: 0 })
    if (fileInputRef.current) fileInputRef.current.value = ""
    OnClose()
  }

  const errorRows = rows.filter((r) => r._errors.length > 0)
  const validRows = rows.filter((r) => r._errors.length === 0)
  const processableRows = validRows  // same filter as inside handleSubmit
  const newEntryRows = validRows.filter((r) => r._willCreate.length > 0)

  const groupedRows = rows.reduce((acc, row) => {
    const cat = row.category || "Uncategorized"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(row)
    return acc
  }, {})

  if (!isOpen) return null

  return (
    <div className="modal modal-open">
      <div
        className="modal-box w-300 max-w-2xl"
        style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-green-800">Import from Excel</h3>
            <p className="text-sm text-gray-500">DA Bantay Presyo — Form A1 format</p>
          </div>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={handleClose}>✕</button>
        </div>

        {/* Step: Upload */}
        {step === "upload" && (
          <div className="flex flex-col gap-5">
            <div
              className={`border-2 border-dashed rounded-xl p-14 text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-green-500 bg-green-50"
                  : "border-gray-300 hover:border-green-400 hover:bg-green-50"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <div className="text-6xl mb-3">📊</div>
              <p className="text-lg font-semibold text-gray-700">Drop your Excel file here</p>
              <p className="text-sm text-gray-400 mt-1">or click to browse</p>
              <p className="text-xs text-gray-400 mt-3">.xlsx / .xls</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="bg-base-200 rounded-xl p-4 text-sm text-gray-600">
              <p className="font-semibold mb-2">📋 Expected Format</p>
              <p>Supports the standard <strong>DA Bantay Presyo Form A1</strong> Excel layout.</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-gray-500">
                <li>Market name and date auto-extracted from the header</li>
                <li>Respondent prices (cols D–H) extracted individually</li>
                <li>Prevailing price computed using the DA formula (mode → median → average)</li>
                <li>Missing categories, commodities, and markets are <strong>auto-created</strong></li>
              </ul>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && (
          <div className="flex flex-col gap-3 overflow-hidden flex-1" style={{ minHeight: 0 }}>

            {/* Summary bar */}
            <div className="flex flex-wrap items-center gap-2">
              {metaInfo.marketName && (
                <span className="badge badge-outline">🏪 {metaInfo.marketName}</span>
              )}
              {metaInfo.priceDate && (
                <span className="badge badge-outline">
                  📅 {new Date(metaInfo.priceDate).toDateString()}
                </span>
              )}
              <span className="badge badge-success">✓ {validRows.length} valid</span>
              {newEntryRows.length > 0 && (
                <span className="badge badge-warning">✦ {newEntryRows.length} will auto-create</span>
              )}
              {errorRows.length > 0 && (
                <span className="badge badge-error">✕ {errorRows.length} error{errorRows.length > 1 ? "s" : ""}</span>
              )}
              <span className="text-xs text-gray-400 ml-auto">{fileName}</span>
              <button
                className="btn btn-xs btn-ghost"
                onClick={() => { setStep("upload"); setRows([]); setFileName("") }}
              >
                Change file
              </button>
            </div>

            {/* Auto-create notice */}
            {(newEntryRows.length > 0) && (
              <div className="alert py-2 text-sm">
                <span>⚠️</span>
                <span>
                  {newEntryRows.length > 0 && (
                    <><strong>{newEntryRows.length}</strong> row(s) have missing categories, commodities, or markets — they will be <strong>auto-created</strong> during import.</>
                  )}
                </span>
              </div>
            )}

            {/* Table */}
            <div className="overflow-auto flex-1 rounded-xl border border-base-300" style={{ minHeight: 0 }}>
              <table className="table table-sm table-zebra w-full">
                <thead className="sticky top-0 bg-base-200 z-10">
                  <tr>
                    <th>#</th>
                    <th>Commodity</th>
                    <th>Spec</th>
                    <th className="text-center">R1</th>
                    <th className="text-center">R2</th>
                    <th className="text-center">R3</th>
                    <th className="text-center">R4</th>
                    <th className="text-center">R5</th>
                    <th className="text-center">Prevailing</th>
                    <th className="text-center">High</th>
                    <th className="text-center">Low</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupedRows).map(([category, catRows]) => (
                    <React.Fragment key={category}>
                      <tr className="bg-green-50">
                        <td colSpan={12} className="text-xs font-bold text-green-700 uppercase tracking-wide py-2 px-3">
                          {category}
                        </td>
                      </tr>
                      {catRows.map((row) => (
                        <tr key={row._index} className={row._errors.length > 0 ? "bg-red-50" : ""}>
                          <td className="text-gray-400 text-xs">{row._index}</td>
                          <td className="font-medium">
                            {row.commodity_name}
                            {!row.commodity_id && row._errors.length === 0 && (
                              <span className="badge badge-warning badge-xs ml-1">new</span>
                            )}
                          </td>
                          <td className="text-gray-500 text-xs">{row.specification || "—"}</td>
                          {[row.respondent_1, row.respondent_2, row.respondent_3, row.respondent_4, row.respondent_5].map((r, i) => (
                            <td key={i} className="text-center text-xs text-gray-500">
                              {r ?? <span className="text-gray-300">—</span>}
                            </td>
                          ))}
                          <td className="text-center font-semibold">{row.prevailing_price ?? "—"}</td>
                          <td className="text-center text-xs">{row.high_price ?? "—"}</td>
                          <td className="text-center text-xs">{row.low_price ?? "—"}</td>
                          <td>
                            {row._errors.length > 0 ? (
                              <div className="tooltip tooltip-left" data-tip={row._errors.join(" | ")}>
                                <span className="badge badge-error badge-sm cursor-help">✕ error</span>
                              </div>
                            ) : row._willCreate.length > 0 ? (
                              <div className="tooltip tooltip-left" data-tip={`Will create: ${row._willCreate.join(", ")}`}>
                                <span className="badge badge-warning badge-sm cursor-help">✦ auto-create</span>
                              </div>
                            ) : (
                              <span className="badge badge-success badge-sm">✓</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Progress bar */}
            {isSubmitting && submitProgress.total > 0 && (
              <div className="w-full">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Importing...</span>
                  <span>{submitProgress.current} / {submitProgress.total}</span>
                </div>
                <progress
                  className="progress progress-success w-full"
                  value={submitProgress.current}
                  max={submitProgress.total}
                />
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="modal-action mt-4">
          <button className="btn btn-ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </button>
          {step === "preview" && (
            <button
              className="btn btn-success"
              onClick={handleSubmit}
              disabled={isSubmitting || processableRows.length === 0}
            >
              {isSubmitting ? (
                <><span className="loading loading-spinner loading-sm" /> Importing...</>
              ) : (
                `Import ${processableRows.length} Record${processableRows.length !== 1 ? "s" : ""}`
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ImportExcelModal