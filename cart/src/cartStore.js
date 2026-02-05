// Simple in-memory cart store for testing/demo purposes
const cart = {
  items: {} // productId -> { qty }
}

function resetCart(){
  cart.items = {}
}

function addItem(productId, qty){
  const existing = cart.items[productId]
  if (existing) existing.qty += qty
  else cart.items[productId] = { qty }
}

function setQty(productId, qty){
  if (qty <= 0) delete cart.items[productId]
  else cart.items[productId] = { qty }
}

function clearCart(){
  cart.items = {}
}

function getItems(){
  return { ...cart.items }
}

module.exports = { resetCart, addItem, setQty, clearCart, getItems }
