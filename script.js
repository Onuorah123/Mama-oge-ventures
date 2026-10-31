const {
    OPAY_ACCOUNT_NAME,
    OPAY_ACCOUNT_NUMBER,
    PRODUCTS,
    SUPABASE_ANON_KEY,
    SUPABASE_URL,
    WHATSAPP_NUMBER,
    formatNaira
} = window.MamaOgeStoreConfig;

const CART_STORAGE_KEY = "mama-oge-cart-v1";
const supabaseConfigured = !SUPABASE_URL.startsWith("YOUR_") &&
    !SUPABASE_ANON_KEY.startsWith("YOUR_");
let supabase = null;
const cartCount = document.querySelector("#cart-count");
const cartItems = document.querySelector("#cart-items");
const cartEmpty = document.querySelector("#cart-empty");
const cartSubtotal = document.querySelector("#cart-subtotal");
const cartTotal = document.querySelector("#cart-total");
const checkoutItems = document.querySelector("#checkout-items");
const checkoutTotal = document.querySelector("#checkout-total");
const checkoutForm = document.querySelector("#checkout-form");
const checkoutMessage = document.querySelector("#checkout-message");
const paymentInstructions = document.querySelector("#payment-instructions");
const toastRegion = document.querySelector("#toast-region");
const productDialog = document.querySelector("#product-dialog");

let cart = loadCart();
let activeCategory = "all";
let latestOrderId = null;
let latestOrderAmount = null;

async function getSupabase() {
    if (!supabaseConfigured) return null;
    if (!supabase) {
        const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.56.1/+esm");
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabase;
}

function invalidateOrderConfirmation() {
    latestOrderId = null;
    latestOrderAmount = null;
    paymentInstructions.hidden = true;
    checkoutMessage.textContent = "";
}

function loadCart() {
    try {
        const savedCart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "{}");
        return Object.fromEntries(
            Object.entries(savedCart).filter(([productId, quantity]) =>
                PRODUCTS[productId] && Number.isInteger(quantity) && quantity > 0
            )
        );
    } catch (error) {
        console.error("Could not read the saved cart.", error);
        return {};
    }
}

function saveCart() {
    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
        console.error("Could not save the cart in this browser.", error);
        showMessage("Your browser could not save the cart. Keep this page open while shopping.");
    }
}

function getCartLines() {
    return Object.entries(cart).map(([productId, quantity]) => ({
        productId,
        quantity,
        product: PRODUCTS[productId]
    }));
}

function getCartTotal() {
    return getCartLines().reduce((sum, line) => sum + line.product.price * line.quantity, 0);
}

function showMessage(message, type = "info") {
    if (toastRegion) {
        toastRegion.textContent = message;
        toastRegion.dataset.type = type;
        toastRegion.classList.add("is-visible");
        window.clearTimeout(showMessage.timeoutId);
        showMessage.timeoutId = window.setTimeout(() => {
            toastRegion.classList.remove("is-visible");
        }, 3600);
    }
}

async function getOrderRequestErrorMessage(error) {
    const response = error?.context;
    if (response && typeof response.status === "number") {
        if (response.status === 404) {
            return "The order service is not deployed to this Supabase project yet. Deploy the place-order function, then try again.";
        }
        if (response.status === 401 || response.status === 403) {
            return "Supabase rejected the order request. Check that the public anon key matches this project and that JWT verification is enabled for the deployed function.";
        }

        try {
            const body = await response.clone().json();
            if (typeof body.message === "string") return body.message;
            if (typeof body.error === "string") return body.error;
        } catch {
            // Use the function client's message below when the response is not JSON.
        }
    }

    if (error?.name === "FunctionsFetchError") {
        return "The browser could not reach Supabase. Check your internet connection, the deployed function's CORS settings, and retry.";
    }

    return error?.message || "We could not submit your order. Please try again.";
}

