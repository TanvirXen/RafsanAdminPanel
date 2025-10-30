import { NextResponse, type NextRequest } from 'next/server'
import { Types } from 'mongoose'
import { z } from 'zod'
import { connectMongo } from '@/lib/server/mongodb'
import { Reel, Show } from '@/lib/server/models/Show'
import { authenticateRequest } from '@/lib/server/auth'

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  showId: z.string().optional(),
  description: z.string().optional(),
  thumbnail: z.string().url().optional().or(z.literal('')),
  link: z.string().optional(),
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  const { id } = params
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid reel id' }, { status: 400 })
  }

  await connectMongo()
  const reel = await Reel.findById(id).lean()
  if (!reel) {
    return NextResponse.json({ message: 'Reel not found' }, { status: 404 })
  }

  const show = await Show.findById(reel.showId).lean()

  return NextResponse.json({
    reel: {
      _id: reel._id.toString(),
      title: reel.title,
      showId: reel.showId.toString(),
      showTitle: show?.title,
      description: reel.description,
      thumbnail: reel.thumbnail,
      link: reel.link,
      createdAt: reel.createdAt,
      updatedAt: reel.updatedAt,
    },
  })
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  const { id } = params
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid reel id' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
  }

  const update: Record<string, any> = { ...parsed.data }
  if (update.showId) {
    if (!Types.ObjectId.isValid(update.showId)) {
      return NextResponse.json({ message: 'Invalid show id' }, { status: 400 })
    }
    update.showId = new Types.ObjectId(update.showId)
  }
  if (update.thumbnail === '') update.thumbnail = undefined

  await connectMongo()
  const reel = await Reel.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).lean()
  if (!reel) {
    return NextResponse.json({ message: 'Reel not found' }, { status: 404 })
  }

  return NextResponse.json({
    reel: {
      _id: reel._id.toString(),
      title: reel.title,
      showId: reel.showId.toString(),
      description: reel.description,
      thumbnail: reel.thumbnail,
      link: reel.link,
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
    return NextResponse.json({ message: 'Invalid reel id' }, { status: 400 })
  }

  await connectMongo()
  const reel = await Reel.findByIdAndDelete(id).lean()
  if (!reel) {
    return NextResponse.json({ message: 'Reel not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
