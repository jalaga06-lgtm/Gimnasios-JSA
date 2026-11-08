import { Body, Controller, ForbiddenException, Get, Module, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { AuthUser, CurrentUser, Roles } from '../common/auth';
import { MembershipsService } from './memberships.service';

class PlanDto {
  @IsString() name: string;
  @IsInt() @Min(1) durationDays: number;
  @IsInt() @Min(0) price: number;
  @IsOptional() @IsString() conditions?: string;
}
class UpdatePlanDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsInt() @Min(1) durationDays?: number;
  @IsOptional() @IsInt() @Min(0) price?: number;
  @IsOptional() @IsString() conditions?: string;
}
class RegisterDto {
  @IsInt() clientId: number;
  @IsInt() planId: number;
}

@Controller('plans')
export class PlansController {
  constructor(private svc: MembershipsService) {}
  @Get() list() { return this.svc.plans(); }
  @Roles(Role.ADMIN) @Post() create(@Body() dto: PlanDto, @CurrentUser() u: AuthUser) { return this.svc.savePlan(dto, u); }
  @Roles(Role.ADMIN) @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePlanDto, @CurrentUser() u: AuthUser) { return this.svc.savePlan(dto, u, id); }
}

@Controller('memberships')
export class MembershipsController {
  constructor(private svc: MembershipsService) {}

  @Roles(Role.ADMIN, Role.RECEPCIONISTA) @Get()
  list() { return this.svc.list(); }

  /** El cliente consulta solo sus propias membresías. */
  @Roles(Role.CLIENTE) @Get('me')
  mine(@CurrentUser() u: AuthUser) {
    if (!u.clientId) throw new ForbiddenException('Tu usuario no está vinculado a un cliente');
    return this.svc.list(u.clientId);
  }

  @Roles(Role.ADMIN, Role.RECEPCIONISTA) @Post()
  register(@Body() dto: RegisterDto, @CurrentUser() u: AuthUser) { return this.svc.register(dto.clientId, dto.planId, u); }

  @Roles(Role.ADMIN, Role.RECEPCIONISTA) @Patch(':id/suspend')
  suspend(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.suspend(id, u); }

  @Roles(Role.ADMIN, Role.RECEPCIONISTA) @Patch(':id/activate')
  activate(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.activate(id, u); }

  @Roles(Role.ADMIN, Role.RECEPCIONISTA) @Patch(':id/renew')
  renew(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.renew(id, u); }
}

@Module({ controllers: [PlansController, MembershipsController], providers: [MembershipsService] })
export class MembershipsModule {}
