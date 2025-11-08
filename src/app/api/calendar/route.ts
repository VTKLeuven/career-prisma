import { NextRequest, NextResponse } from 'next/server';

/**
 * Generate ICS calendar file for event
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const title = searchParams.get('title') || 'Event';
    const dateStr = searchParams.get('date');
    const endDateStr = searchParams.get('endDate');
    const location = searchParams.get('location') || '';

    if (!dateStr) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    const eventDate = new Date(dateStr);
    if (isNaN(eventDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // Format date for ICS (YYYYMMDDTHHmmssZ)
    const formatICSDate = (date: Date): string => {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const hours = String(date.getUTCHours()).padStart(2, '0');
      const minutes = String(date.getUTCMinutes()).padStart(2, '0');
      const seconds = String(date.getUTCSeconds()).padStart(2, '0');
      return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    };

    const startDate = formatICSDate(eventDate);
    // Use end date if provided, otherwise default to 1 hour duration
    let endDate: string;
    if (endDateStr) {
      const eventEndDate = new Date(endDateStr);
      if (isNaN(eventEndDate.getTime())) {
        return NextResponse.json({ error: 'Invalid end date format' }, { status: 400 });
      }
      endDate = formatICSDate(eventEndDate);
    } else {
      // Default to 1 hour duration
      endDate = formatICSDate(new Date(eventDate.getTime() + 60 * 60 * 1000));
    }
    const now = formatICSDate(new Date());

    // Escape special characters for ICS format
    const escapeICS = (text: string): string => {
      return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Event Registration//Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@event-registration`,
      `DTSTAMP:${now}`,
      `DTSTART:${startDate}`,
      `DTEND:${endDate}`,
      `SUMMARY:${escapeICS(title)}`,
      ...(location ? [`LOCATION:${escapeICS(location)}`] : []),
      `DESCRIPTION:${escapeICS(`Event: ${title}${location ? `\\nLocation: ${location}` : ''}`)}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'BEGIN:VALARM',
      'TRIGGER:-PT1H',
      'ACTION:DISPLAY',
      `DESCRIPTION:Reminder: ${escapeICS(title)}`,
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(title)}.ics"`,
      },
    });
  } catch (error) {
    console.error('[Calendar API] Error generating calendar file:', error);
    return NextResponse.json(
      { error: 'Failed to generate calendar file' },
      { status: 500 }
    );
  }
}

