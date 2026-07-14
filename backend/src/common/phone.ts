import { BadRequestException } from '@nestjs/common';

export function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  const normalized = phone.trim().startsWith('+')
    ? `+${digits}`
    : digits.length <= 9
      ? `+998${digits}`
      : `+${digits}`;
  if (!/^\+\d{7,15}$/.test(normalized)) {
    throw new BadRequestException('Phone must be in international format');
  }
  return normalized;
}
