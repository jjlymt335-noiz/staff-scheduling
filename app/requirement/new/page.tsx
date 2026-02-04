'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getBeijingDateStr } from '@/lib/timezone'

interface User {
  id: string
  name: string
  role: string
}

interface PredecessorTask {
  id: string
  code: string
  title: string
  status: string
  user?: { id: string; name: string }
}

export default function NewRequirementPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-600">加载中...</div></div>}>
      <NewRequirementPageContent />
    </Suspense>
  )
}

function NewRequirementPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const [newRequirement, setNewRequirement] = useState({
    title: '',
    priority: 0,
    startDate: getBeijingDateStr(),
    endDate: '',
  })

  const [requirementTasks, setRequirementTasks] = useState<Array<{
    title: string
    userId: string
    priority: number
    planStartDate: string
    startTimeSlot: string
    durationWorkdays: number
    endTimeSlot: string
    predecessorId?: string
    predecessorCode?: string
    predecessorTitle?: string
  }>>([])

  const [currentTaskInput, setCurrentTaskInput] = useState({
    title: '',
    userId: '',
    priority: 0,
    planStartDate: getBeijingDateStr(),
    startTimeSlot: 'MORNING',
    durationWorkdays: 1,
    endTimeSlot: 'AFTERNOON',
  })

  // 前置任务相关状态
  const [predecessorSearch, setPredecessorSearch] = useState('')
  const [predecessorResults, setPredecessorResults] = useState<PredecessorTask[]>([])
  const [selectedPredecessor, setSelectedPredecessor] = useState<PredecessorTask | null>(null)
  const [searchingPredecessor, setSearchingPredecessor] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  // 搜索前置任务
  const searchPredecessors = async (query: string) => {
    if (!query.trim()) {
      setPredecessorResults([])
      return
    }
    setSearchingPredecessor(true)
    try {
      const res = await fetch(`/api/tasks/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      const filtered = data.filter((t: PredecessorTask) =>
        selectedPredecessor?.id !== t.id
      )
      setPredecessorResults(filtered)
    } catch (error) {
      console.error('Failed to search predecessors:', error)
    } finally {
      setSearchingPredecessor(false)
    }
  }

  const selectPredecessor = (task: PredecessorTask) => {
    setSelectedPredecessor(task)
    setPredecessorSearch('')
    setPredecessorResults([])
  }

  const removePredecessor = () => {
    setSelectedPredecessor(null)
  }

  const handleAddTaskToRequirement = () => {
    if (!currentTaskInput.title || !currentTaskInput.userId) {
      alert('请填写任务标题和负责人')
      return
    }

    // 如果需求有时间限制，验证任务时间
    if (newRequirement.startDate && newRequirement.endDate && currentTaskInput.planStartDate) {
      const reqStart = new Date(newRequirement.startDate)
      const reqEnd = new Date(newRequirement.endDate)
      const taskStart = new Date(currentTaskInput.planStartDate)

      // 计算任务结束日期（简化版，不考虑工作日）
      const taskEnd = new Date(taskStart)
      taskEnd.setDate(taskEnd.getDate() + currentTaskInput.durationWorkdays)

      if (taskStart < reqStart || taskEnd > reqEnd) {
        alert(`任务时间必须在需求时间范围内（${newRequirement.startDate} 至 ${newRequirement.endDate}）`)
        return
      }
    }

    setRequirementTasks([...requirementTasks, {
      ...currentTaskInput,
      predecessorId: selectedPredecessor?.id,
      predecessorCode: selectedPredecessor?.code,
      predecessorTitle: selectedPredecessor?.title,
    }])
    setCurrentTaskInput({
      title: '',
      userId: '',
      priority: 0,
      planStartDate: getBeijingDateStr(),
      startTimeSlot: 'MORNING',
      durationWorkdays: 1,
      endTimeSlot: 'AFTERNOON',
    })
    setSelectedPredecessor(null)
  }

  const handleRemoveTaskFromRequirement = (index: number) => {
    setRequirementTasks(requirementTasks.filter((_, i) => i !== index))
  }

  const handleAddRequirement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRequirement.endDate) {
      alert('请填写结束日期')
      return
    }
    try {
      // 先创建需求
      const reqResponse = await fetch('/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newRequirement, projectId: projectId || undefined }),
      })

      if (!reqResponse.ok) {
        const error = await reqResponse.json()
        alert('创建需求失败：' + error.error)
        return
      }

      const createdRequirement = await reqResponse.json()

      // 如果有任务，批量创建任务
      if (requirementTasks.length > 0) {
        const taskPromises = requirementTasks.map(task =>
          fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: task.title,
              userId: task.userId,
              priority: task.priority,
              planStartDate: task.planStartDate,
              startTimeSlot: task.startTimeSlot,
              durationWorkdays: task.durationWorkdays,
              endTimeSlot: task.endTimeSlot,
              type: 'IN_REQUIREMENT',
              requirementId: createdRequirement.id,
              predecessorIds: task.predecessorId ? [task.predecessorId] : [],
            })
          })
        )

        const taskResults = await Promise.all(taskPromises)
        const failedTasks = taskResults.filter(r => !r.ok)

        if (failedTasks.length > 0) {
          alert(`需求创建成功，但有 ${failedTasks.length} 个任务创建失败`)
        } else {
          alert(`需求和 ${requirementTasks.length} 个任务创建成功！`)
        }
      } else {
        alert('需求创建成功！')
      }

      // 跳转回来源页面
      router.push(projectId ? `/project/${projectId}` : '/projects')
    } catch (error) {
      console.error('Failed to add requirement:', error)
      alert('创建失败')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href={projectId ? `/project/${projectId}` : '/projects'} className="text-blue-600 hover:underline">
            ← {projectId ? '返回项目详情' : '返回项目列表'}
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">添加需求</h1>

        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleAddRequirement} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                需求标题
              </label>
              <input
                type="text"
                value={newRequirement.title}
                onChange={(e) =>
                  setNewRequirement({ ...newRequirement, title: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如：用户登录功能"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  开始日期
                </label>
                <input
                  type="date"
                  value={newRequirement.startDate}
                  onChange={(e) =>
                    setNewRequirement({ ...newRequirement, startDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  结束日期 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newRequirement.endDate}
                  onChange={(e) =>
                    setNewRequirement({ ...newRequirement, endDate: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                优先级（0-5，0最高优先级）
              </label>
              <input
                type="number"
                value={newRequirement.priority}
                onChange={(e) =>
                  setNewRequirement({
                    ...newRequirement,
                    priority: parseInt(e.target.value),
                  })
                }
                min="0"
                max="5"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 需求任务列表 */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">需求任务</h3>

              {/* 已添加的任务列表 */}
              {requirementTasks.length > 0 && (
                <div className="mb-4 space-y-2">
                  {requirementTasks.map((task, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                      <div className="flex-1">
                        <div className="font-medium">{task.title}</div>
                        <div className="text-sm text-gray-600">
                          负责人: {users.find(u => u.id === task.userId)?.name || '未知'} |
                          优先级: {task.priority} |
                          开始: {task.planStartDate} |
                          时长: {task.durationWorkdays}工作日
                          {task.predecessorCode && ` | 前置: [${task.predecessorCode}] ${task.predecessorTitle}`}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTaskFromRequirement(index)}
                        className="ml-3 text-red-600 hover:text-red-700"
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 添加任务表单 */}
              <div className="bg-blue-50 p-4 rounded-md space-y-3">
                <h4 className="font-medium text-gray-900">添加任务到需求</h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    任务标题
                  </label>
                  <input
                    type="text"
                    value={currentTaskInput.title}
                    onChange={(e) =>
                      setCurrentTaskInput({ ...currentTaskInput, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="例如：前端开发"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      负责人
                    </label>
                    <select
                      value={currentTaskInput.userId}
                      onChange={(e) =>
                        setCurrentTaskInput({ ...currentTaskInput, userId: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">请选择</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      优先级（0-5）
                    </label>
                    <input
                      type="number"
                      value={currentTaskInput.priority}
                      onChange={(e) =>
                        setCurrentTaskInput({
                          ...currentTaskInput,
                          priority: parseInt(e.target.value),
                        })
                      }
                      min="0"
                      max="5"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      开始日期
                    </label>
                    <input
                      type="date"
                      value={currentTaskInput.planStartDate}
                      onChange={(e) =>
                        setCurrentTaskInput({ ...currentTaskInput, planStartDate: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      工作日天数
                    </label>
                    <input
                      type="number"
                      value={currentTaskInput.durationWorkdays}
                      onChange={(e) =>
                        setCurrentTaskInput({
                          ...currentTaskInput,
                          durationWorkdays: parseInt(e.target.value),
                        })
                      }
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>

                {/* 前置任务选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    前置任务（可选）
                  </label>
                  {selectedPredecessor ? (
                    <div className="flex items-center gap-2 p-2 bg-white rounded text-sm border border-blue-200">
                      <span className="font-mono text-blue-600">{selectedPredecessor.code}</span>
                      <span className="flex-1 truncate">{selectedPredecessor.title}</span>
                      <button
                        type="button"
                        onClick={removePredecessor}
                        className="text-red-600 hover:text-red-800 text-xs"
                      >
                        移除
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="搜索任务（按名称或编号）..."
                        value={predecessorSearch}
                        onChange={(e) => {
                          setPredecessorSearch(e.target.value)
                          searchPredecessors(e.target.value)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                      {searchingPredecessor && (
                        <div className="absolute right-3 top-2 text-gray-400 text-xs">搜索中...</div>
                      )}
                      {predecessorResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {predecessorResults.map((task) => (
                            <div
                              key={task.id}
                              onClick={() => selectPredecessor(task)}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2 text-sm"
                            >
                              <span className="font-mono text-blue-600">{task.code}</span>
                              <span className="flex-1 truncate">{task.title}</span>
                              {task.user && <span className="text-gray-500 text-xs">{task.user.name}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleAddTaskToRequirement}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 text-sm"
                >
                  + 添加任务
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              创建需求{requirementTasks.length > 0 && `（含 ${requirementTasks.length} 个任务）`}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
