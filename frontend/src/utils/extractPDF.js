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

const ROOTCROP_KEYWORDS = ["sweet potato", "cassava", "taro", "gabi", "kamote"]
const FISH_KEYWORDS = ["bangus", "tilapia", "galunggong", "alumahan", "tuna", "mackerel", "squid", "crab", "shrimp", "lobster", "fish", "pusit", "hipon", "alimango"]

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
  const cleaned = token.replace(/^[\₱P]\s*/, "").replace(/,/g, "")
  const n = parseFloat(cleaned)
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
    const priceToken = /^[\₱P]?\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?$|^\d+(?:\.\d+)?$|^n\/?a$/i
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

      if (!namePart || namePart.length < 2) continue

      // ── Split name from specification ──
      // Spec patterns: "med(3-4pcs/kg)", "4-5 pcs/kg", "3-4 small bundles",
      //                "750 gm - 1 kg/head", "1 Liter/bottle", "8-10 pcs"
      let commodity_name = namePart
      let specification  = null

      const specMatch = namePart.match(
        /^(.+?)\s+((?:Blue|White|Yellow|Premium|Regular)\s+tag|(?:\d[\d\-\/.]*\s*(?:pcs|kg|gm|g|ml|liter|L|bundles?|bottle|head)[^\s]*.*|med\b|small\b|large\b|fully\s+dressed\b|medium\s+size\b|lean\s+meat.*|meat\s+w\/bones\b).*)$/i
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

      if (!commodity_name || commodity_name.length < 2) continue

      // Fix miscategorized items based on commodity name keywords
      const lowerCommodity = commodity_name.toLowerCase()
      if (ROOTCROP_KEYWORDS.some(kw => lowerCommodity.includes(kw))) {
        currentCategory = "ROOTCROPS"
      } else if (FISH_KEYWORDS.some(kw => lowerCommodity.includes(kw))) {
        currentCategory = "FISH"
      }

      // Fix standalone "Yellow tag", "White tag", "Blue tag" - default to Sugar
      if (/\btag$/i.test(commodity_name) || /\b(tag|white tag|yellow tag|blue tag)\b/i.test(commodity_name)) {
        commodity_name = "Sugar"
      }

      // Fix "Well milled", "Regular milled", "Premium" - default to rice commodity
      if (/\b(milled|premium)\b/i.test(commodity_name)) {
        commodity_name = commodity_name + " Rice"
      }

      // Fix commodity name if it looks like a specification (e.g., "13-15 pcs/kg" where specMatch captured it)
      if (/^\d+[\d\-\/]+\s*(pcs|kg|gm|g|ml|\/)/i.test(commodity_name)) {
        // If spec was captured by regex, try to get commodity from tokens
        const tokensBeforeSpec = tokens.slice(0, i0)
        if (tokensBeforeSpec.length > 1) {
          const potentialCommodity = tokensBeforeSpec.slice(0, -1).join(" ").trim()
          if (potentialCommodity && !/^\d+[\d\-\/]+$/.test(potentialCommodity)) {
            commodity_name = potentialCommodity
          }
        }
        // Keep specification as is (already extracted by specMatch)
      }

      // Fix "Eggplant 3-4" -> commodity: Eggplant, spec: 3-4
      const eggMatch = commodity_name.match(/^(Eggplant|Chayote|Cabbage|Baguio)\s+(\d+[\d\-]*)$/i)
      if (eggMatch) {
        commodity_name = eggMatch[1]
        specification = eggMatch[2] + (specification ? " " + specification : "")
      }

      // Fix "8-10 pcs" or similar standalone specs - skip these rows
      if (/^\d+[\d\-\/]+\s*(pcs|kg)$/i.test(commodity_name)) {
        continue
      }

      // Fix "8-10" where commodity is just numbers - likely Cabbage spec
      if (/^\d+[\d\-]+$/.test(commodity_name)) {
        specification = commodity_name + (specification ? " " + specification : "") + " pcs"
        // Try to find commodity from earlier in the tokens
        const tokensBeforeSpec = tokens.slice(0, i0)
        if (tokensBeforeSpec.length > 1) {
          commodity_name = tokensBeforeSpec[0].trim()
        } else {
          commodity_name = "Cabbage"
        }
      }

      // Fix "13-15" similar case - likely Ginger
      if (/^\d+[\d\-]+$/.test(commodity_name)) {
        specification = commodity_name + " pcs/kg"
        const tokensBeforeSpec = tokens.slice(0, i0)
        if (tokensBeforeSpec.length > 1) {
          commodity_name = tokensBeforeSpec[0].trim()
        } else {
          commodity_name = "Ginger"
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

    return { price_date, markets, rows: rows || [] }

  } catch (error) {
    console.error("PDF Extract Error:", error)
    throw new Error("Failed to parse PDF: " + error.message)
  }
}