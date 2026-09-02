export const API = '/api';
export const TOKEN_KEY = 'piquera.accessToken';
export const THEME_KEY = 'piquera-theme';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'client' | 'staff' | 'admin';
  points: number;
}

export interface AuthResponse {
  accessToken: string;
  token?: string;
  user: User;
}

export interface Yard {
  id: string;
  slug: string;
  name: string;
  flora: string;
  description: string;
  hiveCount: number;
  capacity: number;
  layout: 'wide' | 'tall' | 'minimal' | 'framed';
  imagePath: string;
  caption: string;
  fromPriceCents?: number;
  todayStatus?: string;
  todayCapacity?: number;
  todayCount?: number;
  today?: YardDay;
}

export interface YardDay {
  id: string;
  yardId: string;
  onDate: string;
  status: 'open' | 'limited' | 'closed';
  capacityOverride: number | null;
  checkInCount: number;
}

export interface PassProduct {
  id: string;
  slug: string;
  name: string;
  durationDays: number;
  priceCents: number;
  active: boolean;
}

export interface Addon {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  stock: number;
  active: boolean;
}

export interface PassLine {
  id: string;
  kind: 'product' | 'addon';
  refId: string;
  label: string;
  qty: number;
  unitCents: number;
  subtotalCents: number;
}

export interface CheckIn {
  id: string;
  userId: string;
  passId: string;
  yardId: string;
  onDate: string;
  status: 'checked_in';
  yard?: Yard;
}

export interface Pass {
  id: string;
  userId: string;
  productId: string;
  code: string;
  status: 'confirmed' | 'cancelled';
  startsOn: string;
  endsOn: string;
  totalCents: number;
  linesSum?: number;
  qrSvg: string;
  qrUrl: string;
  lines: PassLine[];
  stamps?: CheckIn[];
  stampCount: number;
  points: number;
  checkIns?: CheckIn[];
}

export interface Harvest {
  id: string;
  yardId: string;
  yardName?: string;
  startsOn: string;
  endsOn: string;
  minStamps: number;
  jarsTotal: number;
  jarsRemaining: number;
  status: 'open' | 'closed';
}

export interface SeriesPoint {
  date: string;
  count: number;
}

export interface HomeDto {
  nectar: number;
  yardsOpen: { slug: string; name: string; status: string; remaining: number }[];
  harvest: Harvest | null;
  fromPriceCents: number;
  series14d: SeriesPoint[];
}

export function euros(cents: number): string {
  return (cents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

export function humanizeApiError(err: unknown, fallback = 'No se pudo completar.'): string {
  const body = (err as { error?: any })?.error;
  const code =
    body?.code ||
    (typeof body?.message === 'string' && body.message.includes(':') ? body.message.split(':')[0] : '');
  const raw =
    typeof body?.message === 'string'
      ? body.message
      : typeof body?.message?.message === 'string'
        ? body.message.message
        : '';
  const stripped = raw.replace(/^[A-Z_]+:\s*/, '');
  if (stripped && !/^[A-Z_]+$/.test(stripped)) return stripped;
  const map: Record<string, string> = {
    PASS_OVERLAP: 'Ya tienes un bono activo que cubre estos días.',
    ALREADY_CHECKED_IN: 'Ya sellaste hoy.',
    YARD_CLOSED: 'Hoy ese patio está cerrado.',
    YARD_FULL: 'El patio está lleno hoy.',
    PASS_INACTIVE: 'No tienes un bono activo para hoy.',
    PASS_ALREADY_USED: 'Este bono ya no se puede cancelar.',
    NOT_ENOUGH_STAMPS: 'Todavía no tienes sellos suficientes para el tarro.',
    NO_JARS: 'No quedan tarros en esta mielada.',
    ALREADY_CLAIMED: 'Ya reclamaste un tarro de esta mielada.',
    NO_STOCK: 'Ese extra se ha agotado.',
  };
  return map[code] || fallback;
}
