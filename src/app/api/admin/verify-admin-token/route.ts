// app/api/admin/verify-admin-token/route.ts
// Verify if a token has admin access and help diagnose permission issues

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const serverToken = process.env.DIRECTUS_SERVER_TOKEN;
    const baseUrl = process.env.DIRECTUS_URL;

    if (!serverToken || !baseUrl) {
      return NextResponse.json({
        error: "Server token or URL not configured",
      }, { status: 500 });
    }

    const normalizedBase = baseUrl.replace(/\/+$/, "") + "/";
    const info: Record<string, any> = {};

    // Get user info
    try {
      const meRes = await fetch(`${normalizedBase}users/me`, {
        headers: {
          "Authorization": `Bearer ${serverToken}`,
        },
      });

      if (!meRes.ok) {
        return NextResponse.json({
          error: "Token is invalid",
          status: meRes.status,
        }, { status: 401 });
      }

      const meData = await meRes.json();
      const user = meData.data;
      
      info.user = {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        status: user.status,
      };

      // Try to get role info - might need to fetch separately
      let roleId = user.role;
      if (typeof roleId === 'object') {
        roleId = roleId.id;
      }

      info.roleId = roleId;

      // Fetch role details
      if (roleId) {
        try {
          const roleRes = await fetch(`${normalizedBase}roles/${roleId}`, {
            headers: {
              "Authorization": `Bearer ${serverToken}`,
            },
          });

          if (roleRes.ok) {
            const roleData = await roleRes.json();
            const role = roleData.data;
            info.role = {
              id: role.id,
              name: role.name,
              admin_access: role.admin_access,
              description: role.description,
            };
          }
        } catch (err) {
          info.roleError = err instanceof Error ? err.message : "Unknown error";
        }
      }

      // Try to check if we can access admin endpoints
      try {
        const adminRes = await fetch(`${normalizedBase}server/info`, {
          headers: {
            "Authorization": `Bearer ${serverToken}`,
          },
        });
        info.canAccessAdminEndpoints = adminRes.ok;
      } catch {
        info.canAccessAdminEndpoints = false;
      }

      // Try to check if we can read all users (admin operation)
      try {
        const usersRes = await fetch(`${normalizedBase}users?limit=1`, {
          headers: {
            "Authorization": `Bearer ${serverToken}`,
          },
        });
        info.canReadAllUsers = usersRes.ok;
      } catch {
        info.canReadAllUsers = false;
      }

      // Try to check if we can read metadata
      try {
        const metadataRes = await fetch(`${normalizedBase}users/${user.id}?fields=metadata`, {
          headers: {
            "Authorization": `Bearer ${serverToken}`,
          },
        });
        info.canReadMetadata = metadataRes.ok;
        if (!metadataRes.ok) {
          const errorData = await metadataRes.json().catch(() => null);
          info.metadataError = errorData?.errors?.[0]?.message || "Cannot read metadata";
        }
      } catch {
        info.canReadMetadata = false;
      }

    } catch (err) {
      return NextResponse.json({
        error: "Failed to verify token",
        message: err instanceof Error ? err.message : "Unknown error",
      }, { status: 500 });
    }

    // Determine if this should be an admin account
    const isOriginalAdmin = info.user?.email?.toLowerCase().includes('admin') || 
                           info.user?.email?.toLowerCase().includes('root') ||
                           info.role?.name?.toLowerCase().includes('admin') ||
                           info.role?.admin_access === true;

    return NextResponse.json({
      success: true,
      info,
      analysis: {
        isOriginalAdmin: isOriginalAdmin,
        hasAdminAccess: info.role?.admin_access === true,
        canReadMetadata: info.canReadMetadata,
        recommendations: [
          ...(info.role?.admin_access !== true ? [
            `⚠️ Role "${info.role?.name || 'Unknown'}" does NOT have Admin Access enabled.`,
            `   This is the original admin account, so Admin Access should be enabled.`,
            `   Fix: Go to Settings > Roles & Permissions > "${info.role?.name || 'Unknown'}" > Enable "Admin Access" toggle`
          ] : []),
          ...(info.canReadMetadata === false ? [
            `❌ Cannot read metadata field.`,
            `   This will prevent the invitation system from working.`,
            `   Fix: Enable Admin Access OR grant metadata field permissions`
          ] : []),
          ...(info.role?.admin_access === true && info.canReadMetadata === true ? [
            `✅ Token has proper admin access and can read metadata. Everything should work!`
          ] : [])
        ],
      },
      instructions: {
        enableAdminAccess: [
          "1. Log in to Directus Admin Panel",
          `2. Go to Settings > Roles & Permissions`,
          `3. Find role: "${info.role?.name || 'Unknown'}" (ID: ${info.roleId})`,
          "4. Scroll down to find 'Admin Access' toggle",
          "5. Enable it (toggle ON)",
          "6. Save changes",
          "7. Wait a few seconds and test again"
        ],
        checkUser: [
          "1. Log in to Directus Admin Panel",
          "2. Go to Settings > Users & Roles",
          `3. Find user: ${info.user?.email || 'check by ID: ' + info.user?.id}`,
          "4. Check which Role is assigned",
          "5. Verify it's the admin role"
        ]
      }
    });
  } catch (error) {
    console.error("[verify-admin-token] Error:", error);
    return NextResponse.json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}



