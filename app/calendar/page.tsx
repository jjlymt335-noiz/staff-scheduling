'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { getBeijingToday, formatDateBeijing } from '@/lib/timezone'
import { PriorityBadge, CodeBadge } from '@/components/issue'

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
  requirementId?: string | null
  priority: number
  planStartDate: string
  planEndDate: string
  forecastEndDate: string | null
  actualEndDate: string | null
  requirement: {
    id: string
    code?: string
    title: string
  } | null
  user: User
}

// 任务颜色配置
const taskColors = [
  { bg: '#4C9AFF', hover: '#2684FF' }, // 蓝色
  { bg: '#36B37E', hover: '#00875A' }, // 绿色
  { bg: '#FF8B00', hover: '#FF991F' }, // 橙色
  { bg: '#6554C0', hover: '#5243AA' }, // 紫色
  { bg: '#00B8D9', hover: '#00A3BF' }, // 青色
  { bg: '#FF5630', hover: '#DE350B' }, // 红色
]

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [viewStartDate, setViewStartDate] = useState(() => {
    const today = getBeijingToday()
    // 从本周一开始
    const day = today.getDay()
    const diff = day === 0 ? -6 : 1 - day
    today.setDate(today.getDate() + diff)
    return today
  })

  // 显示6周的数据
  const WEEKS_TO_SHOW = 6
  const DAYS_TO_SHOW = WEEKS_TO_SHOW * 7

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [tasksRes, usersRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/users'),
      ])
      const tasksData = await tasksRes.json()
      const usersData = await usersRes.json()
      setTasks(tasksData)
      setUsers(usersData)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  // 生成日期数组
  const dates = useMemo(() => {
    const result: Date[] = []
    for (let i = 0; i < DAYS_TO_SHOW; i++) {
      const date = new Date(viewStartDate)
      date.setDate(viewStartDate.getDate() + i)
      result.push(date)
    }
    return result
  }, [viewStartDate, DAYS_TO_SHOW])

  // 按周分组日期
  const weeks = useMemo(() => {
    const result: { weekStart: Date; days: Date[] }[] = []
    for (let i = 0; i < WEEKS_TO_SHOW; i++) {
      const weekStart = new Date(viewStartDate)
      weekStart.setDate(viewStartDate.getDate() + i * 7)
      const days: Date[] = []
      for (let j = 0; j < 7; j++) {
        const day = new Date(weekStart)
        day.setDate(weekStart.getDate() + j)
        days.push(day)
      }
      result.push({ weekStart, days })
    }
    return result
  }, [viewStartDate, WEEKS_TO_SHOW])

  // 获取日期字符串
  const toDateStr = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  // 计算任务在时间线上的位置和宽度
  const getTaskPosition = (task: Task) => {
    const startStr = toDateStr(viewStartDate)
    const endStr = toDateStr(dates[dates.length - 1])
    const taskStartStr = task.planStartDate.split('T')[0]
    const taskEndStr = task.planEndDate.split('T')[0]

    // 任务不在视图范围内
    if (taskEndStr < startStr || taskStartStr > endStr) {
      return null
    }

    const viewStartTime = viewStartDate.getTime()
    const dayMs = 24 * 60 * 60 * 1000

    // 计算起始位置
    const taskStart = new Date(task.planStartDate)
    taskStart.setHours(0, 0, 0, 0)
    let startOffset = Math.floor((taskStart.getTime() - viewStartTime) / dayMs)
    startOffset = Math.max(0, startOffset)

    // 计算结束位置
    const taskEnd = new Date(task.planEndDate)
    taskEnd.setHours(0, 0, 0, 0)
    let endOffset = Math.floor((taskEnd.getTime() - viewStartTime) / dayMs)
    endOffset = Math.min(DAYS_TO_SHOW - 1, endOffset)

    // 计算宽度（天数）
    const width = endOffset - startOffset + 1

    if (width <= 0) return null

    return { startOffset, width }
  }

  // 判断是否是今天
  const isToday = (date: Date) => {
    const today = getBeijingToday()
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth() &&
           date.getDate() === today.getDate()
  }

  // 计算今天的位置
  const todayOffset = useMemo(() => {
    const today = getBeijingToday()
    const viewStartTime = viewStartDate.getTime()
    const dayMs = 24 * 60 * 60 * 1000
    const offset = Math.floor((today.getTime() - viewStartTime) / dayMs)
    if (offset >= 0 && offset < DAYS_TO_SHOW) {
      return offset
    }
    return -1
  }, [viewStartDate, DAYS_TO_SHOW])

  // 获取任务颜色
  const getTaskColor = (index: number) => {
    return taskColors[index % taskColors.length]
  }

  // 过滤出在视图范围内的任务
  const visibleTasks = useMemo(() => {
    return tasks.filter(task => getTaskPosition(task) !== null)
      .sort((a, b) => {
        // 先按开始日期排序
        const startCompare = a.planStartDate.localeCompare(b.planStartDate)
        if (startCompare !== 0) return startCompare
        // 再按优先级排序
        return a.priority - b.priority
      })
  }, [tasks, viewStartDate])

  // 切换视图
  const changeView = (weeks: number) => {
    const newDate = new Date(viewStartDate)
    newDate.setDate(newDate.getDate() + weeks * 7)
    setViewStartDate(newDate)
  }

  // 回到今天
  const goToToday = () => {
    const today = getBeijingToday()
    const day = today.getDay()
    const diff = day === 0 ? -6 : 1 - day
    today.setDate(today.getDate() + diff)
    setViewStartDate(today)
  }

  // 单元格宽度
  const CELL_WIDTH = 40 // px
  const NAME_COL_WIDTH = 280 // px

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--ds-text-secondary)]">加载中...</div>
      </div>
    )
  }

  return (
    <div>
      {/* 页面头部 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-[var(--ds-font-size-xxl)] font-bold text-[var(--ds-text-primary)]">日历视图</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeView(-WEEKS_TO_SHOW)}
            className="px-3 py-1.5 text-[var(--ds-font-size-sm)] border border-[var(--ds-border-default)] rounded-[var(--ds-radius-md)] hover:bg-[var(--ds-bg-hover)] transition-colors"
          >
            ← 前{WEEKS_TO_SHOW}周
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-[var(--ds-font-size-sm)] bg-[var(--ds-brand-primary)] text-white rounded-[var(--ds-radius-md)] hover:bg-[var(--ds-brand-primary-hover)] transition-colors"
          >
            今天
          </button>
          <button
            onClick={() => changeView(WEEKS_TO_SHOW)}
            className="px-3 py-1.5 text-[var(--ds-font-size-sm)] border border-[var(--ds-border-default)] rounded-[var(--ds-radius-md)] hover:bg-[var(--ds-bg-hover)] transition-colors"
          >
            后{WEEKS_TO_SHOW}周 →
          </button>
        </div>
      </div>

      {/* Roadmap 主体 */}
      <div className="bg-[var(--ds-bg-card)] rounded-[var(--ds-radius-lg)] shadow-[var(--ds-shadow-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: NAME_COL_WIDTH + CELL_WIDTH * DAYS_TO_SHOW }}>
            {/* 月份头部 */}
            <div className="flex border-b border-[var(--ds-border-default)]">
              <div
                className="flex-shrink-0 px-4 py-2 bg-[var(--ds-bg-hover)] border-r border-[var(--ds-border-default)]"
                style={{ width: NAME_COL_WIDTH }}
              >
                <span className="text-[var(--ds-font-size-xs)] font-semibold text-[var(--ds-text-secondary)] uppercase">任务</span>
              </div>
              <div className="flex">
                {weeks.map((week, weekIndex) => {
                  const month = week.weekStart.getMonth() + 1
                  const showMonth = weekIndex === 0 || week.days[0].getDate() <= 7
                  return (
                    <div
                      key={weekIndex}
                      className="text-center border-r border-[var(--ds-border-default)] bg-[var(--ds-bg-hover)]"
                      style={{ width: CELL_WIDTH * 7 }}
                    >
                      {showMonth && (
                        <div className="text-[var(--ds-font-size-xs)] font-semibold text-[var(--ds-text-primary)] py-1">
                          {month}月
                        </div>
                      )}
                      {!showMonth && <div className="py-1">&nbsp;</div>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 日期头部 */}
            <div className="flex border-b border-[var(--ds-border-default)]">
              <div
                className="flex-shrink-0 px-4 py-2 bg-[var(--ds-bg-page)] border-r border-[var(--ds-border-default)]"
                style={{ width: NAME_COL_WIDTH }}
              />
              <div className="flex relative">
                {dates.map((date, index) => {
                  const isTodayDate = isToday(date)
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6
                  return (
                    <div
                      key={index}
                      className={`text-center border-r border-[var(--ds-border-default)] py-1.5 ${
                        isTodayDate
                          ? 'bg-[var(--ds-brand-primary)] text-white'
                          : isWeekend
                            ? 'bg-[var(--ds-bg-page)] text-[var(--ds-text-disabled)]'
                            : 'bg-[var(--ds-bg-page)] text-[var(--ds-text-secondary)]'
                      }`}
                      style={{ width: CELL_WIDTH }}
                    >
                      <div className="text-[10px] font-medium">
                        {date.getDate()}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 任务列表 */}
            {visibleTasks.length === 0 ? (
              <div className="py-12 text-center text-[var(--ds-text-disabled)]">
                当前时间范围内没有任务
              </div>
            ) : (
              visibleTasks.map((task, taskIndex) => {
                const position = getTaskPosition(task)
                if (!position) return null

                const color = getTaskColor(taskIndex)

                return (
                  <div
                    key={task.id}
                    className="flex border-b border-[var(--ds-border-default)] hover:bg-[var(--ds-bg-hover)]/30 transition-colors"
                  >
                    {/* 任务信息列 */}
                    <div
                      className="flex-shrink-0 px-3 py-2 border-r border-[var(--ds-border-default)] flex items-center gap-2"
                      style={{ width: NAME_COL_WIDTH }}
                    >
                      {task.code && <CodeBadge code={task.code} type="task" size="sm" />}
                      <Link
                        href={`/task/${task.id}`}
                        className="flex-1 text-[var(--ds-font-size-sm)] text-[var(--ds-text-primary)] hover:text-[var(--ds-brand-primary)] truncate"
                        title={task.title}
                      >
                        {task.title}
                      </Link>
                    </div>

                    {/* 甘特图区域 */}
                    <div className="flex-1 relative" style={{ height: 40 }}>
                      {/* 网格背景 */}
                      <div className="absolute inset-0 flex">
                        {dates.map((date, index) => {
                          const isWeekend = date.getDay() === 0 || date.getDay() === 6
                          return (
                            <div
                              key={index}
                              className={`border-r border-[var(--ds-border-default)] ${
                                isWeekend ? 'bg-[var(--ds-bg-page)]/50' : ''
                              }`}
                              style={{ width: CELL_WIDTH }}
                            />
                          )
                        })}
                      </div>

                      {/* 今天的标记线 */}
                      {todayOffset >= 0 && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-[var(--ds-brand-primary)] z-10"
                          style={{ left: todayOffset * CELL_WIDTH + CELL_WIDTH / 2 }}
                        />
                      )}

                      {/* 任务条 */}
                      <div
                        className="absolute top-1.5 bottom-1.5 rounded-[var(--ds-radius-sm)] flex items-center px-2 cursor-pointer transition-all hover:opacity-90 group"
                        style={{
                          left: position.startOffset * CELL_WIDTH + 2,
                          width: position.width * CELL_WIDTH - 4,
                          backgroundColor: color.bg,
                        }}
                      >
                        <Link
                          href={`/task/${task.id}`}
                          className="flex items-center gap-1.5 w-full min-w-0"
                        >
                          <span className="text-white text-[11px] font-medium truncate">
                            {task.code && `${task.code} `}{task.title}
                          </span>
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* 图例 */}
      <div className="mt-4 flex items-center gap-4 text-[var(--ds-font-size-xs)] text-[var(--ds-text-secondary)]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[var(--ds-brand-primary)]" />
          <span>今天</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[var(--ds-bg-page)]" />
          <span>周末</span>
        </div>
      </div>
    </div>
  )
}
