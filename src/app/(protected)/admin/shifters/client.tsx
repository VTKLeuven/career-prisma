"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { toggleShifterStatusAction, listAllUsersAction } from "@/app/actions/shifters";
import { useRouter } from "next/navigation";
import { Check, X, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ShiftersClient({ initialUsers }: { initialUsers: any[] }) {
    const [users, setUsers] = useState(initialUsers);
    const [search, setSearch] = useState("");
    const router = useRouter();

    const handleToggle = async (user: any) => {
        // Optimistic update
        const newStatus = !user.is_shifter;
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_shifter: newStatus } : u));

        const res = await toggleShifterStatusAction(user.id, newStatus);
        if (!res.success) {
            // Revert if failed
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_shifter: !newStatus } : u));
            alert("Failed to update status");
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
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <Button type="submit" size="icon">
                    <Search className="h-4 w-4" />
                </Button>
            </form>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Shifter Status</TableHead>
                            <TableHead>Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">
                                    {user.first_name} {user.last_name}
                                </TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>{user.role?.name || "User"}</TableCell>
                                <TableCell>
                                    {user.is_shifter ? (
                                        <Badge className="bg-green-500">Active Shifter</Badge>
                                    ) : (
                                        <Badge variant="outline">User</Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Button
                                        variant={user.is_shifter ? "destructive" : "default"}
                                        size="sm"
                                        onClick={() => handleToggle(user)}
                                    >
                                        {user.is_shifter ? "Remove Shifter" : "Make Shifter"}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
