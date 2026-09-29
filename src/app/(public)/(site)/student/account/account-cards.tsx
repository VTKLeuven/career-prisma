"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  changeEmailAction,
  changePasswordAction,
  deleteOwnAccountAction,
  updateAccountDetailsAction,
} from "@/app/actions/student-account";

export type Message = { ok: boolean; text: string } | null;

export function Status({ message }: { message: Message }) {
  if (!message) return null;
  return (
    <p
      className={message.ok ? "text-sm text-green-700" : "text-sm text-red-600"}
      role={message.ok ? "status" : "alert"}
    >
      {message.text}
    </p>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

/**
 * Name, email and (for SSO students) r-number. Read-only for an SSO student,
 * whose details vtk.be owns; editable for a password student.
 */
export function AccountDetailsCard({
  viaSso,
  firstName: initialFirstName,
  lastName: initialLastName,
  email: initialEmail,
  university: initialUniversity,
  studentNumber,
  vtkAccountUrl,
}: {
  viaSso: boolean;
  firstName: string;
  lastName: string;
  email: string;
  university: string;
  studentNumber: string | null;
  vtkAccountUrl: string;
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [university, setUniversity] = useState(initialUniversity);
  const [email, setEmail] = useState(initialEmail);
  const [emailPassword, setEmailPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const emailChanged = email.trim().toLowerCase() !== initialEmail;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const details = await updateAccountDetailsAction({ firstName, lastName, university });
    if (!details.ok) {
      setSaving(false);
      setMessage({ ok: false, text: details.error });
      return;
    }

    if (emailChanged) {
      const changed = await changeEmailAction({ email, currentPassword: emailPassword });
      if (!changed.ok) {
        setSaving(false);
        setMessage({ ok: false, text: changed.error });
        return;
      }
      setEmailPassword("");
    }

    setSaving(false);
    setMessage({ ok: true, text: "Saved." });
    router.refresh();
  }

  if (viaSso) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
          <CardDescription>
            These come from your VTK account. Change them on vtk.be; they update here the next
            time you sign in or refresh.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="first-name" label="First name">
              <Input id="first-name" value={initialFirstName} disabled />
            </Field>
            <Field id="last-name" label="Last name">
              <Input id="last-name" value={initialLastName} disabled />
            </Field>
            <Field id="email" label="Email">
              <Input id="email" value={initialEmail} disabled />
            </Field>
            <Field id="student-number" label="Student number">
              <Input id="student-number" value={studentNumber ?? "not shared"} disabled />
            </Field>
          </div>
          <Button asChild variant="outline">
            {/* #profile: the section of vtk.be/account where a member edits
                their name. Email and r-number are read-only there too. */}
            <a href={`${vtkAccountUrl}#profile`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Change on vtk.be
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account details</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="first-name" label="First name">
              <Input
                id="first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                maxLength={255}
              />
            </Field>
            <Field id="last-name" label="Last name">
              <Input
                id="last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                maxLength={255}
              />
            </Field>
            <Field id="university" label="University">
              <Input
                id="university"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                maxLength={255}
              />
            </Field>
            <Field id="email" label="Email (you sign in with this)">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
              />
            </Field>
          </div>

          {emailChanged && (
            <Field id="email-password" label="Current password, to change your email">
              <Input
                id="email-password"
                type="password"
                autoComplete="current-password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                required
                className="sm:w-1/2"
              />
            </Field>
          )}

          <Status message={message} />
          <Button type="submit" className="cursor-pointer" disabled={saving}>
            {saving ? "Saving…" : "Save details"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/** Only for password students; SSO students have no password here. */
export function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      setMessage({ ok: false, text: "The new passwords do not match." });
      return;
    }
    setSaving(true);
    setMessage(null);
    const result = await changePasswordAction({ currentPassword: current, newPassword: next });
    setSaving(false);
    if (!result.ok) {
      setMessage({ ok: false, text: result.error });
      return;
    }
    setCurrent("");
    setNext("");
    setConfirm("");
    setMessage({ ok: true, text: "Your password has been changed." });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="current-password" label="Current password">
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
              />
            </Field>
            <Field id="new-password" label="New password">
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
              />
            </Field>
            <Field id="confirm-password" label="Repeat new password">
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </Field>
          </div>
          <Status message={message} />
          <Button type="submit" className="cursor-pointer" disabled={saving}>
            {saving ? "Saving…" : "Change password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/** Deleting the account, behind an "are you sure?" dialog. */
export function DeleteAccountCard({ viaSso }: { viaSso: boolean }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    setDeleting(true);
    setError(null);
    const result = await deleteOwnAccountAction();
    if (!result.ok) {
      setDeleting(false);
      setError(result.error);
      return;
    }
    // A full navigation, so every provider forgets the signed-in student.
    window.location.assign("/");
  }

  return (
    <Card className="border-red-200 dark:border-red-900/50">
      <CardHeader>
        <CardTitle className="text-red-700 dark:text-red-400">Delete account</CardTitle>
        <CardDescription>
          Permanently removes your account, your liked companies and your matching answers from
          VTK Career. This cannot be undone.
          {viaSso && " Your VTK account on vtk.be is not affected."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="cursor-pointer">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete my account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                Your VTK Career account and everything linked to it will be deleted permanently.
                {viaSso &&
                  " If you sign in with your VTK account again later, you will start with a new, empty account."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              {/* A plain Button, not AlertDialogAction: that one closes the
                  dialog on click, before the delete has finished or failed. */}
              <Button
                variant="destructive"
                className="cursor-pointer"
                disabled={deleting}
                onClick={onConfirm}
              >
                {deleting ? "Deleting…" : "Yes, delete my account"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
