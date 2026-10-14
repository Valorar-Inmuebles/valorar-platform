jest.mock('./password-change.repository', () => ({
  PasswordChangeRepository: class {},
}));
jest.mock('../../auth/utils/password.util', () => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
}));

import { hashPassword, verifyPassword } from '../../auth/utils/password.util';
import { PasswordChangeRepository } from './password-change.repository';
import { PasswordChangeService } from './password-change.service';

describe('PasswordChangeService', () => {
  const repository = {
    consume: jest.fn(),
    credentials: jest.fn(),
    replacePassword: jest.fn(),
  };
  const service = new PasswordChangeService(
    repository as unknown as PasswordChangeRepository,
  );
  const verify = jest.mocked(verifyPassword);
  const hash = jest.mocked(hashPassword);

  beforeEach(() => {
    jest.resetAllMocks();
    repository.credentials.mockResolvedValue({
      isActive: true,
      passwordHash: 'old-hash',
    });
    repository.replacePassword.mockResolvedValue(true);
    hash.mockResolvedValue('new-hash');
  });

  it('preserves exact password bytes and updates with the verified hash', async () => {
    verify.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await service.change('u', ' legacy  ', '  new password  ');
    expect(verify).toHaveBeenNthCalledWith(1, ' legacy  ', 'old-hash');
    expect(hash).toHaveBeenCalledWith('  new password  ');
    expect(repository.replacePassword).toHaveBeenCalledWith(
      'u',
      'old-hash',
      'new-hash',
    );
  });

  it('never hashes or writes for an incorrect current password', async () => {
    verify.mockResolvedValue(false);
    await expect(
      service.change('u', 'wrong', 'new password value'),
    ).rejects.toMatchObject({ response: { code: 'CURRENT_PASSWORD_INVALID' } });
    expect(hash).not.toHaveBeenCalled();
    expect(repository.replacePassword).not.toHaveBeenCalled();
  });

  it('validates new policy after reauthentication', async () => {
    verify.mockResolvedValue(true);
    await expect(
      service.change('u', 'legacy8!', 'short'),
    ).rejects.toMatchObject({
      response: { code: 'PASSWORD_POLICY_VIOLATION' },
    });
    expect(repository.replacePassword).not.toHaveBeenCalled();
  });

  it('rejects reuse based on bcrypt equivalence, not string equality', async () => {
    verify.mockResolvedValue(true);
    await expect(
      service.change('u', 'different legacy input', 'same bcrypt credential'),
    ).rejects.toMatchObject({ response: { code: 'PASSWORD_REUSED' } });
    expect(hash).not.toHaveBeenCalled();
  });

  it('rejects a concurrent replacement', async () => {
    verify.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    repository.replacePassword.mockResolvedValue(false);
    await expect(
      service.change('u', 'old', 'valid new password'),
    ).rejects.toMatchObject({
      response: { code: 'CREDENTIALS_CHANGED', statusCode: 409 },
    });
  });

  it.each(['database unavailable', 'lock timeout', 'commit result unknown'])(
    'fails closed without retry or raw error logging: %s',
    async (reason) => {
      const log = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      repository.consume.mockRejectedValue(
        new Error(`${reason}: SECRET_SENTINEL`),
      );
      try {
        await expect(service.consume('u')).rejects.toMatchObject({
          response: { code: 'PASSWORD_CHANGE_UNAVAILABLE', statusCode: 503 },
        });
        expect(repository.consume).toHaveBeenCalledTimes(1);
        expect(log).not.toHaveBeenCalled();
        expect(repository.credentials).not.toHaveBeenCalled();
      } finally {
        log.mockRestore();
      }
    },
  );

  it('sanitizes credential write errors', async () => {
    verify.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    repository.replacePassword.mockRejectedValue(new Error('SECRET_HASH'));
    await expect(
      service.change('u', 'old', 'valid new password'),
    ).rejects.toMatchObject({
      response: { code: 'PASSWORD_CHANGE_UNAVAILABLE' },
    });
  });
});
