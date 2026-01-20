require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const connectDB = require('./config/db');
const { reiniciarCoberturas, limpiarDevoluciones } = require('./config/cronJobs');

// Inicializar Express
const app = express();

// Conectar a MongoDB
connectDB();

// Middlewares
app.use(cors({
    origin: `${process.env.FRONTEND_URL}`,
    credentials: true
}));
app.use(compression()); // Comprimir respuestas para mayor velocidad
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Rutas
app.use('/api/coberturas', require('./routes/coberturas'));
app.use('/api/devoluciones', require('./routes/devoluciones'));
app.use('/api/admin', require('./routes/admin'));

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 API de Gestión Serenísima funcionando',
    version: '1.0.0',
    endpoints: {
      coberturas: '/api/coberturas/clientes',
      devoluciones: '/api/devoluciones',
      admin: '/api/admin/info-tareas'
    },
    cronJobs: {
      reiniciarCoberturas: 'Cada 1° del mes a las 00:00 hs',
      limpiarDevoluciones: 'Cada 1° del mes a las 00:30 hs'
    }
  });
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

// Manejo de errores generales
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Error del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Puerto
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  
  // Activar tareas programadas
  console.log('\n⏰ Activando tareas programadas:');
  
  reiniciarCoberturas.start();
  console.log('  ✅ Reinicio de coberturas: Cada 1° del mes a las 00:00 hs (Argentina)');
  
  limpiarDevoluciones.start();
  console.log('  ✅ Limpieza de devoluciones: Cada 1° del mes a las 00:30 hs (Argentina)');
  
  console.log('\n💡 Tip: Las tareas se ejecutarán automáticamente cada mes');
  console.log('📝 Ver info: GET /api/admin/info-tareas');
  console.log('🧪 Testing manual: POST /api/admin/ejecutar-tareas');
});