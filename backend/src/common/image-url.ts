import { BadRequestException } from '@nestjs/common';

const allowedImageMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const maxInlineImageBytes = 1_500_000;

export function sanitizeImageUrl(value: string | undefined, fieldName: string) {
  if (value === undefined) return undefined;
  const imageUrl = value.trim();
  if (!imageUrl) return '';

  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;

  const match = /^data:([^;,]+);base64,([a-z0-9+/=\s]+)$/i.exec(imageUrl);
  if (!match) {
    throw new BadRequestException(`${fieldName} rasm URL yoki base64 image formatida bo'lishi kerak`);
  }

  const mimeType = match[1].toLowerCase();
  if (!allowedImageMimeTypes.has(mimeType)) {
    throw new BadRequestException(`${fieldName} faqat png, jpeg, webp yoki gif bo'lishi mumkin`);
  }

  const base64 = match[2].replace(/\s/g, '');
  const bytes = Math.floor((base64.length * 3) / 4);
  if (bytes > maxInlineImageBytes) {
    throw new BadRequestException(`${fieldName} hajmi 1.5MB dan oshmasligi kerak`);
  }

  return `data:${mimeType};base64,${base64}`;
}
