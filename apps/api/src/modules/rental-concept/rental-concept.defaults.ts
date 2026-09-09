import { RentalConceptSystemCode } from '../../../generated/prisma/client';

export const DEFAULT_RENTAL_CONCEPTS = [
  {
    systemCode: RentalConceptSystemCode.RENT,
    name: 'Alquiler',
    slug: 'alquiler',
    sortOrder: 10,
  },
  {
    systemCode: RentalConceptSystemCode.EXPENSES,
    name: 'Expensas',
    slug: 'expensas',
    sortOrder: 20,
  },
  {
    systemCode: RentalConceptSystemCode.ELECTRICITY,
    name: 'Electricidad',
    slug: 'electricidad',
    sortOrder: 30,
  },
  {
    systemCode: RentalConceptSystemCode.GAS,
    name: 'Gas',
    slug: 'gas',
    sortOrder: 40,
  },
  {
    systemCode: RentalConceptSystemCode.ABL,
    name: 'ABL',
    slug: 'abl',
    sortOrder: 50,
  },
  {
    systemCode: RentalConceptSystemCode.AYSA,
    name: 'AySA',
    slug: 'aysa',
    sortOrder: 60,
  },
  {
    systemCode: RentalConceptSystemCode.INSURANCE,
    name: 'Seguro',
    slug: 'seguro',
    sortOrder: 70,
  },
] as const;
