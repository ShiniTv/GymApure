/**
 * Genera scripts/db/data/system-exercises.csv desde una carpeta de videos.
 *
 * Uso:
 *   npx tsx scripts/db/generate-system-exercises-csv.ts
 *   npx tsx scripts/db/generate-system-exercises-csv.ts --videos "C:\ruta\videos"
 */
import fs from 'fs';
import path from 'path';
import { MUSCLE_GROUPS, type MuscleGroup } from '../../src/lib/exerciseMuscleGroups.ts';

type ExerciseEntry = {
  name: string;
  muscle_group: MuscleGroup;
};

/** @deprecated Los lv_0 fueron renombrados en disco; usar EXERCISE_MAP. */
const LV0_OVERRIDES: Record<string, ExerciseEntry | null> = {};

const EXERCISE_MAP: Record<string, ExerciseEntry> = {
  '45 Degree Leg Press.mp4': { name: 'Prensa de piernas 45°', muscle_group: 'Piernas' },
  '45-Degree back extension.mp4': { name: 'Extensión lumbar 45°', muscle_group: 'Core' },
  'Barbell back squat high.mp4': { name: 'Sentadilla trasera barra alta', muscle_group: 'Piernas' },
  'Barbell back squat low.mp4': { name: 'Sentadilla trasera barra baja', muscle_group: 'Piernas' },
  'Barbell curl.mp4': { name: 'Curl con barra', muscle_group: 'Brazos' },
  'Barbell front squat.mp4': { name: 'Sentadilla frontal con barra', muscle_group: 'Piernas' },
  'Barbell hip thrust.mp4': { name: 'Hip thrust con barra', muscle_group: 'Piernas' },
  'Barbell row.mp4': { name: 'Remo con barra', muscle_group: 'Espalda' },
  'Bench Dips.mp4': { name: 'Fondos en banco', muscle_group: 'Brazos' },
  'Bench press.mp4': { name: 'Press de banca', muscle_group: 'Pecho' },
  'Bulgarian split squat cuadriceps.mp4': {
    name: 'Sentadilla búlgara cuádriceps',
    muscle_group: 'Piernas',
  },
  'Bulgarian split squat glute.mp4': { name: 'Sentadilla búlgara glúteo', muscle_group: 'Piernas' },
  'Bumbell french press.mp4': { name: 'Press francés con mancuernas', muscle_group: 'Brazos' },
  'Cable lat pull-over.mp4': { name: 'Pull-over en polea', muscle_group: 'Espalda' },
  'Cable lateral raise.mp4': { name: 'Elevaciones laterales en polea', muscle_group: 'Hombros' },
  'Cable pull through.mp4': { name: 'Pull through en polea', muscle_group: 'Piernas' },
  'Cable row.mp4': { name: 'Remo en polea', muscle_group: 'Espalda' },
  'Cable triceps kickback.mp4': { name: 'Patada de tríceps en polea', muscle_group: 'Brazos' },
  'Chest-supported  row.mp4': { name: 'Remo con apoyo en pecho', muscle_group: 'Espalda' },
  'Chin-up.mp4': { name: 'Dominadas supinas', muscle_group: 'Espalda' },
  'Close-grip bench press.mp4': { name: 'Press de banca agarre cerrado', muscle_group: 'Pecho' },
  'Close-grip Dips.mp4': { name: 'Fondos agarre cerrado', muscle_group: 'Brazos' },
  'Close-grips pushup.mp4': { name: 'Flexiones agarre cerrado', muscle_group: 'Pecho' },
  'Deadlift-grip mixto.mp4': { name: 'Peso muerto agarre mixto', muscle_group: 'Piernas' },
  'Deadlift-grip prono.mp4': { name: 'Peso muerto agarre prono', muscle_group: 'Piernas' },
  'Diamond pushup.mp4': { name: 'Flexiones diamante', muscle_group: 'Pecho' },
  'Dips.mp4': { name: 'Fondos en paralelas', muscle_group: 'Pecho' },
  'Dumbbell overhead press.mp4': { name: 'Press militar con mancuernas', muscle_group: 'Hombros' },
  'Dumbbell preacher curl.mp4': { name: 'Curl predicador con mancuernas', muscle_group: 'Brazos' },
  'Dumbbell triceps kickback.mp4': { name: 'Patada de tríceps con mancuerna', muscle_group: 'Brazos' },
  'Dumbell skullcrushers.mp4': { name: 'Skull crusher con mancuernas', muscle_group: 'Brazos' },
  'Extension triceps.mp4': { name: 'Extensión de tríceps', muscle_group: 'Brazos' },
  'Extension de triceps con barra en polea alta grip supino.mp4': {
    name: 'Extensión de tríceps en polea alta agarre supino',
    muscle_group: 'Brazos',
  },
  'Extension de triceps en polea alta con barra gripp prono.mp4': {
    name: 'Extensión de tríceps en polea alta agarre prono',
    muscle_group: 'Brazos',
  },
  'Extension de triceps en polea alta con barra V.mp4': {
    name: 'Extensión de tríceps en polea alta con barra V',
    muscle_group: 'Brazos',
  },
  'Extension de triceps en polea baja tras nunca con barra grips prono.mp4': {
    name: 'Extensión de tríceps en polea baja tras nuca con barra',
    muscle_group: 'Brazos',
  },
  'Extension de triceps en polea baja tras nunca con mecate.mp4': {
    name: 'Extensión de tríceps en polea baja tras nuca con cuerda',
    muscle_group: 'Brazos',
  },
  'Extension de triceps tras nunca unilateral.mp4': {
    name: 'Extensión de tríceps tras nuca unilateral',
    muscle_group: 'Brazos',
  },
  'Flat dumbbell press.mp4': { name: 'Press plano con mancuernas', muscle_group: 'Pecho' },
  'Goblet Squat.mp4': { name: 'Sentadilla goblet', muscle_group: 'Piernas' },
  'Hack squat.mp4': { name: 'Hack squat', muscle_group: 'Piernas' },
  'Half-kneeling 1-arn lat pulldown.mp4': {
    name: 'Jalón al pecho a un brazo medio arrodillado',
    muscle_group: 'Espalda',
  },
  'Horizontal leg press.mp4': { name: 'Prensa de piernas horizontal', muscle_group: 'Piernas' },
  'incline bench press.mp4': { name: 'Press inclinado con barra', muscle_group: 'Pecho' },
  'Incline dumnbell press.mp4': { name: 'Press inclinado con mancuernas', muscle_group: 'Pecho' },
  'Incline smith machine press.mp4': { name: 'Press inclinado en Smith', muscle_group: 'Pecho' },
  'Jm press.mp4': { name: 'Press JM', muscle_group: 'Brazos' },
  'Leg Extension.mp4': { name: 'Extensión de piernas', muscle_group: 'Piernas' },
  'Low bar squat.mp4': { name: 'Sentadilla barra baja', muscle_group: 'Piernas' },
  'Lunge.mp4': { name: 'Zancada', muscle_group: 'Piernas' },
  'Machine chest press.mp4': { name: 'Press de pecho en máquina', muscle_group: 'Pecho' },
  'Machine Dips.mp4': { name: 'Fondos en máquina', muscle_group: 'Brazos' },
  'Machine hip adbuction.mp4': { name: 'Abducción de cadera en máquina', muscle_group: 'Piernas' },
  'Machine preacher curl.mp4': { name: 'Curl predicador en máquina', muscle_group: 'Brazos' },
  'Meadows row.mp4': { name: 'Remo Meadows', muscle_group: 'Espalda' },
  'Nautilus glute drive.mp4': { name: 'Glute drive Nautilus', muscle_group: 'Piernas' },
  'Neutral-grip pulldown.mp4': { name: 'Jalón al pecho agarre neutro', muscle_group: 'Espalda' },
  'Neutral-grip pull-up.mp4': { name: 'Dominadas agarre neutro', muscle_group: 'Espalda' },
  'Pendlay row.mp4': { name: 'Remo Pendlay', muscle_group: 'Espalda' },
  'Pendulum Squat.mp4': { name: 'Sentadilla péndulo', muscle_group: 'Piernas' },
  'Pushup.mp4': { name: 'Flexiones', muscle_group: 'Pecho' },
  'Reverse pec deck.mp4': { name: 'Pec deck inverso', muscle_group: 'Hombros' },
  'Remo unilateral en banco plano.mp4': { name: 'Remo unilateral en banco plano', muscle_group: 'Espalda' },
  'Romanian Deadlift.mp4': { name: 'Peso muerto rumano', muscle_group: 'Piernas' },
  'Sissy squat.mp4': { name: 'Sentadilla sissy', muscle_group: 'Piernas' },
  'Skullcrusher.mp4': { name: 'Skull crusher', muscle_group: 'Brazos' },
  'Smith machine Jm press.mp4': { name: 'Press JM en Smith', muscle_group: 'Brazos' },
  'Smith machine lunge ELEVATED.mp4': { name: 'Zancada en Smith elevada', muscle_group: 'Piernas' },
  'Smith machine lunge.mp4': { name: 'Zancada en Smith', muscle_group: 'Piernas' },
  'Smith machine squat.mp4': { name: 'Sentadilla en Smith', muscle_group: 'Piernas' },
  'Smith marchine flat bench press.mp4': { name: 'Press plano en Smith', muscle_group: 'Pecho' },
  'Standard cable curl.mp4': { name: 'Curl en polea', muscle_group: 'Brazos' },
  'Sumo deadlift.mp4': { name: 'Peso muerto sumo', muscle_group: 'Piernas' },
  'Walking Lunge.mp4': { name: 'Zancada caminando', muscle_group: 'Piernas' },
  'Wide-grip lat pulldown.mp4': { name: 'Jalón al pecho agarre ancho', muscle_group: 'Espalda' },
  'Wide-grip pull-up.mp4': { name: 'Dominadas agarre ancho', muscle_group: 'Espalda' },
  'Yates row.mp4': { name: 'Remo Yates', muscle_group: 'Espalda' },
};

