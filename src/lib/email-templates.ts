/**
 * Generate calendar URLs for different calendar providers
 */
export function generateCalendarUrls(
  title: string,
  eventDate: Date,
  endDate: Date,
  location?: string
) {
  // Format date for Google Calendar (YYYYMMDDTHHmmssZ in UTC)
  const formatGoogleDate = (date: Date): string => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hours = String(date.getUTCHours()).padStart(2, "0");
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    const seconds = String(date.getUTCSeconds()).padStart(2, "0");
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  };

  // Format date for Outlook (ISO 8601 format: YYYY-MM-DDTHH:mm:ss)
  const formatOutlookDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  const formDomain = process.env.NEXT_PUBLIC_FORM_DOMAIN || "http://localhost:3000";

  // Google Calendar URL
  const googleParams = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${formatGoogleDate(eventDate)}/${formatGoogleDate(endDate)}`,
  });
  if (location) {
    googleParams.append("location", location);
  }
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?${googleParams.toString()}`;

  // Outlook URL
  const outlookParams = new URLSearchParams({
    subject: title,
    startdt: formatOutlookDate(eventDate),
    enddt: formatOutlookDate(endDate),
  });
  if (location) {
    outlookParams.append("location", location);
  }
  const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?${outlookParams.toString()}`;

  // ICS file URL
  const icsParams = new URLSearchParams({
    title,
    date: eventDate.toISOString(),
    endDate: endDate.toISOString(),
  });
  if (location) {
    icsParams.append("location", location);
  }
  const icsUrl = `${formDomain}/api/calendar?${icsParams.toString()}`;

  return {
    google: googleCalendarUrl,
    outlook: outlookUrl,
    ics: icsUrl,
  };
}

/**
 * Generate event confirmation email HTML
 */
export function generateEventConfirmationEmailHtml({
  subject,
  fullName,
  personalizedContent,
  eventDate,
  eventEndDate,
  eventLocation,
  formName,
}: {
  subject: string;
  fullName: string;
  personalizedContent: string;
  eventDate?: string;
  eventEndDate?: string;
  eventLocation?: string;
  formName: string;
}) {
  let calendarLinksHtml = "";
  
  // Check if eventDate exists and is valid
  if (eventDate) {
    try {
      const startDate = new Date(eventDate);
      // Validate the date
      if (isNaN(startDate.getTime())) {
        console.warn("Invalid event date provided:", eventDate);
      } else {
        const endDate = eventEndDate 
          ? new Date(eventEndDate)
          : new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour
        
        // Validate end date
        if (isNaN(endDate.getTime())) {
          console.warn("Invalid event end date provided:", eventEndDate);
        } else {
          const calendarUrls = generateCalendarUrls(
            formName,
            startDate,
            endDate,
            eventLocation
          );

          calendarLinksHtml = `
      <div class="calendar-buttons" style="margin: 30px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding: 0 6px;">
              <a href="${calendarUrls.google}" class="calendar-button google" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 20px; background-color: #4285f4; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; text-align: center; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15); transition: all 0.2s ease;">
                <span style="font-size: 16px; margin-right: 6px;">📅</span>
                <span>Google</span>
              </a>
            </td>
            <td align="center" style="padding: 0 6px;">
              <a href="${calendarUrls.outlook}" class="calendar-button outlook" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 20px; background-color: #0078d4; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; text-align: center; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15); transition: all 0.2s ease;">
                <span style="font-size: 16px; margin-right: 6px;">📅</span>
                <span>Outlook</span>
              </a>
            </td>
            <td align="center" style="padding: 0 6px;">
              <a href="${calendarUrls.ics}" class="calendar-button ics" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 20px; background-color: #6b7280; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; text-align: center; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15); transition: all 0.2s ease;">
                <span style="font-size: 16px; margin-right: 6px;">📥</span>
                <span>Download</span>
              </a>
            </td>
          </tr>
        </table>
      </div>
    `;
        }
      }
    } catch (error) {
      console.error("Error generating calendar links:", error);
    }
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 40px 20px;
            background-color: #ffffff;
          }
          .calendar-buttons {
            margin: 30px 0;
          }
          .calendar-button {
            display: inline-block;
            padding: 12px 20px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            font-size: 14px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
            transition: all 0.2s ease;
            white-space: nowrap;
          }
          .calendar-button.google {
            background-color: #4285f4;
            color: #ffffff;
            border: none;
          }
          .calendar-button.google:hover {
            background-color: #357ae8;
            box-shadow: 0 3px 8px rgba(66, 133, 244, 0.4);
            transform: translateY(-1px);
          }
          .calendar-button.outlook {
            background-color: #0078d4;
            color: #ffffff;
            border: none;
          }
          .calendar-button.outlook:hover {
            background-color: #0064b8;
            box-shadow: 0 3px 8px rgba(0, 120, 212, 0.4);
            transform: translateY(-1px);
          }
          .calendar-button.ics {
            background-color: #6b7280;
            color: #ffffff;
            border: none;
          }
          .calendar-button.ics:hover {
            background-color: #4b5563;
            box-shadow: 0 3px 8px rgba(107, 114, 128, 0.4);
            transform: translateY(-1px);
          }
          .event-details {
            background-color: #f9fafb;
            border-left: 4px solid #2563eb;
            padding: 16px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .event-details p {
            margin: 8px 0;
          }
          .event-details strong {
            color: #1f2937;
          }
          h2 {
            color: #111827;
            margin-top: 0;
          }
          .signature {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>${formName}</h2>
          <p>Dear ${fullName},</p>
          <div>${personalizedContent}</div>
          ${eventDate || eventLocation ? `
            <div class="event-details">
              ${eventDate ? `<p><strong>Event Date:</strong> ${new Date(eventDate).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</p>` : ''}
              ${eventLocation ? `<p><strong>Location:</strong> ${eventLocation}</p>` : ''}
            </div>
          ` : ''}
          ${calendarLinksHtml}
          <div class="signature">
            <p>Best regards,<br>The VTK Career Team</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

