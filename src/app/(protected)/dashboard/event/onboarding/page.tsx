"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {  IconCheck, IconEdit, IconEye, IconMail, IconPhone, IconRefresh, IconUser } from "@tabler/icons-react";

// New component for Event Details Card
function EventDetailsCard() {
  function addToAgenda() {
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      "UID:" + Date.now() + "@example.com",
      "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z",
      "DTSTART:20250514T090000Z",
      "DTEND:20250514T170000Z",
      "SUMMARY:VTK Jobfair 2025",
      "LOCATION:Brabanthal, Brabantlaan 1, 3001 Leuven",
      "DESCRIPTION:Join us for the annual VTK Jobfair, exact details can be found on our carreer site.",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "annual-tech-conference-2025.ics";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="rounded-2xl shadow-md bg-slate-700 text-white">
      <CardHeader>
        <CardTitle>VTK Jobfair</CardTitle>
        <div className="grid grid-cols-[150px_1fr] gap-y-1 text-sm mt-6">
          <span className="font-medium">Date:</span>
          <span>Mar 14, 2025</span>
          <span className="font-medium">Time:</span>
          <span>9:00 - 17:00</span>
          <span className="font-medium">Location:</span>
          <span>Brabanthal, Brabantlaan 1, 3001 Leuven</span>
        </div>
      </CardHeader>
      <CardContent>
        <Button variant="outline" className="text-slate-700" onClick={addToAgenda}>Save to Agenda</Button>
      </CardContent>
    </Card>
  );
}

