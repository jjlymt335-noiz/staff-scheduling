import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/brainstorm - 获取所有头脑风暴项
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    const where = userId ? { userId } : {}

    const items = await prisma.brainstormItem.findMany({
      where,
      orderBy: { priority: 'asc' },
      include: {
        user: true,
      },
    })
    return NextResponse.json(items)
  } catch (error) {
    console.error('Error fetching brainstorm items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch brainstorm items' },
      { status: 500 }
    )
  }
}

// POST /api/brainstorm - 创建新头脑风暴项
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, title, type, priority, planStartDate, planEndDate } = body

    if (!title || !type || priority === undefined) {
      return NextResponse.json(
        { error: 'Title, type, and priority are required' },
        { status: 400 }
      )
    }

    // 验证优先级范围
    if (priority < 0 || priority > 5) {
      return NextResponse.json(
        { error: 'Priority must be between 0 and 5' },
        { status: 400 }
      )
    }

    if (!['REQUIREMENT', 'TASK'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid brainstorm type' },
        { status: 400 }
      )
    }

    const item = await prisma.brainstormItem.create({
      data: {
        userId: userId || null,
        title,
        type,
        priority,
        planStartDate: planStartDate ? new Date(planStartDate) : null,
        planEndDate: planEndDate ? new Date(planEndDate) : null,
      },
      include: {
        user: true,
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Error creating brainstorm item:', error)
    return NextResponse.json(
      { error: 'Failed to create brainstorm item' },
      { status: 500 }
    )
  }
}

// DELETE /api/brainstorm?id=xxx - 删除头脑风暴项
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    await prisma.brainstormItem.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Deleted successfully' })
  } catch (error) {
    console.error('Error deleting brainstorm item:', error)
    return NextResponse.json(
      { error: 'Failed to delete brainstorm item' },
      { status: 500 }
    )
  }
}
