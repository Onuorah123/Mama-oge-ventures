# Mama Oge Ventures storefront setup

The storefront is static HTML/CSS/JavaScript backed by Supabase for order creation and the private admin dashboard. The customer cart is saved in that browser; submitted orders are saved in Supabase. Product prices are checked again by the server before an order is saved.

## 1. Configure Supabase

1. Create a Supabase project.
2. Open the project's SQL Editor and run [`supabase/setup.sql`](./supabase/setup.sql) once. It creates the catalog and orders tables, adds the supplied NGN prices, and enables row-level security.
3. In Supabase Authentication, create the admin user with the email `donbobsky@gmail.com`, set a password, and confirm the email. To allow sign-in by phone too, enable the Phone provider and link a verified phone number to this same Auth user. Phone sign-in must use international format such as `+2348064234960`.
4. In the SQL Editor, give that account the server-managed admin role:

   ```sql
   update auth.users
   set raw_app_meta_data =
       coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
   where lower(email) = lower('donbobsky@gmail.com');
   ```

   Confirm that exactly one row was updated. Sign out and sign in again after changing the role so the new app-metadata claim is present in the session. Do not assign this role to public or customer accounts.
5. In Authentication URL configuration, add your deployed site URL and its `/admin.html` route to the allowed redirect URLs. During local development, add the local web server origin and `/admin.html` too.
6. Copy the project URL and the project's public anon key into `SUPABASE_URL` and `SUPABASE_ANON_KEY` in [`store-config.js`](./store-config.js). This function expects the legacy JWT-format anon key while JWT verification is enabled. These are public client values. **Never put a Supabase service-role/secret key in this file or any browser code.**
7. Deploy the `place-order` Edge Function from [`supabase/functions/place-order/index.ts`](./supabase/functions/place-order/index.ts) to the same Supabase project. With the Supabase CLI, run `supabase functions deploy place-order --project-ref uxlbfnodwpvxxgxnzdsj` from the project directory after signing in to the CLI. Alternatively, in the Supabase Dashboard open **Edge Functions**, choose **Deploy a new function → Via Editor**, paste the contents of `supabase/functions/place-order/index.ts`, name it `place-order`, and deploy. Keep JWT verification enabled. The hosted Edge Function uses Supabase's server-side `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment values; the service-role key must remain server-side.

The storefront currently receives `404 Requested function was not found` from `https://uxlbfnodwpvxxgxnzdsj.supabase.co/functions/v1/place-order`, which means this function still needs to be deployed to that project. The checkout now reports a specific deployment message for this response instead of a generic network failure.

The admin signs in at `admin.html` with the configured admin email and password; no email sign-in link or phone login is used. Supabase Auth validates the password, and the dashboard additionally requires both the configured admin email and the server-managed `app_metadata.role = admin` claim. The database only allows users with that claim to read customer orders or change payment/order statuses. The public storefront cannot read customer addresses or order records. Customers place an order before making the manual OPay transfer; after placing it, they can open WhatsApp and attach their receipt. The admin confirms payment and updates fulfillment status in `admin.html`.

The prices are seeded in `supabase/setup.sql` and displayed from `store-config.js`. If you change a product price later, update both places so the customer display and server-verified order total continue to match.

## 2. Serve and deploy the website

Serve the project over HTTP(S), not by opening `index.html` as a `file://` URL. JavaScript modules and the Supabase browser client need an HTTP origin. Deploy the project folder as a static site using a host such as Netlify, Vercel, or another static web host. Include `index.html`, `admin.html`, `style.css`, `script.js`, `admin.js`, `store-config.js`, and the complete `images` folder.

After deployment, test a cart, submit a small test order, confirm it appears at `/admin.html`, and remove the test order or mark it cancelled. Check that the OPay transfer amount matches the product total. Delivery has no separate fee in the current setup, and wholesale uses the same prices as retail.
