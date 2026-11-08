import { Controller, Get, Global, Module, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/auth';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private audit: AuditService) {}

  @Roles(Role.ADMIN)
  @Get()
  list(@Query('limit') limit?: string) {
    return this.audit.list(limit ? Math.min(Number(limit) || 100, 500) : 100);
  }
}

@Global()
@Module({ controllers: [AuditController], providers: [AuditService], exports: [AuditService] })
export class AuditModule {}
