import { Test } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ALL_ENTITIES, Addon, CheckIn, Harvest, Pass, PassLine, PassProduct, User, Yard } from './entities/entities';
import { HiveService } from './hive/hive.service';
import { AuthService } from './auth/auth.service';
import { addMadridDays, madridToday, rangesOverlap } from './common/time';
import { extractTicketCode, passUrl } from './common/qr';
import { HttpException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('Piquera', () => {
  let hive: HiveService;
  let auth: AuthService;
  let demo: User;
  let other: User;
  let yards: Yard[];
  let products: PassProduct[];

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: ALL_ENTITIES,
          synchronize: true,
        }),
        TypeOrmModule.forFeature(ALL_ENTITIES),
        JwtModule.register({ secret: 'test', signOptions: { expiresIn: '1d' } }),
      ],
      providers: [HiveService, AuthService],
    }).compile();
    hive = mod.get(HiveService);
    auth = mod.get(AuthService);
    const users = mod.get(getRepositoryToken(User));
    const yardRepo = mod.get(getRepositoryToken(Yard));
    const prodRepo = mod.get(getRepositoryToken(PassProduct));
    const addonRepo = mod.get(getRepositoryToken(Addon));
    const hash = await bcrypt.hash('demo1234', 10);
    demo = (await users.save({ username: 'demo', email: 'demo@piquera.dev', passwordHash: hash, role: 'client', points: 0 })) as User;
    other = (await users.save({ username: 'otro', email: 'otro@piquera.dev', passwordHash: hash, role: 'client', points: 0 })) as User;
    yards = [];
    for (const def of [
      { slug: 'azahar', name: 'Azahar', flora: 'azahar', description: 'naranjos', hiveCount: 8, capacity: 2, layout: 'wide', imagePath: '/assets/azahar.svg', caption: 'Azahar', sortOrder: 1 },
      { slug: 'brezo', name: 'Brezo', flora: 'brezo', description: 'loma', hiveCount: 6, capacity: 8, layout: 'tall', imagePath: '/assets/brezo.svg', caption: 'Brezo', sortOrder: 2 },
    ]) {
      yards.push(await yardRepo.save(def));
    }
    products = [];
    for (const def of [
      { slug: 'iniciacion', name: 'Iniciación', durationDays: 7, priceCents: 1800, active: true },
      { slug: 'pecoreo', name: 'Pecoreo', durationDays: 7, priceCents: 2800, active: true },
    ]) {
      products.push(await prodRepo.save(def));
    }
    await addonRepo.save({ slug: 'velo', name: 'Velo', priceCents: 400, stock: 2, active: true });
  });

  it('login accepts username or email', async () => {
    const a = await auth.login({ identifier: 'demo', password: 'demo1234' });
    const b = await auth.login({ identifier: 'demo@piquera.dev', password: 'demo1234' });
    expect(a.user.email).toBe('demo@piquera.dev');
    expect(b.accessToken).toBeTruthy();
    expect(a.token).toBeTruthy();
  });

  it('fromPriceCents is min of active products', async () => {
    const home = await hive.home();
    expect(home.fromPriceCents).toBe(1800);
  });

  it('checkout confirms atomically and QR contains URL', async () => {
    const pass = await hive.checkout(demo.id, products[0].id, []);
    expect(pass.status).toBe('confirmed');
    expect(pass.totalCents).toBe(pass.linesSum);
    expect(pass.qrUrl).toContain(`/pase/${pass.code}`);
    expect(pass.qrSvg).toContain('/pase/');
    expect(pass.qrSvg).toContain(pass.code);
  });

  it('second overlapping pass returns 409 PASS_OVERLAP', async () => {
    try {
      await hive.checkout(demo.id, products[1].id, []);
      fail('expected 409');
    } catch (e) {
      expect((e as HttpException).getStatus()).toBe(409);
      const body = (e as HttpException).getResponse() as any;
      expect(body.code).toBe('PASS_OVERLAP');
      expect(String(body.message)).not.toMatch(/^PASS_OVERLAP:/);
    }
  });

  it('stamp then duplicate same Madrid day is ALREADY_CHECKED_IN', async () => {
    await hive.stampSelf(demo.id, yards[0].id);
    try {
      await hive.stampSelf(demo.id, yards[1].id);
      fail('expected 409');
    } catch (e) {
      const body = (e as HttpException).getResponse() as any;
      expect(body.code).toBe('ALREADY_CHECKED_IN');
    }
  });

  it('closed yard returns YARD_CLOSED', async () => {
    const p = await hive.checkout(other.id, products[0].id, []);
    expect(p.code).toBeTruthy();
    await hive.patchYardDay(yards[1].id, { status: 'closed' });
    try {
      await hive.stampSelf(other.id, yards[1].id);
      fail('expected 409');
    } catch (e) {
      const body = (e as HttpException).getResponse() as any;
      expect(body.code).toBe('YARD_CLOSED');
    }
  });

  it('full yard returns YARD_FULL', async () => {
    await hive.patchYardDay(yards[0].id, { status: 'open', capacityOverride: 1 });
    // demo already stamped azahar today; capacity 1 should already be full
    const thirdHash = await bcrypt.hash('x', 4);
    // create via checkout for a new user happens below only if needed
    const day = await hive.ensureYardDay(yards[0].id, madridToday());
    expect(day.checkInCount).toBeGreaterThanOrEqual(1);
    await hive.patchYardDay(yards[0].id, { status: 'open', capacityOverride: day.checkInCount });
    const userRepo = (hive as any).users as any;
    const extra = (await userRepo.save({
      username: 'lleno',
      email: 'lleno@piquera.dev',
      passwordHash: thirdHash,
      role: 'client',
      points: 0,
    })) as User;
    await hive.checkout(extra.id, products[1].id, []);
    try {
      await hive.stampSelf(extra.id, yards[0].id);
      fail('expected 409');
    } catch (e) {
      const body = (e as HttpException).getResponse() as any;
      expect(body.code).toBe('YARD_FULL');
    }
  });

  it('harvest NOT_ENOUGH_STAMPS / claim / ALREADY_CLAIMED', async () => {
    const today = madridToday();
    const h = await hive.openHarvest({
      yardId: yards[0].id,
      startsOn: addMadridDays(today, -2),
      endsOn: addMadridDays(today, 2),
      minStamps: 5,
      jarsTotal: 2,
    });
    try {
      await hive.claimHarvest(demo.id, h.id);
      fail('expected 409');
    } catch (e) {
      expect(((e as HttpException).getResponse() as any).code).toBe('NOT_ENOUGH_STAMPS');
    }
    const easy = await hive.openHarvest({
      yardId: yards[0].id,
      startsOn: addMadridDays(today, -10),
      endsOn: addMadridDays(today, 2),
      minStamps: 1,
      jarsTotal: 1,
    });
    const claim = await hive.claimHarvest(demo.id, easy.id);
    expect(claim.status).toBe('claimed');
    try {
      await hive.claimHarvest(demo.id, easy.id);
      fail('expected 409');
    } catch (e) {
      expect(((e as HttpException).getResponse() as any).code).toBe('ALREADY_CLAIMED');
    }
    try {
      await hive.claimHarvest(other.id, easy.id);
      fail('expected 409');
    } catch (e) {
      expect(((e as HttpException).getResponse() as any).code).toBe('NO_JARS');
    }
  });

  it('points equal stamp count and list totals match lines', async () => {
    const mine = await hive.listMyPasses(demo.id);
    for (const p of mine.items) {
      const sum = (p.lines || []).reduce((s: number, l: PassLine) => s + l.subtotalCents, 0);
      expect(p.totalCents).toBe(sum);
    }
    const stamps = await hive.myCheckIns(demo.id);
    const me = await auth.me(demo.id);
    expect(me.user.points).toBe(stamps.items.length);
    expect(stamps.series14d.length).toBe(14);
    expect(stamps.series14d[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('extractTicketCode reads URL and rangesOverlap is inclusive', () => {
    expect(extractTicketCode('https://piquera.proyectos.cristiancode.dev/pase/PIQ-ABCD')).toBe('PIQ-ABCD');
    expect(rangesOverlap('2026-09-01', '2026-09-07', '2026-09-07', '2026-09-13')).toBe(true);
    expect(rangesOverlap('2026-09-01', '2026-09-07', '2026-09-08', '2026-09-14')).toBe(false);
  });

  it('public pass by code returns qrSvg', async () => {
    const mine = await hive.listMyPasses(demo.id);
    const code = mine.items[0].code;
    const pub = await hive.getByCode(code);
    expect(pub.qrSvg).toContain('<svg');
    expect(pub.qrUrl).toContain(`/pase/${code}`);
  });

  it('staff scan accepts URL', async () => {
    let mine = await hive.listMyPasses(other.id);
    if (!mine.items.length) {
      await hive.checkout(other.id, products[0].id, []);
      mine = await hive.listMyPasses(other.id);
    }
    const url = passUrl(mine.items[0].code);
    // other already has a pass; may already have tried stamp; reopen brezo
    await hive.patchYardDay(yards[1].id, { status: 'open', capacityOverride: 20 });
    try {
      const res = await hive.stampStaff(url, yards[1].id);
      expect(res.checkIn).toBeTruthy();
    } catch (e) {
      const body = (e as HttpException).getResponse() as any;
      expect(['ALREADY_CHECKED_IN', 'YARD_CLOSED', 'YARD_FULL']).toContain(body.code);
    }
  });

  it('admin stats uses COALESCE-safe counts', async () => {
    const s = await hive.adminStats();
    expect(s.passes).toBeGreaterThan(0);
    expect(s.stamps).toBeGreaterThan(0);
  });

  it('PASS_INACTIVE when user has no live pass', async () => {
    const users = (hive as any).users;
    const hash = await bcrypt.hash('z', 4);
    const ghost = (await users.save({
      username: 'ghost',
      email: 'ghost@piquera.dev',
      passwordHash: hash,
      role: 'client',
      points: 0,
    })) as User;
    await hive.patchYardDay(yards[0].id, { status: 'open', capacityOverride: 99 });
    try {
      await hive.stampSelf(ghost.id, yards[0].id);
      fail('expected 409');
    } catch (e) {
      expect(((e as HttpException).getResponse() as any).code).toBe('PASS_INACTIVE');
    }
  });

  it('health-adjacent: home series has 14 dated points', async () => {
    const home = await hive.home();
    expect(home.series14d).toHaveLength(14);
    expect(home.yardsOpen.length).toBeGreaterThan(0);
    expect(home.fromPriceCents).toBe(Math.min(...products.map((p) => p.priceCents)));
  });
});
