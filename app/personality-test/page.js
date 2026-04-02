"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const TRAITS = ["analytical", "creative", "leadership", "social"]

const TRAIT_TITLES = {
  analytical: "Analytical",
  creative: "Creative",
  leadership: "Leadership",
  social: "Social",
}

const QUESTION_FLOW = [
  {
    question: "A big science fair is coming up. What's your first instinct?",
    answers: [
      { label: "A) Research a topic no one has explored yet (+analytical)", trait: "analytical" },
      { label: "B) Design something visually stunning (+creative)", trait: "creative" },
      { label: "C) Organise the team and assign roles (+leadership)", trait: "leadership" },
      { label: "D) Find a way to help the local community (+social)", trait: "social" },
    ],
  },
  {
    question: "Your teacher gives you a free project — no rules. You:",
    answers: [
      { label: "A) Build a model or run experiments (+analytical)", trait: "analytical" },
      { label: "B) Write, draw, or make something (+creative)", trait: "creative" },
      { label: "C) Start a club or initiative around it (+leadership)", trait: "leadership" },
      { label: "D) Interview people and tell their stories (+social)", trait: "social" },
    ],
  },
  {
    question: "Which after-school activity sounds most like you?",
    answers: [
      { label: "A) Robotics or coding club (+analytical)", trait: "analytical" },
      { label: "B) Art, music, or theatre (+creative)", trait: "creative" },
      { label: "C) Student council or debate (+leadership)", trait: "leadership" },
      { label: "D) Volunteering or community work (+social)", trait: "social" },
    ],
  },
  {
    question: "Your ideal group project role is:",
    answers: [
      { label: "A) The researcher who finds all the data (+analytical)", trait: "analytical" },
      { label: "B) The one who makes it look and sound amazing (+creative)", trait: "creative" },
      { label: "C) The project manager keeping everyone on track (+leadership)", trait: "leadership" },
      { label: "D) The one who makes sure everyone feels heard (+social)", trait: "social" },
    ],
  },
  {
    question: "What kind of problems excite you most?",
    answers: [
      { label: "A) Puzzles with a clear right answer (+analytical)", trait: "analytical" },
      { label: "B) Open-ended creative challenges (+creative)", trait: "creative" },
      { label: "C) Getting people to work toward a shared goal (+leadership)", trait: "leadership" },
      { label: "D) Real-world problems affecting people (+social)", trait: "social" },
    ],
  },
  {
    question: "When you learn something new, you prefer:",
    answers: [
      { label: "A) Reading about the theory and logic behind it (+analytical)", trait: "analytical" },
      { label: "B) Seeing it, drawing it, or making something with it (+creative)", trait: "creative" },
      { label: "C) Teaching it to someone else (+leadership)", trait: "leadership" },
      { label: "D) Connecting it to how it affects people (+social)", trait: "social" },
    ],
  },
  {
    question: "Your dream internship would be at:",
    answers: [
      { label: "A) A research lab or tech company (+analytical)", trait: "analytical" },
      { label: "B) A design studio, film company, or magazine (+creative)", trait: "creative" },
      { label: "C) A startup where you can lead projects (+leadership)", trait: "leadership" },
      { label: "D) An NGO or social enterprise (+social)", trait: "social" },
    ],
  },
]

function scoreToPercent(count, total) {
  return Math.round((count / total) * 100)
}

