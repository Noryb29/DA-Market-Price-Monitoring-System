import { db } from "../db.js"

// GET ALL VEGETABLES WITH PRICES
export const getVegetables = async (req, res) => {
  try {

    if (!db) {
      return res.status(500).json({
        success: false,
        message: "Database connection not initialized"
      })
    }

    const query = `
     SELECT 
    c.id AS commodity_id,
    c.name,
    c.specification,
    cat.name AS category,
    pr.price_date,
    m.name AS market_name,
    pr.prevailing_price,
    pr.high_price,
    pr.low_price
FROM commodities c
JOIN categories cat ON c.category_id = cat.id
LEFT JOIN price_records pr ON pr.commodity_id = c.id
LEFT JOIN markets m ON pr.market_id = m.id
ORDER BY c.name;
    `

    const [rows] = await db.query(query)

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No vegetables found"
      })
    }

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    })

  } catch (error) {
    console.error("Vegetable Controller Error:", error)

    // MySQL specific error handling
    if (error.code === "ER_BAD_FIELD_ERROR") {
      return res.status(400).json({
        success: false,
        message: "Invalid database column"
      })
    }

    if (error.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({
        success: false,
        message: "Database table missing"
      })
    }

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development"
        ? error.message
        : undefined
    })
  }
}

// GET ALL MARKETS
export const getMarkets = async (req, res) => {
  try {

    const [rows] = await db.query("SELECT * FROM markets ORDER BY name")

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    })

  } catch (error) {
    console.error("Get Markets Error:", error)

    return res.status(500).json({
      success: false,
      message: "Failed to fetch markets"
    })
  }
}

// GET ALL CATEGORIES
export const getCategories = async (req, res) => {
  try {

    const [rows] = await db.query("SELECT * FROM categories ORDER BY name")

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    })

  } catch (error) {
    console.error("Get Categories Error:", error)

    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories"
    })
  }
}

// GET ALL COMMODITIES
export const getCommodities = async (req, res) => {
  try {

    const query = `
      SELECT 
        c.id,
        c.name,
        c.specification,
        cat.name AS category
      FROM commodities c
      JOIN categories cat ON c.category_id = cat.id
      ORDER BY c.name
    `

    const [rows] = await db.query(query)

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    })

  } catch (error) {
    console.error("Get Commodities Error:", error)

    return res.status(500).json({
      success: false,
      message: "Failed to fetch commodities"
    })
  }
}

// GET PRICE HISTORY OF A COMMODITY
export const getCommodityPrices = async (req, res) => {
  try {

    const { id } = req.params

    const query = `
      SELECT 
        c.name,
        m.name AS market,
        pr.price_date,
        pr.prevailing_price,
        pr.high_price,
        pr.low_price
      FROM price_records pr
      JOIN commodities c ON pr.commodity_id = c.id
      JOIN markets m ON pr.market_id = m.id
      WHERE c.id = ?
      ORDER BY pr.price_date DESC
    `

    const [rows] = await db.query(query, [id])

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    })

  } catch (error) {
    console.error("Commodity Price Error:", error)

    return res.status(500).json({
      success: false,
      message: "Failed to fetch commodity prices"
    })
  }
}

// ADD PRICE RECORD
export const addPriceRecord = async (req, res) => {
  try {
    const {
      commodity_id,
      market_id,
      price_date,
      prevailing_price,
      high_price,
      low_price
    } = req.body

    // Basic validation
    if (!commodity_id || !market_id || !price_date || !prevailing_price) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing"
      })
    }

    const query = `
      INSERT INTO price_records
        (commodity_id, market_id, price_date, prevailing_price, high_price, low_price)
      VALUES (?, ?, ?, ?, ?, ?)
    `

    const [result] = await db.query(query, [
      commodity_id,
      market_id,
      price_date,
      prevailing_price,
      high_price || null,
      low_price || null
    ])

    return res.status(201).json({
      success: true,
      message: "Price record added",
      id: result.insertId
    })

  } catch (error) {
    console.error("Add Price Error:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to add price record"
    })
  }
}

// GET LATEST PRICES
export const getLatestPrices = async (req, res) => {
  try {

    const query = `
      SELECT 
        c.name,
        m.name AS market,
        pr.prevailing_price,
        pr.high_price,
        pr.low_price,
        pr.price_date
      FROM price_records pr
      JOIN commodities c ON pr.commodity_id = c.id
      JOIN markets m ON pr.market_id = m.id
      WHERE pr.price_date = (
        SELECT MAX(price_date)
        FROM price_records
      )
      ORDER BY c.name
    `

    const [rows] = await db.query(query)

    return res.status(200).json({
      success: true,
      data: rows
    })

  } catch (error) {
    console.error("Latest Price Error:", error)

    return res.status(500).json({
      success: false,
      message: "Failed to fetch latest prices"
    })
  }
}

