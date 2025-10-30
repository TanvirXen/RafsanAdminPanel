import { NextResponse, type NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { connectMongo } from '@/lib/server/mongodb'
import { AdminUser } from '@/lib/server/models/AdminUser'
import { authenticateRequest } from '@/lib/server/auth'

const setupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
  role: z.enum(['admin', 'editor']).default('admin'),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = setupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
  }

  await connectMongo()

  const adminCount = await AdminUser.countDocuments()
  const authPayload = authenticateRequest(request)

  if (adminCount > 0 && !authPayload) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const existing = await AdminUser.findOne({ email: parsed.data.email.toLowerCase() })
  if (existing) {
    return NextResponse.json({ message: 'User with this email already exists' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)
  const user = await AdminUser.create({
    email: parsed.data.email.toLowerCase(),
    passwordHash,
    name: parsed.data.name,
    role: parsed.data.role,
  })

  return NextResponse.json({
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    },
  })
}
