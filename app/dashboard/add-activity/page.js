"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const SIDEBAR_ITEMS = [
  { label: "Overview", href: "/dashboard" },
  { label: "Personality", href: "/personality-test" },
  { label: "My Activities", href: "/dashboard/activities" },
  { label: "Add Activity", href: "/dashboard/add-activity" },
  { label: "Opportunities", href: "/opportunities" },
  { label: "AI Coach", href: "/ai-coach" },
  { label: "Export Portfolio", href: "/export-portfolio" },
]

const CATEGORIES = [
  "Academic",
  "Leadership",
  "Community Service",
  "Arts",
  "Sports",
  "Research",
  "Work/Internship",
  "Other",
]

function AddActivityForm() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const editId = searchParams.get("id")

  const activeHref = pathname || "/dashboard/add-activity"

  const [activityName, setActivityName] = useState("")
  const [category, setCategory] = useState("Academic")
  const [role, setRole] = useState("")
  const [startDate, setStartDate] = useState("")
  const [hoursPerWeek, setHoursPerWeek] = useState("")
  const [totalHours, setTotalHours] = useState("")
  const [impactDescription, setImpactDescription] = useState("")

  const [errorMessage, setErrorMessage] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [loadingActivity, setLoadingActivity] = useState(false)

  useEffect(() => {
    if (!editId) return

    let cancelled = false

    async function load() {
      setLoadingActivity(true)
      setErrorMessage("")

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          router.push("/login")
          return
        }

        const { data: row, error: fetchError } = await supabase
          .from("activities")
          .select(
            "activity_name, category, role, start_date, hours_per_week, total_hours, description, user_id"
          )
          .eq("id", editId)
          .maybeSingle()

        if (fetchError) throw fetchError
        if (!row || row.user_id !== user.id) {
          setErrorMessage("Activity not found.")
          return
        }

        if (cancelled) return

        setActivityName(row.activity_name ?? "")
        setCategory(row.category ?? "Academic")
        setRole(row.role ?? "")
        setStartDate(row.start_date ? String(row.start_date).slice(0, 10) : "")
        setHoursPerWeek(row.hours_per_week != null ? String(row.hours_per_week) : "")
        setTotalHours(row.total_hours != null ? String(row.total_hours) : "")
        setImpactDescription(row.description ?? "")
      } catch (err) {
        if (!cancelled) setErrorMessage(err?.message || "Failed to load activity.")
      } finally {
        if (!cancelled) setLoadingActivity(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [editId, router])

  async function onSubmit(e) {
    e.preventDefault()
    if (isSaving) return

    setIsSaving(true)
    setErrorMessage("")

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setErrorMessage(userError?.message || "You must be logged in to save an activity.")
        return
      }

      const hoursPerWeekNum = Number.parseFloat(hoursPerWeek)
      const totalHoursNum = Number.parseFloat(totalHours)

      const payload = {
        activity_name: activityName,
        category,
        role,
        start_date: startDate,
        hours_per_week: Number.isFinite(hoursPerWeekNum) ? hoursPerWeekNum : null,
        total_hours: Number.isFinite(totalHoursNum) ? totalHoursNum : null,
        description: impactDescription,
      }

      if (editId) {
        const { error: updateError } = await supabase
          .from("activities")
          .update(payload)
          .eq("id", editId)
          .eq("user_id", user.id)

        if (updateError) {
          setErrorMessage(updateError.message)
          return
        }
      } else {
        const { error: insertError } = await supabase.from("activities").insert({
          ...payload,
          user_id: user.id,
          impact_score: 0,
        })

        if (insertError) {
          setErrorMessage(insertError.message)
          return
        }
      }

      router.push("/dashboard/activities")
    } catch (err) {
      setErrorMessage(err?.message || "Failed to save activity.")
    } finally {
      setIsSaving(false)
    }
  }

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
        <div className="max-w-2xl">
          <Card className="bg-white text-[#111] ring-1 ring-[#111]/10 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-medium">
                {editId ? "Edit activity" : "Log an activity"}
              </CardTitle>
              <CardDescription className="text-[#111]/70">
                {editId ? "Update this extracurricular." : "Add an extracurricular to your portfolio."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingActivity && editId ? (
                <p className="text-sm text-[#111]/60">Loading...</p>
              ) : null}
              <form
                onSubmit={onSubmit}
                className={["space-y-5", loadingActivity && editId ? "hidden" : ""].join(" ")}
              >
                <div className="space-y-2">
                  <Label htmlFor="activityName" className="text-[#111]/90">
                    Activity name
                  </Label>
                  <Input
                    id="activityName"
                    name="activityName"
                    type="text"
                    required
                    value={activityName}
                    onChange={(e) => setActivityName(e.target.value)}
                    className="bg-[#F8F8F6] border-[#111]/10 text-[#111] placeholder:text-[#111]/40 focus-visible:ring-[#0F6E56]/40 focus-visible:border-[#0F6E56]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-[#111]/90">
                    Category
                  </Label>
                  <select
                    id="category"
                    name="category"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-9 w-full rounded-4xl border border-[#111]/10 bg-[#F8F8F6] px-3 text-base text-[#111] outline-none transition-colors focus-visible:ring-[#0F6E56]/40 focus-visible:border-[#0F6E56] md:text-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="text-[#111]/90">
                    Your role
                  </Label>
                  <Input
                    id="role"
                    name="role"
                    type="text"
                    placeholder="e.g. Team captain"
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="bg-[#F8F8F6] border-[#111]/10 text-[#111] placeholder:text-[#111]/40 focus-visible:ring-[#0F6E56]/40 focus-visible:border-[#0F6E56]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-[#111]/90">
                    Start date
                  </Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-[#F8F8F6] border-[#111]/10 text-[#111] placeholder:text-[#111]/40 focus-visible:ring-[#0F6E56]/40 focus-visible:border-[#0F6E56]"
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="hoursPerWeek" className="text-[#111]/90">
                      Hours per week
                    </Label>
                    <Input
                      id="hoursPerWeek"
                      name="hoursPerWeek"
                      type="number"
                      min="0"
                      step="0.25"
                      required
                      value={hoursPerWeek}
                      onChange={(e) => setHoursPerWeek(e.target.value)}
                      className="bg-[#F8F8F6] border-[#111]/10 text-[#111] placeholder:text-[#111]/40 focus-visible:ring-[#0F6E56]/40 focus-visible:border-[#0F6E56]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalHours" className="text-[#111]/90">
                      Total hours
                    </Label>
                    <Input
                      id="totalHours"
                      name="totalHours"
                      type="number"
                      min="0"
                      step="0.25"
                      required
                      value={totalHours}
                      onChange={(e) => setTotalHours(e.target.value)}
                      className="bg-[#F8F8F6] border-[#111]/10 text-[#111] placeholder:text-[#111]/40 focus-visible:ring-[#0F6E56]/40 focus-visible:border-[#0F6E56]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="impactDescription" className="text-[#111]/90">
                    Description of your impact
                  </Label>
                  <textarea
                    id="impactDescription"
                    name="impactDescription"
                    rows={4}
                    required
                    placeholder="Describe what you did and the impact it had..."
                    value={impactDescription}
                    onChange={(e) => setImpactDescription(e.target.value)}
                    className="min-h-[120px] w-full resize-y rounded-2xl border border-[#111]/10 bg-[#F8F8F6] px-3 py-2 text-sm text-[#111] placeholder:text-[#111]/40 outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-[#0F6E56]/40 focus-visible:border-[#0F6E56]"
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isSaving || (Boolean(editId) && loadingActivity)}
                  className="w-full bg-[#0F6E56] text-white hover:bg-[#0F6E56]/90 focus-visible:ring-[#0F6E56]/50"
                >
                  {isSaving ? "Saving..." : editId ? "Update activity" : "Save activity"}
                </Button>

                {errorMessage ? (
                  <p className="text-sm text-red-600" role="alert">
                    {errorMessage}
                  </p>
                ) : null}
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default function AddActivityPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F8F6] flex items-center justify-center text-sm text-[#111]/60">
          Loading...
        </div>
      }
    >
      <AddActivityForm />
    </Suspense>
  )
}
