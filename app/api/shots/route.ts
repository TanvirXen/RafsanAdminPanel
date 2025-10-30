import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { connectMongo } from '@/lib/server/mongodb'
import { Shot } from '@/lib/server/models/Shot'
import { authenticateRequest } from '@/lib/server/auth'

const shotSchema = z.object({
  image: z.string().url(),
  sequence: z.number().int().min(1),
})

export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  await connectMongo()
  const shots = await Shot.find().sort({ sequence: 1 }).lean()

  return NextResponse.json({
    shots: shots.map((shot) => ({
      _id: shot._id.toString(),
      image: shot.image,
      sequence: shot.sequence,
      createdAt: shot.createdAt,
      updatedAt: shot.updatedAt,
    })),
  })
}

export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = shotSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
  }

  await connectMongo()
  const shot = await Shot.create(parsed.data)

  return NextResponse.json(
    {
      shot: {
        _id: shot._id.toString(),
        image: shot.image,
        sequence: shot.sequence,
      },
    },
    { status: 201 },
  )
}
