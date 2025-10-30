import { NextResponse, type NextRequest } from 'next/server'
import { Types } from 'mongoose'
import { z } from 'zod'
import { connectMongo } from '@/lib/server/mongodb'
import { Show } from '@/lib/server/models/Show'
import { authenticateRequest } from '@/lib/server/auth'
import { cacheDel } from '@/lib/server/cache'

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  seasons: z.number().int().min(0).optional(),
  reels: z.number().int().min(0).optional(),
  featured: z.boolean().optional(),
  description: z.string().optional(),
  thumbnail: z.string().url().optional().or(z.literal('')),
  heroImage: z.string().url().optional().or(z.literal('')),
})

const CACHE_KEY = 'shows:list'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  const { id } = params
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid show id' }, { status: 400 })
  }

  await connectMongo()
  const show = await Show.findById(id).lean()
  if (!show) {
    return NextResponse.json({ message: 'Show not found' }, { status: 404 })
  }

  return NextResponse.json({
    show: {
      _id: show._id.toString(),
      title: show.title,
      seasons: show.seasons,
      reels: show.reels,
      featured: show.featured,
      description: show.description,
      thumbnail: show.thumbnail,
      heroImage: show.heroImage,
      createdAt: show.createdAt,
      updatedAt: show.updatedAt,
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
    return NextResponse.json({ message: 'Invalid show id' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
  }

  const update = parsed.data
  if (update.thumbnail === '') update.thumbnail = undefined
  if (update.heroImage === '') update.heroImage = undefined

  await connectMongo()
  const show = await Show.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).lean()
  if (!show) {
    return NextResponse.json({ message: 'Show not found' }, { status: 404 })
  }

  await cacheDel(CACHE_KEY)

  return NextResponse.json({
    show: {
      _id: show._id.toString(),
      title: show.title,
      seasons: show.seasons,
      reels: show.reels,
      featured: show.featured,
      description: show.description,
      thumbnail: show.thumbnail,
      heroImage: show.heroImage,
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
    return NextResponse.json({ message: 'Invalid show id' }, { status: 400 })
  }

  await connectMongo()
  const show = await Show.findByIdAndDelete(id).lean()
  if (!show) {
    return NextResponse.json({ message: 'Show not found' }, { status: 404 })
  }

  await cacheDel(CACHE_KEY)

  return NextResponse.json({ success: true })
}
