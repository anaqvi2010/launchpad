"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function SignupPage() {
  const router = useRouter()

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const [errorMessage, setErrorMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    setErrorMessage("")

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      })

      if (error) {
        setErrorMessage(error.message)
        return
      }

      // Ensure auth session is initialized and stored before navigating.
      await supabase.auth.getUser().catch(() => null)
      router.push("/onboarding")
    } catch (err) {
      setErrorMessage(err?.message || "Signup failed. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F8F6] text-[#111] px-4 py-16 flex items-center justify-center">
      <Card className="w-full max-w-md bg-white text-[#111] ring-1 ring-[#111]/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-medium">Create your account</CardTitle>
          <CardDescription className="text-[#111]/70">Sign up to get started.</CardDescription>
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
              <Label htmlFor="email" className="text-[#111]/90">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#F8F8F6] border-[#111]/10 text-[#111] placeholder:text-[#111]/40 focus-visible:ring-[#0F6E56]/40 focus-visible:border-[#0F6E56]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#111]/90">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#F8F8F6] border-[#111]/10 text-[#111] placeholder:text-[#111]/40 focus-visible:ring-[#0F6E56]/40 focus-visible:border-[#0F6E56]"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="w-full bg-[#0F6E56] text-white hover:bg-[#0F6E56]/90 focus-visible:ring-[#0F6E56]/50"
            >
              {isSubmitting ? "Creating account..." : "Sign up"}
            </Button>
          </form>

          {errorMessage ? (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <p className="mt-6 text-sm text-[#111]/70 text-center">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-[#0F6E56] hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

