const prefix = 'tnlg-v1-';
const path = '/';
export function readCookie<T>(key: string): T | null {
  try {
    const item = document.cookie
      .split('; ')
      .find((value) => value.startsWith(prefix + key + '='));
    return item
      ? (JSON.parse(decodeURIComponent(item.slice(item.indexOf('=') + 1))) as T)
      : null;
  } catch {
    return null;
  }
}
export function writeCookie(key: string, value: unknown): void {
  const encoded = encodeURIComponent(JSON.stringify(value));
  if (encoded.length > 3500)
    throw new Error(
      'Lựa chọn quá lớn để lưu bằng cookie. / Preferences are too large for a cookie.',
    );
  document.cookie = `${prefix}${key}=${encoded}; Path=${path}; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  if (!document.cookie.split('; ').includes(`${prefix}${key}=${encoded}`))
    throw new Error(
      'Trình duyệt không cho lưu cookie. / Cookie storage unavailable.',
    );
}
export function clearCookie(key: string): void {
  document.cookie = `${prefix}${key}=; Path=${path}; Max-Age=0; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  if (readCookie(key) !== null)
    throw new Error('Không thể xóa cookie. / Cannot clear cookie.');
}
