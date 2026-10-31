(() => {
const SUPABASE_URL = "https://qnutljznbirtdsvswcty.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFudXRsanpuYmlydGRzdnN3Y3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0NDg0MDUsImV4cCI6MjEwOTAyNDQwNX0.L48V3sc5urEdDHkjE3M6ZKpjrHdliNhKe3pcv54b5Fg";

const ADMIN_EMAIL = "donbobsky@gmail.com";
const WHATSAPP_NUMBER = "2348064234960";
const OPAY_ACCOUNT_NAME = "Onuorah Chukwuebuka Johnbosco";
const OPAY_ACCOUNT_NUMBER = "8064234960";

const PRODUCTS = {
    "pixie-curls": {
        name: "Pixie Curls",
        price: 7500,
        category: "curls",
        description: "Beautiful curls for a soft, standout look.",
        image: "images/pixie%20curls.jpg"
    },
    "french-curl": {
        name: "French Curl",
        price: 8700,
        category: "curls",
        description: "Full, flowing curls for an effortlessly elegant finish.",
        image: "images/french%20curl.jpg"
    },
    "lush-hair": {
        name: "Lush Hair",
        price: 4500,
        category: "braids",
        description: "A versatile everyday favourite, ready for your next style.",
        image: "images/lush%20hair.png"
    },
    "darling-superstar": {
        name: "Darling Superstar",
        price: 6500,
        category: "braids",
        description: "Explore a trusted classic in a range of beautiful shades.",
        image: "images/darling%20superstar.jpeg"
    },
    "passion-twist": {
        name: "Passion Twist",
        price: 10500,
        category: "braids",
        description: "Light, textured twists for a relaxed protective style.",
        image: "images/passion%20twist.jpg"
    },
    "afro-kinky-bulk": {
        name: "Afro Kinky Bulk",
        price: 35000,
        category: "braids",
        description: "Natural-looking texture with beautiful volume.",
        image: "images/afro%20kinky%20bulk.jpg"
    },
    "boho-water-wave": {
        name: "Boho Water Wave",
        price: 98000,
        category: "curls",
        description: "Soft waves that bring movement to your look.",
        image: "images/boho%20water%20wave.jpg"
    },
    "silky-straight-weave": {
        name: "Silky Straight Weave",
        price: 55000,
        category: "weaves",
        description: "A smooth, timeless look that styles with ease.",
        image: "images/silky%20straight%20weave.jpg"
    }
};

const formatNaira = (amount) => new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
}).format(amount);

window.MamaOgeStoreConfig = {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    ADMIN_EMAIL,
    WHATSAPP_NUMBER,
    OPAY_ACCOUNT_NAME,
    OPAY_ACCOUNT_NUMBER,
    PRODUCTS,
    formatNaira
};
})();
