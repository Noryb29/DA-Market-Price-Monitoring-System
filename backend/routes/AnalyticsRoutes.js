import express from "express"
import {
  getPriceTrend,
  getAveragePriceByMarket,
  getPriceComparison,
  getPriceVolatility,
  getMarketCoverage,
  getDashboardStats,
  getPriceMatrix,
} from "../controllers/AnalyticsControllers.js"

const AnalyticsRoutes = express.Router()

AnalyticsRoutes.get("/trend",        getPriceTrend)           // ?commodity_id=&market_id=&limit=
AnalyticsRoutes.get("/avg-by-market",getAveragePriceByMarket) // ?commodity_id=
AnalyticsRoutes.get("/comparison",   getPriceComparison)      // ?market_id=&category_id=
AnalyticsRoutes.get("/volatility",   getPriceVolatility)      // ?market_id=&category_id=&limit=
AnalyticsRoutes.get("/market-coverage", getMarketCoverage)    //
AnalyticsRoutes.get("/stats",        getDashboardStats)       //
AnalyticsRoutes.get("/matrix",       getPriceMatrix)          // ?category_id=

export default AnalyticsRoutes