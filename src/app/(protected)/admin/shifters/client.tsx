"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/admin/DataTable";
import { Input } from "@/components/ui/input";
import { toggleShifterStatusAction, listAllUsersAction } from "@/app/actions/shifters";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type ShifterCandidate = Awaited<ReturnType<typeof listAllUsersAction>>[number];

export default function ShiftersClient({ initialUsers }: { initialUsers: ShifterCandidate[] }) {
    const [users, setUsers] = useState(initialUsers);
    const [search, setSearch] = useState("");
    const router = useRouter();

    const handleToggle = async (user: ShifterCandidate) => {
        // Optimistic update
        const newStatus = !user.is_shifter;
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_shifter: newStatus } : u));

        const res = await toggleShifterStatusAction(String(user.id), newStatus);
        if (!res.success) {
            // Revert if failed
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_shifter: !newStatus } : u));
            toast.error("Failed to update status");
        } else {
            router.refresh();
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const results = await listAllUsersAction(search);
        setUsers(results);
    };

    return (
        <div className="space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2 max-w-sm">
                <Input
                    placeholder="Find any student by name or email…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <Button type="submit" size="icon" aria-label="Search">
                    <Search className="h-4 w-4" />
                </Button>
            </form>

            <DataTable
                rows={users}
                columns={[
                    { key: "name", label: "Name", value: (user) => [user.first_name, user.last_name].filter(Boolean).join(" ") },
                    { key: "email", label: "Email" },
                    {
                        key: "is_shifter",
                        label: "Shifter status",
                        value: (user) => Boolean(user.is_shifter),
                        render: (user) =>
                            user.is_shifter ? <Badge variant="success">Active shifter</Badge> : <Badge variant="muted">Student</Badge>,
                    },
                ]}
                getRowId={(user) => String(user.id)}
                noun="student"
                search={false}
                emptyMessage="No students found"
                rowActionsAlwaysVisible
                rowActions={(user) => (
                    <Button
                        variant={user.is_shifter ? "outline" : "default"}
                        size="sm"
                        onClick={() => handleToggle(user)}
                    >
                        {user.is_shifter ? "Remove shifter" : "Make shifter"}
                    </Button>
                )}
            />
        </div>
    );
}