function renderCart() {
    const lines = getCartLines();
    const total = getCartTotal();
    const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);

    cartCount.textContent = String(totalQuantity);
    cartEmpty.hidden = lines.length > 0;
    cartItems.replaceChildren();
    checkoutItems.replaceChildren();

    lines.forEach(({ productId, quantity, product }) => {
        const row = document.createElement("article");
        row.className = "cart-item";
        row.innerHTML = `
            <img src="${product.image}" alt="">
            <div class="cart-item-details">
                <h3>${product.name}</h3>
                <p>${formatNaira(product.price)} each</p>
            </div>
            <div class="quantity-control" aria-label="Quantity for ${product.name}">
                <button type="button" data-cart-action="decrease" data-product-id="${productId}" aria-label="Decrease ${product.name} quantity">−</button>
                <span>${quantity}</span>
                <button type="button" data-cart-action="increase" data-product-id="${productId}" aria-label="Increase ${product.name} quantity">+</button>
            </div>
            <strong class="cart-line-total">${formatNaira(product.price * quantity)}</strong>
            <button type="button" class="remove-cart-item" data-cart-action="remove" data-product-id="${productId}">Remove</button>
        `;
        cartItems.append(row);

        const summaryLine = document.createElement("p");
        summaryLine.className = "checkout-summary-line";
        summaryLine.textContent = `${product.name} × ${quantity} — ${formatNaira(product.price * quantity)}`;
        checkoutItems.append(summaryLine);
    });

    cartSubtotal.textContent = formatNaira(total);
    cartTotal.textContent = formatNaira(total);
    checkoutTotal.textContent = formatNaira(latestOrderAmount ?? total);
    document.querySelectorAll("[data-price-for]").forEach((element) => {
        const product = PRODUCTS[element.dataset.priceFor];
        if (product) element.textContent = formatNaira(product.price);
    });

    saveCart();
}

function updateProductResults() {
    const searchTerm = document.querySelector("#product-search").value.trim().toLocaleLowerCase();
    let visibleCount = 0;

    document.querySelectorAll(".product-card").forEach((card) => {
        const productId = card.querySelector(".add-to-cart").dataset.productId;
        const product = PRODUCTS[productId];
        const matchesCategory = activeCategory === "all" || product.category === activeCategory;
        const matchesSearch = `${product.name} ${product.description}`.toLocaleLowerCase().includes(searchTerm);
        const isVisible = matchesCategory && matchesSearch;
        card.hidden = !isVisible;
        if (isVisible) visibleCount += 1;
    });

    document.querySelector(".filter-status").textContent =
        `Showing ${visibleCount} ${visibleCount === 1 ? "style" : "styles"}`;
}

document.querySelectorAll(".filter-button").forEach((button) => {
    button.addEventListener("click", () => {
        activeCategory = button.dataset.filter;
        document.querySelectorAll(".filter-button").forEach((filterButton) => {
            filterButton.setAttribute("aria-pressed", String(filterButton === button));
        });
        updateProductResults();
    });
});

document.querySelector("#product-search").addEventListener("input", updateProductResults);

document.addEventListener("click", (event) => {
    const addButton = event.target.closest(".add-to-cart");
    if (addButton) {
        const productId = addButton.dataset.productId;
        const product = PRODUCTS[productId];
        if (!product) {
            showMessage("That product is unavailable. Please refresh the page and try again.", "error");
            return;
        }

        cart[productId] = (cart[productId] || 0) + 1;
        invalidateOrderConfirmation();
        renderCart();
        showMessage(`${product.name} added to your cart.`);
        document.querySelector("#cart").scrollIntoView({ behavior: "smooth", block: "start" });
        return;
    }

    const cartButton = event.target.closest("#cart-items [data-cart-action]");
    if (!cartButton) return;

    const { productId, cartAction } = cartButton.dataset;
    if (!PRODUCTS[productId] || !cart[productId]) return;

    if (cartAction === "increase") cart[productId] += 1;
    if (cartAction === "decrease") {
        cart[productId] -= 1;
        if (cart[productId] <= 0) delete cart[productId];
    }
    if (cartAction === "remove") delete cart[productId];

    invalidateOrderConfirmation();
    renderCart();
});

