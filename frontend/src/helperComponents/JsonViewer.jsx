import { useState, useMemo } from "react";

const highlight = (s) =>
  s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let style = "color:#ce9178";
        if (/^"/.test(match)) {
          style = /:$/.test(match) ? "color:#9cdcfe;font-weight:600" : "color:#ce9178";
        } else if (/true|false/.test(match)) {
          style = "color:#569cd6";
        } else if (/null/.test(match)) {
          style = "color:#808080";
        } else {
          style = "color:#b5cea8";
        }
        return `<span style="${style}">${match}</span>`;
      }
    );

const JsonViewer = ({ parsed, activeForm }) => {
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState("");

  const data = activeForm === "B1" ? parsed.dataB1 : parsed.dataA1;

  const output = useMemo(() => {
    const q = filter.toLowerCase();
    const filteredData = !q
      ? data
      : data.filter(
          (r) =>
            r.commodity.toLowerCase().includes(q) ||
            r.commodity_category.toLowerCase().includes(q)
        );
    return {
      meta: parsed.meta,
      form: activeForm,
      total: data.length,
      filtered: filteredData.length,
      data: filteredData,
    };
  }, [parsed, filter, activeForm, data]);

  const jsonStr = JSON.stringify(output, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = parsed.fileName.replace(/\.(xlsx|xls)$/i, `-Form${activeForm}.json`);
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2.5 px-5 py-2.5 bg-[#1e1e1e] border-b border-[#333] shrink-0">
        <div className="relative flex-1 max-w-xs">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-500">🔍</span>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by commodity or category..."
            className="w-full bg-[#2d2d2d] border border-[#444] rounded-md py-1.5 pl-7 pr-2.5 text-[#d4d4d4] text-xs outline-none"
          />
        </div>
        <div className="text-xs text-gray-500 ml-1">
          {output.filtered} / {output.total} records
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={handleCopy}
            className={`border rounded-md text-xs px-3.5 py-1.5 font-semibold cursor-pointer transition-colors
              ${copied
                ? "bg-green-600 border-green-600 text-white"
                : "bg-[#2d2d2d] border-[#444] text-[#d4d4d4] hover:bg-[#3a3a3a]"
              }`}
          >
            {copied ? "✓ Copied!" : "⎘ Copy JSON"}
          </button>
          <button
            onClick={handleDownload}
            className="bg-green-900 border-none rounded-md text-white text-xs px-3.5 py-1.5 font-semibold cursor-pointer hover:bg-green-800"
          >
            ↓ Download .json
          </button>
        </div>
      </div>

      {/* Code area */}
      <div className="flex-1 overflow-y-auto bg-[#1e1e1e] px-6 py-5">
        <pre
          className="m-0 text-[12.5px] leading-7 text-[#d4d4d4] whitespace-pre-wrap wrap-break-words"
          style={{ fontFamily: "'Cascadia Code','Fira Code','Consolas',monospace" }}
          dangerouslySetInnerHTML={{ __html: highlight(jsonStr) }}
        />
      </div>
    </div>
  );
};

export default JsonViewer;