// ============================================
// SCRIPT MODIFICADO PARA BASE DE DATOS DISTRIBUIDA
// Sistema de Calibraciones - Tegmetro
// ============================================

// Variables globales
let datos = {
    clientes: [],
    equipos: [],
    calibraciones: [],
    certificados: [],
    areas: [], 
    vendedores: [], 
    ofertas:[], 
    tecnicos:[]
};

// ============================================
// FUNCIONES DE CARGA DE DATOS
// ============================================

// Cargar todos los datos al iniciar
async function cargarDatos() {
    try {
        await Promise.all([
            cargarClientes(),
            cargarEquipos(),
            //cargarAreas(), Si es necesario se implementara luego
            cargarCalibraciones(), 
            cargarVendedores(), 
            cargarOfertas(),
            cargarTecnicos()

        ]);
        console.log('Datos cargados exitosamente desde BD distribuida');
    } catch (error) {
        console.error('Error al cargar datos:', error);
        mostrarAlerta('Error al cargar datos del sistema', 'error');
    }
}

// Cargar clientes desde la BD
async function cargarClientes() {
    try {
        const response = await fetch('/api/clientes');
        const result = await response.json();
        
        if (result.success) {
            datos.clientes = result.data;
            actualizarListaClientes();
        }
    } catch (error) {
        console.error('Error al cargar clientes:', error);
    }
}

// Cargar equipos desde la BD
async function cargarEquipos() {
    try {
        const response = await fetch('/api/equipos');
        const result = await response.json();
        
        if (result.success) {
            datos.equipos = result.data;
            actualizarListaEquipos();
        }
    } catch (error) {
        console.error('Error al cargar equipos:', error);
    }
}

// Cargar áreas técnicas
async function cargarAreas() {
    try {
        const response = await fetch('/api/areas');
        const result = await response.json();
        
        if (result.success) {
            datos.areas = result.data;
            cargarSelectAreas();
        }
    } catch (error) {
        console.error('Error al cargar áreas:', error);
    }
}

// Cargar calibraciones
async function cargarCalibraciones() {
    try {
        const response = await fetch('/api/calibraciones');
        const result = await response.json();
        
        if (result.success) {
            datos.calibraciones = result.data;
            actualizarListaCalibraciones();
        }
    } catch (error) {
        console.error('Error al cargar calibraciones:', error);
    }
}

// Cargar vendedores
async function cargarVendedores() {
    try {
        const response = await fetch('/api/vendedores');
        const result = await response.json();
        
        if (result.success) {
            datos.vendedores = result.data;
            actualizarListaVendedores();
        }
    } catch (error) {
        console.error('Error al cargar vendedores:', error);
    }
}

// Cargar ofertas
async function cargarOfertas() {
    try {
        const response = await fetch('/api/ofertas');
        const result = await response.json();
        
        if (result.success) {
            datos.ofertas = result.data;
            actualizarListaOferta();
        }
    } catch (error) {
        console.error('Error al cargar vendedores:', error);
    }
}

// Cargar tecnicos
async function cargarTecnicos() {
    try {
        const response = await fetch('/api/tecnicos');
        const result = await response.json();
        
        if (result.success) {
            datos.tecnicos = result.data;
            actualizarListaVendedores();
        }
    } catch (error) {
        console.error('Error al cargar tecnicos:', error);
    }
}

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

// Mostrar alerta
function mostrarAlerta(mensaje, tipo = 'success') {
    const alertSuccess = document.getElementById('alertSuccess');
    const alertError = document.getElementById('alertError');

    if (tipo === 'success') {
        alertSuccess.textContent = mensaje;
        alertSuccess.style.display = 'block';
        alertError.style.display = 'none';

        setTimeout(() => {
            alertSuccess.style.display = 'none';
        }, 5000);
    } else {
        alertError.textContent = mensaje;
        alertError.style.display = 'block';
        alertSuccess.style.display = 'none';

        setTimeout(() => {
            alertError.style.display = 'none';
        }, 5000);
    }
}

// Obtener siguiente ID para cliente
function obtenerSiguienteIdCliente() {
    if (datos.clientes.length === 0) return 1;
    return Math.max(...datos.clientes.map(c => c.cliente_id)) + 1;
}

