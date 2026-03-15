import { create } from "zustand"
import axios from "axios"
import Swal from "sweetalert2"
import { extractPDF as parsePDF } from "../utils/extractPDF"

const BASE_URL = "http://localhost:5000"

export const useVegetableStore = create((set, get) => ({
  vegetables: [],
  markets: [],
  categories: [],
  commodities: [],
  commodityPrices: [],
  isLoading: false,
  error: null,

  // =====================
  // FETCH VEGETABLES
  // =====================
  fetchVegetables: async () => {
    set({ isLoading: true, error: null })

    try {
      const response = await axios.get(`${BASE_URL}/api/vegetables`)

      const grouped = {}

      response.data.data.forEach((item) => {
        if (!grouped[item.commodity_id]) {
          grouped[item.commodity_id] = {
            id: item.commodity_id,
            name: item.name,
            specification: item.specification,
            categories: item.category,
            price_date: item.price_date,
            markets: {}
          }
        }

        grouped[item.commodity_id].markets[item.market_name] = {
          prevailing: item.prevailing_price,
          high: item.high_price,
          low: item.low_price
        }
      })

      set({
        vegetables: Object.values(grouped),
        isLoading: false
      })

    } catch (error) {
      set({
        error: error.response?.data?.message,
        isLoading: false
      })
    }
  },

  // =====================
  // FETCH MARKETS
  // =====================
  fetchMarkets: async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/vegetables/markets`)
      set({ markets: response.data.data })
    } catch {
      set({ error: "Failed to fetch markets" })
    }
  },

  // =====================
  // FETCH CATEGORIES
  // =====================
  fetchCategories: async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/vegetables/categories`)
      set({ categories: response.data.data })
    } catch {
      set({ error: "Failed to fetch categories" })
    }
  },

  // =====================
  // FETCH COMMODITIES
  // =====================
  fetchCommodities: async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/vegetables/commodities`)
      set({ commodities: response.data.data })
    } catch {
      set({ error: "Failed to fetch commodities" })
    }
  },

  // =====================
  // FETCH COMMODITY PRICE HISTORY
  // =====================
  fetchCommodityPrices: async (commodityId) => {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/vegetables/commodity/${commodityId}/prices`
      )
      set({ commodityPrices: response.data.data })
      return response.data.data
    } catch (error) {
      console.error("Failed to fetch commodity prices")
      return []
    }
  },

  // =====================
  // ADD COMMODITY
  // silent = true skips Swal alerts (used during bulk Excel import)
  // =====================
  addCommodity: async (formData, silent = false) => {
    if (!formData.category_id || !formData.name) {
      if (!silent) {
        Swal.fire({
          icon: "warning",
          title: "Missing Fields",
          text: "Category and Commodity Name are required."
        })
      }
      return { success: false }
    }

    try {
      const response = await axios.post(
        `${BASE_URL}/api/vegetables/commodities`,
        formData
      )

      if (response.data.success) {
        if (!silent) {
          Swal.fire({
            icon: "success",
            title: "Commodity Added",
            text: "New commodity successfully added.",
            timer: 1500,
            showConfirmButton: false
          })
        }
        get().fetchCommodities()
        return response.data // { success: true, id: insertId }
      }

    } catch (error) {
      if (!silent) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to add commodity."
        })
      }
      return { success: false, message: "Failed to add commodity" }
    }
  },

  // =====================
  // ADD CATEGORY
  // =====================
  addCategory: async (name) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/api/vegetables/categories`,
        { name }
      )
      if (response.data.success) {
        await get().fetchCategories()
        return response.data // { success: true, id: number }
      }
      return { success: false }
    } catch (error) {
      console.error("Add Category Error:", error)
      return { success: false }
    }
  },

  // =====================
  // ADD MARKET
  // =====================
  addMarket: async (name, city = "") => {
    try {
      const response = await axios.post(
        `${BASE_URL}/api/vegetables/markets`,
        { name, city }
      )
      if (response.data.success) {
        await get().fetchMarkets()
        return response.data // { success: true, id: number }
      }
      return { success: false }
    } catch (error) {
      console.error("Add Market Error:", error)
      return { success: false }
    }
  },

  // =====================
  // ADD PRICE RECORD
  // silent = true skips Swal alerts (used during bulk Excel import)
  // =====================
  addPriceRecord: async (formData, silent = false) => {
    if (!formData.commodity_id || !formData.market_id || !formData.price_date || !formData.prevailing_price) {
      if (!silent) {
        Swal.fire({
          icon: "warning",
          title: "Missing Fields",
          text: "Please fill all required fields."
        })
      }
      return { success: false }
    }

    try {
      const response = await axios.post(
        `${BASE_URL}/api/vegetables/prices`,
        formData
      )

      if (response.data.success) {
        if (!silent) {
          Swal.fire({
            icon: "success",
            title: "Price Added",
            text: "Price record successfully saved.",
            timer: 1500,
            showConfirmButton: false
          })
        }
        get().fetchVegetables()
        return response.data
      }

    } catch (err) {
      // 409 = duplicate record for that date
      if (err.response?.status === 409) {
        return { success: false, duplicate: true }
      }
      if (!silent) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to add price record."
        })
      }
      return { success: false }
    }
  },

  // =====================
  // UPDATE COMMODITY
  // =====================
  updateCommodity: async (id, formData) => {
    try {
      const response = await axios.put(
        `${BASE_URL}/api/vegetables/commodities/${id}`,
        formData
      )
      if (response.data.success) {
        Swal.fire({
          icon: "success",
          title: "Updated",
          text: "Commodity updated successfully.",
          timer: 1500,
          showConfirmButton: false
        })
        get().fetchVegetables()
        get().fetchCommodities()
        return response.data
      }
      return { success: false }
    } catch (error) {
      Swal.fire({ icon: "error", title: "Error", text: "Failed to update commodity." })
      return { success: false }
    }
  },

  // =====================
  // DELETE COMMODITY
  // =====================
  deleteCommodity: async (id) => {
    try {
      const response = await axios.delete(
        `${BASE_URL}/api/vegetables/commodities/${id}`
      )
      if (response.data.success) {
        Swal.fire({
          icon: "success",
          title: "Deleted",
          text: "Commodity deleted successfully.",
          timer: 1500,
          showConfirmButton: false
        })
        get().fetchVegetables()
        get().fetchCommodities()
        return response.data
      }
      return { success: false }
    } catch (error) {
      Swal.fire({ icon: "error", title: "Error", text: "Failed to delete commodity." })
      return { success: false }
    }
  },
  extractPDF: async (file) => {
  return await parsePDF(file)
}

}))