function GeneralCompanyInfoForm() {
  return (
    <Card className="rounded-2xl shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Primary Contact For Issues</CardTitle>
          <p className="text-sm font-semibold text-red-600">
            Submission Deadline: <time dateTime="2025-09-01">September 1, 2025</time>
          </p>
        </div>
      </CardHeader>

      <CardContent>
        <form className="space-y-6">

          <div className="w-full">
            <Label htmlFor="contact-name">Name</Label>
            <div className="relative">
              <Input id="contact-name" placeholder="Contact Name" className="pl-10" />
              <IconUser className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            </div>
          </div>

          <div className="w-full">
            <Label htmlFor="contact-email">Email</Label>
            <div className="relative">
              <Input id="contact-email" type="email" placeholder="contact@example.com" className="pl-10" />
              <IconMail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            </div>
          </div>

          <div className="w-full">
            <Label htmlFor="contact-tel">Phone</Label>
            <div className="relative">
              <Input id="contact-tel" type="tel" placeholder="+123456789" className="pl-10" />
              <IconPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            </div>
          </div>


          <div className="flex justify-end">
            <Button type="submit" className="flex items-center gap-2">
              <IconCheck size={18} /> Submit
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}


function CompanyGuideForm() {
  return (
    <Card className="rounded-2xl shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">        <CardTitle className="text-xl">Company Guide Form</CardTitle>
          <p className="text-sm font-semibold text-red-600">
            Submission Deadline: <time dateTime="2025-09-01">xxx</time>
          </p></div>
        <CardDescription>
          The company guide is an online/physical book containing details of all
          attending companies. It is a great tool for students to prepare their visit
          to our events. It also enables them to easily find a contact email/website
          in case they have any follow-up questions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Button type="submit"><IconEdit />Start Editing Your CG Info</Button>
          <Button variant="secondary" type="submit"><IconEye />Preview Example</Button>
        </div>
      </CardContent>
    </Card>
  );
}


type Participant = {
  name: string;
  diet: string;
  dietOther?: string;
};

export default function CompanyParticipantsForm() {
  const [description, setDescription] = useState("");
  const [participants, setParticipants] = useState<Participant[]>(
    Array.from({ length: 6 }, () => ({ name: "", diet: "none", dietOther: "" }))
  );
  const [submittedJson, setSubmittedJson] = useState<string | null>(null);
  const [errors, setErrors] = useState<string | null>(null);

  function updateParticipant(index: number, patch: Partial<Participant>) {
    setParticipants((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      if (patch.diet && patch.diet !== "other") copy[index].dietOther = "";
      return copy;
    });
  }

  function validate() {
    const anyName = participants.some((p) => p.name.trim());
    if (!anyName) return "At least one participant name is required";
    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setErrors(err);
      setSubmittedJson(null);
      return;
    }
    setErrors(null);

    const payload = {
      description: description.trim(),
      participants: participants
        .filter((p) => p.name.trim())
        .map((p) => ({ name: p.name.trim(), diet: p.diet === "other" ? p.dietOther || "other" : p.diet })),
      submittedAt: new Date().toISOString(),
    };

    setSubmittedJson(JSON.stringify(payload, null, 2));
  }

  return (
      <div className="w-full gap-4 flex flex-col">
        {/* <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          Event Onboarding
        </h1> */}
        <EventDetailsCard />
        <GeneralCompanyInfoForm />
        <CompanyGuideForm />
        <Card className="rounded-2xl shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">        <CardTitle className="text-xl">Participant Form</CardTitle>
              <p className="text-sm font-semibold text-red-600">
                Submission Deadline: <time dateTime="2025-09-01">xxxs</time>
              </p></div>
            <CardDescription>Sign up your colleagues who will be attending the event</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h3 className="text-sm font-medium">Participants (up to 6)</h3>
                  <p className="text-xs text-muted-foreground mb-2">Fill the name for participants who will attend.</p>

                  <div className="space-y-4">
                    {participants.map((p, i) => (
                      <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-3 rounded-lg border">
                        <div className="md:col-span-1">
                          <Label htmlFor={`p-${i}-name`} className="text-xs">Name</Label>
                          <Input
                            id={`p-${i}-name`}
                            placeholder={`Participant ${i + 1} name`}
                            value={p.name}
                            onChange={(e) => updateParticipant(i, { name: e.target.value })}
                          />
                        </div>

                        <div className="md:col-span-1">
                          <Label htmlFor={`p-${i}-diet`} className="text-xs">Dietary</Label>
                          <Select onValueChange={(val) => updateParticipant(i, { diet: val })} value={p.diet}>
                            <SelectTrigger id={`p-${i}-diet`}>
                              <SelectValue placeholder="Select dietary" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectItem value="none">No preference</SelectItem>
                                <SelectItem value="vegetarian">Vegetarian</SelectItem>
                                <SelectItem value="vegan">Vegan</SelectItem>
                                <SelectItem value="halal">Halal</SelectItem>
                                <SelectItem value="kosher">Kosher</SelectItem>
                                <SelectItem value="glutenfree">Gluten-free</SelectItem>
                                <SelectItem value="other">Other (specify)</SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-1">
                          {p.diet === "other" && (
                            <div>
                              <Label htmlFor={`p-${i}-diet-other`} className="text-xs">Specify</Label>
                              <Input
                                id={`p-${i}-diet-other`}
                                placeholder="e.g. peanut allergy"
                                value={p.dietOther}
                                onChange={(e) => updateParticipant(i, { dietOther: e.target.value })}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {errors && <p className="text-sm text-red-600">{errors}</p>}

                <div className="flex gap-2 justify-end">
                  <Button type="submit" className="flex items-center gap-2">
                    <IconCheck size={18} /> Submit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setDescription("");
                      setParticipants(Array.from({ length: 4 }, () => ({ name: "", diet: "none", dietOther: "" })));
                      setSubmittedJson(null);
                      setErrors(null);
                    }}
                  >
                    <IconRefresh size={18} />
                    Reset
                  </Button>
                </div>

                {submittedJson && (
                  <div>
                    <h4 className="text-sm font-medium">Submitted JSON (demo)</h4>
                    <pre className="mt-2 p-3 rounded-lg bg-muted text-sm overflow-auto">{submittedJson}</pre>
                  </div>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
  );
}


