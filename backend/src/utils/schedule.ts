const HOUR_PATTERN = /^([01]\d|2[0-3]):00$/

export function validateScheduleHours(scheduleType: string, scheduleHours: unknown): {
  error?: string
  hours: string[]
} {
  if (scheduleType === '24h') return { hours: [] }

  if (scheduleType !== 'specific') {
    return { error: 'scheduleType deve ser "24h" ou "specific"', hours: [] }
  }

  if (!Array.isArray(scheduleHours) || scheduleHours.length === 0) {
    return { error: 'Selecione ao menos um horário', hours: [] }
  }

  const hours = scheduleHours.map(hour => typeof hour === 'string' ? hour.trim() : '')
  const invalid = hours.filter(hour => !HOUR_PATTERN.test(hour))
  if (invalid.length > 0) {
    return { error: 'Horário inválido. Use apenas horários cheios entre 00:00 e 23:00', hours: [] }
  }

  if (new Set(hours).size !== hours.length) {
    return { error: 'Remova horários duplicados', hours: [] }
  }

  return { hours }
}
