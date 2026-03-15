import { useRef, useState } from "react";
import { readWorkbook } from "./parsers.js";

const DropZone = ({ onFile, error }) => {
  const inputRef  = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = readWorkbook(e.target.result);
        onFile({ ...result, fileName: file.name }, null);
      } catch (err) {
        onFile(null, err.message || "Failed to parse file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-10">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current.click()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all max-w-lg w-full
          ${dragging
            ? "border-green-700 bg-green-50"
            : "border-green-200 bg-green-50/40 hover:bg-green-50 hover:border-green-400"
          }`}
      >
        <div className="text-5xl mb-3">📊</div>
        <div className="text-lg font-bold text-green-900 mb-1">Drop your Excel file here</div>
        <div className="text-sm text-gray-500 mb-5">
          or click to browse — supports <strong>.xlsx</strong> and <strong>.xls</strong>
        </div>
        <div className="inline-block bg-green-900 text-white rounded-lg px-5 py-2 text-sm font-semibold">
          Choose File
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>

      {error && (
        <div className="mt-4 bg-red-50 text-red-600 rounded-lg px-4 py-2.5 text-sm max-w-lg w-full border border-red-200">
          ⚠️ {error}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400 text-center">
        Expected: a Bantay Presyo workbook with a <em>"FORM A1"</em> and/or <em>"FORM B1"</em> sheet
      </div>
    </div>
  );
};

export default DropZone;