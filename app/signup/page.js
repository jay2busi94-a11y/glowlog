'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from "../components/Navbar"
import { createClient } from '../../lib/supabase'

export default function SignUp() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignUp(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white flex flex-col items-center justify-center px-4 overflow-hidden">

      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-pink-500/20 rounded-full blur-[120px] pointer-events-none" />

      <Navbar />

      <div className="relative z-10 w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-8 mt-10">
        <h2 className="text-3xl font-bold mb-2 text-center">Create your account</h2>
        <p className="text-gray-400 text-sm text-center mb-8">Start building your perfect skincare routine</p>

        <form onSubmit={handleSignUp} className="flex flex-col gap-4">

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Full Name</label>
            <input
              type="text"
              placeholder="Jane Doe"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 transition"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 transition"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 transition"
            />
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold py-3 rounded-full hover:opacity-90 transition shadow-lg shadow-pink-500/20 mt-2 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="text-[10px] text-gray-500 text-center mt-1">
            By signing up you agree to our <a href="/terms" className="text-pink-400 hover:text-pink-300 transition">Terms</a> and <a href="/privacy" className="text-pink-400 hover:text-pink-300 transition">Privacy Policy</a>.
          </p>

        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          Already have an account?{" "}
          <a href="/login" className="text-pink-400 hover:text-pink-300 transition">Log in</a>
        </p>

        <div className="flex justify-center gap-5 mt-6 text-xs text-gray-600">
          <a href="/privacy" className="hover:text-gray-300 transition">Privacy</a>
          <a href="/terms" className="hover:text-gray-300 transition">Terms</a>
          <a href="/about" className="hover:text-gray-300 transition">About</a>
        </div>

      </div>
    </main>
  )
}
