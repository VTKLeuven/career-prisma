'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Building2, Clock, ArrowLeft } from "lucide-react"

export default function VacanciesComingSoonPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-vtk-blue/5 via-white to-vtk-yellow/5">
      <div className="container mx-auto px-4 py-16 sm:py-24">
        <div className="max-w-2xl mx-auto text-center">
          {/* Icon */}
          <div className="flex justify-center mb-8">
            <div className="rounded-full bg-vtk-blue/10 p-6">
              <Building2 className="h-16 w-16 text-vtk-blue" />
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-neutral-900 mb-4">
            Vacancies
          </h1>
          <p className="text-xl sm:text-2xl text-neutral-600 mb-2">
            Coming Soon
          </p>
          <div className="flex items-center justify-center gap-2 text-neutral-500 mb-12">
            <Clock className="h-5 w-5" />
            <span>We're working on something amazing</span>
          </div>

          {/* Description */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-neutral-200 p-8 mb-8">
            <p className="text-lg text-neutral-700 leading-relaxed">
              Our vacancies platform is currently under development. Soon you'll be able to browse and apply for job opportunities from our partner companies.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              asChild
              className="rounded-full bg-vtk-blue hover:bg-vtk-blueDark text-white px-6 py-3"
            >
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-full border-vtk-blue text-vtk-blue hover:bg-vtk-blue/10 px-6 py-3"
            >
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

