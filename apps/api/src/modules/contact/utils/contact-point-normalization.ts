import { BadRequestException } from '@nestjs/common';
import { ContactPointType } from '../../../../generated/prisma/client';

export function normalizeContactPointValue(
  type: ContactPointType,
  value: string,
): string {
  const trimmed = value.trim();

  if (type === ContactPointType.EMAIL) {
    const normalized = trimmed.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new BadRequestException('Contact email is invalid');
    }
    return normalized;
  }

  const hasLeadingPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    throw new BadRequestException('Contact phone is invalid');
  }

  return `${hasLeadingPlus ? '+' : ''}${digits}`;
}
