import { db } from "../db.js"

// ─── Price Trend Over Time (per commodity, all markets or filtered) ───────────
export const getPriceTrend = async (req, res) => {
  try {
    const { commodity_id, market_id, limit = 30 } = req.query

    if (!commodity_id) {
      return res.status(400).json({ success: false, message: "commodity_id is required" })
    }

    let query = `
      SELECT
        pr.price_date,
        m.name AS market_name,
        pr.prevailing_price,
        pr.high_price,
        pr.low_price
      FROM price_records pr
      JOIN markets m ON pr.market_id = m.id
      WHERE pr.commodity_id = ?
    `
    const params = [commodity_id]

    if (market_id) {
      query += ` AND pr.market_id = ?`
      params.push(market_id)
    }

    query += ` ORDER BY pr.price_date DESC LIMIT ?`
    params.push(Number(limit))

    const [rows] = await db.query(query, params)

    // Reverse so chart shows oldest → newest
    return res.status(200).json({ success: true, data: rows.reverse() })
  } catch (error) {
    console.error("Price Trend Error:", error)
    return res.status(500).json({ success: false, message: "Failed to fetch price trend" })
  }
}

// ─── Average Price Per Market (for a given commodity) ────────────────────────
export const getAveragePriceByMarket = async (req, res) => {
  try {
    const { commodity_id } = req.query

    if (!commodity_id) {
      return res.status(400).json({ success: false, message: "commodity_id is required" })
    }

    const query = `
      SELECT
        m.name AS market_name,
        ROUND(AVG(pr.prevailing_price), 2) AS avg_prevailing,
        ROUND(AVG(pr.high_price), 2)       AS avg_high,
        ROUND(AVG(pr.low_price), 2)        AS avg_low,
        COUNT(pr.id)                        AS record_count
      FROM price_records pr
      JOIN markets m ON pr.market_id = m.id
      WHERE pr.commodity_id = ?
        AND pr.prevailing_price IS NOT NULL
      GROUP BY m.id, m.name
      ORDER BY avg_prevailing DESC
    `

    const [rows] = await db.query(query, [commodity_id])
    return res.status(200).json({ success: true, data: rows })
  } catch (error) {
    console.error("Avg Price By Market Error:", error)
    return res.status(500).json({ success: false, message: "Failed to fetch average prices by market" })
  }
}

// ─── Price Comparison Across Commodities (latest date, one market) ───────────
export const getPriceComparison = async (req, res) => {
  try {
    const { market_id, category_id } = req.query

    let query = `
      SELECT
        c.id AS commodity_id,
        c.name AS commodity_name,
        cat.name AS category,
        m.name AS market_name,
        pr.prevailing_price,
        pr.high_price,
        pr.low_price,
        pr.price_date
      FROM price_records pr
      JOIN commodities c   ON pr.commodity_id = c.id
      JOIN categories cat  ON c.category_id   = cat.id
      JOIN markets m       ON pr.market_id     = m.id
      WHERE pr.price_date = (
        SELECT MAX(pr2.price_date)
        FROM price_records pr2
        WHERE pr2.commodity_id = pr.commodity_id
          AND pr2.market_id    = pr.market_id
      )
    `
    const params = []

    if (market_id) {
      query += ` AND pr.market_id = ?`
      params.push(market_id)
    }

    if (category_id) {
      query += ` AND c.category_id = ?`
      params.push(category_id)
    }

    query += ` ORDER BY cat.name, c.name`

    const [rows] = await db.query(query, params)
    return res.status(200).json({ success: true, data: rows })
  } catch (error) {
    console.error("Price Comparison Error:", error)
    return res.status(500).json({ success: false, message: "Failed to fetch price comparison" })
  }
}

// ─── Price Volatility (std dev of prevailing price per commodity) ─────────────
export const getPriceVolatility = async (req, res) => {
  try {
    const { market_id, category_id, limit = 10 } = req.query

    let query = `
      SELECT
        c.id AS commodity_id,
        c.name AS commodity_name,
        cat.name AS category,
        ROUND(STDDEV(pr.prevailing_price), 2)  AS price_stddev,
        ROUND(AVG(pr.prevailing_price), 2)     AS avg_price,
        ROUND(MAX(pr.prevailing_price), 2)     AS max_price,
        ROUND(MIN(pr.prevailing_price), 2)     AS min_price,
        COUNT(pr.id)                            AS data_points
      FROM price_records pr
      JOIN commodities c  ON pr.commodity_id = c.id
      JOIN categories cat ON c.category_id   = cat.id
      WHERE pr.prevailing_price IS NOT NULL
    `
    const params = []

    if (market_id) {
      query += ` AND pr.market_id = ?`
      params.push(market_id)
    }

    if (category_id) {
      query += ` AND c.category_id = ?`
      params.push(category_id)
    }

    query += `
      GROUP BY c.id, c.name, cat.name
      HAVING data_points > 1
      ORDER BY price_stddev DESC
      LIMIT ?
    `
    params.push(Number(limit))

    const [rows] = await db.query(query, params)
    return res.status(200).json({ success: true, data: rows })
  } catch (error) {
    console.error("Price Volatility Error:", error)
    return res.status(500).json({ success: false, message: "Failed to fetch price volatility" })
  }
}

