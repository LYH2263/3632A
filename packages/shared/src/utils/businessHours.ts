import type { BusinessHours, DayHours, Weekday } from '../types';

const TIMEZONE_OFFSET = 8;

function getBeijingNow(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + TIMEZONE_OFFSET * 3600000);
}

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function isTimeInRange(currentMinutes: number, start: number, end: number): boolean {
  if (start <= end) {
    return currentMinutes >= start && currentMinutes < end;
  }
  return currentMinutes >= start || currentMinutes < end;
}

export function isMerchantOpen(businessHours: BusinessHours, isOpen: boolean, now?: Date): boolean {
  if (!isOpen) {
    return false;
  }

  const beijingNow = now || getBeijingNow();
  const weekday = beijingNow.getDay() as Weekday;
  const currentMinutes = beijingNow.getHours() * 60 + beijingNow.getMinutes();

  const dayHours = businessHours[weekday];
  if (!dayHours || !dayHours.enabled) {
    return false;
  }

  const start = parseTime(dayHours.start);
  const end = parseTime(dayHours.end);

  return isTimeInRange(currentMinutes, start, end);
}

export function getMerchantStatusText(businessHours: BusinessHours, isOpen: boolean, now?: Date): string {
  return isMerchantOpen(businessHours, isOpen, now) ? '营业中' : '休息中';
}

export function getDefaultBusinessHours(): BusinessHours {
  return {
    0: { enabled: true, start: '08:00', end: '22:00' },
    1: { enabled: true, start: '08:00', end: '22:00' },
    2: { enabled: true, start: '08:00', end: '22:00' },
    3: { enabled: true, start: '08:00', end: '22:00' },
    4: { enabled: true, start: '08:00', end: '22:00' },
    5: { enabled: true, start: '08:00', end: '22:00' },
    6: { enabled: true, start: '08:00', end: '22:00' }
  };
}

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: '周日',
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六'
};

export function formatDayHours(dayHours: DayHours): string {
  if (!dayHours.enabled) {
    return '休息';
  }
  return `${dayHours.start}–${dayHours.end}`;
}

export function getTodayHours(businessHours: BusinessHours, now?: Date): DayHours {
  const beijingNow = now || getBeijingNow();
  const weekday = beijingNow.getDay() as Weekday;
  return businessHours[weekday];
}

export function validateBusinessHours(businessHours: BusinessHours): string[] {
  const errors: string[] = [];
  const timeRegex = /^\d{2}:\d{2}$/;

  for (let i = 0 as Weekday; i <= 6; i = (i + 1) as Weekday) {
    const day = businessHours[i];
    if (!day) {
      errors.push(`${WEEKDAY_LABELS[i]}配置缺失`);
      continue;
    }
    if (day.enabled) {
      if (!timeRegex.test(day.start)) {
        errors.push(`${WEEKDAY_LABELS[i]}开始时间格式错误，应为 HH:mm`);
      }
      if (!timeRegex.test(day.end)) {
        errors.push(`${WEEKDAY_LABELS[i]}结束时间格式错误，应为 HH:mm`);
      }
    }
  }

  return errors;
}