export default function PersonalityTestPage() {
  const router = useRouter()
  const totalQuestions = QUESTION_FLOW.length

  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedTrait, setSelectedTrait] = useState(null)
  const [scores, setScores] = useState({
    analytical: 0,
    creative: 0,
    leadership: 0,
    social: 0,
  })
  const [errorMessage, setErrorMessage] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const progressPercent = useMemo(() => ((currentIndex + 1) / totalQuestions) * 100, [currentIndex, totalQuestions])

  const currentQuestion = QUESTION_FLOW[currentIndex]

  function traitSortKey(trait) {
    // Tie-break order for stable "top" selections
    return TRAITS.indexOf(trait)
  }

  async function saveAndRedirect(scoresForSave) {
    setIsSaving(true)
    setErrorMessage("")

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        if (userError?.message?.includes("Auth session missing")) {
          setErrorMessage("Your session is missing. Please log in again to save your results.")
          return
        }
        throw userError || new Error("You must be logged in to complete the personality test.")
      }

      const traitEntries = TRAITS.map((t) => [t, scoresForSave[t]])
      traitEntries.sort((a, b) => (b[1] - a[1]) || (traitSortKey(a[0]) - traitSortKey(b[0])))

      const top1 = traitEntries[0][0]
      const top2 = traitEntries[1][0]
      const domainInterest = TRAIT_TITLES[traitEntries[0][0]]

      const analytical_score = scoreToPercent(scoresForSave.analytical, totalQuestions)
      const creative_score = scoreToPercent(scoresForSave.creative, totalQuestions)
      const leadership_score = scoreToPercent(scoresForSave.leadership, totalQuestions)

      const profile_type = `${TRAIT_TITLES[top1]}-${TRAIT_TITLES[top2]}`

      const { error: insertError } = await supabase.from("personality_results").insert({
        user_id: user.id,
        profile_type,
        analytical_score,
        creative_score,
        leadership_score,
        domain_interest: domainInterest,
      })

      if (insertError) throw insertError

      router.push("/dashboard")
    } catch (err) {
      if (err?.message?.includes("Auth session missing")) {
        setErrorMessage("Your session is missing. Please log in again to save your results.")
        return
      }
      setErrorMessage(err?.message || "Failed to save results. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  async function onNext() {
    if (!selectedTrait) return
    const nextScores = {
      ...scores,
      [selectedTrait]: scores[selectedTrait] + 1,
    }

    const isLast = currentIndex === totalQuestions - 1
    setSelectedTrait(null)

    if (isLast) {
      await saveAndRedirect(nextScores)
      return
    }

    setScores(nextScores)
    setCurrentIndex((i) => i + 1)
  }

  return (
    <div className="min-h-screen bg-[#F8F8F6] text-[#111] px-4 py-16 flex items-center justify-center">
      <Card className="w-full max-w-2xl bg-white text-[#111] ring-1 ring-[#111]/10">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-medium">Personality Test</CardTitle>
          <CardDescription className="text-[#111]/70">Answer one question at a time. Choose the option that fits you best.</CardDescription>

          <div className="mt-4">
            <div className="h-2 w-full rounded-full bg-[#111]/10 overflow-hidden">
              <div className="h-full bg-[#0F6E56]" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="mt-2 text-sm text-[#111]/70">
              Question {currentIndex + 1} of {totalQuestions}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <div className="text-base font-medium">{currentQuestion.question}</div>

            <div className="grid grid-cols-1 gap-3">
              {currentQuestion.answers.map((a) => {
                const isSelected = selectedTrait === a.trait
                return (
                  <button
                    key={a.label}
                    type="button"
                    onClick={() => setSelectedTrait(a.trait)}
                    className={[
                      "text-left rounded-2xl border p-4 transition-colors outline-none",
                      isSelected ? "border-[#0F6E56] ring-1 ring-[#0F6E56]/30" : "border-[#111]/10 hover:border-[#111]/20",
                      "bg-white focus-visible:ring-[#0F6E56]/40",
                    ].join(" ")}
                  >
                    <div className="text-sm leading-6 text-[#111]">{a.label}</div>
                  </button>
                )
              })}
            </div>

            {selectedTrait ? (
              <div className="pt-2">
                <Button
                  type="button"
                  size="lg"
                  onClick={onNext}
                  disabled={isSaving}
                  className="w-full bg-[#0F6E56] text-white hover:bg-[#0F6E56]/90 focus-visible:ring-[#0F6E56]/50"
                >
                  {currentIndex === totalQuestions - 1 ? (isSaving ? "Saving..." : "Finish") : "Next"}
                </Button>
              </div>
            ) : null}

            {errorMessage ? (
              <p className="text-sm text-red-600" role="alert">
                {errorMessage}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

