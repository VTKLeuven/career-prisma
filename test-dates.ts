import { fetchCompletedOrdersAction } from "./src/app/actions/orders";

async function main() {
    const data = await fetchCompletedOrdersAction();
    const orders = data.orders;
    const dateCounts: Record<string, number> = {};
    orders.forEach(o => {
        const d = new Date(o.date_created).toDateString();
        dateCounts[d] = (dateCounts[d] || 0) + 1;
    });
    console.log("Date counts:", dateCounts);
}
main().catch(console.error);
