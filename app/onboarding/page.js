"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function OnboardingPage() {
  const router = useRouter()

  const [fullName, setFullName] = useState("")
  const [grade, setGrade] = useState("9")
  const [schoolName, setSchoolName] = useState("")
  const [country, setCountry] = useState("")

  const [errorMessage, setErrorMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    setErrorMessage("")

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        if (userError?.message?.includes("Auth session missing")) {
          setErrorMessage("Your session is missing. Please try again (or log in again if needed).")
          return
        }

        setErrorMessage(userError?.message || "You must be logged in to complete onboarding.")
        return
      }

      const { error: insertError } = await supabase.from("profiles").insert({
        user_id: user.id,
        full_name: fullName,
        grade,
        school_name: schoolName,
        country,
      })

      if (insertError) {
        setErrorMessage(insertError.message)
        return
      }

      router.push("/personality-test")
    } catch (err) {
      if (err?.message?.includes("Auth session missing")) {
        setErrorMessage("Your session is missing. Please try again (or log in again if needed).")
        return
      }

      setErrorMessage(err?.message || "Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F8F6] text-[#111] px-4 py-16 flex items-center justify-center">
      <Card className="w-full max-w-md bg-white text-[#111] ring-1 ring-[#111]/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-medium">Let&apos;s set up your profile</CardTitle>
          <CardDescription className="text-[#111]/70">A few details to personalize your experience.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-[#111]/90">
                Full name
              </Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-[#F8F8F6] border-[#111]/10 text-[#111] placeholder:text-[#111]/40 focus-visible:ring-[#0F6E56]/40 focus-visible:border-[#0F6E56]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade" className="text-[#111]/90">
                Grade
              </Label>
              <select
                id="grade"
                name="grade"
                required
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="h-9 w-full rounded-4xl border border-[#111]/10 bg-[#F8F8F6] px-3 text-base text-[#111] outline-none transition-colors focus-visible:ring-[#0F6E56]/40 focus-visible:border-[#0F6E56]"
              >
                <option value="9">Grade 9</option>
                <option value="10">Grade 10</option>
                <option value="11">Grade 11</option>
                <option value="12">Grade 12</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="schoolName" className="text-[#111]/90">
                School name
              </Label>
              <Input
                id="schoolName"
                name="schoolName"
                type="text"
                autoComplete="organization"
                required
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="bg-[#F8F8F6] border-[#111]/10 text-[#111] placeholder:text-[#111]/40 focus-visible:ring-[#0F6E56]/40 focus-visible:border-[#0F6E56]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country" className="text-[#111]/90">
                Country
              </Label>
              <Input
                id="country"
                name="country"
                type="text"
                autoComplete="country-name"
                required
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="bg-[#F8F8F6] border-[#111]/10 text-[#111] placeholder:text-[#111]/40 focus-visible:ring-[#0F6E56]/40 focus-visible:border-[#0F6E56]"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="w-full bg-[#0F6E56] text-white hover:bg-[#0F6E56]/90 focus-visible:ring-[#0F6E56]/50"
            >
              {isSubmitting ? "Saving..." : "Continue"}
            </Button>
          </form>

          {errorMessage ? (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

