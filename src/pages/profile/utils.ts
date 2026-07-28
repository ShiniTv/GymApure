/** Demo/legacy rows sometimes store meters (e.g. 1.75); UI expects cm. */
export function heightCmForForm(height: number | null | undefined): string {
  if (height == null || Number.isNaN(height)) return '';
  if (height > 0 && height < 3) return String(Math.round(height * 1000) / 10);
  return String(height);
}

export function heightCmNumber(height: number | null | undefined): number | null {
  if (height == null || Number.isNaN(height)) return null;
  if (height > 0 && height < 3) return Math.round(height * 1000) / 10;
  return height;
}
