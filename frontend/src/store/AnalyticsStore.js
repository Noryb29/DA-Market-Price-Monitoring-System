import { create } from "zustand"
import axios from "axios"

const BASE_URL = "http://localhost:5000"

export const useAnalyticsStore = create((set) => ({

  analytics: {
    stats:       { totals: null, topCommodities: [], categoryBreakdown: [] },
    trend:       [],
    avgByMarket: [],
    comparison:  [],
    // volatility:  [],
    // coverage:    [],
  },

  analyticsLoading: {
    stats:       false,
    trend:       false,
    avgByMarket: false,
    comparison:  false,
    // volatility:  false,
    // coverage:    false,
  },

  // =====================
  // FETCH DASHBOARD STATS
  // =====================
  fetchDashboardStats: async () => {
    set((s) => ({ analyticsLoading: { ...s.analyticsLoading, stats: true } }))
    try {
      const response = await axios.get(`${BASE_URL}/api/analytics/stats`)
      set((s) => ({
        analytics: { ...s.analytics, stats: response.data.data },
        analyticsLoading: { ...s.analyticsLoading, stats: false },
      }))
    } catch (err) {
      console.error("fetchDashboardStats error:", err)
      set((s) => ({ analyticsLoading: { ...s.analyticsLoading, stats: false } }))
    }
  },

  // =====================
  // FETCH PRICE TREND
  // =====================
  fetchPriceTrend: async (commodityId, { market_id } = {}) => {
    set((s) => ({ analyticsLoading: { ...s.analyticsLoading, trend: true } }))
    try {
      const params = { commodity_id: commodityId }
      if (market_id) params.market_id = market_id
      const response = await axios.get(
        `${BASE_URL}/api/analytics/trend`,
        { params }
      )
      set((s) => ({
        analytics: { ...s.analytics, trend: response.data.data ?? [] },
        analyticsLoading: { ...s.analyticsLoading, trend: false },
      }))
    } catch (err) {
      console.error("fetchPriceTrend error:", err)
      set((s) => ({
        analytics: { ...s.analytics, trend: [] },
        analyticsLoading: { ...s.analyticsLoading, trend: false },
      }))
    }
  },

  // =====================
  // FETCH AVG PRICE BY MARKET
  // =====================
  fetchAvgByMarket: async (commodityId) => {
    set((s) => ({ analyticsLoading: { ...s.analyticsLoading, avgByMarket: true } }))
    try {
      const response = await axios.get(
        `${BASE_URL}/api/analytics/avg-by-market`,
        { params: { commodity_id: commodityId } }
      )
      set((s) => ({
        analytics: { ...s.analytics, avgByMarket: response.data.data ?? [] },
        analyticsLoading: { ...s.analyticsLoading, avgByMarket: false },
      }))
    } catch (err) {
      console.error("fetchAvgByMarket error:", err)
      set((s) => ({
        analytics: { ...s.analytics, avgByMarket: [] },
        analyticsLoading: { ...s.analyticsLoading, avgByMarket: false },
      }))
    }
  },

  // =====================
  // FETCH PRICE COMPARISON
  // =====================
  fetchPriceComparison: async ({ market_id, category_id } = {}) => {
    set((s) => ({ analyticsLoading: { ...s.analyticsLoading, comparison: true } }))
    try {
      const params = {}
      if (market_id)   params.market_id   = market_id
      if (category_id) params.category_id = category_id
      const response = await axios.get(
        `${BASE_URL}/api/analytics/comparison`,
        { params }
      )
      set((s) => ({
        analytics: { ...s.analytics, comparison: response.data.data ?? [] },
        analyticsLoading: { ...s.analyticsLoading, comparison: false },
      }))
    } catch (err) {
      console.error("fetchPriceComparison error:", err)
      set((s) => ({
        analytics: { ...s.analytics, comparison: [] },
        analyticsLoading: { ...s.analyticsLoading, comparison: false },
      }))
    }
  },

//   // =====================
//   // FETCH PRICE VOLATILITY
//   // =====================
//   fetchPriceVolatility: async ({ market_id, category_id } = {}) => {
//     set((s) => ({ analyticsLoading: { ...s.analyticsLoading, volatility: true } }))
//     try {
//       const params = {}
//       if (market_id)   params.market_id   = market_id
//       if (category_id) params.category_id = category_id
//       const response = await axios.get(
//         `${BASE_URL}/api/analytics/volatility`,
//         { params }
//       )
//       set((s) => ({
//         analytics: { ...s.analytics, volatility: response.data.data ?? [] },
//         analyticsLoading: { ...s.analyticsLoading, volatility: false },
//       }))
//     } catch (err) {
//       console.error("fetchPriceVolatility error:", err)
//       set((s) => ({
//         analytics: { ...s.analytics, volatility: [] },
//         analyticsLoading: { ...s.analyticsLoading, volatility: false },
//       }))
//     }
//   },

//   // =====================
//   // FETCH MARKET COVERAGE
//   // =====================
//   fetchMarketCoverage: async () => {
//     set((s) => ({ analyticsLoading: { ...s.analyticsLoading, coverage: true } }))
//     try {
//       const response = await axios.get(`${BASE_URL}/api/analytics/market-coverage`)
//       set((s) => ({
//         analytics: { ...s.analytics, coverage: response.data.data ?? [] },
//         analyticsLoading: { ...s.analyticsLoading, coverage: false },
//       }))
//     } catch (err) {
//       console.error("fetchMarketCoverage error:", err)
//       set((s) => ({
//         analytics: { ...s.analytics, coverage: [] },
//         analyticsLoading: { ...s.analyticsLoading, coverage: false },
//       }))
//     }
//   },

}))