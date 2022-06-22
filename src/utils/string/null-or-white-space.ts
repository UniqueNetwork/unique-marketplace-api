const regex = /\S/;

export function nullOrWhitespace(str: string | null | undefined): boolean {
  return str == null || !regex.test(str);
}
