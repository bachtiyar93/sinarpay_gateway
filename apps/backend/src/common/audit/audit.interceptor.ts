import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';

interface AuditableRequest {
  method: string;
  route?: { path?: string };
  url?: string;
  params: Record<string, string>;
  query: Record<string, unknown>;
  body: unknown;
  user?: { merchantId?: string; userId?: string; role?: string };
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuditableRequest>();
    const method = request.method;
    const path = request.route?.path ?? request.url ?? '';

    return next.handle().pipe(
      tap(() => {
        if (method === 'GET') {
          return;
        }

        const user = request.user;

        const actorType = user?.merchantId
          ? 'MERCHANT'
          : user?.role
            ? 'OPS'
            : 'SYSTEM';

        void this.auditService.logAction({
          actorId: user?.merchantId ?? user?.userId ?? null,
          actorType,
          action: `${method} ${path}`,
          resourceType: path.split('/')[1] || 'unknown',
          resourceId: request.params?.id ?? null,
          metadata: {
            method,
            path,
            query: request.query,
            body: request.body,
          },
        });
      }),
    );
  }
}
