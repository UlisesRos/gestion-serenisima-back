const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Cliente = require('../models/Cliente');

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
// @desc    Agregar un producto a Danone
// @access  Public
router.post('/clientes/:id/productos/danone', [
  body('codigo').trim().notEmpty().withMessage('El código es obligatorio'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const cliente = await Cliente.findById(req.params.id);

    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    cliente.productosDanone.push({
      codigo: req.body.codigo,
      completado: false,
    });

    const clienteActualizado = await cliente.save();
    res.json(clienteActualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   PUT /api/coberturas/clientes/:id/productos/danone/:productoId
// @desc    Actualizar estado de un producto Danone
// @access  Public
router.put('/clientes/:id/productos/danone/:productoId', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);

    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    const producto = cliente.productosDanone.id(req.params.productoId);
    
    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

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
// @desc    Eliminar un producto de Danone
// @access  Public
router.delete('/clientes/:id/productos/danone/:productoId', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);

    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

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
// @desc    Agregar un producto a Mastellone
// @access  Public
router.post('/clientes/:id/productos/mastellone', [
  body('codigo').trim().notEmpty().withMessage('El código es obligatorio'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const cliente = await Cliente.findById(req.params.id);

    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    cliente.productosMastellone.push({
      codigo: req.body.codigo,
      completado: false,
    });

    const clienteActualizado = await cliente.save();
    res.json(clienteActualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   PUT /api/coberturas/clientes/:id/productos/mastellone/:productoId
// @desc    Actualizar estado de un producto Mastellone
// @access  Public
router.put('/clientes/:id/productos/mastellone/:productoId', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);

    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    const producto = cliente.productosMastellone.id(req.params.productoId);
    
    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

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
// @desc    Eliminar un producto de Mastellone
// @access  Public
router.delete('/clientes/:id/productos/mastellone/:productoId', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);

    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    cliente.productosMastellone.pull(req.params.productoId);
    const clienteActualizado = await cliente.save();
    
    res.json(clienteActualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;