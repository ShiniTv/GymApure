import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { BRAND } from '../config/brand';
import { Button, Input, Label, Textarea } from '../components/ui';
import { usePageTitle } from '../hooks/usePageTitle';

export default function SolicitarDemo() {
  usePageTitle('Solicitar demo');
  const [form, setForm] = useState({
    contact_name: '',
    email: '',
    phone: '',
    gym_name: '',
    city: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/demo-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo enviar la solicitud');
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-zinc-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(249,115,22,0.18),_transparent_55%)]" />
      <div className="relative mx-auto flex min-h-dvh max-w-5xl flex-col px-4 py-8 sm:px-6">
        <header className="mb-10 flex items-center justify-between gap-4">
          <Link to="/login" className="text-lg font-bold tracking-tight">
            <span className="text-white">{BRAND.nameParts.primary}</span>
            <span className="text-orange-500">{BRAND.nameParts.accent}</span>
          </Link>
          <Link
            to="/login"
            className="text-sm font-semibold text-zinc-300 underline-offset-4 hover:text-white hover:underline"
          >
            Iniciar sesión
          </Link>
        </header>

        <main className="grid flex-1 gap-10 lg:grid-cols-2 lg:items-start">
          <section className="space-y-5">
            <p className="text-sm font-semibold tracking-wide text-orange-400 uppercase">
              Demo para gimnasios
            </p>
            <h1 className="text-4xl leading-tight font-bold sm:text-5xl">{BRAND.heroHeadline}</h1>
            <p className="max-w-md text-base text-zinc-400 sm:text-lg">{BRAND.heroSubheadline}</p>
            <ul className="space-y-2 text-sm text-zinc-300">
              <li>Recepción, check-in y walk-in en minutos</li>
              <li>Pagos con comprobante y tasa BCV</li>
              <li>Rutinas, clases y chat con miembros</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 sm:p-6">
            {done ? (
              <div className="space-y-3 py-6 text-center">
                <h2 className="text-xl font-bold">Solicitud enviada</h2>
                <p className="text-sm text-zinc-400">
                  Gracias. Te contactaremos al correo indicado para coordinar la demo.
                </p>
                <Link to="/login" className="text-sm font-semibold text-orange-400 hover:underline">
                  Ir al login
                </Link>
              </div>
            ) : (
              <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
                <h2 className="mb-2 text-lg font-bold">Solicitar una demo</h2>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <div>
                  <Label htmlFor="contact_name">Tu nombre</Label>
                  <Input
                    id="contact_name"
                    required
                    value={form.contact_name}
                    onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Correo</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="gym_name">Nombre del gimnasio</Label>
                  <Input
                    id="gym_name"
                    required
                    value={form.gym_name}
                    onChange={(e) => setForm({ ...form, gym_name: e.target.value })}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="phone">Teléfono (opcional)</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">Ciudad (opcional)</Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="message">¿Qué necesitas? (opcional)</Label>
                  <Textarea
                    id="message"
                    rows={3}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full" loading={submitting}>
                  Enviar solicitud
                </Button>
              </form>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
