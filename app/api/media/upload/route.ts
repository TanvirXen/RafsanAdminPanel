import { NextResponse, type NextRequest } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'
import { nanoid } from 'nanoid'
import { authenticateRequest } from '@/lib/server/auth'
import { optimizeImage } from '@/lib/server/image'
import { buildFileName, getCategoryDir, getRelativePath, removeFile } from '@/lib/server/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const contentType = request.headers.get('content-type') || ''
  if (!contentType.startsWith('multipart/form-data')) {
    return NextResponse.json({ message: 'Expected multipart/form-data' }, { status: 400 })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  const category = (formData.get('category') || 'general').toString()
  const existingPath = formData.get('existingPath')?.toString()

  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'File is required' }, { status: 400 })
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ message: 'Only image uploads are supported' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { data, extension, mimeType } = await optimizeImage(buffer, file.type)

  const uniqueSuffix = nanoid(10)
  const originalName = file.name || `upload.${extension}`
  const filename = buildFileName(originalName, uniqueSuffix)
  const categoryDir = await getCategoryDir(category)
  const absolutePath = path.join(categoryDir, filename)
  await fs.writeFile(absolutePath, data)

  if (existingPath) {
    await removeFile(existingPath)
  }

  const relativePath = getRelativePath(absolutePath)
  const publicPath = relativePath.startsWith('public/')
    ? relativePath.replace(/^public\//, '')
    : relativePath

  return NextResponse.json({
    path: relativePath,
    url: `/${publicPath}`,
    mimeType,
  })
}
