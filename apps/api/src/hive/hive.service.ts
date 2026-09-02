import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  Addon, CheckIn, Harvest, HarvestClaim, Pass, PassLine, PassProduct, User, Yard, YardDay,
} from '../entities/entities';
import { withLock } from '../common/mutex';
import { conflict } from '../common/http-conflict';
import { addMadridDays, formatEsDate, hoursUntilMidnightMadrid, madridToday, rangesOverlap } from '../common/time';
import { buildPassQrSvg, extractTicketCode, makeCode, passUrl } from '../common/qr';

@Injectable()
export class HiveService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Yard) private readonly yards: Repository<Yard>,
    @InjectRepository(YardDay) private readonly yardDays: Repository<YardDay>,
    @InjectRepository(PassProduct) private readonly products: Repository<PassProduct>,
    @InjectRepository(Addon) private readonly addons: Repository<Addon>,
    @InjectRepository(Pass) private readonly passes: Repository<Pass>,
    @InjectRepository(PassLine) private readonly lines: Repository<PassLine>,
    @InjectRepository(CheckIn) private readonly checkIns: Repository<CheckIn>,
    @InjectRepository(Harvest) private readonly harvests: Repository<Harvest>,
    @InjectRepository(HarvestClaim) private readonly claims: Repository<HarvestClaim>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async fromPriceCents(): Promise<number> {
    const items = await this.products.find({ where: { active: true } });
    if (!items.length) return 0;
    return Math.min(...items.map((p) => p.priceCents));
  }

  async home() {
    const today = madridToday();
    const fromPriceCents = await this.fromPriceCents();
    const yards = await this.yards.find({ order: { sortOrder: 'ASC' } });
    const yardsOpen: { slug: string; name: string; status: string; remaining: number }[] = [];
    for (const y of yards) {
      const day = await this.ensureYardDay(y.id, today);
      const cap = day.capacityOverride ?? y.capacity;
      yardsOpen.push({
        slug: y.slug,
        name: y.name,
        status: day.status,
        remaining: Math.max(0, cap - day.checkInCount),
      });
    }
    const harvest = await this.currentHarvest();
    const series = await this.series14d();
    const nectar = series.reduce((s, p) => s + p.count, 0);
    return { nectar, yardsOpen, harvest, fromPriceCents, series14d: series };
  }

  async listYards() {
    const today = madridToday();
    const fromPriceCents = await this.fromPriceCents();
    const yards = await this.yards.find({ order: { sortOrder: 'ASC' } });
    const items = [];
    for (const y of yards) {
      const day = await this.ensureYardDay(y.id, today);
      items.push({ ...y, fromPriceCents, todayStatus: day.status, todayCapacity: day.capacityOverride ?? y.capacity, todayCount: day.checkInCount });
    }
    return { items };
  }

  async getYard(slug: string) {
    const yard = await this.yards.findOne({ where: { slug } });
    if (!yard) throw new NotFoundException('Ese patio no está en el colmenar');
    const today = await this.ensureYardDay(yard.id, madridToday());
    const fromPriceCents = await this.fromPriceCents();
    return { ...yard, fromPriceCents, today };
  }

  listProducts() {
    return this.products.find({ where: { active: true }, order: { priceCents: 'ASC' } }).then((items) => ({ items }));
  }

  listAddons() {
    return this.addons.find({ where: { active: true } }).then((items) => ({ items }));
  }

  checkout(userId: string, productId: string, addonIds: string[]) {
    return withLock(() => this.checkoutLocked(userId, productId, addonIds || []));
  }

  private async checkoutLocked(userId: string, productId: string, addonIds: string[]) {
    const product = await this.products.findOne({ where: { id: productId, active: true } });
    if (!product) throw new NotFoundException('Ese bono no existe');
    const today = madridToday();
    const startsOn = today;
    const endsOn = addMadridDays(startsOn, Math.max(1, product.durationDays) - 1);

    const existing = await this.passes.find({ where: { userId, status: 'confirmed' } });
    const overlap = existing.find((p) => rangesOverlap(startsOn, endsOn, p.startsOn, p.endsOn));
    if (overlap) {
      conflict('PASS_OVERLAP', `Ya tienes un bono activo hasta el ${formatEsDate(overlap.endsOn)}.`);
    }

    const uniqueIds = [...new Set(addonIds.filter(Boolean))];
    const extras = uniqueIds.length
      ? await this.addons.find({ where: { id: In(uniqueIds), active: true } })
      : [];
    for (const a of extras) {
      if (a.stock < 1) conflict('NO_STOCK', `No quedan unidades de ${a.name}.`);
    }

    const lineDefs: { kind: 'product' | 'addon'; refId: string; label: string; qty: number; unitCents: number; subtotalCents: number }[] = [
      { kind: 'product', refId: product.id, label: product.name, qty: 1, unitCents: product.priceCents, subtotalCents: product.priceCents },
    ];
    for (const a of extras) {
      lineDefs.push({ kind: 'addon', refId: a.id, label: a.name, qty: 1, unitCents: a.priceCents, subtotalCents: a.priceCents });
    }
    const totalCents = lineDefs.reduce((s, l) => s + l.subtotalCents, 0);

    let code = makeCode();
    while (await this.passes.findOne({ where: { code } })) code = makeCode();
    const qrUrl = passUrl(code);
    const qrSvg = await buildPassQrSvg(qrUrl, code);

    const saved = (await this.passes.save({
      userId,
      productId: product.id,
      code,
      status: 'confirmed',
      startsOn,
      endsOn,
      totalCents,
      qrSvg,
      qrUrl,
    } as any)) as Pass;

    for (const def of lineDefs) {
      await this.lines.save({
        passId: saved.id,
        kind: def.kind,
        refId: def.refId,
        label: def.label,
        qty: def.qty,
        unitCents: def.unitCents,
        subtotalCents: def.subtotalCents,
      } as any);
    }
    for (const a of extras) {
      a.stock -= 1;
      await this.addons.save(a as any);
    }
    return this.serializePass(await this.loadPass(saved.id));
  }

  async listMyPasses(userId: string) {
    const rows = await this.passes.find({
      where: { userId },
      relations: { lines: true, checkIns: true },
      order: { createdAt: 'DESC' },
    });
    return { items: rows.map((p) => this.serializePass(p)) };
  }

  async getMyPass(userId: string, code: string) {
    const pass = await this.passes.findOne({
      where: { code: String(code || '').trim().toUpperCase(), userId },
      relations: { lines: true, checkIns: true },
    });
    if (!pass) throw new NotFoundException('Pase no encontrado');
    return this.serializePass(pass);
  }

  async getByCode(code: string) {
    const pass = await this.passes.findOne({
      where: { code: String(code || '').trim().toUpperCase() },
      relations: { lines: true, checkIns: true },
    });
    if (!pass) throw new NotFoundException('Pase no encontrado');
    return this.serializePass(pass);
  }

  async cancelPass(userId: string, id: string) {
    const pass = await this.loadPass(id);
    if (!pass || pass.userId !== userId) throw new NotFoundException('Pase no encontrado');
    if (pass.status !== 'confirmed') conflict('PASS_ALREADY_USED', 'Este bono ya no se puede cancelar.');
    const stamps = (pass.checkIns || []).filter((c) => c.status === 'checked_in').length;
    const hours = hoursUntilMidnightMadrid(pass.startsOn);
    if (stamps > 0 || hours < 24) {
      conflict('PASS_ALREADY_USED', 'Este bono ya no se puede cancelar: hay un sello o faltan menos de 24 h.');
    }
    pass.status = 'cancelled';
    await this.passes.save(pass as any);
    return this.serializePass(await this.loadPass(pass.id));
  }

  stampSelf(userId: string, yardId: string) {
    return withLock(() => this.stampLocked(userId, yardId, undefined));
  }

  async stampStaff(codeOrUrl: string, yardId?: string) {
    const code = extractTicketCode(codeOrUrl);
    const pass = await this.passes.findOne({ where: { code } });
    if (!pass) throw new NotFoundException('Pase no encontrado');
    const yid = yardId || (await this.yards.find({ order: { sortOrder: 'ASC' } }))[0]?.id;
    if (!yid) throw new NotFoundException('No hay patios');
    const checkIn = await withLock(() => this.stampLocked(pass.userId, yid, pass.id));
    return { pass: this.serializePass(await this.loadPass(pass.id)), checkIn };
  }

  private async stampLocked(userId: string, yardId: string, passId?: string) {
    const today = madridToday();
    const already = await this.checkIns.findOne({ where: { userId, onDate: today } });
    if (already) conflict('ALREADY_CHECKED_IN', 'Ya sellaste hoy en el colmenar.');

    const yard = await this.yards.findOne({ where: { id: yardId } });
    if (!yard) throw new NotFoundException('Patio no encontrado');
    const day = await this.ensureYardDay(yard.id, today);
    if (day.status === 'closed') conflict('YARD_CLOSED', 'Hoy ese patio está cerrado.');
    const cap = day.capacityOverride ?? yard.capacity;
    if (day.checkInCount >= cap) conflict('YARD_FULL', 'El patio está lleno hoy.');

    let pass: Pass | null = null;
    if (passId) {
      pass = await this.passes.findOne({ where: { id: passId, userId } });
    } else {
      const list = await this.passes.find({ where: { userId, status: 'confirmed' } });
      pass = list.find((p) => p.startsOn <= today && p.endsOn >= today) || null;
    }
    if (!pass || pass.status !== 'confirmed' || pass.startsOn > today || pass.endsOn < today) {
      conflict('PASS_INACTIVE', 'No tienes un bono activo para hoy.');
    }

    const saved = (await this.checkIns.save({
      userId,
      passId: pass.id,
      yardId: yard.id,
      yardDayId: day.id,
      onDate: today,
      status: 'checked_in',
      stampedAt: new Date(),
    } as any)) as CheckIn;
    day.checkInCount += 1;
    await this.yardDays.save(day as any);
    const stamps = await this.checkIns.count({ where: { userId, status: 'checked_in' } });
    await this.users.save({ id: userId, points: stamps } as any);
    return saved;
  }

  async myCheckIns(userId: string) {
    const items = await this.checkIns.find({
      where: { userId },
      relations: { yard: true },
      order: { onDate: 'DESC' },
    });
    return { items, series14d: await this.series14d(userId) };
  }

  async currentHarvest() {
    const today = madridToday();
    const rows = await this.harvests.find({ where: { status: 'open' }, relations: { yard: true } });
    const h = rows.find((r) => r.startsOn <= today && r.endsOn >= today) || null;
    if (!h) return null;
    return this.serializeHarvest(h);
  }

  claimHarvest(userId: string, harvestId: string) {
    return withLock(() => this.claimLocked(userId, harvestId));
  }

  private async claimLocked(userId: string, harvestId: string) {
    const harvest = await this.harvests.findOne({ where: { id: harvestId } });
    if (!harvest || harvest.status !== 'open') throw new NotFoundException('No hay mielada abierta');
    const today = madridToday();
    if (harvest.startsOn > today || harvest.endsOn < today) {
      conflict('NOT_ENOUGH_STAMPS', 'La mielada no está abierta hoy.');
    }
    const existing = await this.claims.findOne({ where: { userId, harvestId } });
    if (existing) conflict('ALREADY_CLAIMED', 'Ya reclamaste un tarro de esta mielada.');
    if (harvest.jarsRemaining < 1) conflict('NO_JARS', 'No quedan tarros en esta mielada.');

    const stamps = await this.checkIns.count({
      where: { userId, status: 'checked_in' },
    });
    const inWindow = await this.checkIns
      .createQueryBuilder('c')
      .where('c.userId = :userId', { userId })
      .andWhere('c.status = :st', { st: 'checked_in' })
      .andWhere('c.onDate >= :a AND c.onDate <= :b', { a: harvest.startsOn, b: harvest.endsOn })
      .getCount();
    const score = Math.max(stamps, inWindow);
    if (inWindow < harvest.minStamps) {
      conflict('NOT_ENOUGH_STAMPS', `Necesitas ${harvest.minStamps} sellos en la ventana de la mielada.`);
    }
    void score;

    const list = await this.passes.find({ where: { userId, status: 'confirmed' } });
    const pass = list.find((p) => p.startsOn <= today && p.endsOn >= today) || list[0];
    if (!pass) conflict('PASS_INACTIVE', 'Necesitas un bono para reclamar el tarro.');

    harvest.jarsRemaining -= 1;
    await this.harvests.save(harvest as any);
    const claim = (await this.claims.save({
      harvestId: harvest.id,
      userId,
      passId: pass.id,
      status: 'claimed',
      claimedAt: new Date(),
    } as any)) as HarvestClaim;
    return this.serializeClaim(claim, harvest);
  }

  async pickupJar(codeOrUrl: string) {
    const code = extractTicketCode(codeOrUrl);
    const pass = await this.passes.findOne({ where: { code } });
    if (!pass) throw new NotFoundException('Pase no encontrado');
    const harvest = await this.currentHarvest();
    if (!harvest) throw new NotFoundException('No hay mielada');
    const claim = await this.claims.findOne({ where: { userId: pass.userId, harvestId: harvest.id } });
    if (!claim) throw new NotFoundException('Ese vecino no ha reclamado tarro');
    claim.status = 'picked_up';
    await this.claims.save(claim as any);
    return { pass: this.serializePass(await this.loadPass(pass.id)), claim };
  }

  async staffToday() {
    const today = madridToday();
    const yards = await this.listYards();
    const checkIns = await this.checkIns.find({
      where: { onDate: today },
      relations: { yard: true, user: true },
      order: { stampedAt: 'DESC' },
    });
    return { yards: yards.items, checkIns, series14d: await this.series14d() };
  }

  async patchYardDay(yardId: string, dto: { status: 'open' | 'limited' | 'closed'; capacityOverride?: number }) {
    const day = await this.ensureYardDay(yardId, madridToday());
    day.status = dto.status;
    if (dto.capacityOverride !== undefined) day.capacityOverride = dto.capacityOverride;
    await this.yardDays.save(day as any);
    return day;
  }

  async openHarvest(dto: { yardId: string; startsOn: string; endsOn: string; minStamps: number; jarsTotal: number }) {
    const yard = await this.yards.findOne({ where: { id: dto.yardId } });
    if (!yard) throw new NotFoundException('Patio no encontrado');
    const h = (await this.harvests.save({
      yardId: yard.id,
      startsOn: dto.startsOn,
      endsOn: dto.endsOn,
      minStamps: dto.minStamps,
      jarsTotal: dto.jarsTotal,
      jarsRemaining: dto.jarsTotal,
      status: 'open',
    } as any)) as Harvest;
    return this.serializeHarvest(await this.harvests.findOne({ where: { id: h.id }, relations: { yard: true } }));
  }

  async adminStats() {
    const raw = await this.passes
      .createQueryBuilder('p')
      .select('COALESCE(COUNT(*), 0)', 'passes')
      .addSelect('COALESCE(SUM(p.totalCents), 0)', 'cents')
      .getRawOne();
    const stamps = await this.checkIns.count({ where: { status: 'checked_in' } });
    const jars = await this.claims.count();
    return {
      passes: Number(raw?.passes || 0),
      cents: Number(raw?.cents || 0),
      stamps,
      jars,
    };
  }

  async patchProduct(id: string, dto: { priceCents?: number; active?: boolean }) {
    const p = await this.products.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Producto no encontrado');
    if (dto.priceCents !== undefined) p.priceCents = dto.priceCents;
    if (dto.active !== undefined) p.active = dto.active;
    await this.products.save(p as any);
    return p;
  }

  async seedCalendarIfNeeded() {
    const today = madridToday();
    const yards = await this.yards.find();
    for (const y of yards) {
      for (let i = 0; i < 14; i++) {
        await this.ensureYardDay(y.id, addMadridDays(today, i));
      }
    }
  }

  async ensureYardDay(yardId: string, onDate: string): Promise<YardDay> {
    let day = await this.yardDays.findOne({ where: { yardId, onDate } });
    if (day) return day;
    const yard = await this.yards.findOne({ where: { id: yardId } });
    day = (await this.yardDays.save({
      yardId,
      onDate,
      status: 'open',
      capacityOverride: null,
      checkInCount: 0,
    } as any)) as YardDay;
    void yard;
    return day;
  }

  async series14d(userId?: string) {
    const today = madridToday();
    const start = addMadridDays(today, -13);
    const qb = this.checkIns
      .createQueryBuilder('c')
      .select('c.onDate AS date')
      .addSelect('COUNT(*) AS count')
      .where('c.onDate >= :start AND c.onDate <= :end', { start, end: today })
      .andWhere("c.status = 'checked_in'");
    if (userId) qb.andWhere('c.userId = :userId', { userId });
    qb.groupBy('c.onDate');
    const raw = await qb.getRawMany();
    const map = new Map<string, number>();
    for (const r of raw) map.set(String(r.date), Number(r.count));
    const out: { date: string; count: number }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = addMadridDays(start, i);
      out.push({ date: d, count: map.get(d) || 0 });
    }
    return out;
  }

  async loadPass(id: string) {
    return this.passes.findOne({ where: { id }, relations: { lines: true, checkIns: true, product: true } });
  }

  serializePass(pass: Pass | null) {
    if (!pass) throw new NotFoundException('Pase no encontrado');
    const lines = pass.lines || [];
    const linesSum = lines.reduce((s, l) => s + (l.subtotalCents ?? 0), 0);
    const stamps = (pass.checkIns || []).filter((c) => c.status === 'checked_in');
    return {
      ...pass,
      lines,
      linesSum,
      totalCents: pass.totalCents,
      stamps,
      stampCount: stamps.length,
      points: stamps.length,
      checkIns: stamps,
    };
  }

  serializeHarvest(h: Harvest) {
    return {
      id: h.id,
      yardId: h.yardId,
      yardName: h.yard?.name,
      startsOn: h.startsOn,
      endsOn: h.endsOn,
      minStamps: h.minStamps,
      jarsTotal: h.jarsTotal,
      jarsRemaining: h.jarsRemaining,
      status: h.status,
    };
  }

  serializeClaim(c: HarvestClaim, h?: Harvest) {
    return {
      id: c.id,
      harvestId: c.harvestId,
      userId: c.userId,
      passId: c.passId,
      status: c.status,
      claimedAt: c.claimedAt,
      jarsRemaining: h?.jarsRemaining,
    };
  }
}
