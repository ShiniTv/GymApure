import { ADMIN_MORE_ITEMS } from '../config/navigation/adminBottomNav';
import type { StaffBottomNavMoreItem } from '../config/navigation/bottomNavTypes';

const STORAGE_KEY = 'cg-admin-favorites';
const MAX_FAVORITES = 4;
export const ADMIN_FAVORITES_CHANGED_EVENT = 'cg-admin-favorites-changed';

export type AdminFavoriteHref = string;

function isKnownHref(href: string): boolean {
  return ADMIN_MORE_ITEMS.some((item) => item.href === href);
}

export function readAdminFavorites(): AdminFavoriteHref[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((href): href is string => typeof href === 'string' && isKnownHref(href))
      .slice(0, MAX_FAVORITES);
  } catch {
    return [];
  }
}

export function writeAdminFavorites(hrefs: AdminFavoriteHref[]): void {
  const next = hrefs.filter(isKnownHref).slice(0, MAX_FAVORITES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(ADMIN_FAVORITES_CHANGED_EVENT));
}

export function toggleAdminFavorite(href: string): AdminFavoriteHref[] {
  if (!isKnownHref(href)) return readAdminFavorites();
  const current = readAdminFavorites();
  const next = current.includes(href)
    ? current.filter((h) => h !== href)
    : [...current, href].slice(-MAX_FAVORITES);
  writeAdminFavorites(next);
  return next;
}

export function resolveAdminFavoriteItems(hrefs: AdminFavoriteHref[]): StaffBottomNavMoreItem[] {
  return hrefs
    .map((href) => ADMIN_MORE_ITEMS.find((item) => item.href === href))
    .filter((item): item is StaffBottomNavMoreItem => Boolean(item));
}
