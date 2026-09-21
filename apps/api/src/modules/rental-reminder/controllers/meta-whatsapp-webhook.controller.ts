import {
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import { MetaWhatsAppWebhookService } from '../services/meta-whatsapp-webhook.service';

@Controller('webhooks/communications/meta-whatsapp')
export class MetaWhatsAppWebhookController {
  constructor(private readonly service: MetaWhatsAppWebhookService) {}

  @Get()
  verify(
    @Query('hub.mode') mode: string | undefined,
    @Query('hub.verify_token') token: string | undefined,
    @Query('hub.challenge') challenge: string | undefined,
    @Res() response: Response,
  ) {
    return response
      .status(200)
      .type('text/plain')
      .send(this.service.verifySubscription(mode, token, challenge));
  }

  @Post()
  webhook(
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Req() request: RawBodyRequest<Request>,
  ) {
    const rawBody = request.rawBody ?? Buffer.alloc(0);
    this.service.verifySignature(signature, rawBody);
    return this.service.handle(rawBody);
  }
}
