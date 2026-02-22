// ===== CART SYSTEM =====

// Get cart from localStorage
function getCart() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

// Save cart
function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

// Update cart count in navbar
function updateCartCount() {
  const cart = getCart();
  const count = cart.length;
  const cartCountElement = document.getElementById("cart-count");
  if (cartCountElement) {
    cartCountElement.textContent = count;
  }
}

// Add product to cart
function addToCart(product) {
  const cart = getCart();
  cart.push(product);
  saveCart(cart);
  updateCartCount();
  alert("Product added to cart!");
}

// When page loads
document.addEventListener("DOMContentLoaded", function () {
  updateCartCount();

  // Add to Cart buttons
  const buttons = document.querySelectorAll(".add-cart");

  buttons.forEach(button => {
    button.addEventListener("click", function () {
      const productCard = this.closest(".product");
      const name = productCard.querySelector("h3").innerText;
      const price = productCard.querySelector(".price span").innerText;

      addToCart({
        name: name,
        price: price
      });
    });
  });
});
