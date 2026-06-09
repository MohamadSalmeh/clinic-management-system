
export enum QueueStatus {
  WAITING = 'waiting',
  CALLING = 'calling',     // 👈 إضافة الحالة الجديدة هنا
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
}