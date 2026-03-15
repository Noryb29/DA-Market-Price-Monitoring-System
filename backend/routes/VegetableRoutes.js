import express from 'express'
import { addCategory, addCommodity, addMarket, addPriceRecord, deleteCommodity, getCategories, getCommodities, getCommodityPrices, getLatestPrices, getMarkets, getVegetables, updateCommodity } from '../controllers/VegetableControllers.js'

export const VegetableRouter = express.Router()

// GET
VegetableRouter.get("/",getVegetables)
VegetableRouter.get("/markets",getMarkets)
VegetableRouter.get("/categories",getCategories)
VegetableRouter.get("/commodities",getCommodities)
VegetableRouter.get("/commodity/:id/prices", getCommodityPrices)
VegetableRouter.get("/prices/lates",getLatestPrices)

// POST
VegetableRouter.post("/commodities",addCommodity)
VegetableRouter.post("/prices",addPriceRecord)
VegetableRouter.post("/categories",addCategory)
VegetableRouter.post("/markets",addMarket)

// UPDATE

VegetableRouter.put("/commodities/:id",updateCommodity)
VegetableRouter.delete("/commodities/:id",deleteCommodity)

