-- Catálogo de equipamiento del sistema (idempotente)

INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Cinta de correr', 'cardio'::equipment_category, 'Cinta motorizada para carrera o caminata en interiores', 'Life Fitness Technogym', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Cinta de correr') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Elíptica', 'cardio'::equipment_category, 'Máquina elíptica de bajo impacto para cardio general', 'Precor Matrix', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Elíptica') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Bicicleta estática', 'cardio'::equipment_category, 'Bici indoor para entrenamiento cardiovascular', 'Schwinn Keiser', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Bicicleta estática') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Bicicleta spinning', 'cardio'::equipment_category, 'Bici de ciclismo indoor para clases o uso libre', 'Keiser Stages', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Bicicleta spinning') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Remo ergómetro', 'cardio'::equipment_category, 'Máquina de remo para cardio de cuerpo completo', 'Concept2 WaterRower', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Remo ergómetro') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Escaladora', 'cardio'::equipment_category, 'Máquina de escaleras para cardio intenso', 'StairMaster Matrix', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Escaladora') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Stepper', 'cardio'::equipment_category, 'Máquina de subida de escalones independiente', 'Life Fitness', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Stepper') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Arc trainer', 'cardio'::equipment_category, 'Máquina de arco para cardio con movimiento natural', 'Cybex', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Arc trainer') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Air bike', 'cardio'::equipment_category, 'Bicicleta de aire con resistencia por paletas', 'Assault Concept2', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Air bike') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Máquina de esquí indoor', 'cardio'::equipment_category, 'Simulador de esquí para entrenamiento cardiovascular', 'Technogym', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Máquina de esquí indoor') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Prensa de piernas 45°', 'strength'::equipment_category, 'Prensa inclinada para cuádriceps y glúteos', 'Hammer Strength Life Fitness', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Prensa de piernas 45°') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Prensa de piernas horizontal', 'strength'::equipment_category, 'Prensa horizontal para piernas con espalda apoyada', 'Technogym', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Prensa de piernas horizontal') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Hack squat', 'strength'::equipment_category, 'Máquina guiada de sentadilla con énfasis en cuádriceps', 'Atlantis', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Hack squat') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Sentadilla péndulo', 'strength'::equipment_category, 'Máquina de sentadilla con trayectoria de péndulo', 'Pendulum', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Sentadilla péndulo') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Smith machine', 'strength'::equipment_category, 'Multipower con barra guiada en rieles verticales', 'Hammer Strength Matrix', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Smith machine') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Rack de sentadillas', 'strength'::equipment_category, 'Jaula de potencia para sentadillas y press con barra libre', 'Rogue Titan', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Rack de sentadillas') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Press de pecho en máquina', 'strength'::equipment_category, 'Máquina selectorizada para press de pecho', 'Life Fitness', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Press de pecho en máquina') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Jalón al pecho en máquina', 'strength'::equipment_category, 'Máquina de jalón para dorsales', 'Technogym', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Jalón al pecho en máquina') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Remo en máquina', 'strength'::equipment_category, 'Máquina de remo sentado con apoyo de pecho', 'Hammer Strength', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Remo en máquina') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Extensión de piernas', 'strength'::equipment_category, 'Máquina de extensión de cuádriceps', 'Life Fitness', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Extensión de piernas') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Curl femoral sentado', 'strength'::equipment_category, 'Máquina de flexión de isquiotibiales sentado', 'Technogym', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Curl femoral sentado') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Curl femoral tumbado', 'strength'::equipment_category, 'Máquina de flexión de isquiotibiales en prono', 'Matrix', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Curl femoral tumbado') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Abducción de cadera en máquina', 'strength'::equipment_category, 'Máquina para glúteo medio y abductores', 'Life Fitness', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Abducción de cadera en máquina') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Aducción de cadera en máquina', 'strength'::equipment_category, 'Máquina para aductores de cadera', 'Technogym', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Aducción de cadera en máquina') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Glute drive', 'strength'::equipment_category, 'Máquina guiada de empuje de cadera', 'Nautilus', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Glute drive') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Pec deck', 'strength'::equipment_category, 'Máquina de aperturas para pecho', 'Life Fitness', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Pec deck') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Pec deck inverso', 'strength'::equipment_category, 'Máquina de aperturas inversas para deltoides posterior', 'Matrix', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Pec deck inverso') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Elevación lateral en máquina', 'strength'::equipment_category, 'Máquina para deltoides lateral', 'Technogym', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Elevación lateral en máquina') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Curl predicador en máquina', 'strength'::equipment_category, 'Máquina de curl de bíceps con apoyo', 'Life Fitness', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Curl predicador en máquina') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Extensión de tríceps en polea', 'strength'::equipment_category, 'Estación de polea alta para tríceps', 'Cybex', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Extensión de tríceps en polea') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Estación de poleas doble', 'strength'::equipment_category, 'Torre de poleas con ajuste alto y bajo', 'Life Fitness', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Estación de poleas doble') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Fondos asistidos en máquina', 'strength'::equipment_category, 'Máquina de fondos con contrapeso asistido', 'Gravitron', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Fondos asistidos en máquina') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Rack de barras olímpicas', 'strength'::equipment_category, 'Almacenamiento y organización de barras olímpicas', 'Rogue', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Rack de barras olímpicas') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Rack de mancuernas', 'strength'::equipment_category, 'Soporte para juego de mancuernas fijas o ajustables', 'Hammer Strength', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Rack de mancuernas') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Banco plano', 'strength'::equipment_category, 'Banco horizontal para press y trabajo con mancuernas', 'Rogue', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Banco plano') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Banco inclinado', 'strength'::equipment_category, 'Banco ajustable inclinado para press superior', 'Rogue', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Banco inclinado') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Banco declinado', 'strength'::equipment_category, 'Banco declinado para press inferior', 'Rogue', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Banco declinado') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Banco predicador', 'strength'::equipment_category, 'Banco Scott para curl de bíceps', 'Body-Solid', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Banco predicador') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Almacén de discos', 'strength'::equipment_category, 'Árbol o rack para discos olímpicos', 'Rogue', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Almacén de discos') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Sistema TRX o anillas', 'functional'::equipment_category, 'Entrenamiento en suspensión con correas o anillas', 'TRX', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Sistema TRX o anillas') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Cuerdas de batalla', 'functional'::equipment_category, 'Cuerdas pesadas para acondicionamiento metabólico', 'Rogue', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Cuerdas de batalla') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Cajones pliométricos', 'functional'::equipment_category, 'Set de cajones para saltos y trabajo pliométrico', 'Rogue', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Cajones pliométricos') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Zona de kettlebells', 'functional'::equipment_category, 'Juego de kettlebells de distintos pesos', 'Rogue', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Zona de kettlebells') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Sled de empuje', 'functional'::equipment_category, 'Trineo para empujes y arrastres en pista', 'Rogue', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Sled de empuje') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Rueda abdominal y accesorios core', 'functional'::equipment_category, 'Kit de accesorios para trabajo de core', 'Abmat', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Rueda abdominal y accesorios core') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Sistema de aire acondicionado', 'infrastructure'::equipment_category, 'Climatización del área de entrenamiento', 'Carrier Trane', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Sistema de aire acondicionado') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Ventilación y extractores', 'infrastructure'::equipment_category, 'Sistema de renovación de aire del local', 'Greenheck', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Ventilación y extractores') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Espejos de pared', 'infrastructure'::equipment_category, 'Espejos de seguridad en zona de entrenamiento', 'Gym Mirror', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Espejos de pared') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Sistema de sonido', 'infrastructure'::equipment_category, 'Audio ambiente para el gym', 'Sonos Bose', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Sistema de sonido') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Cámaras de seguridad', 'infrastructure'::equipment_category, 'Sistema CCTV del local', 'Hikvision', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Cámaras de seguridad') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Iluminación LED del salón', 'infrastructure'::equipment_category, 'Luminarias principales del área de entrenamiento', 'Philips', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Iluminación LED del salón') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Piso de goma o caucho', 'infrastructure'::equipment_category, 'Revestimiento de suelo para zonas de peso libre', 'Regupol', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Piso de goma o caucho') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Bebedero o fuente de agua', 'infrastructure'::equipment_category, 'Punto de hidratación para miembros', 'Oasis', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Bebedero o fuente de agua') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Press de hombro en máquina', 'strength'::equipment_category, 'Máquina selectorizada para press militar o de hombros', 'Life Fitness Technogym', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Press de hombro en máquina') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Crossover de poleas', 'strength'::equipment_category, 'Estación de poleas cruzadas para pecho, brazos y core', 'Cybex Matrix', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Crossover de poleas') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Máquina de gemelos sentado', 'strength'::equipment_category, 'Máquina para elevación de gemelos en posición sentada', 'Technogym', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Máquina de gemelos sentado') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Máquina de gemelos de pie', 'strength'::equipment_category, 'Máquina para elevación de gemelos de pie con hombros', 'Life Fitness', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Máquina de gemelos de pie') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Hip thrust en máquina', 'strength'::equipment_category, 'Máquina guiada para empuje de cadera y glúteos', 'Nautilus Booty Builder', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Hip thrust en máquina') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Estación de dominadas y fondos', 'strength'::equipment_category, 'Estructura para dominadas, fondos y trabajo de tracción', 'Rogue Titan', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Estación de dominadas y fondos') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Multipress guiado', 'strength'::equipment_category, 'Máquina multipress para press de pecho, hombro e inclinado', 'Hammer Strength', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Multipress guiado') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Balones medicinales', 'functional'::equipment_category, 'Juego de balones medicinales de distintos pesos', 'Rogue Dynamax', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Balones medicinales') AND is_system = true
);
INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT 'Colchonetas y esterillas', 'functional'::equipment_category, 'Área de colchonetas para calentamiento, movilidad y core', 'Harbinger', true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('Colchonetas y esterillas') AND is_system = true
);
