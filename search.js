// search.js
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const resultsBox = document.getElementById("search-results");

if (searchBtn && searchInput) {
  searchBtn.addEventListener("click", () => {
    const q = searchInput.value.toLowerCase().trim();
    if (!q) return;

    const results = ALL_PRODUCTS.filter(p =>
      p.name.toLowerCase().includes(q)
    );

    if (!resultsBox) {
      if (results[0]) location.href = results[0].page;
      return;
    }

    resultsBox.innerHTML = results.length
      ? results.map(p => `
          <div class="search-result">
            <strong>${p.name}</strong><br>
            ZMW ${p.priceZMW}
            <button onclick="location.href='${p.page}'">View</button>
          </div>
        `).join("")
      : "<p>No products found</p>";
  });
}
