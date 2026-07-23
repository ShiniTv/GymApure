import { BRAND } from '../../config/brand.ts';
import { escapeHtml } from './escape.ts';
import { appUrl, ctaButton, layoutHtml, layoutText } from './layout.ts';

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

function daysLabel(days: number): string {
  return days === 1 ? '1 día' : `${days} días`;
}

export function passwordResetEmail(name: string, resetUrl: string): EmailContent {
  const safeName = escapeHtml(name);
  const subject = `Recuperar contraseña — ${BRAND.name}`;
  const html = layoutHtml(`
    <h2>Recuperar contraseña</h2>
    <p>Hola <strong>${safeName}</strong>,</p>
    <p>Recibimos una solicitud para restablecer tu contraseña en ${escapeHtml(BRAND.name)}.</p>
    ${ctaButton(resetUrl, 'Restablecer contraseña')}
    <p class="muted">Si no solicitaste este cambio, ignora este correo. El enlace expira en 1 hora.</p>
  `);
  const text = layoutText([
    `Hola ${name},`,
    '',
    `Recibimos una solicitud para restablecer tu contraseña en ${BRAND.name}.`,
    '',
    `Restablecer contraseña: ${resetUrl}`,
    '',
    'Si no solicitaste este cambio, ignora este correo. El enlace expira en 1 hora.',
  ]);
  return { subject, html, text };
}

export function walkInWelcomeEmail(
  name: string,
  setupUrl: string,
  membershipName: string
): EmailContent {
  const safeName = escapeHtml(name);
  const safeMembership = escapeHtml(membershipName);
  const subject = `Bienvenido a ${BRAND.name} — crea tu contraseña`;
  const html = layoutHtml(`
    <h2>¡Bienvenido, ${safeName}!</h2>
    <p>Tu membresía <strong>${safeMembership}</strong> ya está activa en ${escapeHtml(BRAND.name)}.</p>
    <p>Para completar tu registro y acceder a la app, crea tu contraseña personal:</p>
    ${ctaButton(setupUrl, 'Crear mi contraseña')}
    <p class="muted">El enlace expira en 48 horas. Mientras tanto, puedes entrar al gym presentando tu cédula en recepción.</p>
    <p class="muted">Si no reconoces este registro, contacta a recepción.</p>
  `);
  const text = layoutText([
    `¡Bienvenido, ${name}!`,
    '',
    `Tu membresía "${membershipName}" ya está activa en ${BRAND.name}.`,
    '',
    `Crear mi contraseña: ${setupUrl}`,
    '',
    'El enlace expira en 48 horas. Mientras tanto, puedes entrar al gym presentando tu cédula en recepción.',
    'Si no reconoces este registro, contacta a recepción.',
  ]);
  return { subject, html, text };
}

export function welcomeEmail(name: string): EmailContent {
  const safeName = escapeHtml(name);
  const loginUrl = appUrl('/');
  const subject = `Bienvenido a ${BRAND.name}`;
  const html = layoutHtml(`
    <h2>Bienvenido, ${safeName}</h2>
    <p>Tu cuenta en ${escapeHtml(BRAND.name)} se creó correctamente. Ya puedes iniciar sesión con tu correo y contraseña.</p>
    ${ctaButton(loginUrl, `Entrar a ${BRAND.name}`)}
    <p>Para entrenar en el gym, preséntate en recepción con tu cédula. Un administrador activará tu membresía.</p>
    <p class="muted">Si tienes dudas, consulta con el personal del gym.</p>
  `);
  const text = layoutText([
    `Bienvenido, ${name}`,
    '',
    `Tu cuenta en ${BRAND.name} se creó correctamente. Ya puedes iniciar sesión con tu correo y contraseña.`,
    '',
    `Entrar: ${loginUrl}`,
    '',
    'Para entrenar en el gym, preséntate en recepción con tu cédula. Un administrador activará tu membresía.',
  ]);
  return { subject, html, text };
}

export function paymentApprovedEmail(
  name: string,
  amount: number,
  membershipName?: string | null
): EmailContent {
  const safeName = escapeHtml(name);
  const amountStr = `$${amount.toFixed(2)} USD`;
  const membershipLine = membershipName?.trim()
    ? ` Membresía: <strong>${escapeHtml(membershipName.trim())}</strong>.`
    : '';
  const membershipText = membershipName?.trim() ? ` Membresía: ${membershipName.trim()}.` : '';
  const paymentsUrl = appUrl('/payments');
  const subject = `Pago aprobado — ${BRAND.name}`;
  const html = layoutHtml(`
    <h2>Pago aprobado <span class="badge badge-green">Aprobado</span></h2>
    <p>Hola <strong>${safeName}</strong>,</p>
    <p>Tu pago de <strong>${amountStr}</strong> ha sido aprobado.${membershipLine}</p>
    <p>Ya puedes acceder al gym. ¡Disfruta tu entrenamiento!</p>
    ${ctaButton(paymentsUrl, 'Ver mis pagos')}
  `);
  const text = layoutText([
    `Hola ${name},`,
    '',
    `Tu pago de ${amountStr} ha sido aprobado.${membershipText}`,
    '',
    'Ya puedes acceder al gym. ¡Disfruta tu entrenamiento!',
    '',
    `Ver mis pagos: ${paymentsUrl}`,
  ]);
  return { subject, html, text };
}

