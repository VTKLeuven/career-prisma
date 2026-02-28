import type { NextAuthOptions } from "next-auth";

type KuLeuvenProfile = {
  sub: string;
  name?: string | null;
  preferred_username?: string | null;
  email?: string | null;
};

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    {
      id: "kuleuven",
      name: "KU Leuven",
      type: "oauth",
      issuer: process.env.KULEUVEN_ISSUER?.replace(/\/+$/, ""),
      wellKnown: process.env.KULEUVEN_ISSUER
        ? `${process.env.KULEUVEN_ISSUER.replace(/\/+$/, "")}/.well-known/openid-configuration`
        : undefined,
      clientId: process.env.KULEUVEN_CLIENT_ID ?? "",
      clientSecret: process.env.KULEUVEN_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope: "openid profile email",
        },
      },
      idToken: true,
      checks: ["pkce", "state"],
      profile(profile: KuLeuvenProfile) {
        return {
          id: profile.sub,
          name: profile.name ?? profile.preferred_username ?? null,
          email: profile.email ?? null,
        };
      },
    } as any,
  ],
};