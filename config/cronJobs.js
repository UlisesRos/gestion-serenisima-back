const cron = require('node-cron');
const Cliente = require('../models/Cliente');
const Devolucion = require('../models/Devolucion');

/**
 * Reiniciar todas las coberturas (productos completados -> pendientes)
 * Se ejecuta el 1° de cada mes a las 00:00
 */
const reiniciarCoberturas = cron.schedule('0 0 1 * *', async () => {
  try {
    console.log('🔄 Iniciando reinicio mensual de coberturas...');
    
    // Obtener todos los clientes
    const clientes = await Cliente.find();
    let totalProductosReiniciados = 0;
    
    // Reiniciar productos de cada cliente
    for (const cliente of clientes) {
      const productosCompletados = cliente.productos.filter(p => p.completado).length;
      
      // Marcar todos los productos como no completados
      cliente.productos.forEach(producto => {
        producto.completado = false;
      });
      
      await cliente.save();
      totalProductosReiniciados += productosCompletados;
    }
    
    console.log(`✅ Coberturas reiniciadas: ${clientes.length} clientes, ${totalProductosReiniciados} productos marcados como pendientes`);
    console.log(`📅 Fecha: ${new Date().toLocaleString('es-AR')}`);
    
  } catch (error) {
    console.error('❌ Error al reiniciar coberturas:', error);
  }
}, {
  scheduled: false, // No inicia automáticamente, lo activamos manualmente
  timezone: "America/Argentina/Buenos_Aires" // Zona horaria de Argentina
});

/**
 * Limpiar devoluciones antiguas (más de 2 meses)
 * Se ejecuta el 1° de cada mes a las 00:30
 */
const limpiarDevoluciones = cron.schedule('30 0 1 * *', async () => {
  try {
    console.log('🧹 Iniciando limpieza de devoluciones antiguas...');
    
    // Calcular fecha límite (2 meses atrás desde el primer día del mes actual)
    const hoy = new Date();
    const primerDiaMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const fechaLimite = new Date(primerDiaMesActual);
    fechaLimite.setMonth(fechaLimite.getMonth() - 2);
    
    console.log(`📅 Fecha límite: ${fechaLimite.toLocaleDateString('es-AR')} (se borrarán devoluciones anteriores a esta fecha)`);
    
    // Eliminar devoluciones anteriores a la fecha límite
    const resultado = await Devolucion.deleteMany({
      fecha: { $lt: fechaLimite }
    });
    
    console.log(`✅ Devoluciones eliminadas: ${resultado.deletedCount}`);
    console.log(`📅 Fecha de ejecución: ${new Date().toLocaleString('es-AR')}`);
    
  } catch (error) {
    console.error('❌ Error al limpiar devoluciones:', error);
  }
}, {
  scheduled: false,
  timezone: "America/Argentina/Buenos_Aires"
});

/**
 * Función para ejecutar manualmente todas las tareas (útil para testing)
 */
const ejecutarTareasManualmente = async () => {
  console.log('🚀 Ejecutando tareas manualmente...');
  await reiniciarCoberturas._task();
  await limpiarDevoluciones._task();
  console.log('✅ Tareas manuales completadas');
};

module.exports = {
  reiniciarCoberturas,
  limpiarDevoluciones,
  ejecutarTareasManualmente
};