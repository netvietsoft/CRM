const REFERRAL_STORAGE_KEY = 'referralCode';
const REFERRAL_SAVED_AT_KEY = 'referralCodeSavedAt';
const REFERRAL_COOKIE_KEY = 'pendingReferralCode';
const REFERRAL_TTL_SECONDS = 24 * 60 * 60;
const REFERRAL_TTL_MS = REFERRAL_TTL_SECONDS * 1000;

type SearchParamsLike = {
  get(name: string): string | null;
};

function canUseBrowserStorage() {
  return typeof window !== 'undefined';
}

function getCookieValue(name: string) {
  if (!canUseBrowserStorage()) return '';

  const escapedName = name.replace(/[-.]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

export function persistReferralCode(referralCode: string) {
  if (!canUseBrowserStorage()) return;

  const normalizedCode = referralCode.trim();
  if (!normalizedCode) return;

  localStorage.setItem(REFERRAL_STORAGE_KEY, normalizedCode);
  localStorage.setItem(REFERRAL_SAVED_AT_KEY, Date.now().toString());
  document.cookie = `${REFERRAL_COOKIE_KEY}=${encodeURIComponent(normalizedCode)}; path=/; max-age=${REFERRAL_TTL_SECONDS}; samesite=lax`;
}

export function getSavedReferralCode() {
  if (!canUseBrowserStorage()) return '';

  const savedCode = localStorage.getItem(REFERRAL_STORAGE_KEY)?.trim();
  if (!savedCode) {
    return getCookieValue(REFERRAL_COOKIE_KEY);
  }

  const savedAtRaw = localStorage.getItem(REFERRAL_SAVED_AT_KEY);
  const savedAt = savedAtRaw ? Number(savedAtRaw) : NaN;

  if (!Number.isFinite(savedAt) || Date.now() - savedAt > REFERRAL_TTL_MS) {
    clearSavedReferralCode();
    return '';
  }

  return savedCode;
}

export function clearSavedReferralCode() {
  if (!canUseBrowserStorage()) return;

  localStorage.removeItem(REFERRAL_STORAGE_KEY);
  localStorage.removeItem(REFERRAL_SAVED_AT_KEY);
  document.cookie = `${REFERRAL_COOKIE_KEY}=; path=/; max-age=0; samesite=lax`;
}

export function getReferralCodeFromSearchParams(searchParams: SearchParamsLike) {
  const directRefCode = searchParams.get('ref')?.trim();
  if (directRefCode) return directRefCode;

  const returnTo = searchParams.get('returnTo')?.trim();
  if (!returnTo || !canUseBrowserStorage()) return '';

  try {
    const returnToUrl = new URL(returnTo, window.location.origin);
    return returnToUrl.searchParams.get('ref')?.trim() || '';
  } catch {
    return '';
  }
}
