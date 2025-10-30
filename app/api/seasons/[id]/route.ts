import { NextResponse, type NextRequest } from 'next/server'
import { Types } from 'mongoose'
import { z } from 'zod'
import { connectMongo } from '@/lib/server/mongodb'
import { Season, Show } from '@/lib/server/models/Show'
import { authenticateRequest } from '@/lib/server/auth'

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  showId: z.string().optional(),
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  const { id } = params
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid season id' }, { status: 400 })
  }

  await connectMongo()
  const season = await Season.findById(id).lean()
  if (!season) {
    return NextResponse.json({ message: 'Season not found' }, { status: 404 })
  }

  const show = await Show.findById(season.showId).lean()

  return NextResponse.json({
    season: {
      _id: season._id.toString(),
      title: season.title,
      description: season.description,
      showId: season.showId.toString(),
      showTitle: show?.title,
      createdAt: season.createdAt,
      updatedAt: season.updatedAt,
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
    return NextResponse.json({ message: 'Invalid season id' }, { status: 400 })
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

  await connectMongo()
  const season = await Season.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).lean()
  if (!season) {
    return NextResponse.json({ message: 'Season not found' }, { status: 404 })
  }

  return NextResponse.json({
    season: {
      _id: season._id.toString(),
      title: season.title,
      description: season.description,
      showId: season.showId.toString(),
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
    return NextResponse.json({ message: 'Invalid season id' }, { status: 400 })
  }

  await connectMongo()
  const season = await Season.findByIdAndDelete(id).lean()
  if (!season) {
    return NextResponse.json({ message: 'Season not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
