import Image from "next/image"
import type { Master } from "@/lib/schema"
import { getFileUrl } from "@/components/Images"
import DOMPurify from "isomorphic-dompurify"
import { loadPublicMasters } from "@/lib/masters-data"

export const metadata = { title: "Our students" }

// Per request from the in-process masters cache, which master edits drop.
export const dynamic = "force-dynamic"

/**
 * /our-students: every master with its student numbers and modules. A server
 * component -- it used to render a spinner and fetch /api/masters from the
 * browser, and shipped DOMPurify to the browser to clean the modules.
 */
export default async function OurStudentsPage() {
  // Show all masters, but prioritize those with student data
  // Sort by: has students (desc), then by name
  const masters: Master[] = [...(await loadPublicMasters())].sort((a, b) => {
    const aHasStudents = (a.students && a.students > 0) ? 1 : 0
    const bHasStudents = (b.students && b.students > 0) ? 1 : 0
    if (aHasStudents !== bHasStudents) {
      return bHasStudents - aHasStudents
    }
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="min-h-screen relative">
      {/* Fixed background image. Through next/image, so it is resized and
          served as WebP -- as a CSS background it downloaded the original
          4.8 MB, 4239x6358 photo. */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/api/files/b2d5f309-d041-4c57-a4a9-ab5cd60f0b60"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px]"></div>
      </div>

      {/* Content Container - Scrolls over background */}
      <div className="relative z-10">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-vtk-blue/95 to-vtk-blueDark/95 text-white py-16 sm:py-24 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4">
              STUDENTS AT THE
            </h1>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-12">
              ENGINEERING FACULTY
            </h2>

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mt-12">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">
                  13
                </div>
                <div className="text-sm sm:text-base opacity-90">Master courses</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">
                  4000
                </div>
                <div className="text-sm sm:text-base opacity-90">Students</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">
                  800
                </div>
                <div className="text-sm sm:text-base opacity-90">Graduating students</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">
                  92
                </div>
                <div className="text-sm sm:text-base opacity-90">Members of VTK</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Student Profiles Section */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-12 text-center drop-shadow-lg">
              STUDENT PROFILES
            </h2>
            <p className="text-center text-white/95 mb-8 max-w-3xl mx-auto drop-shadow-md text-lg">
              The logo next to each faculty master will also be present on the nametags of students at our events
            </p>

            <div className="space-y-8">
              {masters.map((master, index) => {
                const logoUrl = master.logo ? getFileUrl(master.logo) : null
                const hasModules = master.modules && master.modules.trim().length > 0
                const isEven = index % 2 === 0

                return (
                  <div
                    key={master.id}
                    className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-neutral-200/50 p-6 sm:p-8 hover:shadow-xl hover:bg-white transition-all"
                  >
                    <div className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} items-start md:items-center gap-6`}>
                      {/* Logo and Title */}
                      <div className={`flex-shrink-0 ${isEven ? 'md:pr-6' : 'md:pl-6'} w-full md:w-auto`}>
                        <div className="flex items-center gap-4 mb-4 md:mb-0">
                          {logoUrl && (
                            <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-neutral-50 rounded-lg p-2">
                              <Image
                                src={logoUrl}
                                alt={`${master.name} logo`}
                                width={64}
                                height={64}
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                          )}
                          <div>
                            <h3 className="text-xl sm:text-2xl font-bold text-vtk-blue mb-1">
                              {master.name.toUpperCase()}
                            </h3>
                            {master.students && (
                              <p className="text-lg sm:text-xl font-semibold text-neutral-700">
                                {master.students} students
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Modules */}
                      {hasModules && (
                        <div className="flex-1 w-full">
                          <div
                            className="prose prose-sm sm:prose-base max-w-none text-neutral-700"
                            dangerouslySetInnerHTML={{
                              __html: DOMPurify.sanitize(master.modules || '', {
                                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'span'],
                                ALLOWED_ATTR: []
                              })
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer Note */}
            <div className="mt-12 text-center text-white/90 text-sm sm:text-base drop-shadow-md">
              <p className="mb-2">
                <em>For reaching certain groups of students take a look at our communication options</em>
              </p>
              <p>
                <em>For events where target groups of students are invited see Sector Nights</em>
              </p>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  )
}

