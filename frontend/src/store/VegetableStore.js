import { create } from "zustand"
import axios from "axios"
import Swal from "sweetalert2"

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
        error: error.response?.data?.message || "Failed to fetch vegetables",
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

    addCommodity: async (formData) => {

  if (!formData.category_id || !formData.name) {
    Swal.fire({
      icon: "warning",
      title: "Missing Fields",
      text: "Category and Commodity Name are required."
    })

    return { success: false }
  }

  try {

    const response = await axios.post(
      `${BASE_URL}/api/vegetables/commodities`,
      formData
    )

    if (response.data.success) {

      Swal.fire({
        icon: "success",
        title: "Commodity Added",
        text: "New commodity successfully added.",
        timer: 1500,
        showConfirmButton: false
      })

      get().fetchCommodities()

      return response.data
    }

  } catch (error) {

    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Failed to add commodity."
    })

    return {
      success: false,
      message: "Failed to add commodity"
    }
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
  // ADD PRICE RECORD
  // =====================
  addPriceRecord: async (formData) => {

  if (!formData.commodity_id || !formData.market_id || !formData.price_date || !formData.prevailing_price) {

    Swal.fire({
      icon: "warning",
      title: "Missing Fields",
      text: "Please fill all required fields."
    })

    return { success: false }
  }

  try {

    const response = await axios.post(
      `${BASE_URL}/api/vegetables/prices`,
      formData
    )

    if (response.data.success) {

      Swal.fire({
        icon: "success",
        title: "Price Added",
        text: "Price record successfully saved.",
        timer: 1500,
        showConfirmButton: false
      })

      get().fetchVegetables()

      return response.data
    }

  } catch (err) {

    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Failed to add price record."
    })

    return { success: false }
  }
}
}))