'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDateBeijing, getBeijingToday } from '@/lib/timezone'

interface User {
  id: string
  name: string
  role: string
}

interface Task {
  id: string
  code?: string
  title: string
  type: string
  priority: number
  userId: string
  planStartDate: string
  planEndDate: string
  forecastEndDate: string | null
  actualEndDate: string | null
  status: string
  requirement: {
    code?: string
    title: string
  } | null
}

export default function PersonPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string

  const [user, setUser] = useState<User | null>(null)
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const roleLabels: Record<string, string> = {
    MANAGEMENT: '管理',
    FRONTEND: '前端',
    BACKEND: '后端',
    PRODUCT: '产品',
    OPERATIONS: '运营',
    STRATEGY: '战略',
  }

  useEffect(() => {
    fetchData()
  }, [userId])

  const fetchData = async () => {
    try {
      const [usersRes, tasksRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/tasks'),
      ])

      const users = await usersRes.json()
      const tasks = await tasksRes.json()

      const currentUser = users.find((u: User) => u.id === userId)
      if (!currentUser) {
        router.push('/team')
        return
      }

      setUser(currentUser)
      setAllTasks(tasks.filter((t: Task) => t.userId === userId))
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  // 计算甘特图的日期范围
  const { dateRange, todayIndex } = useMemo(() => {
    const today = getBeijingToday()
    const dates: Date[] = []

    // 显示从今天开始的4周（28天）
    for (let i = -7; i < 21; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      dates.push(d)
    }

    return {
      dateRange: dates,
      todayIndex: 7 // 今天在数组中的索引
    }
  }, [])

  // 格式化日期为 YYYY-MM-DD
  const toDateStr = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  // 按优先级排序任务（优先级数字小的排前面）
  const sortedTasks = useMemo(() => {
    return [...allTasks].sort((a, b) => a.priority - b.priority)
  }, [allTasks])

  // 计算任务在甘特图中的位置和宽度
  const getTaskPosition = (task: Task) => {
    const startStr = toDateStr(dateRange[0])
    const endStr = toDateStr(dateRange[dateRange.length - 1])

    const taskStart = task.planStartDate.split('T')[0]
    const taskEnd = task.planEndDate.split('T')[0]

    // 如果任务完全不在显示范围内
    if (taskEnd < startStr || taskStart > endStr) {
      return null
    }

    // 计算开始位置
    let startIndex = 0
    for (let i = 0; i < dateRange.length; i++) {
      if (toDateStr(dateRange[i]) >= taskStart) {
        startIndex = i
        break
      }
    }

    // 计算结束位置
    let endIndex = dateRange.length - 1
    for (let i = dateRange.length - 1; i >= 0; i--) {
      if (toDateStr(dateRange[i]) <= taskEnd) {
        endIndex = i
        break
      }
    }

    // 确保至少显示1个单位宽度
    if (startIndex > endIndex) {
      startIndex = endIndex
    }

    return {
      startIndex,
      endIndex,
      width: endIndex - startIndex + 1
    }
  }

  // 格式化任务标题
  const formatTaskTitle = (task: Task) => {
    if (task.type === 'IN_REQUIREMENT' && task.requirement) {
      return task.title
    }
    return task.title
  }

  // 获取优先级颜色
  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 0: return 'bg-[#FF5630]' // 最高 - 红色
      case 1: return 'bg-[#FF7452]' // 高 - 橙红
      case 2: return 'bg-[#FFAB00]' // 中 - 橙色
      case 3: return 'bg-[#36B37E]' // 低 - 绿色
      case 4: return 'bg-[#00B8D9]' // 较低 - 青色
      default: return 'bg-[#6554C0]' // 最低 - 紫色
    }
  }

  // 获取优先级文字颜色
  const getPriorityTextColor = (priority: number) => {
    if (priority <= 2) return 'text-white'
    return 'text-white'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--ds-text-secondary)]">加载中...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // 计算周信息
  const getWeekInfo = (date: Date) => {
    const dayOfWeek = date.getDay()
    return dayOfWeek === 0 || dayOfWeek === 6
  }

  return (
    <div>
      {/* 返回链接 */}
      <div className="mb-4">
        <Link href="/team" className="text-[var(--ds-text-link)] hover:underline text-[var(--ds-font-size-sm)]">
          ← 返回团队视图
        </Link>
      </div>

      {/* 用户信息卡片 */}
      <div className="bg-[var(--ds-bg-card)] rounded-[var(--ds-radius-lg)] shadow-[var(--ds-shadow-card)] p-6 mb-6">
        <h1 className="text-2xl font-bold text-[var(--ds-text-primary)]">
          {user.name}
          <span className="ml-3 text-lg font-normal text-[var(--ds-text-secondary)]">
            {roleLabels[user.role]}
          </span>
        </h1>
      </div>

      {/* 甘特图 */}
      <div className="bg-[var(--ds-bg-card)] rounded-[var(--ds-radius-lg)] shadow-[var(--ds-shadow-card)] overflow-hidden">
        {/* 标题栏 */}
        <div className="px-4 py-3 border-b border-[var(--ds-border-default)] flex justify-between items-center">
          <h2 className="text-lg font-semibold text-[var(--ds-text-primary)]">任务路线图</h2>
          <Link
            href="/manage"
            className="text-[var(--ds-text-link)] hover:underline text-[var(--ds-font-size-sm)]"
          >
            添加任务
          </Link>
        </div>

        {sortedTasks.length === 0 ? (
          <div className="p-8 text-center text-[var(--ds-text-disabled)]">
            暂无任务
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[1200px]">
              {/* 日期头部 */}
              <div className="flex border-b border-[var(--ds-border-default)]">
                {/* 任务名称列 */}
                <div className="w-[280px] flex-shrink-0 px-4 py-2 bg-[var(--ds-bg-hover)] border-r border-[var(--ds-border-default)]">
                  <div className="text-[var(--ds-font-size-xs)] font-semibold text-[var(--ds-text-secondary)] uppercase">
                    任务
                  </div>
                </div>

                {/* 日期列 */}
                <div className="flex-1 flex">
                  {dateRange.map((date, index) => {
                    const isToday = index === todayIndex
                    const isWeekend = getWeekInfo(date)
                    const isFirstOfMonth = date.getDate() === 1

                    return (
                      <div
                        key={index}
                        className={`flex-1 min-w-[32px] text-center py-2 border-r border-[var(--ds-border-default)] last:border-r-0 ${
                          isToday
                            ? 'bg-[var(--ds-brand-primary)]'
                            : isWeekend
                              ? 'bg-[var(--ds-bg-page)]'
                              : 'bg-[var(--ds-bg-hover)]'
                        }`}
                      >
                        {isFirstOfMonth && (
                          <div className={`text-[10px] font-medium ${isToday ? 'text-white' : 'text-[var(--ds-text-secondary)]'}`}>
                            {date.getMonth() + 1}月
                          </div>
                        )}
                        <div className={`text-[var(--ds-font-size-xs)] font-medium ${
                          isToday ? 'text-white' : isWeekend ? 'text-[var(--ds-text-disabled)]' : 'text-[var(--ds-text-secondary)]'
                        }`}>
                          {date.getDate()}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 任务行 */}
              {sortedTasks.map((task) => {
                const position = getTaskPosition(task)

                return (
                  <div
                    key={task.id}
                    className="flex border-b border-[var(--ds-border-default)] last:border-b-0 hover:bg-[var(--ds-bg-hover)]/30 transition-colors"
                  >
                    {/* 任务名称 */}
                    <div className="w-[280px] flex-shrink-0 px-4 py-3 border-r border-[var(--ds-border-default)] flex items-center gap-2">
                      {/* 优先级标签 */}
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getPriorityColor(task.priority)} ${getPriorityTextColor(task.priority)}`}>
                        P{task.priority}
                      </span>

                      {/* 任务编号 */}
                      {task.code && (
                        <span className="text-[var(--ds-font-size-xs)] text-[var(--ds-text-secondary)] font-mono">
                          {task.code}
                        </span>
                      )}

                      {/* 任务标题 */}
                      <Link
                        href={`/task/${task.id}`}
                        className="text-[var(--ds-font-size-sm)] text-[var(--ds-text-primary)] hover:text-[var(--ds-brand-primary)] truncate"
                        title={formatTaskTitle(task)}
                      >
                        {formatTaskTitle(task)}
                      </Link>
                    </div>

                    {/* 甘特条 */}
                    <div className="flex-1 flex relative">
                      {dateRange.map((date, index) => {
                        const isToday = index === todayIndex
                        const isWeekend = getWeekInfo(date)

                        return (
                          <div
                            key={index}
                            className={`flex-1 min-w-[32px] min-h-[44px] border-r border-[var(--ds-border-default)] last:border-r-0 ${
                              isToday
                                ? 'bg-[var(--ds-bg-selected)]'
                                : isWeekend
                                  ? 'bg-[var(--ds-bg-page)]/50'
                                  : ''
                            }`}
                          />
                        )
                      })}

                      {/* 任务条 */}
                      {position && (
                        <div
                          className={`absolute top-2 h-[28px] rounded-[var(--ds-radius-sm)] ${getPriorityColor(task.priority)} shadow-sm flex items-center px-2 cursor-pointer hover:opacity-90 transition-opacity`}
                          style={{
                            left: `calc(${(position.startIndex / dateRange.length) * 100}%)`,
                            width: `calc(${(position.width / dateRange.length) * 100}%)`,
                          }}
                          title={`${task.code ? `[${task.code}] ` : ''}${formatTaskTitle(task)}\n${formatDateBeijing(task.planStartDate)} - ${formatDateBeijing(task.planEndDate)}`}
                          onClick={() => router.push(`/task/${task.id}`)}
                        >
                          <span className={`text-[var(--ds-font-size-xs)] font-medium truncate ${getPriorityTextColor(task.priority)}`}>
                            {task.code ? `${task.code} ` : ''}{formatTaskTitle(task)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 图例 */}
      <div className="mt-4 flex items-center gap-4 text-[var(--ds-font-size-xs)] text-[var(--ds-text-secondary)]">
        <span className="font-medium">优先级：</span>
        <div className="flex items-center gap-1">
          <span className="w-4 h-3 rounded bg-[#FF5630]"></span>
          <span>P0</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-3 rounded bg-[#FF7452]"></span>
          <span>P1</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-3 rounded bg-[#FFAB00]"></span>
          <span>P2</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-3 rounded bg-[#36B37E]"></span>
          <span>P3</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-3 rounded bg-[#00B8D9]"></span>
          <span>P4</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-3 rounded bg-[#6554C0]"></span>
          <span>P5</span>
        </div>
      </div>
    </div>
  )
}
