import { describe, expect, it } from 'vitest';

import { useTestApp } from '../helpers/app';
import { roomFactory } from '../factories/room.factory';
import { errorResponseSchema } from '../../src/schemas/common';
import { resolveLocale, translate } from '../../src/i18n';
import { pt } from '../../src/i18n/pt';
import { NotFoundException } from '../../src/exceptions/not_found';

/**
 * The code throws English; the response is translated to the client's Accept-Language,
 * Portuguese by default.
 */
describe('error message translation', () => {
  const ctx = useTestApp();
  const createRoom = (body: unknown, lang?: string) => {
    const req = ctx.api.post('/rooms/create');
    if (lang) req.set('Accept-Language', lang);
    return req.send(body as object);
  };

  describe('zod built-in checks', () => {
    it.each([
      ['missing field', { maxCapacity: 1 }, 'name', 'Campo obrigatório.', 'Required'],
      ['wrong type', { name: 1, maxCapacity: 1 }, 'name', 'Deve ser um texto.', 'Expected string, received number'],
      ['blank string', { name: ' ', maxCapacity: 1 }, 'name', 'Não pode ficar em branco.', 'String must contain at least 1 character(s)'],
      ['string too long', { name: 'x'.repeat(101), maxCapacity: 1 }, 'name', 'Deve ter no máximo 100 caracteres.', 'String must contain at most 100 character(s)'],
      ['not an integer', { name: 'A', maxCapacity: 2.5 }, 'maxCapacity', 'Deve ser um número inteiro.', 'Expected integer, received float'],
      ['number too small', { name: 'A', maxCapacity: 0 }, 'maxCapacity', 'Deve ser maior ou igual a 1.', 'Number must be greater than or equal to 1'],
      ['number too big', { name: 'A', maxCapacity: 10_001 }, 'maxCapacity', 'Deve ser menor ou igual a 10000.', 'Number must be less than or equal to 10000'],
    ])('%s', async (_case, body, field, ptMessage, enMessage) => {
      const ptRes = errorResponseSchema.parse((await createRoom(body).expect(400)).body);
      expect(ptRes.message).toBe('Dados inválidos.');
      expect(ptRes.details?.[field]).toEqual([ptMessage]);

      const enRes = errorResponseSchema.parse((await createRoom(body, 'en').expect(400)).body);
      expect(enRes.message).toBe('invalid request body');
      expect(enRes.details?.[field]).toEqual([enMessage]);
    });

    it('unknown keys', async () => {
      const res = errorResponseSchema.parse((await createRoom({ name: 'A', maxCapacity: 1, id: 1, foo: 2 }).expect(400)).body);
      expect(res.details?._errors).toEqual(['Campos não permitidos: id, foo.']);
    });
  });

  it("translates a schema's own message through the catalog", async () => {
    const body = { userId: 1, roomId: 1, startAt: '2030-01-20T10:00', endAt: '2030-01-20T11:00:00' };
    const ptRes = errorResponseSchema.parse((await ctx.api.post('/reservations/create').send(body).expect(400)).body);
    expect(ptRes.details?.startAt).toEqual(['Data e hora inválidas. Use o formato AAAA-MM-DDTHH:mm:ss.']);

    const enRes = errorResponseSchema.parse(
      (await ctx.api.post('/reservations/create').set('Accept-Language', 'en-US').send(body).expect(400)).body,
    );
    expect(enRes.details?.startAt).toEqual(['must be a valid date-time in the format YYYY-MM-DDTHH:mm:ss']);
  });

  it('translates thrown exceptions with their params', async () => {
    roomFactory.create(ctx.db, { name: 'Sala Azul' });
    expect((await createRoom({ name: 'Sala Azul', maxCapacity: 2 }).expect(409)).body).toEqual({
      message: 'Já existe uma sala chamada Sala Azul.',
    });
    expect((await createRoom({ name: 'Sala Azul', maxCapacity: 2 }, 'en').expect(409)).body).toEqual({
      message: 'room Sala Azul already exists',
    });
  });

  it('keeps the English text as the error message (for logs)', () => {
    expect(new NotFoundException('user {id} not found', { id: 7 }).message).toBe('user 7 not found');
  });

  it('translates malformed JSON', async () => {
    const res = await ctx.api.post('/rooms/create').set('Content-Type', 'application/json').send('{"name":').expect(400);
    expect(res.body).toEqual({ message: 'O corpo da requisição não é um JSON válido.' });
  });

  describe('Accept-Language', () => {
    it.each([
      [undefined, 'pt'],
      ['', 'pt'],
      ['pt-BR,pt;q=0.9', 'pt'],
      ['en', 'en'],
      ['en-US,en;q=0.9,pt;q=0.8', 'en'],
      ['pt;q=0.5,en;q=0.9', 'en'],
      ['fr-FR,fr;q=0.9', 'pt'],
      ['fr,en;q=0.5', 'en'],
      ['en;q=0', 'pt'],
    ])('%j → %s', (header, locale) => {
      expect(resolveLocale(header)).toBe(locale);
    });
  });

  it('has a Portuguese translation for every template, with the same placeholders', () => {
    for (const [en, ptText] of Object.entries(pt)) {
      const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
      expect(placeholders(ptText), en).toEqual(placeholders(en));
    }
    expect(translate('pt', 'no translation for this')).toBe('no translation for this');
  });
});
