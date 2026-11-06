import { z, ZodIssueCode, type ZodError, type ZodErrorMap, type ZodIssue } from 'zod';

import { translate, type Locale } from '.';
import type { TranslatedDetails } from '../exceptions/http';

const TYPE_NAMES: Record<string, string> = {
  string: 'um texto',
  number: 'um número',
  integer: 'um número inteiro',
  boolean: 'verdadeiro ou falso',
  array: 'uma lista',
  object: 'um objeto',
  date: 'uma data',
};

const plural = (n: number | bigint, one: string, many: string) => `${n} ${Number(n) === 1 ? one : many}`;

/** Portuguese versions of zod's built-in messages. */
const ptErrorMap: ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === 'undefined') return { message: 'Campo obrigatório.' };
      return { message: `Deve ser ${TYPE_NAMES[issue.expected] ?? issue.expected}.` };

    case ZodIssueCode.unrecognized_keys:
      return {
        message: `${issue.keys.length === 1 ? 'Campo não permitido' : 'Campos não permitidos'}: ${issue.keys.join(', ')}.`,
      };

    case ZodIssueCode.invalid_enum_value:
      return { message: `Deve ser um destes valores: ${issue.options.join(', ')}.` };

    case ZodIssueCode.invalid_string:
      if (issue.validation === 'email') return { message: 'Email inválido.' };
      if (issue.validation === 'datetime') return { message: 'Data e hora inválidas.' };
      return { message: 'Formato inválido.' };

    case ZodIssueCode.too_small: {
      const n = issue.minimum;
      if (issue.type === 'string') {
        return { message: Number(n) === 1 ? 'Não pode ficar em branco.' : `Deve ter pelo menos ${plural(n, 'caractere', 'caracteres')}.` };
      }
      if (issue.type === 'array') return { message: `Deve ter pelo menos ${plural(n, 'item', 'itens')}.` };
      if (issue.type === 'number') return { message: `Deve ser maior ${issue.inclusive ? 'ou igual a' : 'que'} ${n}.` };
      break;
    }

    case ZodIssueCode.too_big: {
      const n = issue.maximum;
      if (issue.type === 'string') return { message: `Deve ter no máximo ${plural(n, 'caractere', 'caracteres')}.` };
      if (issue.type === 'array') return { message: `Deve ter no máximo ${plural(n, 'item', 'itens')}.` };
      if (issue.type === 'number') return { message: `Deve ser menor ${issue.inclusive ? 'ou igual a' : 'que'} ${n}.` };
      break;
    }

    case ZodIssueCode.not_finite:
      return { message: 'Deve ser um número finito.' };

    case ZodIssueCode.invalid_union:
    case ZodIssueCode.invalid_literal:
    case ZodIssueCode.custom:
      return { message: 'Valor inválido.' };
  }
  return { message: ctx.defaultError === 'Required' ? 'Campo obrigatório.' : 'Valor inválido.' };
};

/** zod's own English text for an issue, to tell built-in messages from ones a schema set itself. */
function defaultMessage(issue: ZodIssue): string {
  return z.defaultErrorMap(issue, { defaultError: issue.message, data: undefined }).message;
}

function translateIssue(issue: ZodIssue, locale: Locale): string {
  if (locale === 'en') return issue.message;
  // a schema's own message is an English template in the catalog; a built-in one goes through the map
  if (issue.message !== defaultMessage(issue)) return translate(locale, issue.message);
  return ptErrorMap(issue, { defaultError: issue.message, data: undefined }).message;
}

/** A validation failure as `{ field: [messages] }` in `locale`; problems with the whole object go under `_errors`. */
export function zodDetails(error: ZodError, locale: Locale): TranslatedDetails {
  const { formErrors, fieldErrors } = error.flatten((issue) => translateIssue(issue, locale));
  const details: TranslatedDetails = { ...(fieldErrors as TranslatedDetails) };
  if (formErrors.length) details._errors = formErrors;
  return details;
}
