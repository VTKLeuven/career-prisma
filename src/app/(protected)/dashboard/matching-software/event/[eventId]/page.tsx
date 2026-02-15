"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CompanyMatchingForm } from "@/components/CompanyMatchingForm";
import { getMatchingSoftwareForEventAction } from "@/app/actions/matching-software";
import { useUser } from "@/providers/UserProvider";

export default function EventMatchingSoftwarePage() {
  const { user } = useUser();
  const params = useParams();
  const eventId = (Array.isArray(params?.eventId) ? params.eventId?.[0] : params?.eventId) as string | undefined;
  const [matchingSoftware, setMatchingSoftware] = useState<{ id: string } | null>(null);
  const [eventName, setEventName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }
    getMatchingSoftwareForEventAction(eventId)
      .then((ms) => {
        setMatchingSoftware(ms ? { id: ms.id } : null);
        const ev = ms?.event;
        setEventName(typeof ev === "object" && ev && "name" in ev ? (ev as { name: string }).name : "");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [eventId]);

  if (!eventId) {
    return (
      <div className="w-full gap-4 flex flex-col">
        <p className="text-muted-foreground">Event not found.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  if (!user?.company?.id) {
    return (
      <div className="w-full gap-4 flex flex-col">
        <p className="text-muted-foreground">No company associated with your account.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  if (!matchingSoftware) {
    return (
      <div className="w-full gap-4 flex flex-col">
        <p className="text-muted-foreground">Matching software is not available for this event.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full gap-4 flex flex-col">
      <Button asChild variant="outline" className="w-fit">
        <Link href="/dashboard">← Back to dashboard</Link>
      </Button>
      <CompanyMatchingForm
        companyId={user.company.id}
        matchingSoftwareId={matchingSoftware.id}
        eventName={eventName || undefined}
      />
    </div>
  );
}
