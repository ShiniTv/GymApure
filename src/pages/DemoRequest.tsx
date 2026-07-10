import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Building2, Mail, Phone, User } from 'lucide-react';
import { LandingLayout } from '../components/landing/LandingLayout';
import { LANDING_CONTAINER_SM } from '../components/landing/landingStyles';
import { apiFetch, parseJsonResponse } from '../lib/api';
import { MEMBER_COUNT_OPTIONS, PREFERRED_CONTACT_OPTIONS } from '../lib/demoRequestSchema';
import { Button, Card, Input, Label, Select, Spinner, Textarea } from '../components/ui';
import { cn } from '../lib/utils';

interface DemoFormState {
  contactName: string;
  email: string;
  phone: string;
  gymName: string;
  city: string;
  memberCount: string;
  currentTools: string;
  requirements: string;
  preferredContact: (typeof PREFERRED_CONTACT_OPTIONS)[number]['value'];
  website: string;
}

const INITIAL_FORM: DemoFormState = {
  contactName: '',
  email: '',
  phone: '',
  gymName: '',
  city: '',
  memberCount: '',
  currentTools: '',
  requirements: '',
  preferredContact: 'email',
  website: '',
};

export default function DemoRequest() {
  const [form, setForm] = useState<DemoFormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof DemoFormState, string>>>({});
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const setField = <K extends keyof DemoFormState>(key: K, value: DemoFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validateClient = (): boolean => {
    const next: Partial<Record<keyof DemoFormState, string>> = {};
    if (form.contactName.trim().length < 2) next.contactName = 'Indica tu nombre';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Correo inválido';
    if (form.gymName.trim().length < 2) next.gymName = 'Indica el nombre del gimnasio';
    if (form.requirements.trim().length < 10) {
      next.requirements = 'Cuéntanos qué necesitas (mínimo 10 caracteres)';
    }
    if (form.preferredContact !== 'email' && !form.phone?.trim()) {
      next.phone = 'Indica un teléfono para contactarte';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccess('');
    if (!validateClient()) return;

    setLoading(true);
    try {
      const res = await apiFetch('/api/landing/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          phone: form.phone?.trim() || undefined,
          city: form.city?.trim() || undefined,
          memberCount: form.memberCount || undefined,
          currentTools: form.currentTools?.trim() || undefined,
        }),
      });
      const data = await parseJsonResponse<{ message: string; error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error ?? 'No se pudo enviar la solicitud');
      }
      setSuccess(data.message);
      setForm(INITIAL_FORM);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'No se pudo enviar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LandingLayout>
      <section className="scroll-mt-28 px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className={cn(LANDING_CONTAINER_SM, 'max-w-2xl')}>
          <Link
            to="/"
            className="text-brand mb-6 inline-flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-80"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>

          <Card
            className="rounded-2xl border border-zinc-200/80 shadow-xl dark:border-zinc-800"
            padding="md"
          >
            <div className="mb-6 text-center sm:mb-8">
              <p className="text-brand text-[10px] font-bold tracking-[0.16em] uppercase sm:text-xs">
                Solicitar demo
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-white">
                Cuéntanos sobre tu gimnasio
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 sm:text-base dark:text-zinc-400">
                Completa el formulario y nuestro equipo se pondrá en contacto para coordinar una
                demostración personalizada.
              </p>
            </div>

            {formError && (
              <div
                role="alert"
                className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-500"
              >
                {formError}
              </div>
            )}

            {success ? (
              <div
                role="status"
                className="space-y-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400"
              >
                <p className="font-medium">{success}</p>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Revisa tu bandeja de entrada (y spam) en los próximos días. Si necesitas
                  escribirnos directamente, usa el correo de soporte.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link to="/" className="inline-flex">
                    <Button variant="secondary" className="w-full sm:w-auto">
                      Volver al inicio
                    </Button>
                  </Link>
                  <Link to="/login" className="inline-flex">
                    <Button variant="ghost" className="w-full sm:w-auto">
                      Iniciar sesión
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form className="form-stack" onSubmit={handleSubmit} noValidate>
                <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
                  <label htmlFor="website">No completar</label>
                  <input
                    id="website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.website ?? ''}
                    onChange={(e) => setField('website', e.target.value)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="contactName">Nombre completo</Label>
                    <Input
                      id="contactName"
                      name="contactName"
                      required
                      leadingIcon={<User className="h-4 w-4" />}
                      placeholder="Tu nombre"
                      value={form.contactName}
                      error={errors.contactName}
                      onChange={(e) => setField('contactName', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      leadingIcon={<Mail className="h-4 w-4" />}
                      placeholder="correo@tugym.com"
                      value={form.email}
                      error={errors.email}
                      onChange={(e) => setField('email', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Teléfono / WhatsApp</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      leadingIcon={<Phone className="h-4 w-4" />}
                      placeholder="+58 412 000 0000"
                      value={form.phone ?? ''}
                      error={errors.phone}
                      onChange={(e) => setField('phone', e.target.value)}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="gymName">Nombre del gimnasio</Label>
                    <Input
                      id="gymName"
                      name="gymName"
                      required
                      leadingIcon={<Building2 className="h-4 w-4" />}
                      placeholder="Ej. Caribbean Gym"
                      value={form.gymName}
                      error={errors.gymName}
                      onChange={(e) => setField('gymName', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="city">Ciudad / ubicación</Label>
                    <Input
                      id="city"
                      name="city"
                      placeholder="Ej. Caracas"
                      value={form.city ?? ''}
                      onChange={(e) => setField('city', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="memberCount">Miembros aproximados</Label>
                    <Select
                      id="memberCount"
                      name="memberCount"
                      value={form.memberCount ?? ''}
                      onChange={(e) => setField('memberCount', e.target.value)}
                    >
                      <option value="">Seleccionar…</option>
                      {MEMBER_COUNT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="currentTools">¿Qué usan hoy para gestionar?</Label>
                    <Input
                      id="currentTools"
                      name="currentTools"
                      placeholder="Excel, otro software, cuaderno, etc."
                      value={form.currentTools ?? ''}
                      onChange={(e) => setField('currentTools', e.target.value)}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="requirements">Requisitos y necesidades</Label>
                    <Textarea
                      id="requirements"
                      name="requirements"
                      required
                      rows={5}
                      placeholder="Ej. check-in en recepción, control de membresías, reportes de pagos, migración desde Excel…"
                      value={form.requirements}
                      error={errors.requirements}
                      onChange={(e) => setField('requirements', e.target.value)}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="preferredContact">¿Cómo prefieres que te contactemos?</Label>
                    <Select
                      id="preferredContact"
                      name="preferredContact"
                      value={form.preferredContact}
                      onChange={(e) =>
                        setField(
                          'preferredContact',
                          e.target.value as DemoFormState['preferredContact']
                        )
                      }
                    >
                      {PREFERRED_CONTACT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <Button type="submit" className="mt-2 w-full" disabled={loading}>
                  {loading ? <Spinner className="h-4 w-4" /> : 'Enviar solicitud de demo'}
                </Button>

                <p className="text-center text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Al enviar, aceptas que nos comuniquemos contigo para coordinar la demo. No
                  compartimos tus datos con terceros.
                </p>
              </form>
            )}
          </Card>
        </div>
      </section>
    </LandingLayout>
  );
}
