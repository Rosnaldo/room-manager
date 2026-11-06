/** English message template → Portuguese. Keys must match the text the code throws, exactly. */
export const pt: Record<string, string> = {
  // generic
  'internal server error': 'Erro interno do servidor.',
  'invalid request': 'Requisição inválida.',
  'invalid path params': 'Parâmetros da URL inválidos.',
  'invalid query params': 'Parâmetros de consulta inválidos.',
  'invalid request body': 'Dados inválidos.',

  // body-parser
  'request body is not valid JSON': 'O corpo da requisição não é um JSON válido.',
  'request body is too large': 'O corpo da requisição é grande demais.',
  'unsupported request body encoding': 'Codificação do corpo da requisição não suportada.',

  // users
  'user {id} not found': 'Usuário {id} não encontrado.',
  'email {email} is already in use': 'O email {email} já está em uso.',
  'at least one field is required': 'Informe pelo menos um campo.',

  // rooms
  'room {id} not found': 'Sala {id} não encontrada.',
  'room {name} already exists': 'Já existe uma sala chamada {name}.',

  // reservations
  'must be a valid date-time in the format YYYY-MM-DDTHH:mm:ss': 'Data e hora inválidas. Use o formato AAAA-MM-DDTHH:mm:ss.',
  'must be after startAt': 'O fim deve ser depois do início.',
  'reservation must last at least 15 minutes': 'A reserva deve durar pelo menos 15 minutos.',
  'reservation must last at most 4 hours': 'A reserva deve durar no máximo 4 horas.',
  'must not be in the past': 'O início não pode estar no passado.',
  'room is already reserved from {start} to {end} on {date}': 'A sala já está reservada das {start} às {end} de {date}.',
  'room is already reserved from {startDate} {start} to {endDate} {end}':
    'A sala já está reservada de {startDate} {start} até {endDate} {end}.',
};