// Obtener siguiente ID para equipo
function obtenerSiguienteIdEquipo() {
    if (datos.equipos.length === 0) return 1;
    return Math.max(...datos.equipos.map(e => e.equipo_id)) + 1;
}

// Validar RUC único
function validarRUCUnico(ruc, idActual = null) {
    return !datos.clientes.some(cliente => 
        cliente.cedula_ruc === ruc && cliente.cliente_id !== idActual
    );
}

// Validar número de serie único
function validarNumeroSerieUnico(numeroSerie, idActual = null) {
    return !datos.equipos.some(equipo => 
        equipo.serie === numeroSerie && equipo.equipo_id !== idActual
    );
}

// ============================================
// FORMULARIO DE CLIENTE
// ============================================

document.getElementById('clienteForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const razonSocial = document.getElementById('razonSocial').value.trim();
    const rucId = document.getElementById('rucId').value.trim();
    const direccionFiscal = document.getElementById('direccionFiscal').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const email = document.getElementById('email').value.trim();

    // Validaciones
    if (!razonSocial || !rucId || !telefono || !email) {
        mostrarAlerta('Por favor, complete todos los campos obligatorios.', 'error');
        return;
    }

    if (!validarRUCUnico(rucId)) {
        mostrarAlerta('Ya existe un cliente registrado con este RUC/ID.', 'error');
        return;
    }

    if (!email.includes('@') || !email.includes('.')) {
        mostrarAlerta('Por favor, ingrese un email válido.', 'error');
        return;
    }

    // Determinar sucursal (puedes hacer esto dinámico con un select)
    const sucursal = 'Coca'; // Por defecto Coca, puedes agregar un campo en el formulario

    // Preparar datos para enviar (sin cliente_id, se genera automáticamente)
    const clienteData = {
        nombre: razonSocial,
        cedula_ruc: rucId,
        telefono: telefono,
        direccion: direccionFiscal,
        correo: email,
        sucursal: sucursal
    };

    try {
        const response = await fetch('/api/clientes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(clienteData)
        });

        const result = await response.json();

        if (result.success) {
            mostrarAlerta(result.message);
            document.getElementById('clienteForm').reset();
            await cargarClientes(); // Recargar lista
        } else {
            mostrarAlerta(result.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al registrar cliente', 'error');
    }
});

// ============================================
// BÚSQUEDA DE CLIENTES (para formulario de equipos)
// ============================================

document.getElementById('buscarCliente').addEventListener('input', async function () {
    const query = this.value.trim();
    const resultadosDiv = document.getElementById('resultadosClientes');

    if (query.length < 2) {
        resultadosDiv.innerHTML = '';
        return;
    }

    try {
        const response = await fetch(`/api/clientes/buscar/${encodeURIComponent(query)}`);
        const result = await response.json();

        resultadosDiv.innerHTML = '';

        if (!result.success || result.data.length === 0) {
            resultadosDiv.innerHTML = '<p class="muted-text">No se encontraron clientes.</p>';
            return;
        }

        result.data.forEach(cliente => {
            const div = document.createElement('div');
            div.className = 'client-info';
            div.style.cursor = 'pointer';
            div.style.marginBottom = '10px';
            div.innerHTML = `
                <p><strong>${cliente.nombre}</strong> (ID: ${cliente.cliente_id})</p>
                <p>RUC/ID: ${cliente.cedula_ruc} | Sucursal: <span class="badge badge-${cliente.sucursal.toLowerCase()}">${cliente.sucursal}</span></p>
                <button class="btn btn-primary" onclick="seleccionarClienteDirecto(${JSON.stringify(cliente).replace(/"/g, '&quot;')})">Seleccionar</button>
            `;
            resultadosDiv.appendChild(div);
        });
    } catch (error) {
        console.error('Error al buscar cliente:', error);
        resultadosDiv.innerHTML = '<p class="muted-text">Error al buscar clientes.</p>';
    }
});