const LARGE_FILE_WARNING_BYTES = 100 * 1024 * 1024;

function parseArgs(argv: string[]): { videosDir: string; csvPath: string; reviewPath: string } {
  let videosDir = path.join(
    process.env.USERPROFILE ?? process.env.HOME ?? '',
    'Desktop',
    'Multimedia_Caribean-Gym'
  );
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--videos' && argv[i + 1]) videosDir = argv[++i];
  }
  const dataDir = path.join(process.cwd(), 'scripts/db/data');
  return {
    videosDir,
    csvPath: path.join(dataDir, 'system-exercises.csv'),
    reviewPath: path.join(dataDir, 'system-exercises-review.md'),
  };
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function resolveEntry(filename: string): ExerciseEntry | null {
  if (filename in LV0_OVERRIDES) {
    return LV0_OVERRIDES[filename];
  }
  return EXERCISE_MAP[filename] ?? null;
}

function csvHeaderComments(): string[] {
  return [
    '# Catálogo de ejercicios del sistema para seed-system-exercises.ts',
    '# Columnas: filename,name,muscle_group,description,execution',
    '# filename = nombre exacto del .mp4 en la carpeta de videos',
    '# muscle_group = Pecho | Espalda | Piernas | Hombros | Brazos | Core | Cardio | Full Body',
    '# Evita comas en description y execution (el parser no las soporta aún)',
    '# Regenerar: npx tsx scripts/db/generate-system-exercises-csv.ts',
  ];
}

