const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: true,
    trim: true,
  },
  completado: {
    type: Boolean,
    default: false,
  },
}, { _id: true }); // Asegurar que cada producto tenga _id

const clienteSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true,
  },
  apellido: {
    type: String,
    required: [true, 'El apellido es obligatorio'],
    trim: true,
  },
  frecuencia: {
    type: String,
    required: [true, 'La frecuencia es obligatoria'],
    enum: ['LMV', 'MJS'],
  },
  // DOS ARRAYS DE PRODUCTOS SEPARADOS
  productosDanone: [productoSchema],
  productosMastellone: [productoSchema],
}, {
  timestamps: true,
});

// Índices para búsquedas rápidas
clienteSchema.index({ nombre: 1, apellido: 1 });
clienteSchema.index({ frecuencia: 1 });

// Método virtual para nombre completo
clienteSchema.virtual('nombreCompleto').get(function() {
  return `${this.nombre} ${this.apellido}`;
});

const Cliente = mongoose.model('Cliente', clienteSchema);

module.exports = Cliente;