import mysql from "mysql2/promise"

export const db = mysql.createPool({
  host: "localhost",
  user: "root",
  database:"marketprice",
  password: "",
  waitForConnections: true,
  connectionLimit: 10
})

export const initializeDb = async () => {
  try {

    // MARKETS
    await db.query(`
      CREATE TABLE IF NOT EXISTS markets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        city VARCHAR(100) NOT NULL
      )
    `)

    // CATEGORIES
    await db.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL
      )
    `)

    // COMMODITIES
    await db.query(`
      CREATE TABLE IF NOT EXISTS commodities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_id INT NOT NULL,
        name VARCHAR(150) NOT NULL,
        specification VARCHAR(150),
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `)

    // PRICE RECORDS
    await db.query(`
      CREATE TABLE IF NOT EXISTS price_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        commodity_id INT NOT NULL,
        market_id INT NOT NULL,
        price_date DATE NOT NULL,
        prevailing_price DECIMAL(10,2),
        high_price DECIMAL(10,2),
        low_price DECIMAL(10,2),
        FOREIGN KEY (commodity_id) REFERENCES commodities(id),
        FOREIGN KEY (market_id) REFERENCES markets(id)
      )
    `)

    console.log("Database tables initialized successfully")

  } catch (error) {
    console.error("Database initialization failed:", error)
  }
}