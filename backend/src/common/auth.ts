import { CanActivate, createParamDecorator, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuthUser { id: number; name: string; role: Role; clientId: number | null }

const PUBLIC = 'public';
const ROLES = 'roles';
export const Public = () => SetMetadata(PUBLIC, true);
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user);

/** Guard global: autentica con JWT y autoriza según el rol (RNF03). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwt: JwtService, private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC, targets)) return true;

    const req = ctx.switchToHttp().getRequest();
    const header: string = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) throw new UnauthorizedException('Falta el token de acceso');
    let payload: { sub: number };
    try {
      payload = await this.jwt.verifyAsync(header.slice(7));
    } catch {
      throw new UnauthorizedException('Sesión inválida o vencida');
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, include: { client: true } });
    if (!user || !user.active) throw new UnauthorizedException('Usuario inactivo');
    req.user = { id: user.id, name: user.name, role: user.role, clientId: user.client?.id ?? null } as AuthUser;

    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES, targets);
    if (roles?.length && !roles.includes(user.role)) throw new ForbiddenException('No tienes permiso para esta operación');
    return true;
  }
}
