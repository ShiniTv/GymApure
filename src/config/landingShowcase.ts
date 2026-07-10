/** Datos alineados con el seed local de desarrollo (no usar en producción). */
export const LANDING_SHOWCASE = {
  admin: {
    revenueThisMonth: 4280,
    todayCheckIns: 47,
    activeMembers: 186,
    pendingPayments: 3,
    revenueTrendPercent: 12,
    chartBars: [42, 58, 35, 71, 48, 63, 55] as const,
  },
  reception: {
    todayCheckIns: 47,
    insideNow: 23,
    pendingPayments: 2,
    memberCedula: 'V-12345678',
    memberName: 'María González',
    membershipName: 'Plan Mensual',
    daysRemaining: 18,
  },
  reports: {
    dateFrom: '2026-07-01',
    dateTo: '2026-07-10',
    payments: 128,
    attendance: 412,
    members: 186,
  },
} as const;

/** Datos genéricos para mockups en producción — sin nombres reales ni datos del gym. */
export const LANDING_SHOWCASE_ILLUSTRATION = {
  admin: {
    revenueThisMonth: 3850,
    todayCheckIns: 32,
    activeMembers: 142,
    pendingPayments: 2,
    revenueTrendPercent: 8,
    chartBars: [38, 52, 41, 60, 45, 55, 48] as const,
  },
  reception: {
    todayCheckIns: 32,
    insideNow: 14,
    pendingPayments: 1,
    memberCedula: 'V-********',
    memberName: 'Miembro de ejemplo',
    membershipName: 'Membresía activa',
    daysRemaining: 12,
  },
  reports: {
    payments: 96,
    attendance: 340,
    members: 142,
  },
} as const;

export interface LandingShowcaseData {
  source: 'static' | 'live' | 'illustration';
  admin: {
    revenueThisMonth: number;
    todayCheckIns: number;
    activeMembers: number;
    pendingPayments: number;
    revenueTrendPercent: number;
    chartBars: number[];
  };
  reception: {
    todayCheckIns: number;
    insideNow: number;
    pendingPayments: number;
    memberCedula: string;
    memberName: string;
    membershipName: string;
    daysRemaining: number;
  };
  reports: {
    dateFrom: string;
    dateTo: string;
    payments: number;
    attendance: number;
    members: number;
  };
}

export function formatCedulaDisplay(cedula: string): string {
  const match = /^([VE])-?(\d{5,10})$/.exec(cedula.trim().toUpperCase());
  if (!match) return cedula;
  const [, letter, digits] = match;
  if (digits.length === 8) {
    return `${letter}-${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }
  return `${letter}-${digits}`;
}

export function formatShowcaseDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

export function toLandingShowcaseStatic(): LandingShowcaseData {
  const range = getReportRange();
  return {
    source: 'static',
    admin: {
      ...LANDING_SHOWCASE.admin,
      chartBars: [...LANDING_SHOWCASE.admin.chartBars],
    },
    reception: { ...LANDING_SHOWCASE.reception },
    reports: {
      ...LANDING_SHOWCASE.reports,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
    },
  };
}

/** Vista previa segura para producción: sin datos del gym ni identificadores reales. */
export function toLandingShowcaseIllustration(): LandingShowcaseData {
  const range = getReportRange();
  return {
    source: 'illustration',
    admin: {
      ...LANDING_SHOWCASE_ILLUSTRATION.admin,
      chartBars: [...LANDING_SHOWCASE_ILLUSTRATION.admin.chartBars],
    },
    reception: { ...LANDING_SHOWCASE_ILLUSTRATION.reception },
    reports: {
      ...LANDING_SHOWCASE_ILLUSTRATION.reports,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
    },
  };
}

export function getReportRange(reference = new Date()) {
  const from = new Date(reference.getFullYear(), reference.getMonth(), 1);
  return {
    dateFrom: from.toISOString().split('T')[0],
    dateTo: reference.toISOString().split('T')[0],
  };
}
