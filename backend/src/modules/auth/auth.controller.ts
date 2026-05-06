import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtGuard } from './guards/jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // REGISTER
  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  // LOGIN
  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  // PROFILE
  @Get('profile')
  @UseGuards(JwtGuard)
  profile(@Req() req) {
    return this.authService.profile(req.user);
  }

  @Patch('profile')
  @UseGuards(JwtGuard)
  updateProfile(@Req() req, @Body() body: UpdateProfileDto) {
    return this.authService.updateProfile(req.user, body);
  }

  // LOGOUT
  @Post('logout')
  @UseGuards(JwtGuard)
  logout() {
    return {
      success: true,
      message: 'Logout successful',
    };
  }

  // REFRESH TOKEN
  @Post('refresh-token')
  @UseGuards(JwtGuard)
  refresh(@Req() req) {
    return this.authService.refreshToken(req.user);
  }
}
