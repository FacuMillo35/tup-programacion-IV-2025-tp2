const express = require('express');
const mysql = require('mysql2');
const { body, param, query, validationResult } = require('express-validator');

const app = express();
app.use(express.json());

// Conexión a la base de datos
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'admin123',
  database: 'tareas_db'
});

// Middleware validaciones
function validar(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

/**
 * RUTAS
 */

// Crear tarea
app.post('/api/tareas',
  body('nombre').isString().notEmpty().withMessage('El nombre es requerido'),
  body('completada').optional().isBoolean().withMessage('Debe ser true/false'),
  validar,
  (req, res) => {
    const { nombre, completada } = req.body;

    // Verificamos si ya existe una tarea con el mismo nombre
    db.query('SELECT * FROM tareas WHERE nombre = ?', [nombre], (err, results) => {
      if (err) return res.status(500).json({ error: err });

      if (results.length > 0) {
        return res.status(400).json({ error: 'Ya existe una tarea con ese nombre' });
      }

      db.query(
        'INSERT INTO tareas (nombre, completada) VALUES (?, ?)',
        [nombre, completada || false],
        (err, result) => {
          if (err) return res.status(500).json({ error: err });
          res.json({ id: result.insertId, nombre, completada: completada || false });
        }
      );
    });
  }
);

// Obtener todas las tareas (con filtro opcional por completada)
app.get('/api/tareas',
  query('completada').optional().isBoolean().withMessage('Debe ser true o false'),
  validar,
  (req, res) => {
    const { completada } = req.query;

    let sql = 'SELECT * FROM tareas';
    let params = [];

    if (completada !== undefined) {
      sql += ' WHERE completada = ?';
      params.push(completada === 'true');
    }

    db.query(sql, params, (err, results) => {
      if (err) return res.status(500).json({ error: err });
      res.json(results);
    });
  }
);

// Obtener tarea por id
app.get('/api/tareas/:id',
  param('id').isInt().withMessage('ID debe ser entero'),
  validar,
  (req, res) => {
    db.query('SELECT * FROM tareas WHERE id = ?', [req.params.id], (err, result) => {
      if (err) return res.status(500).json({ error: err });
      if (result.length === 0) return res.status(404).json({ error: 'Tarea no encontrada' });
      res.json(result[0]);
    });
  }
);

// Actualizar tarea
app.put('/api/tareas/:id',
  param('id').isInt().withMessage('ID debe ser entero'),
  body('nombre').optional().isString().notEmpty().withMessage('Nombre inválido'),
  body('completada').optional().isBoolean().withMessage('Debe ser true/false'),
  validar,
  (req, res) => {
    const { nombre, completada } = req.body;

    db.query('UPDATE tareas SET nombre = ?, completada = ? WHERE id = ?',
      [nombre, completada, req.params.id],
      (err, result) => {
        if (err) return res.status(500).json({ error: err });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Tarea no encontrada' });
        res.json({ message: 'Tarea actualizada' });
      }
    );
  }
);

// Eliminar tarea
app.delete('/api/tareas/:id',
  param('id').isInt().withMessage('ID debe ser entero'),
  validar,
  (req, res) => {
    db.query('DELETE FROM tareas WHERE id = ?', [req.params.id], (err, result) => {
      if (err) return res.status(500).json({ error: err });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Tarea no encontrada' });
      res.json({ message: 'Tarea eliminada' });
    });
  }
);

// Servidor
app.listen(3000, () => {
  console.log('Servidor corriendo en puerto 3000');
});
