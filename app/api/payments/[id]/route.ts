import { NextResponse, type NextRequest } from 'next/server'
import { Types } from 'mongoose'
import { connectMongo } from '@/lib/server/mongodb'
import { Payment } from '@/lib/server/models/Payment'
import { authenticateRequest } from '@/lib/server/auth'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  const { id } = params
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid payment id' }, { status: 400 })
  }

  await connectMongo()
  const payment = await Payment.findById(id).lean()
  if (!payment) {
    return NextResponse.json({ message: 'Payment not found' }, { status: 404 })
  }

  return NextResponse.json({
    payment: {
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
    return NextResponse.json({ message: 'Invalid payment id' }, { status: 400 })
  }

  await connectMongo()
  const payment = await Payment.findByIdAndDelete(id).lean()
  if (!payment) {
    return NextResponse.json({ message: 'Payment not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
