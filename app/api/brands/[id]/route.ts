import { NextResponse, type NextRequest } from 'next/server'
import { Types } from 'mongoose'
import { z } from 'zod'
import { connectMongo } from '@/lib/server/mongodb'
import { Brand } from '@/lib/server/models/Brand'
import { authenticateRequest } from '@/lib/server/auth'
import { cacheDel } from '@/lib/server/cache'

const brandSchema = z.object({
  brandName: z.string().min(1),
  imageLink: z.string().url(),
  externalLink: z.string().url(),
})

const CACHE_KEY = 'brands:all'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  const id = params.id
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid brand id' }, { status: 400 })
  }

  await connectMongo()
  const brand = await Brand.findById(id).lean()
  if (!brand) {
    return NextResponse.json({ message: 'Brand not found' }, { status: 404 })
  }

  return NextResponse.json({
    brand: {
      _id: brand._id.toString(),
      brandName: brand.brandName,
      imageLink: brand.imageLink,
      externalLink: brand.externalLink,
      createdAt: brand.createdAt,
      updatedAt: brand.updatedAt,
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
    return NextResponse.json({ message: 'Invalid brand id' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const parsed = brandSchema.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
  }

  await connectMongo()
  const brand = await Brand.findByIdAndUpdate(
    id,
    { $set: parsed.data },
    {
      new: true,
      runValidators: true,
    },
  ).lean()

  if (!brand) {
    return NextResponse.json({ message: 'Brand not found' }, { status: 404 })
  }

  await cacheDel(CACHE_KEY)

  return NextResponse.json({
    brand: {
      _id: brand._id.toString(),
      brandName: brand.brandName,
      imageLink: brand.imageLink,
      externalLink: brand.externalLink,
      createdAt: brand.createdAt,
      updatedAt: brand.updatedAt,
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
    return NextResponse.json({ message: 'Invalid brand id' }, { status: 400 })
  }

  await connectMongo()
  const brand = await Brand.findByIdAndDelete(id).lean()
  if (!brand) {
    return NextResponse.json({ message: 'Brand not found' }, { status: 404 })
  }

  await cacheDel(CACHE_KEY)

  return NextResponse.json({ success: true })
}
