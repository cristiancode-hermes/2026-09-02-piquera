import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { CheckIn, User } from '../entities/entities';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(CheckIn) private readonly checkIns: Repository<CheckIn>,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: { username: string; email: string; password: string }) {
    const exists = await this.users.findOne({
      where: [{ email: dto.email.toLowerCase() }, { username: dto.username.toLowerCase() }],
    });
    if (exists) throw new ConflictException('Usuario o email ya registrado');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = (await this.users.save({
      username: dto.username.toLowerCase().trim(),
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      role: 'client',
      points: 0,
    } as any)) as User;
    return this.tokenResponse(user);
  }

  async login(dto: { identifier: string; password: string }) {
    const id = dto.identifier.trim().toLowerCase();
    const user = await this.users.findOne({
      where: [{ email: id }, { username: id }],
    });
    if (!user) throw new UnauthorizedException('Usuario o contraseña no valen.');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Usuario o contraseña no valen.');
    return this.tokenResponse(user);
  }

  async me(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return { user: await this.toAuthUser(user) };
  }

  private async tokenResponse(user: User) {
    const payload = { sub: user.id, role: user.role };
    const accessToken = this.jwt.sign(payload);
    return {
      accessToken,
      token: accessToken,
      user: await this.toAuthUser(user),
    };
  }

  async toAuthUser(user: User) {
    const stamps = await this.checkIns.count({ where: { userId: user.id, status: 'checked_in' } });
    if (user.points !== stamps) {
      user.points = stamps;
      await this.users.save(user as any);
    }
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      points: stamps,
    };
  }
}
