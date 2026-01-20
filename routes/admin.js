const express = require('express');
const router = express.Router();
const { ejecutarTareasManualmente } = require('../config/cronJobs');
const Cliente = require('../models/Cliente');
const Devolucion = require('../models/Devolucion');

// @route   POST /api/admin/ejecutar-tareas
// @desc    Ejecutar manualmente las tareas programadas (para testing)
// @access  Public (en producción deberías proteger esta ruta)
router.post('/ejecutar-tareas', async (req, res) => {
  try {
    await ejecutarTareasManualmente();
    
    res.json({
      message: 'Tareas ejecutadas correctamente',
      fecha: new Date().toLocaleString('es-AR')
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al ejecutar tareas' });
  }
});

// @route   POST /api/admin/reiniciar-coberturas
// @desc    Reiniciar solo las coberturas manualmente
// @access  Public
router.post('/reiniciar-coberturas', async (req, res) => {
  try {
    const clientes = await Cliente.find();
    let totalReiniciados = 0;
    
    for (const cliente of clientes) {
      cliente.productos.forEach(producto => {
        if (producto.completado) totalReiniciados++;
        producto.completado = false;
      });
      await cliente.save();
    }
    
    res.json({
      message: 'Coberturas reiniciadas',
      clientesActualizados: clientes.length,
      productosReiniciados: totalReiniciados,
      fecha: new Date().toLocaleString('es-AR')
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al reiniciar coberturas' });
  }
});

// @route   POST /api/admin/limpiar-devoluciones
// @desc    Limpiar devoluciones antiguas manualmente
// @access  Public
router.post('/limpiar-devoluciones', async (req, res) => {
  try {
    const hoy = new Date();
    const primerDiaMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const fechaLimite = new Date(primerDiaMesActual);
    fechaLimite.setMonth(fechaLimite.getMonth() - 2);
    
    const resultado = await Devolucion.deleteMany({
      fecha: { $lt: fechaLimite }
    });
    
    res.json({
      message: 'Devoluciones antiguas eliminadas',
      devolucionesEliminadas: resultado.deletedCount,
      fechaLimite: fechaLimite.toLocaleDateString('es-AR'),
      fecha: new Date().toLocaleString('es-AR')
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al limpiar devoluciones' });
  }
});

// @route   GET /api/admin/info-tareas
// @desc    Obtener información sobre las próximas ejecuciones
// @access  Public
router.get('/info-tareas', (req, res) => {
  const hoy = new Date();
  const proximoPrimero = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
  
  // Calcular fecha límite para devoluciones
  const fechaLimite = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  fechaLimite.setMonth(fechaLimite.getMonth() - 2);
  
  res.json({
    tareasProgramadas: {
      reiniciarCoberturas: {
        descripcion: 'Marca todos los productos como pendientes',
        frecuencia: 'Cada 1° del mes a las 00:00 hs',
        proximaEjecucion: proximoPrimero.toLocaleDateString('es-AR'),
        zonaHoraria: 'America/Argentina/Buenos_Aires'
      },
      limpiarDevoluciones: {
        descripcion: 'Elimina devoluciones de hace 2 meses o más',
        frecuencia: 'Cada 1° del mes a las 00:30 hs',
        proximaEjecucion: proximoPrimero.toLocaleDateString('es-AR'),
        fechaLimiteActual: fechaLimite.toLocaleDateString('es-AR'),
        zonaHoraria: 'America/Argentina/Buenos_Aires'
      }
    },
    servidorActivo: true,
    fecha: new Date().toLocaleString('es-AR')
  });
});

module.exports = router;