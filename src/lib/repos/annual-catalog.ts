"use server";

import { prisma } from "@/lib/prisma";
import { slugifyEventName } from "@/lib/utils/slugify";
import { assertAcademicYearWritable } from "@/lib/repos/academic-year";

function shiftYears(value: Date | null, years: number): Date | null {
  if (!value) return null;
  const shifted = new Date(value);
  shifted.setUTCFullYear(shifted.getUTCFullYear() + years);
  return shifted;
}

/**
 * Creates the next internal edition while public URLs keep resolving by the
 * stable series key. Company sales are deliberately not copied.
 */
export async function copyAnnualCatalog(sourceYearId: number, targetYearId: number): Promise<{
  eventsCreated: number;
  optionsCreated: number;
}> {
  if (sourceYearId === targetYearId) throw new Error("Choose two different academic years");
  await assertAcademicYearWritable(targetYearId);

  const [sourceYear, targetYear] = await Promise.all([
    prisma.academicYear.findUnique({ where: { id: sourceYearId } }),
    prisma.academicYear.findUnique({ where: { id: targetYearId } }),
  ]);
  if (!sourceYear || !targetYear) throw new Error("Academic year not found");

  const sourceStart = sourceYear.start_of_year?.getUTCFullYear() ?? 0;
  const targetStart = targetYear.start_of_year?.getUTCFullYear() ?? sourceStart + 1;
  const yearShift = targetStart - sourceStart;

  return prisma.$transaction(async (tx) => {
    const sourceEvents = await tx.careerEvent.findMany({
      where: { academic_year_id: sourceYearId },
      include: {
        careerEventPages: {
          include: {
            careerEventPageTimetables: { include: { timetable: true } },
          },
        },
      },
      orderBy: { id: "asc" },
    });
    const targetEvents = await tx.careerEvent.findMany({
      where: { academic_year_id: targetYearId },
    });
    const eventBySeries = new Map(
      targetEvents.map((event) => [event.series_key || slugifyEventName(event.name ?? ""), event])
    );
    const sourceToTargetEvent = new Map<string, string>();
    let eventsCreated = 0;

    for (const source of sourceEvents) {
      const seriesKey = source.series_key || slugifyEventName(source.name ?? source.id);
      let target = eventBySeries.get(seriesKey);
      if (!target) {
        target = await tx.careerEvent.create({
          data: {
            status: "draft",
            date_created: new Date(),
            name: source.name,
            description: source.description,
            location: source.location,
            date: shiftYears(source.date, yearShift),
            start_hour: source.start_hour,
            end_hour: source.end_hour,
            num_of_companies: source.num_of_companies,
            num_of_students: source.num_of_students,
            image_id: source.image_id,
            shout: source.shout,
            academic_year_id: targetYearId,
            series_key: seriesKey,
          },
        });
        eventBySeries.set(seriesKey, target);
        eventsCreated += 1;

        for (const sourcePage of source.careerEventPages) {
          const page = await tx.careerEventPage.create({
            data: {
              status: "draft",
              event_id: target.id,
              shout: sourcePage.shout,
              description_EN: sourcePage.description_EN,
              tagline: sourcePage.tagline,
              address: sourcePage.address,
              parking: sourcePage.parking,
              registration_link: sourcePage.registration_link,
              floorplan_id: sourcePage.floorplan_id,
              image_id: sourcePage.image_id,
              company_guide: sourcePage.company_guide,
              header_buttons: sourcePage.header_buttons ?? undefined,
              latitude: sourcePage.latitude,
              longitude: sourcePage.longitude,
            },
          });

          for (const link of sourcePage.careerEventPageTimetables) {
            if (!link.timetable) continue;
            const timetable = await tx.timetable.create({
              data: {
                status: "draft",
                date_created: new Date(),
                title: link.timetable.title,
                description: link.timetable.description,
                start_time: link.timetable.start_time,
                end_time: link.timetable.end_time,
                icon: link.timetable.icon,
                type: link.timetable.type ?? undefined,
              },
            });
            await tx.careerEventPageTimetable.create({
              data: { career_event_page_id: page.id, timetable_id: timetable.id },
            });
          }
        }
      }
      sourceToTargetEvent.set(source.id, target.id);
    }

    const sourceOptions = await tx.careerEventOption.findMany({
      where: { academic_year_id: sourceYearId },
      include: {
        careerEventOptionEvents: true,
        careerEventOptionSubOptions: true,
      },
      orderBy: { id: "asc" },
    });
    const existingTargetOptions = await tx.careerEventOption.findMany({
      where: { academic_year_id: targetYearId },
    });
    const targetOptionSeries = new Set(
      existingTargetOptions.map((option) => option.series_key || slugifyEventName(option.name ?? ""))
    );
    let optionsCreated = 0;

    for (const source of sourceOptions) {
      const seriesKey = source.series_key || slugifyEventName(source.name ?? source.id);
      if (targetOptionSeries.has(seriesKey)) continue;

      const option = await tx.careerEventOption.create({
        data: {
          date_created: new Date(),
          name: source.name,
          description: source.description,
          price: source.price,
          academic_year_id: targetYearId,
          series_key: seriesKey,
        },
      });
      targetOptionSeries.add(seriesKey);
      optionsCreated += 1;

      const targetEventIds = source.careerEventOptionEvents
        .map((link) => link.career_event_id ? sourceToTargetEvent.get(link.career_event_id) : null)
        .filter((id): id is string => Boolean(id));
      if (targetEventIds.length) {
        await tx.careerEventOptionEvent.createMany({
          data: [...new Set(targetEventIds)].map((career_event_id) => ({
            career_event_option_id: option.id,
            career_event_id,
          })),
        });
      }

      const subOptionIds = source.careerEventOptionSubOptions
        .map((link) => link.career_sub_option_id)
        .filter((id): id is number => id != null);
      if (subOptionIds.length) {
        await tx.careerEventOptionSubOption.createMany({
          data: [...new Set(subOptionIds)].map((career_sub_option_id) => ({
            career_event_option_id: option.id,
            career_sub_option_id,
          })),
        });
      }
    }

    return { eventsCreated, optionsCreated };
  });
}
