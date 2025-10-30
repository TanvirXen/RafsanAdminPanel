import { NextResponse, type NextRequest } from 'next/server'
import { Types } from 'mongoose'
import { z } from 'zod'
import { connectMongo } from '@/lib/server/mongodb'
import { Episode, Show, Season } from '@/lib/server/models/Show'
import { authenticateRequest } from '@/lib/server/auth'

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  showId: z.string().optional(),
  seasonId: z.string().optional(),
  thumbnail: z.string().url().optional().or(z.literal('')),
  link: z.string().optional(),
  featured: z.boolean().optional(),
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  const { id } = params
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid episode id' }, { status: 400 })
  }

  await connectMongo()
  const episode = await Episode.findById(id).lean()
  if (!episode) {
    return NextResponse.json({ message: 'Episode not found' }, { status: 404 })
  }

  const [show, season] = await Promise.all([
    Show.findById(episode.showId).lean(),
    Season.findById(episode.seasonId).lean(),
  ])

  return NextResponse.json({
    episode: {
      _id: episode._id.toString(),
      title: episode.title,
      showId: episode.showId.toString(),
      showTitle: show?.title,
      seasonId: episode.seasonId.toString(),
      seasonTitle: season?.title,
      thumbnail: episode.thumbnail,
      link: episode.link,
      featured: episode.featured,
      createdAt: episode.createdAt,
      updatedAt: episode.updatedAt,
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
    return NextResponse.json({ message: 'Invalid episode id' }, { status: 400 })
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
  if (update.seasonId) {
    if (!Types.ObjectId.isValid(update.seasonId)) {
      return NextResponse.json({ message: 'Invalid season id' }, { status: 400 })
    }
    update.seasonId = new Types.ObjectId(update.seasonId)
  }
  if (update.thumbnail === '') update.thumbnail = undefined

  await connectMongo()
  const episode = await Episode.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).lean()
  if (!episode) {
    return NextResponse.json({ message: 'Episode not found' }, { status: 404 })
  }

  return NextResponse.json({
    episode: {
      _id: episode._id.toString(),
      title: episode.title,
      showId: episode.showId.toString(),
      seasonId: episode.seasonId.toString(),
      thumbnail: episode.thumbnail,
      link: episode.link,
      featured: episode.featured,
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
    return NextResponse.json({ message: 'Invalid episode id' }, { status: 400 })
  }

  await connectMongo()
  const episode = await Episode.findByIdAndDelete(id).lean()
  if (!episode) {
    return NextResponse.json({ message: 'Episode not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
