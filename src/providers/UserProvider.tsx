// app/providers/UserProvider.tsx
"use client";

import { DirectusUser } from "@/lib/schema";
import { createContext, useContext, useState } from "react";

const UserContext = createContext<{
  user: DirectusUser;
  setUser: (u: DirectusUser) => void;
}>({
  user: null,
  setUser: () => {},
});

export function UserProvider({
  initialUser,
  children,
}: {
  initialUser: DirectusUser;
  children: React.ReactNode;
}) {
  console.log(initialUser)
  const [user, setUser] = useState<DirectusUser>(initialUser);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
