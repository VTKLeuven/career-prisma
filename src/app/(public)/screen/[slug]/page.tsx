import { ScreenViewer } from "./ScreenViewer";

export default async function ScreenPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    return <ScreenViewer slug={slug} />;
}
