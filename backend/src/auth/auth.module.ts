import { Body, Controller, Get, Module, Post } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { IsEmail, IsString } from 'class-validator';
import { AuthUser, CurrentUser, Public } from '../common/auth';
import { AuthService } from './auth.service';

class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}

@Module({
  imports: [JwtModule.register({ global: true, secret: process.env.JWT_SECRET || 'dev-secret', signOptions: { expiresIn: '8h' } })],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
