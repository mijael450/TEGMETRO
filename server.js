// server.js
const express = require('express');
const path = require('path');
const { sql, getConnection } = require('./db');
require('dotenv').config();

const app = express();

// Middleware para servir archivos estáticos
app.use(express.static('public'));

// Middleware para parsear JSON y form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// RUTAS PARA SERVIR LOS HTML
// ============================================

// Ruta raíz - redirige al login
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// El resto de archivos HTML se sirven automáticamente desde /public
// Ejemplos:
// http://localhost:3000/login.html
// http://localhost:3000/index.html

// ============================================
// AQUÍ IRÁN TUS APIs (más adelante)
// ============================================


// ============================================
// API PARA EL INICIO DE SESION
// ============================================

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Usuario admin hardcodeado
        if (username === 'admin' && password === 'admin123') {
            return res.json({
                success: true,
                user: {
                    username: 'admin',
                    nombre: 'Administrador del Sistema',
                    role: 'Administrador',
                    sucursal: 'Quito'
                }
            });
        }
        
        // Validar contraseña genérica
        if (password !== '123') {
            return res.status(401).json({
                success: false,
                error: 'Contraseña incorrecta'
            });
        }
        
        const pool = await getConnection();
        
        // Buscar en Vendedores
        const vendedorResult = await pool.request()
            .input('cedula', sql.VarChar(20), username)
            .query(`
                SELECT vendedor_id as id, nombre, cedula_ruc as cedula, sucursal, 'Vendedor' as role
                FROM vw_Vendedor
                WHERE cedula_ruc = @cedula
            `);
        
        if (vendedorResult.recordset.length > 0) {
            const user = vendedorResult.recordset[0];
            return res.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.cedula,
                    nombre: user.nombre,
                    role: user.role,
                    sucursal: user.sucursal
                }
            });
        }
        
        // Buscar en Técnicos
        const tecnicoResult = await pool.request()
            .input('cedula', sql.VarChar(20), username)
            .query(`
                SELECT tecnico_id as id, nombre, cedula, sucursal, 'Técnico' as role
                FROM vw_Tecnico 
                WHERE cedula = @cedula
            `);
        
        if (tecnicoResult.recordset.length > 0) {
            const user = tecnicoResult.recordset[0];
            return res.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.cedula,
                    nombre: user.nombre,
                    role: user.role,
                    sucursal: user.sucursal
                }
            });
        }
        
        // Usuario no encontrado
        return res.status(404).json({
            success: false,
            error: 'Usuario no encontrado'
        });
        
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            error: 'Error al autenticar usuario'
        });
    }
});


// ============================================
// API PARA CLIENTES
// ============================================
app.get('/api/clientes', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .query("SELECT * FROM vw_Cliente WHERE sucursal='Quito' ORDER BY cliente_id");
        
        res.json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// API PARA EQUIPOS
// ============================================
app.get('/api/equipos', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .query(`
                SELECT 
                    e.equipo_id,
                    e.nombre,
                    e.codigo_interno,
                    e.marca,
                    e.modelo,
                    e.serie,
                    e.cliente_id,
                    c.nombre as cliente_nombre,
                    a.nombre as area_nombre,
                    e.sucursal
                FROM vw_EquipoCliente e
                LEFT JOIN vw_Cliente c 
                    ON e.cliente_id = c.cliente_id AND e.sucursal = c.sucursal
                LEFT JOIN AreaTecnica a 
                    ON e.area_id = a.area_id
                WHERE e.sucursal='Quito'
                ORDER BY e.equipo_id
            `);
        
        res.json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('Error al obtener equipos:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


// ============================================
// API PARA CALIBRACIONES
// ============================================
app.get('/api/calibraciones', async (req, res) => {
    try {
        const pool = await getConnection();

        const result = await pool.request().query(`
            SELECT 
                c.calibracion_id,
                c.fecha_inicio,
                c.resultado,
                c.sucursal,

                eq.nombre AS equipo_nombre,
                cli.nombre AS cliente_nombre,
                tec.nombre AS tecnico_nombre

            FROM vw_Calibracion c

            INNER JOIN vw_EquipoCliente eq
                ON c.equipo_id = eq.equipo_id
                AND c.sucursal = eq.sucursal

            INNER JOIN vw_Tecnico tec
                ON c.tecnico_id = tec.tecnico_id
                AND c.sucursal = tec.sucursal

            INNER JOIN vw_Oferta o
                ON c.oferta_id = o.oferta_id
                AND c.sucursal = o.sucursal

            INNER JOIN vw_Cliente cli
                ON o.cliente_id = cli.cliente_id
                AND o.sucursal = cli.sucursal

            WHERE c.sucursal = 'Quito'
            ORDER BY c.calibracion_id
        `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Error al obtener calibraciones:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


// ============================================
// MANEJO DE ERRORES 404
// ============================================
app.use((req, res) => {
    res.status(404).send('Página no encontrada');
});

// ============================================
// INICIAR SERVIDOR
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('===========================================');
    console.log('🚀 Servidor iniciado exitosamente');
    console.log('===========================================');
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`📁 Archivos estáticos desde: /public`);
    console.log('');
    console.log('🔗 Rutas disponibles:');
    console.log(`   - http://localhost:${PORT}/login.html`);
    console.log(`   - http://localhost:${PORT}/index.html`);
    console.log(`   - http://localhost:${PORT}/api/test (prueba)`);
    console.log('===========================================');
});