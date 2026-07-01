// ============================================================
// VELORA UNIVERSAL CART + CHECKOUT SYSTEM
// Works on every customer page. Zero page changes needed.
// Usage: <script src="cart.js"></script>
// API:   window.VeloraCart.add(item) / .open() / .close()
// ============================================================
(function() {
  'use strict';

  var STORAGE_KEY = 'velora-cart';

  // ===== VELORA CONFIG =====
  // WhatsApp number for manual payment processing (Zambian number with country code)
  // Format: 260XXXXXXXXX (e.g. 260966172411 for 0966172411)
  var VELORA_WHATSAPP = (window.VELORA_CONFIG && window.VELORA_CONFIG.whatsapp) || '260966172411';
  // Set your Flutterwave LIVE public key when ready. Leave empty for now.
  // Test mode: 'FLWPUBK_TEST-...' | Live mode: 'FLWPUBK-...'
  var FLUTTERWAVE_PUBLIC_KEY = (window.VELORA_CONFIG && window.VELORA_CONFIG.fw_key) || '';
  var FLUTTERWAVE_ENABLED = FLUTTERWAVE_PUBLIC_KEY.length > 20 && FLUTTERWAVE_PUBLIC_KEY.indexOf('FLWPUBK') === 0;
  var SUPABASE_URL = 'https://qlvransrclmziwibhgog.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsdnJhbnNyY2xteml3aWJoZ29nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNjE0MzYsImV4cCI6MjA4ODYzNzQzNn0.a-s7JLEI8ShwknOWJ0VF7TxedbaiI1b8WPSfpWDm84g';

  function getSupabase() {
    if (window.supabaseClient) { return window.supabaseClient; }
    if (window.supabase && window.supabase.createClient) {
      window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, storageKey: 'velora-auth', autoRefreshToken: true, detectSessionInUrl: false }
      });
      return window.supabaseClient;
    }
    return null;
  }

  function getSession() {
    // Try default Supabase storage key first
    try {
      var key = 'sb-' + SUPABASE_URL.replace('https://','').replace('.supabase.co','') + '-auth-token';
      var raw = localStorage.getItem(key);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed.user) return parsed.user;
      }
    } catch(e) {}
    // Fallback: try velora-auth custom key
    try {
      var alt = localStorage.getItem('velora-auth');
      if (alt) {
        var p = JSON.parse(alt);
        if (p.user) return p.user;
      }
    } catch(e) {}
    return null;
  }

  function getProfile() {
    try { return JSON.parse(localStorage.getItem('velora-profile') || '{}'); }
    catch(e) { return {}; }
  }

  function getCustomerId() {
    // Extract user ID from Supabase session in localStorage
    try {
      // Try default Supabase key
      var key = 'sb-' + SUPABASE_URL.replace('https://','').replace('.supabase.co','') + '-auth-token';
      var raw = localStorage.getItem(key);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed.user && parsed.user.id) return parsed.user.id;
      }
      // Fallback: try velora-auth custom key
      var alt = localStorage.getItem('velora-auth');
      if (alt) {
        var p = JSON.parse(alt);
        if (p.user && p.user.id) return p.user.id;
      }
    } catch(e) {}
    return null;
  }

  // ===== 1. INJECT CSS =====
  if (!document.getElementById('vcart-css')) {
    var s = document.createElement('style');
    s.id = 'vcart-css';
    s.textContent =
      '#vcart-panel{position:fixed;top:0;right:0;bottom:0;width:100%;max-width:420px;background:#fff;z-index:9999;transform:translateX(100%);transition:transform .3s ease;display:flex;flex-direction:column;box-shadow:-10px 0 40px rgba(0,0,0,.15)}' +
      '#vcart-panel.vcart-open{transform:translateX(0)}' +
      '#vcart-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:9998;display:none}' +
      '#vcart-overlay.vcart-open{display:block}' +
      '.vcart-items{flex:1;overflow-y:auto;padding:16px}' +
      '.vcart-item{display:flex;gap:12px;padding:12px;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:8px;background:#fff}' +
      '.vcart-item img{width:60px;height:60px;border-radius:8px;object-fit:cover;background:#f3f4f6;flex-shrink:0}' +
      '.vcart-qty{display:flex;align-items:center;gap:6px;margin-top:6px}' +
      '.vcart-qty button{width:26px;height:26px;border:1px solid #e5e7eb;background:#fff;border-radius:6px;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center}' +
      '.vcart-qty button:hover{background:#f3f4f6}' +
      '.vcart-qty span{font-size:13px;font-weight:600;width:20px;text-align:center}' +
      '.vcart-empty{text-align:center;padding:48px 16px;color:#9ca3af}' +
      '.vcart-empty i{font-size:40px;margin-bottom:12px;display:block}' +
      '.vcart-badge{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;background:#0D47FF;color:#fff;border-radius:999px;font-size:10px;font-weight:700;display:none;align-items:center;justify-content:center;padding:0 4px}' +
      '.vcart-badge.vcart-show{display:flex}' +
      '.vcart-header{padding:16px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;background:#fff}' +
      '.vcart-footer{padding:16px;border-top:1px solid #e5e7eb;background:#f8fafc}' +
      '.vcart-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}' +
      '.vcart-btn{background:linear-gradient(135deg,#0D47FF,#0a2dbd);color:#fff;border:none;padding:12px;border-radius:10px;font-weight:700;cursor:pointer;width:100%;font-size:14px}' +
      '.vcart-btn:hover{background:linear-gradient(135deg,#0a2dbd,#0836a3)}' +
      '.vcart-btn:disabled{opacity:.5;cursor:not-allowed}' +
      '.vcart-btn-outline{background:#fff;color:#0D47FF;border:2px solid #0D47FF;padding:10px;border-radius:10px;font-weight:700;cursor:pointer;width:100%;font-size:14px}' +
      '.vcart-btn-outline:hover{background:#f0f4ff}' +
      '.vcart-trash{color:#9ca3af;border:none;background:none;cursor:pointer;font-size:13px;margin-left:8px}' +
      '.vcart-trash:hover{color:#dc2626}' +
      '#vcheckout-panel{position:fixed;top:0;right:0;bottom:0;width:100%;max-width:480px;background:#fff;z-index:10000;transform:translateX(100%);transition:transform .3s ease;display:flex;flex-direction:column;box-shadow:-10px 0 40px rgba(0,0,0,.15)}' +
      '#vcheckout-panel.vcart-open{transform:translateX(0)}' +
      '#vcheckout-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:9999;display:none}' +
      '#vcheckout-overlay.vcart-open{display:block}' +
      '.vcheck-header{padding:16px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;background:#fff}' +
      '.vcheck-body{flex:1;overflow-y:auto;padding:16px}' +
      '.vcheck-section{background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:16px}' +
      '.vcheck-section h3{font-size:14px;font-weight:700;margin-bottom:12px;color:#111}' +
      '.vcheck-item{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #e5e7eb;align-items:center}' +
      '.vcheck-item:last-child{border-bottom:none}' +
      '.vcheck-item img{width:48px;height:48px;border-radius:8px;object-fit:cover;background:#f3f4f6;flex-shrink:0}' +
      '.vcheck-input{width:100%;padding:12px;border:2px solid #e5e7eb;border-radius:10px;font-size:14px;margin-bottom:10px;box-sizing:border-box;font-family:inherit;transition:border-color .2s}' +
      '.vcheck-input:focus{outline:none;border-color:#0D47FF}' +
      '.vcheck-label{display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:4px}' +
      '.vcheck-total{display:flex;justify-content:space-between;align-items:center;padding:16px;border-top:2px solid #0D47FF;margin-top:16px}' +
      '.vcheck-total span:first-child{font-size:16px;font-weight:700}' +
      '.vcheck-total span:last-child{font-size:24px;font-weight:800;color:#0D47FF}' +
      '.vcheck-success{text-align:center;padding:40px 20px}' +
      '.vcheck-success i{font-size:56px;color:#16a34a;margin-bottom:16px;display:block}' +
      '.vcheck-success h2{font-size:22px;font-weight:700;margin-bottom:8px}' +
      '.vcheck-success p{color:#6b7280;font-size:14px;margin-bottom:4px}' +
      '.vcheck-success .order-ref{background:#f0f4ff;color:#0D47FF;font-weight:700;font-size:18px;padding:8px 16px;border-radius:8px;display:inline-block;margin:12px 0}' +
      '.vcheck-guest-note{font-size:12px;color:#92400e;background:#fef3c7;border:1px solid #fde68a;padding:12px;border-radius:8px;margin-bottom:12px}' +
      '.vcheck-login-note{font-size:12px;color:#1e40af;background:#dbeafe;border:1px solid #93c5fd;padding:12px;border-radius:8px;margin-bottom:12px}' +
      '.vcheck-payment-row{display:flex;align-items:center;gap:10px;padding:10px;border:2px solid #e5e7eb;border-radius:10px;margin-bottom:8px;cursor:pointer;transition:all .2s}' +
      '.vcheck-payment-row:hover{border-color:#0D47FF;background:#f0f4ff}' +
      '.vcheck-payment-row.selected{border-color:#0D47FF;background:#f0f4ff}' +
      '.vcheck-footer{padding:16px;border-top:1px solid #e5e7eb;background:#fff}';
    document.head.appendChild(s);
  }

  // ===== 2. INJECT HTML PANELS =====
  if (!document.getElementById('vcart-panel')) {
    var div = document.createElement('div');
    div.innerHTML =
      '<div id="vcart-overlay" onclick="window.VeloraCart.close()"></div>' +
      '<div id="vcart-panel">' +
        '<div class="vcart-header">' +
          '<div style="display:flex;align-items:center;gap:12px">' +
            '<div style="width:36px;height:36px;background:linear-gradient(135deg,#0D47FF,#0a2dbd);border-radius:10px;display:flex;align-items:center;justify-content:center"><i class="fas fa-shopping-bag" style="color:#fff;font-size:14px"></i></div>' +
            '<div><div style="font-weight:700;font-size:14px">Your Cart</div><div style="font-size:12px;color:#6b7280"><span id="vcart-count-text">0</span> items</div></div>' +
          '</div>' +
          '<button onclick="window.VeloraCart.close()" style="width:32px;height:32px;border-radius:50%;border:none;background:#f3f4f6;cursor:pointer"><i class="fas fa-times" style="color:#6b7280"></i></button>' +
        '</div>' +
        '<div class="vcart-items" id="vcart-items"><div class="vcart-empty"><i class="fas fa-shopping-bag"></i><p>Your cart is empty</p></div></div>' +
        '<div class="vcart-footer">' +
          '<div class="vcart-row"><span style="color:#6b7280;font-size:14px">Total</span><span id="vcart-total" style="font-size:20px;font-weight:800">ZMW 0</span></div>' +
          '<button class="vcart-btn" id="vcart-checkout-btn" onclick="window.VeloraCart.goCheckout()">Checkout</button>' +
          '<button onclick="window.VeloraCart.clear()" style="margin-top:8px;background:none;border:none;color:#9ca3af;font-size:12px;cursor:pointer;width:100%">Clear Cart</button>' +
        '</div>' +
      '</div>' +
      '<div id="vcheckout-overlay" onclick="window.VeloraCart.closeCheckout()"></div>' +
      '<div id="vcheckout-panel">' +
        '<div class="vcheck-header">' +
          '<div style="display:flex;align-items:center;gap:12px">' +
            '<div style="width:36px;height:36px;background:linear-gradient(135deg,#0D47FF,#0a2dbd);border-radius:10px;display:flex;align-items:center;justify-content:center"><i class="fas fa-credit-card" style="color:#fff;font-size:14px"></i></div>' +
            '<div><div style="font-weight:700;font-size:14px">Checkout</div><div style="font-size:12px;color:#6b7280">Review and place your order</div></div>' +
          '</div>' +
          '<button onclick="window.VeloraCart.closeCheckout()" style="width:32px;height:32px;border-radius:50%;border:none;background:#f3f4f6;cursor:pointer"><i class="fas fa-times" style="color:#6b7280"></i></button>' +
        '</div>' +
        '<div class="vcheck-body" id="vcheckout-body"></div>' +
        '<div class="vcheck-footer" id="vcheckout-footer" style="display:none"></div>' +
      '</div>';
    while (div.firstChild) document.body.appendChild(div.firstChild);
  }

  // ===== 3. CART LOGIC =====
  var Cart = {

    get: function() {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
      catch(e) { return []; }
    },

    save: function(cart) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
      this._render();
      this._updateBadges();
    },

    add: function(item) {
      var cart = this.get();
      var existing = cart.find(function(c) {
        return c.product_id === item.product_id && c.model === item.model && c.storage === item.storage && c.color === item.color;
      });
      if (existing) { existing.quantity += (item.quantity || 1); }
      else { item.quantity = item.quantity || 1; cart.push(item); }
      this.save(cart);
      this.open();
    },

    remove: function(index) {
      var cart = this.get(); cart.splice(index, 1); this.save(cart);
    },

    qty: function(index, delta) {
      var cart = this.get();
      if (cart[index]) { cart[index].quantity = Math.max(1, (cart[index].quantity || 1) + delta); this.save(cart); }
    },

    clear: function() {
      if (!this.get().length) return;
      if (!confirm('Clear your cart?')) return;
      localStorage.removeItem(STORAGE_KEY);
      this._render(); this._updateBadges();
    },

    total: function() {
      return this.get().reduce(function(s, i) { return s + ((i.unit_price || 0) * (i.quantity || 1)); }, 0);
    },

    count: function() {
      return this.get().reduce(function(s, i) { return s + (i.quantity || 1); }, 0);
    },

    open: function() {
      document.getElementById('vcart-panel').classList.add('vcart-open');
      document.getElementById('vcart-overlay').classList.add('vcart-open');
      document.body.style.overflow = 'hidden';
      this._render();
    },

    close: function() {
      document.getElementById('vcart-panel').classList.remove('vcart-open');
      document.getElementById('vcart-overlay').classList.remove('vcart-open');
      if (!document.getElementById('vcheckout-panel').classList.contains('vcart-open')) {
        document.body.style.overflow = '';
      }
    },

    // ===== CHECKOUT =====
    goCheckout: function() {
      if (!this.count()) { alert('Your cart is empty'); return; }
      this.close();
      this._renderCheckoutFormAsync();
      document.getElementById('vcheckout-panel').classList.add('vcart-open');
      document.getElementById('vcheckout-overlay').classList.add('vcart-open');
      document.body.style.overflow = 'hidden';
    },

    closeCheckout: function() {
      document.getElementById('vcheckout-panel').classList.remove('vcart-open');
      document.getElementById('vcheckout-overlay').classList.remove('vcart-open');
      document.body.style.overflow = '';
    },

    _buildAddressSelect: function(addresses, currentVal) {
      if (!addresses.length) return '';
      var html = '<select id="vchk-address-select" class="vcheck-input" onchange="window.VeloraCart._onAddressSelect(this)" style="margin-bottom:6px;cursor:pointer">';
      html += '<option value="">-- Choose a saved address --</option>';
      addresses.forEach(function(addr, idx) {
        var selected = (addr === currentVal) ? ' selected' : '';
        var label = idx === 0 ? 'Primary: ' + addr : 'Address ' + idx + ': ' + addr;
        html += '<option value="' + escapeHtml(addr) + '"' + selected + '>' + escapeHtml(label.substring(0, 60)) + '</option>';
      });
      html += '<option value="__new__">+ Enter a new address</option>';
      html += '</select>';
      return html;
    },

    _onAddressSelect: function(select) {
      var val = select.value;
      var textarea = document.getElementById('vchk-address');
      if (val === '__new__') {
        textarea.value = '';
        textarea.style.display = 'block';
        textarea.focus();
      } else if (val) {
        textarea.value = val;
        textarea.style.display = 'none';
      } else {
        textarea.style.display = 'block';
      }
    },

    // Async: fetches profile from Supabase first, then renders form
    _renderCheckoutFormAsync: async function() {
      var container = document.getElementById('vcheckout-body');
      var footer = document.getElementById('vcheckout-footer');
      var cart = this.get();
      var total = this.total();
      var user = getSession();
      var isLoggedIn = !!user;

      // Build order summary (same regardless)
      var itemsHtml = '';
      cart.forEach(function(item) {
        var opts = [item.model, item.storage, item.color].filter(Boolean).join(' / ');
        var itemTotal = (item.unit_price || 0) * (item.quantity || 1);
        itemsHtml += '<div class="vcheck-item">' +
          '<img src="' + (item.image || '') + '" onerror="this.style.display=\'none\'">' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:600;font-size:13px">' + (item.name || '') + '</div>' +
            '<div style="font-size:11px;color:#6b7280">' + opts + '</div>' +
            '<div style="font-size:11px;color:#6b7280">Qty: ' + (item.quantity || 1) + ' x ZMW ' + (item.unit_price || 0).toLocaleString() + '</div>' +
          '</div>' +
          '<div style="font-weight:700;font-size:14px;flex-shrink:0;color:#0D47FF">ZMW ' + itemTotal.toLocaleString() + '</div>' +
        '</div>';
      });

      // Show loading state immediately
      container.innerHTML =
        '<div class="vcheck-section">' +
          '<h3><i class="fas fa-box" style="margin-right:6px;color:#0D47FF"></i>Order Summary (' + cart.length + ' item' + (cart.length > 1 ? 's' : '') + ')</h3>' +
          itemsHtml +
          '<div class="vcheck-total"><span>Order Total</span><span>ZMW ' + total.toLocaleString() + '</span></div>' +
        '</div>' +
        '<div class="vcheck-section" id="delivery-loading">' +
          '<h3><i class="fas fa-truck" style="margin-right:6px;color:#0D47FF"></i>Delivery Details</h3>' +
          '<div class="text-center py-8 text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>Loading your details...</div>' +
        '</div>';
      footer.style.display = 'none';

      // Fetch profile from Supabase if logged in
      var profile = {};
      console.log('[VeloraCart] Checkout — logged in:', isLoggedIn, 'user:', user ? user.id : 'none');
      if (isLoggedIn) {
        var sb = getSupabase();
        console.log('[VeloraCart] Supabase client:', sb ? 'found' : 'NOT FOUND');
        if (sb) {
          try {
            console.log('[VeloraCart] Querying customer_profiles for user:', user.id);
            var r = await sb.from('customer_profiles')
              .select('full_name, phone, address, extra_addresses')
              .eq('id', user.id)
              .maybeSingle();
            console.log('[VeloraCart] Query result:', r.error ? 'ERROR: ' + r.error.message : (r.data ? 'got data' : 'no data'));
            if (r.data) {
              profile = r.data;
              console.log('[VeloraCart] Profile loaded — address:', profile.address, 'extras:', JSON.stringify(profile.extra_addresses));
              try { localStorage.setItem('velora-profile', JSON.stringify(profile)); } catch(e) {}
            }
          } catch(e) { console.error('[VeloraCart] Query exception:', e); }
        }
      }
      // Fallback to localStorage cache
      if (!profile.address && !profile.extra_addresses) {
        profile = getProfile();
        console.log('[VeloraCart] Fallback to localStorage — address:', profile.address, 'extras:', JSON.stringify(profile.extra_addresses));
      }

      // Build user data
      var userData = { name: '', phone: '', address: '' };
      if (isLoggedIn) {
        userData.name = (user.user_metadata && user.user_metadata.full_name) || profile.full_name || '';
        userData.phone = (user.user_metadata && user.user_metadata.phone) || profile.phone || '';
      }
      userData.address = profile.address || '';

      // Collect saved addresses
      var savedAddresses = [];
      if (profile.address) savedAddresses.push(profile.address);
      if (profile.extra_addresses && Array.isArray(profile.extra_addresses)) {
        profile.extra_addresses.forEach(function(a) { if (a) savedAddresses.push(a); });
      }

      // Build delivery section
      var deliverySection = '';
      if (isLoggedIn && savedAddresses.length > 0) {
        // Has saved addresses — clean auto-select
        var addressSelect = this._buildAddressSelect(savedAddresses, userData.address);
        deliverySection =
          '<div style="background:#f0f4ff;border:1px solid #dbeafe;border-radius:10px;padding:14px;margin-bottom:12px">' +
            '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">' +
              '<div class="avatar-sm" style="width:32px;height:32px;font-size:13px;background:linear-gradient(135deg,#0D47FF,#0a2dbd);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600">' + getInitials(userData.name) + '</div>' +
              '<div>' +
                '<p style="font-weight:600;font-size:13px;color:#111">' + escapeHtml(userData.name || 'Customer') + '</p>' +
                '<p style="font-size:12px;color:#6b7280">' + escapeHtml(userData.phone) + '</p>' +
              '</div>' +
            '</div>' +
            '<label class="vcheck-label">Deliver to</label>' +
            addressSelect +
            '<textarea id="vchk-address" class="vcheck-input" placeholder="Street, Area, City, Province..." rows="2" style="resize:vertical;font-family:inherit;display:none;margin-top:6px"></textarea>' +
          '</div>' +
          '<input type="hidden" id="vchk-name" value="' + escapeHtml(userData.name) + '">' +
          '<input type="hidden" id="vchk-phone" value="' + escapeHtml(userData.phone) + '">';
      } else if (isLoggedIn) {
        // Logged in, no addresses
        deliverySection =
          '<div class="vcheck-login-note" style="margin-bottom:10px"><i class="fas fa-info-circle" style="margin-right:6px"></i>No saved addresses yet. Add one below or save it in your <a href="customer-dashboard.html" onclick="window.VeloraCart.closeCheckout()">dashboard</a> later.</div>' +
          '<label class="vcheck-label">Full Name *</label>' +
          '<input type="text" id="vchk-name" class="vcheck-input" placeholder="e.g. John Banda" value="' + escapeHtml(userData.name) + '">' +
          '<label class="vcheck-label">Phone Number *</label>' +
          '<input type="tel" id="vchk-phone" class="vcheck-input" placeholder="e.g. 0977123456" value="' + escapeHtml(userData.phone) + '">' +
          '<label class="vcheck-label">Delivery Address *</label>' +
          '<textarea id="vchk-address" class="vcheck-input" placeholder="Street, Area, City, Province..." rows="3" style="resize:vertical;font-family:inherit"></textarea>';
      } else {
        // Guest
        deliverySection =
          '<label class="vcheck-label">Full Name *</label>' +
          '<input type="text" id="vchk-name" class="vcheck-input" placeholder="e.g. John Banda">' +
          '<label class="vcheck-label">Phone Number *</label>' +
          '<input type="tel" id="vchk-phone" class="vcheck-input" placeholder="e.g. 0977123456">' +
          '<label class="vcheck-label">Delivery Address *</label>' +
          '<textarea id="vchk-address" class="vcheck-input" placeholder="Street, Area, City, Province..." rows="3" style="resize:vertical;font-family:inherit"></textarea>';
      }

      // Notice
      var notice = '';
      if (isLoggedIn) {
        notice = '<div class="vcheck-login-note" style="margin-bottom:12px"><i class="fas fa-check-circle" style="margin-right:6px"></i>Your order will be saved to your account. Just review and place.</div>';
      } else {
        notice = '<div class="vcheck-guest-note" style="margin-bottom:12px"><i class="fas fa-info-circle" style="margin-right:6px"></i>You are checking out as a guest. <a href="customer-dashboard.html" onclick="window.VeloraCart.closeCheckout()" style="color:#0D47FF;font-weight:600">Create an account</a> after ordering to track your orders.</div>';
      }

      // Replace loading with actual form
      var loadingEl = document.getElementById('delivery-loading');
      if (loadingEl) {
        loadingEl.innerHTML =
          '<h3><i class="fas fa-truck" style="margin-right:6px;color:#0D47FF"></i>Delivery Details</h3>' +
          notice +
          deliverySection;
      }

      // ===== PAYMENT SECTION: WhatsApp Manual Checkout =====
      var paymentSection =
        '<div class="vcheck-section">' +
          '<h3><i class="fab fa-whatsapp" style="margin-right:6px;color:#25D366"></i>Complete Your Order</h3>' +
          '<div class="vcheck-payment-row selected" onclick="selectPayment(this)" data-method="whatsapp">' +
            '<i class="fab fa-whatsapp" style="color:#25D366;font-size:18px"></i>' +
            '<div>' +
              '<div style="font-weight:600;font-size:13px">Pay via WhatsApp</div>' +
              '<div style="font-size:11px;color:#6b7280">Send payment to Velora. We will confirm your order.</div>' +
            '</div>' +
          '</div>' +
          '<div class="vcheck-payment-row" onclick="selectPayment(this)" data-method="cash_on_delivery">' +
            '<i class="fas fa-hand-holding-usd text-green-600" style="font-size:18px"></i>' +
            '<div>' +
              '<div style="font-weight:600;font-size:13px">Cash on Delivery</div>' +
              '<div style="font-size:11px;color:#6b7280">Pay when your order arrives at your door.</div>' +
            '</div>' +
          '</div>' +
          '<div style="margin-top:12px;padding:12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;font-size:12px;color:#166534">' +
            '<i class="fas fa-info-circle" style="margin-right:6px"></i>' +
            '<strong>How it works:</strong> Click "Place Order" to open WhatsApp with your order details. Send the message and make payment (MoMo / Airtel Money / Bank). We will confirm your order within minutes.' +
          '</div>' +
        '</div>';

      // Insert payment section after delivery section
      if (loadingEl) {
        loadingEl.insertAdjacentHTML('afterend', paymentSection);
      } else {
        container.insertAdjacentHTML('beforeend', paymentSection);
      }

      footer.style.display = 'block';
      var btnLabel = 'Place Order via WhatsApp &mdash; ZMW ' + total.toLocaleString();
      footer.innerHTML =
        '<button class="vcart-btn" id="vchk-place-btn" onclick="window.VeloraCart.placeOrder()" style="background:linear-gradient(135deg,#25D366,#128C7E)">' + btnLabel + '</button>' +
        '<button onclick="window.VeloraCart.closeCheckout();window.VeloraCart.open();" style="margin-top:8px;background:none;border:none;color:#6b7280;font-size:12px;cursor:pointer;width:100%;padding:8px"><i class="fas fa-arrow-left" style="margin-right:4px"></i>Back to Cart</button>';
    },

    placeOrder: function() {
      var name = document.getElementById('vchk-name').value.trim();
      var phone = document.getElementById('vchk-phone').value.trim();

      // Get address: from dropdown (logged-in) or textarea (guest / new address)
      var address = '';
      var addrSelect = document.getElementById('vchk-address-select');
      if (addrSelect && addrSelect.value && addrSelect.value !== '__new__') {
        address = addrSelect.value.trim();
      } else {
        address = document.getElementById('vchk-address').value.trim();
      }

      if (!name) { alert('Please enter your full name'); var el = document.getElementById('vchk-name'); if(el) el.focus(); return; }
      if (!phone) { alert('Please enter your phone number'); var el = document.getElementById('vchk-phone'); if(el) el.focus(); return; }
      if (!address) { alert('Please enter your delivery address'); var el = document.getElementById('vchk-address'); if(el) el.focus(); return; }

      // Get selected payment method
      var paymentMethod = 'cash_on_delivery';
      var selectedPay = document.querySelector('.vcheck-payment-row.selected');
      if (selectedPay) paymentMethod = selectedPay.getAttribute('data-method');

      // Route to appropriate checkout flow
      if (paymentMethod === 'whatsapp') {
        this._checkoutViaWhatsApp(name, phone, address);
      } else if (paymentMethod === 'flutterwave' && FLUTTERWAVE_ENABLED) {
        this._payWithFlutterwave(name, phone, address);
      } else {
        this._placeCODOrder(name, phone, address, paymentMethod);
      }
    },

    // ===== WHATSAPP CHECKOUT =====
    _checkoutViaWhatsApp: function(name, phone, address) {
      var btn = document.getElementById('vchk-place-btn');
      if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:6px"></i>Preparing Order...'; }

      var cart = this.get();
      var total = this.total();
      var Cart = this;
      var orderRef = 'VLR-' + Date.now().toString().slice(-6);

      // Group items by vendor
      var byVendor = {};
      cart.forEach(function(item) {
        var vid = item.vendor_id || 'velora-electronics';
        if (!byVendor[vid]) byVendor[vid] = [];
        byVendor[vid].push({
          product_name: item.name, product_id: item.product_id,
          model: item.model, storage: item.storage, color: item.color,
          quantity: item.quantity || 1, price_each: item.unit_price || 0,
          total: (item.unit_price || 0) * (item.quantity || 1)
        });
      });

      // Save order first (Supabase or localStorage)
      var sb = getSupabase();
      if (sb) {
        Cart._fetchVendorDetails(Object.keys(byVendor), function(vendorDetails) {
          var userId = getCustomerId();
          var orderInserts = Object.keys(byVendor).map(function(vendorId) {
            var items = byVendor[vendorId];
            var vTotal = items.reduce(function(s, it) { return s + it.total; }, 0);
            var vd = vendorDetails[vendorId] || {};
            var rate = vd.rate || 10;
            var commission = Math.round(vTotal * (rate / 100));
            var payout = vTotal - commission;
            return {
              vendor_id: vendorId, items: items,
              total_amount: vTotal, subtotal: vTotal, total: vTotal,
              commission_rate: rate, commission_amount: commission, vendor_payout: payout,
              status: 'pending', delivery_address: address,
              customer_phone: phone, payment_method: 'whatsapp',
              guest_name: name, guest_phone: phone,
              customer_id: userId, transaction_ref: orderRef
            };
          });

          sb.from('orders').insert(orderInserts).select('order_ref').then(function(result) {
            var refs = [];
            if (!result.error && result.data) {
              refs = result.data.map(function(r) { return r.order_ref; }).filter(Boolean);
            }
            Cart._openWhatsApp(name, phone, address, orderRef, refs);
          }).catch(function() {
            Cart._openWhatsApp(name, phone, address, orderRef, []);
          });
        });
      } else {
        // No Supabase — just open WhatsApp
        Cart._openWhatsApp(name, phone, address, orderRef, []);
      }
    },

    _openWhatsApp: function(name, phone, address, orderRef, savedRefs) {
      var cart = this.get();
      var total = this.total();
      var Cart = this;

      // Build WhatsApp message
      var itemsText = cart.map(function(item, idx) {
        var opts = [item.model, item.storage, item.color].filter(Boolean).join(' / ');
        return (idx + 1) + '. ' + item.name + (opts ? ' (' + opts + ')' : '') + ' \u00d7 ' + item.quantity + ' = ZMW ' + ((item.unit_price || 0) * (item.quantity || 1)).toLocaleString();
      }).join('\n');

      var message =
        'Hi Velora! I would like to place an order.\n\n' +
        '*Order Ref:* ' + orderRef + '\n' +
        '*Name:* ' + name + '\n' +
        '*Phone:* ' + phone + '\n' +
        '*Address:* ' + address + '\n\n' +
        '*Order Details:*\n' + itemsText + '\n\n' +
        '*Total: ZMW ' + total.toLocaleString() + '*\n\n' +
        'Please confirm my order and send payment details. Thank you!';

      // Encode for WhatsApp URL
      var encodedMsg = encodeURIComponent(message);
      var whatsappUrl = 'https://wa.me/' + VELORA_WHATSAPP + '?text=' + encodedMsg;

      // Show "opening WhatsApp" UI
      var container = document.getElementById('vcheckout-body');
      var footer = document.getElementById('vcheckout-footer');
      footer.style.display = 'none';

      var refHtml = savedRefs && savedRefs.length ? '<div class="order-ref">Order Ref: ' + savedRefs.join(', ') + '</div>' : '<div class="order-ref">Order Ref: ' + orderRef + '</div>';

      container.innerHTML =
        '<div class="vcheck-success">' +
          '<div style="display:inline-flex;align-items:center;gap:8px;padding:6px 16px;background:#fef3c7;border:1px solid #fcd34d;border-radius:999px;margin-bottom:12px">' +
            '<span style="width:8px;height:8px;background:#f59e0b;border-radius:50%;display:inline-block"></span>' +
            '<span style="font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.5px">Status: Pending Payment</span>' +
          '</div>' +
          '<i class="fab fa-whatsapp" style="color:#25D366;font-size:48px;margin-bottom:8px"></i>' +
          '<h2>Complete Your Payment</h2>' +
          '<p>Your order has been placed. Now send payment via WhatsApp.</p>' +
          refHtml +
          '<p style="margin-top:8px;font-size:18px;color:#0D47FF;font-weight:800">ZMW ' + total.toLocaleString() + '</p>' +
          '<div style="margin-top:16px;padding:14px;background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;text-align:left;font-size:13px;color:#78350f">' +
            '<p style="margin-bottom:8px;font-weight:700"><i class="fas fa-credit-card" style="margin-right:6px"></i>How to Pay:</p>' +
            '<ol style="padding-left:18px;margin:0;line-height:1.8">' +
              '<li>Click <strong>Open WhatsApp</strong> below</li>' +
              '<li>Send us the pre-filled order message</li>' +
              '<li>We will send you MoMo / Airtel Money / Bank details</li>' +
              '<li>Make your payment</li>' +
              '<li>We will confirm and your order status will change to <strong>Confirmed</strong></li>' +
            '</ol>' +
          '</div>' +
          '<a href="' + whatsappUrl + '" target="_blank" class="vcart-btn" style="margin-top:20px;display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#25D366,#128C7E);text-decoration:none">' +
            '<i class="fab fa-whatsapp"></i> Open WhatsApp to Pay' +
          '</a>' +
          '<div style="margin-top:12px;font-size:12px;color:#6b7280">' +
            '<i class="fas fa-phone mr-1"></i>WhatsApp: 0966172411' +
          '</div>' +
          '<button onclick="window.VeloraCart.closeCheckout();" style="margin-top:12px;background:none;border:none;color:#6b7280;font-size:13px;cursor:pointer;padding:8px">Continue Shopping</button>' +
        '</div>';

      // Save to localStorage as backup (without triggering _showOrderSuccess)
      var localOrders = JSON.parse(localStorage.getItem('velora-orders') || '[]');
      var backupOrder = {
        id: 'local-' + Date.now(),
        order_ref: orderRef,
        name: name, phone: phone, address: address,
        items: cart, total: total,
        payment_method: 'whatsapp',
        transaction_ref: orderRef,
        created_at: new Date().toISOString(),
        status: 'pending',
        commission_rate: 10,
        commission_amount: Math.round(total * 0.1),
        vendor_payout: Math.round(total * 0.9)
      };
      localOrders.push(backupOrder);
      localStorage.setItem('velora-orders', JSON.stringify(localOrders));
      // Clear cart and update badges
      localStorage.removeItem(STORAGE_KEY);
      this._updateBadges();
    },

    // ===== FLUTTERWAVE CHECKOUT =====
    _payWithFlutterwave: function(name, phone, address) {
      var Cart = this;
      var cart = this.get();
      var total = this.total();
      var btn = document.getElementById('vchk-place-btn');
      if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:6px"></i>Preparing Payment...'; }

      // Load Flutterwave script if not loaded
      if (!window.FlutterwaveCheckout) {
        var script = document.createElement('script');
        script.src = 'https://checkout.flutterwave.com/v3.js';
        script.onload = function() { Cart._openFlutterwave(name, phone, address); };
        script.onerror = function() {
          alert('Payment service unavailable. Please try Cash on Delivery.');
          if (btn) { btn.disabled = false; btn.innerHTML = 'Place Order &mdash; ZMW ' + total.toLocaleString(); }
        };
        document.head.appendChild(script);
      } else {
        this._openFlutterwave(name, phone, address);
      }
    },

    _openFlutterwave: function(name, phone, address) {
      var Cart = this;
      var cart = this.get();
      var total = this.total();
      var user = getSession();
      var cartItemsDesc = cart.map(function(i) { return i.name + ' x' + i.quantity; }).join(', ');

      // Group items by vendor
      var byVendor = {};
      cart.forEach(function(item) {
        var vid = item.vendor_id || 'velora-electronics';
        if (!byVendor[vid]) byVendor[vid] = [];
        byVendor[vid].push({
          product_name: item.name, product_id: item.product_id,
          model: item.model, storage: item.storage, color: item.color,
          quantity: item.quantity || 1, price_each: item.unit_price || 0,
          total: (item.unit_price || 0) * (item.quantity || 1)
        });
      });

      // Fetch vendor commission rates + subaccount IDs
      Cart._fetchVendorDetails(Object.keys(byVendor), function(vendorDetails) {
        // Build subaccounts for automatic splitting
        var subaccounts = [];
        Object.keys(byVendor).forEach(function(vid) {
          var items = byVendor[vid];
          var vTotal = items.reduce(function(s, it) { return s + it.total; }, 0);
          var rate = (vendorDetails[vid] && vendorDetails[vid].rate) || 10;
          var payout = vTotal - Math.round(vTotal * (rate / 100));

          // If vendor has a Flutterwave subaccount, add to split
          var subId = vendorDetails[vid] && vendorDetails[vid].subaccount_id;
          if (subId) {
            var ratio = Math.floor((payout / total) * 100);
            if (ratio > 0) {
              subaccounts.push({ id: subId, transaction_split_ratio: ratio });
            }
          }
        });

        // Store order data for callback
        var checkoutRef = 'VLR-' + Date.now();
        window.__velora_pending_order = {
          ref: checkoutRef, name: name, phone: phone, address: address,
          cart: cart, byVendor: byVendor, total: total,
          vendorDetails: vendorDetails, subaccounts: subaccounts
        };

        // Show split info
        var splitInfo = document.getElementById('fw-vendor-split-info');
        if (splitInfo) {
          splitInfo.style.display = 'block';
          splitInfo.innerHTML = '<i class="fas fa-check-circle" style="margin-right:4px"></i>' +
            (subaccounts.length ? subaccounts.length + ' vendor(s) will be paid instantly. Velora keeps commission.' : 'Payment will be collected. Set up vendor subaccounts for automatic splitting.');
        }

        // Open Flutterwave checkout
        window.FlutterwaveCheckout({
          public_key: FLUTTERWAVE_PUBLIC_KEY,
          tx_ref: checkoutRef,
          amount: total,
          currency: 'ZMW',
          payment_options: 'card,mobilemoneyzambia,mpesa,ussd,bank_transfer',
          redirect_url: '', // Use callback instead
          customer: { email: phone + '@velora.market', phone_number: phone, name: name },
          customizations: { title: 'Velora Market', description: cartItemsDesc.substring(0, 160), logo: '' },
          subaccounts: subaccounts, // AUTOMATIC SPLIT: vendor gets their share instantly
          callback: function(response) {
            Cart._onFlutterwaveSuccess(response);
          },
          onclose: function() {
            var btn = document.getElementById('vchk-place-btn');
            if (btn) { btn.disabled = false; btn.innerHTML = 'Pay ZMW ' + total.toLocaleString(); }
          }
        });

        var btn = document.getElementById('vchk-place-btn');
        if (btn) { btn.disabled = false; btn.innerHTML = 'Complete Payment in Popup...'; }
      });
    },

    _onFlutterwaveSuccess: function(response) {
      var Cart = this;
      var pending = window.__velora_pending_order;
      if (!pending) { alert('Payment confirmed but order data lost. Contact support.'); return; }

      var status = response.status;
      var txRef = response.tx_ref || pending.ref;
      var flwRef = response.flw_ref || '';
      var transactionId = response.transaction_id || '';

      if (status !== 'successful') {
        alert('Payment was not completed. Status: ' + status);
        return;
      }

      // Save orders to Supabase
      var sb = getSupabase();
      if (!sb) {
        Cart._saveOrderLocal({ name: pending.name, phone: pending.phone, address: pending.address, items: pending.cart, total: pending.total, payment_method: 'flutterwave', transaction_ref: txRef, flw_ref: flwRef });
        return;
      }

      var orderInserts = Object.keys(pending.byVendor).map(function(vendorId) {
        var items = pending.byVendor[vendorId];
        var vTotal = items.reduce(function(s, it) { return s + it.total; }, 0);
        var vd = pending.vendorDetails[vendorId] || {};
        var rate = vd.rate || 10;
        var commission = Math.round(vTotal * (rate / 100));
        var payout = vTotal - commission;

        var userId = getCustomerId();
        return {
          vendor_id: vendorId, items: items,
          total_amount: vTotal, subtotal: vTotal, total: vTotal,
          commission_rate: rate, commission_amount: commission, vendor_payout: payout,
          status: 'confirmed', // Paid via Flutterwave = confirmed
          delivery_address: pending.address,
          customer_phone: pending.phone,
          customer_id: userId,
          payment_method: 'flutterwave',
          transaction_ref: txRef,
          flw_ref: flwRef,
          flw_transaction_id: transactionId,
          guest_name: pending.name, guest_phone: pending.phone
        };
      });

      sb.from('orders').insert(orderInserts).select('order_ref').then(function(result) {
        if (result.error) {
          console.error('Order insert error:', result.error);
          Cart._saveOrderLocal({ name: pending.name, phone: pending.phone, address: pending.address, items: pending.cart, total: pending.total, payment_method: 'flutterwave', transaction_ref: txRef });
        } else {
          var refs = (result.data || []).map(function(r) { return r.order_ref; }).filter(Boolean);
          Cart._showOrderSuccess(pending.total, refs);
          window.__velora_pending_order = null;
          Cart.clear();
        }
      }).catch(function(err) {
        console.error('Order save failed:', err);
        Cart._saveOrderLocal({ name: pending.name, phone: pending.phone, address: pending.address, items: pending.cart, total: pending.total, payment_method: 'flutterwave', transaction_ref: txRef });
      });
    },

    _fetchVendorDetails: function(vendorIds, callback) {
      var sb = getSupabase();
      var map = {};
      vendorIds.forEach(function(vid) { map[vid] = { rate: 10, subaccount_id: '' }; });
      if (!sb) { callback(map); return; }

      sb.from('vendors').select('id,settings').in('id', vendorIds).then(function(result) {
        if (result.data) {
          result.data.forEach(function(v) {
            var rate = 10;
            var subId = '';
            if (v.settings) {
              if (v.settings.commission_rate) rate = parseFloat(v.settings.commission_rate) || 10;
              if (v.settings.flutterwave_subaccount_id) subId = v.settings.flutterwave_subaccount_id;
            }
            map[v.id] = { rate: rate, subaccount_id: subId };
          });
        }
        callback(map);
      }).catch(function() { callback(map); });
    },

    // ===== COD / LEGACY ORDER PLACEMENT =====
    _placeCODOrder: function(name, phone, address, paymentMethod) {
      var btn = document.getElementById('vchk-place-btn');
      if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:6px"></i>Placing Order...'; }

      var cart = this.get();
      var total = this.total();
      var Cart = this;

      // Group items by vendor
      var byVendor = {};
      cart.forEach(function(item) {
        var vid = item.vendor_id || 'velora-electronics';
        if (!byVendor[vid]) byVendor[vid] = [];
        byVendor[vid].push({
          product_name: item.name, product_id: item.product_id,
          model: item.model, storage: item.storage, color: item.color,
          quantity: item.quantity || 1, price_each: item.unit_price || 0,
          total: (item.unit_price || 0) * (item.quantity || 1)
        });
      });

      var sb = getSupabase();
      if (!sb) {
        this._saveOrderLocal({ name: name, phone: phone, address: address, items: cart, total: total, payment_method: paymentMethod });
        return;
      }

      Cart._fetchVendorDetails(Object.keys(byVendor), function(vendorDetails) {
        var orderInserts = Object.keys(byVendor).map(function(vendorId) {
          var items = byVendor[vendorId];
          var vendorTotal = items.reduce(function(s, it) { return s + it.total; }, 0);
          var vd = vendorDetails[vendorId] || {};
          var rate = vd.rate || 10;
          var commission = Math.round(vendorTotal * (rate / 100));
          var payout = vendorTotal - commission;

          var userId = getCustomerId();
          var orderData = {
            vendor_id: vendorId, items: items,
            total_amount: vendorTotal, subtotal: vendorTotal, total: vendorTotal,
            commission_rate: rate, commission_amount: commission, vendor_payout: payout,
            status: 'pending', delivery_address: address,
            customer_phone: phone, payment_method: paymentMethod,
            guest_name: name, guest_phone: phone,
            customer_id: userId
          };
          return orderData;
        });

        sb.from('orders').insert(orderInserts).select('order_ref').then(function(result) {
          if (result.error) {
            if (result.error.message && result.error.message.indexOf('commission') > -1) {
              var fallbackInserts = orderInserts.map(function(o) {
                return {
                  vendor_id: o.vendor_id, items: o.items,
                  total_amount: o.total_amount, subtotal: o.subtotal, total: o.total,
                  status: o.status, delivery_address: o.delivery_address,
                  customer_phone: o.customer_phone, payment_method: o.payment_method,
                  guest_name: o.guest_name, guest_phone: o.guest_phone,
                  shipping_notes: 'Commission: ' + o.commission_rate + '% = ZMW ' + o.commission_amount + ' | Vendor gets: ZMW ' + o.vendor_payout
                };
              });
              sb.from('orders').insert(fallbackInserts).select('order_ref').then(function(r2) {
                if (r2.error) { Cart._saveOrderLocal({ name: name, phone: phone, address: address, items: cart, total: total, payment_method: paymentMethod }); }
                else { var refs = (r2.data || []).map(function(r) { return r.order_ref; }).filter(Boolean); Cart._showOrderSuccess(total, refs); }
              });
            } else {
              Cart._saveOrderLocal({ name: name, phone: phone, address: address, items: cart, total: total, payment_method: paymentMethod });
            }
          } else {
            var refs = (result.data || []).map(function(r) { return r.order_ref; }).filter(Boolean);
            Cart._showOrderSuccess(total, refs);
          }
        }).catch(function() { Cart._saveOrderLocal({ name: name, phone: phone, address: address, items: cart, total: total, payment_method: paymentMethod }); });
      });
    },



    _saveOrderLocal: function(order) {
      var orders = JSON.parse(localStorage.getItem('velora-orders') || '[]');
      order.id = 'local-' + Date.now();
      order.order_ref = 'VLR-L' + Date.now().toString().slice(-6);
      order.created_at = new Date().toISOString();
      order.status = 'pending';
      // Calculate commission if not already set
      if (!order.commission_amount && order.total) {
        var rate = order.commission_rate || 10;
        order.commission_rate = rate;
        order.commission_amount = Math.round(order.total * (rate / 100));
        order.vendor_payout = order.total - order.commission_amount;
      }
      orders.push(order);
      localStorage.setItem('velora-orders', JSON.stringify(orders));
      this._showOrderSuccess(order.total, [order.order_ref]);
    },

    _showOrderSuccess: function(total, refs) {
      localStorage.removeItem(STORAGE_KEY);
      this._updateBadges();

      var container = document.getElementById('vcheckout-body');
      var footer = document.getElementById('vcheckout-footer');
      footer.style.display = 'none';

      var refHtml = refs && refs.length ? '<div class="order-ref">Order Ref: ' + refs.join(', ') + '</div>' : '';

      var user = getSession();
      var isLoggedIn = !!user;
      var dashboardLink = isLoggedIn
        ? '<a href="customer-dashboard.html" onclick="window.VeloraCart.closeCheckout()" style="display:block;margin-top:12px;color:#0D47FF;font-size:13px;font-weight:600">View My Orders &rarr;</a>'
        : '<a href="customer-dashboard.html" onclick="window.VeloraCart.closeCheckout()" style="display:block;margin-top:12px;color:#0D47FF;font-size:13px;font-weight:600">Create Account to Track Orders &rarr;</a>';

      var whatsappHelp = 'https://wa.me/' + VELORA_WHATSAPP + '?text=' + encodeURIComponent('Hi Velora, I have a question about my order.');

      container.innerHTML =
        '<div class="vcheck-success">' +
          '<i class="fas fa-check-circle"></i>' +
          '<h2>Order Placed Successfully!</h2>' +
          '<p>Thank you for your order.</p>' +
          refHtml +
          '<p>Total: <strong style="color:#0D47FF;font-size:18px">ZMW ' + (total || 0).toLocaleString() + '</strong></p>' +
          '<div style="margin-top:16px;padding:14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;font-size:12px;color:#166534;text-align:left">' +
            '<p style="font-weight:600;margin-bottom:6px"><i class="fas fa-info-circle" style="margin-right:6px"></i>What happens next?</p>' +
            '<ol style="padding-left:18px;margin:0;line-height:1.7">' +
              '<li>We will call you to confirm your order</li>' +
              '<li>Your order will be delivered in 2-5 days</li>' +
              '<li>Pay cash when your order arrives</li>' +
            '</ol>' +
          '</div>' +
          '<a href="' + whatsappHelp + '" target="_blank" style="display:inline-flex;align-items:center;gap:6px;margin-top:12px;padding:8px 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;color:#166534;font-size:12px;font-weight:600;text-decoration:none">' +
            '<i class="fab fa-whatsapp" style="color:#25D366"></i> Questions? Chat on WhatsApp' +
          '</a>' +
          '<button onclick="window.VeloraCart.closeCheckout();" class="vcart-btn" style="margin-top:16px;max-width:240px">Continue Shopping</button>' +
          dashboardLink +
        '</div>';
    },

    // ===== INTERNAL =====
    _render: function() {
      var cart = this.get();
      var container = document.getElementById('vcart-items');
      var totalEl = document.getElementById('vcart-total');
      var countEl = document.getElementById('vcart-count-text');
      if (!container) return;
      totalEl.textContent = 'ZMW ' + this.total().toLocaleString();
      countEl.textContent = this.count();
      if (!cart.length) {
        container.innerHTML = '<div class="vcart-empty"><i class="fas fa-shopping-bag"></i><p>Your cart is empty</p><a href="velora-electronics.html" style="color:#0D47FF;font-size:13px;font-weight:600">Start Shopping</a></div>';
        return;
      }
      var html = '';
      cart.forEach(function(item, idx) {
        var opts = [item.model, item.storage, item.color].filter(Boolean).join(' / ');
        var total = (item.unit_price || 0) * (item.quantity || 1);
        html += '<div class="vcart-item">' +
          '<img src="' + (item.image || '') + '" onerror="this.style.display=\'none\'">' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (item.name || '') + '</div>' +
            '<div style="font-size:11px;color:#6b7280">' + opts + '</div>' +
            '<div class="vcart-qty">' +
              '<button onclick="window.VeloraCart.qty(' + idx + ',-1)"><i class="fas fa-minus"></i></button>' +
              '<span>' + (item.quantity || 1) + '</span>' +
              '<button onclick="window.VeloraCart.qty(' + idx + ',1)"><i class="fas fa-plus"></i></button>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;align-items:center;flex-shrink:0">' +
            '<span style="font-weight:700;font-size:14px;color:#0D47FF">ZMW ' + total.toLocaleString() + '</span>' +
            '<button class="vcart-trash" onclick="window.VeloraCart.remove(' + idx + ')"><i class="fas fa-trash"></i></button>' +
          '</div>' +
        '</div>';
      });
      container.innerHTML = html;
    },

    _updateBadges: function() {
      var count = this.count();
      var badges = document.querySelectorAll('.vcart-badge');
      badges.forEach(function(b) { b.textContent = count; b.classList.toggle('vcart-show', count > 0); });
    }
  };

  // Expose global
  window.VeloraCart = Cart;

  // Payment method selector helper
  window.selectPayment = function(el) {
    document.querySelectorAll('.vcheck-payment-row').forEach(function(r) { r.classList.remove('selected'); });
    el.classList.add('selected');
  };

  // HTML escape helper
  function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Get initials from name
  function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(function(n) { return n[0]; }).join('').toUpperCase().substring(0, 2);
  }

  // Init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { Cart._render(); Cart._updateBadges(); });
  } else {
    Cart._render(); Cart._updateBadges();
  }
})();