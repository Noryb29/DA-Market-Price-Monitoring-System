import * as pdfjsLib from "pdfjs-dist"
import pdfWorker from "pdfjs-dist/build/pdf.worker?url"

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

// ─── Known category headers (DA Bantay Presyo format) ────────────────────────
const KNOWN_CATEGORIES = [
  "IMPORTED COMMERCIAL RICE",
  "LOCAL COMMERCIAL RICE",
  "FISH",
  "LIVESTOCK & POULTRY PRODUCTS",
  "LOWLAND VEGETABLES",
  "HIGHLAND VEGETABLES",
  "SPICES",
  "FRUITS",
  "OTHER BASIC COMMODITIES",
  "CORN",
  "ROOTCROPS",
]

// ─── Lines to skip entirely ───────────────────────────────────────────────────
const SKIP_PATTERNS = [
  /prevailing\s+price/i,
  /high\s+low/i,
  /commodity\s+specification/i,
  /integrated\s+price\s+monitoring/i,
  /bantay\s+presyo/i,
  /prepared\s+and\s+submitted/i,
  /da\s+rfo/i,
  /markets?:/i,
  /^date:/i,
  /cagayan\s+de\s+oro/i,
  /carmen,/i,
  /cogon,/i,
]

// ─── Strip city suffix: "Carmen, Cagayan de Oro City" → "Carmen" ─────────────
const shortMarketName = (raw) => {
  if (!raw) return raw
  const commaIdx = raw.indexOf(",")
  return commaIdx > 0 ? raw.slice(0, commaIdx).trim() : raw.trim()
}

// ─── Parse a price token — returns null for "n/a", number otherwise ──────────
const parsePrice = (token) => {
  if (!token || /^n\/?a$/i.test(token.trim())) return null
  const n = parseFloat(token.replace(/,/g, ""))
  return isNaN(n) ? null : n
}

