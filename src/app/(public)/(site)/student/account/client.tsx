"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StudyFields } from "@/components/student/StudyFields";
import { labelForProgramme, labelForYear } from "@/lib/study-options";
import { saveLanguageAction, saveStudyDetailsAction } from "@/app/actions/student-study";
import {
  AccountDetailsCard,
  DeleteAccountCard,
  PasswordCard,
  Status,
  type Message,
} from "./account-cards";

type Language = "nl" | "en";

type FromVtk = {
  syncedAt: string | null;
  studentNumber: string | null;
  programmes: string[];
  years: string[];
  notAtFaculty: boolean | null;
  confirmedYear: number | null;
  locale: string | null;
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-4 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}

/** A claim list as labels, with the raw values the SSO sent beside them. */
function ClaimList({ values, label }: { values: string[]; label: (v: string) => string }) {
  if (!values.length) return <span className="text-muted-foreground">nothing on file</span>;
  return (
    <>
      {values.map(label).join(", ")}{" "}
      <span className="font-mono text-xs text-muted-foreground">[{values.join(", ")}]</span>
    </>
  );
}

export default function StudentAccountClient({
  name,
  email,
  firstName,
  lastName,
  university,
  studentNumber,
  hasPassword,
  viaSso,
  language: initialLanguage,
  programmes: initialProgrammes,
  years: initialYears,
  editable,
  vtkAccountUrl,
  fromVtk,
}: {
  name: string;
  email: string;
  firstName: string;
  lastName: string;
  university: string;
  studentNumber: string | null;
  hasPassword: boolean;
  viaSso: boolean;
  language: Language | null;
  programmes: string[];
  years: string[];
  editable: { programmes: boolean; years: boolean };
  vtkAccountUrl: string;
  fromVtk: FromVtk | null;
}) {
  const router = useRouter();

  const [language, setLanguage] = useState<Language | null>(initialLanguage);
  const [languageMessage, setLanguageMessage] = useState<Message>(null);

  const [programmes, setProgrammes] = useState(initialProgrammes);
  const [years, setYears] = useState(initialYears);
  const [savingStudy, setSavingStudy] = useState(false);
  const [studyMessage, setStudyMessage] = useState<Message>(null);

  const anythingLocked = !editable.programmes || !editable.years;
  const anythingEditable = editable.programmes || editable.years;
  // Back here after the login flow; `silent` is not set on purpose, so a
  // student who declined a scope before gets to reconsider.
  const refreshHref = `/api/auth/oauth/initiate?redirect_to=${encodeURIComponent("/student/account")}`;

  async function onLanguageChange(value: string) {
    const next = value as Language;
    setLanguage(next);
    setLanguageMessage(null);
    const result = await saveLanguageAction(next);
    setLanguageMessage(result.ok ? { ok: true, text: "Saved." } : { ok: false, text: result.error });
  }

  async function onSaveStudy(e: React.FormEvent) {
    e.preventDefault();
    setSavingStudy(true);
    setStudyMessage(null);
    const result = await saveStudyDetailsAction({ programmes, years });
    setSavingStudy(false);
    setStudyMessage(result.ok ? { ok: true, text: "Saved." } : { ok: false, text: result.error });
    if (result.ok) router.refresh();
  }

  return (
    <div className="container mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold">My account</h1>
        <p className="text-muted-foreground">
          {name} · {email}
          {viaSso ? " · signed in with your VTK account" : " · signed in with email and password"}
        </p>
      </div>

      <AccountDetailsCard
        viaSso={viaSso}
        firstName={firstName}
        lastName={lastName}
        email={email}
        university={university}
        studentNumber={studentNumber}
        vtkAccountUrl={vtkAccountUrl}
      />

      {!viaSso && hasPassword && <PasswordCard />}

      <Card>
        <CardHeader>
          <CardTitle>Preferred language</CardTitle>
          <CardDescription>The language we use when we contact you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="language" className="sr-only">
            Preferred language
          </Label>
          <Select value={language ?? undefined} onValueChange={onLanguageChange}>
            <SelectTrigger id="language" className="w-56">
              <SelectValue placeholder="Choose a language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nl">Nederlands</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
          <Status message={languageMessage} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Study</CardTitle>
          <CardDescription>
            {viaSso && anythingLocked ? (
              editable.programmes ? (
                <>
                  Your year comes from your VTK account. Because you are not studying at the
                  faculty, you choose your programme here.
                </>
              ) : (
                <>
                  Your study details come from your VTK account. Change them on vtk.be, then
                  refresh them here.
                </>
              )
            ) : (
              <>What you study and in which year.</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={onSaveStudy}>
            <StudyFields
              programmes={programmes}
              years={years}
              onProgrammesChange={setProgrammes}
              onYearsChange={setYears}
              programmesDisabled={!editable.programmes}
              yearsDisabled={!editable.years}
            />

            <Status message={studyMessage} />

            <div className="flex flex-wrap gap-3">
              {anythingEditable && (
                <Button type="submit" className="cursor-pointer" disabled={savingStudy}>
                  {savingStudy ? "Saving…" : "Save study details"}
                </Button>
              )}
              {viaSso && (
                <>
                  <Button asChild variant="outline">
                    <a href={vtkAccountUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Change on vtk.be
                    </a>
                  </Button>
                  <Button asChild variant="outline">
                    {/* A plain link, not <Link>: the login flow is a redirect chain. */}
                    <a href={refreshHref}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh from vtk.be
                    </a>
                  </Button>
                </>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {fromVtk && (
        <Card>
          <CardHeader>
            <CardTitle>From vtk.be</CardTitle>
            <CardDescription>
              Exactly what your VTK account shared with us at your last sign-in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl>
              <Row label="Last updated">
                {fromVtk.syncedAt
                  ? new Date(fromVtk.syncedAt).toLocaleString("en-GB", { timeZone: "Europe/Brussels" })
                  : "never"}
              </Row>
              <Row label="Student number">
                {fromVtk.studentNumber ?? <span className="text-muted-foreground">not shared</span>}
              </Row>
              <Row label="Programmes">
                <ClaimList values={fromVtk.programmes} label={labelForProgramme} />
              </Row>
              <Row label="Years">
                <ClaimList values={fromVtk.years} label={labelForYear} />
              </Row>
              <Row label="Not at the faculty">
                {fromVtk.notAtFaculty === null ? "not shared" : fromVtk.notAtFaculty ? "yes" : "no"}
              </Row>
              <Row label="Confirmed for">
                {fromVtk.confirmedYear
                  ? `${fromVtk.confirmedYear}–${fromVtk.confirmedYear + 1}`
                  : "not confirmed"}
              </Row>
              <Row label="Language on vtk.be">{fromVtk.locale ?? "not shared"}</Row>
            </dl>
          </CardContent>
        </Card>
      )}

      <DeleteAccountCard viaSso={viaSso} />
    </div>
  );
}
