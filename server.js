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
    try {
        const { sucursal } = req.query; // Obtener sucursal de los query params

        // Validar que se envió la sucursal
        if (!sucursal) {
            return res.status(400).json({
                success: false,
                error: 'Sucursal no especificada'
            });
        }

        const pool = await getConnection();

        // Usar vista particionada para obtener todos los clientes
        const result = await pool.request()
            .input('sucursal', sql.VarChar(50), sucursal)
            .query(`
                SELECT 
                    cliente_id,
                    nombre,
                    cedula_ruc,
                    telefono,
                    direccion,
                    correo,
                    sucursal
                FROM vw_Cliente
                WHERE sucursal = @sucursal
                ORDER BY cliente_id
            `);

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

app.post('/api/clientes', async (req, res) => {
    try {
        const { nombre, cedula_ruc, direccion, telefono, correo, sucursal } = req.body;

        // Validaciones
        if (!nombre || !cedula_ruc || !telefono || !correo) {
            return res.status(400).json({
                success: false,
                error: 'Faltan campos obligatorios (nombre, RUC/ID, teléfono, correo)'
            });
        }

        const pool = await getConnection();

        // Ejecutar SET XACT_ABORT ON antes de la inserción
        await pool.request().query('SET XACT_ABORT ON');

        // Obtener el próximo ID disponible
        const maxIdResult = await pool.request()
            .query('SELECT ISNULL(MAX(cliente_id), 0) + 1 AS nextId FROM vw_Cliente');
        
        const nextId = maxIdResult.recordset[0].nextId;

        // Insertar en vw_Cliente (vista particionada)
        const insertQuery = `
            INSERT INTO vw_Cliente (cliente_id, nombre, cedula_ruc, telefono, direccion, correo, sucursal)
            VALUES (@cliente_id, @nombre, @cedula_ruc, @telefono, @direccion, @correo, @sucursal)
        `;

        await pool.request()
            .input('cliente_id', sql.Int, nextId)
            .input('nombre', sql.VarChar(150), nombre)
            .input('cedula_ruc', sql.VarChar(20), cedula_ruc)
            .input('telefono', sql.VarChar(20), telefono)
            .input('direccion', sql.VarChar(200), direccion || '')
            .input('correo', sql.VarChar(100), correo)
            .input('sucursal', sql.VarChar(50), sucursal || 'Coca')
            .query(insertQuery);

        res.json({
            success: true,
            message: 'Cliente registrado exitosamente'
        });

    } catch (error) {
        console.error('Error al crear cliente:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/clientes/buscar/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const pool = await getConnection();

        // Buscar por nombre, RUC o ID
        const searchQuery = `
            SELECT 
                cliente_id,
                nombre,
                cedula_ruc,
                telefono,
                direccion,
                correo,
                sucursal
            FROM vw_Cliente
            WHERE (
                nombre LIKE '%' + @query + '%'
                OR cedula_ruc LIKE '%' + @query + '%'
                OR CAST(cliente_id AS VARCHAR) LIKE '%' + @query + '%'
            )
            ORDER BY cliente_id
        `;

        const result = await pool.request()
            .input('query', sql.VarChar(100), query)
            .query(searchQuery);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Error al buscar clientes:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
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
            .query('UPDATE vw_Cliente SET nombre = @nombre, cedula_ruc = @cedula_ruc, direccion = @direccion, telefono = @telefono, correo = @correo WHERE cliente_id = @id');

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
            .query('DELETE FROM vw_Cliente WHERE cliente_id = @id');

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
    try {
        const { sucursal } = req.query; // Obtener sucursal de los query params

        // Validar que se envió la sucursal
        if (!sucursal) {
            return res.status(400).json({
                success: false,
                error: 'Sucursal no especificada'
            });
        }

        const pool = await getConnection();

        // Query local con filtro de sucursal
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

            FROM [dbo].[vw_EquipoCliente_ventas] ev

            INNER JOIN [dbo].[vw_EquipoCliente_tecnico] et
                ON ev.equipo_id = et.equipo_id
                AND ev.sucursal = et.sucursal

            LEFT JOIN vw_Cliente c
                ON et.cliente_id = c.cliente_id
                AND et.sucursal = c.sucursal

            LEFT JOIN AreaTecnica a
                ON et.area_id = a.area_id

            WHERE ev.sucursal = @sucursal

            ORDER BY ev.equipo_id
        `;

        // Query distribuido con filtro de sucursal
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

            WHERE e.sucursal = @sucursal

            ORDER BY e.equipo_id
        `;

        // Ejecutar con parámetros para evitar SQL injection
        const result = await pool.request()
            .input('sucursal', sql.VarChar(50), sucursal)
            .query(distribuido); // Cambia a 'distribuido' cuando uses ese modo

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
        const { nombre, codigo_interno, marca, modelo, serie, area_id, cliente_id, sucursal } = req.body;

        // Validaciones
        if (!nombre || !marca || !modelo || !serie || !cliente_id) {
            return res.status(400).json({
                success: false,
                error: 'Faltan campos obligatorios'
            });
        }

        const pool = await getConnection();

        // Validar que el cliente existe en las vistas particionadas
        const clienteVerify = await pool.request()
            .input('cliente_id', sql.Int, cliente_id)
            .query('SELECT cliente_id, sucursal FROM vw_Cliente WHERE cliente_id = @cliente_id');

        if (clienteVerify.recordset.length === 0) {
            return res.status(400).json({
                success: false,
                error: `El cliente con ID ${cliente_id} no existe en la base de datos`
            });
        }

        // Usar la sucursal del cliente encontrado si no se proporciona
        const sucursalDelCliente = clienteVerify.recordset[0].sucursal;
        const sucursalFinal = sucursal || sucursalDelCliente;

        // Ejecutar SET XACT_ABORT ON antes de la inserción
        await pool.request().query('SET XACT_ABORT ON');

        try {
            // Obtener el próximo ID disponible para equipos
            const maxIdResult = await pool.request()
                .query('SELECT ISNULL(MAX(equipo_id), 0) + 1 AS nextId FROM [dbo].[vw_EquipoCliente_ventas]');
            
            const equipo_id = maxIdResult.recordset[0].nextId;

            // Insertar en vw_EquipoCliente_ventas (vista particionada)
            await pool.request()
                .input('equipo_id', sql.Int, equipo_id)
                .input('nombre', sql.VarChar(100), nombre)
                .input('codigo_interno', sql.VarChar(50), codigo_interno || '')
                .input('sucursal', sql.VarChar(50), sucursalFinal)
                .query(`
                    INSERT INTO [dbo].[vw_EquipoCliente_ventas] (equipo_id, nombre, codigo_interno, sucursal)
                    VALUES (@equipo_id, @nombre, @codigo_interno, @sucursal)
                `);

            // Insertar en vw_EquipoCliente_tecnico (vista particionada)
            await pool.request()
                .input('equipo_id', sql.Int, equipo_id)
                .input('marca', sql.VarChar(100), marca)
                .input('modelo', sql.VarChar(100), modelo)
                .input('serie', sql.VarChar(100), serie)
                .input('area_id', sql.Int, area_id || 1)
                .input('cliente_id', sql.Int, cliente_id)
                .input('sucursal', sql.VarChar(50), sucursalFinal)
                .query(`
                    INSERT INTO [dbo].[vw_EquipoCliente_tecnico] (equipo_id, marca, modelo, serie, area_id, cliente_id, sucursal)
                    VALUES (@equipo_id, @marca, @modelo, @serie, @area_id, @cliente_id, @sucursal)
                `);

            res.json({
                success: true,
                message: 'Equipo registrado exitosamente'
            });
        } catch (error) {
            console.error('Error al crear equipo:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    } catch (error) {
        console.error('Error al crear equipo:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.put('/api/equipos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, modelo, serie, codigo_interno, marca } = req.body;

        const pool = await getConnection();

        try {
            await pool.request()
                .input('id', sql.Int, id)
                .input('nombre', sql.VarChar, nombre)
                .input('codigo_interno', sql.VarChar, codigo_interno)
                .query('UPDATE [dbo].[vw_EquipoCliente_ventas] SET nombre = @nombre, codigo_interno = @codigo_interno WHERE equipo_id = @id');

            await pool.request()
                .input('id', sql.Int, id)
                .input('modelo', sql.VarChar, modelo)
                .input('serie', sql.VarChar, serie)
                .input('marca', sql.VarChar, marca)
                .query('UPDATE [dbo].[vw_EquipoCliente_tecnico] SET modelo = @modelo, serie = @serie, marca = @marca WHERE equipo_id = @id');

            res.json({ success: true });
        } catch (error) {
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

        try {
            await pool.request()
                .input('id', sql.Int, id)
                .query('DELETE FROM [dbo].[vw_EquipoCliente_ventas] WHERE equipo_id = @id');

            await pool.request()
                .input('id', sql.Int, id)
                .query('DELETE FROM [dbo].[vw_EquipoCliente_tecnico] WHERE equipo_id = @id');

            res.json({ success: true });
        } catch (error) {
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
    try {
        const { sucursal } = req.query;

        if (!sucursal) {
            return res.status(400).json({
                success: false,
                error: 'Sucursal no especificada'
            });
        }

        const pool = await getConnection();

        // Query SIMPLE sin JOINs
        const result = await pool.request()
            .input('sucursal', sql.VarChar(50), sucursal)
            .query(`
                SELECT 
            c.calibracion_id,
            c.fecha_inicio,
            c.resultado,
            c.sucursal,
            eq.nombre AS equipo_nombre,
            cli.nombre AS cliente_nombre,
            tec.nombre AS tecnico_nombre
        FROM vw_Calibracion c
        LEFT JOIN vw_EquipoCliente eq
            ON c.equipo_id = eq.equipo_id
            AND c.sucursal = eq.sucursal
        LEFT JOIN vw_Tecnico tec
            ON c.tecnico_id = tec.tecnico_id
            AND c.sucursal = tec.sucursal
        LEFT JOIN vw_Oferta o
            ON c.oferta_id = o.oferta_id
            AND c.sucursal = o.sucursal
        LEFT JOIN vw_Cliente cli
            ON o.cliente_id = cli.cliente_id
            AND o.sucursal = cli.sucursal
        WHERE c.sucursal = @sucursal
    `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Error al obtener calibraciones:', error.message);
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
    try {
        const { sucursal } = req.query;

        if (!sucursal) {
            return res.status(400).json({
                success: false,
                error: 'Sucursal no especificada'
            });
        }

        const pool = await getConnection();

        const result = await pool.request()
            .input('sucursal', sql.VarChar(50), sucursal)
            .query(`
                SELECT 
                    vendedor_id,
                    nombre,
                    cedula_ruc,
                    telefono,
                    correo,
                    sucursal
                FROM vw_Vendedor
                WHERE sucursal = @sucursal
                ORDER BY vendedor_id
            `);

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

        // Validaciones
        if (!nombre || !cedula_ruc || !telefono || !correo) {
            return res.status(400).json({
                success: false,
                error: 'Faltan campos obligatorios'
            });
        }

        const pool = await getConnection();

        // Ejecutar SET XACT_ABORT ON antes de la inserción
        await pool.request().query('SET XACT_ABORT ON');

        // Obtener el próximo ID disponible
        const maxIdResult = await pool.request()
            .query('SELECT ISNULL(MAX(vendedor_id), 0) + 1 AS nextId FROM vw_Vendedor');
        
        const nextId = maxIdResult.recordset[0].nextId;

        const insertQuery = `
            INSERT INTO vw_Vendedor (vendedor_id, nombre, cedula_ruc, telefono, correo, sucursal)
            VALUES (@vendedor_id, @nombre, @cedula_ruc, @telefono, @correo, @sucursal)
        `;

        await pool.request()
            .input('vendedor_id', sql.Int, nextId)
            .input('nombre', sql.VarChar(100), nombre)
            .input('cedula_ruc', sql.VarChar(20), cedula_ruc)
            .input('telefono', sql.VarChar(20), telefono)
            .input('correo', sql.VarChar(100), correo)
            .input('sucursal', sql.VarChar(50), sucursal || 'Quito')
            .query(insertQuery);

        res.json({
            success: true,
            message: 'Vendedor registrado exitosamente'
        });

    } catch (error) {
        console.error('Error al crear vendedor:', error);
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
    try {
        const { sucursal } = req.query;

        if (!sucursal) {
            return res.status(400).json({
                success: false,
                error: 'Sucursal no especificada'
            });
        }

        const pool = await getConnection();

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

            FROM Oferta_${sucursal} o

            INNER JOIN Cliente_${sucursal} cli
                ON o.cliente_id = cli.cliente_id
                AND o.sucursal = cli.sucursal

            INNER JOIN Vendedor_${sucursal} ven
                ON o.vendedor_id = ven.vendedor_id
                AND o.sucursal = ven.sucursal

            WHERE o.sucursal = @sucursal
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

            WHERE o.sucursal = @sucursal
            ORDER BY o.oferta_id
        `;

        const result = await pool.request()
            .input('sucursal', sql.VarChar(50), sucursal)
            .query(distribuido); // Cambia a 'local' si necesitas

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

app.post('/api/ofertas', async (req, res) => {
    try {
        const { numero_oferta, fecha, estado, observaciones, cliente_id, vendedor_id, sucursal } = req.body;

        // Validaciones
        if (!numero_oferta || !cliente_id || !vendedor_id) {
            return res.status(400).json({
                success: false,
                error: 'Faltan campos obligatorios'
            });
        }

        const pool = await getConnection();

        // Obtener el próximo ID disponible
        const maxIdResult = await pool.request()
            .query('SELECT ISNULL(MAX(oferta_id), 0) + 1 AS nextId FROM Oferta_Coca');
        
        const nextId = maxIdResult.recordset[0].nextId;

        const insertQuery = `
            INSERT INTO Oferta_Coca (oferta_id, numero_oferta, fecha, estado, observaciones, cliente_id, vendedor_id, sucursal)
            VALUES (@oferta_id, @numero_oferta, @fecha, @estado, @observaciones, @cliente_id, @vendedor_id, @sucursal)
        `;

        await pool.request()
            .input('oferta_id', sql.Int, nextId)
            .input('numero_oferta', sql.VarChar(50), numero_oferta)
            .input('fecha', sql.DateTime, fecha ? new Date(fecha) : new Date())
            .input('estado', sql.VarChar(20), estado || 'Pendiente')
            .input('observaciones', sql.VarChar(500), observaciones || '')
            .input('cliente_id', sql.Int, cliente_id)
            .input('vendedor_id', sql.Int, vendedor_id)
            .input('sucursal', sql.VarChar(50), sucursal || 'Coca')
            .query(insertQuery);

        res.json({
            success: true,
            message: 'Oferta registrada exitosamente'
        });

    } catch (error) {
        console.error('Error al crear oferta:', error);
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
    try {
        const { sucursal } = req.query;

        if (!sucursal) {
            return res.status(400).json({
                success: false,
                error: 'Sucursal no especificada'
            });
        }

        const pool = await getConnection();
        
        const result = await pool.request()
            .input('sucursal', sql.VarChar(50), sucursal)
            .query(`
                SELECT 
                    t.tecnico_id,
                    t.nombre,
                    a.nombre AS especialidad,
                    t.sucursal
                FROM vw_Tecnico t
                LEFT JOIN AreaTecnica a
                    ON t.area_id = a.area_id
                WHERE t.sucursal = @sucursal
                ORDER BY t.tecnico_id
            `);

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
        const { nombre, cedula, area_id, sucursal } = req.body;

        // Validaciones
        if (!nombre || !cedula) {
            return res.status(400).json({
                success: false,
                error: 'Faltan campos obligatorios'
            });
        }

        const pool = await getConnection();

        // Ejecutar SET XACT_ABORT ON antes de la inserción
        await pool.request().query('SET XACT_ABORT ON');

        // Obtener el próximo ID disponible
        const maxIdResult = await pool.request()
            .query('SELECT ISNULL(MAX(tecnico_id), 0) + 1 AS nextId FROM vw_Tecnico');
        
        const nextId = maxIdResult.recordset[0].nextId;

        // Insertar en vw_Tecnico (vista particionada)
        const insertQuery = `
            INSERT INTO vw_Tecnico (tecnico_id, nombre, cedula, area_id, sucursal)
            VALUES (@tecnico_id, @nombre, @cedula, @area_id, @sucursal)
        `;

        await pool.request()
            .input('tecnico_id', sql.Int, nextId)
            .input('nombre', sql.VarChar(100), nombre)
            .input('cedula', sql.VarChar(20), cedula)
            .input('area_id', sql.Int, area_id || 1)
            .input('sucursal', sql.VarChar(50), sucursal || 'Coca')
            .query(insertQuery);

        res.json({
            success: true,
            message: 'Técnico registrado exitosamente'
        });

    } catch (error) {
        console.error('Error al crear técnico:', error);
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