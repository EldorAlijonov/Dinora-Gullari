export function getErrorMessage(error, fallback = "Xatolik yuz berdi. Qayta urinib ko'ring") {
  const status = error?.status || error?.response?.status || error?.originalStatus;
  const data = error?.data || error?.response?.data;
  const message = data?.message || error?.message;

  if (status === 401) return 'Sessiya tugagan. Qayta login qiling';
  if (status === 403) return 'Bu amal uchun ruxsat yo‘q';
  if (status === 404) return 'Ma’lumot topilmadi';
  if (status === 409) return 'Bu amal boshqa ma’lumot bilan zid kelmoqda';
  if (status === 422 || status === 400) {
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
    return 'Kiritilgan ma’lumotlarni tekshiring';
  }
  if (status >= 500) {
    const requestId = data?.requestId ? ` ID: ${data.requestId}` : '';
    return `Serverda xatolik yuz berdi.${requestId}`;
  }
  if (error?.name === 'TypeError' || error?.status === 'FETCH_ERROR') {
    return 'Server bilan aloqa yo‘q. Internet yoki server holatini tekshiring';
  }

  if (typeof message === 'string' && message && message !== 'Rejected') return message;
  return fallback;
}
