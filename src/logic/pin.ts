/** Snooze PIN rules (DECISIONS D-02). Moved unchanged from the old SetupScreen. */
export function validateSnoozePin(pin: string): { isValid: boolean; error?: string } {
  if (!/^\d{10}$/.test(pin)) {
    return { isValid: false, error: 'PIN must be exactly 10 digits.' };
  }
  if (/^(\d)\1{9}$/.test(pin)) {
    return { isValid: false, error: 'Avoid using the same digit repeated 10 times.' };
  }
  const sequentialAsc = '01234567890123456789';
  const sequentialDesc = '98765432109876543210';
  if (sequentialAsc.includes(pin) || sequentialDesc.includes(pin)) {
    return { isValid: false, error: 'Avoid simple sequential numbers.' };
  }
  const pattern2 = pin.slice(0, 2);
  if (pattern2.repeat(5) === pin) {
    return { isValid: false, error: 'Avoid simple repeating patterns.' };
  }
  const uniqueDigits = new Set(pin.split('')).size;
  if (uniqueDigits < 4) {
    return { isValid: false, error: `Use at least 4 different digits (currently ${uniqueDigits}).` };
  }
  return { isValid: true };
}
