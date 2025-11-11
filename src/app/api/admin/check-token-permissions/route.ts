// app/api/admin/check-token-permissions/route.ts
// Diagnostic endpoint to check server token permissions
// This helps verify if the server token has the necessary permissions

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const serverToken = process.env.DIRECTUS_SERVER_TOKEN;
    const baseUrl = process.env.DIRECTUS_URL;

    if (!serverToken) {
      return NextResponse.json({
        error: "DIRECTUS_SERVER_TOKEN not configured",
        checks: {
          tokenConfigured: false,
        },
      }, { status: 500 });
    }

    if (!baseUrl) {
      return NextResponse.json({
        error: "DIRECTUS_URL not configured",
        checks: {
          tokenConfigured: true,
          urlConfigured: false,
        },
      }, { status: 500 });
    }

    const normalizedBase = baseUrl.replace(/\/+$/, "") + "/";
    const checks: Record<string, any> = {
      tokenConfigured: true,
      urlConfigured: true,
    };

    // 1. Check if token is valid and get user info (to see which role it uses)
    try {
      // First try with role fields
      let meRes = await fetch(`${normalizedBase}users/me?fields=id,email,role`, {
        headers: {
          "Authorization": `Bearer ${serverToken}`,
        },
      });

      // If that fails, try without role field (might not have permission to read it)
      if (!meRes.ok && meRes.status === 403) {
        meRes = await fetch(`${normalizedBase}users/me?fields=id,email`, {
          headers: {
            "Authorization": `Bearer ${serverToken}`,
          },
        });
      }

      if (meRes.ok) {
        const meData = await meRes.json();
        const userData = meData.data;
        checks.tokenValid = true;
        checks.userId = userData.id;
        checks.userEmail = userData.email;
        
        // Try to get role info separately if not included
        if (userData.role) {
          checks.roleId = userData.role?.id || userData.role;
          checks.roleName = userData.role?.name;
          checks.roleHasAdminAccess = userData.role?.admin_access === true;
        } else {
          // Try to fetch role info separately
          try {
            const userWithRoleRes = await fetch(`${normalizedBase}users/${userData.id}?fields=role`, {
              headers: {
                "Authorization": `Bearer ${serverToken}`,
              },
            });
            if (userWithRoleRes.ok) {
              const roleData = await userWithRoleRes.json();
              checks.roleId = roleData.data?.role || "Unknown";
            }
          } catch {
            // Can't get role info
          }
          
          // Try to get role details if we have role ID
          if (checks.roleId && checks.roleId !== "Unknown") {
            try {
              const roleRes = await fetch(`${normalizedBase}roles/${checks.roleId}?fields=id,name,admin_access`, {
                headers: {
                  "Authorization": `Bearer ${serverToken}`,
                },
              });
              if (roleRes.ok) {
                const roleInfo = await roleRes.json();
                checks.roleName = roleInfo.data?.name;
                checks.roleHasAdminAccess = roleInfo.data?.admin_access === true;
              }
            } catch {
              // Can't get role details
            }
          }
        }

        if (checks.roleHasAdminAccess) {
          checks.note = "Token has admin access - should have all permissions";
        } else {
          checks.note = "Token does NOT have admin access - check role permissions";
        }
      } else {
        const errorText = await meRes.text();
        checks.tokenValid = false;
        checks.tokenError = errorText;
        return NextResponse.json({
          error: "Server token is invalid or expired",
          checks,
        }, { status: 401 });
      }
    } catch (err) {
      checks.tokenValid = false;
      checks.tokenError = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({
        error: "Failed to validate server token",
        checks,
      }, { status: 500 });
    }

    // 2. Check if we can read a user (basic permission)
    try {
      const testUserId = checks.userId; // Use the token's own user ID
      const userReadRes = await fetch(`${normalizedBase}users/${testUserId}?fields=id,email,status`, {
        headers: {
          "Authorization": `Bearer ${serverToken}`,
        },
      });

      checks.canReadUsers = userReadRes.ok;
      if (!userReadRes.ok) {
        const errorData = await userReadRes.json().catch(() => null);
        checks.readUsersError = errorData?.errors?.[0]?.message || await userReadRes.text().catch(() => "Unknown error");
      }
    } catch (err) {
      checks.canReadUsers = false;
      checks.readUsersError = err instanceof Error ? err.message : "Unknown error";
    }

    // 3. Check if we can read user metadata field
    try {
      const testUserId = checks.userId;
      const metadataReadRes = await fetch(`${normalizedBase}users/${testUserId}?fields=id,email,status,metadata`, {
        headers: {
          "Authorization": `Bearer ${serverToken}`,
        },
      });

      checks.canReadMetadata = metadataReadRes.ok;
      if (!metadataReadRes.ok) {
        const errorData = await metadataReadRes.json().catch(() => null);
        checks.readMetadataError = errorData?.errors?.[0]?.message || "Cannot read metadata field";
        checks.readMetadataStatus = metadataReadRes.status;
      } else {
        const userData = await metadataReadRes.json();
        checks.metadataExample = userData.data?.metadata || null;
      }
    } catch (err) {
      checks.canReadMetadata = false;
      checks.readMetadataError = err instanceof Error ? err.message : "Unknown error";
    }

    // 4. Check if we can write/update user metadata (test with a safe operation)
    try {
      const testUserId = checks.userId;
      // Try to read current metadata first, then update it back
      const currentUserRes = await fetch(`${normalizedBase}users/${testUserId}?fields=metadata`, {
        headers: {
          "Authorization": `Bearer ${serverToken}`,
        },
      });

      if (currentUserRes.ok) {
        const currentData = await currentUserRes.json();
        const currentMetadata = currentData.data?.metadata || {};

        // Try to write metadata (set a test field and then remove it)
        const testMetadata = {
          ...currentMetadata,
          _permission_test: new Date().toISOString(),
        };

        const updateRes = await fetch(`${normalizedBase}users/${testUserId}`, {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${serverToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            metadata: testMetadata,
          }),
        });

        checks.canWriteMetadata = updateRes.ok;
        if (!updateRes.ok) {
          const errorData = await updateRes.json().catch(() => null);
          checks.writeMetadataError = errorData?.errors?.[0]?.message || "Cannot write metadata field";
          checks.writeMetadataStatus = updateRes.status;
        } else {
          // Clean up: remove the test field
          const cleanedMetadata = { ...testMetadata };
          delete cleanedMetadata._permission_test;

          await fetch(`${normalizedBase}users/${testUserId}`, {
            method: "PATCH",
            headers: {
              "Authorization": `Bearer ${serverToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              metadata: cleanedMetadata,
            }),
          }).catch(() => {
            // Ignore cleanup errors
          });
        }
      } else {
        // Can't read metadata, so we can't test write
        checks.canWriteMetadata = false;
        checks.writeMetadataError = "Cannot read metadata to test write permissions";
      }
    } catch (err) {
      checks.canWriteMetadata = false;
      checks.writeMetadataError = err instanceof Error ? err.message : "Unknown error";
    }

    // 5. Check if we can create users (another important permission)
    try {
      // Try to create a test user (we'll delete it immediately)
      // Use a properly formatted email address
      const testEmail = `test-permission-check-${Date.now()}@example.com`;
      const createRes = await fetch(`${normalizedBase}users`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${serverToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: testEmail,
          status: "invited",
        }),
      });

      checks.canCreateUsers = createRes.ok;
      if (createRes.ok) {
        const createData = await createRes.json();
        const testUserId = createData.data?.id;

        // Delete the test user immediately
        if (testUserId) {
          await fetch(`${normalizedBase}users/${testUserId}`, {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${serverToken}`,
            },
          }).catch(() => {
            // Ignore delete errors
          });
        }
      } else {
        const errorData = await createRes.json().catch(() => null);
        const errorMessage = errorData?.errors?.[0]?.message || "Cannot create users";
        checks.createUsersError = errorMessage;
        checks.createUsersStatus = createRes.status;
        
        // If it's a validation error (400), it might actually be a permissions issue
        // or it might be that the endpoint requires more fields
        if (createRes.status === 403) {
          checks.createUsersError = "Permission denied - role cannot create users";
        } else if (createRes.status === 400 && errorMessage.includes("email")) {
          // This is likely a validation issue, not permissions
          checks.createUsersNote = "Endpoint responded (not a permissions issue, likely validation)";
        }
      }
    } catch (err) {
      checks.canCreateUsers = false;
      checks.createUsersError = err instanceof Error ? err.message : "Unknown error";
    }

    // Summary and recommendations
    const recommendations: string[] = [];

    if (!checks.roleHasAdminAccess) {
      recommendations.push("⚠️ Server token role does NOT have admin access. Consider granting admin access or checking role permissions.");
    }

    if (!checks.canReadMetadata) {
      recommendations.push("❌ Cannot read metadata field. This will prevent token hash verification.");
      recommendations.push("   Fix: Go to Directus Admin > Settings > Roles & Permissions > [Your Role] > directus_users > Fields > metadata > Read: Allow");
    }

    if (!checks.canWriteMetadata) {
      recommendations.push("❌ Cannot write metadata field. This will prevent storing invite tokens.");
      recommendations.push("   Fix: Go to Directus Admin > Settings > Roles & Permissions > [Your Role] > directus_users > Fields > metadata > Update: Allow");
    }

    if (!checks.canCreateUsers) {
      recommendations.push("⚠️ Cannot create users. Check if this is expected for your use case.");
    }

    if (checks.canReadMetadata && checks.canWriteMetadata && checks.roleHasAdminAccess) {
      recommendations.push("✅ All permissions look good! Token should work correctly.");
    }

    return NextResponse.json({
      success: true,
      checks,
      recommendations,
      instructions: {
        checkPermissions: "To check/fix permissions in Directus:",
        steps: [
          "1. Log in to Directus Admin Panel",
          "2. Go to Settings > Users & Roles",
          `3. Find the user with email: ${checks.userEmail || 'check your server token user'}`,
          "4. Note which Role is assigned to this user",
          "5. Go to Settings > Roles & Permissions",
          `6. Find and click on that role${checks.roleName ? ` (${checks.roleName})` : ''}`,
          "7. Click on 'directus_users' collection",
          "8. Under 'Fields', scroll down and find 'metadata'",
          "9. For the 'metadata' field, set:",
          "   - Read: Allow",
          "   - Update: Allow",
          "10. Also ensure 'Create' and 'Read' permissions are set for the collection itself",
          "11. Save the changes",
        ],
        alternative: "Alternatively, if this role should have full admin access, enable 'Admin Access' for the role.",
      },
    });
  } catch (error) {
    console.error("[check-token-permissions] Error:", error);
    return NextResponse.json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

