import { create } from "zustand"
import axios from "axios"
import Swal from "sweetalert2"
import { extractPDF as parsePDF } from "../utils/extractPDF"

const BASE_URL = "http://localhost:5000"
const ANALYTICS = `${BASE_URL}/api/analytics`

export const useVegetableStore = create((set, get) => ({
  vegetables: [],
  markets: [],
  categories: [],
  commodities: [],
  commodityPrices: [],
  isLoading: false,
  error: null,

  // ── Analytics State ────────────────────────────────────────────────────────
  analytics: {
    stats:        null,   // getDashboardStats
    trend:        [],     // getPriceTrend
    avgByMarket:  [],     // getAveragePriceByMarket
    comparison:   [],     // getPriceComparison
    volatility:   [],     // getPriceVolatility
    coverage:     [],     // getMarketCoverage
    matrix:       [],     // getPriceMatrix
  },
  analyticsLoading: {
    stats:       false,
    trend:       false,
    avgByMarket: false,
    comparison:  false,
    volatility:  false,
    coverage:    false,
    matrix:      false,
  },

  // ── Existing Fetches ───────────────────────────────────────────────────────
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
            price_count: item.price_count,
            respondent_count: item.respondent_count,
            markets: {}
          }
        }

        if (item.market_name) {
          grouped[item.commodity_id].markets[item.market_name] = {
            prevailing: item.prevailing_price,
            high: item.high_price,
            low: item.low_price,
            respondent_1: item.respondent_1,
            respondent_2: item.respondent_2,
            respondent_3: item.respondent_3,
            respondent_4: item.respondent_4,
            respondent_5: item.respondent_5,
          }
        }
      })

      set({ vegetables: Object.values(grouped), isLoading: false })
    } catch (error) {
      set({ error: error.response?.data?.message, isLoading: false })
    }
  },

  fetchMarkets: async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/vegetables/markets`)
      set({ markets: response.data.data })
    } catch {
      set({ error: "Failed to fetch markets" })
    }
  },

  fetchCategories: async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/vegetables/categories`)
      set({ categories: response.data.data })
    } catch {
      set({ error: "Failed to fetch categories" })
    }
  },

  fetchCommodities: async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/vegetables/commodities`)
      set({ commodities: response.data.data })
    } catch {
      set({ error: "Failed to fetch commodities" })
    }
  },

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

  // ── Analytics Fetches ──────────────────────────────────────────────────────

  /**
   * Fetches summary dashboard stats:
   * totals, topCommodities[], categoryBreakdown[]
   */
  fetchDashboardStats: async () => {
    set((s) => ({ analyticsLoading: { ...s.analyticsLoading, stats: true } }))
    try {
      const { data } = await axios.get(`${ANALYTICS}/stats`)
      if (data.success) {
        set((s) => ({ analytics: { ...s.analytics, stats: data.data } }))
      }
    } catch (error) {
      console.error("fetchDashboardStats error:", error)
    } finally {
      set((s) => ({ analyticsLoading: { ...s.analyticsLoading, stats: false } }))
    }
  },

  /**
   * Fetches price trend for a single commodity over time.
   * @param {string|number} commodityId
   * @param {object} opts  { market_id?, limit? }
   */
  fetchPriceTrend: async (commodityId, opts = {}) => {
    if (!commodityId) return
    set((s) => ({ analyticsLoading: { ...s.analyticsLoading, trend: true } }))
    try {
      const params = new URLSearchParams({ commodity_id: commodityId, limit: opts.limit ?? 20 })
      if (opts.market_id) params.set("market_id", opts.market_id)
      const { data } = await axios.get(`${ANALYTICS}/trend?${params}`)
      if (data.success) {
        set((s) => ({ analytics: { ...s.analytics, trend: data.data } }))
      }
    } catch (error) {
      console.error("fetchPriceTrend error:", error)
    } finally {
      set((s) => ({ analyticsLoading: { ...s.analyticsLoading, trend: false } }))
    }
  },

  /**
   * Fetches average prevailing/high/low price per market for one commodity.
   * @param {string|number} commodityId
   */
  fetchAvgByMarket: async (commodityId) => {
    if (!commodityId) return
    set((s) => ({ analyticsLoading: { ...s.analyticsLoading, avgByMarket: true } }))
    try {
      const { data } = await axios.get(`${ANALYTICS}/avg-by-market?commodity_id=${commodityId}`)
      if (data.success) {
        set((s) => ({ analytics: { ...s.analytics, avgByMarket: data.data } }))
      }
    } catch (error) {
      console.error("fetchAvgByMarket error:", error)
    } finally {
      set((s) => ({ analyticsLoading: { ...s.analyticsLoading, avgByMarket: false } }))
    }
  },

  /**
   * Fetches the latest prevailing/high/low prices across commodities.
   * @param {object} opts  { market_id?, category_id? }
   */
  fetchPriceComparison: async (opts = {}) => {
    set((s) => ({ analyticsLoading: { ...s.analyticsLoading, comparison: true } }))
    try {
      const params = new URLSearchParams()
      if (opts.market_id)   params.set("market_id",   opts.market_id)
      if (opts.category_id) params.set("category_id", opts.category_id)
      const { data } = await axios.get(`${ANALYTICS}/comparison?${params}`)
      if (data.success) {
        set((s) => ({ analytics: { ...s.analytics, comparison: data.data } }))
      }
    } catch (error) {
      console.error("fetchPriceComparison error:", error)
    } finally {
      set((s) => ({ analyticsLoading: { ...s.analyticsLoading, comparison: false } }))
    }
  },

  /**
   * Fetches most price-volatile commodities ranked by std deviation.
   * @param {object} opts  { market_id?, category_id?, limit? }
   */
  fetchPriceVolatility: async (opts = {}) => {
    set((s) => ({ analyticsLoading: { ...s.analyticsLoading, volatility: true } }))
    try {
      const params = new URLSearchParams({ limit: opts.limit ?? 10 })
      if (opts.market_id)   params.set("market_id",   opts.market_id)
      if (opts.category_id) params.set("category_id", opts.category_id)
      const { data } = await axios.get(`${ANALYTICS}/volatility?${params}`)
      if (data.success) {
        set((s) => ({ analytics: { ...s.analytics, volatility: data.data } }))
      }
    } catch (error) {
      console.error("fetchPriceVolatility error:", error)
    } finally {
      set((s) => ({ analyticsLoading: { ...s.analyticsLoading, volatility: false } }))
    }
  },

  /**
   * Fetches how many commodities and records each market covers.
   */
  fetchMarketCoverage: async () => {
    set((s) => ({ analyticsLoading: { ...s.analyticsLoading, coverage: true } }))
    try {
      const { data } = await axios.get(`${ANALYTICS}/market-coverage`)
      if (data.success) {
        set((s) => ({ analytics: { ...s.analytics, coverage: data.data } }))
      }
    } catch (error) {
      console.error("fetchMarketCoverage error:", error)
    } finally {
      set((s) => ({ analyticsLoading: { ...s.analyticsLoading, coverage: false } }))
    }
  },

  /**
   * Fetches a commodity × market price matrix (latest prices).
   * @param {object} opts  { category_id? }
   */
  fetchPriceMatrix: async (opts = {}) => {
    set((s) => ({ analyticsLoading: { ...s.analyticsLoading, matrix: true } }))
    try {
      const params = new URLSearchParams()
      if (opts.category_id) params.set("category_id", opts.category_id)
      const { data } = await axios.get(`${ANALYTICS}/matrix?${params}`)
      if (data.success) {
        set((s) => ({ analytics: { ...s.analytics, matrix: data.data } }))
      }
    } catch (error) {
      console.error("fetchPriceMatrix error:", error)
    } finally {
      set((s) => ({ analyticsLoading: { ...s.analyticsLoading, matrix: false } }))
    }
  },

  // ── Mutations ──────────────────────────────────────────────────────────────

  addCommodity: async (formData, silent = false) => {
    if (!formData.category_id || !formData.name) {
      if (!silent) {
        Swal.fire({ icon: "warning", title: "Missing Fields", text: "Category and Commodity Name are required." })
      }
      return { success: false }
    }

    try {
      const response = await axios.post(`${BASE_URL}/api/vegetables/commodities`, formData)

      if (response.data.success) {
        if (!silent) {
          Swal.fire({ icon: "success", title: "Commodity Added", text: "New commodity successfully added.", timer: 1500, showConfirmButton: false })
        }
        get().fetchCommodities()
        return response.data
      }
    } catch (error) {
      if (!silent) {
        Swal.fire({ icon: "error", title: "Error", text: "Failed to add commodity." })
      }
      return { success: false, message: "Failed to add commodity" }
    }
  },

  addCategory: async (name) => {
    try {
      const response = await axios.post(`${BASE_URL}/api/vegetables/categories`, { name })
      if (response.data.success) {
        await get().fetchCategories()
        return response.data
      }
      return { success: false }
    } catch (error) {
      console.error("Add Category Error:", error)
      return { success: false }
    }
  },

  addMarket: async (name, city = "") => {
    try {
      const response = await axios.post(`${BASE_URL}/api/vegetables/markets`, 
        { name : name.toUpperCase()+" MARKET", 
          city: city })

      if (response.data.success) {
        await get().fetchMarkets()
        return response.data
      }
      return { success: false }
    } catch (error) {
      console.error("Add Market Error:", error)
      return { success: false }
    }
  },

  addPriceRecord: async (formData, silent = false) => {
    if (!formData.commodity_id || !formData.market_id || !formData.price_date) {
      if (!silent) {
        Swal.fire({ icon: "warning", title: "Missing Fields", text: "Commodity, market, and date are required." })
      }
      return { success: false }
    }

    try {
      const response = await axios.post(`${BASE_URL}/api/vegetables/prices`, formData)

      if (response.data.success) {
        if (!silent) {
          Swal.fire({ icon: "success", title: "Price Added", text: "Price record successfully saved.", timer: 1500, showConfirmButton: false })
        }
        get().fetchVegetables()
        return response.data
      }
    } catch (err) {
      if (err.response?.status === 409) {
        return { success: false, duplicate: true }
      }
      if (!silent) {
        Swal.fire({ icon: "error", title: "Error", text: "Failed to add price record." })
      }
      return { success: false }
    }
  },

  updateCommodity: async (id, formData) => {
    try {
      const response = await axios.put(`${BASE_URL}/api/vegetables/commodities/${id}`, formData)
      if (response.data.success) {
        Swal.fire({ icon: "success", title: "Updated", text: "Commodity updated successfully.", timer: 1500, showConfirmButton: false })
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

  deleteCommodity: async (id) => {
    try {
      const response = await axios.delete(`${BASE_URL}/api/vegetables/commodities/${id}`)
      if (response.data.success) {
        Swal.fire({ icon: "success", title: "Deleted", text: "Commodity deleted successfully.", timer: 1500, showConfirmButton: false })
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