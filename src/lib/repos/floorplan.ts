// lib/repos/floorplan.ts
"use server";

import { readItems, createItem, updateItem, deleteItems, deleteItem } from "@directus/sdk";
import { getDirectusWithToken } from "@/lib/directus";
import type { Floorplan, Booth, CareerEventPage, Company, HeaderButtonType } from "@/lib/schema";

export async function createFloorplan(payload: {
  name: string;
  year: string;
  svg_file: string;
  background_image?: string;
}): Promise<Floorplan | null> {
  try {
    const client = await getDirectusWithToken();
    if (!client) return null;

    const floorplan = await client.request(
      createItem("Floorplan", payload)
    ) as unknown as Floorplan;

    return floorplan;
  } catch (error) {
    console.error("Failed to create floorplan:", error);
    return null;
  }
}

export async function linkFloorplanToEventPage(
  floorplanId: string,
  eventPageId: string
): Promise<boolean> {
  try {
    const client = await getDirectusWithToken();
    if (!client) return false;

    await client.request(
      updateItem("career_event_page", eventPageId, {
        floorplan: floorplanId,
      })
    );

    return true;
  } catch (error) {
    console.error("Failed to link floorplan to event page:", error);
    return false;
  }
}

export async function getOrCreateEventPage(eventId: string): Promise<CareerEventPage | null> {
  try {
    const client = await getDirectusWithToken();
    if (!client) return null;

    // Try to find existing event page
    const existingPages = await client.request(
      readItems("career_event_page", {
        fields: ["*", "event.*"],
        filter: {
          event: {
            _eq: eventId,
          },
        },
        limit: 1,
      })
    ) as unknown as CareerEventPage[];

    if (existingPages.length > 0) {
      return existingPages[0];
    }

    // Create new event page if it doesn't exist
    const newPage = await client.request(
      createItem("career_event_page", {
        event: eventId,
        description_EN: "",
        image: "",
      })
    ) as unknown as CareerEventPage;

    return newPage;
  } catch (error) {
    console.error("Failed to get or create event page:", error);
    return null;
  }
}

export async function deleteBoothsForFloorplan(floorplanId: string): Promise<boolean> {
  try {
    const client = await getDirectusWithToken();
    if (!client) {
      console.error("No Directus client available for deleting booths");
      return false;
    }

    // Delete all booths for this floorplan
    await client.request(
      deleteItems("Booths", {
        filter: {
          Floorplan: {
            _eq: floorplanId,
          },
        },
      })
    );

    console.log(`Deleted existing booths for floorplan ${floorplanId}`);
    return true;
  } catch (error) {
    console.error("Failed to delete booths for floorplan:", error);
    return false;
  }
}

export async function createBooths(booths: Array<{
  booth_number: number;
  coords: unknown; // JSON object
  Floorplan: string; // Floorplan ID
}>, deleteExisting: boolean = true): Promise<Booth[] | null> {
  try {
    const client = await getDirectusWithToken();
    if (!client) {
      console.error("No Directus client available for creating booths");
      return null;
    }

    if (booths.length === 0) {
      console.log("No booths to create");
      return [];
    }

    // Delete existing booths for this floorplan if requested
    if (deleteExisting && booths.length > 0) {
      const floorplanId = booths[0].Floorplan;
      await deleteBoothsForFloorplan(floorplanId);
    }

    console.log(`Attempting to create/update ${booths.length} booths...`);
    const createdBooths: Booth[] = [];

    for (const booth of booths) {
      try {
        // Ensure coords is properly formatted (Directus JSON fields can accept objects)
        const boothPayload = {
          booth_number: booth.booth_number,
          coords: typeof booth.coords === "string" ? booth.coords : JSON.stringify(booth.coords),
          Floorplan: booth.Floorplan,
        };
        
        // Check if a booth with this number already exists for this floorplan
        const existingBooths = await client.request(
          readItems("Booths", {
            fields: ["*"],
            filter: {
              _and: [
                { booth_number: { _eq: booth.booth_number } },
                { Floorplan: { _eq: booth.Floorplan } },
              ],
            },
            limit: 1,
          })
        ) as unknown as Booth[];

        let created: Booth;
        if (existingBooths.length > 0) {
          // Update existing booth
          console.log(`Updating existing booth: ${booth.booth_number}`);
          created = await client.request(
            updateItem("Booths", existingBooths[0].id, boothPayload)
          ) as unknown as Booth;
        } else {
          // Create new booth
          console.log(`Creating new booth: ${booth.booth_number}`);
          created = await client.request(
            createItem("Booths", boothPayload)
          ) as unknown as Booth;
        }
        
        createdBooths.push(created);
        console.log(`Successfully processed booth: ${booth.booth_number}`);
      } catch (err) {
        console.error(`Failed to create/update booth ${booth.booth_number}:`, err);
        if (err instanceof Error) {
          console.error("Error details:", err.message, err.stack);
        }
      }
    }

    console.log(`Processed ${createdBooths.length} out of ${booths.length} booths`);
    return createdBooths;
  } catch (error) {
    console.error("Failed to create booths:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message, error.stack);
    }
    return null;
  }
}

