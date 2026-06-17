import { useState } from 'react';
import { downloadReport } from '../lib/api';
import { FileSpreadsheet, Download, Calendar, DollarSign, Users, Fingerprint } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { Button, Card, Input, Label, PageHeader } from '../components/ui';

type ReportType = 'payments' | 'attendance' | 'members';

const REPORTS: {
  type: ReportType;
  title: string;
  description: string;
  icon: typeof DollarSign;
  hasDateRange: boolean;
}[] = [
  {
    type: 'payments',
    title: 'Pagos',
    description: 'Ingresos reportados y aprobados con montos, método y estado.',
    icon: DollarSign,
    hasDateRange: true,
  },
  {
    type: 'attendance',
    title: 'Asistencias',
    description: 'Entradas, salidas y duración de cada visita al gym.',
    icon: Fingerprint,
    hasDateRange: true,
  },
  {
    type: 'members',
    title: 'Miembros',
    description: 'Listado de miembros con membresía activa y días restantes.',
    icon: Users,
    hasDateRange: false,
  },
];

export default function Reports() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const monthAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [downloading, setDownloading] = useState<ReportType | null>(null);
  const [error, setError] = useState('');

  const handleDownload = async (type: ReportType, hasDateRange: boolean) => {
    setDownloading(type);
    setError('');
    try {
      await downloadReport(type, hasDateRange ? { from, to } : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al descargar');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={<>Reportes <span className="text-orange-500">exportables</span></>}
        subtitle="Descarga archivos CSV para contabilidad, cierre mensual y análisis operativo."
      />

      {error && (
        <Card className="border-red-500/30 bg-red-500/10">
          <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>
        </Card>
      )}

      <Card>
        <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Rango de fechas (pagos y asistencias)
        </h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label>Desde</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex-1">
            <Label>Hasta</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          const isLoading = downloading === report.type;
          return (
            <Card key={report.type} className="flex flex-col">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-orange-500/10 rounded-xl">
                  <Icon className="h-6 w-6 text-orange-600 dark:text-orange-500" />
                </div>
                <div>
                  <h3 className="font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                    {report.title}
                  </h3>
                  <p className="text-sm text-zinc-500 mt-1">{report.description}</p>
                </div>
              </div>
              <Button
                className="mt-auto w-full"
                disabled={isLoading}
                onClick={() => handleDownload(report.type, report.hasDateRange)}
              >
                {isLoading ? (
                  'Descargando...'
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Descargar CSV
                  </>
                )}
              </Button>
            </Card>
          );
        })}
      </div>

      <Card className="flex items-center gap-3 text-zinc-500">
        <FileSpreadsheet className="h-5 w-5 text-orange-500 shrink-0" />
        <p className="text-sm font-medium">
          Los archivos se generan en el servidor y se descargan con codificación UTF-8 compatible con Excel.
        </p>
      </Card>
    </div>
  );
}
