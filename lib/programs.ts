export const PROGRAM_LABELS: Record<string, string> = {
  basketball_5_sessions: 'Basketball — 5 Sessions',
  basketball_7_sessions: 'Basketball — 7 Sessions',
  basketball_drop_in:    'Basketball — Drop-in',
  volleyball_5_sessions: 'Volleyball — 5 Sessions',
  volleyball_7_sessions: 'Volleyball — 7 Sessions',
  volleyball_drop_in:    'Volleyball — Drop-in',
  // legacy keys (keep for existing records)
  basketball_early_bird:   'Basketball — Early Bird',
  basketball_memorial_day: 'Basketball — Best Deal',
  basketball_regular:      'Basketball — Standard',
  volleyball_early_bird:   'Volleyball — Early Bird',
  volleyball_memorial_day: 'Volleyball — Best Deal',
  volleyball_regular:      'Volleyball — Standard',
}

export const PROGRAM_PRICES: Record<string, string> = {
  basketball_5_sessions: '$150',
  basketball_7_sessions: '$200',
  basketball_drop_in:    '$32/class',
  volleyball_5_sessions: '$150',
  volleyball_7_sessions: '$200',
  volleyball_drop_in:    '$32/class',
  // legacy keys
  basketball_early_bird:   '$350',
  basketball_memorial_day: '$300',
  basketball_regular:      '$400',
  volleyball_early_bird:   '$350',
  volleyball_memorial_day: '$300',
  volleyball_regular:      '$400',
}

export const PROGRAM_SESSIONS: Record<string, number> = {
  basketball_5_sessions: 5,
  basketball_7_sessions: 7,
  basketball_drop_in:    1,
  volleyball_5_sessions: 5,
  volleyball_7_sessions: 7,
  volleyball_drop_in:    1,
}
