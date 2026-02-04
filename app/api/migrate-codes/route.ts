import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateCode, CODE_PREFIX } from '@/lib/codeGenerator'

// POST /api/migrate-codes - 为现有数据生成编号
export async function POST() {
  try {
    const results = {
      projects: 0,
      requirements: 0,
      tasks: 0
    }

    // 迁移项目编号
    const projectsWithoutCode = await prisma.project.findMany({
      where: { code: null },
      orderBy: { createdAt: 'asc' }
    })

    for (let i = 0; i < projectsWithoutCode.length; i++) {
      const project = projectsWithoutCode[i]
      // 找到当前最大的seqNumber
      const maxSeq = await prisma.project.findFirst({
        where: { seqNumber: { not: null } },
        orderBy: { seqNumber: 'desc' },
        select: { seqNumber: true }
      })
      const nextSeq = (maxSeq?.seqNumber || 0) + 1

      await prisma.project.update({
        where: { id: project.id },
        data: {
          code: generateCode(CODE_PREFIX.PROJECT, nextSeq),
          seqNumber: nextSeq
        }
      })
      results.projects++
    }

    // 迁移需求编号
    const requirementsWithoutCode = await prisma.requirement.findMany({
      where: { code: null },
      orderBy: { createdAt: 'asc' }
    })

    for (let i = 0; i < requirementsWithoutCode.length; i++) {
      const requirement = requirementsWithoutCode[i]
      const maxSeq = await prisma.requirement.findFirst({
        where: { seqNumber: { not: null } },
        orderBy: { seqNumber: 'desc' },
        select: { seqNumber: true }
      })
      const nextSeq = (maxSeq?.seqNumber || 0) + 1

      await prisma.requirement.update({
        where: { id: requirement.id },
        data: {
          code: generateCode(CODE_PREFIX.REQUIREMENT, nextSeq),
          seqNumber: nextSeq
        }
      })
      results.requirements++
    }

    // 迁移任务编号
    const tasksWithoutCode = await prisma.task.findMany({
      where: { code: null },
      orderBy: { createdAt: 'asc' }
    })

    for (let i = 0; i < tasksWithoutCode.length; i++) {
      const task = tasksWithoutCode[i]
      const maxSeq = await prisma.task.findFirst({
        where: { seqNumber: { not: null } },
        orderBy: { seqNumber: 'desc' },
        select: { seqNumber: true }
      })
      const nextSeq = (maxSeq?.seqNumber || 0) + 1

      await prisma.task.update({
        where: { id: task.id },
        data: {
          code: generateCode(CODE_PREFIX.TASK, nextSeq),
          seqNumber: nextSeq
        }
      })
      results.tasks++
    }

    return NextResponse.json({
      success: true,
      message: '迁移完成',
      migrated: results
    })
  } catch (error) {
    console.error('Error migrating codes:', error)
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    return NextResponse.json(
      { error: `迁移失败: ${errorMessage}` },
      { status: 500 }
    )
  }
}
