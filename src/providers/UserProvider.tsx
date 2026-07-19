// app/providers/UserProvider.tsx
"use client";

import { AppUser } from "@/lib/schema";
import { createContext, useContext, useState } from "react";

const UserContext = createContext<{
  user: AppUser;
  setUser: (u: AppUser) => void;
}>({
  user: null,
  setUser: () => {},
});

export function UserProvider({
  initialUser,
  children,
}: {
  initialUser: AppUser;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<AppUser>(initialUser);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
