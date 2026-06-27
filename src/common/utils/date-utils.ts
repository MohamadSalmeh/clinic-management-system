// src/common/utils/date-utils.ts

/**
 * تحويل تاريخ إلى كائن Date مع ضبط الوقت إلى منتصف الليل (00:00:00)
 */
export function toDateOnly(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * مقارنة تاريخين (اليوم فقط) - تعيد true إذا كانا نفس اليوم
 */
export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = toDateOnly(date1);
  const d2 = toDateOnly(date2);
  return d1.getTime() === d2.getTime();
}

/**
 * تحويل تاريخ إلى string بصيغة YYYY-MM-DD (بدون وقت)
 */
export function toDateString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * الحصول على اليوم الحالي كـ Date بدون وقت
 */
export function todayDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * الحصول على بداية اليوم (00:00:00) كـ Date
 */
export function startOfDay(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/**
 * الحصول على نهاية اليوم (23:59:59.999) كـ Date
 */
export function endOfDay(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/**
 * حساب الفرق بالدقائق بين وقتين
 */
export function minutesDiff(date1: Date, date2: Date): number {
  return Math.round((date1.getTime() - date2.getTime()) / (1000 * 60));
}

/**
 * إنشاء Date من تاريخ ووقت (مثل "2026-06-27" و "14:30:00")
 */
export function combineDateAndTime(date: string, time: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hours || 0, minutes || 0, seconds || 0);
}

/**
 * إضافة عدد معين من الأيام إلى تاريخ محدد
 */
export function addDays(date: Date | string, days: number): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}