export type UserRole = 'employee' | 'contractor' | 'admin';

export interface Address {
  city: string;
  street: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company: string;
  address: Address;
  phones: string[];
}

export type UserPayload = Omit<User, 'id'>;
