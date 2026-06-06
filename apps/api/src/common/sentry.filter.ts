import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';

@Catch()
export class SentryFilter extends BaseExceptionFilter {
  constructor(adapter?: any) {
    super(adapter);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (!response || response.headersSent) {
      console.error('SentryFilter: response unavailable', exception);
      return;
    }

    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
      Sentry.captureException(exception);
    }

    try {
      super.catch(exception, host);
    } catch (inner) {
      console.error('SentryFilter: error sending error response', inner, 'original exception:', exception);
      if (response && !response.headersSent) {
        response.status(500).json({
          statusCode: 500,
          message: 'Error interno del servidor',
        });
      }
    }
  }
}