// Seleccionar cliente
window.seleccionarCliente = function (clienteId) {
    const cliente = datos.clientes.find(c => c.cliente_id === clienteId);
    if (!cliente) {
        mostrarAlerta('Cliente no encontrado', 'error');
        return;
    }

    document.getElementById('clienteId').value = cliente.cliente_id;
    document.getElementById('clienteSeleccionado').innerHTML = `
        <p><strong>Cliente seleccionado:</strong> ${cliente.nombre} (ID: ${cliente.cliente_id})</p>
        <p>RUC/ID: ${cliente.cedula_ruc} | Sucursal: <span class="badge badge-${cliente.sucursal.toLowerCase()}">${cliente.sucursal}</span></p>
        <p><em>El equipo se guardará automáticamente en ${cliente.sucursal} (Fragmentación Derivada)</em></p>
    `;
    document.getElementById('clienteSeleccionado').style.display = 'block';
    document.getElementById('resultadosClientes').innerHTML = '';
    document.getElementById('buscarCliente').value = '';
};

// Seleccionar cliente directamente desde los resultados de búsqueda
window.seleccionarClienteDirecto = function (cliente) {
    document.getElementById('clienteId').value = cliente.cliente_id;
    document.getElementById('clienteSeleccionado').innerHTML = `
        <p><strong>Cliente seleccionado:</strong> ${cliente.nombre} (ID: ${cliente.cliente_id})</p>
        <p>RUC/ID: ${cliente.cedula_ruc} | Sucursal: <span class="badge badge-${cliente.sucursal.toLowerCase()}">${cliente.sucursal}</span></p>
        <p><em>El equipo se guardará automáticamente en ${cliente.sucursal} (Fragmentación Derivada)</em></p>
    `;
    document.getElementById('clienteSeleccionado').style.display = 'block';
    document.getElementById('resultadosClientes').innerHTML = '';
    document.getElementById('buscarCliente').value = '';
};

// ============================================
// FORMULARIO DE EQUIPO
// ============================================

document.getElementById('equipoForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const clienteId = parseInt(document.getElementById('clienteId').value);
    const tipoEquipo = document.getElementById('tipoEquipo').value;
    const modelo = document.getElementById('modelo').value.trim();
    const numeroSerie = document.getElementById('numeroSerie').value.trim();
    const codigoInterno = document.getElementById('codigoInterno').value.trim();
    const marca = document.getElementById('marca').value.trim();
    const areaTecnicaSelect = document.getElementById('areaTecnica');
    const areaId = areaTecnicaSelect ? parseInt(areaTecnicaSelect.value) : 1;

    // Validaciones
    if (!clienteId) {
        mostrarAlerta('Debe seleccionar un cliente primero.', 'error');
        return;
    }

    if (!tipoEquipo || !modelo || !numeroSerie || !marca) {
        mostrarAlerta('Por favor, complete todos los campos obligatorios.', 'error');
        return;
    }

    if (!validarNumeroSerieUnico(numeroSerie)) {
        mostrarAlerta('Ya existe un equipo con este número de serie.', 'error');
        return;
    }

    // Preparar datos (sin equipo_id, se genera automáticamente)
    const equipoData = {
        nombre: tipoEquipo,
        codigo_interno: codigoInterno,
        marca: marca,
        modelo: modelo,
        serie: numeroSerie,
        area_id: areaId,
        cliente_id: clienteId,
        sucursal: 'Coca'
    };

    try {
        const response = await fetch('/api/equipos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(equipoData)
        });

        const result = await response.json();

        if (result.success) {
            mostrarAlerta(result.message);
            document.getElementById('equipoForm').reset();
            document.getElementById('clienteSeleccionado').style.display = 'none';
            document.getElementById('clienteId').value = '';
            await cargarEquipos(); // Recargar lista
        } else {
            mostrarAlerta(result.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al registrar equipo', 'error');
    }
});

// ============================================
// FORMULARIO DE VENDEDOR
// ============================================

document.getElementById('vendedorForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const nombre = document.getElementById('vendedorNombre').value.trim();
    const cedula_ruc = document.getElementById('vendedorCedula').value.trim();
    const telefono = document.getElementById('vendedorTelefono').value.trim();
    const correo = document.getElementById('vendedorEmail').value.trim();

    // Validaciones
    if (!nombre || !cedula_ruc || !telefono || !correo) {
        mostrarAlerta('Por favor, complete todos los campos obligatorios.', 'error');
        return;
    }

    if (!correo.includes('@') || !correo.includes('.')) {
        mostrarAlerta('Por favor, ingrese un email válido.', 'error');
        return;
    }

    // Preparar datos
    const vendedorData = {
        nombre: nombre,
        cedula_ruc: cedula_ruc,
        telefono: telefono,
        correo: correo,
        sucursal: 'Coca'
    };

    try {
        const response = await fetch('/api/vendedores', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(vendedorData)
        });

        const result = await response.json();

        if (result.success) {
            mostrarAlerta(result.message || 'Vendedor registrado exitosamente');
            document.getElementById('vendedorForm').reset();
            await cargarVendedores(); // Recargar lista
        } else {
            mostrarAlerta(result.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al registrar vendedor', 'error');
    }
});

