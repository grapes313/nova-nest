# Velora Market - Launch Guide

## Files Included

| File | Description |
|------|-------------|
| `index.html` | Homepage with featured products & vendors |
| `velora-electronics.html` | Vendor store page with product grid |
| `product-detail.html` | Individual product page with add-to-cart |
| `search.html` | Universal product search |
| `customer-dashboard.html` | Customer account, cart, orders, checkout |
| `vendor-dashboard.html` | Vendor management (products, orders, earnings) |
| `admin-dashboard.html` | Admin panel (vendors, orders, commissions) |
| `vendor-application.html` | Vendor signup form |
| `cart.js` | Shared cart module |
| `404.html` | Custom error page |

## Pre-Launch Checklist

### 1. Supabase Setup
- [ ] Run `add-commission-columns.sql` in Supabase SQL Editor
- [ ] Verify RLS policies are enabled on all tables
- [ ] Confirm `products`, `orders`, `vendors` tables exist
- [ ] Test a product query from the anon key

### 2. Hosting Deployment
- [ ] Upload all 10 files to your hosting (Netlify/Cloudflare Pages/Vercel)
- [ ] Verify all pages load without 404 errors
- [ ] Test navigation between all pages
- [ ] Check mobile responsiveness on your phone

### 3. Checkout Testing
- [ ] Add a product to cart
- [ ] Go to customer dashboard → Cart → Proceed to Checkout
- [ ] Place a COD test order
- [ ] Verify order appears in customer dashboard
- [ ] Verify order appears in vendor dashboard
- [ ] Verify order appears in admin dashboard

### 4. Domain Setup (Optional for Tonight)
- [ ] Buy domain (Namecheap/Cloudflare ~$10-15)
- [ ] Add custom domain to hosting platform
- [ ] Update DNS records
- [ ] Wait for SSL certificate

### 5. Post-Launch
- [ ] Activate Flutterwave with live public key
- [ ] Replace test key in cart.js checkout flow
- [ ] Onboard first real vendors
- [ ] Set up WhatsApp Business for support
- [ ] Create social media pages

## Known Limitations
- Flutterwave payments need live key activation
- Vendor auth is password-based (upgrade to Supabase Auth later)
- Admin auth is password-based (upgrade to role-based later)
- No email notifications yet (use Supabase webhooks)

## Support
- Email: support@velora.market
- WhatsApp: +260966172411