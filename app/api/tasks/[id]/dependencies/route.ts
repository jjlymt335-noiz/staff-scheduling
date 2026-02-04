import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 检测循环依赖
async function wouldCreateCycle(taskId: string, predecessorId: string): Promise<boolean> {
  const visited = new Set<string>()
  const queue = [taskId]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (current === predecessorId) return true
    if (visited.has(current)) continue
    visited.add(current)

    const successors = await prisma.taskDependency.findMany({
      where: { predecessorId: current },
      select: { successorId: true }
    })
    queue.push(...successors.map(s => s.successorId))
  }

  return false
}

// GET /api/tasks/[id]/dependencies - 获取任务的前置依赖
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const dependencies = await prisma.taskDependency.findMany({
      where: { successorId: id },
      include: {
        predecessor: {
          include: {
            user: { select: { id: true, name: true, role: true } },
            requirement: { select: { id: true, title: true, code: true } }
          }
        }
      }
    })

    return NextResponse.json(dependencies.map(d => d.predecessor))
  } catch (error) {
    console.error('Error fetching dependencies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dependencies' },
      { status: 500 }
    )
  }
}

// POST /api/tasks/[id]/dependencies - 添加前置依赖
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { predecessorId } = body

    if (!predecessorId) {
      return NextResponse.json(
        { error: '前置任务ID为必填项' },
        { status: 400 }
      )
    }

    // 检查任务是否存在
    const [task, predecessor] = await Promise.all([
      prisma.task.findUnique({ where: { id } }),
      prisma.task.findUnique({ where: { id: predecessorId } })
    ])

    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }

    if (!predecessor) {
      return NextResponse.json({ error: '前置任务不存在' }, { status: 404 })
    }

    // 检查是否自引用
    if (id === predecessorId) {
      return NextResponse.json(
        { error: '任务不能依赖自身' },
        { status: 400 }
      )
    }

    // 检查是否会形成循环依赖
    if (await wouldCreateCycle(id, predecessorId)) {
      return NextResponse.json(
        { error: '添加此依赖会形成循环依赖' },
        { status: 400 }
      )
    }

    // 检查是否已存在
    const existing = await prisma.taskDependency.findUnique({
      where: {
        predecessorId_successorId: {
          predecessorId,
          successorId: id
        }
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: '此前置任务已添加' },
        { status: 400 }
      )
    }

    // 创建依赖关系
    const dependency = await prisma.taskDependency.create({
      data: {
        predecessorId,
        successorId: id
      },
      include: {
        predecessor: {
          include: {
            user: { select: { id: true, name: true } }
          }
        }
      }
    })

    return NextResponse.json(dependency.predecessor, { status: 201 })
  } catch (error) {
    console.error('Error adding dependency:', error)
    return NextResponse.json(
      { error: 'Failed to add dependency' },
      { status: 500 }
    )
  }
}

// DELETE /api/tasks/[id]/dependencies - 删除前置依赖
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const predecessorId = searchParams.get('predecessorId')

    if (!predecessorId) {
      return NextResponse.json(
        { error: '前置任务ID为必填项' },
        { status: 400 }
      )
    }

    await prisma.taskDependency.delete({
      where: {
        predecessorId_successorId: {
          predecessorId,
          successorId: id
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting dependency:', error)
    return NextResponse.json(
      { error: 'Failed to delete dependency' },
      { status: 500 }
    )
  }
}
