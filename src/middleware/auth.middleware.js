const supabase = require("../config/supabase");

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Missing or invalid Authorization header",
      });
    }

    const token = authHeader.split(" ")[1];

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired access token",
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, username, full_name, phone, status")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({
        success: false,
        message: "User profile not found",
      });
    }

    if (profile.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "User account is inactive",
      });
    }

    req.user = user;
    req.profile = profile;

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = requireAuth;