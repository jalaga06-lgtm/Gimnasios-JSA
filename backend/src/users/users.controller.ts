import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { AuthUser, CurrentUser, Roles } from '../common/auth';
import { UsersService } from './users.service';

export class CreateUserDto {
  @IsString() name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsEnum(Role) role: Role;
  @IsOptional() @IsInt() clientId?: number;
}

export class UpdateUserDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MinLength(8) password?: string;
  @IsOptional() @IsEnum(Role) role?: Role;
  @IsOptional() @IsInt() clientId?: number;
}

/** RF01: registrar, consultar, modificar y desactivar usuarios. */
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get() list() { return this.users.list(); }
  @Post() create(@Body() dto: CreateUserDto, @CurrentUser() u: AuthUser) { return this.users.create(dto, u); }
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto, @CurrentUser() u: AuthUser) { return this.users.update(id, dto, u); }
  @Patch(':id/deactivate') deactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.users.setActive(id, false, u); }
  @Patch(':id/activate') activate(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.users.setActive(id, true, u); }
}
