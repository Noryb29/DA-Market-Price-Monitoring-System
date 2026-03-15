import React, { useEffect, useState } from "react"
import { useVegetableStore } from "./store/VegetableStore"
import AddPriceRecordModal from "./components/AddPriceRecordModal"
import AddCommodityModal from "./components/AddCommodityModal"
import CommodityTable from "./components/CommoditiesTable"
import ImportExcelModal from './components/ImportExcelModal.jsx'
import ImportPDFModal from './components/ImportPDFModal.jsx'

const App = () => {
  const { vegetables, fetchVegetables, isLoading, error } = useVegetableStore()

  const [isOpen, setIsOpen] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isAddCommodityOpen, setIsAddCommodityOpen] = useState(false)
  const [isExcelUploadOpen,setExcelUploadOpen] = useState(false)
  const [isPDFuploadOpen,setPDFUploadOpen] = useState(false)

  // ── Sidebar filter state (passed down to CommodityTable) ──────────────────
  const [categoryFilter, setCategoryFilter] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchVegetables()
  }, [])

  
  const uniqueCategories = [
    ...new Set(vegetables.map((v) => v.categories?.trim()).filter(Boolean)),
  ]

  const hasFilters = categoryFilter || searchTerm

  return (
    <div className="min-h-screen flex bg-linear-to-b from-green-50 to-white">

      <AddPriceRecordModal
        isOpen={isAddOpen}
        OnClose={() => setIsAddOpen(false)}
      />

      <AddCommodityModal
        isOpen={isAddCommodityOpen}
        OnClose={() => setIsAddCommodityOpen(false)}
      />

      <ImportExcelModal
      isOpen = {isExcelUploadOpen}
      OnClose = {() => setExcelUploadOpen(false)}
      />

      <ImportPDFModal
      isOpen={isPDFuploadOpen}
      OnClose={() => setPDFUploadOpen(false)}
      />

      {/* ── LEFT SIDEBAR ── */}
      <div className="w-64 bg-base-100 shadow-lg p-6 flex flex-col gap-4 text-base-content">

        {/* Actions */}
        <div className="collapse collapse-arrow bg-base-200 rounded-box">
          <input type="checkbox" />
          <div className="collapse-title font-semibold">Actions</div>
          <div className="collapse-content flex flex-col gap-3">
            <button
              onClick={() => setIsAddOpen(true)}
              className="btn btn-success w-full"
            >
              Add Price Record
            </button>
            <button
              onClick={() => setIsAddCommodityOpen(true)}
              className="btn btn-success w-full"
            >
              Add New Commodity
            </button>

            <button
              onClick={() => setExcelUploadOpen(true)}
              className="btn btn-success w-full"
            >
              Bulk Upload Excel
            </button>

            <button
              onClick={() => setPDFUploadOpen(true)}
              className="btn btn-success w-full"
            >
              Upload PDF
            </button>


          </div>
        </div>

        {/* Filter Options */}
        <div className="collapse collapse-arrow bg-base-200 rounded-box">
          <input type="checkbox" defaultChecked />
          <div className="collapse-title font-semibold">Filter Options</div>
          <div className="collapse-content flex flex-col gap-4">

            {/* Search */}
            <div>
              <label className="text-sm font-semibold mb-1 block">Search</label>
              <label className="input input-bordered flex items-center gap-2">
                🔍
                <input
                  type="text"
                  className="grow"
                  placeholder="Search commodity..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </label>
            </div>

            {/* Category Filter */}
            <div>
              <label className="text-sm font-semibold mb-1 block">Category</label>
              <select
                className="select select-bordered w-full"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {uniqueCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            {hasFilters && (
              <button
                onClick={() => {
                  setCategoryFilter("")
                  setSearchTerm("")
                }}
                className="btn btn-error btn-sm w-full"
              >
                Clear Filters
              </button>
            )}

          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 p-8">
        <h1 className="text-4xl font-extrabold mb-10 text-green-900">
          Commodity Price Monitoring
        </h1>

        {isLoading && (
          <p className="text-center text-gray-600">Loading commodities...</p>
        )}

        {error && (
          <p className="text-center text-red-500">{error}</p>
        )}

        {/* Pass sidebar filter state into the table */}
        <CommodityTable
          search={searchTerm}
          categoryFilter={categoryFilter}
          onAddPriceRecord={(veg) => {
            setSelectedVegetable(veg)
            setIsAddOpen(true)
          }}
        />
      </div>


    </div>
  )
}

export default App