document.querySelectorAll(".product-details-button").forEach((button) => {
    button.addEventListener("click", () => {
        const product = PRODUCTS[button.dataset.details];
        if (!product) return;
        document.querySelector("#dialog-image").src = product.image;
        document.querySelector("#dialog-image").alt = product.name;
        document.querySelector("#dialog-title").textContent = product.name;
        document.querySelector("#dialog-description").textContent = product.description;
        document.querySelector("#dialog-price").textContent = formatNaira(product.price);
        document.querySelector("#dialog-add-to-cart").dataset.productId = button.dataset.details;
        productDialog.showModal();
    });
});

document.querySelector(".dialog-close").addEventListener("click", () => productDialog.close());
productDialog.addEventListener("click", (event) => {
    if (event.target === productDialog) productDialog.close();
});
document.querySelector("#dialog-add-to-cart").addEventListener("click", (event) => {
    const productId = event.currentTarget.dataset.productId;
    cart[productId] = (cart[productId] || 0) + 1;
    invalidateOrderConfirmation();
    renderCart();
    productDialog.close();
    showMessage(`${PRODUCTS[productId].name} added to your cart.`);
});

document.querySelector("#opay-name").textContent = OPAY_ACCOUNT_NAME;
document.querySelector("#opay-number").textContent = OPAY_ACCOUNT_NUMBER;

checkoutForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (getCartLines().length === 0) {
        showMessage("Add at least one product before placing an order.", "error");
        return;
    }
    if (!supabaseConfigured) {
        checkoutMessage.textContent = "Online checkout is not connected yet. Add your Supabase project URL and publishable/anon key to store-config.js, then try again.";
        checkoutMessage.dataset.type = "error";
        return;
    }

    const formData = new FormData(checkoutForm);
    const submitButton = document.querySelector("#place-order-button");
    submitButton.disabled = true;
    submitButton.textContent = "Submitting order…";
    checkoutMessage.textContent = "";
    paymentInstructions.hidden = true;

    try {
        const client = await getSupabase();
        if (!client) throw new Error("Supabase is not configured. Please contact the store to place your order.");
        const { data, error } = await client.functions.invoke("place-order", {
            body: {
                customerName: formData.get("customerName").trim(),
                phone: formData.get("phone").trim(),
                address: formData.get("address").trim(),
                state: formData.get("state"),
                orderType: formData.get("orderType"),
                items: getCartLines().map(({ productId, quantity }) => ({ productId, quantity }))
            }
        });

        if (error) throw error;
        if (!data || !data.orderId || !Number.isInteger(data.totalAmount)) {
            throw new Error("The order service returned an invalid confirmation.");
        }

        latestOrderId = data.orderId;
        latestOrderAmount = data.totalAmount;
        paymentInstructions.hidden = false;
        const whatsappMessage = [
            "Hello Mama Oge Ventures, I have placed an order and would like to send my OPay transfer receipt.",
            `Order: ${latestOrderId}`,
            `Amount: ${formatNaira(data.totalAmount)}`
        ].join("\n");
        document.querySelector("#receipt-whatsapp").href =
            `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;
        checkoutMessage.textContent = `Order ${latestOrderId} received. Transfer the exact amount shown, then send your transfer receipt through WhatsApp. Payment will be confirmed manually.`;
        checkoutMessage.dataset.type = "success";
        cart = {};
        renderCart();
        checkoutForm.reset();
    } catch (error) {
        console.error("Order submission failed.", error);
        checkoutMessage.textContent = await getOrderRequestErrorMessage(error);
        checkoutMessage.dataset.type = "error";
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Place order";
    }
});

document.querySelector("#checkout-link").addEventListener("click", (event) => {
    if (getCartLines().length === 0) {
        event.preventDefault();
        showMessage("Your cart is empty. Choose a style to get started.", "error");
    }
});

renderCart();
updateProductResults();