// ============================================
// FORMULARIO DE TÉCNICO
// ============================================

document.getElementById('tecnicoForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const nombre = document.getElementById('tecnicoNombre').value.trim();
    const cedula = document.getElementById('tecnicoCedula').value.trim();
    const area_id = parseInt(document.getElementById('tecnicoArea').value);

    // Validaciones
    if (!nombre || !cedula || !area_id) {
        mostrarAlerta('Por favor, complete todos los campos obligatorios.', 'error');
        return;
    }

    // Preparar datos
    const tecnicoData = {
        nombre: nombre,
        cedula: cedula,
        area_id: area_id,
        sucursal: 'Coca'
    };

    try {
        const response = await fetch('/api/tecnicos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tecnicoData)
        });

        const result = await response.json();

        if (result.success) {
            mostrarAlerta(result.message || 'Técnico registrado exitosamente');
            document.getElementById('tecnicoForm').reset();
            await cargarTecnicos(); // Recargar lista
        } else {
            mostrarAlerta(result.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al registrar técnico', 'error');
    }
});

// ============================================
// NAVEGACIÓN ENTRE PESTAÑAS
// ============================================

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function () {
        // Remover clase active de todas las pestañas
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));

        // Agregar clase active a la pestaña clickeada
        this.classList.add('active');
        const tabId = this.getAttribute('data-tab');
        const tabContent = document.getElementById(tabId);
        if (tabContent) {
            tabContent.classList.add('active');
        }

        // Actualizar datos según la pestaña
        if (tabId === 'datos') {
            actualizarListaDatos();
        } else if (tabId === 'calibracion') {
            actualizarListaPendientes();
        } else if (tabId === 'certificados') {
            actualizarListaCertificadosTab();
        }
    });
});

// ============================================
// ACTUALIZAR LISTAS EN PESTAÑA "DATOS"
// ============================================

function actualizarListaDatos() {
    actualizarListaClientes();
    actualizarListaEquipos();
    actualizarListaCalibraciones();
    actualizarListaVendedores(); 
    actualizarListaOfertas(); 
    actualizarListaTecnicos(); 
}

