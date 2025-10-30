import { NextResponse, type NextRequest } from 'next/server'
import { Types } from 'mongoose'
import { z } from 'zod'
import { connectMongo } from '@/lib/server/mongodb'
import { Registration } from '@/lib/server/models/Registration'
import { Event } from '@/lib/server/models/Event'
import { authenticateRequest } from '@/lib/server/auth'

const registrationSchema = z.object({
  eventId: z.string().min(1),
  eventTitle: z.string().optional(),
  eventType: z.string().optional(),
  eventDate: z.string().optional(),
  fields: z.record(z.string(), z.any()),
  paid: z.boolean().default(false),
  amount: z.number().optional(),
  paymentId: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  notes: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const filter: Record<string, any> = {}

  const status = searchParams.get('status')
  const eventId = searchParams.get('eventId')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    filter.status = status
  }

  if (eventId && Types.ObjectId.isValid(eventId)) {
    filter.eventId = new Types.ObjectId(eventId)
  }

  if (from || to) {
    filter.createdAt = {}
    if (from) filter.createdAt.$gte = new Date(from)
    if (to) filter.createdAt.$lte = new Date(to)
  }

  await connectMongo()
  const registrations = await Registration.find(filter).sort({ createdAt: -1 }).lean()

  return NextResponse.json({
    registrations: registrations.map((registration) => ({
      _id: registration._id.toString(),
      eventId: registration.eventId.toString(),
      eventTitle: registration.eventTitle,
      eventType: registration.eventType,
      eventDate: registration.eventDate?.toISOString(),
      fields: registration.fields,
      paid: registration.paid,
      amount: registration.amount,
      paymentId: registration.paymentId,
      status: registration.status,
      notes: registration.notes,
      createdAt: registration.createdAt,
      updatedAt: registration.updatedAt,
    })),
  })
}

export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = registrationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
  }

  if (!Types.ObjectId.isValid(parsed.data.eventId)) {
    return NextResponse.json({ message: 'Invalid event id' }, { status: 400 })
  }

  await connectMongo()
  const event =
    parsed.data.eventTitle && parsed.data.eventType
      ? null
      : await Event.findById(parsed.data.eventId).lean()

  const registration = await Registration.create({
    eventId: new Types.ObjectId(parsed.data.eventId),
    eventTitle: parsed.data.eventTitle ?? event?.title,
    eventType: parsed.data.eventType ?? event?.type,
    eventDate: parsed.data.eventDate ? new Date(parsed.data.eventDate) : event?.date?.[0],
    fields: parsed.data.fields,
    paid: parsed.data.paid,
    amount: parsed.data.amount,
    paymentId: parsed.data.paymentId,
    status: parsed.data.status ?? 'pending',
    notes: parsed.data.notes,
  })

  return NextResponse.json(
    {
      registration: {
        _id: registration._id.toString(),
        eventId: registration.eventId.toString(),
        eventTitle: registration.eventTitle,
        eventType: registration.eventType,
        eventDate: registration.eventDate?.toISOString(),
        fields: registration.fields,
        paid: registration.paid,
        amount: registration.amount,
        paymentId: registration.paymentId,
        status: registration.status,
        notes: registration.notes,
      },
    },
    { status: 201 },
  )
}
