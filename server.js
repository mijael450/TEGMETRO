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

app.get('/api/clientes/buscar/:term', async (req, res) => {
    try {
        const { term } = req.params;
        const pool = await getConnection();
        const result = await pool.request()
            .input('term', sql.VarChar, `%${term}%`)
            .query(`
                SELECT
                    cliente_id,
                    nombre,
                    cedula_ruc,
                    telefono,
                    direccion,
                    correo,
                    sucursal
                FROM Cliente_Quito
                WHERE nombre LIKE @term OR cedula_ruc LIKE @term
                ORDER BY cliente_id
            `);

        res.json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('Error al buscar cliente:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/clientes', async (req, res) => {
    try {
        const { nombre, cedula_ruc, direccion, telefono, correo, sucursal } = req.body;

        const pool = await getConnection();
        await pool.request()
            .input('nombre', sql.VarChar, nombre)
            .input('cedula_ruc', sql.VarChar, cedula_ruc)
            .input('direccion', sql.VarChar, direccion)
            .input('telefono', sql.VarChar, telefono)
            .input('correo', sql.VarChar, correo)
            .input('sucursal', sql.VarChar, sucursal)
            .query('INSERT INTO Cliente_Quito (nombre, cedula_ruc, direccion, telefono, correo, sucursal) VALUES (@nombre, @cedula_ruc, @direccion, @telefono, @correo, @sucursal)');

        res.json({ success: true, message: 'Cliente registrado exitosamente' });
    } catch (error) {
        console.error('Error al registrar cliente:', error);
        res.status(500).json({ success: false, error: 'Error al registrar cliente' });
    }
});

app.put('/api/clientes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, cedula_ruc, direccion, telefono, correo } = req.body;

        const pool = await getConnection();
        await pool.request()
            .input('id', sql.Int, id)
            .input('nombre', sql.VarChar, nombre)
            .input('cedula_ruc', sql.VarChar, cedula_ruc)
            .input('direccion', sql.VarChar, direccion)
            .input('telefono', sql.VarChar, telefono)
            .input('correo', sql.VarChar, correo)
            .query('UPDATE Cliente_Quito SET nombre = @nombre, cedula_ruc = @cedula_ruc, direccion = @direccion, telefono = @telefono, correo = @correo WHERE cliente_id = @id');

        res.json({ success: true });
    } catch (error) {
        console.error('Error al actualizar cliente:', error);
        res.status(500).json({ success: false, error: 'Error al actualizar cliente' });
    }
});

app.delete('/api/clientes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Cliente_Quito WHERE cliente_id = @id');

        res.json({ success: true });
    } catch (error) {
        console.error('Error al eliminar cliente:', error);
        res.status(500).json({ success: false, error: 'Error al eliminar cliente' });
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

app.post('/api/equipos', async (req, res) => {
    try {
        const { nombre, codigo_interno, marca, modelo, serie, area_id, cliente_id } = req.body;

        const pool = await getConnection();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const resultVentas = await transaction.request()
                .input('nombre', sql.VarChar, nombre)
                .input('codigo_interno', sql.VarChar, codigo_interno)
                .input('sucursal', sql.VarChar, 'Quito')
                .output('equipo_id', sql.Int)
                .query('INSERT INTO EquipoCliente_ventas_Quito (nombre, codigo_interno, sucursal) VALUES (@nombre, @codigo_interno, @sucursal); SELECT SCOPE_IDENTITY() AS equipo_id');
            
            const equipo_id = resultVentas.output.equipo_id;

            await transaction.request()
                .input('equipo_id', sql.Int, equipo_id)
                .input('marca', sql.VarChar, marca)
                .input('modelo', sql.VarChar, modelo)
                .input('serie', sql.VarChar, serie)
                .input('area_id', sql.Int, area_id)
                .input('cliente_id', sql.Int, cliente_id)
                .input('sucursal', sql.VarChar, 'Quito')
                .query('INSERT INTO EquipoCliente_tecnico_Quito (equipo_id, marca, modelo, serie, area_id, cliente_id, sucursal) VALUES (@equipo_id, @marca, @modelo, @serie, @area_id, @cliente_id, @sucursal)');

            await transaction.commit();
            res.json({ success: true, message: 'Equipo registrado exitosamente' });
        } catch (error) {
            await transaction.rollback();
            console.error('Error al registrar equipo:', error);
            res.status(500).json({ success: false, error: 'Error al registrar equipo' });
        }
    } catch (error) {
        console.error('Error al registrar equipo:', error);
        res.status(500).json({ success: false, error: 'Error al registrar equipo' });
    }
});

