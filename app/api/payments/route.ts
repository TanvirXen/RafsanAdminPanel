import { NextResponse, type NextRequest } from 'next/server'
import { Types } from 'mongoose'
import { z } from 'zod'
import { connectMongo } from '@/lib/server/mongodb'
import { Payment } from '@/lib/server/models/Payment'
import { Registration } from '@/lib/server/models/Registration'
import { Event } from '@/lib/server/models/Event'
import { authenticateRequest } from '@/lib/server/auth'

const paymentSchema = z.object({
  registrationId: z.string().min(1),
  eventId: z.string().min(1),
  amount: z.number().min(0),
  currency: z.string().min(1).default('USD'),
  fields: z.record(z.any()),
  processedAt: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const eventId = searchParams.get('eventId')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const filter: Record<string, any> = {}

  if (eventId && Types.ObjectId.isValid(eventId)) {
    filter.eventId = new Types.ObjectId(eventId)
  }

  if (from || to) {
    filter.processedAt = {}
    if (from) filter.processedAt.$gte = new Date(from)
    if (to) filter.processedAt.$lte = new Date(to)
  }

  await connectMongo()
  const payments = await Payment.find(filter).sort({ processedAt: -1 }).lean()

  return NextResponse.json({
    payments: payments.map((payment) => ({
      _id: payment._id.toString(),
      registrationId: payment.registrationId.toString(),
      eventId: payment.eventId.toString(),
      eventTitle: payment.eventTitle,
      amount: payment.amount,
      currency: payment.currency,
      fields: payment.fields,
      processedAt: payment.processedAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    })),
  })
}

export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = paymentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
  }

  if (!Types.ObjectId.isValid(parsed.data.registrationId) || !Types.ObjectId.isValid(parsed.data.eventId)) {
    return NextResponse.json({ message: 'Invalid registration or event id' }, { status: 400 })
  }

  await connectMongo()

  const [registration, event] = await Promise.all([
    Registration.findById(parsed.data.registrationId).lean(),
    Event.findById(parsed.data.eventId).lean(),
  ])

  const payment = await Payment.create({
    registrationId: new Types.ObjectId(parsed.data.registrationId),
    eventId: new Types.ObjectId(parsed.data.eventId),
    eventTitle: event?.title ?? registration?.eventTitle,
    amount: parsed.data.amount,
    currency: parsed.data.currency ?? 'USD',
    fields: parsed.data.fields,
    processedAt: parsed.data.processedAt ? new Date(parsed.data.processedAt) : new Date(),
  })

  if (registration) {
    await Registration.findByIdAndUpdate(registration._id, {
      $set: {
        paid: true,
        amount: parsed.data.amount,
        paymentId: payment._id.toString(),
      },
    })
  }

  return NextResponse.json(
    {
      payment: {
        _id: payment._id.toString(),
        registrationId: payment.registrationId.toString(),
        eventId: payment.eventId.toString(),
        eventTitle: payment.eventTitle,
        amount: payment.amount,
        currency: payment.currency,
        fields: payment.fields,
        processedAt: payment.processedAt,
      },
    },
    { status: 201 },
  )
}
