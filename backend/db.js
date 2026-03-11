import mysql from 'mysql2/promise'

export const db = mysql.createPool({
    host:'localhost',
    database:'marketprice',
    user:'root',
    password:''
})