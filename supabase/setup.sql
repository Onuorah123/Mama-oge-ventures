create table public.products (
    id text primary key,
    name text not null,
    category text not null check (category in ('braids', 'curls', 'weaves')),
    description text not null,
    price_ngn integer not null check (price_ngn > 0),
    image_path text not null,
    active boolean not null default true,
    created_at timestamptz not null default now()
);

insert into public.products (id, name, category, description, price_ngn, image_path)
values
    ('pixie-curls', 'Pixie Curls', 'curls', 'Beautiful curls for a soft, standout look.', 7500, 'images/pixie curls.jpg'),
    ('french-curl', 'French Curl', 'curls', 'Full, flowing curls for an effortlessly elegant finish.', 8700, 'images/french curl.jpg'),
    ('lush-hair', 'Lush Hair', 'braids', 'A versatile everyday favourite, ready for your next style.', 4500, 'images/lush hair.png'),
    ('darling-superstar', 'Darling Superstar', 'braids', 'Explore a trusted classic in a range of beautiful shades.', 6500, 'images/darling superstar.jpeg'),
    ('passion-twist', 'Passion Twist', 'braids', 'Light, textured twists for a relaxed protective style.', 10500, 'images/passion twist.jpg'),
    ('afro-kinky-bulk', 'Afro Kinky Bulk', 'braids', 'Natural-looking texture with beautiful volume.', 35000, 'images/afro kinky bulk.jpg'),
    ('boho-water-wave', 'Boho Water Wave', 'curls', 'Soft waves that bring movement to your look.', 98000, 'images/boho water wave.jpg'),
    ('silky-straight-weave', 'Silky Straight Weave', 'weaves', 'A smooth, timeless look that styles with ease.', 55000, 'images/silky straight weave.jpg');

create table public.orders (
    id uuid primary key default gen_random_uuid(),
    customer_name text not null check (char_length(customer_name) between 2 and 120),
    phone text not null check (char_length(phone) between 7 and 20),
    delivery_address text not null check (char_length(delivery_address) between 5 and 500),
    state text not null check (char_length(state) between 2 and 40),
    order_type text not null check (order_type in ('retail', 'wholesale')),
    items jsonb not null check (
        case
            when jsonb_typeof(items) = 'array' then jsonb_array_length(items) > 0
            else false
        end
    ),
    total_amount_ngn integer not null check (total_amount_ngn > 0),
    payment_status text not null default 'pending' check (payment_status in ('pending', 'confirmed', 'rejected')),
    order_status text not null default 'awaiting_payment' check (order_status in ('awaiting_payment', 'processing', 'dispatched', 'delivered', 'cancelled')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index orders_created_at_idx on public.orders (created_at desc);
create index orders_status_created_at_idx on public.orders (order_status, created_at desc);

alter table public.products enable row level security;
alter table public.orders enable row level security;

grant select on public.products to anon, authenticated;
grant select on public.orders to authenticated;
grant update (payment_status, order_status, updated_at) on public.orders to authenticated;

create policy "Anyone can view active products"
    on public.products for select
    to anon, authenticated
    using (active or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Store admins can view orders"
    on public.orders for select
    to authenticated
    using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Store admins can update order payment and delivery status"
    on public.orders for update
    to authenticated
    using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
