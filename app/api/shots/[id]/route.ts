import { NextResponse, type NextRequest } from 'next/server'
import { Types } from 'mongoose'
import { z } from 'zod'
import { connectMongo } from '@/lib/server/mongodb'
import { Shot } from '@/lib/server/models/Shot'
import { authenticateRequest } from '@/lib/server/auth'

const updateSchema = z.object({
  image: z.string().url().optional(),
  sequence: z.number().int().min(1).optional(),
})

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  const { id } = params
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid shot id' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
  }

  await connectMongo()
  const shot = await Shot.findByIdAndUpdate(id, { $set: parsed.data }, { new: true, runValidators: true }).lean()
  if (!shot) {
    return NextResponse.json({ message: 'Shot not found' }, { status: 404 })
  }

  return NextResponse.json({
    shot: {
      _id: shot._id.toString(),
      image: shot.image,
      sequence: shot.sequence,
    },
  })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  const { id } = params
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid shot id' }, { status: 400 })
  }

  await connectMongo()
  const shot = await Shot.findByIdAndDelete(id).lean()
  if (!shot) {
    return NextResponse.json({ message: 'Shot not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
