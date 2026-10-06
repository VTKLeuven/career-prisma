"use client";

import { createContext, useContext, useState } from "react";
import type { Company } from "@/lib/schema";

type SettingsCompany = {
  /** The company as last loaded or saved -- not the unsaved edits in a form. */
  company: Company | null;
  /** Call after a save, so the header and the other settings tabs show it. */
  setCompany: (company: Company | null) => void;
};

const SettingsCompanyContext = createContext<SettingsCompany | null>(null);

/**
 * The signed-in rep's company, loaded once by the settings layout on the
 * server and shared by its tabs. Each tab and the layout used to fetch it
 * again with a server action on every visit.
 */
export function SettingsCompanyProvider({
  initialCompany,
  children,
}: {
  initialCompany: Company | null;
  children: React.ReactNode;
}) {
  const [company, setCompany] = useState(initialCompany);
  // A server refresh hands down a newly loaded company; adopt it.
  const [loaded, setLoaded] = useState(initialCompany);
  if (loaded !== initialCompany) {
    setLoaded(initialCompany);
    setCompany(initialCompany);
  }
  return <SettingsCompanyContext.Provider value={{ company, setCompany }}>{children}</SettingsCompanyContext.Provider>;
}

export function useSettingsCompany(): SettingsCompany {
  const value = useContext(SettingsCompanyContext);
  if (!value) throw new Error("useSettingsCompany() must be used below the settings layout");
  return value;
}
