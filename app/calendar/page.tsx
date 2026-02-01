'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface User {
  id: string
  name: string
  role: string
}

interface Task {
  id: string
  title: string
  type: string
  requirementId?: string | null
  priority: number
  planStartDate: string
  startTimeSlot: string
  planEndDate: string
  endTimeSlot: string
  forecastEndDate: string | null
  actualEndDate: string | null
  links: string | null
  requirement: {
    id: string
    title: string
  } | null
  user: User
}

export default function CalendarPage() {
  const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart(new Date()))
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<{
    id: string
    title: string
    type: string
    priority: number
    planStartDate: string
    planEndDate: string
    links: Array<{ title: string; url: string }>
    requirement: { id: string; title: string } | null
    user: User
  } | null>(null)

  const [selectedRequirement, setSelectedRequirement] = useState<{
    id: string
    title: string
    startDate: string | null
    endDate: string | null
    links: Array<{ title: string; url: string }>
    personnel: Array<{
      userId: string
      userName: string
      userRole: string
      currentTask: string | null
    }>
  } | null>(null)

  const roleOrder = ['MANAGEMENT', 'FRONTEND', 'BACKEND', 'PRODUCT', 'OPERATIONS', 'STRATEGY']
  const roleLabels: Record<string, string> = {
    MANAGEMENT: '管理',
    FRONTEND: '前端',
    BACKEND: '后端',
    PRODUCT: '产品',
    OPERATIONS: '运营',
    STRATEGY: '战略'
  }

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

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('确定要删除这个任务吗？')) {
      return
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        fetchData()
        alert('任务删除成功！')
      } else {
        const error = await response.json()
        alert('删除失败：' + error.error)
      }
    } catch (error) {
      console.error('Failed to delete task:', error)
      alert('删除失败，请重试')
    }
  }

  // 获取一周的开始日期（周一）
  function getWeekStart(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day // 调整到周一
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

  // 按职能顺序排序用户
  const getUsersByRole = (users: User[]): User[] => {
    return [...users].sort((a, b) => {
      const roleIndexA = roleOrder.indexOf(a.role)
      const roleIndexB = roleOrder.indexOf(b.role)
      if (roleIndexA !== roleIndexB) return roleIndexA - roleIndexB
      return a.name.localeCompare(b.name, 'zh-CN')
    })
  }

  // 格式化为本地日期字符串 YYYY-MM-DD（避免时区偏移）
  const toLocalDateStr = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  // 获取用户在某日的最高优先级任务
  const getHighestPriorityTaskForDate = (userId: string, date: Date): Task | null => {
    const dateStr = toLocalDateStr(date)
    const tasksForDate = tasks.filter(task => {
      if (task.user.id !== userId) return false
      const startDate = toLocalDateStr(new Date(task.planStartDate))
      const endDate = toLocalDateStr(new Date(task.planEndDate))
      return dateStr >= startDate && dateStr <= endDate
    })
    tasksForDate.sort((a, b) => a.priority - b.priority)
    return tasksForDate.length > 0 ? tasksForDate[0] : null
  }

  // 判断日期是否是今天
  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const openTaskModal = (task: Task) => {
    let parsedLinks: Array<{ title: string; url: string }> = []
    if (task.links) {
      try { parsedLinks = JSON.parse(task.links) } catch (e) { /* ignore */ }
    }
    setSelectedTask({
      id: task.id,
      title: task.title,
      type: task.type,
      priority: task.priority,
      planStartDate: task.planStartDate,
      planEndDate: task.planEndDate,
      links: parsedLinks,
      requirement: task.requirement,
      user: task.user,
    })
  }

  // 获取需求的所有相关人员
  const showRequirementDetail = async (requirementId: string, requirementTitle: string) => {
    try {
      // 获取需求信息
      const reqRes = await fetch('/api/requirements')
      const allRequirements = await reqRes.json()
      const requirement = allRequirements.find((r: any) => r.id === requirementId)

      // 过滤该需求的任务
      const requirementTasks = tasks.filter(t => t.requirementId === requirementId)

      // 按用户分组
      const userMap = new Map()
      requirementTasks.forEach((task) => {
        if (!userMap.has(task.user.id)) {
          userMap.set(task.user.id, {
            userId: task.user.id,
            userName: task.user.name,
            userRole: task.user.role,
            currentTask: null,
            currentTaskPriority: Infinity
          })
        }

        // 找到该用户当前正在做的任务
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const taskStart = new Date(task.planStartDate)
        taskStart.setHours(0, 0, 0, 0)

        let taskEnd: Date
        if (task.actualEndDate) {
          taskEnd = new Date(task.actualEndDate)
        } else if (task.forecastEndDate) {
          taskEnd = new Date(task.forecastEndDate)
        } else {
          taskEnd = new Date(task.planEndDate)
        }
        taskEnd.setHours(0, 0, 0, 0)

        if (today >= taskStart && today <= taskEnd) {
          const user = userMap.get(task.user.id)
          if (task.priority < user.currentTaskPriority) {
            user.currentTask = task.title
            user.currentTaskPriority = task.priority
          }
        }
      })

      let parsedLinks: Array<{ title: string; url: string }> = []
      if (requirement?.links) {
        try { parsedLinks = JSON.parse(requirement.links) } catch (e) { /* ignore */ }
      }

      setSelectedRequirement({
        id: requirementId,
        title: requirementTitle,
        startDate: requirement?.startDate || null,
        endDate: requirement?.endDate || null,
        links: parsedLinks,
        personnel: Array.from(userMap.values()).map(u => ({
          userId: u.userId,
          userName: u.userName,
          userRole: u.userRole,
          currentTask: u.currentTask
        }))
      })
    } catch (error) {
      console.error('Failed to fetch requirement details:', error)
    }
  }

  // 切换周
  const changeWeek = (offset: number) => {
    const newDate = new Date(currentWeekStart)
    newDate.setDate(newDate.getDate() + (offset * 7))
    setCurrentWeekStart(newDate)
  }

  const weekDays = getWeekDays(currentWeekStart)
  const sortedUsers = getUsersByRole(users)

  // 获取周日期范围显示
  const weekEndDate = new Date(currentWeekStart)
  weekEndDate.setDate(weekEndDate.getDate() + 6)
  const weekLabel = `${currentWeekStart.getMonth() + 1}月${currentWeekStart.getDate()}日 - ${weekEndDate.getMonth() + 1}月${weekEndDate.getDate()}日`

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
             onClick={() => setSelectedTask(null)}>
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
               onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">
                <Link href={`/task/${selectedTask.id}`} className="text-blue-600 hover:underline">{selectedTask.title}</Link>
              </h2>
              <button onClick={() => setSelectedTask(null)}
                      className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>

            <div className="space-y-3 text-sm">
              <div><span className="text-gray-500">负责人：</span><Link href={`/person/${selectedTask.user.id}`} className="text-blue-600 hover:underline">{selectedTask.user.name}</Link></div>
              <div><span className="text-gray-500">优先级：</span>{selectedTask.priority}</div>
              <div><span className="text-gray-500">时间：</span>{new Date(selectedTask.planStartDate).toLocaleDateString('zh-CN')} - {new Date(selectedTask.planEndDate).toLocaleDateString('zh-CN')}</div>
              {selectedTask.requirement && (
                <div><span className="text-gray-500">所属需求：</span><Link href={`/requirement/${selectedTask.requirement.id}`} className="text-blue-600 hover:underline">{selectedTask.requirement.title}</Link></div>
              )}
            </div>

            {selectedTask.links.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">相关链接</h3>
                <div className="space-y-1">
                  {selectedTask.links.map((link, index) => (
                    <div key={index}>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">{link.title}</a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedRequirement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
             onClick={() => setSelectedRequirement(null)}>
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto"
               onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-2xl font-bold">需求：<Link href={`/requirement/${selectedRequirement.id}`} className="text-blue-600 hover:underline">{selectedRequirement.title}</Link></h2>
                {selectedRequirement.startDate && selectedRequirement.endDate && (
                  <p className="text-gray-600 mt-1">
                    {new Date(selectedRequirement.startDate).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })} - {new Date(selectedRequirement.endDate).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                  </p>
                )}
              </div>
              <button onClick={() => setSelectedRequirement(null)}
                      className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>

            {selectedRequirement.links.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">相关链接</h3>
                <div className="space-y-1">
                  {selectedRequirement.links.map((link, index) => (
                    <div key={index}>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">{link.title}</a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">相关人员</h3>

              {/* 按职能分组显示 */}
              {roleOrder.map(role => {
                const rolePersonnel = selectedRequirement.personnel
                  .filter(p => p.userRole === role)
                  .sort((a, b) => a.userName.localeCompare(b.userName, 'zh-CN'))

                if (rolePersonnel.length === 0) return null

                return (
                  <div key={role} className="mb-6">
                    <div className="text-md font-semibold text-gray-700 mb-2 bg-gray-100 px-3 py-2 rounded">
                      {roleLabels[role]}
                    </div>
                    <div className="space-y-2 pl-4">
                      {rolePersonnel.map(person => (
                        <div key={person.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <Link href={`/person/${person.userId}`}
                                className="text-blue-600 hover:underline font-medium">
                            {person.userName}
                          </Link>
                          <div className="text-sm text-gray-600">
                            正在做：{person.currentTask || <span className="text-gray-400">无</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              {selectedRequirement.personnel.length === 0 && (
                <div className="text-gray-400 text-center py-8">
                  暂无相关人员
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Link href="/team" className="text-blue-600 hover:underline">
              ← 返回团队视图
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              周视图 - {weekLabel}
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => changeWeek(-1)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              上周
            </button>
            <button
              onClick={() => changeWeek(1)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              下周
            </button>
          </div>
        </div>

        {/* Week Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-8 border-b bg-gray-50">
            <div className="p-3 font-semibold text-gray-700 border-r">
              人员
            </div>
            {weekDays.map((day, index) => {
              const weekDayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
              const todayHighlight = isToday(day)
              return (
                <div
                  key={index}
                  className={`p-3 text-center font-semibold ${
                    todayHighlight ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <div>{weekDayNames[index]}</div>
                  <div className="text-sm font-normal">
                    {day.getMonth() + 1}/{day.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Table Body - Grouped by Role */}
          {roleOrder.map(role => {
            const roleUsers = sortedUsers.filter(u => u.role === role)
            if (roleUsers.length === 0) return null

            return (
              <div key={role} className="border-b last:border-b-0">
                {/* Role Header Row */}
                <div className="bg-gray-100 px-4 py-2 font-semibold text-gray-700 border-b">
                  {roleLabels[role]}
                </div>

                {/* User Rows */}
                {roleUsers.map(user => (
                  <div key={user.id} className="grid grid-cols-8 border-b last:border-b-0 hover:bg-gray-50">
                    {/* Person Name Cell */}
                    <div className="p-3 border-r">
                      <Link
                        href={`/person/${user.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {user.name}
                      </Link>
                    </div>

                    {/* Day Cells */}
                    {weekDays.map((day, dayIndex) => {
                      const task = getHighestPriorityTaskForDate(user.id, day)
                      const isTodayCell = isToday(day)

                      return (
                        <div
                          key={dayIndex}
                          className={`p-2 min-h-[60px] ${
                            isTodayCell ? 'bg-blue-50' : ''
                          }`}
                        >
                          {task ? (
                            <div className="relative group">
                              <div
                                onClick={() => openTaskModal(task)}
                                className={`text-xs p-2 rounded block cursor-pointer ${
                                  task.type === 'IN_REQUIREMENT'
                                    ? 'bg-blue-100 hover:bg-blue-200'
                                    : 'bg-green-100 hover:bg-green-200'
                                }`}
                                title={task.title}
                              >
                                <div className="font-medium truncate">
                                  {task.title}
                                </div>
                                <div className="text-gray-600 mt-1">
                                  优先级: {task.priority}
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteTask(task.id)
                                }}
                                className="absolute top-0 right-0 px-1.5 py-0.5 bg-red-100 text-red-700 rounded-bl rounded-tr text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                title="删除任务"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <div className="text-gray-400 text-xs text-center pt-4">
                              -
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        {users.length === 0 && (
          <div className="mt-6 text-center text-gray-500">
            还没有团队成员，请先添加
          </div>
        )}
      </div>
    </div>
  )
}
