import { AIRateLimitState } from './types';

const STORAGE_KEY = 'imagekit_ai_enhancement_usage';
export const DAILY_LIMIT = 5;

/**
 * Returns today's local calendar date in 'YYYY-MM-DD' format.
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Reads and returns the current rate limit state from localStorage.
 * Automatically resets count if the recorded date is prior to today.
 */
export function getAIRateLimitState(): AIRateLimitState {
  if (typeof window === 'undefined') {
    return {
      date: getTodayDateString(),
      count: 0,
      maxLimit: DAILY_LIMIT,
      remaining: DAILY_LIMIT,
      isLimitReached: false,
    };
  }

  const today = getTodayDateString();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        date: today,
        count: 0,
        maxLimit: DAILY_LIMIT,
        remaining: DAILY_LIMIT,
        isLimitReached: false,
      };
    }

    const parsed = JSON.parse(raw) as { date: string; count: number };
    if (parsed.date !== today) {
      // New day, reset count
      const fresh = { date: today, count: 0 };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      return {
        date: today,
        count: 0,
        maxLimit: DAILY_LIMIT,
        remaining: DAILY_LIMIT,
        isLimitReached: false,
      };
    }

    const count = typeof parsed.count === 'number' ? parsed.count : 0;
    const remaining = Math.max(0, DAILY_LIMIT - count);

    return {
      date: today,
      count,
      maxLimit: DAILY_LIMIT,
      remaining,
      isLimitReached: count >= DAILY_LIMIT,
    };
  } catch {
    // If localStorage is blocked or corrupted
    return {
      date: today,
      count: 0,
      maxLimit: DAILY_LIMIT,
      remaining: DAILY_LIMIT,
      isLimitReached: false,
    };
  }
}

/**
 * Consumes 1 AI credit if allowed and returns the new state.
 */
export function recordAIEnhancementUsage(): AIRateLimitState {
  const current = getAIRateLimitState();
  if (current.isLimitReached) {
    return current;
  }

  const nextCount = current.count + 1;
  const today = current.date;

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ date: today, count: nextCount })
    );
  } catch {
    // ignore localStorage quota errors
  }

  return {
    date: today,
    count: nextCount,
    maxLimit: DAILY_LIMIT,
    remaining: Math.max(0, DAILY_LIMIT - nextCount),
    isLimitReached: nextCount >= DAILY_LIMIT,
  };
}
