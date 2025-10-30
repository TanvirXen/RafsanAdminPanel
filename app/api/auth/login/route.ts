import { NextResponse, type NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { connectMongo } from '@/lib/server/mongodb'
import { AdminUser } from '@/lib/server/models/AdminUser'
import { signAuthToken } from '@/lib/server/jwt'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null)
  const parsed = loginSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
  }

  const { email, password } = parsed.data

  await connectMongo()

  const user = await AdminUser.findOne({ email: email.toLowerCase() })
  if (!user) {
    return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 })
  }

  const isValid = await bcrypt.compare(password, user.passwordHash)
  if (!isValid) {
    return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 })
  }

  const token = signAuthToken({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  })

  const response = NextResponse.json({
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    },
    token,
  })

  const isProduction = process.env.NODE_ENV === 'production'

  response.cookies.set('admin_token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 2, // 2 days
  })

  return response
}
