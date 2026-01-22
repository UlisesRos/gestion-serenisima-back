const cron = require('node-cron');
const Cliente = require('../models/Cliente');
const Devolucion = require('../models/Devolucion');

/**
 * Reiniciar todas las coberturas (productos completados -> pendientes)
 * IMPORTANTE: Reinicia TANTO Danone como Mastellone
 * Se ejecuta el 1° de cada mes a las 00:00
 */
const reiniciarCoberturas = cron.schedule('0 0 1 * *', async () => {
  try {
    console.log('🔄 Iniciando reinicio mensual de coberturas...');
    
    const clientes = await Cliente.find();
    let totalProductosReiniciados = 0;
    
    for (const cliente of clientes) {
      // Contar productos completados en AMBAS listas
      const completadosDanone = cliente.productosDanone.filter(p => p.completado).length;
      const completadosMastellone = cliente.productosMastellone.filter(p => p.completado).length;
      
      // Reiniciar DANONE
      cliente.productosDanone.forEach(producto => {
        producto.completado = false;
      });
      
      // Reiniciar MASTELLONE
      cliente.productosMastellone.forEach(producto => {
        producto.completado = false;
      });
      
      await cliente.save();
      totalProductosReiniciados += (completadosDanone + completadosMastellone);
    }
    
    console.log(`✅ Coberturas reiniciadas:`);
    console.log(`   - ${clientes.length} clientes actualizados`);
    console.log(`   - ${totalProductosReiniciados} productos marcados como pendientes`);
    console.log(`   - Danone y Mastellone reiniciados`);
    console.log(`📅 Fecha: ${new Date().toLocaleString('es-AR')}`);
    
  } catch (error) {
    console.error('❌ Error al reiniciar coberturas:', error);
  }
}, {
  scheduled: false,
  timezone: "America/Argentina/Buenos_Aires"
});

/**
 * Limpiar devoluciones antiguas (más de 2 meses)
 * Se ejecuta el 1° de cada mes a las 00:30
 */
const limpiarDevoluciones = cron.schedule('30 0 1 * *', async () => {
  try {
    console.log('🧹 Iniciando limpieza de devoluciones antiguas...');
    
    const hoy = new Date();
    const primerDiaMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const fechaLimite = new Date(primerDiaMesActual);
    fechaLimite.setMonth(fechaLimite.getMonth() - 2);
    
    console.log(`📅 Fecha límite: ${fechaLimite.toLocaleDateString('es-AR')} (se borrarán devoluciones anteriores a esta fecha)`);
    
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