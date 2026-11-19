export const PERSONAS = [
  {
    role: 'seller',
    name: 'Lerato Mokoena',
    title: 'Seller',
    place: 'Germiston',
    age: 36,
    quote: 'I need to know which orders I can pack today.',
    goals: ['List accurate parts', 'Keep online stock accurate', 'Dispatch orders she can fulfil'],
    email: 'lerato@minimall.test',
    initials: 'LM',
  },
  {
    role: 'buyer',
    name: 'Thabo Dlamini',
    title: 'Buyer',
    place: 'Johannesburg',
    age: 21,
    quote: 'Will this work with my board, and can I get it before Friday?',
    goals: ['Find a compatible part', 'Stay within budget', 'Track the parcel and resolve problems'],
    email: 'thabo@minimall.test',
    initials: 'TD',
  },
  {
    role: 'admin',
    name: 'Priya Naidoo',
    title: 'Administrator',
    place: 'Durban',
    age: 34,
    quote: 'I need to see what happened before I make a decision.',
    goals: ['Keep the catalogue accurate', 'Resolve order and refund exceptions', 'Prepare weekly sales summaries'],
    email: 'priya@minimall.test',
    initials: 'PN',
  },
];

export function personaFor(role) {
  return PERSONAS.find((persona) => persona.role === role);
}

export function canOpenPathForRole(pathname, role) {
  if (pathname.startsWith('/seller')) return role === 'seller';
  if (pathname.startsWith('/admin')) return role === 'admin';
  if (
    pathname.startsWith('/cart') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/orders') ||
    pathname.startsWith('/refunds')
  ) {
    return role === 'buyer';
  }
  return true;
}
