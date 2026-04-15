// sessionStorage 기반 PIN 인증 — 브라우저 탭/창 닫으면 자동 만료

const key = (eventId: string) => `pin_verified_${eventId}`;

export function setVerified(eventId: string) {
  sessionStorage.setItem(key(eventId), '1');
}

export function isVerified(eventId: string): boolean {
  return sessionStorage.getItem(key(eventId)) === '1';
}

export function clearVerified(eventId: string) {
  sessionStorage.removeItem(key(eventId));
}
