export function equalsIgnoreCase(a: string | undefined | null, b: string | undefined | null): boolean {
  if (a == null) {
    return b == null;
  }

  if (b == null) {
    return false;
  }

  return a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0;
}
