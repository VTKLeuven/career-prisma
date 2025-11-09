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
              <a href="${calendarUrls.google}" class="calendar-button" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 10px 18px; background-color: #ffffff; color: #2563eb; text-decoration: none; border: 1px solid #2563eb; border-radius: 4px; font-weight: 500; font-size: 14px; text-align: center;">
                Google Calendar
              </a>
            </td>
            <td align="center" style="padding: 0 6px;">
              <a href="${calendarUrls.outlook}" class="calendar-button" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 10px 18px; background-color: #ffffff; color: #2563eb; text-decoration: none; border: 1px solid #2563eb; border-radius: 4px; font-weight: 500; font-size: 14px; text-align: center;">
                Outlook
              </a>
            </td>
            <td align="center" style="padding: 0 6px;">
              <a href="${calendarUrls.ics}" class="calendar-button" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 10px 18px; background-color: #ffffff; color: #2563eb; text-decoration: none; border: 1px solid #2563eb; border-radius: 4px; font-weight: 500; font-size: 14px; text-align: center;">
                Download .ics
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
            padding: 10px 18px;
            text-decoration: none;
            border-radius: 4px;
            font-weight: 500;
            font-size: 14px;
            text-align: center;
            white-space: nowrap;
            background-color: #ffffff;
            color: #2563eb;
            border: 1px solid #2563eb;
          }
          .calendar-button:hover {
            background-color: #2563eb;
            color: #ffffff;
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

/**
 * Generate invitation email HTML for new company representatives
 */
export function generateInvitationEmailHtml({
  firstName,
  lastName,
  companyName,
  acceptInviteUrl,
}: {
  firstName?: string;
  lastName?: string;
  companyName?: string;
  acceptInviteUrl: string;
}) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "there";
  const displayName = fullName !== "there" ? fullName : "there";

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
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #2563eb;
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: 500;
          }
          .button:hover {
            background-color: #1d4ed8;
          }
          h2 {
            color: #111827;
            margin-top: 0;
          }
          .info-box {
            background-color: #f9fafb;
            border-left: 4px solid #2563eb;
            padding: 16px;
            margin: 20px 0;
            border-radius: 4px;
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
          <h2>Welcome to VTK Career Platform</h2>
          <p>Dear ${displayName},</p>
          ${companyName ? `<p>You have been invited to represent <strong>${companyName}</strong> on the VTK Career Platform.</p>` : '<p>You have been invited to join the VTK Career Platform.</p>'}
          <p>To get started, please click the button below to set up your account and create your password:</p>
          <div style="text-align: center;">
            <a href="${acceptInviteUrl}" class="button" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 500;">Set Up Your Account</a>
          </div>
          <div class="info-box">
            <p><strong>What's next?</strong></p>
            <p>After setting up your password, you'll be able to manage your company profile, post job vacancies, and interact with students.</p>
          </div>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #2563eb;">${acceptInviteUrl}</p>
          <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">This invitation link will expire in 7 days for security reasons.</p>
          <div class="signature">
            <p>Best regards,<br>The VTK Career Team</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