function actualizarListaClientes() {
    const contenedor = document.getElementById('listaClientes');
    if (!contenedor) return;

    if (datos.clientes.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-state">
                <p>👥</p>
                <p>No hay clientes registrados</p>
            </div>
        `;
        return;
    }

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>RUC</th>
                    <th>Teléfono</th>
                    <th>Email</th>
                    <th>Sucursal</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    datos.clientes.forEach(cliente => {
        html += `
            <tr>
                <td>${cliente.cliente_id}</td>
                <td>${cliente.nombre}</td>
                <td>${cliente.cedula_ruc}</td>
                <td>${cliente.telefono || 'N/A'}</td>
                <td>${cliente.correo || 'N/A'}</td>
                <td><span class="badge badge-${cliente.sucursal.toLowerCase()}">${cliente.sucursal}</span></td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="openEditClientModal(${cliente.cliente_id})">Editar</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteClient(${cliente.cliente_id})">Eliminar</button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    contenedor.innerHTML = html;
}

function actualizarListaEquipos() {
    const contenedor = document.getElementById('listaEquipos');
    if (!contenedor) return;

    if (datos.equipos.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-state">
                <p>⚙️</p>
                <p>No hay equipos registrados</p>
            </div>
        `;
        return;
    }

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Marca/Modelo</th>
                    <th>Serie</th>
                    <th>Cliente</th>
                    <th>Área</th>
                    <th>Sucursal</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    datos.equipos.forEach(equipo => {
        html += `
            <tr>
                <td>${equipo.equipo_id}</td>
                <td>${equipo.nombre}</td>
                <td>${equipo.marca} / ${equipo.modelo}</td>
                <td>${equipo.serie}</td>
                <td>${equipo.cliente_nombre || 'N/A'}</td>
                <td>${equipo.area_nombre || 'N/A'}</td>
                <td><span class="badge badge-${equipo.sucursal.toLowerCase()}">${equipo.sucursal}</span></td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="openEditEquipmentModal(${equipo.equipo_id})">Editar</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteEquipment(${equipo.equipo_id})">Eliminar</button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    contenedor.innerHTML = html;
}

function actualizarListaCalibraciones() {
    const contenedor = document.getElementById('listaCalibraciones');
    if (!contenedor) return;

    if (datos.calibraciones.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-state">
                <p>🧪</p>
                <p>No hay calibraciones registradas</p>
            </div>
        `;
        return;
    }

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Equipo</th>
                    <th>Cliente</th>
                    <th>Técnico</th>
                    <th>Fecha Inicio</th>
                    <th>Resultado</th>
                    <th>Sucursal</th>
                </tr>
            </thead>
            <tbody>
    `;

    datos.calibraciones.forEach(cal => {
        const resultadoBadge = cal.resultado === 'Conforme'
            ? '<span class="badge badge-success">Conforme</span>'
            : '<span class="badge badge-danger">No conforme</span>';

        html += `
            <tr>
                <td>${cal.calibracion_id}</td>
                <td>${cal.equipo_nombre || 'N/A'}</td>
                <td>${cal.cliente_nombre || 'N/A'}</td>
                <td>${cal.tecnico_nombre || 'N/A'}</td>
                <td>${cal.fecha_inicio ? new Date(cal.fecha_inicio).toLocaleDateString() : 'N/A'}</td>
                <td>${resultadoBadge}</td>
                <td><span class="badge badge-${cal.sucursal.toLowerCase()}">${cal.sucursal}</span></td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    contenedor.innerHTML = html;
}

function actualizarListaCertificados() {
    const contenedor = document.getElementById('listaCertificados');
    if (!contenedor) return;

    // Esta función se implementará cuando tengas certificados en la BD
    contenedor.innerHTML = `
        <div class="empty-state">
            <p>📄</p>
            <p>Funcionalidad de certificados en desarrollo</p>
        </div>
    `;
    return;

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Marca/Modelo</th>
                    <th>Serie</th>
                    <th>Cliente</th>
                    <th>Área</th>
                    <th>Sucursal</th>
                </tr>
            </thead>
            <tbody>
    `;

    datos.equipos.forEach(equipo => {
        html += `
            <tr>
                <td>${equipo.equipo_id}</td>
                <td>${equipo.nombre}</td>
                <td>${equipo.marca} / ${equipo.modelo}</td>
                <td>${equipo.serie}</td>
                <td>${equipo.cliente_nombre || 'N/A'}</td>
                <td>${equipo.area_nombre || 'N/A'}</td>
                <td><span class="badge badge-${equipo.sucursal.toLowerCase()}">${equipo.sucursal}</span></td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    contenedor.innerHTML = html;
}

function actualizarListaVendedores() {
    const contenedor = document.getElementById('listaVendedores');
    if (!contenedor) return;

    if (!datos.vendedores || datos.vendedores.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-state">
                <p>👥</p>
                <p>No hay vendedores registrados</p>
            </div>
        `;
        return;
    }

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Cédula / RUC</th>
                    <th>Teléfono</th>
                    <th>Correo</th>
                    <th>Sucursal</th>
                </tr>
            </thead>
            <tbody>
    `;

    datos.vendedores.forEach(vendedor => {
        html += `
            <tr>
                <td>${vendedor.vendedor_id}</td>
                <td>${vendedor.nombre}</td>
                <td>${vendedor.cedula_ruc || 'N/A'}</td>
                <td>${vendedor.telefono || 'N/A'}</td>
                <td>${vendedor.correo || 'N/A'}</td>
                <td>
                    <span class="badge badge-${vendedor.sucursal.toLowerCase()}">
                        ${vendedor.sucursal}
                    </span>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    contenedor.innerHTML = html;
}

function actualizarListaOfertas() {
    const contenedor = document.getElementById('listaOfertas');
    if (!contenedor) return;

    if (!datos.ofertas || datos.ofertas.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-state">
                <p>📄</p>
                <p>No hay ofertas registradas</p>
            </div>
        `;
        return;
    }

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>N° Oferta</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th>Cliente</th>
                    <th>Vendedor</th>
                    <th>Sucursal</th>
                </tr>
            </thead>
            <tbody>
    `;

    datos.ofertas.forEach(oferta => {
        const estadoBadge = oferta.estado === 'Aprobada'
            ? '<span class="badge badge-success">Aprobada</span>'
            : '<span class="badge badge-warning">Pendiente</span>';

        html += `
            <tr>
                <td>${oferta.oferta_id}</td>
                <td>${oferta.numero_oferta}</td>
                <td>${oferta.fecha ? new Date(oferta.fecha).toLocaleDateString() : 'N/A'}</td>
                <td>${estadoBadge}</td>
                <td>${oferta.cliente_nombre || 'N/A'}</td>
                <td>${oferta.vendedor_nombre || 'N/A'}</td>
                <td>
                    <span class="badge badge-${oferta.sucursal.toLowerCase()}">
                        ${oferta.sucursal}
                    </span>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    contenedor.innerHTML = html;
}


function actualizarListaTecnicos() {
    const contenedor = document.getElementById('listaTecnicos');
    if (!contenedor) return;

    if (!datos.tecnicos || datos.tecnicos.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-state">
                <p>👥</p>
                <p>No hay técnicos registrados</p>
            </div>
        `;
        return;
    }

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Especialidad</th>
                    <th>Sucursal</th>
                </tr>
            </thead>
            <tbody>
    `;

    datos.tecnicos.forEach(tecnico => {
        html += `
            <tr>
                <td>${tecnico.tecnico_id}</td>
                <td>${tecnico.nombre}</td>
                <td>${tecnico.especialidad || 'N/A'}</td>
                <td>
                    <span class="badge badge-${tecnico.sucursal.toLowerCase()}">
                        ${tecnico.sucursal}
                    </span>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    contenedor.innerHTML = html;
}




// ============================================
// CARGAR SELECT DE ÁREAS TÉCNICAS
// ============================================

function cargarSelectAreas() {
    const select = document.getElementById('areaTecnica');
    if (!select) return;

    select.innerHTML = '<option value="">Seleccionar área...</option>';
    
    datos.areas.forEach(area => {
        const option = document.createElement('option');
        option.value = area.area_id;
        option.textContent = area.nombre;
        select.appendChild(option);
    });
}

// ============================================
// FUNCIONES DE CALIBRACIÓN (PENDIENTES)
// ============================================

function actualizarListaPendientes() {
    const contenedor = document.getElementById('listaPendientes');
    if (!contenedor) return;

    // Equipos sin calibración
    const equiposSinCalibrar = datos.equipos.filter(e => {
        return !datos.calibraciones.some(c => c.equipo_id === e.equipo_id);
    });

    if (equiposSinCalibrar.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-state">
                <p>✅</p>
                <p>No hay equipos pendientes de calibración</p>
            </div>
        `;
        return;
    }

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Equipo</th>
                    <th>Cliente</th>
                    <th>Marca/Modelo</th>
                    <th>Sucursal</th>
                    <th>Acción</th>
                </tr>
            </thead>
            <tbody>
    `;

    equiposSinCalibrar.forEach(equipo => {
        html += `
            <tr>
                <td>${equipo.nombre}</td>
                <td>${equipo.cliente_nombre || 'N/A'}</td>
                <td>${equipo.marca} / ${equipo.modelo}</td>
                <td><span class="badge badge-${equipo.sucursal.toLowerCase()}">${equipo.sucursal}</span></td>
                <td>
                    <button class="btn btn-primary" onclick="iniciarCalibracion(${equipo.equipo_id})">
                        Calibrar
                    </button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    contenedor.innerHTML = html;
}

// Función placeholder para iniciar calibración
window.iniciarCalibracion = function(equipoId) {
    mostrarAlerta('Funcionalidad de calibración en desarrollo', 'error');
};

// ============================================
// CERTIFICADOS
// ============================================

function actualizarListaCertificadosTab() {
    const contenedor = document.getElementById('listaCertificadosTab');
    if (!contenedor) return;

    contenedor.innerHTML = `
        <div class="empty-state">
            <p>📄</p>
            <p>Funcionalidad de certificados en desarrollo</p>
            <p class="muted-text">Se integrará con la tabla Calibracion de la BD</p>
        </div>
    `;
}

// ============================================
// EXPORTAR/IMPORTAR/LIMPIAR DATOS
// ============================================

document.getElementById('exportarDatos')?.addEventListener('click', async function() {
    try {
        const dataToExport = {
            clientes: datos.clientes,
            equipos: datos.equipos,
            calibraciones: datos.calibraciones,
            fecha: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tegmetro-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        mostrarAlerta('Datos exportados exitosamente');
    } catch (error) {
        console.error('Error al exportar:', error);
        mostrarAlerta('Error al exportar datos', 'error');
    }
});

document.getElementById('limpiarDatos')?.addEventListener('click', function() {
    if (confirm('⚠️ ADVERTENCIA: Esto NO eliminará datos de la base de datos, solo limpiará la caché local. ¿Continuar?')) {
        datos = {
            clientes: [],
            equipos: [],
            calibraciones: [],
            certificados: [],
            areas: []
        };
        actualizarListaDatos();
        mostrarAlerta('Caché local limpiada. Recargue la página para volver a cargar desde la BD.');
    }
});

// ============================================
// FUNCIONES DE EDICIÓN Y ELIMINACIÓN DE CLIENTES
// ============================================

function openEditClientModal(clientId) {
    const cliente = datos.clientes.find(c => c.cliente_id === clientId);
    if (!cliente) {
        mostrarAlerta('Cliente no encontrado', 'error');
        return;
    }

    document.getElementById('editClientId').value = cliente.cliente_id;
    document.getElementById('editRazonSocial').value = cliente.nombre;
    document.getElementById('editRucId').value = cliente.cedula_ruc;
    document.getElementById('editDireccionFiscal').value = cliente.direccion;
    document.getElementById('editTelefono').value = cliente.telefono;
    document.getElementById('editEmail').value = cliente.correo;

    document.getElementById('editClientModal').style.display = 'block';
}

function closeEditClientModal() {
    document.getElementById('editClientModal').style.display = 'none';
}

async function deleteClient(clientId) {
    if (!confirm('¿Está seguro que desea eliminar este cliente?')) {
        return;
    }

    try {
        const response = await fetch(`/api/clientes/${clientId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            mostrarAlerta('Cliente eliminado exitosamente');
            await cargarClientes(); // Recargar lista
        } else {
            mostrarAlerta(result.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al eliminar cliente', 'error');
    }
}

document.getElementById('editClientForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const clientId = document.getElementById('editClientId').value;
    const razonSocial = document.getElementById('editRazonSocial').value.trim();
    const rucId = document.getElementById('editRucId').value.trim();
    const direccionFiscal = document.getElementById('editDireccionFiscal').value.trim();
    const telefono = document.getElementById('editTelefono').value.trim();
    const email = document.getElementById('editEmail').value.trim();

    // Validaciones
    if (!razonSocial || !rucId || !telefono || !email) {
        mostrarAlerta('Por favor, complete todos los campos obligatorios.', 'error');
        return;
    }

    const clienteData = {
        nombre: razonSocial,
        cedula_ruc: rucId,
        direccion: direccionFiscal,
        telefono: telefono,
        correo: email
    };

    try {
        const response = await fetch(`/api/clientes/${clientId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(clienteData)
        });

        const result = await response.json();

        if (result.success) {
            mostrarAlerta('Cliente actualizado exitosamente');
            closeEditClientModal();
            await cargarClientes(); // Recargar lista
        } else {
            mostrarAlerta(result.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al actualizar cliente', 'error');
    }
});
// ============================================
// FUNCIONES DE EDICIÓN Y ELIMINACIÓN DE EQUIPOS
// ============================================

function openEditEquipmentModal(equipmentId) {
    const equipo = datos.equipos.find(e => e.equipo_id === equipmentId);
    if (!equipo) {
        mostrarAlerta('Equipo no encontrado', 'error');
        return;
    }

    document.getElementById('editEquipmentId').value = equipo.equipo_id;
    document.getElementById('editTipoEquipo').value = equipo.nombre;
    document.getElementById('editModelo').value = equipo.modelo;
    document.getElementById('editNumeroSerie').value = equipo.serie;
    document.getElementById('editCodigoInterno').value = equipo.codigo_interno;
    document.getElementById('editMarca').value = equipo.marca;

    document.getElementById('editEquipmentModal').style.display = 'block';
}

function closeEditEquipmentModal() {
    document.getElementById('editEquipmentModal').style.display = 'none';
}

async function deleteEquipment(equipmentId) {
    if (!confirm('¿Está seguro que desea eliminar este equipo?')) {
        return;
    }

    try {
        const response = await fetch(`/api/equipos/${equipmentId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            mostrarAlerta('Equipo eliminado exitosamente');
            await cargarEquipos(); // Recargar lista
        } else {
            mostrarAlerta(result.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al eliminar equipo', 'error');
    }
}

document.getElementById('editEquipmentForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const equipmentId = document.getElementById('editEquipmentId').value;
    const tipoEquipo = document.getElementById('editTipoEquipo').value.trim();
    const modelo = document.getElementById('editModelo').value.trim();
    const numeroSerie = document.getElementById('editNumeroSerie').value.trim();
    const codigoInterno = document.getElementById('editCodigoInterno').value.trim();
    const marca = document.getElementById('editMarca').value.trim();

    // Validaciones
    if (!tipoEquipo || !modelo || !numeroSerie || !marca) {
        mostrarAlerta('Por favor, complete todos los campos obligatorios.', 'error');
        return;
    }

    const equipmentData = {
        nombre: tipoEquipo,
        modelo: modelo,
        serie: numeroSerie,
        codigo_interno: codigoInterno,
        marca: marca
    };

    try {
        const response = await fetch(`/api/equipos/${equipmentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(equipmentData)
        });

        const result = await response.json();

        if (result.success) {
            mostrarAlerta('Equipo actualizado exitosamente');
            closeEditEquipmentModal();
            await cargarEquipos(); // Recargar lista
        } else {
            mostrarAlerta(result.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al actualizar equipo', 'error');
    }
});

// ============================================
// INICIALIZACIÓN
// ============================================


document.addEventListener('DOMContentLoaded', async function () {
    console.log('🚀 Sistema de Calibraciones - BD Distribuida Tegmetro');
    console.log('📊 Cargando datos desde SQL Server...');
    
    await cargarDatos();
    
    console.log('✅ Sistema inicializado correctamente');
    console.log('📍 Clientes:', datos.clientes.length);
    console.log('⚙️ Equipos:', datos.equipos.length);
    console.log('🧪 Calibraciones:', datos.calibraciones.length);
});

// ============================================
// GESTIÓN DE SESIÓN
// ============================================

// Verificar sesión al cargar
function verificarSesion() {
    const usuarioActual = sessionStorage.getItem('usuarioActual');
    
    if (!usuarioActual) {
        // No hay sesión, redirigir al login
        window.location.href = 'login.html';
        return null;
    }
    
    return JSON.parse(usuarioActual);
}

// Mostrar información del usuario
function mostrarInfoUsuario() {
    const usuario = verificarSesion();
    if (!usuario) return;
    
    const userInfoDiv = document.getElementById('userInfo');
    if (userInfoDiv) {
        userInfoDiv.innerHTML = `
            <strong>👤 ${usuario.nombre}</strong> 
            <span style="margin-left: 15px; color: #7f8c8d;">
                Rol: ${usuario.role}
            </span>
            <span style="margin-left: 15px; color: #7f8c8d;">
                Sucursal: ${usuario.sucursal}
            </span>
        `;
    }
}

// Cerrar sesión
function cerrarSesion() {
    if (confirm('¿Está seguro que desea cerrar sesión?')) {
        sessionStorage.removeItem('usuarioActual');
        window.location.href = 'login.html';
    }
}

// Agregar al DOMContentLoaded existente
document.addEventListener('DOMContentLoaded', async function () {
    // Verificar sesión primero
    const usuario = verificarSesion();
    if (usuario) {
        mostrarInfoUsuario();
    }
    
    // Resto de tu código de inicialización...
    console.log('🚀 Sistema de Calibraciones - BD Distribuida Tegmetro');
    console.log('📊 Cargando datos desde SQL Server...');
    
    await cargarDatos();
    
    console.log('✅ Sistema inicializado correctamente');
    console.log('📍 Usuario:', usuario.nombre);
    console.log('📍 Clientes:', datos.clientes.length);
    console.log('⚙️ Equipos:', datos.equipos.length);
    console.log('🧪 Calibraciones:', datos.calibraciones.length);
});