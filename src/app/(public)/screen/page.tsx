import Link from "next/link";
import { readItems } from "@directus/sdk";
import { getServerDirectusClient } from "@/lib/directus";

export const runtime = "nodejs";

export default async function SignageScreenIndexPage() {
    const client = await getServerDirectusClient();
    const screens = (await client.request(
        readItems("signage_screens" as any, {
            fields: ["id", "name", "slug"],
            filter: { status: { _eq: "published" } } as any,
            sort: ["name"],
            limit: -1,
        } as any)
    )) as { id: string; name: string; slug: string }[];

    return (
        <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex flex-col">
            <header className="border-b border-zinc-800 px-6 py-8 sm:px-10">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    Digital signage
                </h1>
                <p className="mt-2 max-w-xl text-sm text-zinc-400">
                    Choose a display to open its full-screen viewer. No login required.
                </p>
            </header>

            <main className="flex-1 px-6 py-8 sm:px-10">
                {screens.length === 0 ? (
                    <p className="text-zinc-500">No published screens yet.</p>
                ) : (
                    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {screens.map((screen) => (
                            <li key={screen.id}>
                                <Link
                                    href={`/screen/${encodeURIComponent(screen.slug)}`}
                                    className="block rounded-lg border border-zinc-800 bg-zinc-900/50 px-5 py-4 transition-colors hover:border-zinc-600 hover:bg-zinc-900"
                                >
                                    <span className="block font-medium">{screen.name}</span>
                                    <span className="mt-1 block font-mono text-xs text-zinc-500">
                                        /screen/{screen.slug}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </main>
        </div>
    );
}
