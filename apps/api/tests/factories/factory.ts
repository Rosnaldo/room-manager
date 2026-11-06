import type { DB } from '../../src/db/connection';

/** Overrides can be static values or derived from the factory's sequence number. */
export type Overrides<T> = Partial<T> | ((seq: number) => Partial<T>);

interface FactoryOptions<T, E> {
  defaults: (seq: number) => T;
  persist?: (db: DB, attrs: T) => E;
}

// shared across all factories so unique fields (emails, names) never collide between them
let globalSeq = 0;

/**
 * Entity factory: `build` makes plain attributes, `create` persists them.
 * Every field is overridable; `extend` derives a variant (trait) with different defaults.
 *
 *   userFactory.build({ role: 'admin' })
 *   userFactory.create(db, (n) => ({ email: `u${n}@corp.com` }))
 *   const adminFactory = userFactory.extend({ role: 'admin' })
 */
export class Factory<T extends object, E = T> {
  constructor(private readonly options: FactoryOptions<T, E>) {}

  build(overrides: Overrides<T> = {}): T {
    const seq = ++globalSeq;
    const resolved = typeof overrides === 'function' ? overrides(seq) : overrides;
    return { ...this.options.defaults(seq), ...resolved };
  }

  buildMany(count: number, overrides?: Overrides<T>): T[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }

  create(db: DB, overrides?: Overrides<T>): E {
    if (!this.options.persist) throw new Error('this factory has no persist function');
    return this.options.persist(db, this.build(overrides));
  }

  createMany(db: DB, count: number, overrides?: Overrides<T>): E[] {
    return Array.from({ length: count }, () => this.create(db, overrides));
  }

  extend(defaults: Overrides<T>): Factory<T, E> {
    return new Factory<T, E>({
      ...this.options,
      defaults: (seq) => ({
        ...this.options.defaults(seq),
        ...(typeof defaults === 'function' ? defaults(seq) : defaults),
      }),
    });
  }
}
