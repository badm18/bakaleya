export const ORGANIZATIONS = ['ИП Шатилова Е.А', 'Ахмерова Н.Н'] as const;

export type Organization = (typeof ORGANIZATIONS)[number];
