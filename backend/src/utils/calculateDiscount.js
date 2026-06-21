/**
 * Computes the discount amount and final total for a coupon applied to a
 * given price. Pure function, no DB access - directly unit-testable.
 *
 * @param {number} price - the pre-discount price
 * @param {{discountType: 'percentage'|'flat', discountValue: number}} coupon
 * @returns {{ discountAmount: number, totalAmount: number }}
 */
function calculateDiscount(price, coupon) {
  const discountAmount =
    coupon.discountType === 'percentage'
      ? Math.round(price * (coupon.discountValue / 100) * 100) / 100
      : Math.min(coupon.discountValue, price);

  const totalAmount = Math.max(Math.round((price - discountAmount) * 100) / 100, 0);

  return { discountAmount, totalAmount };
}

module.exports = { calculateDiscount };
