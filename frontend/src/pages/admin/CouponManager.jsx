import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import endpoints from '../../api/endpoints';

export default function CouponManager() {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState({ code: '', discountType: 'percentage', discountValue: 10 });

  useEffect(() => {
    axiosClient.get(endpoints.admin.coupons).then(({ data }) => setCoupons(data.data.coupons));
  }, []);

  async function createCoupon(e) {
    e.preventDefault();
    const { data } = await axiosClient.post(endpoints.admin.coupons, form);
    setCoupons((prev) => [data.data.coupon, ...prev]);
    setForm({ code: '', discountType: 'percentage', discountValue: 10 });
  }

  return (
    <section>
      <h1 className="mb-6 text-xl font-semibold">Coupons</h1>

      <form onSubmit={createCoupon} className="mb-8 flex flex-wrap items-end gap-3">
        <input
          placeholder="CODE"
          required
          className="rounded-md border border-gray-300 px-3 py-2 text-sm uppercase"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
        />
        <select
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={form.discountType}
          onChange={(e) => setForm({ ...form, discountType: e.target.value })}
        >
          <option value="percentage">% off</option>
          <option value="flat">Flat amount off</option>
        </select>
        <input
          type="number"
          min={0}
          className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={form.discountValue}
          onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
        />
        <button type="submit" className="rounded-md bg-ink px-4 py-2 text-sm text-white">
          Create coupon
        </button>
      </form>

      <ul className="space-y-2">
        {coupons.map((coupon) => (
          <li key={coupon._id} className="flex justify-between rounded-md border border-gray-200 p-3 text-sm">
            <span className="font-mono">{coupon.code}</span>
            <span>
              {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `$${coupon.discountValue}`} off
            </span>
            <span className={coupon.isActive ? 'text-green-600' : 'text-gray-400'}>
              {coupon.isActive ? 'Active' : 'Inactive'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
