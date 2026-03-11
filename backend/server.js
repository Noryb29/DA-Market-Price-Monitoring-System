import express from 'express'
import cors from 'cors'
import { VegetableRouter } from './routes/VegetableRoutes.js';
import { initializeDb } from './db.js';

const app = express();
app.use(express.json())
app.use(cors())

app.get('/',(req,res) =>{
    res.send("WORKINg")
})

app.use('/api/vegetables/',VegetableRouter)

const run = async () => {
    try {
        await initializeDb(); 
        console.log("Database initialized...");

        app.listen(5000, () => {
            console.log("Server is running at http://localhost:5000");
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1); 
    }
};

run();


