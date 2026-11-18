import { Product, PUBLIC_PRODUCT_STATUSES } from '../models/Product.js';

export async function buildCart(user) {
  const ids = user.cart.map((entry) => entry.productId);
  const products = await Product.find({ _id: { $in: ids } })
    .populate('sellerId', 'name')
    .populate('categoryId', 'name slug');
  const byId = new Map(products.map((product) => [product._id.toString(), product]));

  const items = [];
  for (const entry of user.cart) {
    const product = byId.get(entry.productId.toString());
    if (!product) continue;
    const sellerId = product.sellerId?._id || product.sellerId;
    const available = PUBLIC_PRODUCT_STATUSES.includes(product.status);
    const enoughStock = product.stock >= entry.qty;
    items.push({
      productId: product._id,
      title: product.title,
      model: product.model,
      priceCents: product.priceCents,
      unitPriceCents: product.priceCents,
      lineTotalCents: product.priceCents * entry.qty,
      qty: entry.qty,
      stock: product.stock,
      image: product.images?.[0] || '',
      sellerId,
      sellerName: product.sellerId?.name || 'Seller',
      category: product.categoryId?.name || '',
      available,
      enoughStock,
      problem: !available
        ? 'This listing is no longer available.'
        : !enoughStock
          ? `Only ${product.stock} left in stock.`
          : '',
    });
  }

  const sellerIds = new Set(items.map((item) => String(item.sellerId)));
  return {
    items,
    count: items.reduce((sum, item) => sum + item.qty, 0),
    subtotalCents: items.reduce((sum, item) => sum + item.lineTotalCents, 0),
    sellerCount: sellerIds.size,
    mixedSellers: sellerIds.size > 1,
    hasProblems: items.some((item) => Boolean(item.problem)),
  };
}