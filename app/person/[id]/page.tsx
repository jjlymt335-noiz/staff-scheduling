'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDateBeijing, getBeijingToday, isBeijingToday } from '@/lib/timezone'

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
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(new Date()))

  const roleLabels: Record<string, string> = {
    MANAGEMENT: '管理',
    FRONTEND: '前端',
    BACKEND: '后端',
    PRODUCT: '产品',
    OPERATIONS: '运营',
    STRATEGY: '战略',
  }

  // 获取一周的开始日期（周一）
  function getWeekStart(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    d.setHours(0, 0, 0, 0)
    return d
  }

  // 获取一周的7天日期数组
  const getWeekDays = (weekStart: Date): Date[] => {
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart)
      day.setDate(weekStart.getDate() + i)
      days.push(day)
    }
    return days
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

  const weekDays = getWeekDays(currentWeekStart)

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
    const startStr = toDateStr(weekDays[0])
    const endStr = toDateStr(weekDays[6])

    const taskStart = task.planStartDate.split('T')[0]
    const taskEnd = task.planEndDate.split('T')[0]

    // 如果任务完全不在显示范围内
    if (taskEnd < startStr || taskStart > endStr) {
      return null
    }

    // 计算开始位置
    let startIndex = 0
    for (let i = 0; i < 7; i++) {
      if (toDateStr(weekDays[i]) >= taskStart) {
        startIndex = i
        break
      }
    }

    // 计算结束位置
    let endIndex = 6
    for (let i = 6; i >= 0; i--) {
      if (toDateStr(weekDays[i]) <= taskEnd) {
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
      case 0: return 'bg-[#FF5630]'
      case 1: return 'bg-[#FF7452]'
      case 2: return 'bg-[#FFAB00]'
      case 3: return 'bg-[#36B37E]'
      case 4: return 'bg-[#00B8D9]'
      default: return 'bg-[#6554C0]'
    }
  }

  // 切换周
  const changeWeek = (offset: number) => {
    const newDate = new Date(currentWeekStart)
    newDate.setDate(newDate.getDate() + (offset * 7))
    setCurrentWeekStart(newDate)
  }

  // 获取周日期范围显示
  const weekEndDate = new Date(currentWeekStart)
  weekEndDate.setDate(weekEndDate.getDate() + 6)
  const weekLabel = `${currentWeekStart.getMonth() + 1}月${currentWeekStart.getDate()}日 - ${weekEndDate.getMonth() + 1}月${weekEndDate.getDate()}日`

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

  const weekDayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

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
          <h2 className="text-lg font-semibold text-[var(--ds-text-primary)]">
            任务路线图 <span className="text-base font-normal text-[var(--ds-text-secondary)]">- {weekLabel}</span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeWeek(-1)}
              className="px-3 py-1.5 text-[var(--ds-font-size-sm)] border border-[var(--ds-border-default)] rounded-[var(--ds-radius-md)] hover:bg-[var(--ds-bg-hover)] transition-colors"
            >
              ← 上周
            </button>
            <button
              onClick={() => setCurrentWeekStart(getWeekStart(new Date()))}
              className="px-3 py-1.5 text-[var(--ds-font-size-sm)] bg-[var(--ds-brand-primary)] text-white rounded-[var(--ds-radius-md)] hover:bg-[var(--ds-brand-primary-hover)] transition-colors"
            >
              本周
            </button>
            <button
              onClick={() => changeWeek(1)}
              className="px-3 py-1.5 text-[var(--ds-font-size-sm)] border border-[var(--ds-border-default)] rounded-[var(--ds-radius-md)] hover:bg-[var(--ds-bg-hover)] transition-colors"
            >
              下周 →
            </button>
            <Link
              href="/manage"
              className="ml-4 text-[var(--ds-text-link)] hover:underline text-[var(--ds-font-size-sm)]"
            >
              添加任务
            </Link>
          </div>
        </div>

        {sortedTasks.length === 0 ? (
          <div className="p-8 text-center text-[var(--ds-text-disabled)]">
            暂无任务
          </div>
        ) : (
          <div>
            {/* 日期头部 */}
            <div className="flex border-b border-[var(--ds-border-default)]">
              {/* 任务名称列 */}
              <div className="w-[280px] flex-shrink-0 px-4 py-2 bg-[var(--ds-bg-hover)] border-r border-[var(--ds-border-default)]">
                <div className="text-[var(--ds-font-size-xs)] font-semibold text-[var(--ds-text-secondary)] uppercase">
                  任务
                </div>
              </div>

              {/* 日期列 */}
              {weekDays.map((day, index) => {
                const isToday = isBeijingToday(day)
                const isWeekend = index >= 5

                return (
                  <div
                    key={index}
                    className={`flex-1 text-center py-2 border-r border-[var(--ds-border-default)] last:border-r-0 ${
                      isToday
                        ? 'bg-[var(--ds-brand-primary)]'
                        : isWeekend
                          ? 'bg-[var(--ds-bg-page)]'
                          : 'bg-[var(--ds-bg-hover)]'
                    }`}
                  >
                    <div className={`font-semibold text-[var(--ds-font-size-sm)] ${isToday ? 'text-white' : isWeekend ? 'text-[var(--ds-text-disabled)]' : 'text-[var(--ds-text-secondary)]'}`}>
                      {weekDayNames[index]}
                    </div>
                    <div className={`text-[var(--ds-font-size-xs)] ${isToday ? 'text-white/80' : ''}`}>
                      {day.getMonth() + 1}/{day.getDate()}
                    </div>
                  </div>
                )
              })}
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
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${getPriorityColor(task.priority)}`}>
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
                    {weekDays.map((day, index) => {
                      const isToday = isBeijingToday(day)
                      const isWeekend = index >= 5

                      return (
                        <div
                          key={index}
                          className={`flex-1 min-h-[48px] border-r border-[var(--ds-border-default)] last:border-r-0 ${
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
                        className={`absolute top-2.5 h-[28px] rounded-[var(--ds-radius-sm)] ${getPriorityColor(task.priority)} shadow-sm flex items-center px-2 cursor-pointer hover:opacity-90 transition-opacity`}
                        style={{
                          left: `calc(${(position.startIndex / 7) * 100}%)`,
                          width: `calc(${(position.width / 7) * 100}%)`,
                        }}
                        title={`${task.code ? `[${task.code}] ` : ''}${formatTaskTitle(task)}\n${formatDateBeijing(task.planStartDate)} - ${formatDateBeijing(task.planEndDate)}`}
                        onClick={() => router.push(`/task/${task.id}`)}
                      >
                        <span className="text-[var(--ds-font-size-xs)] font-medium truncate text-white">
                          {task.code ? `${task.code} ` : ''}{formatTaskTitle(task)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
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
