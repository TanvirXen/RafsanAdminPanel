import { NextResponse, type NextRequest } from 'next/server'
import { Types } from 'mongoose'
import { z } from 'zod'
import { connectMongo } from '@/lib/server/mongodb'
import { TimelineItem } from '@/lib/server/models/TimelineItem'
import { authenticateRequest } from '@/lib/server/auth'
import { cacheDel } from '@/lib/server/cache'

const updateSchema = z.object({
  date: z.string().optional(),
  imageLink: z.string().url().optional(),
  description: z.string().optional(),
  cardUrl: z.string().optional().or(z.literal('')),
})

const CACHE_KEY = 'timeline:list'

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
  const item = await TimelineItem.findById(id).lean()
  if (!item) {
    return NextResponse.json({ message: 'Timeline item not found' }, { status: 404 })
  }

  return NextResponse.json({
    item: {
      _id: item._id.toString(),
      date: item.date.toISOString(),
      imageLink: item.imageLink,
      description: item.description,
      cardUrl: item.cardUrl,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
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
  if (update.date) update.date = new Date(update.date)
  if (update.cardUrl === '') update.cardUrl = undefined

  await connectMongo()
  const item = await TimelineItem.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).lean()
  if (!item) {
    return NextResponse.json({ message: 'Timeline item not found' }, { status: 404 })
  }

  await cacheDel(CACHE_KEY)

  return NextResponse.json({
    item: {
      _id: item._id.toString(),
      date: item.date.toISOString(),
      imageLink: item.imageLink,
      description: item.description,
      cardUrl: item.cardUrl,
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
  const item = await TimelineItem.findByIdAndDelete(id).lean()
  if (!item) {
    return NextResponse.json({ message: 'Timeline item not found' }, { status: 404 })
  }

  await cacheDel(CACHE_KEY)

  return NextResponse.json({ success: true })
}
