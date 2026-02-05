// Minimal product service to simulate price recompute and stock checks.
const products = new Map()

function resetProducts(initial = []){
  products.clear()
  for (const p of initial){
    products.set(p.id, { price: p.price, stock: p.stock })
  }
}

async function getProduct(productId){
  const p = products.get(productId)
  if (!p) return null
  return { id: productId, price: p.price, stock: p.stock }
}

async function checkAvailability(productId, qty){
  const p = products.get(productId)
  if (!p) return false
  return p.stock >= qty
}

async function reserve(productId, qty){
  const p = products.get(productId)
  if (!p) return false
  if (p.stock < qty) return false
  p.stock -= qty
  return true
}

module.exports = { resetProducts, getProduct, checkAvailability, reserve }
