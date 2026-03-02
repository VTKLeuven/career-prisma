"use server"

import { createDirectus, staticToken, rest, readMe } from "@directus/sdk";

export async function debugTokenAction() {
    const token = process.env.DIRECTUS_SERVER_TOKEN;
    const url = process.env.DIRECTUS_URL || "http://localhost:8055";

    if (!token) {
        return { success: false, message: "DIRECTUS_SERVER_TOKEN is missing from env." };
    }

    try {
        const client = createDirectus(url).with(staticToken(token)).with(rest());
        const me = await client.request(readMe({ fields: ['*', 'role.*'] }));

        return {
            success: true,
            user: {
                id: me.id,
                email: me.email,
                roleName: (me.role as any)?.name,
                roleId: (me.role as any)?.id,
                isAdmin: (me.role as any)?.admin_access === true // Check admin_access flag on role
            }
        };
    } catch (error: any) {
        return {
            success: false,
            message: "Token failed verification.",
            error: error.message || error
        };
    }
}
