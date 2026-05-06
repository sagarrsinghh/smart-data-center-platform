import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { User } from '../../entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '../../common/enums/role.enum';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  // ======================
  // REGISTER
  // ======================
  async register(body: RegisterDto) {
    const existingUser = await this.userRepo.findOne({
      where: { email: body.email },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const usersCount = await this.userRepo.count();
    const hashedPassword = await bcrypt.hash(body.password, 10);
    const assignedRole = usersCount === 0 ? Role.SUPER_ADMIN : Role.VIEWER;

    const user = await this.userRepo.save({
      name: body.name,
      email: body.email,
      password: hashedPassword,
      role: assignedRole,
    });

    return {
      success: true,
      message:
        assignedRole === Role.SUPER_ADMIN
          ? 'Super admin account created successfully'
          : 'Viewer account registered successfully',
      data: {
        ...this.sanitizeUser(user),
      },
    };
  }

  // ======================
  // LOGIN
  // ======================
  async login(body: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: body.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(body.password, user.password);

    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        user: {
          ...this.sanitizeUser(user),
        },
      },
    };
  }

  // ======================
  // PROFILE
  // ======================
  async profile(userPayload: any) {
    const user = await this.userRepo.findOne({
      where: { id: userPayload.id },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return {
      success: true,
      data: {
        ...this.sanitizeUser(user),
      },
    };
  }

  async updateProfile(userPayload: any, body: UpdateProfileDto) {
    const user = await this.userRepo.findOne({
      where: { id: userPayload.id },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (body.email && body.email !== user.email) {
      const existingUser = await this.userRepo.findOne({
        where: { email: body.email },
      });

      if (existingUser && existingUser.id !== user.id) {
        throw new BadRequestException('Email is already in use');
      }

      user.email = body.email;
    }

    if (typeof body.name === 'string') {
      user.name = body.name;
    }

    if (body.newPassword) {
      if (!body.currentPassword) {
        throw new BadRequestException(
          'Current password is required to set a new password',
        );
      }

      const passwordMatch = await bcrypt.compare(
        body.currentPassword,
        user.password,
      );

      if (!passwordMatch) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      user.password = await bcrypt.hash(body.newPassword, 10);
    }

    const updatedUser = await this.userRepo.save(user);

    return {
      success: true,
      message: 'Profile updated successfully',
      data: this.sanitizeUser(updatedUser),
    };
  }

  // ======================
  // REFRESH TOKEN
  // ======================
  async refreshToken(user: any) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      success: true,
      accessToken,
    };
  }
}
