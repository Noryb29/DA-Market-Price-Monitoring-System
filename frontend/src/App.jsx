import React, { useEffect, useState } from "react"
import VegetableModal from "./components/VegetableModal"
import { useVegetableStore } from "./store/VegetableStore"
import UploadExcelModal from "./components/UploadExcelModal"

const App = () => {
  const { vegetables, fetchVegetables, isLoading, error } = useVegetableStore()

  const [isOpen, setIsOpen] = useState(false)
  const [selectedVegetable, setSelectedVegetable] = useState(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isAddCommodityOpen,setIsAddCommodityOpen] = useState(false)
  const [isUploadExcelOpen,setIsUploadExcelOpen] = useState(false)

  const [categoryFilter, setCategoryFilter] = useState("")
  const [dateFilter, setDateFilter] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchVegetables()
  }, [])

  const openModal = (veg) => {
    setSelectedVegetable(veg)
    setIsOpen(true)
  }

  const closeModal = () => {
    setIsOpen(false)
    setSelectedVegetable(null)
  }

  const uniqueCategories = [...new Set(vegetables.map(v => v.categories?.trim()).filter(Boolean))]
  const uniqueDates = [...new Set(vegetables.map(v => v.price_date).filter(Boolean))]

  const filteredVegetables = vegetables.filter(v => {

  const searchMatch = searchTerm
    ? v.name?.toLowerCase().includes(searchTerm.toLowerCase())
    : true

  const categoryMatch = categoryFilter
    ? v.categories?.trim().toLowerCase() === categoryFilter.trim().toLowerCase()
    : true

  const dateMatch = dateFilter
    ? v.price_date === dateFilter
    : true

  return searchMatch && categoryMatch && dateMatch
})

  return (
    <div className="min-h-screen flex bg-linear-to-b from-green-50 to-white">

      <UploadExcelModal
      isOpen={isUploadExcelOpen}
      OnClose={() => setIsUploadExcelOpen(false)}
      />

      {/* LEFT SIDEBAR */}
<div className="w-64 bg-base-100 shadow-lg p-6 flex flex-col gap-4 text-base-content">

  <div className="collapse collapse-arrow bg-base-200 rounded-box">

  <input type="checkbox" />

  <div className="collapse-title font-semibold">
    Actions 
  </div>

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
      onClick={() => setIsUploadExcelOpen(true)}
      className="btn btn-success w-full"
    >
      Bulk Upload Excel File
    </button>

     <button
      className="btn btn-success w-full"
    >
      Bulk Upload PDF File
    </button>

  </div>

</div>

<div className="collapse collapse-arrow bg-base-200 rounded-box">

  <input type="checkbox" defaultChecked />

  <div className="collapse-title font-semibold">
    Filter Options
  </div>

  <div className="collapse-content flex flex-col gap-4">

    {/* Category Filter */}
    <div className="flex flex-col">
      <label className="text-sm font-semibold mb-1 block">
        Category
      </label>

      <select
        className="select select-bordered w-full mb-5"
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

       {/* SEARCH BAR */}

    <label className="input input-bordered flex items-center gap-2 ">
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

    {/* Date Filter */}
    <div>
      <label className="text-sm font-semibold mb-1 block">
        Date
      </label>

      <select
        className="select select-bordered w-full"
        value={dateFilter}
        onChange={(e) => setDateFilter(e.target.value)}
      >
        <option value="">All Dates</option>

        {uniqueDates.map((price_date) => (
          <option key={price_date} value={price_date}>
            {new Date(price_date).toDateString()}
          </option>
        ))}

      </select>
    </div>

    

    {/* Clear Filters */}
    {(categoryFilter || dateFilter || searchTerm) && (
      <button
        onClick={() => {
          setCategoryFilter("")
          setDateFilter("")
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


      {/* MAIN CONTENT */}
      <div className="flex-1 p-8">

        <h1 className="text-4xl font-extrabold mb-10 text-green-900 ">
          Commodity Price Monitoring
        </h1>

        {isLoading && (
          <p className="text-center text-gray-600">
            Loading commodities...
          </p>
        )}

        {error && (
          <p className="text-center text-red-500">{error}</p>
        )}

        {filteredVegetables.length === 0 && !isLoading && (
          <p className="text-center text-gray-500">
            No commodities found.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        </div>

      </div>

      <VegetableModal
        isOpen={isOpen}
        OnClose={closeModal}
        vegetable={selectedVegetable}
      />

    </div>
  )
}

export default App