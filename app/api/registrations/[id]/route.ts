import { NextResponse, type NextRequest } from 'next/server'
import { Types } from 'mongoose'
import { z } from 'zod'
import { connectMongo } from '@/lib/server/mongodb'
import { Registration } from '@/lib/server/models/Registration'
import { authenticateRequest } from '@/lib/server/auth'

const updateSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  fields: z.record(z.any()).optional(),
  notes: z.string().optional(),
  paid: z.boolean().optional(),
  amount: z.number().optional(),
  paymentId: z.string().optional().or(z.literal('')),
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  const { id } = params
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid registration id' }, { status: 400 })
  }

  await connectMongo()
  const registration = await Registration.findById(id).lean()
  if (!registration) {
    return NextResponse.json({ message: 'Registration not found' }, { status: 404 })
  }

  return NextResponse.json({
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
      createdAt: registration.createdAt,
      updatedAt: registration.updatedAt,
    },
  })
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  const { id } = params
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid registration id' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
  }

  const update: Record<string, any> = { ...parsed.data }
  if (update.paymentId === '') update.paymentId = undefined

  await connectMongo()
  const registration = await Registration.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true, runValidators: true },
  ).lean()

  if (!registration) {
    return NextResponse.json({ message: 'Registration not found' }, { status: 404 })
  }

  return NextResponse.json({
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
  })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  const { id } = params
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid registration id' }, { status: 400 })
  }

  await connectMongo()
  const registration = await Registration.findByIdAndDelete(id).lean()
  if (!registration) {
    return NextResponse.json({ message: 'Registration not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