export function paymentRejectedEmail(name: string, amount: number, reason?: string): EmailContent {
  const safeName = escapeHtml(name);
  const amountStr = `$${amount.toFixed(2)} USD`;
  const reasonTrim = reason?.trim();
  const reasonHtml = reasonTrim ? `<p><strong>Motivo:</strong> ${escapeHtml(reasonTrim)}</p>` : '';
  const reasonText = reasonTrim ? `Motivo: ${reasonTrim}` : '';
  const paymentsUrl = appUrl('/payments');
  const subject = `Pago rechazado — ${BRAND.name}`;
  const html = layoutHtml(`
    <h2>Pago rechazado <span class="badge badge-red">Rechazado</span></h2>
    <p>Hola <strong>${safeName}</strong>,</p>
    <p>Tu pago de <strong>${amountStr}</strong> no pudo ser aprobado.</p>
    ${reasonHtml}
    <p>Comunícate con recepción para resolverlo y vuelve a reportar tu pago desde la app.</p>
    ${ctaButton(paymentsUrl, 'Ir a pagos')}
  `);
  const text = layoutText([
    `Hola ${name},`,
    '',
    `Tu pago de ${amountStr} no pudo ser aprobado.`,
    reasonText,
    '',
    'Comunícate con recepción para resolverlo y vuelve a reportar tu pago desde la app.',
    '',
    `Ir a pagos: ${paymentsUrl}`,
  ]);
  return { subject, html, text };
}

export function membershipExpiringEmail(
  name: string,
  days: number,
  membershipName?: string | null
): EmailContent {
  const safeName = escapeHtml(name);
  const label = daysLabel(days);
  const planHtml = membershipName?.trim()
    ? ` Tu plan <strong>${escapeHtml(membershipName.trim())}</strong>`
    : ' Tu membresía';
  const planText = membershipName?.trim() ? `Tu plan "${membershipName.trim()}"` : 'Tu membresía';
  const paymentsUrl = appUrl('/payments');
  const subject = `Membresía por vencer — ${BRAND.name}`;
  const html = layoutHtml(`
    <h2>Membresía por vencer <span class="badge badge-amber">Aviso</span></h2>
    <p>Hola <strong>${safeName}</strong>,</p>
    <p>${planHtml} vence en <strong>${escapeHtml(label)}</strong>.</p>
    <p>Renueva a tiempo para seguir entrenando sin interrupciones. Puedes hacerlo desde la app o en recepción.</p>
    ${ctaButton(paymentsUrl, 'Renovar / ver pagos')}
  `);
  const text = layoutText([
    `Hola ${name},`,
    '',
    `${planText} vence en ${label}.`,
    '',
    'Renueva a tiempo para seguir entrenando sin interrupciones. Puedes hacerlo desde la app o en recepción.',
    '',
    `Renovar / ver pagos: ${paymentsUrl}`,
  ]);
  return { subject, html, text };
}

export function membershipExpiredEmail(name: string, membershipName?: string | null): EmailContent {
  const safeName = escapeHtml(name);
  const planHtml = membershipName?.trim()
    ? `Tu membresía <strong>${escapeHtml(membershipName.trim())}</strong>`
    : 'Tu membresía';
  const planText = membershipName?.trim()
    ? `Tu membresía "${membershipName.trim()}"`
    : 'Tu membresía';
  const paymentsUrl = appUrl('/payments');
  const subject = `Membresía vencida — ${BRAND.name}`;
  const html = layoutHtml(`
    <h2>Membresía vencida</h2>
    <p>Hola <strong>${safeName}</strong>,</p>
    <p>${planHtml} ha vencido. Para seguir entrenando, renueva tu plan en recepción o desde la app.</p>
    ${ctaButton(paymentsUrl, 'Renovar ahora')}
    <p class="muted">¡Te esperamos de vuelta!</p>
  `);
  const text = layoutText([
    `Hola ${name},`,
    '',
    `${planText} ha vencido. Para seguir entrenando, renueva tu plan en recepción o desde la app.`,
    '',
    `Renovar ahora: ${paymentsUrl}`,
    '',
    '¡Te esperamos de vuelta!',
  ]);
  return { subject, html, text };
}

export function adminPaymentReportedEmail(opts: {
  memberName: string;
  memberEmail?: string | null;
  amountUsd: number;
  paymentId: number;
}): EmailContent {
  const { memberName, memberEmail, amountUsd, paymentId } = opts;
  const amountStr = `$${amountUsd.toFixed(2)} USD`;
  const reviewUrl = appUrl(`/payments?status=pending`);
  const subject = `Pago pendiente #${paymentId} — ${BRAND.name}`;
  const safeName = escapeHtml(memberName);
  const emailLine = memberEmail?.trim()
    ? `<p class="muted">${escapeHtml(memberEmail.trim())}</p>`
    : '';
  const emailText = memberEmail?.trim() ? memberEmail.trim() : '';
  const html = layoutHtml(`
    <h2>Pago pendiente de revisión</h2>
    <p><strong>${safeName}</strong> reportó un pago de <strong>${amountStr}</strong>.</p>
    ${emailLine}
    <p>ID de pago: <strong>#${paymentId}</strong></p>
    ${ctaButton(reviewUrl, 'Revisar pagos pendientes')}
  `);
  const text = layoutText([
    'Pago pendiente de revisión',
    '',
    `${memberName} reportó un pago de ${amountStr}.`,
    emailText,
    `ID de pago: #${paymentId}`,
    '',
    `Revisar: ${reviewUrl}`,
  ]);
  return { subject, html, text };
}
