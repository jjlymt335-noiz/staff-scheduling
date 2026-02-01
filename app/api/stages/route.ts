import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/stages?requirementId=xxx - 获取某需求的所有阶段
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const requirementId = searchParams.get('requirementId')

    if (!requirementId) {
      return NextResponse.json({ error: 'requirementId is required' }, { status: 400 })
    }

    const stages = await prisma.stage.findMany({
      where: { requirementId },
      include: {
        assignments: {
          include: { user: true }
        }
      },
      orderBy: { order: 'asc' }
    })

    return NextResponse.json(stages)
  } catch (error) {
    console.error('Error fetching stages:', error)
    return NextResponse.json({ error: 'Failed to fetch stages' }, { status: 500 })
  }
}

// POST /api/stages - 创建新阶段
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, order, requirementId, startDate, endDate, status, description, deliverables, userIds } = body

    if (!name || order === undefined || !requirementId) {
      return NextResponse.json({ error: 'Name, order, and requirementId are required' }, { status: 400 })
    }

    const validStatuses = ['PENDING', 'IN_PROGRESS', 'DONE']
    const finalStatus = status || 'PENDING'
    if (!validStatuses.includes(finalStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const stage = await prisma.stage.create({
      data: {
        name,
        order,
        requirementId,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: finalStatus,
        description,
        deliverables
      }
    })

    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      await prisma.stageAssignment.createMany({
        data: userIds.map((userId: string) => ({
          stageId: stage.id,
          userId
        }))
      })
    }

    const fullStage = await prisma.stage.findUnique({
      where: { id: stage.id },
      include: {
        assignments: {
          include: { user: true }
        }
      }
    })

    return NextResponse.json(fullStage, { status: 201 })
  } catch (error) {
    console.error('Error creating stage:', error)
    return NextResponse.json({ error: 'Failed to create stage' }, { status: 500 })
  }
}