// ─── Market Coverage (how many commodities each market tracks) ────────────────
export const getMarketCoverage = async (req, res) => {
  try {
    const query = `
      SELECT
        m.id AS market_id,
        m.name AS market_name,
        COUNT(DISTINCT pr.commodity_id)  AS commodity_count,
        COUNT(pr.id)                     AS total_records,
        MAX(pr.price_date)               AS latest_date,
        MIN(pr.price_date)               AS earliest_date
      FROM markets m
      LEFT JOIN price_records pr ON pr.market_id = m.id
      GROUP BY m.id, m.name
      ORDER BY commodity_count DESC
    `
    const [rows] = await db.query(query)
    return res.status(200).json({ success: true, data: rows })
  } catch (error) {
    console.error("Market Coverage Error:", error)
    return res.status(500).json({ success: false, message: "Failed to fetch market coverage" })
  }
}

// ─── Summary / Dashboard Stats ───────────────────────────────────────────────
export const getDashboardStats = async (req, res) => {
  try {
    const [[totals]] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM commodities)    AS total_commodities,
        (SELECT COUNT(*) FROM markets)        AS total_markets,
        (SELECT COUNT(*) FROM categories)     AS total_categories,
        (SELECT COUNT(*) FROM price_records)  AS total_price_records,
        (SELECT MAX(price_date) FROM price_records) AS latest_price_date
    `)

    const [topCommodities] = await db.query(`
      SELECT
        c.name,
        cat.name AS category,
        COUNT(pr.id) AS record_count,
        ROUND(AVG(pr.prevailing_price), 2) AS avg_price
      FROM commodities c
      JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN price_records pr ON pr.commodity_id = c.id
      GROUP BY c.id, c.name, cat.name
      ORDER BY record_count DESC
      LIMIT 5
    `)

    const [categoryBreakdown] = await db.query(`
      SELECT
        cat.name AS category,
        COUNT(DISTINCT c.id)  AS commodity_count,
        COUNT(pr.id)           AS record_count
      FROM categories cat
      LEFT JOIN commodities c   ON c.category_id = cat.id
      LEFT JOIN price_records pr ON pr.commodity_id = c.id
      GROUP BY cat.id, cat.name
      ORDER BY commodity_count DESC
    `)

    return res.status(200).json({
      success: true,
      data: {
        totals,
        topCommodities,
        categoryBreakdown
      }
    })
  } catch (error) {
    console.error("Dashboard Stats Error:", error)
    return res.status(500).json({ success: false, message: "Failed to fetch dashboard stats" })
  }
}

// ─── Price Range Heatmap (commodity × market matrix, latest prices) ───────────
export const getPriceMatrix = async (req, res) => {
  try {
    const { category_id } = req.query

    let query = `
      SELECT
        c.id AS commodity_id,
        c.name AS commodity_name,
        m.id AS market_id,
        m.name AS market_name,
        pr.prevailing_price,
        pr.price_date
      FROM price_records pr
      JOIN commodities c  ON pr.commodity_id = c.id
      JOIN categories cat ON c.category_id   = cat.id
      JOIN markets m      ON pr.market_id     = m.id
      WHERE pr.price_date = (
        SELECT MAX(pr2.price_date)
        FROM price_records pr2
        WHERE pr2.commodity_id = pr.commodity_id
          AND pr2.market_id    = pr.market_id
      )
    `
    const params = []

    if (category_id) {
      query += ` AND c.category_id = ?`
      params.push(category_id)
    }

    query += ` ORDER BY c.name, m.name`

    const [rows] = await db.query(query, params)
    return res.status(200).json({ success: true, data: rows })
  } catch (error) {
    console.error("Price Matrix Error:", error)
    return res.status(500).json({ success: false, message: "Failed to fetch price matrix" })
  }
}