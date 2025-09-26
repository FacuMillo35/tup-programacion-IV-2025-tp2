const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const { body, param, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Configuración de la base de datos
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'admin123', // Cambia por tu contraseña
  database: 'rectangulo_db'
};

// Función para crear la conexión a la base de datos
async function createConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    return connection;
  } catch (error) {
    console.error('Error conectando a la base de datos:', error);
    throw error;
  }
}

// Función para calcular perímetro: P = 2 * (lado1 + lado2)
function calcularPerimetro(lado1, lado2) {
  return 2 * (lado1 + lado2);
}

// Función para calcular superficie (área): A = lado1 * lado2
function calcularSuperficie(lado1, lado2) {
  return lado1 * lado2;
}

// =================== RUTAS DE LA API ===================

// GET - Obtener todos los rectángulos
app.get('/api/rectangulos', async (req, res) => {
  try {
    const connection = await createConnection();
    const [rows] = await connection.execute('SELECT * FROM rectangulo ORDER BY id DESC');
    await connection.end();

    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
  } catch (error) {
    console.error('Error obteniendo rectángulos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET - Obtener un rectángulo por ID
app.get('/api/rectangulos/:id', [
  param('id').isInt().withMessage('El id debe ser un número entero')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const connection = await createConnection();
    const [rows] = await connection.execute('SELECT * FROM rectangulo WHERE id = ?', [id]);
    await connection.end();

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rectángulo no encontrado'
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error obteniendo rectángulo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST - Crear un nuevo rectángulo
app.post('/api/rectangulos', [
  body('lado1').isFloat({ gt: 0 }).withMessage('lado1 debe ser un número positivo'),
  body('lado2').isFloat({ gt: 0 }).withMessage('lado2 debe ser un número positivo'),
  body('nombre').optional().isString().withMessage('nombre debe ser texto'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { lado1, lado2, nombre } = req.body;

    const l1 = parseFloat(lado1);
    const l2 = parseFloat(lado2);

    const perimetro = calcularPerimetro(l1, l2);
    const superficie = calcularSuperficie(l1, l2);

    const connection = await createConnection();
    const query = `
      INSERT INTO rectangulo (lado1, lado2, perimetro, superficie, nombre, fecha_creacion)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    const [result] = await connection.execute(query, [l1, l2, perimetro, superficie, nombre || null]);
    const [newRectangle] = await connection.execute('SELECT * FROM rectangulo WHERE id = ?', [result.insertId]);
    await connection.end();

    res.status(201).json({
      success: true,
      message: 'Rectángulo creado exitosamente',
      data: newRectangle[0]
    });
  } catch (error) {
    console.error('Error creando rectángulo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT - Modificar un rectángulo existente
app.put('/api/rectangulos/:id', [
  param('id').isInt().withMessage('El id debe ser un número entero'),
  body('lado1').isFloat({ gt: 0 }).withMessage('lado1 debe ser un número positivo'),
  body('lado2').isFloat({ gt: 0 }).withMessage('lado2 debe ser un número positivo'),
  body('nombre').optional().isString().withMessage('nombre debe ser texto'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { lado1, lado2, nombre } = req.body;

    const l1 = parseFloat(lado1);
    const l2 = parseFloat(lado2);

    const perimetro = calcularPerimetro(l1, l2);
    const superficie = calcularSuperficie(l1, l2);

    const connection = await createConnection();
    const [existing] = await connection.execute('SELECT * FROM rectangulo WHERE id = ?', [id]);
    if (existing.length === 0) {
      await connection.end();
      return res.status(404).json({
        success: false,
        message: 'Rectángulo no encontrado'
      });
    }

    const query = `
      UPDATE rectangulo 
      SET lado1 = ?, lado2 = ?, perimetro = ?, superficie = ?, nombre = ?, fecha_modificacion = NOW()
      WHERE id = ?
    `;
    await connection.execute(query, [l1, l2, perimetro, superficie, nombre || null, id]);
    const [updatedRectangle] = await connection.execute('SELECT * FROM rectangulo WHERE id = ?', [id]);
    await connection.end();

    res.json({
      success: true,
      message: 'Rectángulo actualizado exitosamente',
      data: updatedRectangle[0]
    });
  } catch (error) {
    console.error('Error actualizando rectángulo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE - Eliminar un rectángulo
app.delete('/api/rectangulos/:id', [
  param('id').isInt().withMessage('El id debe ser un número entero')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const connection = await createConnection();

    const [existing] = await connection.execute('SELECT * FROM rectangulo WHERE id = ?', [id]);
    if (existing.length === 0) {
      await connection.end();
      return res.status(404).json({
        success: false,
        message: 'Rectángulo no encontrado'
      });
    }

    await connection.execute('DELETE FROM rectangulo WHERE id = ?', [id]);
    await connection.end();

    res.json({
      success: true,
      message: 'Rectángulo eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando rectángulo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Ruta de prueba para verificar que la API funciona
app.get('/api/health', async (req, res) => {
  try {
    const connection = await createConnection();
    await connection.end();

    res.json({
      success: true,
      message: 'API de rectángulos funcionando correctamente',
      timestamp: new Date().toISOString(),
      database: 'Conectado correctamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error de conexión a la base de datos',
      error: error.message
    });
  }
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: 'API de Rectángulos - Facundo Rojo',
    endpoints: [
      'GET /api/rectangulos - Obtener todos los rectángulos',
      'GET /api/rectangulos/:id - Obtener un rectángulo por ID',
      'POST /api/rectangulos - Crear un nuevo rectángulo',
      'PUT /api/rectangulos/:id - Modificar un rectángulo',
      'DELETE /api/rectangulos/:id - Eliminar un rectángulo'
    ]
  });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
});

module.exports = app;