app.put('/api/equipos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, modelo, serie, codigo_interno, marca } = req.body;

        const pool = await getConnection();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            await transaction.request()
                .input('id', sql.Int, id)
                .input('nombre', sql.VarChar, nombre)
                .input('codigo_interno', sql.VarChar, codigo_interno)
                .query('UPDATE EquipoCliente_ventas_Quito SET nombre = @nombre, codigo_interno = @codigo_interno WHERE equipo_id = @id');

            await transaction.request()
                .input('id', sql.Int, id)
                .input('modelo', sql.VarChar, modelo)
                .input('serie', sql.VarChar, serie)
                .input('marca', sql.VarChar, marca)
                .query('UPDATE EquipoCliente_tecnico_Quito SET modelo = @modelo, serie = @serie, marca = @marca WHERE equipo_id = @id');

            await transaction.commit();
            res.json({ success: true });
        } catch (error) {
            await transaction.rollback();
            console.error('Error al actualizar equipo:', error);
            res.status(500).json({ success: false, error: 'Error al actualizar equipo' });
        }
    } catch (error) {
        console.error('Error al actualizar equipo:', error);
        res.status(500).json({ success: false, error: 'Error al actualizar equipo' });
    }
});

app.delete('/api/equipos/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const pool = await getConnection();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            await transaction.request()
                .input('id', sql.Int, id)
                .query('DELETE FROM EquipoCliente_ventas_Quito WHERE equipo_id = @id');

            await transaction.request()
                .input('id', sql.Int, id)
                .query('DELETE FROM EquipoCliente_tecnico_Quito WHERE equipo_id = @id');

            await transaction.commit();
            res.json({ success: true });
        } catch (error) {
            await transaction.rollback();
            console.error('Error al eliminar equipo:', error);
            res.status(500).json({ success: false, error: 'Error al eliminar equipo' });
        }
    } catch (error) {
        console.error('Error al eliminar equipo:', error);
        res.status(500).json({ success: false, error: 'Error al eliminar equipo' });
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

app.post('/api/vendedores', async (req, res) => {
    try {
        const { nombre, cedula_ruc, telefono, correo, sucursal } = req.body;

        const pool = await getConnection();
        await pool.request()
            .input('nombre', sql.VarChar, nombre)
            .input('cedula_ruc', sql.VarChar, cedula_ruc)
            .input('telefono', sql.VarChar, telefono)
            .input('correo', sql.VarChar, correo)
            .input('sucursal', sql.VarChar, sucursal)
            .query('INSERT INTO Vendedor_Quito (nombre, cedula_ruc, telefono, correo, sucursal) VALUES (@nombre, @cedula_ruc, @telefono, @correo, @sucursal)');

        res.json({ success: true, message: 'Vendedor registrado exitosamente' });
    } catch (error) {
        console.error('Error al registrar vendedor:', error);
        res.status(500).json({ success: false, error: 'Error al registrar vendedor' });
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

app.post('/api/tecnicos', async (req, res) => {
    try {
        const { nombre, cedula, especialidad, sucursal } = req.body;

        const pool = await getConnection();
        await pool.request()
            .input('nombre', sql.VarChar, nombre)
            .input('cedula', sql.VarChar, cedula)
            .input('especialidad', sql.VarChar, especialidad)
            .input('sucursal', sql.VarChar, sucursal)
            .query('INSERT INTO Tecnico_Quito (nombre, cedula, especialidad, sucursal) VALUES (@nombre, @cedula, @especialidad, @sucursal)');

        res.json({ success: true, message: 'Técnico registrado exitosamente' });
    } catch (error) {
        console.error('Error al registrar técnico:', error);
        res.status(500).json({ success: false, error: 'Error al registrar técnico' });
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