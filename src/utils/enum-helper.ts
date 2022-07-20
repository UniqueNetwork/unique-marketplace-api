export class EnumHelper {
  static toEnum(input: Record<string, string>): string {
    return Object.values(input)
      .map((v) => `'${v}'`)
      .join(', ');
  }
}
