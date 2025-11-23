'use client'

import Link from 'next/link'
import { Separator } from '@/components/ui/separator'

export function Footer() {
    return (
        <footer className="bg-white border-t relative z-20">
            <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">
                    {/* VTK Career Hub Info */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <span className="font-semibold text-vtk-blue">VTK Career Hub</span>
                        </div>
                        <p className="max-w-xs text-sm text-neutral-700">
                            The all-in-one platform for engineering students looking for a job.
                        </p>
                    </div>

                    {/* Explore */}
                    <div>
                        <h4 className="mb-3 text-sm font-medium text-neutral-900">Explore</h4>
                        <ul className="space-y-2 text-sm text-neutral-700">
                            <li>
                                <a 
                                    href="/#all-events" 
                                    className="hover:text-vtk-blue hover:underline underline-offset-4"
                                    onClick={(e) => {
                                        // If already on homepage, trigger the view all events
                                        if (window.location.pathname === '/') {
                                            e.preventDefault();
                                            window.dispatchEvent(new CustomEvent('viewAllEvents'));
                                            window.location.hash = '#all-events';
                                        }
                                        // Otherwise, let the link navigate normally
                                    }}
                                >
                                    Events
                                </a>
                            </li>
                            <li>
                                <Link href="/vacancies" className="hover:text-vtk-blue hover:underline underline-offset-4">
                                    Vacancies
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* For Companies */}
                    <div>
                        <h4 className="mb-3 text-sm font-medium text-neutral-900">For Companies</h4>
                        <ul className="space-y-2 text-sm text-neutral-700">
                            <li>
                                <Link href="/dashboard" className="hover:text-vtk-blue hover:underline underline-offset-4">
                                    Company Dashboard
                                </Link>
                            </li>
                            <li>
                                <Link href="/contact" className="hover:text-vtk-blue hover:underline underline-offset-4">
                                    Contact Us
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Get in Touch */}
                    <div>
                        <h4 className="mb-3 text-sm font-medium text-neutral-900">Get in Touch</h4>
                        <ul className="space-y-2 text-sm text-neutral-700">
                            <li>
                                <a 
                                    href="mailto:bedrijvenrelaties@vtk.be" 
                                    className="hover:text-vtk-blue hover:underline underline-offset-4"
                                >
                                    bedrijvenrelaties@vtk.be
                                </a>
                            </li>
                            <li>
                                <a 
                                    href="tel:+3216200097" 
                                    className="hover:text-vtk-blue hover:underline underline-offset-4"
                                >
                                    +32 (0)16 20 00 97
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                <Separator className="my-10" />

                <div className="flex flex-col items-start justify-between gap-4 text-xs text-neutral-600 sm:flex-row sm:items-center">
                    <p>© {new Date().getFullYear()} VTK Career Hub. All rights reserved.</p>
                </div>
            </div>
        </footer>
    )
}

