const mongoose = require('mongoose');

const productoDevolucionSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: true,
    trim: true,
  },
  cantidad: {
    type: Number,
    required: true,
    min: [1, 'La cantidad debe ser al menos 1'],
  },
  descripcion: {
    type: String,
    trim: true,
    default: '',
  },
  completado: {
    type: Boolean,
    default: false,
  },
}, { _id: true }); // Asegurar que cada producto tenga _id

const devolucionSchema = new mongoose.Schema({
  nombreCliente: {
    type: String,
    required: [true, 'El nombre del cliente es obligatorio'],
    trim: true,
  },
  fecha: {
    type: Date,
    required: true,
    default: Date.now,
  },
  productos: {
    type: [productoDevolucionSchema],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Debe haber al menos un producto',
    },
  },
}, {
  timestamps: true,
});

// Índices para búsquedas rápidas
devolucionSchema.index({ nombreCliente: 1 });
devolucionSchema.index({ fecha: -1 });
devolucionSchema.index({ nombreCliente: 1, fecha: -1 });

const Devolucion = mongoose.model('Devolucion', devolucionSchema);

module.exports = Devolucion;