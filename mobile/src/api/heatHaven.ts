import { apiRequest } from './http';

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'user' | 'admin' | string;
};

export type AuthResponse = {
  success: boolean;
  message: string;
  token: string;
  user: User;
};

export type Product = {
  _id: string;
  legacyId?: number;
  name: string;
  brand?: string;
  colorway?: string;
  category?: string;
  imageMain?: string;
  variants?: Array<{ size: string; price: number; stock: number }>;
};

export async function login(email: string, password: string) {
  return apiRequest<AuthResponse>('/api/auth/login', { method: 'POST', body: { email, password } });
}

export async function register(name: string, email: string, password: string, phone?: string) {
  return apiRequest<AuthResponse>('/api/auth/register', { method: 'POST', body: { name, email, password, phone } });
}

export async function me() {
  return apiRequest<{ success: boolean; user: User }>('/api/auth/me');
}

export async function getProducts() {
  return apiRequest<{ success: boolean; data: Product[] }>('/api/products');
}

