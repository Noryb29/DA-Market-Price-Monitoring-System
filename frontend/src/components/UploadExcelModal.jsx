import { useState, useMemo } from "react";
import { A1_HEADERS, B1_HEADERS, SUPPLY_META } from "../helperComponents/constants.js";
import DropZone    from "../helperComponents/DropZone.jsx";
import JsonViewer  from "../helperComponents/JsonViewer.jsx";
import FormA1Table from "../helperComponents/FormA1Table.jsx";
import FormB1Table from "../helperComponents/FormB1Table.jsx";
import { SupplyBadge, SignatoryCard } from "../helperComponents/Shared.jsx";
import { useVegetableStore } from "../store/VegetableStore.js";

const UploadExcelModal = ({ isOpen, OnClose }) => {
  const [parsed,       setParsed]       = useState(null);
  const [uploadError,  setUploadError]  = useState(null);
  const [search,       setSearch]       = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [expandedRow,  setExpandedRow]  = useState(null);
  const [activeTab,    setActiveTab]    = useState("table");
  const [activeForm,   setActiveForm]   = useState("A1");
  const [isImporting,  setIsImporting]  = useState(false);

  const { importFormRecords } = useVegetableStore();

  // ── File loaded ────────────────────────────────────────────────────────
  const handleFile = (result, err) => {
    setUploadError(err);
    if (result) {
      setParsed(result);
      setSearch(""); setActiveCategory("ALL"); setExpandedRow(null);
      setActiveTab("table");
      setActiveForm(result.hasA1 ? "A1" : "B1");
    }
  };

  const handleClose = () => {
    setParsed(null); setUploadError(null); setSearch("");
    setActiveCategory("ALL"); setExpandedRow(null);
    OnClose();
  };

  const handleImport = async () => {
    if (!parsed || isImporting) return;
    setIsImporting(true);
    await importFormRecords(parsed, activeForm);
    setIsImporting(false);
  };

  // ── Derived data ───────────────────────────────────────────────────────
  const currentData = useMemo(() => {
    if (!parsed) return [];
    return activeForm === "B1" ? parsed.dataB1 : parsed.dataA1;
  }, [parsed, activeForm]);

  const categories = useMemo(
    () => [...new Set(currentData.map((d) => d.commodity_category))],
    [currentData]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return currentData.filter((row) => {
      const matchCat = activeCategory === "ALL" || row.commodity_category === activeCategory;
      return (
        matchCat &&
        (!q ||
          row.commodity.toLowerCase().includes(q) ||
          row.commodity_category.toLowerCase().includes(q) ||
          (row.specification || "").toLowerCase().includes(q))
      );
    });
  }, [currentData, search, activeCategory]);

  if (!isOpen) return null;

  const meta       = parsed?.meta || {};
  const sigs       = meta.signatories || {};
  const headers    = activeForm === "A1" ? A1_HEADERS : B1_HEADERS;

  return (
    <div
      className="fixed inset-0 z-9999 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-300 max-h-[92vh] flex flex-col overflow-hidden font-sans">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="bg-linear-to-br from-green-900 to-green-700 px-7 pt-5 pb-4 text-white shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs font-semibold tracking-widest text-green-300 uppercase mb-1">
                {parsed
                  ? (meta.office || "Department of Agriculture")
                  : "Department of Agriculture · Bantay Presyo"}
              </div>
              <div className="text-xl font-bold">
                {parsed ? `Bantay Presyo — Form ${activeForm}` : "Price Monitoring Upload"}
              </div>
              {parsed && (
                <div className="text-sm text-green-200 mt-0.5">
                  {meta.market    && <>{meta.market} · </>}
                  {meta.date      && <>{meta.date} · </>}
                  {meta.monitoredBy && <>Monitored by: {meta.monitoredBy}</>}
                </div>
              )}
            </div>

            <div className="flex gap-2 shrink-0 ml-4">
              {parsed && (
                <>
                  {/* Import to DB button */}
                  <button
                    onClick={handleImport}
                    disabled={isImporting}
                    className={`border-none rounded-lg text-xs px-3.5 py-1.5 font-semibold transition-colors
                      ${isImporting
                        ? "bg-white/10 text-white/40 cursor-not-allowed"
                        : "bg-green-400 hover:bg-green-300 text-white cursor-pointer"
                      }`}
                  >
                    {isImporting ? "Importing…" : "⬆ Import to DB"}
                  </button>

                  <button
                    onClick={() => { setParsed(null); setUploadError(null); }}
                    className="bg-white/15 hover:bg-white/25 border-none rounded-lg text-green-200 text-xs px-3.5 py-1.5 font-semibold cursor-pointer transition-colors"
                  >
                    ↑ New File
                  </button>
                </>
              )}
              <button
                onClick={handleClose}
                className="bg-white/15 hover:bg-white/25 border-none rounded-lg text-white cursor-pointer text-lg w-9 h-9 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Form / View switcher + Search */}
          {parsed && (
            <div className="mt-3.5 flex gap-2.5 items-center flex-wrap">

              {/* Form A1 / B1 */}
              <div className="flex bg-white/10 rounded-lg p-0.5 shrink-0">
                {[
                  parsed.hasA1 && { id: "A1", label: "Form A1" },
                  parsed.hasB1 && { id: "B1", label: "Form B1" },
                ]
                  .filter(Boolean)
                  .map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveForm(tab.id);
                        setActiveCategory("ALL");
                        setExpandedRow(null);
                        setSearch("");
                      }}
                      className={`px-3.5 py-1.5 rounded-md border-none cursor-pointer text-xs font-semibold transition-all
                        ${activeForm === tab.id
                          ? "bg-green-400 text-white"
                          : "bg-transparent text-green-200 hover:text-white"}`}
                    >
                      {tab.label}
                    </button>
                  ))}
              </div>

              {/* Table / JSON */}
              <div className="flex bg-white/10 rounded-lg p-0.5 shrink-0">
                {[{ id: "table", label: "📋 Table" }, { id: "json", label: "{ } JSON" }].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3.5 py-1.5 rounded-md border-none cursor-pointer text-xs font-semibold transition-all
                      ${activeTab === tab.id
                        ? "bg-white text-green-900"
                        : "bg-transparent text-green-200 hover:text-white"}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search */}
              {activeTab === "table" && (
                <div className="relative flex-1 min-w-45">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400 text-sm">🔍</span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search commodity or category..."
                    className="w-full bg-white/10 border border-white/20 rounded-lg py-1.5 pl-9 pr-3 text-white placeholder-green-300 text-sm outline-none focus:bg-white/15"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Body ────────────────────────────────────────────────────── */}
        {!parsed ? (
          <DropZone onFile={handleFile} error={uploadError} />
        ) : activeTab === "json" ? (
          <JsonViewer parsed={parsed} activeForm={activeForm} />
        ) : (
          <>
            {/* Category tabs */}
            <div className="flex gap-1.5 px-5 py-2.5 overflow-x-auto bg-green-50/60 border-b border-green-100 shrink-0">
              {["ALL", ...categories].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 rounded-full border-none cursor-pointer text-xs font-semibold whitespace-nowrap transition-colors
                    ${activeCategory === cat
                      ? "bg-green-900 text-white"
                      : "bg-green-100 text-green-700 hover:bg-green-200"}`}
                >
                  {cat === "ALL" ? "All Categories" : cat}
                </button>
              ))}
            </div>

            {/* Stats bar */}
            <div className="flex gap-4 px-6 py-2 bg-green-50/60 border-b border-green-100 shrink-0 flex-wrap">
              {Object.entries(SUPPLY_META).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5">
                  <SupplyBadge level={k} />
                  <span className="text-xs text-gray-500">
                    {v.label}: <strong>{filtered.filter((r) => r.supply_level === k).length}</strong>
                  </span>
                </div>
              ))}
              <div className="ml-auto text-xs text-gray-400">
                {filtered.length} of {currentData.length} items ·{" "}
                <span className="text-green-700">📁 {parsed.fileName}</span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-y-auto flex-1">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-green-50 sticky top-0 z-10">
                    {headers.map((h) => (
                      <th
                        key={h}
                        className="px-2.5 py-2 text-left text-xs font-bold text-green-700 uppercase tracking-wide border-b-2 border-green-200 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeForm === "A1" ? (
                    <FormA1Table
                      data={filtered}
                      activeCategory={activeCategory}
                      expandedRow={expandedRow}
                      setExpandedRow={setExpandedRow}
                    />
                  ) : (
                    <FormB1Table
                      data={filtered}
                      activeCategory={activeCategory}
                      expandedRow={expandedRow}
                      setExpandedRow={setExpandedRow}
                    />
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Footer / Signatory block ─────────────────────────── */}
            <div className="px-6 py-3 bg-green-50/60 border-t border-green-100 shrink-0">
              {/* Remarks hint */}
              <div className="text-xs text-gray-400 mb-3">
                💬 Click rows with a speech bubble to view remarks
              </div>

              {/* Signatories — mirrors the physical form layout */}
              {(sigs.preparedBy?.name || sigs.reviewedBy?.name || sigs.notedBy?.name) && (
                <div className="flex justify-between items-start border-t border-green-100 pt-3 flex-wrap gap-4">
                  <SignatoryCard
                    label="Prepared by"
                    name={sigs.preparedBy?.name}
                    title={sigs.preparedBy?.title}
                  />
                  <SignatoryCard
                    label="Reviewed by"
                    name={sigs.reviewedBy?.name}
                    title={sigs.reviewedBy?.title}
                  />
                  <SignatoryCard
                    label="Noted by"
                    name={sigs.notedBy?.name}
                    title={sigs.notedBy?.title}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UploadExcelModal;