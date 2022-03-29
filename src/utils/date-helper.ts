export class DateHelper {
  static addDays(days = 0, from = new Date()): Date {
    return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
  }

  static addMinutes(minutes = 0, from = new Date()): Date {
    return new Date(from.getTime() + minutes * 60 * 1000);
  }
}
