import { HttpException, Injectable } from '@nestjs/common';
import { assertNewPassword } from '../../auth/utils/new-password-policy';
import { hashPassword, verifyPassword } from '../../auth/utils/password.util';
import {
  PasswordChangeError,
  passwordChangeUnavailable,
} from './password-change.errors';
import {
  PasswordChangeRepository,
  type PasswordAdmission,
} from './password-change.repository';

@Injectable()
export class PasswordChangeService {
  constructor(private readonly repository: PasswordChangeRepository) {}

  async consume(userId: string): Promise<PasswordAdmission> {
    try {
      return await this.repository.consume(userId);
    } catch {
      // Never log raw persistence errors or retry a possibly committed admission.
      throw passwordChangeUnavailable();
    }
  }

  async change(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    try {
      const user = await this.repository.credentials(userId);
      if (!user?.isActive) {
        throw new PasswordChangeError(
          401,
          'UNAUTHENTICATED',
          'Tu sesión no es válida.',
        );
      }
      if (!(await verifyPassword(currentPassword, user.passwordHash))) {
        throw new PasswordChangeError(
          400,
          'CURRENT_PASSWORD_INVALID',
          'La contraseña actual no es correcta.',
          'currentPassword',
        );
      }
      assertNewPassword(newPassword, 'newPassword');
      if (await verifyPassword(newPassword, user.passwordHash)) {
        throw new PasswordChangeError(
          422,
          'PASSWORD_REUSED',
          'La nueva contraseña debe ser diferente de la actual.',
          'newPassword',
        );
      }
      const hash = await hashPassword(newPassword);
      if (
        !(await this.repository.replacePassword(
          userId,
          user.passwordHash,
          hash,
        ))
      ) {
        throw new PasswordChangeError(
          409,
          'CREDENTIALS_CHANGED',
          'Las credenciales cambiaron. Volvé a ingresar la contraseña actual.',
        );
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw passwordChangeUnavailable();
    }
  }
}
