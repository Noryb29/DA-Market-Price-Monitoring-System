import express from "express"
import cors from "cors"
import { VegetableRouter } from "./routes/VegetableRoutes.js"
import { initializeDb } from "./db.js"
import dotenv from 'dotenv'

dotenv.config()


const LOCAL_PORT = process.env.PORT || 5000
const app = express()

app.use(cors())

app.use(express.json())
app.use(express.urlencoded({ limit: "50mb", extended: true }))

app.get("/", (req, res) => {
  res.send("WORKING")
})

app.use("/api/vegetables", VegetableRouter)

const run = async () => {
  try {
    await initializeDb()
    console.log("Database initialized...")
    app.listen(LOCAL_PORT, () => {
      console.log(`Server is running at http://localhost:${LOCAL_PORT}`)
    })
  } catch (error) {
    console.error("Failed to start server:", error)
    process.exit(1)
  }
}

run()