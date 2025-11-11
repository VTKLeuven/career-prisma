// app/api/admin/test-metadata-access/route.ts
// Test metadata access with the server token directly

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
    const tests: Record<string, any> = {};

    // Test 1: Get user info with all fields
    try {
      const meRes = await fetch(`${normalizedBase}users/me`, {
        headers: {
          "Authorization": `Bearer ${serverToken}`,
        },
      });

      if (meRes.ok) {
        const meData = await meRes.json();
        tests.userInfo = {
          id: meData.data.id,
          email: meData.data.email,
          role: meData.data.role,
        };
      } else {
        tests.userInfoError = await meRes.text();
      }
    } catch (err) {
      tests.userInfoError = err instanceof Error ? err.message : "Unknown error";
    }

    // Test 2: Try to read metadata using different field selection methods
    const userId = tests.userInfo?.id;
    
    if (userId) {
      // Method 1: Request metadata field explicitly
      try {
        const res1 = await fetch(`${normalizedBase}users/${userId}?fields=metadata`, {
          headers: {
            "Authorization": `Bearer ${serverToken}`,
          },
        });
        tests.metadataExplicit = {
          status: res1.status,
          ok: res1.ok,
          error: res1.ok ? null : await res1.text().catch(() => "Unknown error"),
        };
      } catch (err) {
        tests.metadataExplicit = {
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }

      // Method 2: Request all fields with wildcard
      try {
        const res2 = await fetch(`${normalizedBase}users/${userId}?fields=*`, {
          headers: {
            "Authorization": `Bearer ${serverToken}`,
          },
        });
        if (res2.ok) {
          const data = await res2.json();
          tests.metadataWildcard = {
            status: res2.status,
            ok: true,
            hasMetadata: 'metadata' in (data.data || {}),
            metadataKeys: data.data?.metadata ? Object.keys(data.data.metadata) : null,
          };
        } else {
          tests.metadataWildcard = {
            status: res2.status,
            ok: false,
            error: await res2.text().catch(() => "Unknown error"),
          };
        }
      } catch (err) {
        tests.metadataWildcard = {
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }

      // Method 3: Try to write metadata (even if we can't read it)
      try {
        // First get current user data
        const currentRes = await fetch(`${normalizedBase}users/${userId}`, {
          headers: {
            "Authorization": `Bearer ${serverToken}`,
          },
        });

        if (currentRes.ok) {
          const currentData = await currentRes.json();
          const currentMetadata = currentData.data?.metadata || {};

          // Try to update with metadata
          const updateRes = await fetch(`${normalizedBase}users/${userId}`, {
            method: "PATCH",
            headers: {
              "Authorization": `Bearer ${serverToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              metadata: {
                ...currentMetadata,
                test_field: "test_value",
              },
            }),
          });

          tests.metadataWrite = {
            status: updateRes.status,
            ok: updateRes.ok,
            error: updateRes.ok ? null : await updateRes.text().catch(() => "Unknown error"),
          };

          // Clean up test field if write succeeded
          if (updateRes.ok) {
            await fetch(`${normalizedBase}users/${userId}`, {
              method: "PATCH",
              headers: {
                "Authorization": `Bearer ${serverToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                metadata: currentMetadata, // Restore original
              }),
            }).catch(() => {
              // Ignore cleanup errors
            });
          }
        }
      } catch (err) {
        tests.metadataWrite = {
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }

      // Test 4: Check role permissions directly
      const roleId = tests.userInfo?.role;
      if (roleId) {
        try {
          const roleIdStr = typeof roleId === 'object' ? roleId.id : roleId;
          const roleRes = await fetch(`${normalizedBase}roles/${roleIdStr}`, {
            headers: {
              "Authorization": `Bearer ${serverToken}`,
            },
          });

          if (roleRes.ok) {
            const roleData = await roleRes.json();
            tests.roleInfo = {
              id: roleData.data.id,
              name: roleData.data.name,
              admin_access: roleData.data.admin_access,
            };
          }
        } catch (err) {
          tests.roleInfoError = err instanceof Error ? err.message : "Unknown error";
        }
      }

      // Test 5: Try using GraphQL endpoint (sometimes works differently)
      try {
        const graphqlRes = await fetch(`${normalizedBase}graphql`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${serverToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `{
              users_by_id(id: "${userId}") {
                id
                email
                metadata
              }
            }`,
          }),
        });

        if (graphqlRes.ok) {
          const graphqlData = await graphqlRes.json();
          tests.graphql = {
            ok: true,
            hasMetadata: graphqlData.data?.users_by_id?.metadata !== undefined,
            error: graphqlData.errors || null,
          };
        } else {
          tests.graphql = {
            ok: false,
            error: await graphqlRes.text().catch(() => "Unknown error"),
          };
        }
      } catch (err) {
        tests.graphql = {
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    }

    // Analysis
    const canReadMetadata = tests.metadataExplicit?.ok || tests.metadataWildcard?.hasMetadata;
    const canWriteMetadata = tests.metadataWrite?.ok;

    return NextResponse.json({
      success: true,
      tests,
      analysis: {
        canReadMetadata,
        canWriteMetadata,
        roleHasAdminAccess: tests.roleInfo?.admin_access === true,
        recommendations: [
          ...(tests.roleInfo?.admin_access && !canReadMetadata ? [
            "⚠️ Role has Admin Access but cannot read metadata.",
            "   This suggests field-level permissions are overriding admin access.",
            "   Fix: Go to Settings > Roles & Permissions > Administrator > directus_users > Fields > metadata",
            "   Ensure 'Read' and 'Update' are set to 'Allow' (or remove field-level restrictions)",
          ] : []),
          ...(!tests.roleInfo?.admin_access ? [
            "❌ Role does NOT have Admin Access enabled.",
            "   Even though you see it in the UI, the API reports it's disabled.",
            "   Try: Refresh the page, clear cache, or check if there are multiple roles with similar names.",
          ] : []),
          ...(canReadMetadata && canWriteMetadata ? [
            "✅ Metadata access is working! The invitation system should work now.",
          ] : []),
        ],
      },
      nextSteps: canReadMetadata && canWriteMetadata ? [
        "Metadata access is confirmed. Try creating a user again - invitation emails should work.",
      ] : [
        "1. Check field-level permissions for metadata field in Administrator role",
        "2. Ensure 'Read' and 'Update' are set to 'Allow' (not 'Use Access Control' or restricted)",
        "3. Save changes and test again",
        "4. If still not working, try disabling field-level permissions entirely for the metadata field",
      ],
    });
  } catch (error) {
    console.error("[test-metadata-access] Error:", error);
    return NextResponse.json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}



