// Remove email/password query parameters from the address bar
// if an earlier form submission placed them there.
const currentParams = new URLSearchParams(window.location.search);

if (currentParams.has("email") || currentParams.has("password")) {
    window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.hash
    );
}


const {
    ADMIN_EMAIL,
    SUPABASE_ANON_KEY,
    SUPABASE_URL,
    formatNaira
} = window.MamaOgeStoreConfig;


const isConfigured =
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.startsWith("YOUR_") &&
    !SUPABASE_ANON_KEY.startsWith("YOUR_");


let supabase = null;

const authPanel = document.querySelector("#admin-auth-panel");
const dashboard = document.querySelector("#orders");

const authMessage = document.querySelector("#admin-auth-message");
const ordersMessage = document.querySelector("#orders-message");
const ordersList = document.querySelector("#orders-list");

let ordersRequestId = 0;


// =====================================
// SUPABASE CONNECTION
// =====================================

async function getSupabase() {

    if (!isConfigured) {
        return null;
    }

    if (!supabase) {

        const { createClient } = await import(
            "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.56.1/+esm"
        );

        supabase = createClient(
            SUPABASE_URL,
            SUPABASE_ANON_KEY
        );

    }

    return supabase;
}


// =====================================
// MESSAGE DISPLAY
// =====================================

function setMessage(element, message, type = "info") {

    element.textContent = message;
    element.dataset.type = type;

}


// =====================================
// ERROR HANDLING
// =====================================

function getConnectionErrorMessage(error) {

    const message =
        error instanceof Error
            ? error.message
            : String(error);

    if (/failed to fetch|networkerror|load failed/i.test(message)) {

        let projectHost = "your Supabase project";

        try {
            projectHost = new URL(SUPABASE_URL).host;
        } catch {
            // Keep the generic message.
        }

        return `Cannot connect to ${projectHost}. Check your internet connection, Supabase Project URL and make sure you opened this page through Live Server or your hosted website.`;

    }

    return message || "Sign-in failed. Check your details and try again.";

}


// =====================================
// SHOW OR HIDE DASHBOARD
// =====================================

function showAdmin(isAdmin) {

    authPanel.hidden = isAdmin;
    dashboard.hidden = !isAdmin;

    if (isAdmin && window.location.hash === "#orders") {

        window.requestAnimationFrame(() => {

            dashboard.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        });

    }

}


