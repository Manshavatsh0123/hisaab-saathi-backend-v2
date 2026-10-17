
const path = require("node:path");

require("dotenv").config({
    path: path.resolve(__dirname, "../.env"),
});

const { performance } = require("node:perf_hooks");

const supabase = require("./config/supabase");
const supabaseAuth = require("./config/supabase-auth");

const EMAIL = process.env.TEST_ADMIN_EMAIL;
const PASSWORD = process.env.TEST_ADMIN_PASSWORD;

async function testLoginLatency() {
    if (!EMAIL || !PASSWORD) {
        console.error(
            "Missing TEST_ADMIN_EMAIL or TEST_ADMIN_PASSWORD in .env"
        );
        return;
    }

    console.log("\nStarting 5 sequential login tests...\n");

    for (let i = 1; i <= 5; i++) {
        const totalStart = performance.now();

        try {
            // Step 1: Supabase Auth
            const authStart = performance.now();

            const { data, error } =
                await supabaseAuth.auth.signInWithPassword({
                    email: EMAIL.trim(),
                    password: PASSWORD,
                });

            const authMs = performance.now() - authStart;

            if (error || !data?.user || !data?.session) {
                console.log(
                    `Test ${i}: Auth failed after ${authMs.toFixed(0)} ms`
                );
                continue;
            }

            // Step 2: Profile query
            const profileStart = performance.now();

            const { data: profile, error: profileError } =
                await supabase
                    .from("profiles")
                    .select("id, role, username, full_name, phone, status")
                    .eq("id", data.user.id)
                    .maybeSingle();

            const profileMs = performance.now() - profileStart;
            const totalMs = performance.now() - totalStart;

            console.log(`\nTest ${i}`);
            console.log(`Auth:    ${authMs.toFixed(0)} ms`);
            console.log(`Profile: ${profileMs.toFixed(0)} ms`);
            console.log(`Total:   ${totalMs.toFixed(0)} ms`);

            if (profileError) {
                console.error("Profile query error:", profileError.message);
            } else if (!profile) {
                console.log("Profile not found");
            } else {
                console.log(
                    `Role/status check: ${
                        profile.role === "ADMIN" &&
                        profile.status === "ACTIVE"
                            ? "Passed"
                            : "Failed"
                    }`
                );
            }

            // Sign out only from the local client session.
            // This does not revoke the server-side session.
            await supabaseAuth.auth.signOut({ scope: "local" });
        } catch (error) {
            console.error(`Test ${i} failed:`, error.message);
        }
    }

    console.log("\nAll tests completed.");
}

testLoginLatency().catch(console.error);
