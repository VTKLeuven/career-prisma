'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { submitContactFormAction } from "@/app/actions/contact"
import { Mail, CheckCircle2, AlertCircle } from "lucide-react"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    email: "",
    companyName: "",
    reason: "",
  })
  const [loading, setLoading] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setSubmitStatus({ type: null, message: '' })

    try {
      const result = await submitContactFormAction(formData)
      
      if (result.success) {
        setSubmitStatus({
          type: 'success',
          message: 'Thank you for your message! We will get back to you soon.'
        })
        // Reset form
        setFormData({
          name: "",
          surname: "",
          email: "",
          companyName: "",
          reason: "",
        })
      } else {
        setSubmitStatus({
          type: 'error',
          message: result.error || 'Failed to send message. Please try again.'
        })
      }
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: 'An unexpected error occurred. Please try again later.'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative">
      {/* Fixed Background Image */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://directustest.vtk.be/assets/39d8fd46-fcc7-4d1f-84cf-38093d96cb93)',
          backgroundAttachment: 'fixed',
        }}
      >
      </div>

      {/* Content Container - Scrolls over background */}
      <div className="relative z-10">
        <div className="min-h-screen py-16 sm:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              {/* Header Card */}
              <div className="rounded-2xl border bg-white/85 backdrop-blur-sm p-6 shadow-sm mb-12">
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="rounded-full bg-vtk-blue/10 p-4">
                      <Mail className="h-12 w-12 text-vtk-blue" />
                    </div>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-2">
                    Contact Us
                  </h1>
                  <p className="text-lg text-neutral-700">
                    Have a question? We'd love to hear from you.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Contact Information Card */}
                <div className="rounded-2xl border bg-white/85 backdrop-blur-sm shadow-sm">
                  <div className="p-6">
                    <h2 className="text-2xl font-semibold text-neutral-900 mb-2">Get in Touch</h2>
                    <p className="text-neutral-600 mb-6">
                      Reach out to us through the following channels
                    </p>
                    <div className="space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="rounded-full bg-vtk-blue/10 p-3">
                          <Mail className="h-5 w-5 text-vtk-blue" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-neutral-900 mb-1">Email</h3>
                          <a
                            href="mailto:bedrijvenrelaties@vtk.be"
                            className="text-vtk-blue hover:underline"
                          >
                            bedrijvenrelaties@vtk.be
                          </a>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="rounded-full bg-vtk-blue/10 p-3">
                          <svg
                            className="h-5 w-5 text-vtk-blue"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-neutral-900 mb-1">Phone</h3>
                          <a
                            href="tel:+3216200097"
                            className="text-vtk-blue hover:underline"
                          >
                            +32 (0)16 20 00 97
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Form Card */}
                <div className="rounded-2xl border bg-white/85 backdrop-blur-sm shadow-sm">
                  <div className="p-6">
                    <h2 className="text-2xl font-semibold text-neutral-900 mb-2">Send us a Message</h2>
                    <p className="text-neutral-600 mb-6">
                      Fill out the form below and we'll respond as soon as possible.
                    </p>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Name and Surname */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Name *</Label>
                          <Input
                            id="name"
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="John"
                            required
                            disabled={loading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="surname">Surname *</Label>
                          <Input
                            id="surname"
                            type="text"
                            value={formData.surname}
                            onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                            placeholder="Doe"
                            required
                            disabled={loading}
                          />
                        </div>
                      </div>

                      {/* Email */}
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="john.doe@example.com"
                          required
                          disabled={loading}
                        />
                      </div>

                      {/* Company Name */}
                      <div className="space-y-2">
                        <Label htmlFor="companyName">Company Name</Label>
                        <Input
                          id="companyName"
                          type="text"
                          value={formData.companyName}
                          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                          placeholder="Your Company Name (Optional)"
                          disabled={loading}
                        />
                      </div>

                      {/* Reason for Contact */}
                      <div className="space-y-2">
                        <Label htmlFor="reason">Question *</Label>
                        <Textarea
                          id="reason"
                          value={formData.reason}
                          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                          placeholder="Tell us how we can help you..."
                          rows={6}
                          required
                          disabled={loading}
                          className="resize-none"
                        />
                      </div>

                      {/* Status Message */}
                      {submitStatus.type && (
                        <div
                          className={`flex items-start gap-3 p-4 rounded-lg ${
                            submitStatus.type === 'success'
                              ? 'bg-green-50 border border-green-200 text-green-800'
                              : 'bg-red-50 border border-red-200 text-red-800'
                          }`}
                        >
                          {submitStatus.type === 'success' ? (
                            <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                          )}
                          <p className="text-sm">{submitStatus.message}</p>
                        </div>
                      )}

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-full bg-vtk-blue hover:bg-vtk-blueDark text-white"
                      >
                        {loading ? "Sending..." : "Send Message"}
                      </Button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

