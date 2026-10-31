import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

Deno.serve(async (request: Request) => {
    if (request.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    if (request.method !== "POST") {
        return jsonResponse({ error: "Method not allowed." }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
        console.error("Order function is missing Supabase server environment variables.");
        return jsonResponse({ error: "The order service is not configured." }, 500);
    }

    let payload: Record<string, unknown>;
    try {
        payload = await request.json();
    } catch {
        return jsonResponse({ error: "Order details must be valid JSON." }, 400);
    }

    const customerName = typeof payload.customerName === "string" ? payload.customerName.trim() : "";
    const phone = typeof payload.phone === "string" ? payload.phone.trim() : "";
    const address = typeof payload.address === "string" ? payload.address.trim() : "";
    const state = typeof payload.state === "string" ? payload.state.trim() : "";
    const orderType = payload.orderType;
    const requestedItems = payload.items;

    if (customerName.length < 2 || customerName.length > 120 ||
        phone.length < 7 || phone.length > 20 ||
        address.length < 5 || address.length > 500 ||
        state.length < 2 || state.length > 40 ||
        (orderType !== "retail" && orderType !== "wholesale") ||
        !Array.isArray(requestedItems) || requestedItems.length < 1 || requestedItems.length > 30) {
        return jsonResponse({ error: "Please check your contact and delivery details and order items." }, 400);
    }

    const quantities = new Map<string, number>();
    for (const item of requestedItems) {
        if (!item || typeof item.productId !== "string" ||
            !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) {
            return jsonResponse({ error: "One or more product quantities are invalid." }, 400);
        }
        quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
    }

    if (Array.from(quantities.values()).some((quantity) => quantity > 50)) {
        return jsonResponse({ error: "Please reduce the quantity of one or more products." }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
    const productIds = Array.from(quantities.keys());
    const { data: products, error: productError } = await supabase
        .from("products")
        .select("id, name, price_ngn, active")
        .in("id", productIds);

    if (productError) {
        console.error("Could not verify order products.", productError);
        return jsonResponse({ error: "We could not verify the products. Please try again." }, 500);
    }

    if (!products || products.length !== productIds.length || products.some((product) => !product.active)) {
        return jsonResponse({ error: "One or more products are no longer available." }, 400);
    }

    const items = products.map((product) => ({
        product_id: product.id,
        name: product.name,
        quantity: quantities.get(product.id)!,
        unit_price_ngn: product.price_ngn,
        line_total_ngn: product.price_ngn * quantities.get(product.id)!
    }));
    const totalAmount = items.reduce((total, item) => total + item.line_total_ngn, 0);

    if (!Number.isSafeInteger(totalAmount) || totalAmount <= 0) {
        return jsonResponse({ error: "The order total is invalid. Please contact the store." }, 400);
    }

    const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
            customer_name: customerName,
            phone,
            delivery_address: address,
            state,
            order_type: orderType,
            items,
            total_amount_ngn: totalAmount
        })
        .select("id")
        .single();

    if (orderError) {
        console.error("Could not save order.", orderError);
        return jsonResponse({ error: "We could not save your order. Please try again." }, 500);
    }

    return jsonResponse({ orderId: order.id, totalAmount });
});
