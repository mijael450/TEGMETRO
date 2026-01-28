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
// APPI´S
// ============================================



// ============================================
// API PARA LOGIN
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

        // ============================
        // QUERIES LOCAL / DISTRIBUIDO
        // ============================

        const localVendedor = `
            SELECT 
                vendedor_id AS id,
                nombre,
                cedula_ruc AS cedula,
                sucursal,
                'Vendedor' AS role
            FROM Vendedor_Quito
            WHERE cedula_ruc = @cedula
        `;

        const distribuidoVendedor = `
            SELECT 
                vendedor_id AS id,
                nombre,
                cedula_ruc AS cedula,
                sucursal,
                'Vendedor' AS role
            FROM vw_Vendedor
            WHERE cedula_ruc = @cedula
        `;

        const localTecnico = `
            SELECT 
                tecnico_id AS id,
                nombre,
                cedula,
                sucursal,
                'Técnico' AS role
            FROM Tecnico_Quito
            WHERE cedula = @cedula
        `;

        const distribuidoTecnico = `
            SELECT 
                tecnico_id AS id,
                nombre,
                cedula,
                sucursal,
                'Técnico' AS role
            FROM vw_Tecnico
            WHERE cedula = @cedula
        `;

        // ============================
        // MODO PRÁCTICA: CONSULTAS LOCALES
        // ============================

        // Buscar en Vendedores
        const vendedorResult = await pool.request()
            .input('cedula', sql.VarChar(20), username)
            .query(localVendedor);

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
            .query(localTecnico);

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

    const local = `
        SELECT 
            cliente_id,
            nombre,
            cedula_ruc,
            telefono,
            direccion,
            correo,
            sucursal
        FROM Cliente_Quito
        WHERE sucursal = 'Quito'
        ORDER BY cliente_id
    `;

    const distribuido = `
        SELECT 
            cliente_id,
            nombre,
            cedula_ruc,
            telefono,
            direccion,
            correo,
            sucursal
        FROM vw_Cliente
        WHERE sucursal = 'Quito'
        ORDER BY cliente_id
    `;

    try {
        const pool = await getConnection();

        // Modo práctica: usa consulta local
        const result = await pool.request().query(local);

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

    const local = `
        SELECT 
            ev.equipo_id,
            ev.nombre,
            ev.codigo_interno,

            et.marca,
            et.modelo,
            et.serie,
            et.cliente_id,

            c.nombre AS cliente_nombre,
            a.nombre AS area_nombre,

            ev.sucursal

        FROM EquipoCliente_ventas_Quito ev

        INNER JOIN EquipoCliente_tecnico_Quito et
            ON ev.equipo_id = et.equipo_id
            AND ev.sucursal = et.sucursal

        LEFT JOIN Cliente_Quito c
            ON et.cliente_id = c.cliente_id
            AND et.sucursal = c.sucursal

        LEFT JOIN AreaTecnica a
            ON et.area_id = a.area_id

        WHERE ev.sucursal = 'Quito'
        ORDER BY ev.equipo_id
    `;

    const distribuido = `
        SELECT 
            e.equipo_id,
            e.nombre,
            e.codigo_interno,
            e.marca,
            e.modelo,
            e.serie,
            e.cliente_id,

            c.nombre AS cliente_nombre,
            a.nombre AS area_nombre,

            e.sucursal

        FROM vw_EquipoCliente e

        LEFT JOIN vw_Cliente c 
            ON e.cliente_id = c.cliente_id 
            AND e.sucursal = c.sucursal

        LEFT JOIN AreaTecnica a 
            ON e.area_id = a.area_id

        WHERE e.sucursal = 'Quito'
        ORDER BY e.equipo_id
    `;

    try {
        const pool = await getConnection();

        // Modo práctica: usa consulta local
        const result = await pool.request().query(local);

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

    const local = `
        SELECT 
            c.calibracion_id,
            c.fecha_inicio,
            c.resultado,
            c.sucursal,

            ev.nombre AS equipo_nombre,
            cli.nombre AS cliente_nombre,
            tec.nombre AS tecnico_nombre

        FROM Calibracion_Quito c

        INNER JOIN EquipoCliente_ventas_Quito ev
            ON c.equipo_id = ev.equipo_id
            AND c.sucursal = ev.sucursal

        INNER JOIN EquipoCliente_tecnico_Quito et
            ON c.equipo_id = et.equipo_id
            AND c.sucursal = et.sucursal

        INNER JOIN Tecnico_Quito tec
            ON c.tecnico_id = tec.tecnico_id
            AND c.sucursal = tec.sucursal

        INNER JOIN Oferta_Quito o
            ON c.oferta_id = o.oferta_id
            AND c.sucursal = o.sucursal

        INNER JOIN Cliente_Quito cli
            ON o.cliente_id = cli.cliente_id
            AND o.sucursal = cli.sucursal

        WHERE c.sucursal = 'Quito'
        ORDER BY c.calibracion_id
    `;

    const distribuido = `
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
    `;

    try {
        const pool = await getConnection();

        // Modo práctica: consulta local
        const result = await pool.request().query(local);

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
// API PARA VENDEDORES
// ============================================
app.get('/api/vendedores', async (req, res) => {
    const local = `SELECT 
                vendedor_id,
                nombre,
                cedula_ruc,
                telefono,
                correo,
                sucursal
            FROM Vendedor_Quito
            WHERE sucursal = 'Quito'
            ORDER BY vendedor_id`
    const distribuido= `SELECT 
                vendedor_id,
                nombre,
                cedula_ruc,
                telefono,
                correo,
                sucursal
            FROM vw_Vendedor
            WHERE sucursal = 'Quito'
            ORDER BY vendedor_id`
    try {
        const pool = await getConnection();

        const result = await pool.request().query(local);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Error al obtener vendedores:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// API PARA OFERTAS
// ============================================
app.get('/api/ofertas', async (req, res) => {

    const local = `
        SELECT 
            o.oferta_id,
            o.numero_oferta,
            o.fecha,
            o.estado,
            o.observaciones,
            o.sucursal,

            cli.nombre AS cliente_nombre,
            ven.nombre AS vendedor_nombre

        FROM Oferta_Quito o

        INNER JOIN Cliente_Quito cli
            ON o.cliente_id = cli.cliente_id
            AND o.sucursal = cli.sucursal

        INNER JOIN Vendedor_Quito ven
            ON o.vendedor_id = ven.vendedor_id
            AND o.sucursal = ven.sucursal

        WHERE o.sucursal = 'Quito'
        ORDER BY o.oferta_id
    `;

    const distribuido = `
        SELECT 
            o.oferta_id,
            o.numero_oferta,
            o.fecha,
            o.estado,
            o.observaciones,
            o.sucursal,

            cli.nombre AS cliente_nombre,
            ven.nombre AS vendedor_nombre

        FROM vw_Oferta o

        INNER JOIN vw_Cliente cli
            ON o.cliente_id = cli.cliente_id
            AND o.sucursal = cli.sucursal

        INNER JOIN vw_Vendedor ven
            ON o.vendedor_id = ven.vendedor_id
            AND o.sucursal = ven.sucursal

        WHERE o.sucursal = 'Quito'
        ORDER BY o.oferta_id
    `;

    try {
        const pool = await getConnection();

        // Modo práctica: usa consulta local
        const result = await pool.request().query(local);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Error al obtener ofertas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// API PARA TÉCNICOS
// ============================================

app.get('/api/tecnicos', async (req, res) => {

    const local = `
        SELECT 
            t.tecnico_id,
            t.nombre,
            a.nombre AS especialidad,
            t.sucursal
        FROM Tecnico_Quito t
        LEFT JOIN AreaTecnica a
            ON t.area_id = a.area_id
        WHERE t.sucursal = 'Quito'
        ORDER BY t.tecnico_id
    `;

    const distribuido = `
        SELECT 
            t.tecnico_id,
            t.nombre,
            a.nombre AS especialidad,
            t.sucursal
        FROM vw_Tecnico t
        LEFT JOIN AreaTecnica a
            ON t.area_id = a.area_id
        WHERE t.sucursal = 'Quito'
        ORDER BY t.tecnico_id
    `;

    try {
        const pool = await getConnection();
        const result = await pool.request().query(local);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Error al obtener técnicos:', error);
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