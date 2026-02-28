"use client";

import { useState } from "react";
import { debugTokenAction } from "@/app/actions/debug";
import { Button } from "@/components/ui/button";

export default function DebugPage() {
    const [result, setResult] = useState<any>(null);

    const runDebug = async () => {
        const res = await debugTokenAction();
        setResult(res);
    };

    return (
        <div className="p-10">
            <h1 className="text-2xl font-bold mb-4">Token Debugger</h1>
            <Button onClick={runDebug}>Check Server Token</Button>
            <pre className="mt-4 bg-gray-100 p-4 rounded overflow-auto border">
                {JSON.stringify(result, null, 2)}
            </pre>
        </div>
    );
}
