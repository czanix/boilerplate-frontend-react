import type { Order } from '../types/order.types';

interface Props { orders: Order[]; }

export function OrderList({ orders }: Props) {
  if (!orders.length) return <p className="text-muted">Nenhum pedido encontrado.</p>;

  return (
    <ul className="order-list">
      {orders.map((order) => (
        <li key={order.publicId} className="order-card">
          <span className="order-id">{order.publicId.slice(0, 8)}</span>
          <span className={`status status--${order.status}`}>{order.status}</span>
          <span className="total">R$ {order.total.toFixed(2)}</span>
        </li>
      ))}
    </ul>
  );
}
