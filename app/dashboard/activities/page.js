"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"

import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const SIDEBAR_ITEMS = [
  { label: "Overview", href: "/dashboard" },
  { label: "Personality", href: "/personality-test" },
  { label: "My Activities", href: "/dashboard/activities" },
  { label: "Add Activity", href: "/dashboard/add-activity" },
  { label: "Opportunities", href: "/opportunities" },
  { label: "AI Coach", href: "/ai-coach" },
  { label: "Export Portfolio", href: "/export-portfolio" },
]

/** Left border color per category (distinct, readable on white). */
const CATEGORY_BORDER = {
  Academic: "border-l-[#2563EB]",
  Leadership: "border-l-[#7C3AED]",
  "Community Service": "border-l-[#0D9488]",
  Arts: "border-l-[#DB2777]",
  Sports: "border-l-[#EA580C]",
  Research: "border-l-[#4F46E5]",
  "Work/Internship": "border-l-[#475569]",
  Other: "border-l-[#737373]",
}

function formatImpactScore(value) {
  if (value === null || value === undefined) return "0"
  const n = typeof value === "number" ? value : Number.parseFloat(String(value))
  if (!Number.isFinite(n)) return "0"
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

/** Split coaching copy into paragraphs; avoid markdown/bullets in presentation. */
function CoachingParagraphs({ text }) {
  const raw = (text ?? "").trim()
  if (!raw) return null

  const blocks = raw.split(/\n\s*\n/).filter(Boolean)
  const paragraphs = blocks.length > 0 ? blocks : [raw]

  return (
    <div className="space-y-3 font-normal">
      {paragraphs.map((block, i) => (
        <p key={i} className="m-0">
          {block.split("\n").map((line, j) => (
            <span key={j}>
              {j > 0 ? <br /> : null}
              {line.replace(/\*\*?/g, "")}
            </span>
          ))}
        </p>
      ))}
    </div>
  )
}

function CoachingPanel({ text, onRegenerate, isRegenerating }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [text])

  return (
    <div
      className="transition-opacity duration-300 ease-out"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div className="relative border-l-[3px] border-l-[#0F6E56] bg-[#E1F5EE] px-5 py-4">
        <div
          className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-[#0F6E56]"
          style={{ letterSpacing: "0.12em" }}
        >
          AI coaching
        </div>
        <div
          className="pr-16 font-serif text-[14px] leading-[1.8] text-[#085041]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          <CoachingParagraphs text={text} />
        </div>
        <button
          type="button"
          disabled={isRegenerating}
          onClick={onRegenerate}
          className="absolute bottom-3 right-4 text-xs text-[#111]/45 transition-colors hover:text-[#111]/65 disabled:opacity-50"
        >
          Regenerate
        </button>
      </div>
    </div>
  )
}

export default function ActivitiesPage() {
  const router = useRouter()
  const pathname = usePathname()
  const activeHref = pathname || "/dashboard/activities"

  const [loading, setLoading] = useState(true)
  const [activities, setActivities] = useState([])
  const [coachingActivityIds, setCoachingActivityIds] = useState(() => new Set())
  const [errorMessage, setErrorMessage] = useState("")
  const [deletingId, setDeletingId] = useState(null)
  const [coachingLoadingId, setCoachingLoadingId] = useState(null)
  const [coachingTextById, setCoachingTextById] = useState({})
  const [coachingErrorById, setCoachingErrorById] = useState({})
  /** When true, coaching panel is hidden for that activity (View coaching toggles). */
  const [coachingCollapsedById, setCoachingCollapsedById] = useState({})

  const loadData = useCallback(async () => {
    setLoading(true)
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

      const { data: rows, error: actError } = await supabase
        .from("activities")
        .select("id, activity_name, category, role, total_hours, impact_score, user_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      let activityRows = rows ?? []

      if (actError) {
        const { data: rows2, error: actError2 } = await supabase
          .from("activities")
          .select("id, activity_name, category, role, total_hours, impact_score, user_id")
          .eq("user_id", user.id)

        if (actError2) throw actError2
        activityRows = rows2 ?? []
      }

      setActivities(activityRows)

      const ids = activityRows.map((r) => r.id).filter(Boolean)

      if (ids.length === 0) {
        setCoachingActivityIds(new Set())
        setCoachingTextById({})
        return
      }

      const { data: coachingRows, error: coachError } = await supabase
        .from("ai_coaching")
        .select("activity_id")
        .in("activity_id", ids)

      if (coachError) {
        const { data: coachingByUser, error: coachErr2 } = await supabase
          .from("ai_coaching")
          .select("activity_id")
          .eq("user_id", user.id)

        if (coachErr2) {
          setCoachingActivityIds(new Set())
        } else {
          const allowed = new Set(ids)
          const set = new Set()
          ;(coachingByUser ?? []).forEach((row) => {
            if (row?.activity_id && allowed.has(row.activity_id)) set.add(row.activity_id)
          })
          setCoachingActivityIds(set)
        }
      } else {
        const set = new Set((coachingRows ?? []).map((r) => r.activity_id).filter(Boolean))
        setCoachingActivityIds(set)
      }

      const { data: coachingTextRows, error: textErr } = await supabase
        .from("ai_coaching")
        .select("activity_id, coaching_text, created_at")
        .in("activity_id", ids)
        .order("created_at", { ascending: false })

      const textMap = {}
      if (!textErr && coachingTextRows?.length) {
        for (const row of coachingTextRows) {
          if (row.activity_id && textMap[row.activity_id] == null && row.coaching_text != null) {
            textMap[row.activity_id] = row.coaching_text
          }
        }
      }
      setCoachingTextById(textMap)
    } catch (err) {
      setErrorMessage(err?.message || "Failed to load activities.")
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function loadCoachingFromDatabase(activityId) {
    if (!activityId || coachingLoadingId === activityId) return

    setCoachingLoadingId(activityId)
    setCoachingErrorById((prev) => ({ ...prev, [activityId]: "" }))

    try {
      const { data, error } = await supabase
        .from("ai_coaching")
        .select("coaching_text")
        .eq("activity_id", activityId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error

      if (data?.coaching_text != null) {
        setCoachingTextById((prev) => ({ ...prev, [activityId]: data.coaching_text }))
        setCoachingCollapsedById((prev) => ({ ...prev, [activityId]: false }))
      }
    } catch (err) {
      setCoachingErrorById((prev) => ({
        ...prev,
        [activityId]: err?.message || "Could not load coaching.",
      }))
    } finally {
      setCoachingLoadingId(null)
    }
  }

  async function requestNewCoaching(activityId) {
    if (!activityId || coachingLoadingId === activityId) return

    setCoachingLoadingId(activityId)
    setCoachingErrorById((prev) => ({ ...prev, [activityId]: "" }))

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        router.push("/login")
        return
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        router.push("/login")
        return
      }

      const res = await fetch("/api/coaching", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ activityId, userId: user.id }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || "Could not get AI feedback.")
      }

      setCoachingTextById((prev) => ({
        ...prev,
        [activityId]: data.coaching_text ?? "",
      }))

      if (typeof data.impact_score === "number") {
        setActivities((prev) =>
          prev.map((a) =>
            a.id === activityId ? { ...a, impact_score: data.impact_score } : a
          )
        )
      }

      setCoachingActivityIds((prev) => new Set([...prev, activityId]))
      setCoachingCollapsedById((prev) => ({ ...prev, [activityId]: false }))
    } catch (err) {
      setCoachingErrorById((prev) => ({
        ...prev,
        [activityId]: err?.message || "Something went wrong.",
      }))
    } finally {
      setCoachingLoadingId(null)
    }
  }

  function handlePrimaryCoachingButton(activityId, hasCoachingRecord, coachingText) {
    if (coachingLoadingId === activityId) return

    if (hasCoachingRecord) {
      if (coachingText) {
        setCoachingCollapsedById((prev) => ({
          ...prev,
          [activityId]: !prev[activityId],
        }))
        return
      }
      loadCoachingFromDatabase(activityId)
      return
    }

    requestNewCoaching(activityId)
  }

  async function handleDelete(activityId) {
    if (!activityId || deletingId) return
    if (!confirm("Delete this activity? This cannot be undone.")) return

    setDeletingId(activityId)
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

      const { error: delError } = await supabase
        .from("activities")
        .delete()
        .eq("id", activityId)
        .eq("user_id", user.id)

      if (delError) throw delError

      setActivities((prev) => prev.filter((a) => a.id !== activityId))
      setCoachingActivityIds((prev) => {
        const next = new Set(prev)
        next.delete(activityId)
        return next
      })
      setCoachingTextById((prev) => {
        const next = { ...prev }
        delete next[activityId]
        return next
      })
      setCoachingCollapsedById((prev) => {
        const next = { ...prev }
        delete next[activityId]
        return next
      })
    } catch (err) {
      setErrorMessage(err?.message || "Could not delete activity.")
    } finally {
      setDeletingId(null)
    }
  }

  const empty = useMemo(() => !loading && activities.length === 0, [loading, activities.length])

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
        <div className="max-w-3xl">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-medium text-[#111]">My activities</h1>
              <p className="mt-1 text-sm text-[#111]/60">Everything you have logged for your portfolio.</p>
            </div>
            <Button
              asChild
              className="w-full shrink-0 bg-[#0F6E56] text-white hover:bg-[#0F6E56]/90 sm:w-auto"
            >
              <Link href="/dashboard/add-activity">Add activity</Link>
            </Button>
          </div>

          {errorMessage ? (
            <p className="mb-4 text-sm text-red-600" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {loading ? (
            <p className="text-sm text-[#111]/60">Loading...</p>
          ) : empty ? (
            <div className="rounded-2xl border border-[#111]/10 bg-white px-8 py-14 text-center ring-1 ring-[#111]/5">
              <p className="text-base text-[#111]/70">No activities yet — add your first one</p>
              <Button asChild className="mt-6 bg-[#0F6E56] text-white hover:bg-[#0F6E56]/90">
                <Link href="/dashboard/add-activity">Add activity</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-4">
              {activities.map((a) => {
                const border =
                  CATEGORY_BORDER[a.category] ?? CATEGORY_BORDER.Other
                const hasCoaching = coachingActivityIds.has(a.id)
                const coachingText = coachingTextById[a.id]
                const hours =
                  a.total_hours !== null && a.total_hours !== undefined
                    ? `${a.total_hours} total hrs`
                    : "— hrs"
                const impact = formatImpactScore(a.impact_score)

                const isCoachingLoading = coachingLoadingId === a.id
                const panelCollapsed = coachingCollapsedById[a.id] === true
                const showCoachingPanel =
                  Boolean(coachingText) && !panelCollapsed

                const primaryLabel = hasCoaching ? "View coaching" : "Get AI feedback"

                return (
                  <li key={a.id} className="space-y-3">
                    <div
                      className={[
                        "rounded-2xl border border-[#111]/10 bg-white pl-4 pr-5 py-4 shadow-sm ring-1 ring-[#111]/5",
                        "border-l-4",
                        border,
                      ].join(" ")}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-[#111]">{a.activity_name}</div>
                          <p className="mt-1 text-sm text-[#111]/55">
                            {[a.role, hours].filter(Boolean).join(" · ")}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <Badge variant="outline" className="border-[#111]/15 bg-[#F8F8F6] text-[#111]">
                            {impact} impact
                          </Badge>
                          {hasCoaching ? (
                            <Badge className="border-transparent bg-[#E1F5EE] text-[#0F6E56] hover:bg-[#E1F5EE]">
                              AI tip
                            </Badge>
                          ) : null}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="min-h-[2.25rem] rounded-xl border-[#0F6E56]/30 text-[#0F6E56] hover:bg-[#E1F5EE]"
                              disabled={isCoachingLoading || deletingId === a.id}
                              onClick={() =>
                                handlePrimaryCoachingButton(a.id, hasCoaching, coachingText)
                              }
                            >
                              {isCoachingLoading ? (
                                <span className="inline-flex items-center gap-2 text-left">
                                  <svg
                                    className="h-4 w-4 shrink-0 animate-spin"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    aria-hidden
                                  >
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                    />
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                  </svg>
                                  <span className="text-xs font-normal leading-snug sm:text-sm">
                                    Analysing your activity...
                                  </span>
                                </span>
                              ) : (
                                primaryLabel
                              )}
                            </Button>
                            <Button variant="outline" size="sm" className="rounded-xl" asChild>
                              <Link href={`/dashboard/add-activity?id=${a.id}`}>Edit</Link>
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="rounded-xl"
                              disabled={deletingId === a.id || isCoachingLoading}
                              onClick={() => handleDelete(a.id)}
                            >
                              {deletingId === a.id ? "..." : "Delete"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {coachingErrorById[a.id] ? (
                      <p className="text-sm text-red-600" role="alert">
                        {coachingErrorById[a.id]}
                      </p>
                    ) : null}

                    {showCoachingPanel ? (
                      <CoachingPanel
                        key={`${a.id}-${coachingText}`}
                        text={coachingText}
                        isRegenerating={isCoachingLoading}
                        onRegenerate={() => requestNewCoaching(a.id)}
                      />
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
