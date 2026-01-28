// test-connection.js
const sql = require('mssql');
require('dotenv').config();

// Configuración de conexión
const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true
    }
};

console.log('===========================================');
console.log('🧪 PRUEBA DE CONEXIÓN A SQL SERVER');
console.log('===========================================\n');

console.log('📝 Configuración:');
console.log('   - Servidor:', config.server);
console.log('   - Base de datos:', config.database);
console.log('   - Usuario:', config.user);
console.log('   - Contraseña:', config.password ? '***' : '(vacía)');
console.log('\n⏳ Intentando conectar...\n');

async function testConnection() {
    try {
        // Intentar conectar
        const pool = await sql.connect(config);
        console.log('✅ ¡CONEXIÓN EXITOSA!\n');

        // Probar una consulta simple
        console.log('🔍 Probando consulta simple...');
        const result = await pool.request().query('SELECT @@VERSION as version');
        console.log('✅ Consulta exitosa\n');
        console.log('📊 Versión de SQL Server:');
        console.log(result.recordset[0].version);

        // Listar tablas de la base de datos
        console.log('\n📋 Tablas en la base de datos:');
        const tables = await pool.request().query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE' 
            ORDER BY TABLE_NAME
        `);
        
        tables.recordset.forEach((table, index) => {
            console.log(`   ${index + 1}. ${table.TABLE_NAME}`);
        });

        // Probar vista global
        console.log('\n🔍 Probando vista global vw_Cliente...');
        try {
            const clientes = await pool.request().query('SELECT COUNT(*) as total FROM vw_Cliente');
            console.log(`✅ Vista funciona correctamente. Total clientes: ${clientes.recordset[0].total}`);
        } catch (error) {
            console.log('⚠️  Vista vw_Cliente no existe aún. Necesitas crearla.');
        }

        // Cerrar conexión
        await pool.close();
        console.log('\n✅ Conexión cerrada correctamente');
        console.log('===========================================');
        
    } catch (error) {
        console.error('❌ ERROR DE CONEXIÓN:\n');
        console.error('Tipo de error:', error.code || 'Desconocido');
        console.error('Mensaje:', error.message);
        console.error('\n💡 POSIBLES SOLUCIONES:');
        
        if (error.code === 'ELOGIN') {
            console.error('   1. Verifica que el usuario y contraseña sean correctos');
            console.error('   2. Verifica que el usuario tenga permisos en la base de datos');
            console.error('   3. Si usas autenticación de Windows, deja usuario/password vacíos');
        } else if (error.code === 'ESOCKET') {
            console.error('   1. Verifica que SQL Server esté corriendo');
            console.error('   2. Verifica el nombre del servidor (ejemplo: localhost\\SQLEXPRESS)');
            console.error('   3. Verifica que el puerto 1433 esté abierto');
            console.error('   4. Activa TCP/IP en SQL Server Configuration Manager');
        } else if (error.code === 'ENOTFOUND') {
            console.error('   1. El servidor no fue encontrado');
            console.error('   2. Verifica el nombre del servidor en .env');
        }
        
        console.error('===========================================');
        process.exit(1);
    }
}

testConnection();