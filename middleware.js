import { NextResponse } from "next/server";

/**
 * Decodes the payload of a JWT token without verifying its signature.
 * Safe to run in Edge Runtime using standard atob.
 * @param {string} token - The JWT string
 * @returns {Object|null} The decoded token payload or null if invalid
 */
function decodeJwt(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Retrieve cookies
  const authToken = request.cookies.get("authToken")?.value;
  const userRole = request.cookies.get("userRole")?.value;

  // Check token validity (expiration and parsing)
  let isTokenValid = false;
  let isEmailVerified = false;

  if (authToken) {
    const decoded = decodeJwt(authToken);
    if (decoded) {
      const currentTime = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp > currentTime) {
        isTokenValid = true;
        isEmailVerified = !!decoded.email_verified;
      }
    }
  }

  // Define role-protected dashboard routes
  const protectedDashboards = [
    { prefix: "/student", role: "student", defaultPath: "/student/dashboard" },
    { prefix: "/teacher", role: "teacher", defaultPath: "/teacher/dashboard" },
    { prefix: "/admin", role: "admin", defaultPath: "/admin/dashboard" },
    { prefix: "/institute", role: "institute", defaultPath: "/institute/dashboard" },
  ];

  // 1. If path is a protected dashboard route
  const matchedDashboard = protectedDashboards.find((dashboard) =>
    pathname.startsWith(dashboard.prefix)
  );

  if (matchedDashboard) {
    // Not logged in or invalid token -> redirect to /auth
    if (!isTokenValid) {
      return NextResponse.redirect(new URL("/auth", request.url));
    }

    // Email not verified -> redirect to /verify
    if (!isEmailVerified) {
      return NextResponse.redirect(new URL("/verify", request.url));
    }

    // Role mismatch -> redirect to their correct dashboard or /auth
    if (userRole !== matchedDashboard.role) {
      const correctDashboard = protectedDashboards.find((d) => d.role === userRole);
      if (correctDashboard) {
        return NextResponse.redirect(new URL(correctDashboard.defaultPath, request.url));
      }
      return NextResponse.redirect(new URL("/auth", request.url));
    }
  }

  // 2. General user protected routes (/profile, /settings)
  const generalProtectedRoutes = ["/profile", "/settings"];
  const isGeneralProtected = generalProtectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isGeneralProtected) {
    if (!isTokenValid) {
      return NextResponse.redirect(new URL("/auth", request.url));
    }
    if (!isEmailVerified) {
      return NextResponse.redirect(new URL("/verify", request.url));
    }
  }

  // 3. Email verification page check
  if (pathname.startsWith("/verify")) {
    if (!isTokenValid) {
      return NextResponse.redirect(new URL("/auth", request.url));
    }
    // If email is already verified, send them to /profile or dashboard
    if (isEmailVerified) {
      const correctDashboard = protectedDashboards.find((d) => d.role === userRole);
      const redirectTarget = correctDashboard ? correctDashboard.defaultPath : "/profile";
      return NextResponse.redirect(new URL(redirectTarget, request.url));
    }
  }

  // 4. Authenticated users visiting /auth -> redirect to their dashboard
  if (pathname === "/auth" && isTokenValid && isEmailVerified && userRole) {
    const correctDashboard = protectedDashboards.find((d) => d.role === userRole);
    if (correctDashboard) {
      return NextResponse.redirect(new URL(correctDashboard.defaultPath, request.url));
    }
  }

  return NextResponse.next();
}

// Next.js Middleware matcher configuration
export const config = {
  matcher: [
    "/student/:path*",
    "/teacher/:path*",
    "/admin/:path*",
    "/institute/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/verify/:path*",
    "/auth",
  ],
};
