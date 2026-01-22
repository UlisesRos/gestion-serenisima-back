const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Devolucion = require('../models/Devolucion');

// @route   GET /api/devoluciones
// @desc    Obtener todas las devoluciones
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { nombre, fecha } = req.query;
    let query = {};

    if (nombre) {
      query.nombreCliente = { $regex: nombre, $options: 'i' };
    }

    if (fecha) {
      const fechaInicio = new Date(fecha);
      const fechaFin = new Date(fecha);
      fechaFin.setDate(fechaFin.getDate() + 1);
      
      query.fecha = {
        $gte: fechaInicio,
        $lt: fechaFin,
      };
    }

    const devoluciones = await Devolucion.find(query).sort({ fecha: -1 });
    res.json(devoluciones);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   GET /api/devoluciones/:id
// @desc    Obtener una devolución por ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const devolucion = await Devolucion.findById(req.params.id);
    
    if (!devolucion) {
      return res.status(404).json({ message: 'Devolución no encontrada' });
    }
    
    res.json(devolucion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   POST /api/devoluciones
// @desc    Crear una nueva devolución
// @access  Public
router.post('/', [
  body('nombreCliente').trim().notEmpty().withMessage('El nombre del cliente es obligatorio'),
  body('productos').isArray({ min: 1 }).withMessage('Debe haber al menos un producto'),
  body('productos.*.codigo').trim().notEmpty().withMessage('El código del producto es obligatorio'),
  body('productos.*.cantidad').isInt({ min: 1 }).withMessage('La cantidad debe ser al menos 1'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const devolucion = new Devolucion({
      nombreCliente: req.body.nombreCliente,
      fecha: req.body.fecha || new Date(),
      productos: req.body.productos.map(p => ({
        codigo: p.codigo,
        cantidad: p.cantidad,
        descripcion: p.descripcion || '',
        completado: false,
      })),
    });

    const nuevaDevolucion = await devolucion.save();
    res.status(201).json(nuevaDevolucion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   PUT /api/devoluciones/:id
// @desc    Actualizar una devolución
// @access  Public
router.put('/:id', [
  body('nombreCliente').optional().trim().notEmpty(),
  body('productos').optional().isArray({ min: 1 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const devolucion = await Devolucion.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!devolucion) {
      return res.status(404).json({ message: 'Devolución no encontrada' });
    }

    res.json(devolucion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   DELETE /api/devoluciones/:id
// @desc    Eliminar una devolución
// @access  Public
router.delete('/:id', async (req, res) => {
  try {
    const devolucion = await Devolucion.findByIdAndDelete(req.params.id);

    if (!devolucion) {
      return res.status(404).json({ message: 'Devolución no encontrada' });
    }

    res.json({ message: 'Devolución eliminada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   PUT /api/devoluciones/:id/productos/:productoId/toggle
// @desc    Marcar/desmarcar un producto como completado
// @access  Public
router.put('/:id/productos/:productoId/toggle', async (req, res) => {
  try {
    const devolucion = await Devolucion.findById(req.params.id);

    if (!devolucion) {
      return res.status(404).json({ message: 'Devolución no encontrada' });
    }

    const producto = devolucion.productos.id(req.params.productoId);
    
    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    producto.completado = !producto.completado;

    const devolucionActualizada = await devolucion.save();
    res.json(devolucionActualizada);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   PUT /api/devoluciones/:id/productos/:productoId
// @desc    Actualizar código Y/O cantidad de un producto
// @access  Public
router.put('/:id/productos/:productoId', [
  body('codigo').optional().trim().notEmpty().withMessage('El código no puede estar vacío'),
  body('cantidad').optional().isInt({ min: 1 }).withMessage('La cantidad debe ser al menos 1'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const devolucion = await Devolucion.findById(req.params.id);

    if (!devolucion) {
      return res.status(404).json({ message: 'Devolución no encontrada' });
    }

    const producto = devolucion.productos.id(req.params.productoId);
    
    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    // Actualizar código si se proporciona
    if (req.body.codigo !== undefined) {
      producto.codigo = req.body.codigo;
    }

    // Actualizar cantidad si se proporciona
    if (req.body.cantidad !== undefined) {
      producto.cantidad = req.body.cantidad;
    }

    const devolucionActualizada = await devolucion.save();
    res.json(devolucionActualizada);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;