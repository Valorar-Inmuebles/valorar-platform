import { assertNewPassword } from './new-password-policy';
import { UnprocessableEntityException } from '@nestjs/common';

describe('new password policy (Unicode code points / UTF-8 bytes)', () => {
  it.each(['a'.repeat(12), 'a'.repeat(72), '😀'.repeat(18), '  pass phrase  '])(
    'accepts without transforming the input',
    (value) => {
      expect(() => assertNewPassword(value)).not.toThrow();
    },
  );

  it.each([
    'a'.repeat(11),
    'a'.repeat(73),
    '😀'.repeat(11),
    '😀'.repeat(19),
    ' '.repeat(12),
    '\t'.repeat(12),
    null,
    123,
  ])('rejects invalid new credentials', (value) => {
    expect(() => assertNewPassword(value)).toThrow(
      UnprocessableEntityException,
    );
  });
});
