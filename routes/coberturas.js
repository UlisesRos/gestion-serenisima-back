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
      productos: req.body.productos || [],
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

// @route   POST /api/coberturas/clientes/:id/productos
// @desc    Agregar un producto a un cliente
// @access  Public
router.post('/clientes/:id/productos', [
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

    // Agregar producto al array
    cliente.productos.push({
      codigo: req.body.codigo,
      completado: false,
    });

    // Guardar y devolver el cliente actualizado
    const clienteActualizado = await cliente.save();
    
    // Importante: devolver el cliente completo con los _id generados
    res.json(clienteActualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   PUT /api/coberturas/clientes/:id/productos/:productoId
// @desc    Actualizar estado de un producto
// @access  Public
router.put('/clientes/:id/productos/:productoId', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);

    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    // Buscar el producto por _id en el subdocumento
    const producto = cliente.productos.id(req.params.productoId);
    
    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    // Actualizar el estado
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

// @route   DELETE /api/coberturas/clientes/:id/productos/:productoId
// @desc    Eliminar un producto de un cliente
// @access  Public
router.delete('/clientes/:id/productos/:productoId', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);

    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    // Remover el producto usando pull (método de Mongoose para subdocumentos)
    cliente.productos.pull(req.params.productoId);
    const clienteActualizado = await cliente.save();
    
    res.json(clienteActualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;