import Link from "next/link"
import { Button } from "@/components/ui/button"
import { StudentMatchingSoftware } from "@/components/StudentMatchingSoftware"

/**
 * The student matching questionnaire for an event, or a sign-in prompt. The
 * student is resolved on the server, so there is no loading state.
 */
export function MatchingSoftwareView({
  eventId,
  eventName,
  eventSlug,
  studentId,
  redirectTo,
}: {
  eventId: string
  eventName: string
  eventSlug: string
  studentId: string | null
  redirectTo: string | null
}) {
  if (!studentId) {
    const redirectAfterLogin = redirectTo || `/event/${eventSlug}/matching-software`
    return (
      <div className="min-h-screen bg-gradient-to-br from-vtk-blue/5 via-white to-vtk-yellow/5 flex items-center justify-center px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-neutral-900 mb-4">Matching Software</h1>
          <p className="text-lg text-neutral-600 mb-8">
            You need to be logged in as a student to access the matching software.
          </p>
          <Button asChild className="rounded-full bg-vtk-blue text-white">
            <Link href={`/student-login?redirectTo=${encodeURIComponent(redirectAfterLogin)}`}>
              Student Login
            </Link>
          </Button>
          <div className="mt-6">
            <Button asChild variant="outline">
              <Link href={`/event/${eventSlug}`}>Back to event</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <StudentMatchingSoftware
      eventId={eventId}
      eventName={eventName}
      studentId={studentId}
    />
  )
}
