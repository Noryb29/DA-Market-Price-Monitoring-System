import * as XLSX from "xlsx";
import { clean, str, getNumbers, calculatePrevailingPrice } from "./helpers";
import { A1_CATEGORY_ROWS, B1_CATEGORY_ROWS } from "./constants.js";

// ── Parse FORM A1 ──────────────────────────────────────────────────────────
export function parseFormA1(workbook) {
  const sheet = workbook.Sheets["FORM A1"];
  if (!sheet) throw new Error('Sheet "FORM A1" not found.');
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  const records = [];
  let currentCategory = "";

  rows.forEach((row, i) => {
    if (A1_CATEGORY_ROWS[i]) { currentCategory = A1_CATEGORY_ROWS[i]; return; }

    const commodity = str(row[0]);
    if (!commodity) return;
    if (
      commodity.startsWith("1.") ||
      commodity.startsWith("MARKET") ||
      commodity.startsWith("Date") ||
      commodity === "COMMODITY"
    ) return;

    const r1 = clean(row[3]);
    const r2 = clean(row[4]);
    const r3 = clean(row[5]);
    const r4 = clean(row[6]);
    const r5 = clean(row[7]);
    const respondents = [r1, r2, r3, r4, r5];

    const nums = getNumbers(respondents).filter((v) => typeof v === "number" && isFinite(v) && !isNaN(v));
    const high = nums.length ? Math.max(...nums) : null;
    const low  = nums.length ? Math.min(...nums) : null;

    const freq = {};
    nums.forEach((n) => { freq[n] = (freq[n] || 0) + 1; });
    const maxFreq = nums.length ? Math.max(...Object.values(freq)) : 0;

    const prevailing = calculatePrevailingPrice(respondents);

    const supplyRaw = str(row[12]).toUpperCase();
    const supply = ["A", "S", "D"].includes(supplyRaw) ? supplyRaw : "NONE";

    records.push({
      commodity,
      commodity_category: currentCategory,
      specification: str(row[1]),
      unit: str(row[2]),
      respondent_1: r1,
      respondent_2: r2,
      respondent_3: r3,
      respondent_4: r4,
      respondent_5: r5,
      high_range: high,
      low_range: low,
      no_mode: maxFreq > 1 ? maxFreq : 0,
      prevailing_price: prevailing,
      supply_level: supply,
      remarks: str(row[13]) === "nan" || !str(row[13]) ? "" : str(row[13]),
    });
  });

  if (!records.length) throw new Error("No commodity records found in FORM A1.");
  return records;
}

// ── Parse FORM B1 ──────────────────────────────────────────────────────────
export function parseFormB1(workbook) {
  const sheet = workbook.Sheets["FORM B1"];
  if (!sheet) throw new Error('Sheet "FORM B1" not found.');
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  const records = [];
  let currentCategory = "";

  rows.forEach((row, i) => {
    if (B1_CATEGORY_ROWS[i]) { currentCategory = B1_CATEGORY_ROWS[i]; return; }

    const commodity = str(row[0]);
    if (!commodity) return;
    if (
      commodity.startsWith("COMMODITY") ||
      commodity.startsWith("NOTE") ||
      commodity.startsWith("1.") ||
      commodity.startsWith("Bantay") ||
      commodity.startsWith("Data") ||
      commodity.startsWith("MARKET") ||
      commodity.startsWith("Date") ||
      commodity.startsWith("Prepared")
    ) return;

    const high           = clean(row[3]);
    const low            = clean(row[4]);
    const prevailingToday = clean(row[5]);
    const prevailingPrev  = clean(row[6]);

    let pctChange = null;
    const rawPct = row[7];
    if (rawPct === "-" || rawPct === "n/a") {
      pctChange = "-";
    } else {
      pctChange = clean(rawPct);
    }

    const supplyRaw  = str(row[8]).toUpperCase();
    const supply     = ["A", "S", "D"].includes(supplyRaw) ? supplyRaw : "NONE";
    const remarksRaw = str(row[9]);
    const remarks    = remarksRaw === "nan" || remarksRaw === "." ? "" : remarksRaw;

    records.push({
      commodity,
      commodity_category: currentCategory,
      specification: str(row[1]),
      unit: str(row[2]),
      high_range: high,
      low_range: low,
      prevailing_today: prevailingToday,
      prevailing_previous: prevailingPrev,
      pct_change: pctChange,
      supply_level: supply,
      remarks,
    });
  });

  if (!records.length) throw new Error("No commodity records found in FORM B1.");
  return records;
}

// ── Extract metadata (signatories, market, date, etc.) ─────────────────────
export function extractMeta(workbook) {
  const sheetName = workbook.SheetNames.includes("FORM B1") ? "FORM B1" : "FORM A1";
  const sheet     = workbook.Sheets[sheetName];
  const raw       = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  if (sheetName === "FORM B1") {
    // Signature rows live around row 79–81
    // Row 79: names, Row 80: titles, Row 81: department/unit (optional)
    const nameRow  = raw[79] ?? [];
    const titleRow = raw[80] ?? [];

    return {
      office:      str(raw[5]?.[5]).replace(/^OFFICE\/REGION:\s*/i, ""),
      market:      str(raw[4]?.[0]).replace(/^MARKET:\s*/i, ""),
      date:        str(raw[5]?.[0]).replace(/^Date\s*:\s*/i, ""),
      monitoredBy: str(raw[4]?.[5]).replace(/^MONITORED BY:\s*/i, ""),
      signatories: {
        preparedBy: { name: str(nameRow[0]),  title: str(titleRow[0])  },
        reviewedBy: { name: str(nameRow[3]),  title: str(titleRow[3])  },
        notedBy:    { name: str(nameRow[7]),  title: str(titleRow[7])  },
      },
    };
  }

  // FORM A1
  const nameRow  = raw[5] ?? [];
  const titleRow = raw[6] ?? [];

  return {
    office:      str(raw[0]?.[0]),
    market:      str(raw[2]?.[1]),
    date:        str(raw[3]?.[1]),
    monitoredBy: str(raw[4]?.[1]),
    signatories: {
      preparedBy: { name: str(nameRow[1]), title: str(titleRow[1]) },
      reviewedBy: { name: str(nameRow[4]), title: str(titleRow[4]) },
      notedBy:    { name: str(nameRow[7]), title: str(titleRow[7]) },
    },
  };
}

// ── Top-level workbook reader ──────────────────────────────────────────────
export function readWorkbook(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const hasA1    = workbook.SheetNames.includes("FORM A1");
  const hasB1    = workbook.SheetNames.includes("FORM B1");

  if (!hasA1 && !hasB1) throw new Error('No "FORM A1" or "FORM B1" sheet found.');

  const dataA1 = hasA1 ? parseFormA1(workbook) : [];
  const dataB1 = hasB1 ? parseFormB1(workbook) : [];
  const meta   = extractMeta(workbook);

  return { dataA1, dataB1, meta, hasA1, hasB1 };
}