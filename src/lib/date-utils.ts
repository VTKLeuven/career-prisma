/**
 * Format date to Belgian format (dd/mm/yyyy)
 */
export function formatDateBE(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) {
    return '';
  }
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
}

/**
 * Format date and time to Belgian format (dd/mm/yyyy HH:mm)
 */
export function formatDateTimeBE(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) {
    return '';
  }
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Convert UTC ISO string to local datetime-local format (YYYY-MM-DDTHH:mm)
 * This is used for displaying UTC dates in datetime-local inputs
 */
export function utcToLocalDateTimeLocal(utcIsoString: string): string {
  if (!utcIsoString) return '';
  
  const date = new Date(utcIsoString);
  if (isNaN(date.getTime())) {
    return '';
  }
  
  // Get local date components
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Convert local datetime-local format (YYYY-MM-DDTHH:mm) to UTC ISO string
 * This is used for saving datetime-local input values to the database
 */
export function localDateTimeLocalToUtc(dateTimeLocal: string): string {
  if (!dateTimeLocal) return '';
  
  // datetime-local is always in local time, so we create a date object
  // which interprets it as local time, then convert to UTC ISO string
  const localDate = new Date(dateTimeLocal);
  if (isNaN(localDate.getTime())) {
    return '';
  }
  
  return localDate.toISOString();
}

