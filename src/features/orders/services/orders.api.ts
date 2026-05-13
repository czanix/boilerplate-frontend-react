import type { Order, CreateOrderInput } from '../types/order.types';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export const ordersApi = {
  list: async (): Promise<Order[]> => {
    const res = await fetch(`${BASE}/orders`);
    return res.json();
  },
  create: async (input: CreateOrderInput): Promise<Order> => {
    const res = await fetch(`${BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return res.json();
  },
};