function openOrdersDashboard() {

    showAdmin(true);

    window.history.replaceState(
        null,
        "",
        `${window.location.pathname}#orders`
    );

    dashboard.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


// =====================================
// CHECK ADMIN PERMISSION
// =====================================

function isAuthorizedAdmin(user) {

    return Boolean(

        user &&

        user.app_metadata?.role === "admin" &&

        user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()

    );

}


// =====================================
// CHECK EXISTING LOGIN SESSION
// =====================================

async function checkAdminSession() {

    if (!isConfigured) {

        setMessage(
            authMessage,
            "Supabase is not configured. Check your store-config.js file.",
            "error"
        );

        return;

    }

    let client;

    try {

        client = await getSupabase();

    } catch (error) {

        console.error("Could not load Supabase.", error);

        setMessage(
            authMessage,
            getConnectionErrorMessage(error),
            "error"
        );

        return;

    }


    const { data, error } = await client.auth.getSession();

    if (error) {

        setMessage(
            authMessage,
            `Could not check your session: ${error.message}`,
            "error"
        );

        return;

    }


    const session = data.session;

    const isAdmin = isAuthorizedAdmin(session?.user);

    showAdmin(Boolean(isAdmin));


    if (session && !isAdmin) {

        setMessage(
            authMessage,
            "This account is not authorized to view store orders.",
            "error"
        );

        await client.auth.signOut();

    } else if (isAdmin) {

        await loadOrders();

    }

}


// =====================================
// ADMIN LOGIN WITH EMAIL AND PASSWORD
// =====================================

document
    .querySelector("#admin-login-form")
    .addEventListener("submit", async (event) => {

        event.preventDefault();

        if (!isConfigured) {

            setMessage(
                authMessage,
                "Supabase is not configured yet.",
                "error"
            );

            return;

        }


        const formData = new FormData(event.currentTarget);

        const email = String(formData.get("email") || "")
            .trim()
            .toLowerCase();

        const password = String(formData.get("password") || "");


        if (email !== ADMIN_EMAIL.toLowerCase()) {

            setMessage(
                authMessage,
                "Unauthorized access. Use the authorized store admin email.",
                "error"
            );

            return;

        }


        if (!password) {

            setMessage(
                authMessage,
                "Please enter your password.",
                "error"
            );

            return;

        }


        const button = event.currentTarget.querySelector("button");

        button.disabled = true;

        setMessage(authMessage, "Signing in…");


        try {

            const client = await getSupabase();

            const { data, error } =
                await client.auth.signInWithPassword({

                    email,
                    password

                });


            if (error) {
                throw error;
            }


            if (!isAuthorizedAdmin(data.user)) {

                await client.auth.signOut();

                showAdmin(false);

                setMessage(
                    authMessage,
                    "This account is not authorized to view store orders.",
                    "error"
                );

                return;

            }


            openOrdersDashboard();

            setMessage(authMessage, "");

            await loadOrders();


        } catch (error) {

            console.error("Admin login failed.", error);

            setMessage(
                authMessage,
                getConnectionErrorMessage(error),
                "error"
            );

        } finally {

            button.disabled = false;

        }

    });


// =====================================
// CREATE HTML TEXT ELEMENT
// =====================================

function createTextElement(tagName, className, text) {

    const element = document.createElement(tagName);

    if (className) {
        element.className = className;
    }

    element.textContent = text;

    return element;

}


// =====================================
// BUILD CUSTOMER ORDER CARD
// =====================================

function buildOrderCard(order) {

    const card = document.createElement("article");

    card.className = "admin-order-card";


    // Order heading

    const heading = document.createElement("div");

    heading.className = "admin-order-heading";


    const orderNumber = createTextElement(
        "h2",
        "",
        `Order ${order.id}`
    );


    const date = createTextElement(
        "p",
        "",
        new Date(order.created_at).toLocaleString("en-NG")
    );


    heading.append(orderNumber, date);

    card.append(heading);


    // Customer information

    const customer = document.createElement("div");

    customer.className = "admin-order-customer";


    [

        `Customer: ${order.customer_name}`,

        `Phone: ${order.phone}`,

        `Delivery: ${order.delivery_address}, ${order.state}`,

        `Order type: ${order.order_type}`

    ].forEach((detail) => {

        customer.append(
            createTextElement("p", "", detail)
        );

    });


    card.append(customer);


    // Products ordered

    const items = document.createElement("ul");

    items.className = "admin-order-items";


    order.items.forEach((item) => {

        items.append(

            createTextElement(
                "li",
                "",
                `${item.name} × ${item.quantity} — ${formatNaira(item.line_total_ngn)}`
            )

        );

    });


    card.append(items);


    // Total amount

    card.append(

        createTextElement(
            "p",
            "admin-order-total",
            `Order total: ${formatNaira(order.total_amount_ngn)}`
        )

    );


    // Order controls

    const controls = document.createElement("div");

    controls.className = "admin-order-controls";


    // Payment status

    const paymentLabel = document.createElement("label");

    paymentLabel.append(
        document.createTextNode("Payment ")
    );


    const paymentSelect = document.createElement("select");

    paymentSelect.dataset.field = "payment_status";


    [

        ["pending", "Awaiting confirmation"],

        ["confirmed", "Confirmed"],

        ["rejected", "Rejected"]

    ].forEach(([value, text]) => {

        const option = new Option(
            text,
            value,
            false,
            value === order.payment_status
        );

        paymentSelect.add(option);

    });


    paymentLabel.append(paymentSelect);


    // Order status

    const statusLabel = document.createElement("label");

    statusLabel.append(
        document.createTextNode("Order status ")
    );


    const statusSelect = document.createElement("select");

    statusSelect.dataset.field = "order_status";


    [

        ["awaiting_payment", "Awaiting payment"],

        ["processing", "Processing"],

        ["dispatched", "Dispatched"],

        ["delivered", "Delivered"],

        ["cancelled", "Cancelled"]

    ].forEach(([value, text]) => {

        const option = new Option(
            text,
            value,
            false,
            value === order.order_status
        );

        statusSelect.add(option);

    });


    statusLabel.append(statusSelect);


    // Save button

    const saveButton = document.createElement("button");

    saveButton.type = "button";

    saveButton.className = "shop-btn";

    saveButton.textContent = "Save status";


    saveButton.addEventListener("click", () => {

        updateOrder(

            order.id,

            {

                payment_status: paymentSelect.value,

                order_status: statusSelect.value

            },

            saveButton

        );

    });


    controls.append(
        paymentLabel,
        statusLabel,
        saveButton
    );


    card.append(controls);

    return card;

}


// =====================================
// LOAD CUSTOMER ORDERS
// =====================================

async function loadOrders() {

    const client = await getSupabase();

    if (!client) {
        return;
    }


    const requestId = ++ordersRequestId;

    setMessage(ordersMessage, "Loading orders…");

    ordersList.replaceChildren();


    const { data: orders, error } = await client

        .from("orders")

        .select(`
            id,
            customer_name,
            phone,
            delivery_address,
            state,
            order_type,
            items,
            total_amount_ngn,
            payment_status,
            order_status,
            created_at
        `)

        .order("created_at", {
            ascending: false
        });


    if (requestId !== ordersRequestId) {
        return;
    }


    if (error) {

        console.error("Could not load orders.", error);

        setMessage(
            ordersMessage,
            `Could not load orders: ${error.message}`,
            "error"
        );

        return;

    }


    if (!orders || orders.length === 0) {

        setMessage(ordersMessage, "No orders yet.");

        return;

    }


    orders.forEach((order) => {

        ordersList.append(
            buildOrderCard(order)
        );

    });


    setMessage(
        ordersMessage,
        `${orders.length} ${orders.length === 1 ? "order" : "orders"}`
    );

}


// =====================================
// UPDATE ORDER STATUS
// =====================================

async function updateOrder(orderId, changes, button) {

    button.disabled = true;


    try {

        const client = await getSupabase();


        const { error } = await client

            .from("orders")

            .update({

                ...changes,

                updated_at: new Date().toISOString()

            })

            .eq("id", orderId);


        if (error) {
            throw error;
        }


        setMessage(
            ordersMessage,
            "Order updated."
        );


        await loadOrders();


    } catch (error) {

        console.error("Could not update order.", error);

        setMessage(
            ordersMessage,
            `Could not update order: ${error.message}`,
            "error"
        );

    } finally {

        button.disabled = false;

    }

}


// =====================================
// REFRESH ORDERS
// =====================================

document
    .querySelector("#refresh-orders")
    .addEventListener("click", loadOrders);


// =====================================
// ADMIN SIGN OUT
// =====================================

document
    .querySelector("#admin-sign-out")
    .addEventListener("click", async () => {

        const client = await getSupabase();

        if (!client) {
            return;
        }


        const { error } = await client.auth.signOut();


        if (error) {

            setMessage(
                ordersMessage,
                `Could not sign out: ${error.message}`,
                "error"
            );

            return;

        }


        showAdmin(false);

        setMessage(
            authMessage,
            "You have signed out."
        );

    });


// =====================================
// INITIALIZE ADMIN DASHBOARD
// =====================================

async function initializeAdmin() {

    if (!isConfigured) {

        await checkAdminSession();

        return;

    }


    try {

        const client = await getSupabase();


        client.auth.onAuthStateChange((_event, session) => {

            const isAdmin = isAuthorizedAdmin(session?.user);

            showAdmin(Boolean(isAdmin));

            if (isAdmin) {

                window.setTimeout(loadOrders, 0);

            }

        });


        await checkAdminSession();


    } catch (error) {

        console.error(
            "Could not initialize the admin dashboard.",
            error
        );

        setMessage(
            authMessage,
            getConnectionErrorMessage(error),
            "error"
        );

    }

}


initializeAdmin();