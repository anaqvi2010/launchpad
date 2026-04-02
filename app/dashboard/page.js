"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"

import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const SIDEBAR_ITEMS = [
  { label: "Overview", href: "/dashboard" },
  { label: "Personality", href: "/personality-test" },
  { label: "My Activities", href: "/my-activities" },
  { label: "Add Activity", href: "/add-activity" },
  { label: "Opportunities", href: "/opportunities" },
  { label: "AI Coach", href: "/ai-coach" },
  { label: "Export Portfolio", href: "/export-portfolio" },
]

function scoreToBarWidth(score) {
  if (typeof score !== "number") return "0%"
  return `${Math.max(0, Math.min(100, score))}%`
}

export default function DashboardPage() {
  const router = useRouter()
  const pathname = usePathname()

  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [personality, setPersonality] = useState(null)

  const firstName = useMemo(() => {
    const full = profile?.full_name || profile?.fullName || ""
    if (typeof full === "string" && full.trim().length > 0) {
      return full.trim().split(/\s+/)[0]
    }
    const email = user?.email || ""
    return typeof email === "string" && email.includes("@") ? email.split("@")[0] : "there"
  }, [profile, user])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setErrorMessage("")

      try {
        const {
          data: { user: supabaseUser },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !supabaseUser) {
          router.push("/login")
          return
        }

        if (cancelled) return
        setUser(supabaseUser)

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", supabaseUser.id)
          .maybeSingle()

        if (profileError) throw profileError

        if (cancelled) return
        setProfile(profileData)

        // personality_results may or may not exist yet, so we use maybeSingle() / fallback.
        let personalityData = null
        const { data: resultsData, error: resultsError } = await supabase
          .from("personality_results")
          .select("profile_type, analytical_score, creative_score, leadership_score, domain_interest")
          .eq("user_id", supabaseUser.id)
          .maybeSingle()

        if (resultsError) {
          // Fallback for schemas that don't support maybeSingle() ordering.
          try {
            const { data: orderedData, error: orderedError } = await supabase
              .from("personality_results")
              .select("profile_type, analytical_score, creative_score, leadership_score, domain_interest")
              .eq("user_id", supabaseUser.id)
              .order("created_at", { ascending: false })
              .limit(1)

            if (orderedError) throw orderedError
            personalityData = orderedData?.[0] || null
          } catch {
            const { data: limitedData, error: limitedError } = await supabase
              .from("personality_results")
              .select("profile_type, analytical_score, creative_score, leadership_score, domain_interest")
              .eq("user_id", supabaseUser.id)
              .limit(1)

            if (limitedError) throw limitedError
            personalityData = limitedData?.[0] || null
          }
        } else {
          personalityData = resultsData || null
        }

        if (cancelled) return
        setPersonality(personalityData)
      } catch (err) {
        if (cancelled) return
        setErrorMessage(err?.message || "Failed to load dashboard.")
      } finally {
        if (cancelled) return
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [router])

  const activeHref = pathname || "/dashboard"

  const activityCount = 0
  const totalHours = 0
  const opportunitiesMatched = 0

  return (
    <div className="min-h-screen bg-[#F8F8F6] text-[#111] flex">
      <aside className="w-[280px] shrink-0 border-r border-[#111]/10 bg-white px-6 py-8">
        <div className="text-lg font-medium text-[#0F6E56]">Launchpad</div>
        <nav className="mt-8 space-y-2">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = activeHref === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "block rounded-2xl px-4 py-3 text-sm transition-colors",
                  isActive ? "bg-[#E1F5EE] text-[#0F6E56]" : "text-[#111] hover:bg-[#111]/5",
                ].join(" ")}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-10">
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-2xl"
            onClick={() => router.push("/login")}
          >
            Account
          </Button>
        </div>
      </aside>

      <main className="flex-1 px-8 py-10">
        {loading ? (
          <div className="text-[#111]/70">Loading...</div>
        ) : errorMessage ? (
          <div className="text-red-600 text-sm" role="alert">
            {errorMessage}
          </div>
        ) : (
          <div className="max-w-5xl">
            <div className="mb-6">
              <div className="text-sm text-[#111]/70">Welcome back</div>
              <div className="text-2xl font-medium">
                Good morning, {firstName}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white text-[#111] ring-1 ring-[#111]/10 rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Activities logged</CardTitle>
                  <CardDescription className="text-[#111]/60">Your progress so far</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-medium">{activityCount}</div>
                </CardContent>
              </Card>

              <Card className="bg-white text-[#111] ring-1 ring-[#111]/10 rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total hours</CardTitle>
                  <CardDescription className="text-[#111]/60">Time spent learning</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-medium">{totalHours}h</div>
                </CardContent>
              </Card>

              <Card className="bg-white text-[#111] ring-1 ring-[#111]/10 rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Opportunities matched</CardTitle>
                  <CardDescription className="text-[#111]/60">Recommended next steps</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-medium">{opportunitiesMatched}</div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6">
              <Card className="bg-white text-[#111] ring-1 ring-[#111]/10 rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Your personality type</CardTitle>
                  <CardDescription className="text-[#111]/60">
                    Based on your answers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                      <div className="text-3xl font-medium">
                        {personality?.profile_type || "—"}
                      </div>
                      <div className="text-sm text-[#111]/60 mt-1">
                        Domain interest: {personality?.domain_interest ? personality.domain_interest : "—"}
                      </div>
                    </div>

                    <div className="w-full md:w-[320px] space-y-3">
                      {[
                        { key: "analytical", label: "Analytical", value: personality?.analytical_score },
                        { key: "creative", label: "Creative", value: personality?.creative_score },
                        { key: "leadership", label: "Leadership", value: personality?.leadership_score },
                        {
                          key: "social",
                          label: "Social",
                          value: personality
                            ? Math.max(
                                0,
                                100 -
                                  (personality.analytical_score || 0) -
                                  (personality.creative_score || 0) -
                                  (personality.leadership_score || 0)
                              )
                            : 0,
                        },
                      ].map((t) => (
                        <div key={t.key} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-[#111]/70">{t.label}</span>
                            <span className="font-medium">{typeof t.value === "number" ? `${Math.round(t.value)}%` : "—"}</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-[#111]/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#0F6E56]"
                              style={{ width: scoreToBarWidth(typeof t.value === "number" ? Math.round(t.value) : 0) }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!personality ? (
                    <div className="mt-6 text-sm text-[#111]/60">
                      No results found yet. Take the test to see your type.
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

