// db.js
const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    connectionTimeout: 30000,
    requestTimeout: 30000,
    options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
        abortTransactionOnError: true,
        isolationLevel: sql.ISOLATION_LEVEL.READ_COMMITTED
    }
};

let pool;

async function getConnection() {
    if (!pool) {
        pool = await sql.connect(config);
        // Ejecutar SET XACT_ABORT ON en la conexión
        await pool.request().query('SET XACT_ABORT ON');
    }
    return pool;
}

module.exports = { sql, getConnection };