export async function getEventPageWithFloorplan(eventId: string): Promise<CareerEventPage | null> {
  try {
    const client = await getDirectusWithToken();
    if (!client) return null;

    const pages = await client.request(
      readItems("career_event_page", {
        fields: [
          "*",
          "event.*",
          "floorplan.*",
          "companies.company_id.*",
          "company_guide.*", // include company guide file
        ],
        filter: {
          event: {
            _eq: eventId,
          },
        },
        limit: 1,
        deep: { companies: { limit: 10000 } }, // Override Directus QUERY_LIMIT_DEFAULT (100)
      })
    ) as unknown as CareerEventPage[];

    if (pages.length === 0) return null;

    const page = pages[0];
    
    // Flatten companies from junction table
    if (page.companies) {
      page.companies = (page.companies as unknown as Array<{ company_id: Company }>)?.map((item) => {
        return item.company_id;
      }) ?? [];
    }

    return page;
  } catch (error) {
    console.error("Failed to get event page with floorplan:", error);
    return null;
  }
}

export async function updateBoothCompany(boothId: string, companyId: string | null): Promise<Booth | null> {
  try {
    const client = await getDirectusWithToken();
    if (!client) return null;

    const updated = await client.request(
      updateItem("Booths", boothId, {
        company: companyId,
      })
    ) as unknown as Booth;

    return updated;
  } catch (error) {
    console.error("Failed to update booth company:", error);
    return null;
  }
}

export async function deleteFloorplan(floorplanId: string): Promise<boolean> {
  try {
    const client = await getDirectusWithToken();
    if (!client) return false;

    // First delete all booths for this floorplan
    await deleteBoothsForFloorplan(floorplanId);

    // Then delete the floorplan itself
    await client.request(deleteItem("Floorplan", floorplanId));

    // Also unlink from event pages
    const eventPages = await client.request(
      readItems("career_event_page", {
        fields: ["id"],
        filter: {
          floorplan: {
            _eq: floorplanId,
          },
        },
      })
    ) as unknown as Array<{ id: string }>;

    for (const page of eventPages) {
      await client.request(
        updateItem("career_event_page", page.id, {
          floorplan: null,
        })
      );
    }

    console.log(`Deleted floorplan ${floorplanId} and all associated booths`);
    return true;
  } catch (error) {
    console.error("Failed to delete floorplan:", error);
    return false;
  }
}

export async function getCompaniesForEvent(eventId: string): Promise<Company[]> {
  try {
    const client = await getDirectusWithToken();
    if (!client) return [];

    // Fetch the event page to get the directly linked companies
    const eventPage = await client.request(
      readItems("career_event_page", {
        fields: ["companies.company_id.*"], // Only need company details
        filter: {
          event: { _eq: eventId },
        },
        limit: 1,
        deep: { companies: { limit: 10000 } }, // Override Directus QUERY_LIMIT_DEFAULT (100)
      })
    ) as unknown as Array<{ companies?: Array<{ company_id: Company }> }>;

    if (!eventPage || eventPage.length === 0 || !eventPage[0].companies) {
      return [];
    }

    // Flatten the companies array
    const companies = eventPage[0].companies.map(item => item.company_id).filter(Boolean);
    return companies;
  } catch (error) {
    console.error("Failed to get companies for event:", error);
    return [];
  }
}

export async function getBoothsForFloorplan(floorplanId: string): Promise<Booth[]> {
  try {
    const client = await getDirectusWithToken();
    if (!client) return [];

    const booths = await client.request(
      readItems("Booths", {
        fields: [
          "*",
          "company.*",
          "Floorplan.*",
        ],
        filter: {
          Floorplan: {
            _eq: floorplanId,
          },
        },
        sort: ["booth_number"],
        limit: -1, // Fetch all booths (Directus defaults to 100)
      })
    ) as unknown as Booth[];

    return booths;
  } catch (error) {
    console.error("Failed to get booths for floorplan:", error);
    return [];
  }
}

export async function updateEventPageHeaderButtons(
  eventId: string,
  headerButtons: HeaderButtonType[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getDirectusWithToken();
    if (!client) return { success: false, error: "Not authenticated" };

    const eventPage = await getOrCreateEventPage(eventId);
    if (!eventPage) return { success: false, error: "Event page not found" };

    await client.request(
      updateItem("career_event_page", eventPage.id, {
        header_buttons: headerButtons,
      })
    );

    return { success: true };
  } catch (error) {
    console.error("Failed to update header buttons:", error);
    const msg = error instanceof Error ? error.message : "Failed to update";
    const hint = msg.includes("header_buttons") || msg.includes("doesn't exist")
      ? " Add a JSON field 'header_buttons' to career_event_page in Directus."
      : "";
    return {
      success: false,
      error: msg + hint,
    };
  }
}

