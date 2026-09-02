import {
  Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 120 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 16, default: 'client' })
  role: 'client' | 'staff' | 'admin';

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => Pass, (p: Pass) => p.user)
  passes?: Pass[];

  @OneToMany(() => CheckIn, (c: CheckIn) => c.user)
  checkIns?: CheckIn[];

  @OneToMany(() => HarvestClaim, (h: HarvestClaim) => h.user)
  claims?: HarvestClaim[];
}

@Entity({ name: 'yards' })
export class Yard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  slug: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  flora: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'int' })
  hiveCount: number;

  @Column({ type: 'int' })
  capacity: number;

  @Column({ type: 'varchar' })
  layout: 'wide' | 'tall' | 'minimal' | 'framed';

  @Column({ type: 'varchar' })
  imagePath: string;

  @Column({ type: 'varchar' })
  caption: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @OneToMany(() => YardDay, (d: YardDay) => d.yard)
  days?: YardDay[];

  @OneToMany(() => CheckIn, (c: CheckIn) => c.yard)
  checkIns?: CheckIn[];

  @OneToMany(() => Harvest, (h: Harvest) => h.yard)
  harvests?: Harvest[];
}

@Entity({ name: 'pass_products' })
export class PassProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  slug: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'int', default: 7 })
  durationDays: number;

  @Column({ type: 'int' })
  priceCents: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}

@Entity({ name: 'addons' })
export class Addon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  slug: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'int' })
  priceCents: number;

  @Column({ type: 'int', default: 20 })
  stock: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}

@Entity({ name: 'passes' })
@Index(['userId', 'status'])
export class Pass {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @ManyToOne(() => User, (u: User) => u.passes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'varchar' })
  productId: string;

  @ManyToOne(() => PassProduct)
  @JoinColumn({ name: 'productId' })
  product?: PassProduct;

  @Column({ type: 'varchar', length: 16, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 16 })
  status: 'confirmed' | 'cancelled';

  @Column({ type: 'date' })
  startsOn: string;

  @Column({ type: 'date' })
  endsOn: string;

  @Column({ type: 'int' })
  totalCents: number;

  @Column({ type: 'text' })
  qrSvg: string;

  @Column({ type: 'varchar' })
  qrUrl: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => PassLine, (l: PassLine) => l.pass)
  lines?: PassLine[];

  @OneToMany(() => CheckIn, (c: CheckIn) => c.pass)
  checkIns?: CheckIn[];
}

@Entity({ name: 'pass_lines' })
export class PassLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  passId: string;

  @ManyToOne(() => Pass, (p: Pass) => p.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'passId' })
  pass?: Pass;

  @Column({ type: 'varchar' })
  kind: 'product' | 'addon';

  @Column({ type: 'varchar' })
  refId: string;

  @Column({ type: 'varchar' })
  label: string;

  @Column({ type: 'int' })
  qty: number;

  @Column({ type: 'int' })
  unitCents: number;

  @Column({ type: 'int' })
  subtotalCents: number;
}

@Entity({ name: 'yard_days' })
@Index(['yardId', 'onDate'], { unique: true })
export class YardDay {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  yardId: string;

  @ManyToOne(() => Yard, (y: Yard) => y.days, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'yardId' })
  yard?: Yard;

  @Column({ type: 'date' })
  onDate: string;

  @Column({ type: 'varchar', length: 16, default: 'open' })
  status: 'open' | 'limited' | 'closed';

  @Column({ type: 'int', nullable: true })
  capacityOverride: number | null;

  @Column({ type: 'int', default: 0 })
  checkInCount: number;
}

@Entity({ name: 'check_ins' })
@Index(['userId', 'onDate'], { unique: true })
export class CheckIn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @ManyToOne(() => User, (u: User) => u.checkIns, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'varchar' })
  passId: string;

  @ManyToOne(() => Pass, (p: Pass) => p.checkIns, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'passId' })
  pass?: Pass;

  @Column({ type: 'varchar' })
  yardId: string;

  @ManyToOne(() => Yard, (y: Yard) => y.checkIns)
  @JoinColumn({ name: 'yardId' })
  yard?: Yard;

  @Column({ type: 'varchar' })
  yardDayId: string;

  @ManyToOne(() => YardDay)
  @JoinColumn({ name: 'yardDayId' })
  yardDay?: YardDay;

  @Column({ type: 'date' })
  onDate: string;

  @Column({ type: 'varchar', length: 16, default: 'checked_in' })
  status: 'checked_in';

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  stampedAt: Date;
}

@Entity({ name: 'harvests' })
export class Harvest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  yardId: string;

  @ManyToOne(() => Yard, (y: Yard) => y.harvests)
  @JoinColumn({ name: 'yardId' })
  yard?: Yard;

  @Column({ type: 'date' })
  startsOn: string;

  @Column({ type: 'date' })
  endsOn: string;

  @Column({ type: 'int' })
  minStamps: number;

  @Column({ type: 'int' })
  jarsTotal: number;

  @Column({ type: 'int' })
  jarsRemaining: number;

  @Column({ type: 'varchar', length: 16, default: 'open' })
  status: 'open' | 'closed';

  @OneToMany(() => HarvestClaim, (c: HarvestClaim) => c.harvest)
  claims?: HarvestClaim[];
}

@Entity({ name: 'harvest_claims' })
@Index(['userId', 'harvestId'], { unique: true })
export class HarvestClaim {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  harvestId: string;

  @ManyToOne(() => Harvest, (h: Harvest) => h.claims, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'harvestId' })
  harvest?: Harvest;

  @Column({ type: 'varchar' })
  userId: string;

  @ManyToOne(() => User, (u: User) => u.claims, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'varchar' })
  passId: string;

  @ManyToOne(() => Pass)
  @JoinColumn({ name: 'passId' })
  pass?: Pass;

  @Column({ type: 'varchar', length: 16, default: 'claimed' })
  status: 'claimed' | 'picked_up';

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  claimedAt: Date;
}

export const ALL_ENTITIES = [
  User, Yard, PassProduct, Addon, Pass, PassLine, YardDay, CheckIn, Harvest, HarvestClaim,
];
