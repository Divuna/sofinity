import { format, parseISO } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { cs } from 'date-fns/locale/cs';

const PRAGUE_TIMEZONE = 'Europe/Prague';

/**
 * Converts UTC ISO string to Prague time formatted string
 */
export function pragueUtcToLabel(utcIso: string): string {
  try {
    const utcDate = parseISO(utcIso);
    const pragueDate = toZonedTime(utcDate, PRAGUE_TIMEZONE);
    return format(pragueDate, 'dd.MM.yyyy HH:mm', { locale: cs });
  } catch (error) {
    console.error('Error formatting Prague date:', error);
    return 'Neplatné datum';
  }
}

/**
 * Converts datetime-local input to UTC ISO string
 */
export function pragueLocalInputToUtc(datetimeLocal: string): string {
  if (!datetimeLocal) {
    throw new Error('DateTime input is required');
  }

  try {
    // Parse datetime-local string as Prague time
    // Format: "2024-12-10T22:21"
    const [datePart, timePart] = datetimeLocal.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);
    
    // Create date treating input as Prague time
    const pragueDate = new Date(year, month - 1, day, hour, minute);
    
    // Convert from Prague time to UTC
    const utcDate = fromZonedTime(pragueDate, PRAGUE_TIMEZONE);
    return utcDate.toISOString();
  } catch (error) {
    console.error('Error converting Prague input to UTC:', error);
    throw new Error('Nepodařilo se převést datum na UTC');
  }
}

/**
 * Gets current time in Prague formatted as label
 */
export function nowPragueLabel(): string {
  const now = new Date();
  const pragueNow = toZonedTime(now, PRAGUE_TIMEZONE);
  return format(pragueNow, 'dd.MM.yyyy HH:mm', { locale: cs });
}

/**
 * Converts UTC ISO to Prague datetime-local input format
 */
export function utcToPragueInput(utcIso: string): string {
  try {
    const utcDate = parseISO(utcIso);
    const pragueDate = toZonedTime(utcDate, PRAGUE_TIMEZONE);
    return format(pragueDate, "yyyy-MM-dd'T'HH:mm");
  } catch (error) {
    console.error('Error converting UTC to Prague input:', error);
    return '';
  }
}