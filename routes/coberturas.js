const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const Cliente = require('../models/Cliente');

// Multer en memoria (no guarda en disco)
const upload = multer({ storage: multer.memoryStorage() });

// ==================== PARSER DE PDF ====================

/**
 * Parsea el texto extraído del PDF de Danone/Mastellone.
 * Cada línea útil empieza con el número de reparto (10 dígitos).
 * Estructura: REPARTO  COD_CLIENTE  NOMBRE_CLIENTE  SKU1 SKU2 SKU3...
 *
 * El PDF tiene 4 páginas porque la tabla es muy ancha.
 * Las páginas 3-4 son overflow de las mismas filas, entonces
 * pueden aparecer varias líneas con el mismo codigoCliente → se mergean.
 *
 * Devuelve un array de objetos:
 * [{ codigoCliente, nombre, apellido, codigos: Set<string> }]
 */
function parsearPDF(texto) {
  const map = new Map(); // codigoCliente → { nombre, apellido, codigos }

  // Normalizar saltos de línea
  const lineas = texto.split(/\r?\n/);

  // Regex para detectar líneas de datos:
  // - Empieza con un número de reparto (10 dígitos)
  // - Seguido de un código de cliente (7-8 dígitos: empieza con 3 o 7)
  // - Seguido del nombre del cliente (letras, espacios, puntos, comas, &, Ñ, etc.)
  // - Seguido de cero o más códigos SKU de 6 dígitos
  const lineaRe = /^(\d{10})\s+(\d{7,8})\s+([A-ZÁÉÍÓÚÑÜA-Z0-9\s.,&'()\-\/]+?)\s*((?:\d{6}\s*)*)$/i;
  // Regex para extraer SKUs individuales de 6 dígitos
  const skuRe = /\d{6}/g;

  for (const linea of lineas) {
    const trimmed = linea.trim();
    if (!trimmed) continue;

    const match = trimmed.match(lineaRe);
    if (!match) continue;

    const codigoCliente = match[2];
    const nombreCompleto = match[3].trim();
    const codigosStr = match[4] || '';

    // Extraer SKUs de 6 dígitos
    const skus = codigosStr.match(skuRe) || [];

    if (map.has(codigoCliente)) {
      // Mergear códigos (el cliente apareció en otra página del PDF)
      const entrada = map.get(codigoCliente);
      for (const sku of skus) entrada.codigos.add(sku);
    } else {
      // Separar nombre y apellido: primera palabra = nombre, resto = apellido
      // (Para clientes con nombre simple como "WANG CHENGPING" → nombre: WANG, apellido: CHENGPING)
      const partes = nombreCompleto.split(/\s+/);
      const nombre = partes[0] || nombreCompleto;
      const apellido = partes.slice(1).join(' ') || '-';

      map.set(codigoCliente, {
        codigoCliente,
        nombre,
        apellido,
        nombreCompleto,
        codigos: new Set(skus),
      });
    }
  }

  return Array.from(map.values());
}

// ==================== IMPORTAR PDF ====================

// @route   POST /api/coberturas/importar-pdf/:empresa
// @desc    Importar clientes y códigos desde un PDF de Danone o Mastellone
// @access  Public
router.post('/importar-pdf/:empresa', upload.single('pdf'), async (req, res) => {
  const empresa = req.params.empresa.toLowerCase();

  if (!['danone', 'mastellone'].includes(empresa)) {
    return res.status(400).json({ message: 'Empresa inválida. Debe ser "danone" o "mastellone"' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'No se recibió ningún archivo PDF' });
  }

  try {
    // Extraer texto del PDF
    const pdfData = await pdfParse(req.file.buffer);
    const entradas = parsearPDF(pdfData.text);

    if (entradas.length === 0) {
      return res.status(400).json({ message: 'No se encontraron clientes en el PDF. Verificá el formato.' });
    }

    const campoProductos = empresa === 'danone' ? 'productosDanone' : 'productosMastellone';

    // Verificar si ya hay clientes en la BD
    const totalExistentes = await Cliente.countDocuments();

    let clientesProcesados = 0;
    let codigosCompletados = 0;
    let codigosAgregados = 0;

    if (totalExistentes === 0) {
      // ── CASO A: No hay datos → crear todo desde el PDF ──
      const nuevosClientes = entradas.map(entrada => {
        const productos = Array.from(entrada.codigos).map(codigo => ({
          codigo,
          completado: false,
        }));

        return {
          codigoCliente: entrada.codigoCliente,
          nombre: entrada.nombre,
          apellido: entrada.apellido,
          frecuencia: 'LMV', // default, el usuario puede editar
          productosDanone: empresa === 'danone' ? productos : [],
          productosMastellone: empresa === 'mastellone' ? productos : [],
        };
      });

      await Cliente.insertMany(nuevosClientes);
      clientesProcesados = nuevosClientes.length;
      codigosAgregados = nuevosClientes.reduce((sum, c) => sum + c[campoProductos].length, 0);

    } else {
      // ── CASO B: Ya hay datos → comparar y actualizar ──
      for (const entrada of entradas) {
        // Buscar por codigoCliente (identificador del PDF)
        let cliente = await Cliente.findOne({ codigoCliente: entrada.codigoCliente });

        if (!cliente) {
          // Cliente nuevo que no estaba en la app → crearlo
          const productos = Array.from(entrada.codigos).map(codigo => ({
            codigo,
            completado: false,
          }));

          cliente = new Cliente({
            codigoCliente: entrada.codigoCliente,
            nombre: entrada.nombre,
            apellido: entrada.apellido,
            frecuencia: 'LMV',
            productosDanone: empresa === 'danone' ? productos : [],
            productosMastellone: empresa === 'mastellone' ? productos : [],
          });

          await cliente.save();
          clientesProcesados++;
          codigosAgregados += productos.length;
          continue;
        }

        // Cliente existente → comparar sus códigos con los del PDF
        const codigosEnPDF = entrada.codigos; // Set con los que FALTAN (siguen pendientes)
        const productosActuales = cliente[campoProductos];
        const codigosEnApp = new Set(productosActuales.map(p => p.codigo));

        let modificado = false;

        // 1. Códigos en la app que YA NO están en el PDF → marcar completado
        for (const producto of productosActuales) {
          if (!codigosEnPDF.has(producto.codigo) && !producto.completado) {
            producto.completado = true;
            codigosCompletados++;
            modificado = true;
          }
        }

        // 2. Códigos en el PDF que NO están en la app → agregar
        for (const codigo of codigosEnPDF) {
          if (!codigosEnApp.has(codigo)) {
            cliente[campoProductos].push({ codigo, completado: false });
            codigosAgregados++;
            modificado = true;
          }
        }

        if (modificado) {
          await cliente.save();
        }

        clientesProcesados++;
      }
    }

    res.json({
      message: 'PDF importado correctamente',
      empresa,
      clientesProcesados,
      codigosCompletados,
      codigosAgregados,
    });

  } catch (error) {
    console.error('Error importando PDF:', error);
    res.status(500).json({ message: 'Error al procesar el PDF', error: error.message });
  }
});

// ==================== BORRAR TODO ====================

// @route   DELETE /api/coberturas/clientes/todos
// @desc    Eliminar todos los clientes (para empezar desde cero)
// @access  Public
router.delete('/clientes/todos', async (req, res) => {
  try {
    const resultado = await Cliente.deleteMany({});
    res.json({
      message: 'Todos los clientes eliminados correctamente',
      eliminados: resultado.deletedCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// ==================== CLIENTES CRUD ====================

// @route   GET /api/coberturas/clientes
// @desc    Obtener todos los clientes
// @access  Public
router.get('/clientes', async (req, res) => {
  try {
    const clientes = await Cliente.find().sort({ nombre: 1, apellido: 1 });
    res.json(clientes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   GET /api/coberturas/clientes/:id
// @desc    Obtener un cliente por ID
// @access  Public
router.get('/clientes/:id', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    
    res.json(cliente);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   POST /api/coberturas/clientes
// @desc    Crear un nuevo cliente
// @access  Public
router.post('/clientes', [
  body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio'),
  body('apellido').trim().notEmpty().withMessage('El apellido es obligatorio'),
  body('frecuencia').isIn(['LMV', 'MJS']).withMessage('Frecuencia inválida'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const cliente = new Cliente({
      codigoCliente: req.body.codigoCliente || undefined,
      nombre: req.body.nombre,
      apellido: req.body.apellido,
      frecuencia: req.body.frecuencia,
      productosDanone: [],
      productosMastellone: [],
    });

    const nuevoCliente = await cliente.save();
    res.status(201).json(nuevoCliente);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   PUT /api/coberturas/clientes/:id
// @desc    Actualizar un cliente
// @access  Public
router.put('/clientes/:id', [
  body('nombre').optional().trim().notEmpty(),
  body('apellido').optional().trim().notEmpty(),
  body('frecuencia').optional().isIn(['LMV', 'MJS']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const cliente = await Cliente.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    res.json(cliente);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   DELETE /api/coberturas/clientes/:id
// @desc    Eliminar un cliente
// @access  Public
router.delete('/clientes/:id', async (req, res) => {
  try {
    const cliente = await Cliente.findByIdAndDelete(req.params.id);

    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    res.json({ message: 'Cliente eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// ==================== PRODUCTOS DANONE ====================

// @route   POST /api/coberturas/clientes/:id/productos/danone
router.post('/clientes/:id/productos/danone', [
  body('codigo').trim().notEmpty().withMessage('El código es obligatorio'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) return res.status(404).json({ message: 'Cliente no encontrado' });

    cliente.productosDanone.push({ codigo: req.body.codigo, completado: false });
    const clienteActualizado = await cliente.save();
    res.json(clienteActualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   PUT /api/coberturas/clientes/:id/productos/danone/:productoId
router.put('/clientes/:id/productos/danone/:productoId', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) return res.status(404).json({ message: 'Cliente no encontrado' });

    const producto = cliente.productosDanone.id(req.params.productoId);
    if (!producto) return res.status(404).json({ message: 'Producto no encontrado' });

    if (req.body.hasOwnProperty('completado')) {
      producto.completado = req.body.completado;
    }

    const clienteActualizado = await cliente.save();
    res.json(clienteActualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   DELETE /api/coberturas/clientes/:id/productos/danone/:productoId
router.delete('/clientes/:id/productos/danone/:productoId', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) return res.status(404).json({ message: 'Cliente no encontrado' });

    cliente.productosDanone.pull(req.params.productoId);
    const clienteActualizado = await cliente.save();
    res.json(clienteActualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// ==================== PRODUCTOS MASTELLONE ====================

// @route   POST /api/coberturas/clientes/:id/productos/mastellone
router.post('/clientes/:id/productos/mastellone', [
  body('codigo').trim().notEmpty().withMessage('El código es obligatorio'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) return res.status(404).json({ message: 'Cliente no encontrado' });

    cliente.productosMastellone.push({ codigo: req.body.codigo, completado: false });
    const clienteActualizado = await cliente.save();
    res.json(clienteActualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   PUT /api/coberturas/clientes/:id/productos/mastellone/:productoId
router.put('/clientes/:id/productos/mastellone/:productoId', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) return res.status(404).json({ message: 'Cliente no encontrado' });

    const producto = cliente.productosMastellone.id(req.params.productoId);
    if (!producto) return res.status(404).json({ message: 'Producto no encontrado' });

    if (req.body.hasOwnProperty('completado')) {
      producto.completado = req.body.completado;
    }

    const clienteActualizado = await cliente.save();
    res.json(clienteActualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   DELETE /api/coberturas/clientes/:id/productos/mastellone/:productoId
router.delete('/clientes/:id/productos/mastellone/:productoId', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) return res.status(404).json({ message: 'Cliente no encontrado' });

    cliente.productosMastellone.pull(req.params.productoId);
    const clienteActualizado = await cliente.save();
    res.json(clienteActualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;
