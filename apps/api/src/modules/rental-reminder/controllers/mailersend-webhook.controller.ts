import { Controller, Headers, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { MailerSendWebhookService } from '../services/mailersend-webhook.service';

@Controller('webhooks/communications/mailersend')
export class MailerSendWebhookController {
  constructor(private readonly service: MailerSendWebhookService) {}

  @Post()
  webhook(
    @Headers('signature') signature: string | undefined,
    @Req() request: RawBodyRequest<Request>,
  ) {
    const rawBody = request.rawBody ?? Buffer.alloc(0);
    this.service.verify(signature, rawBody);
    return this.service.handle(rawBody);
  }
}
