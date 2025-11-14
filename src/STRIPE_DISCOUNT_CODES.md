# Stripe Discount Codes Guide

## ✅ What Works

- **Discount codes can be created in Stripe Dashboard**
- **Users can apply discount codes during checkout**
- **100% discount codes work and set the total to £0.00**
- **Subscriptions are activated immediately after checkout**

## ⚠️ Important Limitation

**Payment method is ALWAYS collected, even with 100% discount codes.**

This is intentional behavior because:
1. The app uses a **14-day free trial** for all subscriptions
2. Stripe requires a payment method upfront for trials (to charge after trial ends)
3. With a 100% discount code, users will NOT be charged after the trial
4. But Stripe still collects the card details as a backup

## 🎯 How 100% Discount Codes Work

### For Users:
1. Click "Start Free Trial" on any plan
2. Stripe Checkout opens
3. Enter email address
4. **Card details form appears**
5. Click "Add promotion code"
6. Enter code (e.g., `CHICKENNOODLE`)
7. Click "Apply"
8. Total changes to £0.00
9. **Enter card details** (still required)
10. Click "Start trial"
11. Subscription is activated with 100% discount
12. **Card will never be charged** (unless discount expires)

### For Developers:
The card requirement cannot be removed because:
- `trial_period_days: 14` is set in the checkout session
- Stripe's policy requires payment method for trials
- Removing `payment_method_collection: 'if_required'` ensures card form always shows

## 🔧 Creating Discount Codes

### Step 1: Create a Coupon
1. Go to: https://dashboard.stripe.com/coupons
2. Click "+ Create coupon"
3. Set:
   - **Name**: Internal name (e.g., "100% Off Forever")
   - **Percent off**: 100%
   - **Duration**: Forever
4. Click "Create coupon"

### Step 2: Create a Promotion Code
1. After creating the coupon, scroll to "Promotion codes" section
2. Click the **"+" button**
3. Configure:
   - **Code**: What customers type (e.g., `CHICKENNOODLE`)
   - **Active**: ON
   - **Redeemable by**: Anyone (or limit as needed)
   - **Redemption limit**: Leave blank for unlimited
   - **Expiration**: Leave blank unless you want time limit
4. Click "Create promotion code"

### Step 3: Test
1. Go to your checkout page
2. Click "Add promotion code"
3. Enter the code
4. Total should show £0.00
5. Card details are still required
6. Complete checkout
7. Verify subscription is activated in app

## 🔍 Troubleshooting

### "Promotion code is invalid"
- Check the code is spelled correctly (case-sensitive)
- Verify the promotion code is "Active" in Stripe Dashboard
- Ensure the coupon is linked to the promotion code

### Card details still required with 100% discount
- This is expected behavior with trials
- Users won't be charged
- Card details are kept for security/verification

### Subscription not activating after checkout
- Wait 10-30 seconds for webhook processing
- Check Stripe webhooks are configured correctly
- Verify `STRIPE_WEBHOOK_SECRET` environment variable is set
- Check server logs for webhook errors

## 📚 Alternative: Skip Payment for 100% Discounts

If you absolutely must skip payment collection with discount codes, you would need to:

1. **Remove the free trial** from all plans
2. **Use two different checkout flows**:
   - Flow A (normal): With trial + payment required
   - Flow B (discount): No trial + `payment_method_collection: 'if_required'`
3. **Manually enter discount code in your app** (not in Stripe UI)
4. **Programmatically apply coupon** in backend before creating session
5. **Conditionally set payment collection** based on discount

This is complex and not recommended for most use cases.

## 🎯 Recommended Approach

**Keep the current implementation:**
- Always collect payment method
- Let users apply discount codes in Stripe checkout
- Accept that cards are collected but never charged with 100% discounts
- This is standard practice and what users expect from subscription services

Most SaaS apps work this way, including:
- Netflix
- Spotify  
- Adobe
- Microsoft 365

They all collect payment methods during free trials, even if promotional discounts apply.

---

**Last Updated**: November 2025
