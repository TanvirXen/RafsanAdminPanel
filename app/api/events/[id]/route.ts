import { NextResponse, type NextRequest } from 'next/server'
import { Types } from 'mongoose'
import { z } from 'zod'
import { connectMongo } from '@/lib/server/mongodb'
import { Event } from '@/lib/server/models/Event'
import { Brand } from '@/lib/server/models/Brand'
import { authenticateRequest } from '@/lib/server/auth'
import { cacheDel } from '@/lib/server/cache'

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  date: z.array(z.string().min(1)).min(1).optional(),
  venue: z.string().min(1).optional(),
  type: z.enum(['Free', 'Free_with_approval', 'Paid', 'Paid_with_approval']).optional(),
  description: z.string().optional(),
  imageLinkBg: z.string().url().optional().or(z.literal('')),
  imageLinkOverlay: z.string().url().optional().or(z.literal('')),
  brands: z.array(z.string()).optional(),
  customFields: z
    .array(
      z.object({
        name: z.string().min(1),
        label: z.string().min(1),
        type: z.enum(['text', 'email', 'phone', 'number', 'select', 'textarea']).default('text'),
        required: z.boolean().default(false),
        options: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  category: z.string().optional(),
})

const CACHE_KEY = 'events:list'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const id = params.id
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid event id' }, { status: 400 })
  }

  await connectMongo()
  const event = await Event.findById(id).lean()
  if (!event) {
    return NextResponse.json({ message: 'Event not found' }, { status: 404 })
  }

  const brandDocs = event.brands?.length
    ? await Brand.find({ _id: { $in: event.brands } }).lean()
    : []

  return NextResponse.json({
    event: {
      _id: event._id.toString(),
      title: event.title,
      date: event.date.map((d) => d.toISOString()),
      venue: event.venue,
      type: event.type,
      description: event.description,
      imageLinkBg: event.imageLinkBg,
      imageLinkOverlay: event.imageLinkOverlay,
      brands: brandDocs.map((brand) => ({
        _id: brand._id.toString(),
        brandName: brand.brandName,
      })),
      brandIds: (event.brands ?? []).map((id) => id.toString()),
      customFields: event.customFields,
      category: event.category,
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

  const id = params.id
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid event id' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
  }

  const updateData = parsed.data
  if (updateData.brands) {
    updateData.brands = updateData.brands
      .filter((brandId) => Types.ObjectId.isValid(brandId))
      .map((brandId) => new Types.ObjectId(brandId))
  }
  if (updateData.date) {
    updateData.date = updateData.date.map((d) => new Date(d))
  }
  if (updateData.imageLinkBg === '') updateData.imageLinkBg = undefined
  if (updateData.imageLinkOverlay === '') updateData.imageLinkOverlay = undefined

  await connectMongo()
  const event = await Event.findByIdAndUpdate(
    id,
    { $set: updateData },
    {
      new: true,
      runValidators: true,
    },
  ).lean()

  if (!event) {
    return NextResponse.json({ message: 'Event not found' }, { status: 404 })
  }

  await cacheDel(CACHE_KEY)

  return NextResponse.json({
    event: {
      _id: event._id.toString(),
      title: event.title,
      date: event.date.map((d) => d.toISOString()),
      venue: event.venue,
      type: event.type,
      description: event.description,
      imageLinkBg: event.imageLinkBg,
      imageLinkOverlay: event.imageLinkOverlay,
      brands: (event.brands ?? []).map((brandId) => brandId.toString()),
      customFields: event.customFields,
      category: event.category,
    },
  })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const id = params.id
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid event id' }, { status: 400 })
  }

  await connectMongo()
  const event = await Event.findByIdAndDelete(id).lean()
  if (!event) {
    return NextResponse.json({ message: 'Event not found' }, { status: 404 })
  }

  await cacheDel(CACHE_KEY)

  return NextResponse.json({ success: true })
}
