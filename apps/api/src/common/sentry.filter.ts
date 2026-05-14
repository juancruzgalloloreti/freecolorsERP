import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';

@Catch()
export class SentryFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
      Sentry.captureException(exception);
    }
    super.catch(exception, host);
  }
}