// ─── Main extractor ───────────────────────────────────────────────────────────
export const extractPDF = async (file) => {
  try {
    const buffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise

    // ── 1. Group text items by Y position (same Y = same visual line) ─────────
    const lineMap = {}

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page    = await pdf.getPage(pageNum)
      const content = await page.getTextContent()

      for (const item of content.items) {
        if (!item.str?.trim()) continue
        const y = Math.round(item.transform[5])
        if (!lineMap[y]) lineMap[y] = []
        lineMap[y].push({ x: Math.round(item.transform[4]), str: item.str })
      }
    }

    // Sort top-to-bottom (PDF Y is bottom-up → descending)
    const sortedYs = Object.keys(lineMap).map(Number).sort((a, b) => b - a)

    const lines = sortedYs.map((y) => {
      const items = lineMap[y].sort((a, b) => a.x - b.x)
      return {
        y,
        text: items.map((i) => i.str.trim()).filter(Boolean).join(" ").trim(),
        items,
      }
    })

    // ── 2. Extract date ───────────────────────────────────────────────────────
    let price_date = null
    const dateRegex =
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i

    for (const { text } of lines) {
      const src = text.replace(/^date:\s*/i, "")
      const m   = src.match(dateRegex)
      if (m) {
        price_date = new Date(m[0]).toISOString().split("T")[0]
        break
      }
    }

    // ── 3. Extract markets from the "MARKETS: X & Y" header line ───────────────
    // e.g. "MARKETS: COGON & CARMEN MARKET"
    // Column order in the PDF is always: Carmen (left) | Cogon (right)
    // so we hardcode that order and just validate names from the header.
    let markets = ["Carmen", "Cogon"] // default / fallback

    for (const { text } of lines) {
      // Match the MARKETS: header line
      if (!/^markets?:/i.test(text.trim())) continue

      // Strip "MARKETS:" prefix then split on & or comma
      const payload = text.replace(/^markets?:\s*/i, "")
      const parts   = payload
        .split(/&|,/)
        .map((s) => s.replace(/market/i, "").trim())
        .filter(Boolean)

      if (parts.length >= 2) {
        // Use only the first word of each part as the short market name
        // e.g. "COGON" → "Cogon", "CARMEN" → "Carmen"
        const toTitle = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
        // PDF column order is Carmen left, Cogon right — keep that regardless of
        // the order they appear in the MARKETS: line
        const names = parts.map((p) => toTitle(p.split(/\s+/)[0]))
        // Sort so Carmen always comes first (matches PDF left column)
        markets = names.sort((a, b) =>
          a.toLowerCase().startsWith("carm") ? -1 :
          b.toLowerCase().startsWith("carm") ? 1 : 0
        )
      }
      break
    }

    // ── 4. Parse price rows ───────────────────────────────────────────────────
    // Each data line: [commodity name + spec] [p1] [h1] [l1] [p2] [h2] [l2]
    // where market 1 = Carmen, market 2 = Cogon (left-to-right in PDF)
    const priceToken = /^\d+(?:\.\d+)?$|^n\/?a$/i
    const rows       = []
    let currentCategory = null

    for (const { text } of lines) {
      if (!text) continue
      if (SKIP_PATTERNS.some((re) => re.test(text))) continue

      // ── Category header ──
      const upperText       = text.toUpperCase().trim()
      const matchedCategory = KNOWN_CATEGORIES.find(
        (cat) => upperText === cat || upperText.includes(cat)
      )
      if (matchedCategory) {
        currentCategory = matchedCategory
        continue
      }

      // ── Price row ──
      const tokens         = text.split(/\s+/)
      const pricePositions = tokens.reduce((acc, t, i) => {
        if (priceToken.test(t)) acc.push(i)
        return acc
      }, [])

      // Need at least 6 price-like tokens (3 per market)
      if (pricePositions.length < 6) continue

      // Last 6 price positions → handles specs that contain numbers
      const lastSix        = pricePositions.slice(-6)
      const [i0, i1, i2, i3, i4, i5] = lastSix

      const p1 = parsePrice(tokens[i0])
      const h1 = parsePrice(tokens[i1])
      const l1 = parsePrice(tokens[i2])
      const p2 = parsePrice(tokens[i3])
      const h2 = parsePrice(tokens[i4])
      const l2 = parsePrice(tokens[i5])

      // Everything before the first price token = commodity name + specification
      const namePart = tokens.slice(0, i0).join(" ").trim()

      // ── Split name from specification ──
      // Spec patterns: "med(3-4pcs/kg)", "4-5 pcs/kg", "3-4 small bundles",
      //                "750 gm - 1 kg/head", "1 Liter/bottle", "8-10 pcs"
      let commodity_name = namePart
      let specification  = null

      const specMatch = namePart.match(
        /^(.+?)\s+((?:\d[\d\-\/.]*\s*(?:pcs|kg|gm|g|ml|liter|L|bundles?|bottle|head)[^\s]*.*|med\b|small\b|large\b|fully\s+dressed\b|medium\s+size\b|lean\s+meat.*|meat\s+w\/bones\b).*)$/i
      )
      if (specMatch) {
        commodity_name = specMatch[1].trim()
        specification  = specMatch[2].trim()
      } else {
        // Fallback: split at first opening parenthesis if present
        const parenIdx = namePart.indexOf("(")
        if (parenIdx > 0) {
          commodity_name = namePart.slice(0, parenIdx).trim()
          specification  = namePart.slice(parenIdx).trim()
        }
      }

      // ── Emit one row per market ──
      rows.push({
        category:        currentCategory,
        commodity_name,
        specification,
        market_name:     markets[0],   // e.g. "Carmen"
        prevailing_price: p1,
        high_price:      h1,
        low_price:       l1,
      })

      rows.push({
        category:        currentCategory,
        commodity_name,
        specification,
        market_name:     markets[1],   // e.g. "Cogon"
        prevailing_price: p2,
        high_price:      h2,
        low_price:       l2,
      })
    }

    return { price_date, markets, rows }

  } catch (error) {
    console.error("PDF Extract Error:", error)
    throw new Error("Failed to parse PDF")
  }
}