export const addCommodity = async (req, res) => {
  try {

    const { category_id, name, specification } = req.body

    if (!category_id || !name) {
      return res.status(400).json({
        success: false,
        message: "Category and name are required"
      })
    }

    const query = `
      INSERT INTO commodities
      (category_id, name, specification)
      VALUES (?, ?, ?)
    `

    const [result] = await db.query(query, [
      category_id,
      name,
      specification || null
    ])

    return res.status(201).json({
      success: true,
      message: "Commodity added successfully",
      id: result.insertId
    })

  } catch (error) {

    console.error("Add Commodity Error:", error)

    return res.status(500).json({
      success: false,
      message: "Failed to add commodity"
    })
  }
}

export const importFormRecords = async (req, res) => {
  const { meta = {}, form, data } = req.body
 
  // ── Basic validation ────────────────────────────────────────────────────
  if (!Array.isArray(data) || data.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No records provided in request body."
    })
  }
 
  if (!["A1", "B1"].includes(form)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid form type. Expected "A1" or "B1".'
    })
  }
 
  // Pull shared metadata that applies to every row
  const market        = meta.market        || null
  const monitoringDate = meta.date
    ? parseDateString(meta.date)   // normalise "May 19, 2025" → "2025-05-19"
    : null
  const monitoredBy   = meta.monitoredBy   || null
  const officeRegion  = meta.office        || null
 
  const conn = await db.getConnection()
 
  try {
    await conn.beginTransaction()
 
    // ── Build rows ──────────────────────────────────────────────────────
    const rows = data.map((r) => buildRow(r, form, market, monitoringDate, monitoredBy, officeRegion))
 
    // ── Bulk INSERT ─────────────────────────────────────────────────────
    // Using INSERT IGNORE so re-importing the same file won't duplicate
    // rows if you add a unique index on
    // (commodity, market, monitoring_date) later.
    // Change to a plain INSERT if you prefer strict duplicate rejection.
    const insertQuery = `
      INSERT INTO price_monitoring (
        commodity,
        commodity_category,
        specification,
        unit,
        respondent_1,
        respondent_2,
        respondent_3,
        respondent_4,
        respondent_5,
        high_range,
        low_range,
        no_mode,
        prevailing_price,
        supply_level,
        remarks,
        market,
        monitoring_date,
        monitored_by,
        office_region
      ) VALUES ?
    `
 
    const values = rows.map((r) => [
      r.commodity,
      r.commodity_category,
      r.specification,
      r.unit,
      r.respondent_1,
      r.respondent_2,
      r.respondent_3,
      r.respondent_4,
      r.respondent_5,
      r.high_range,
      r.low_range,
      r.no_mode,
      r.prevailing_price,
      r.supply_level,
      r.remarks,
      r.market,
      r.monitoring_date,
      r.monitored_by,
      r.office_region
    ])
 
    const [result] = await conn.query(insertQuery, [values])
 
    await conn.commit()
 
    return res.status(201).json({
      success: true,
      message: `Successfully imported ${result.affectedRows} record(s) from Form ${form}.`,
      affectedRows: result.affectedRows
    })
 
  } catch (error) {
    await conn.rollback()
    console.error("Import Controller Error:", error)
 
    return res.status(500).json({
      success: false,
      message: "Import failed. All changes have been rolled back.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    })
 
  } finally {
    conn.release()
  }
}
 
// ── Helpers ───────────────────────────────────────────────────────────────
 
/**
 * Maps a single parsed record to a flat DB row.
 * Form B1 records don't have respondent columns — those stay NULL.
 */
function buildRow(r, form, market, monitoringDate, monitoredBy, officeRegion) {
  const isA1 = form === "A1"
 
  return {
    commodity:          r.commodity          ?? null,
    commodity_category: r.commodity_category ?? null,
    specification:      r.specification      || null,
    unit:               r.unit               || null,
 
    // A1 only
    respondent_1: isA1 ? (r.respondent_1 ?? null) : null,
    respondent_2: isA1 ? (r.respondent_2 ?? null) : null,
    respondent_3: isA1 ? (r.respondent_3 ?? null) : null,
    respondent_4: isA1 ? (r.respondent_4 ?? null) : null,
    respondent_5: isA1 ? (r.respondent_5 ?? null) : null,
    no_mode:      isA1 ? (r.no_mode       ?? null) : null,
 
    high_range:      r.high_range      ?? (isA1 ? null : r.high_range)  ?? null,
    low_range:       r.low_range       ?? null,
    prevailing_price: isA1
      ? (r.prevailing_price    ?? null)
      : (r.prevailing_today    ?? null),
 
    supply_level: ["A", "S", "D"].includes(r.supply_level) ? r.supply_level : "NONE",
    remarks:      r.remarks || null,
 
    // From meta — same for every row in this import batch
    market,
    monitoring_date: monitoringDate,
    monitored_by:    monitoredBy,
    office_region:   officeRegion
  }
}
 
/**
 * Converts common date string formats from the Excel sheet into
 * a MySQL-compatible "YYYY-MM-DD" string.
 *
 * Handles:
 *   "May 19, 2025"     → "2025-05-19"
 *   "05/19/2025"       → "2025-05-19"
 *   "2025-05-19"       → "2025-05-19"  (pass-through)
 */
function parseDateString(raw) {
  if (!raw) return null
 
  const trimmed = String(raw).trim()
 
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
 
  const d = new Date(trimmed)
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0]
  }
 
  return null
}