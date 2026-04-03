import { NextResponse } from "next/server"
import Groq from "groq-sdk"

import { createServerSupabaseClient } from "@/lib/supabase"

const SYSTEM_PROMPT =
  "You are a brutally honest but encouraging college counselor. You give specific, actionable advice tailored exactly to this student's personality type and activity. Never give generic advice that could apply to any student. Every tip must reference something specific from their activity description or personality type. Do not use bullet points, headers, or markdown. Write in a direct, conversational tone like a mentor talking to a student. 3 short paragraphs maximum."

const GROQ_MODEL = "llama-3.3-70b-versatile"

function buildUserMessage({ fullName, profileType, grade, activity }) {
  const activityName = activity?.activity_name ?? ""
  const role = activity?.role ?? ""
  const category = activity?.category ?? ""
  const totalHours =
    activity?.total_hours !== null && activity?.total_hours !== undefined
      ? String(activity.total_hours)
      : ""
  const hoursPerWeek =
    activity?.hours_per_week !== null && activity?.hours_per_week !== undefined
      ? String(activity.hours_per_week)
      : ""
  const description = activity?.description ?? ""

  return `Student's full name: ${fullName}

Personality type: ${profileType}

Grade: ${grade}

Activity name: ${activityName}

Role: ${role}

Category: ${category}

Total hours: ${totalHours}

Hours per week: ${hoursPerWeek}

Their exact description (word for word):
${description}

What specifically should THIS student do to make this activity stronger, stand out more, and frame it better for college applications?`
}

/**
 * Impact 1–10 from total hours and role depth (leadership-heavy roles score higher).
 */
function computeImpactScore(totalHours, role) {
  const h = Number(totalHours)
  const hours = Number.isFinite(h) ? Math.max(0, h) : 0
  const r = (role || "").toLowerCase()
  let depth = 1.4
  if (/(founder|president|captain|director|chair|lead|head|ceo|editor-in-chief)/i.test(r)) {
    depth = 2.3
  } else if (/(vice|officer|manager|editor|secretary|treasurer|coordinator)/i.test(r)) {
    depth = 1.9
  } else if (/(member|participant|helper|assistant|volunteer)/i.test(r)) {
    depth = 1.2
  }

  const scaled = (hours * depth) / 18
  const score = Math.min(10, Math.max(1, scaled))
  return Math.round(score * 10) / 10
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null

    if (!token) {
      return NextResponse.json({ error: "Missing Authorization bearer token." }, { status: 401 })
    }

    const body = await request.json()
    const activityId = typeof body?.activityId === "string" ? body.activityId : null
    const userId = typeof body?.userId === "string" ? body.userId : null

    if (!activityId || !userId) {
      return NextResponse.json({ error: "activityId and userId are required." }, { status: 400 })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "GROQ_API_KEY is not configured." }, { status: 500 })
    }

    const supabase = createServerSupabaseClient(token)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user || user.id !== userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
    }

    const { data: activity, error: actError } = await supabase
      .from("activities")
      .select("id, user_id, activity_name, role, category, total_hours, hours_per_week, description")
      .eq("id", activityId)
      .maybeSingle()

    if (actError) {
      return NextResponse.json({ error: actError.message }, { status: 500 })
    }

    if (!activity || activity.user_id !== userId) {
      return NextResponse.json({ error: "Activity not found." }, { status: 404 })
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("grade, full_name")
      .eq("user_id", userId)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    const { data: personality, error: persError } = await supabase
      .from("personality_results")
      .select("profile_type")
      .eq("user_id", userId)
      .maybeSingle()

    if (persError) {
      return NextResponse.json({ error: persError.message }, { status: 500 })
    }

    const profileType = personality?.profile_type ?? "General"
    const grade = profile?.grade != null && profile.grade !== "" ? String(profile.grade) : "—"
    const fullName =
      typeof profile?.full_name === "string" && profile.full_name.trim() !== ""
        ? profile.full_name.trim()
        : "Not provided"

    const userMessage = buildUserMessage({
      fullName,
      profileType,
      grade,
      activity,
    })

    const groq = new Groq({ apiKey })

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      max_tokens: 1024,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    })

    const coachingText = completion.choices[0]?.message?.content?.trim() ?? ""

    const impactScore = computeImpactScore(activity.total_hours, activity.role)

    const { error: insertError } = await supabase.from("ai_coaching").insert({
      user_id: userId,
      activity_id: activityId,
      coaching_text: coachingText,
    })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    const { error: updateError } = await supabase
      .from("activities")
      .update({ impact_score: impactScore })
      .eq("id", activityId)
      .eq("user_id", userId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ coaching_text: coachingText, impact_score: impactScore })
  } catch (err) {
    const message = err?.message || "Unexpected error."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
