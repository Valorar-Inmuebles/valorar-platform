import { UnprocessableEntityException } from '@nestjs/common';

export function assertNewPassword(
  password: unknown,
  field = 'password',
): asserts password is string {
  if (
    typeof password !== 'string' ||
    [...password].length < 12 ||
    Buffer.byteLength(password, 'utf8') > 72 ||
    !/\S/u.test(password)
  ) {
    throw new UnprocessableEntityException({
      statusCode: 422,
      code: 'PASSWORD_POLICY_VIOLATION',
      message:
        'Usá al menos 12 caracteres, hasta 72 bytes UTF-8 y no sólo espacios.',
      field,
    });
  }
}
