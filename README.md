# 🚀 Backend - Gestión Serenísima

API REST para el sistema de gestión de coberturas y devoluciones con tareas automáticas mensuales.

## 📋 Tecnologías

- **Node.js** + **Express.js**
- **MongoDB Atlas** (Base de datos en la nube)
- **Mongoose** (ODM)
- **node-cron** (Tareas programadas)

## 🔧 Instalación

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar MongoDB Atlas

1. Ve a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crea una cuenta gratis
3. Crea un nuevo cluster (gratis)
4. Ve a "Database Access" y crea un usuario con contraseña
5. Ve a "Network Access" y agrega tu IP (o 0.0.0.0/0 para permitir todas)
6. Ve a "Clusters" → "Connect" → "Connect your application"
7. Copia el connection string

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del backend:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/gestion-serenisima?retryWrites=true&w=majority
NODE_ENV=development
```

Reemplaza `<username>`, `<password>` y `cluster0.xxxxx` con tus datos de MongoDB Atlas.

### 4. Ejecutar el servidor

**Modo desarrollo (con auto-reload):**
```bash
npm run dev
```

**Modo producción:**
```bash
npm start
```

El servidor estará en: `http://localhost:5000`

## ⏰ Tareas Automáticas (Cron Jobs)

El sistema ejecuta automáticamente estas tareas cada mes:

### 🔄 Reinicio de Coberturas
- **Cuándo**: Cada 1° del mes a las 00:00 hs (Argentina)
- **Qué hace**: Marca todos los productos de todos los clientes como "pendientes" (completado: false)
- **Por qué**: Para empezar el mes con las coberturas limpias

### 🧹 Limpieza de Devoluciones
- **Cuándo**: Cada 1° del mes a las 00:30 hs (Argentina)
- **Qué hace**: Elimina devoluciones de **2 meses atrás o más antiguas**
- **Ejemplo**: El 1 de Marzo borra todo de Enero hacia atrás
- **Por qué**: Para mantener la base de datos liviana

## 📡 Endpoints

### Coberturas (Clientes)

- `GET /api/coberturas/clientes` - Obtener todos los clientes
- `GET /api/coberturas/clientes/:id` - Obtener un cliente
- `POST /api/coberturas/clientes` - Crear cliente
- `PUT /api/coberturas/clientes/:id` - Actualizar cliente
- `DELETE /api/coberturas/clientes/:id` - Eliminar cliente

### Productos de Cobertura

- `POST /api/coberturas/clientes/:id/productos` - Agregar producto
- `PUT /api/coberturas/clientes/:id/productos/:productoId` - Actualizar producto
- `DELETE /api/coberturas/clientes/:id/productos/:productoId` - Eliminar producto

### Devoluciones

- `GET /api/devoluciones` - Obtener todas las devoluciones
- `GET /api/devoluciones?nombre=Juan` - Filtrar por nombre
- `GET /api/devoluciones?fecha=2026-01-20` - Filtrar por fecha
- `GET /api/devoluciones/:id` - Obtener una devolución
- `POST /api/devoluciones` - Crear devolución
- `PUT /api/devoluciones/:id` - Actualizar devolución
- `DELETE /api/devoluciones/:id` - Eliminar devolución

### Admin (Gestión de Tareas)

- `GET /api/admin/info-tareas` - Ver información de las tareas programadas
- `POST /api/admin/ejecutar-tareas` - Ejecutar todas las tareas manualmente (testing)
- `POST /api/admin/reiniciar-coberturas` - Reiniciar solo coberturas
- `POST /api/admin/limpiar-devoluciones` - Limpiar solo devoluciones

## 🧪 Testing de Tareas Automáticas

Para probar las tareas sin esperar al 1° del mes:

### Ver info de las tareas:
```bash
GET http://localhost:5000/api/admin/info-tareas
```

### Ejecutar ambas tareas manualmente:
```bash
POST http://localhost:5000/api/admin/ejecutar-tareas
```

### Solo reiniciar coberturas:
```bash
POST http://localhost:5000/api/admin/reiniciar-coberturas
```

### Solo limpiar devoluciones:
```bash
POST http://localhost:5000/api/admin/limpiar-devoluciones
```

## 🎯 Optimizaciones implementadas

✅ **Índices en MongoDB** - Búsquedas más rápidas
✅ **Compresión de respuestas** - Menos datos transferidos
✅ **Validaciones** - Datos consistentes
✅ **CORS configurado** - Frontend conectado
✅ **Pool de conexiones** - Mejor rendimiento
✅ **Tareas automáticas** - Mantenimiento sin intervención
✅ **Zona horaria configurada** - Argentina (GMT-3)

## 📝 Logs del Sistema

Cuando el servidor arranca verás:
```
🚀 Servidor corriendo en puerto 5000
📍 http://localhost:5000

⏰ Activando tareas programadas:
  ✅ Reinicio de coberturas: Cada 1° del mes a las 00:00 hs (Argentina)
  ✅ Limpieza de devoluciones: Cada 1° del mes a las 00:30 hs (Argentina)

💡 Tip: Las tareas se ejecutarán automáticamente cada mes
```

Cuando se ejecutan las tareas verás:
```
🔄 Iniciando reinicio mensual de coberturas...
✅ Coberturas reiniciadas: 15 clientes, 120 productos marcados como pendientes
📅 Fecha: 01/02/2026 00:00:00

🧹 Iniciando limpieza de devoluciones antiguas...
📅 Fecha límite: 01/12/2025 (se borrarán devoluciones anteriores a esta fecha)
✅ Devoluciones eliminadas: 45
📅 Fecha de ejecución: 01/02/2026 00:30:00
```

## ⚠️ IMPORTANTE

**El servidor debe estar corriendo para que las tareas se ejecuten.**

Si apagás el servidor, las tareas no se ejecutarán. Para producción, considerá usar:
- **PM2** (process manager para Node.js)
- **Servicio systemd** (Linux)
- **Hosting 24/7** (Heroku, Railway, Render, etc.)

## 🔗 Conectar con el Frontend

En el frontend, actualiza el archivo `.env`:

```env
VITE_API_URL=http://localhost:5000/api
```
