import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function middleware(req) {
  const res = NextResponse.next()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options)
        })

        if (headers) {
          Object.entries(headers).forEach(([key, value]) => {
            res.headers.set(key, value)
          })
        }
      },
    },
  })

  const { data, error } = await supabase.auth.getUser()
  const user = data?.user

  // If Supabase can't read the session, treat as unauthenticated.
  if (error) {
    const url = req.nextUrl
    if (
      url.pathname.startsWith("/dashboard") ||
      url.pathname.startsWith("/onboarding") ||
      url.pathname.startsWith("/personality-test")
    ) {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = "/login"
      return NextResponse.redirect(redirectUrl)
    }
  }

  const url = req.nextUrl

  if (
    !user &&
    (url.pathname.startsWith("/dashboard") ||
      url.pathname.startsWith("/onboarding") ||
      url.pathname.startsWith("/personality-test"))
  ) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = "/login"
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/personality-test/:path*"],
}

