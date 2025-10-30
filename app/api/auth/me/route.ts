import { NextResponse, type NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/server/auth'
import { connectMongo } from '@/lib/server/mongodb'
import { AdminUser } from '@/lib/server/models/AdminUser'

export async function GET(request: NextRequest) {
  const authPayload = authenticateRequest(request)
  if (!authPayload) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  await connectMongo()

  const user = await AdminUser.findById(authPayload.userId).lean()
  if (!user) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  })
}
