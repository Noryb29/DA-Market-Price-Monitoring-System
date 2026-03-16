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

    // vegetableController.js — getVegetables query
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
          pr.low_price,
          pr.respondent_1,   -- ✅ add these
          pr.respondent_2,
          pr.respondent_3,
          pr.respondent_4,
          pr.respondent_5
        FROM commodities c
        JOIN categories cat ON c.category_id = cat.id
        LEFT JOIN price_records pr ON pr.commodity_id = c.id
        LEFT JOIN markets m ON pr.market_id = m.id
        ORDER BY c.name;
      `

    const [rows] = await db.query(query)

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false
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

// ─── REPLACE your existing addPriceRecord in the controller ──────────────────

export const addPriceRecord = async (req, res) => {
  try {
    const {
      commodity_id,
      market_id,
      price_date,
      respondent_1,
      respondent_2,
      respondent_3,
      respondent_4,
      respondent_5,
      prevailing_price,
      high_price,
      low_price
    } = req.body
 
    if (!commodity_id || !market_id || !price_date || !prevailing_price) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing"
      })
    }
 
    // Only one price record allowed per commodity + market + date
    const [existing] = await db.query(
      "SELECT id FROM price_records WHERE commodity_id = ? AND market_id = ? AND price_date = ?",
      [commodity_id, market_id, price_date]
    )
 
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "A price record for this commodity and market on " + price_date + " already exists"
      })
    }
 
    const query = `
      INSERT INTO price_records
        (commodity_id, market_id, price_date,
         respondent_1, respondent_2, respondent_3, respondent_4, respondent_5,
         prevailing_price, high_price, low_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
 
    const [result] = await db.query(query, [
      commodity_id,
      market_id,
      price_date,
      respondent_1 ?? null,
      respondent_2 ?? null,
      respondent_3 ?? null,
      respondent_4 ?? null,
      respondent_5 ?? null,
      prevailing_price,
      high_price ?? null,
      low_price ?? null
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

export const addCategory = async (req, res) => {
  try {
    const { name } = req.body
 
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required"
      })
    }
 
    // Check if already exists (case-insensitive)
    const [existing] = await db.query(
      "SELECT id FROM categories WHERE LOWER(name) = LOWER(?)",
      [name.trim()]
    )
 
    if (existing.length > 0) {
      return res.status(200).json({
        success: true,
        message: "Category already exists",
        id: existing[0].id
      })
    }
 
    const [result] = await db.query(
      "INSERT INTO categories (name) VALUES (?)",
      [name.trim()]
    )
 
    return res.status(201).json({
      success: true,
      message: "Category added successfully",
      id: result.insertId
    })
 
  } catch (error) {
    console.error("Add Category Error:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to add category"
    })
  }
}
 
// ADD MARKET
export const addMarket = async (req, res) => {
  try {
    const { name, city } = req.body
 
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Market name is required"
      })
    }
 
    // Check if already exists (case-insensitive)
    const [existing] = await db.query(
      "SELECT id FROM markets WHERE LOWER(name) = LOWER(?)",
      [name.trim()]
    )
 
    if (existing.length > 0) {
      return res.status(200).json({
        success: true,
        message: "Market already exists",
        id: existing[0].id
      })
    }
 
    const [result] = await db.query(
      "INSERT INTO markets (name, city) VALUES (?, ?)",
      [name.trim(), city?.trim() || ""]
    )
 
    return res.status(201).json({
      success: true,
      message: "Market added successfully",
      id: result.insertId
    })
 
  } catch (error) {
    console.error("Add Market Error:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to add market"
    })
  }
}

// ─── ADD THESE TO YOUR EXISTING CONTROLLER ───────────────────────────────────

// UPDATE COMMODITY
export const updateCommodity = async (req, res) => {
  try {
    const { id } = req.params
    const { category_id, name, specification } = req.body

    if (!category_id || !name) {
      return res.status(400).json({
        success: false,
        message: "Category and name are required"
      })
    }

    const [result] = await db.query(
      `UPDATE commodities SET category_id = ?, name = ?, specification = ? WHERE id = ?`,
      [category_id, name.trim(), specification?.trim() || null, id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Commodity not found" })
    }

    return res.status(200).json({ success: true, message: "Commodity updated successfully" })

  } catch (error) {
    console.error("Update Commodity Error:", error)
    return res.status(500).json({ success: false, message: "Failed to update commodity" })
  }
}

// DELETE COMMODITY
export const deleteCommodity = async (req, res) => {
  try {
    const { id } = req.params

    // Delete price records first (foreign key constraint)
    await db.query("DELETE FROM price_records WHERE commodity_id = ?", [id])

    const [result] = await db.query("DELETE FROM commodities WHERE id = ?", [id])

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Commodity not found" })
    }

    return res.status(200).json({ success: true, message: "Commodity deleted successfully" })

  } catch (error) {
    console.error("Delete Commodity Error:", error)
    return res.status(500).json({ success: false, message: "Failed to delete commodity" })
  }
}