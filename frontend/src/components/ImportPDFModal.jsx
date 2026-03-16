import React, { useRef, useState, useEffect } from "react"
import Swal from "sweetalert2"
import { useVegetableStore } from "../store/VegetableStore"



// ─── Component ────────────────────────────────────────────────────────────────
const ImportPDFModal = ({ isOpen, OnClose }) => {
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
    extractPDF,
  } = useVegetableStore()

  const fileInputRef = useRef(null)
  const [rows, setRows] = useState([])
  const [fileName, setFileName] = useState("")
  const [metaInfo, setMetaInfo] = useState({ markets: [], priceDate: null })
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitProgress, setSubmitProgress] = useState({ current: 0, total: 0 })
  const [step, setStep] = useState("upload")

  useEffect(() => {
    if (isOpen) {
      fetchCommodities()
      fetchMarkets()
      fetchCategories()
    }
  }, [isOpen])

  // ── Lookup helpers ────────────────────────────────────────────────────────
  const findCategory = (name) =>
    categories.find((c) => c.name?.trim().toLowerCase() === name?.trim().toLowerCase()) ?? null

  const findCommodity = (name, categoryId) => {
    if (!name) return null
    const norm = name.trim().toLowerCase()
    if (categoryId) {
      const exact = commodities.find(
        (c) => c.name?.trim().toLowerCase() === norm && c.category_id === categoryId
      )
      if (exact) return exact
    }
    return commodities.find((c) => c.name?.trim().toLowerCase() === norm) ?? null
  }

  const findMarket = (name) =>
    markets.find((m) => m.name?.trim().toLowerCase() === name?.trim().toLowerCase()) ?? null

  // ── Annotate rows ─────────────────────────────────────────────────────────
  const annotateRows = (parsed) => {
    // Detect duplicates within the same file: commodity+market+date
    const seenKeys = new Set()

    return parsed.map((row, index) => {
      const category = findCategory(row.category)
      const categoryId = category?.id ?? null
      const commodity = findCommodity(row.commodity_name, categoryId)
      const market = findMarket(row.market_name)

      const willCreate = []
      if (!category) willCreate.push(`category "${row.category}"`)
      if (!commodity) willCreate.push(`commodity "${row.commodity_name}"`)
      if (!market) willCreate.push(`market "${row.market_name}"`)

      // Only flag truly blocking errors — blank prices are allowed
      const errors = []
      if (!row.price_date) errors.push("Missing price date")
      if (!row.commodity_name?.trim()) errors.push("Blank commodity name")

      // Within-file duplicate check
      const dedupKey = `${row.commodity_name?.trim().toLowerCase()}::${row.market_name?.trim().toLowerCase()}::${row.price_date}`
      if (dedupKey && errors.length === 0) {
        if (seenKeys.has(dedupKey)) {
          errors.push("Duplicate row in this file")
        } else {
          seenKeys.add(dedupKey)
        }
      }

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
  }

  // ── Parse file ────────────────────────────────────────────────────────────
  const parseFile = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      Swal.fire({ icon: "warning", title: "Invalid File", text: "Please upload a PDF file." })
      return
    }

    setIsParsing(true)
    try {
      const extracted = await extractPDF(file)

      if (!extracted.rows || extracted.rows.length === 0) {
        Swal.fire({ icon: "warning", title: "No Data Found", text: "Could not extract any price rows from this PDF." })
        return
      }

      // Attach price_date to every row (it's on the top-level object)
      const rowsWithDate = extracted.rows.map((r) => ({
        ...r,
        price_date: extracted.price_date,
      }))

      setRows(annotateRows(rowsWithDate))
      setMetaInfo({ markets: extracted.markets ?? [], priceDate: extracted.price_date })
      setFileName(file.name)
      setStep("preview")
    } catch (err) {
      console.error(err)
      Swal.fire({
        icon: "error",
        title: "Extraction Failed",
        text: err.message ?? "Failed to extract data from the PDF.",
      })
    } finally {
      setIsParsing(false)
    }
  }

  const handleFileChange = (e) => parseFile(e.target.files[0])
  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    parseFile(e.dataTransfer.files[0])
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const processableRows = rows.filter((r) => r._errors.length === 0)
    if (processableRows.length === 0) {
      Swal.fire({ icon: "warning", title: "No Valid Rows", text: "All rows have errors." })
      return
    }

    setIsSubmitting(true)
    setSubmitProgress({ current: 0, total: processableRows.length })

    const categoryCache = {}
    const commodityCache = {}
    const marketCache = {}
    // Runtime dedup: track commodity_id+market_id+price_date combos already inserted this session
    const insertedKeys = new Set()

    let successCount = 0
    let failCount = 0
    let duplicateCount = 0
    let createdCount = 0

    for (let i = 0; i < processableRows.length; i++) {
      const row = processableRows[i]
      setSubmitProgress({ current: i + 1, total: processableRows.length })

      try {
        // 1. Category
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

        // 2. Commodity — keyed by name + category_id to avoid same-name collisions
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

        // 3. Market
        let market_id = row.market_id ?? marketCache[row.market_name]
        if (!market_id) {
          const res = await addMarket(row.market_name)
          if (!res?.id) { failCount++; continue }
          market_id = res.id
          marketCache[row.market_name] = market_id
          createdCount++
        }

        // 4. Price record — prevailing/high/low may all be null, that's fine
        // Skip if this commodity+market+date was already inserted this session
        const insertKey = `${commodity_id}::${market_id}::${row.price_date}`
        if (insertedKeys.has(insertKey)) {
          duplicateCount++
          continue
        }

        const result = await addPriceRecord({
          commodity_id,
          market_id,
          price_date: row.price_date,
          respondent_1: null,
          respondent_2: null,
          respondent_3: null,
          respondent_4: null,
          respondent_5: null,
          prevailing_price: row.prevailing_price ?? null,
          high_price: row.high_price ?? null,
          low_price: row.low_price ?? null,
        })

        if (result?.success) { successCount++; insertedKeys.add(insertKey) }
        else if (result?.duplicate) duplicateCount++
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
        ${duplicateCount > 0 ? `<p><strong>${duplicateCount}</strong> duplicate(s) skipped.</p>` : ""}
        ${failCount > 0 ? `<p><strong>${failCount}</strong> row(s) failed.</p>` : ""}
        ${skipped > 0 ? `<p><strong>${skipped}</strong> row(s) skipped due to errors.</p>` : ""}
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
    setMetaInfo({ markets: [], priceDate: null })
    setStep("upload")
    setIsParsing(false)
    setIsSubmitting(false)
    setSubmitProgress({ current: 0, total: 0 })
    if (fileInputRef.current) fileInputRef.current.value = ""
    OnClose()
  }

  const validRows = rows.filter((r) => r._errors.length === 0)
  const errorRows = rows.filter((r) => r._errors.length > 0)
  const newEntryRows = validRows.filter((r) => r._willCreate.length > 0)
  // Rows that are valid but have no price data at all
  const noPriceRows = validRows.filter(
    (r) => r.prevailing_price == null && r.high_price == null && r.low_price == null
  )

  const groupedByCategory = rows.reduce((acc, row) => {
    const cat = row.category || "Uncategorized"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(row)
    return acc
  }, {})

  if (!isOpen) return null

  return (
    <div className="modal modal-open">
      <div
        className="modal-box w-11/12 max-w-5xl"
        style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-green-800">Import from PDF</h3>
            <p className="text-sm text-gray-500">DA Bantay Presyo — Retail Price Report format</p>
          </div>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={handleClose} disabled={isParsing}>✕</button>
        </div>

        {/* ── Step: Upload ── */}
        {step === "upload" && (
          <div className="flex flex-col gap-5">
            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-14 text-center transition-colors ${
                isParsing
                  ? "border-green-400 bg-green-50 cursor-wait"
                  : isDragging
                  ? "border-green-500 bg-green-50 cursor-copy"
                  : "border-gray-300 hover:border-green-400 hover:bg-green-50 cursor-pointer"
              }`}
              onClick={() => !isParsing && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); if (!isParsing) setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={!isParsing ? handleDrop : undefined}
            >
              {isParsing ? (
                <>
                  <div className="flex justify-center mb-3">
                    <span className="loading loading-spinner loading-lg text-green-600" />
                  </div>
                  <p className="text-lg font-semibold text-green-700">Reading PDF with AI...</p>
                  <p className="text-sm text-gray-400 mt-1">Extracting price data, please wait</p>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-3">📄</div>
                  <p className="text-lg font-semibold text-gray-700">Drop your PDF file here</p>
                  <p className="text-sm text-gray-400 mt-1">or click to browse</p>
                  <p className="text-xs text-gray-400 mt-3">.pdf only</p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="bg-base-200 rounded-xl p-4 text-sm text-gray-600">
              <p className="font-semibold mb-2">📋 Expected Format</p>
              <p>Supports the <strong>DA Bantay Presyo Retail Price</strong> two-market PDF layout.</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-gray-500">
                <li>Date and market names auto-extracted from the report header</li>
                <li>Two markets per report — both imported simultaneously</li>
                <li>Prevailing, High, and Low prices read directly</li>
                <li>Rows with blank prices are imported — commodity is still recorded</li>
                <li>Missing categories, commodities, and markets are <strong>auto-created</strong></li>
              </ul>
            </div>
          </div>
        )}

        {/* ── Step: Preview ── */}
        {step === "preview" && (
          <div className="flex flex-col gap-3 overflow-hidden flex-1" style={{ minHeight: 0 }}>

            {/* Summary bar */}
            <div className="flex flex-wrap items-center gap-2">
              {metaInfo.markets.map((m, i) => (
                <span key={i} className="badge badge-outline">🏪 {m}</span>
              ))}
              {metaInfo.priceDate && (
                <span className="badge badge-outline">
                  📅 {new Date(metaInfo.priceDate + "T00:00:00").toDateString()}
                </span>
              )}
              <span className="badge badge-success">✓ {validRows.length} valid</span>
              {newEntryRows.length > 0 && (
                <span className="badge badge-warning">✦ {newEntryRows.length} will auto-create</span>
              )}
              {noPriceRows.length > 0 && (
                <span className="badge badge-info">— {noPriceRows.length} no price</span>
              )}
              {(() => {
                const dupRows = rows.filter(r => r._errors.some(e => e.includes("Duplicate")))
                return dupRows.length > 0
                  ? <span className="badge badge-ghost">⊘ {dupRows.length} duplicate{dupRows.length !== 1 ? "s" : ""}</span>
                  : null
              })()}
              {(() => {
                const hardErrors = rows.filter(r => r._errors.length > 0 && !r._errors.every(e => e.includes("Duplicate")))
                return hardErrors.length > 0
                  ? <span className="badge badge-error">✕ {hardErrors.length} error{hardErrors.length !== 1 ? "s" : ""}</span>
                  : null
              })()}
              <span className="text-xs text-gray-400 ml-auto">{fileName}</span>
              <button
                className="btn btn-xs btn-ghost"
                onClick={() => { setStep("upload"); setRows([]); setFileName("") }}
              >
                Change file
              </button>
            </div>

            {/* Auto-create notice */}
            {newEntryRows.length > 0 && (
              <div className="alert alert-warning py-2 text-sm">
                <span>⚠️</span>
                <span>
                  <strong>{newEntryRows.length}</strong> row(s) have missing categories, commodities, or markets —
                  they will be <strong>auto-created</strong> during import.
                </span>
              </div>
            )}

            {/* Preview table */}
            <div className="overflow-auto flex-1 rounded-xl border border-base-300" style={{ minHeight: 0 }}>
              <table className="table table-sm table-zebra w-full">
                <thead className="sticky top-0 bg-base-200 z-10">
                  <tr>
                    <th>#</th>
                    <th>Commodity</th>
                    <th>Spec</th>
                    <th>Market</th>
                    <th className="text-center">Prevailing</th>
                    <th className="text-center">High</th>
                    <th className="text-center">Low</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupedByCategory).map(([category, catRows]) => (
                    <React.Fragment key={category}>
                      <tr className="bg-green-50">
                        <td colSpan={8} className="text-xs font-bold text-green-700 uppercase tracking-wide py-2 px-3">
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
                          <td className="text-xs text-gray-600 whitespace-nowrap">{row.market_name}</td>
                          <td className="text-center font-semibold text-green-700 text-xs">
                            {row.prevailing_price != null ? `₱${row.prevailing_price}` : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="text-center text-xs">
                            {row.high_price != null ? `₱${row.high_price}` : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="text-center text-xs">
                            {row.low_price != null ? `₱${row.low_price}` : <span className="text-gray-300">—</span>}
                          </td>
                          <td>
                            {row._errors.length > 0 ? (
                              <div className="tooltip tooltip-left" data-tip={row._errors.join(" | ")}>
                                <span className={`badge badge-sm cursor-help ${
                                  row._errors.some(e => e.includes("Duplicate"))
                                    ? "badge-ghost"
                                    : "badge-error"
                                }`}>
                                  {row._errors.some(e => e.includes("Duplicate")) ? "⊘ dup" : "✕ error"}
                                </span>
                              </div>
                            ) : row._willCreate.length > 0 ? (
                              <div className="tooltip tooltip-left" data-tip={`Will create: ${row._willCreate.join(", ")}`}>
                                <span className="badge badge-warning badge-sm cursor-help">✦ auto-create</span>
                              </div>
                            ) : row.prevailing_price == null && row.high_price == null && row.low_price == null ? (
                              <span className="badge badge-info badge-sm">— no price</span>
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
          <button className="btn btn-ghost" onClick={handleClose} disabled={isParsing || isSubmitting}>
            Cancel
          </button>
          {step === "preview" && (
            <button
              className="btn btn-success"
              onClick={handleSubmit}
              disabled={isSubmitting || validRows.length === 0}
            >
              {isSubmitting ? (
                <><span className="loading loading-spinner loading-sm" /> Importing...</>
              ) : (
                `Import ${validRows.length} Record${validRows.length !== 1 ? "s" : ""}`
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ImportPDFModal