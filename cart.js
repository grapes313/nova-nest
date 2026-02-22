// cart.js
let cart = JSON.parse(localStorage.getItem("cart")) || [];

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const countEl = document.getElementById("cart-count");
  if (!countEl) return;
  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  countEl.textContent = totalQty;
}

function addToCartFromButton(btn) {
  const id = btn.dataset.id;
  const name = btn.dataset.name;
  const price = Number(btn.dataset.price);

  const existing = cart.find(p => p.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id, name, priceZMW: price, qty: 1 });
  }

  saveCart();
  alert(`${name} added to cart`);
}

document.addEventListener("click", e => {
  if (e.target.classList.contains("add-cart")) {
    addToCartFromButton(e.target);
  }
});

updateCartCount();
