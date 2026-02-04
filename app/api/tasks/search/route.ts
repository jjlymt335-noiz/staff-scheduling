import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/tasks/search?q=keyword - 搜索任务（按名称或编号）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const excludeId = searchParams.get('excludeId') // 排除指定任务（用于防止自引用）

    if (!query.trim()) {
      return NextResponse.json([])
    }

    const tasks = await prisma.task.findMany({
      where: {
        AND: [
          {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { code: { contains: query, mode: 'insensitive' } }
            ]
          },
          excludeId ? { id: { not: excludeId } } : {}
        ]
      },
      include: {
        user: {
          select: { id: true, name: true, role: true }
        },
        requirement: {
          select: { id: true, title: true, code: true }
        }
      },
      orderBy: [
        { code: 'asc' }
      ],
      take: 20  // 限制返回数量
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Error searching tasks:', error)
    return NextResponse.json(
      { error: 'Failed to search tasks' },
      { status: 500 }
    )
  }
}
