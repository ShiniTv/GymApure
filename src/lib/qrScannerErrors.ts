export function formatQrScannerError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('permission') || lower.includes('notallowed')) {
    return 'Permiso de cámara denegado. Habilítelo en Ajustes del navegador y recargue la página.';
  }
  if (lower.includes('secure context') || lower.includes('https')) {
    return 'La cámara solo funciona con conexión segura (HTTPS).';
  }
  if (lower.includes('no camera') || lower.includes('notfound') || lower.includes('device')) {
    return 'No se detectó ninguna cámara en este dispositivo.';
  }
  if (lower.includes('in use') || lower.includes('notreadable')) {
    return 'La cámara está en uso por otra aplicación. Ciérrela e intente de nuevo.';
  }
  if (
    lower.includes('barcode detection service unavailable') ||
    lower.includes('wasm') ||
    lower.includes('detection service') ||
    lower.includes('lector qr')
  ) {
    return 'No se pudo iniciar el lector QR. Use la cédula manual o recargue la página.';
  }

  return 'No se pudo acceder a la cámara. Use la cédula manual abajo.';
}
