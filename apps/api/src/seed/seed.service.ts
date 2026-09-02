import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  Addon, CheckIn, Harvest, HarvestClaim, Pass, PassLine, PassProduct, User, Yard, YardDay,
} from '../entities/entities';
import { HiveService } from '../hive/hive.service';
import { addMadridDays, madridToday } from '../common/time';
import { buildPassQrSvg, makeCode, passUrl } from '../common/qr';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Yard) private readonly yards: Repository<Yard>,
    @InjectRepository(PassProduct) private readonly products: Repository<PassProduct>,
    @InjectRepository(Addon) private readonly addons: Repository<Addon>,
    @InjectRepository(Pass) private readonly passes: Repository<Pass>,
    @InjectRepository(PassLine) private readonly lines: Repository<PassLine>,
    @InjectRepository(YardDay) private readonly days: Repository<YardDay>,
    @InjectRepository(CheckIn) private readonly checkIns: Repository<CheckIn>,
    @InjectRepository(Harvest) private readonly harvests: Repository<Harvest>,
    @InjectRepository(HarvestClaim) private readonly claims: Repository<HarvestClaim>,
    private readonly hive: HiveService,
  ) {}

  async onModuleInit() {
    if (process.env.SEED_DB === 'false') return;
    await this.seed();
  }

  async seed() {
    if (await this.users.count()) {
      await this.hive.seedCalendarIfNeeded();
      return { ok: true, skipped: true };
    }

    const hash = await bcrypt.hash('demo1234', 10);
    const demo = (await this.users.save({
      username: 'demo',
      email: 'demo@piquera.dev',
      passwordHash: hash,
      role: 'client',
      points: 0,
    } as any)) as User;
    await this.users.save({
      username: 'staff',
      email: 'staff@piquera.dev',
      passwordHash: hash,
      role: 'staff',
      points: 0,
    } as any);
    await this.users.save({
      username: 'admin',
      email: 'admin@piquera.dev',
      passwordHash: hash,
      role: 'admin',
      points: 0,
    } as any);

    const yardDefs = [
      {
        slug: 'azahar',
        name: 'Patio del azahar',
        flora: 'azahar',
        description: 'Colmenas junto a los naranjos del huerto comunal. El néctar baja dulce a finales de abril.',
        hiveCount: 8,
        capacity: 12,
        layout: 'wide' as const,
        imagePath: '/assets/azahar.svg',
        caption: 'Patio del azahar — naranjos y ocho colmenas',
        sortOrder: 1,
      },
      {
        slug: 'brezo',
        name: 'Loma del brezo',
        flora: 'brezo',
        description: 'Ladera seca de brezo. Miel oscura, aforo más corto cuando sopla poniente.',
        hiveCount: 6,
        capacity: 8,
        layout: 'tall' as const,
        imagePath: '/assets/brezo.svg',
        caption: 'Loma del brezo — miel oscura de ladera',
        sortOrder: 2,
      },
      {
        slug: 'romero',
        name: 'Bancal de romero',
        flora: 'romero',
        description: 'Bancales estrechos. El romero abre cuando el resto del colmenar aún espera.',
        hiveCount: 5,
        capacity: 10,
        layout: 'minimal' as const,
        imagePath: '/assets/romero.svg',
        caption: 'Bancal de romero — primer néctar del año',
        sortOrder: 3,
      },
      {
        slug: 'tomillar',
        name: 'Tomillar bajo',
        flora: 'tomillar',
        description: 'Tomillo silvestre al borde del camino. Patio pequeño, aroma fuerte.',
        hiveCount: 4,
        capacity: 6,
        layout: 'framed' as const,
        imagePath: '/assets/tomillar.svg',
        caption: 'Tomillar bajo — borde de camino',
        sortOrder: 4,
      },
    ];
    const yards: Yard[] = [];
    for (const def of yardDefs) {
      yards.push((await this.yards.save(def as any)) as Yard);
    }

    const productDefs = [
      { slug: 'iniciacion', name: 'Bono iniciación', durationDays: 7, priceCents: 1800, active: true },
      { slug: 'pecoreo', name: 'Bono pecoreo', durationDays: 7, priceCents: 2800, active: true },
      { slug: 'trashumante', name: 'Bono trashumante', durationDays: 7, priceCents: 4200, active: true },
    ];
    const products: PassProduct[] = [];
    for (const def of productDefs) {
      products.push((await this.products.save(def as any)) as PassProduct);
    }

    const addonDefs = [
      { slug: 'velo', name: 'Préstamo de velo', priceCents: 400, stock: 12, active: true },
      { slug: 'ahumador', name: 'Demo de ahumador', priceCents: 600, stock: 8, active: true },
      { slug: 'tarro', name: 'Tarro extra vacío', priceCents: 350, stock: 20, active: true },
    ];
    for (const def of addonDefs) {
      await this.addons.save(def as any);
    }

    await this.hive.seedCalendarIfNeeded();

    const today = madridToday();
    const startsOn = addMadridDays(today, -3);
    const endsOn = addMadridDays(startsOn, 6);
    const product = products[1];
    let code = 'PIQ-DEMO1';
    const qrUrl = passUrl(code);
    const qrSvg = await buildPassQrSvg(qrUrl, code);
    const pass = (await this.passes.save({
      userId: demo.id,
      productId: product.id,
      code,
      status: 'confirmed',
      startsOn,
      endsOn,
      totalCents: product.priceCents,
      qrSvg,
      qrUrl,
    } as any)) as Pass;
    await this.lines.save({
      passId: pass.id,
      kind: 'product',
      refId: product.id,
      label: product.name,
      qty: 1,
      unitCents: product.priceCents,
      subtotalCents: product.priceCents,
    } as any);

    const azahar = yards[0];
    for (let i = 3; i >= 1; i--) {
      const onDate = addMadridDays(today, -i);
      const day = await this.hive.ensureYardDay(azahar.id, onDate);
      await this.checkIns.save({
        userId: demo.id,
        passId: pass.id,
        yardId: azahar.id,
        yardDayId: day.id,
        onDate,
        status: 'checked_in',
        stampedAt: new Date(),
      } as any);
      day.checkInCount += 1;
      await this.days.save(day as any);
    }

    const harvest = (await this.harvests.save({
      yardId: azahar.id,
      startsOn: addMadridDays(today, -4),
      endsOn: addMadridDays(today, 6),
      minStamps: 2,
      jarsTotal: 8,
      jarsRemaining: 8,
      status: 'open',
    } as any)) as Harvest;
    void harvest;
    void makeCode;

    const stamps = await this.checkIns.count({ where: { userId: demo.id } });
    demo.points = stamps;
    await this.users.save(demo as any);

    return { ok: true, skipped: false };
  }
}