function main() {
  const { videosDir, csvPath, reviewPath } = parseArgs(process.argv);

  if (!fs.existsSync(videosDir)) {
    console.error(`Carpeta no encontrada: ${videosDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(videosDir)
    .filter((f) => f.toLowerCase().endsWith('.mp4'))
    .sort((a, b) => a.localeCompare(b, 'es'));

  const rows: string[] = [];
  const pendingLv0: string[] = [];
  const unmapped: string[] = [];
  const largeFiles: string[] = [];
  const included: string[] = [];

  for (const filename of files) {
    const fullPath = path.join(videosDir, filename);
    const sizeBytes = fs.statSync(fullPath).size;
    if (sizeBytes > LARGE_FILE_WARNING_BYTES) {
      largeFiles.push(`${filename} (${(sizeBytes / (1024 * 1024)).toFixed(1)} MB)`);
    }

    if (filename in LV0_OVERRIDES) {
      const override = LV0_OVERRIDES[filename];
      if (!override) {
        pendingLv0.push(filename);
        continue;
      }
    }

    const entry = resolveEntry(filename);
    if (!entry) {
      unmapped.push(filename);
      continue;
    }

    if (!MUSCLE_GROUPS.includes(entry.muscle_group)) {
      console.error(`Grupo inválido para ${filename}: ${entry.muscle_group}`);
      process.exit(1);
    }

    const description = `Demostración de ${entry.name}`;
    rows.push(
      [
        escapeCsv(filename),
        escapeCsv(entry.name),
        escapeCsv(entry.muscle_group),
        escapeCsv(description),
        '',
      ].join(',')
    );
    included.push(filename);
  }

  const csvLines = [
    ...csvHeaderComments(),
    'filename,name,muscle_group,description,execution',
    ...rows,
  ];
  fs.writeFileSync(csvPath, `${csvLines.join('\n')}\n`, 'utf8');

  const review = [
    '# Revisión del catálogo generado',
    '',
    `Generado: ${new Date().toISOString()}`,
    `Carpeta: ${videosDir}`,
    `Incluidos en CSV: ${included.length}`,
    `Videos en carpeta: ${files.length}`,
    '',
    '## Archivos lv_0 pendientes de nombre',
    '',
    'Edita `LV0_OVERRIDES` en `scripts/db/generate-system-exercises-csv.ts` y vuelve a ejecutar el generador.',
    '',
    ...(pendingLv0.length > 0
      ? pendingLv0.map(
          (f) =>
            `- \`${f}\` — ver el video y añadir: \`'${f}': { name: '...', muscle_group: '...' }\``
        )
      : ['(ninguno — todos los lv_0 están mapeados)']),
    '',
    '## Archivos muy grandes (revisar duración antes del seed)',
    '',
    ...(largeFiles.length > 0
      ? largeFiles.map((f) => `- ${f}`)
      : ['(ninguno sobre 100 MB)']),
    '',
    '## Sin mapeo en EXERCISE_MAP',
    '',
    ...(unmapped.length > 0 ? unmapped.map((f) => `- \`${f}\``) : ['(ninguno)']),
    '',
    '## Próximo paso',
    '',
    '```bash',
    'npm run db:seed-system-exercises -- --dry-run --videos "' + videosDir.replace(/\\/g, '\\\\') + '"',
    '```',
    '',
  ].join('\n');

  fs.writeFileSync(reviewPath, review, 'utf8');

  console.log(`CSV: ${csvPath} (${included.length} ejercicios)`);
  console.log(`Revisión: ${reviewPath}`);
  if (pendingLv0.length > 0) {
    console.log(`\nPendientes lv_0: ${pendingLv0.length} (ver review.md)`);
  }
  if (unmapped.length > 0) {
    console.log(`Sin mapeo: ${unmapped.length}`);
    process.exit(1);
  }
  if (largeFiles.length > 0) {
    console.log(`\nAdvertencia: ${largeFiles.length} archivo(s) muy grande(s) — ver review.md`);
  }
}

main();
