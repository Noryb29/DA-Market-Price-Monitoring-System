import express from 'express'
import { addCommodity, addPriceRecord, getCategories, getCommodities, getCommodityPrices, getLatestPrices, getMarkets, getVegetables, importFormRecords } from '../controllers/VegetableControllers.js'

export const VegetableRouter = express.Router()

VegetableRouter.get("/",getVegetables)
VegetableRouter.get("/markets",getMarkets)
VegetableRouter.get("/categories",getCategories)
VegetableRouter.get("/commodities",getCommodities)
VegetableRouter.get("/commodity/:id/prices", getCommodityPrices)
VegetableRouter.post("/commodities",addCommodity)
VegetableRouter.post("/prices",addPriceRecord)
VegetableRouter.get("/prices/lates",getLatestPrices)
VegetableRouter.post("/import", importFormRecords)

