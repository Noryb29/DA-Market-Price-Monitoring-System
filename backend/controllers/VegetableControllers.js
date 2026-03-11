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
        price_date,
        m.name AS market_name,
        pr.prevailing_price,
        pr.high_price,
        pr.low_price
      FROM commodities c
      JOIN categories cat ON c.category_id = cat.id
      JOIN price_records pr ON pr.commodity_id = c.id
      JOIN markets m ON pr.market_id = m.id
      WHERE cat.name IN ('Lowland Vegetables', 'Highland Vegetables','Imported Commercial Rice','Local Commercial Rice','Fish','Livestock & Poultry','Spices','Fruits','Basic Commodities','Corn','Rootcrops')
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