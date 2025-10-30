import { NextResponse, type NextRequest } from 'next/server'
import { Types } from 'mongoose'
import { z } from 'zod'
import { connectMongo } from '@/lib/server/mongodb'
import { NotableEvent } from '@/lib/server/models/NotableEvent'
import { authenticateRequest } from '@/lib/server/auth'
import { cacheDel } from '@/lib/server/cache'

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  date: z.string().optional(),
  imageLink: z.string().url().optional(),
  description: z.string().optional(),
  featured: z.boolean().optional(),
})

const CACHE_KEY = 'notable-events:list'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  const { id } = params
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid id' }, { status: 400 })
  }

  await connectMongo()
  const event = await NotableEvent.findById(id).lean()
  if (!event) {
    return NextResponse.json({ message: 'Notable event not found' }, { status: 404 })
  }

  return NextResponse.json({
    event: {
      _id: event._id.toString(),
      title: event.title,
      date: event.date.toISOString(),
      imageLink: event.imageLink,
      description: event.description,
      featured: event.featured,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
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
    return NextResponse.json({ message: 'Invalid id' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
  }

  const update: Record<string, any> = { ...parsed.data }
  if (update.date) {
    update.date = new Date(update.date)
  }

  await connectMongo()
  const event = await NotableEvent.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).lean()
  if (!event) {
    return NextResponse.json({ message: 'Notable event not found' }, { status: 404 })
  }

  await cacheDel(CACHE_KEY)

  return NextResponse.json({
    event: {
      _id: event._id.toString(),
      title: event.title,
      date: event.date.toISOString(),
      imageLink: event.imageLink,
      description: event.description,
      featured: event.featured,
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
    return NextResponse.json({ message: 'Invalid id' }, { status: 400 })
  }

  await connectMongo()
  const event = await NotableEvent.findByIdAndDelete(id).lean()
  if (!event) {
    return NextResponse.json({ message: 'Notable event not found' }, { status: 404 })
  }

  await cacheDel(CACHE_KEY)

  return NextResponse.json({ success: true })
}
