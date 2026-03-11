import express from 'express'
import cors from 'cors'
import { VegetableRouter } from './routes/VegetableRoutes.js';

const app = express();
app.use(express.json())
app.use(cors())

app.get('/',(req,res) =>{
    res.send("WORKINg")
})

app.use('/api/vegetables/',VegetableRouter)

app.listen(5000,()=>{
    console.log("Server is running at http://localhost:5000")
})

