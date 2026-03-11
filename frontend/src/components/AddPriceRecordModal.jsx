import React, { useState, useEffect, forwardRef } from "react"
import { useVegetableStore } from "../store/VegetableStore.js"
import { IoCloseCircle, IoCalendar } from "react-icons/io5"
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"

// This allows the DatePicker to use your existing Tailwind input styling
const CustomInput = forwardRef(({ value, onClick }, ref) => (
  <div className="relative cursor-pointer" onClick={onClick} ref={ref}>
    <input
      readOnly
      value={value}
      className="border p-2 w-full rounded text-gray-800 focus:ring-2 focus:ring-green-400 focus:border-green-400 cursor-pointer"
    />
    <IoCalendar className="absolute right-3 top-2.5 text-gray-400" size={18} />
  </div>
));

const AddPriceRecordModal = ({ isOpen, OnClose }) => {
  const {
    addPriceRecord,
    commodities,
    markets,
    fetchCommodities,
    fetchMarkets
  } = useVegetableStore()

  const [form, setForm] = useState({
    commodity_id: "",
    market_id: "",
    price_date: new Date(), // Set default to today
    prevailing_price: "",
    high_price: "",
    low_price: ""
  })

  useEffect(() => {
    if (isOpen) {
      fetchCommodities()
      fetchMarkets()
    }
  }, [isOpen])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // Handle the Date object specifically
  const handleDateChange = (date) => {
    setForm({ ...form, price_date: date })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Convert Date object to YYYY-MM-DD for the backend
    const submissionData = {
      ...form,
      price_date: form.price_date.toISOString().split('T')[0]
    }
    addPriceRecord(submissionData)
    OnClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white p-6 rounded-xl w-96 shadow-lg relative">
        
        <IoCloseCircle
          onClick={OnClose}
          size={28}
          color="black"
          className="absolute top-4 right-4 cursor-pointer"
        />

        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Add Price Record
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Commodity Dropdown (Keep Original) */}
          <div>
            <label className="block text-gray-700 text-sm mb-1">Commodity</label>
            <select
              name="commodity_id"
              className="border p-2 w-full rounded text-gray-800 focus:ring-2 focus:ring-green-400"
              value={form.commodity_id}
              onChange={handleChange}
            >
              <option value="">Select Commodity</option>
              {commodities.map((commodity) => (
                <option key={commodity.id} value={commodity.id}>
                  {commodity.name} {commodity.category ? `(${commodity.category})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Market Dropdown (Keep Original) */}
          <div>
            <label className="block text-gray-700 text-sm mb-1">Market</label>
            <select
              name="market_id"
              className="border p-2 w-full rounded text-gray-800 focus:ring-2 focus:ring-green-400"
              value={form.market_id}
              onChange={handleChange}
            >
              <option value="">Select Market</option>
              {markets.map((market) => (
                <option key={market.id} value={market.id}>{market.name}</option>
              ))}
            </select>
          </div>

          {/* Advanced Date Picker Section */}
          <div>
            <label className="block text-gray-700 text-sm mb-1">Date</label>
            <DatePicker
              selected={form.price_date}
              onChange={handleDateChange}
              customInput={<CustomInput />} // Uses the Tailwind styled input above
              dateFormat="MMMM d, yyyy"    // Shows "March 11, 2026"
              maxDate={new Date()}         // Cannot select future dates
              showMonthDropdown            // Quick month select
              showYearDropdown             // Quick year select
              dropdownMode="select"        // Makes dropdowns easier to use
              todayButton="Go to Today"    // Quick reset button
            />
          </div>

          {/* Prices (Keep Original) */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-gray-700 text-sm mb-1">Prevailing</label>
              <input
                name="prevailing_price"
                placeholder="₱"
                className="border p-2 w-full rounded text-gray-800 focus:ring-2 focus:ring-green-400"
                value={form.prevailing_price}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm mb-1">High</label>
              <input
                name="high_price"
                placeholder="₱"
                className="border p-2 w-full rounded text-gray-800 focus:ring-2 focus:ring-green-400"
                value={form.high_price}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm mb-1">Low</label>
              <input
                name="low_price"
                placeholder="₱"
                className="border p-2 w-full rounded text-gray-800 focus:ring-2 focus:ring-green-400"
                value={form.low_price}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={OnClose} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddPriceRecordModal