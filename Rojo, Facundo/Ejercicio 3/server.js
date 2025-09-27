const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const { body, param, query, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// Configuracion de la base de datos
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'admin123',
  database: 'carrera_db'
};

async function createConnection() {
  return await mysql.createConnection(dbConfig);
}

// Middleware para manejar errores de validación
function checkValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
}

/* ====================== RUTAS ====================== */

// 📌 GET - Todos los alumnos
app.get('/api/alumnos', async (req, res) => {
  const connection = await createConnection();
  const [rows] = await connection.execute(`
    SELECT a.id, a.nombre, m.nombre AS materia, a.nota1, a.nota2, a.nota3
    FROM alumno a
    JOIN materia m ON a.materia_id = m.id
  `);
  await connection.end();
  res.json({ success: true, data: rows });
});

// 📌 GET - Filtrar alumnos por materia
app.get('/api/alumnos/materia/:materiaId',
  param('materiaId').isInt().withMessage('ID de materia inválido'),
  checkValidation,
  async (req, res) => {
    const { materiaId } = req.params;
    const connection = await createConnection();
    const [rows] = await connection.execute(`
      SELECT a.id, a.nombre, m.nombre AS materia, a.nota1, a.nota2, a.nota3
      FROM alumno a
      JOIN materia m ON a.materia_id = m.id
      WHERE m.id = ?
    `, [materiaId]);
    await connection.end();
    res.json({ success: true, data: rows });
  }
);

// 📌 POST - Crear alumno
app.post('/api/alumnos',
  body('nombre').isString().notEmpty().withMessage('El nombre es requerido'),
  body('materia_id').isInt().withMessage('Materia inválida'),
  body('nota1').isFloat({ min: 0, max: 10 }).withMessage('Nota1 inválida'),
  body('nota2').isFloat({ min: 0, max: 10 }).withMessage('Nota2 inválida'),
  body('nota3').isFloat({ min: 0, max: 10 }).withMessage('Nota3 inválida'),
  checkValidation,
  async (req, res) => {
    const { nombre, materia_id, nota1, nota2, nota3 } = req.body;
    const connection = await createConnection();

    // Verificar duplicado
    const [existing] = await connection.execute(
      'SELECT * FROM alumno WHERE nombre = ? AND materia_id = ?',
      [nombre, materia_id]
    );
    if (existing.length > 0) {
      await connection.end();
      return res.status(400).json({ success: false, message: 'Alumno ya registrado en esta materia' });
    }

    const [result] = await connection.execute(`
      INSERT INTO alumno (nombre, materia_id, nota1, nota2, nota3)
      VALUES (?, ?, ?, ?, ?)
    `, [nombre, materia_id, nota1, nota2, nota3]);

    const [newAlumno] = await connection.execute('SELECT * FROM alumno WHERE id = ?', [result.insertId]);
    await connection.end();
    res.status(201).json({ success: true, data: newAlumno[0] });
  }
);

// 📌 PUT - Modificar alumno
app.put('/api/alumnos/:id',
  param('id').isInt().withMessage('ID inválido'),
  body('nombre').isString().notEmpty().withMessage('El nombre es requerido'),
  body('materia_id').isInt().withMessage('Materia inválida'),
  body('nota1').isFloat({ min: 0, max: 10 }).withMessage('Nota1 inválida'),
  body('nota2').isFloat({ min: 0, max: 10 }).withMessage('Nota2 inválida'),
  body('nota3').isFloat({ min: 0, max: 10 }).withMessage('Nota3 inválida'),
  checkValidation,
  async (req, res) => {
    const { id } = req.params;
    const { nombre, materia_id, nota1, nota2, nota3 } = req.body;
    const connection = await createConnection();

    // Verificar duplicado con otro id
const [duplicate] = await connection.execute(
  'SELECT * FROM alumno WHERE nombre = ? AND materia_id = ? AND id <> ?',
  [nombre, materia_id, id]
);

if (duplicate.length > 0) {
  await connection.end();
  return res.status(400).json({
    success: false,
    message: 'Ya existe un alumno con ese nombre en esta materia'
  });
}

    await connection.execute(`
      UPDATE alumno
      SET nombre=?, materia_id=?, nota1=?, nota2=?, nota3=?, fecha_modificacion=NOW()
      WHERE id=?
    `, [nombre, materia_id, nota1, nota2, nota3, id]);

    const [updated] = await connection.execute('SELECT * FROM alumno WHERE id=?', [id]);
    await connection.end();
    res.json({ success: true, data: updated[0] });
  }
);


// 📌 DELETE - Eliminar alumno
app.delete('/api/alumnos/:id',
  param('id').isInt().withMessage('ID inválido'),
  checkValidation,
  async (req, res) => {
    const { id } = req.params;
    const connection = await createConnection();

    const [existing] = await connection.execute('SELECT * FROM alumno WHERE id=?', [id]);
    if (existing.length === 0) {
      await connection.end();
      return res.status(404).json({ success: false, message: 'Alumno no encontrado' });
    }

    await connection.execute('DELETE FROM alumno WHERE id=?', [id]);
    await connection.end();
    res.json({ success: true, message: 'Alumno eliminado correctamente' });
  }
);

// 📌 GET materias
app.get('/api/materias', async (req, res) => {
  const connection = await createConnection();
  const [rows] = await connection.execute('SELECT * FROM materia');
  await connection.end();
  res.json({ success: true, data: rows });
});

// 📌 POST materia
app.post('/api/materias',
  body('nombre').isString().notEmpty().withMessage('El nombre es requerido'),
  checkValidation,
  async (req, res) => {
    const { nombre } = req.body;
    const connection = await createConnection();
    try {
      const [result] = await connection.execute('INSERT INTO materia (nombre) VALUES (?)', [nombre]);
      const [newMateria] = await connection.execute('SELECT * FROM materia WHERE id=?', [result.insertId]);
      res.status(201).json({ success: true, data: newMateria[0] });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ success: false, message: 'La materia ya existe' });
      }
      throw err;
    } finally {
      await connection.end();
    }
  }
);

app.listen(PORT, () => {
  console.log(`🚀 Servidor ejercicio3 corriendo en http://localhost:${PORT}`);
});

