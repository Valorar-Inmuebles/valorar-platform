import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '../../../generated/prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const httpException = this.toHttpException(exception);

    response
      .status(httpException.getStatus())
      .json(httpException.getResponse());
  }

  private toHttpException(
    exception: Prisma.PrismaClientKnownRequestError,
  ): HttpException {
    switch (exception.code) {
      case 'P2002':
        return new ConflictException(
          this.formatUniqueConstraintMessage(exception),
        );
      case 'P2003':
        return new BadRequestException(
          'Invalid reference: related record does not exist',
        );
      case 'P2025':
        return new NotFoundException('Record not found');
      default:
        return new BadRequestException('Database request failed');
    }
  }

  private formatUniqueConstraintMessage(
    exception: Prisma.PrismaClientKnownRequestError,
  ): string {
    const target = exception.meta?.target;

    if (Array.isArray(target) && target.length > 0) {
      const fields = target.join(', ');
      return `A record with the same unique fields already exists (${fields})`;
    }

    return 'A record with the same unique fields already exists';
  }
}
