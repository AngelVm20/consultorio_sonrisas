PRAGMA foreign_keys = ON;

-- Tabla PACIENTES
CREATE TABLE IF NOT EXISTS pacientes (
id_paciente INTEGER PRIMARY KEY AUTOINCREMENT,
nombres TEXT NOT NULL,
apellidos TEXT NOT NULL,
cedula TEXT UNIQUE,
telefono TEXT,
fecha_nacimiento TEXT,
direccion TEXT,
creado_en TEXT DEFAULT (datetime('now')),
actualizado_en TEXT
);

CREATE INDEX IF NOT EXISTS idx_pacientes_apellidos ON pacientes (apellidos);


-- Tabla CONSULTAS
CREATE TABLE IF NOT EXISTS consultas (
id_consulta INTEGER PRIMARY KEY AUTOINCREMENT,
id_paciente INTEGER NOT NULL,
motivo TEXT,
procedimiento TEXT,
ingreso REAL DEFAULT 0,
detalle TEXT,
fecha_consulta TEXT NOT NULL,
creado_en TEXT DEFAULT (datetime('now')),
actualizado_en TEXT,
FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_consultas_paciente_fecha ON consultas (id_paciente, fecha_consulta);


-- Fotos normalizadas (0..N por consulta)
CREATE TABLE IF NOT EXISTS consulta_fotos (
id_foto INTEGER PRIMARY KEY AUTOINCREMENT,
id_consulta INTEGER NOT NULL,
ruta_archivo TEXT NOT NULL,
descripcion TEXT,
orden INTEGER,
FOREIGN KEY (id_consulta) REFERENCES consultas(id_consulta) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_fotos_consulta ON consulta_fotos (id_consulta);


-- Caja/Libro diario: ingresos/gastos
CREATE TABLE IF NOT EXISTS caja_movimientos (
id_mov INTEGER PRIMARY KEY AUTOINCREMENT,
fecha TEXT NOT NULL,
tipo TEXT NOT NULL, -- 'INGRESO' | 'GASTO'
monto REAL NOT NULL,
fuente TEXT, -- 'CONSULTA' | 'OTRO'
id_paciente INTEGER,
id_consulta INTEGER,
nota TEXT,
creado_en TEXT DEFAULT (datetime('now')),
FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente) ON DELETE SET NULL,
FOREIGN KEY (id_consulta) REFERENCES consultas(id_consulta) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_caja_fecha ON caja_movimientos (fecha);