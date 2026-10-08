const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
    throw new Error("SUPABASE_URL is missing");
}

if (!supabasePublishableKey) {
    throw new Error("SUPABASE_PUBLISHABLE_KEY is missing");
}

const supabaseAuth = createClient(
    supabaseUrl,
    supabasePublishableKey,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    }
);

module.exports = supabaseAuth;