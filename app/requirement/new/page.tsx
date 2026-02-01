'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: string
  name: string
  role: string
}

export default function NewRequirementPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const [newRequirement, setNewRequirement] = useState({
    title: '',
    priority: 0,
    startDate: new Date().toISOString().split('T')[0],
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
  }>>([])

  const [currentTaskInput, setCurrentTaskInput] = useState({
    title: '',
    userId: '',
    priority: 0,
    planStartDate: new Date().toISOString().split('T')[0],
    startTimeSlot: 'MORNING',
    durationWorkdays: 1,
    endTimeSlot: 'AFTERNOON',
  })

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

    setRequirementTasks([...requirementTasks, { ...currentTaskInput }])
    setCurrentTaskInput({
      title: '',
      userId: '',
      priority: 0,
      planStartDate: new Date().toISOString().split('T')[0],
      startTimeSlot: 'MORNING',
      durationWorkdays: 1,
      endTimeSlot: 'AFTERNOON',
    })
  }

  const handleRemoveTaskFromRequirement = (index: number) => {
    setRequirementTasks(requirementTasks.filter((_, i) => i !== index))
  }

  const handleAddRequirement = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // 先创建需求
      const reqResponse = await fetch('/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRequirement),
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
              ...task,
              type: 'IN_REQUIREMENT',
              requirementId: createdRequirement.id,
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

      // 跳转回团队视图
      router.push('/team')
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
          <Link href="/team" className="text-blue-600 hover:underline">
            ← 返回团队视图
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
                  结束日期
                </label>
                <input
                  type="date"
                  value={newRequirement.endDate}
                  onChange={(e) =>
                    setNewRequirement({ ...newRequirement, endDate: e.target.value })
                  }
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
                          开始: {task.planStartDate} ({task.startTimeSlot === 'MORNING' ? '上午' : '下午'}) |
                          时长: {task.durationWorkdays}工作日
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
                      开始时段
                    </label>
                    <select
                      value={currentTaskInput.startTimeSlot}
                      onChange={(e) =>
                        setCurrentTaskInput({ ...currentTaskInput, startTimeSlot: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="MORNING">上午</option>
                      <option value="AFTERNOON">下午</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      结束时段
                    </label>
                    <select
                      value={currentTaskInput.endTimeSlot}
                      onChange={(e) =>
                        setCurrentTaskInput({ ...currentTaskInput, endTimeSlot: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="MORNING">上午</option>
                      <option value="AFTERNOON">下午</option>
                    </select>
                  </div>
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
