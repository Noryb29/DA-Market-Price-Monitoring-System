import * as pdfjsLib from "pdfjs-dist"
import pdfWorker from "pdfjs-dist/build/pdf.worker?url"

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

// ─── Column x-boundaries (measured from actual PDF) ───────────────────────────
//
//  Label zone  x <  200  →  commodity name words  (e.g. "Beef Rump")
//  Spec zone   x  200–279 →  specification words  (always printed at x ≈ 209)
//  Price zone  x >= 280  →  6 price values        (A_prev A_high A_low  B_prev B_high B_low)
//
const X_SPEC_START  = 200
const X_PRICE_START = 280

// Maximum y-pixel distance to group items onto the same logical row.
// Measured from PDF: largest gap between a commodity label and its
// corresponding spec/price items is 6 px → using 8 for safety.
const Y_BAND = 8

// ─── Category headers (exact uppercase strings as they appear in the PDF) ─────
const CATEGORY_HEADERS = [
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parsePrice(value) {
  if (!value) return null
  const t = value.trim().toLowerCase()
  if (t === "n/a" || t === "") return null
  const n = parseFloat(t.replace(/,/g, ""))
  return isNaN(n) ? null : n
}

function parseDateToISO(raw) {
  if (!raw) return null
  const d = new Date(raw.trim())
  if (isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

function isPriceToken(str) {
  return /^(\d+\.?\d*|n\/a)$/i.test(str.trim())
}

/**
 * Splits a label-zone string into { commodity_name, specification }.
 * Only called when the spec zone had no content for this row.
 *
 * Commodity name = Title Case words + optional (Qualifier) in parens
 *
 * Specification starts at the first token that:
 *   1. Starts with a digit or #  →  "3-4 small bundles", "13-15 pcs/kg", "#10"
 *   2. Is a word(digit) pattern  →  "med(3-4pcs/kg)"
 *   3. Is a lowercase word (after ≥2 name tokens), excluding:
 *        - tokens that open "(" or close ")" a parenthetical
 *        - the word "tag" (part of rice grade names: Blue tag, Yellow tag)
 *      →  catches: "lean meat/ tapadera", "fully dressed", "medium size", "variety"
 */
function splitCommoditySpec(raw) {
  const tokens = raw.trim().split(/\s+/)
  let specStart = -1

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    // Rule 1: digit-led or #-led
    if (/^[\d#]/.test(token)) { specStart = i; break }

    // Rule 2: word(digit...) like med(3-4pcs/kg)
    if (/^\w+\(\S*\d/.test(token)) { specStart = i; break }

    // Rule 3: lowercase word after ≥2 name tokens
    if (
      i >= 2 &&
      /^[a-z]/.test(token) &&
      !token.startsWith("(") &&
      !token.endsWith(")") &&
      token.toLowerCase() !== "tag"
    ) { specStart = i; break }
  }

  if (specStart === -1) return { commodity_name: raw.trim(), specification: "" }

  return {
    commodity_name: tokens.slice(0, specStart).join(" ").trim(),
    specification:  tokens.slice(specStart).join(" ").trim(),
  }
}

// ─── PDF extraction ───────────────────────────────────────────────────────────

/**
 * Extracts all text items per page, returning arrays of { str, x, y }.
 * Items are kept per-page so y-coordinates never bleed across pages.
 */
async function extractItemsByPage(source) {
  const arrayBuffer =
    source instanceof ArrayBuffer ? source : await source.arrayBuffer()

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages = []

  for (let p = 1; p <= pdf.numPages; p++) {
    const page    = await pdf.getPage(p)
    const content = await page.getTextContent()
    const items   = []

    for (const item of content.items) {
      const str = item.str.trim()
      if (!str) continue
      items.push({ str, x: item.transform[4], y: item.transform[5] })
    }

    pages.push(items)
  }

  return pages
}

/**
 * Groups a single page's items into logical rows using y-proximity (Y_BAND).
 *
 * PDF y-axis is bottom-up, so items are sorted descending by y (top→bottom).
 * The running average y of the current row is used as the comparison anchor
 * so multi-line wrapped text with slight y drift stays grouped correctly.
 *
 * Each logical row is split into three x-zones:
 *   label  — commodity name words
 *   spec   — specification words (sorted by y then x to preserve wrap order)
 *   prices — price tokens only
 */
function groupPageIntoRows(items) {
  // Sort top → bottom (y descending in PDF coords)
  const sorted = [...items].sort((a, b) => b.y - a.y)

  const groups = []
  let current = []
  let avgY = null

  for (const item of sorted) {
    if (avgY === null || Math.abs(item.y - avgY) <= Y_BAND) {
      current.push(item)
      avgY = current.reduce((s, i) => s + i.y, 0) / current.length
    } else {
      if (current.length) groups.push(current)
      current = [item]
      avgY = item.y
    }
  }
  if (current.length) groups.push(current)

  return groups.map((group) => {
    const byX = (items) => items.sort((a, b) => a.x - b.x)
    // Spec items: sort by y DESC first (top of wrapped text first), then x
    const byYX = (items) => items.sort((a, b) => b.y - a.y || a.x - b.x)

    const labelItems = group.filter((i) => i.x <  X_SPEC_START)
    const specItems  = group.filter((i) => i.x >= X_SPEC_START && i.x < X_PRICE_START)
    const priceItems = group.filter((i) => i.x >= X_PRICE_START)

    const label  = byX(labelItems).map((i) => i.str).join(" ").trim()
    const spec   = byYX(specItems).map((i) => i.str).join(" ").trim()
    const prices = byX(priceItems).map((i) => i.str).filter(isPriceToken)
    const raw    = byX([...group]).map((i) => i.str).join(" ").trim()

    return { label, spec, prices, raw }
  })
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Extracts structured price rows from a DA Bantay Presyo retail price PDF.
 *
 * Returns:
 * {
 *   price_date: "2025-04-07",
 *   markets:    ["COGON", "CARMEN"],
 *   rows: [
 *     {
 *       category:         string,
 *       commodity_name:   string,
 *       specification:    string,
 *       market_name:      string,
 *       prevailing_price: number | null,
 *       high_price:       number | null,
 *       low_price:        number | null,
 *     }
 *   ]
 * }
 */
export async function extractPDF(source) {
  const pages = await extractItemsByPage(source)

  let markets    = []
  let price_date = null
  const rows     = []
  let currentCategory = ""

  for (const pageItems of pages) {
    const logicalRows = groupPageIntoRows(pageItems)

    for (const { label, spec, prices, raw } of logicalRows) {

      // ── Metadata ────────────────────────────────────────────────────────
      if (/^markets:/i.test(raw)) {
        markets = raw
          .replace(/^markets:/i, "")
          .split("&")
          .map((m) =>
            m.trim()
              .replace(/\bmarket\b/gi, "")
              .replace(/,.*$/, "")
              .trim()
          )
          .filter(Boolean)
        continue
      }

      if (/^date:/i.test(raw)) {
        price_date = parseDateToISO(raw.replace(/^date:/i, "").trim())
        continue
      }

      // ── Category headers — exact match on uppercase raw ─────────────────
      // Use exact equality against the known header strings so commodity names
      // that contain a category keyword (e.g. "White CORN Grits") are not
      // mistakenly treated as a category change.
      const rawUpper = raw.toUpperCase().trim()
      const matchedCat = CATEGORY_HEADERS.find((h) => rawUpper === h)
      if (matchedCat) {
        currentCategory = matchedCat
        continue
      }

      // ── Skip non-data rows ───────────────────────────────────────────────
      if (!currentCategory) continue
      if (/^(prevailing|commodity|carmen|cogon|prepared|integrated)/i.test(raw)) continue

      // ── Must have ≥3 price tokens ────────────────────────────────────────
      if (prices.length < 3) continue

      // ── Resolve commodity_name and specification ─────────────────────────
      // Priority: use the dedicated spec zone text if present.
      // Fall back to splitting the label text using heuristics.
      let commodity_name, specification

      if (spec) {
        // Rice grade names (e.g. "Blue tag", "Yellow tag") appear in the spec
        // column but are actually part of the commodity name.
        if (/tag$/i.test(spec)) {
          commodity_name = `${label} ${spec}`.trim()
          specification  = ""
        } else {
          commodity_name = label
          // Rejoin hyphenated tokens that pdfjs splits across y-lines: "12- 14" → "12-14"
          specification  = spec.replace(/-\s+/g, "-")
        }
      } else {
        ;({ commodity_name, specification } = splitCommoditySpec(label))
      }

      if (!commodity_name) continue

      const marketA = markets[0] ?? "Carmen"
      const marketB = markets[1] ?? "Cogon"

      const [aPrev, aHigh, aLow, bPrev, bHigh, bLow] = prices

      // Market A
      rows.push({
        category:         currentCategory,
        commodity_name,
        specification,
        market_name:      marketA,
        prevailing_price: parsePrice(aPrev),
        high_price:       parsePrice(aHigh),
        low_price:        parsePrice(aLow),
      })

      // Market B (only when all 6 price tokens are present)
      if (prices.length >= 6) {
        rows.push({
          category:         currentCategory,
          commodity_name,
          specification,
          market_name:      marketB,
          prevailing_price: parsePrice(bPrev),
          high_price:       parsePrice(bHigh),
          low_price:        parsePrice(bLow),
        })
      }
    }
  }

  return { price_date, markets, rows }
}