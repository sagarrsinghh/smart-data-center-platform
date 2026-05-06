import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../../entities/user.entity';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  private sanitizeUser(user: User | null) {
    if (!user) {
      return null;
    }

    const { password: _password, ...safeUser } = user;
    void _password;
    return safeUser;
  }

  async createUser(body: CreateUserDto) {
    const existingUser = await this.userRepo.findOne({
      where: { email: body.email },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);

    const user = await this.userRepo.save({
      email: body.email,
      password: hashedPassword,
      name: body.name,
      role: body.role ?? Role.VIEWER,
    });

    return this.sanitizeUser(user);
  }

  async getAllUsers() {
    const users = await this.userRepo.find({
      order: {
        createdAt: 'DESC',
      },
    });

    return users.map((user) => this.sanitizeUser(user));
  }

  async getUserById(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    return this.sanitizeUser(user);
  }

  async updateUser(id: string, body: UpdateUserDto) {
    await this.userRepo.update(id, body);

    const updatedUser = await this.userRepo.findOne({
      where: { id },
    });

    return {
      message: 'User updated',
      data: this.sanitizeUser(updatedUser),
    };
  }

  async deleteUser(id: string) {
    await this.userRepo.delete(id);

    return {
      message: 'User deleted',
    };
  }
}
