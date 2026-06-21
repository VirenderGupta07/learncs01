import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import endpoints from '../../api/endpoints';

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient
      .get(endpoints.orders.mine)
      .then(({ data }) => setOrders(data.data.orders))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-gray-500">Loading order history…</p>;

  return (
    <section>
      <h1 className="mb-6 text-xl font-semibold">Order History</h1>

      {orders.length === 0 ? (
        <p className="text-sm text-gray-500">No orders yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2">Order</th>
              <th>Course(s)</th>
              <th>Total</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order._id} className="border-b border-gray-100">
                <td className="py-2">{order.orderNumber}</td>
                <td>{order.items.map((i) => i.title).join(', ')}</td>
                <td>
                  {order.currency} {order.totalAmount}
                </td>
                <td>
                  <span
                    className={
                      order.paymentStatus === 'paid'
                        ? 'text-green-600'
                        : order.paymentStatus === 'failed'
                        ? 'text-red-600'
                        : 'text-gray-500'
                    }
                  >
                    {order.paymentStatus}
                  </span>
                </td>
                <td>{new Date(order.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
