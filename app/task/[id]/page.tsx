'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDateBeijing } from '@/lib/timezone'

interface RelatedLink {
  title: string
  url: string
}

interface SiblingTask {
  id: string
  title: string
  priority: number
}

interface Task {
  id: string
  title: string
  type: string
  priority: number
  planStartDate: string
  startTimeSlot: string
  durationWorkdays: number
  planEndDate: string
  endTimeSlot: string
  forecastEndDate: string | null
  actualEndDate: string | null
  status: string
  links: string | null
  remarks: string | null
  createdAt: string
  requirement: {
    id: string
    title: string
    startDate: string | null
    endDate: string | null
    project: {
      id: string
      title: string
      startDate: string | null
      endDate: string | null
    } | null
  } | null
  user: {
    id: string
    name: string
    role: string
  }
}

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: taskId } = React.use(params)
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [linksExpanded, setLinksExpanded] = useState(true)
  const [editingLinks, setEditingLinks] = useState(false)
  const [links, setLinks] = useState<RelatedLink[]>([])
  const [newLinkTitle, setNewLinkTitle] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [editingRemarks, setEditingRemarks] = useState(false)
  const [remarksText, setRemarksText] = useState('')
  const [prevTask, setPrevTask] = useState<SiblingTask | null>(null)
  const [nextTask, setNextTask] = useState<SiblingTask | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchTask()
  }, [taskId])

  const fetchTask = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`)
      if (response.ok) {
        const data = await response.json()
        setTask(data)
        // Parse links from JSON
        if (data.links) {
          try {
            const parsedLinks = JSON.parse(data.links)
            setLinks(Array.isArray(parsedLinks) ? parsedLinks : [])
          } catch (e) {
            setLinks([])
          }
        }
        setRemarksText(data.remarks || '')

        // Fetch sibling tasks if this task belongs to a requirement
        if (data.requirement) {
          fetchSiblingTasks(data.requirement.id, data.id, data.priority)
        } else {
          setPrevTask(null)
          setNextTask(null)
        }
      } else {
        alert('任务不存在')
        router.push('/team')
      }
    } catch (error) {
      console.error('Failed to fetch task:', error)
      alert('加载失败')
      router.push('/team')
    } finally {
      setLoading(false)
    }
  }

  const fetchSiblingTasks = async (requirementId: string, currentTaskId: string, currentPriority: number) => {
    try {
      const response = await fetch(`/api/requirements/${requirementId}`)
      if (response.ok) {
        const reqData = await response.json()
        const sortedTasks = (reqData.tasks || [])
          .sort((a: any, b: any) => a.priority - b.priority)

        const currentIndex = sortedTasks.findIndex((t: any) => t.id === currentTaskId)
        setPrevTask(currentIndex > 0 ? sortedTasks[currentIndex - 1] : null)
        setNextTask(currentIndex < sortedTasks.length - 1 ? sortedTasks[currentIndex + 1] : null)
      }
    } catch (error) {
      console.error('Failed to fetch sibling tasks:', error)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '未设置'
    return formatDateBeijing(dateStr)
  }

  const formatTimeSlot = (slot: string) => {
    return slot === 'MORNING' ? '上午' : '下午'
  }

  const handleAddLink = () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) {
      alert('请填写链接标题和URL')
      return
    }
    if (links.length >= 5) {
      alert('最多只能添加5个链接')
      return
    }
    setLinks([...links, { title: newLinkTitle, url: newLinkUrl }])
    setNewLinkTitle('')
    setNewLinkUrl('')
  }

  const handleDeleteLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index))
  }

  const handleSaveLinks = async () => {
    if (!task) return

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: task.title,
          type: task.type,
          requirementId: task.requirement?.id || null,
          userId: task.user.id,
          priority: task.priority,
          planStartDate: task.planStartDate,
          startTimeSlot: task.startTimeSlot,
          durationWorkdays: task.durationWorkdays,
          endTimeSlot: task.endTimeSlot,
          forecastEndDate: task.forecastEndDate,
          status: task.status,
          links: JSON.stringify(links)
        })
      })
      if (response.ok) {
        alert('链接保存成功！')
        setEditingLinks(false)
        fetchTask()
      } else {
        const error = await response.json()
        alert('保存失败：' + error.error)
      }
    } catch (error) {
      console.error('Failed to save links:', error)
      alert('保存失败')
    }
  }

  const handleSaveRemarks = async () => {
    if (!task) return

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: task.title,
          type: task.type,
          requirementId: task.requirement?.id || null,
          userId: task.user.id,
          priority: task.priority,
          planStartDate: task.planStartDate,
          startTimeSlot: task.startTimeSlot,
          durationWorkdays: task.durationWorkdays,
          endTimeSlot: task.endTimeSlot,
          forecastEndDate: task.forecastEndDate,
          status: task.status,
          links: task.links,
          remarks: remarksText.trim() || null,
        })
      })
      if (response.ok) {
        alert('备注保存成功！')
        setEditingRemarks(false)
        fetchTask()
      } else {
        const error = await response.json()
        alert('保存失败：' + error.error)
      }
    } catch (error) {
      console.error('Failed to save remarks:', error)
      alert('保存失败')
    }
  }

  const statusLabels: Record<string, string> = {
    TODO: '待办',
    DOING: '进行中',
    DONE: '已完成'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    )
  }

  if (!task) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href="/team"
            className="text-blue-600 hover:underline"
          >
            ← 返回团队视图
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">任务详情</h1>

          {/* 上一个/下一个任务导航 */}
          {task.requirement && (prevTask || nextTask) && (
            <div className="mb-6 flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
              <div>
                {prevTask ? (
                  <Link
                    href={`/task/${prevTask.id}`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    ← 上一个: {prevTask.title}
                  </Link>
                ) : (
                  <span className="text-gray-400 text-sm">无上一个任务</span>
                )}
              </div>
              <div className="text-sm text-gray-500">同需求任务</div>
              <div>
                {nextTask ? (
                  <Link
                    href={`/task/${nextTask.id}`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    下一个: {nextTask.title} →
                  </Link>
                ) : (
                  <span className="text-gray-400 text-sm">无下一个任务</span>
                )}
              </div>
            </div>
          )}

          {/* 层级信息 */}
          {(task.requirement || task.type === 'IN_REQUIREMENT') && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h2 className="text-lg font-semibold text-gray-700 mb-3">所属层级</h2>
              <div className="space-y-2">
                {task.requirement?.project && (
                  <div>
                    <span className="text-sm text-gray-600">项目：</span>
                    <Link
                      href={`/project/${task.requirement.project.id}`}
                      className="ml-2 text-blue-600 hover:underline font-medium"
                    >
                      {task.requirement.project.title}
                    </Link>
                    {task.requirement.project.startDate && task.requirement.project.endDate && (
                      <span className="ml-2 text-sm text-gray-500">
                        ({formatDate(task.requirement.project.startDate)} - {formatDate(task.requirement.project.endDate)})
                      </span>
                    )}
                  </div>
                )}
                {task.requirement && (
                  <div>
                    <span className="text-sm text-gray-600">需求：</span>
                    <Link
                      href={`/requirement/${task.requirement.id}`}
                      className="ml-2 text-blue-600 hover:underline font-medium"
                    >
                      {task.requirement.title}
                    </Link>
                    {task.requirement.startDate && task.requirement.endDate && (
                      <span className="ml-2 text-sm text-gray-500">
                        ({formatDate(task.requirement.startDate)} - {formatDate(task.requirement.endDate)})
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 任务基本信息 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">基本信息</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">任务名称</div>
                <div className="font-medium text-lg">{task.title}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">负责人</div>
                <Link
                  href={`/person/${task.user.id}`}
                  className="font-medium text-lg text-blue-600 hover:underline"
                >
                  {task.user.name}
                </Link>
              </div>
              <div>
                <div className="text-sm text-gray-600">任务类型</div>
                <div className="font-medium">
                  {task.type === 'IN_REQUIREMENT' ? '需求内任务' : '独立任务'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">优先级</div>
                <div className="font-medium">
                  {task.priority} {task.priority === 0 && '(最高)'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">状态</div>
                <div className="font-medium">
                  <span className={`px-2 py-1 rounded text-sm ${
                    task.status === 'DONE' ? 'bg-green-100 text-green-800' :
                    task.status === 'DOING' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {statusLabels[task.status] || task.status}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">工作天数</div>
                <div className="font-medium">{task.durationWorkdays} 天</div>
              </div>
            </div>
          </div>

          {/* 时间信息 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">时间信息</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">计划开始</div>
                <div className="font-medium">
                  {formatDate(task.planStartDate)} {formatTimeSlot(task.startTimeSlot)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">计划结束</div>
                <div className="font-medium">
                  {formatDate(task.planEndDate)} {formatTimeSlot(task.endTimeSlot)}
                </div>
              </div>
              {task.forecastEndDate && (
                <div>
                  <div className="text-sm text-gray-600">预计结束</div>
                  <div className="font-medium text-orange-600">
                    {formatDate(task.forecastEndDate)}
                  </div>
                </div>
              )}
              {task.actualEndDate && (
                <div>
                  <div className="text-sm text-gray-600">实际结束</div>
                  <div className="font-medium text-green-600">
                    {formatDate(task.actualEndDate)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 备注 */}
          {(task.remarks || editingRemarks) && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-3">备注</h2>
              {editingRemarks ? (
                <div className="space-y-3">
                  <textarea
                    value={remarksText}
                    onChange={(e) => setRemarksText(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    rows={4}
                    placeholder="输入备注内容..."
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSaveRemarks} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm">保存</button>
                    <button onClick={() => { setEditingRemarks(false); setRemarksText(task.remarks || '') }} className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm">取消</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-gray-700 whitespace-pre-wrap mb-2">{task.remarks}</div>
                  <button onClick={() => setEditingRemarks(true)} className="text-sm text-blue-600 hover:underline">编辑备注</button>
                </div>
              )}
            </div>
          )}
          {!task.remarks && !editingRemarks && (
            <div className="mb-6">
              <button onClick={() => setEditingRemarks(true)} className="text-sm text-blue-600 hover:underline">+ 添加备注</button>
            </div>
          )}

          {/* 相关链接 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-700">相关链接</h2>
              <button
                onClick={() => setLinksExpanded(!linksExpanded)}
                className="text-blue-600 hover:underline text-sm"
              >
                {linksExpanded ? '收起' : '展开'}
              </button>
            </div>

            {linksExpanded && (
              <div className="space-y-3">
                {!editingLinks ? (
                  <>
                    {links.length === 0 ? (
                      <div className="text-gray-500 text-sm">暂无相关链接</div>
                    ) : (
                      <div className="space-y-2">
                        {links.map((link, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {link.title}
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => setEditingLinks(true)}
                      className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                    >
                      编辑链接
                    </button>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      {links.map((link, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <div className="flex-1">
                            <div className="text-sm font-medium">{link.title}</div>
                            <div className="text-xs text-gray-500">{link.url}</div>
                          </div>
                          <button
                            onClick={() => handleDeleteLink(index)}
                            className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                          >
                            删除
                          </button>
                        </div>
                      ))}
                    </div>

                    {links.length < 5 && (
                      <div className="p-3 bg-gray-50 rounded border">
                        <div className="text-sm font-medium mb-2">添加新链接</div>
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="链接标题"
                            value={newLinkTitle}
                            onChange={(e) => setNewLinkTitle(e.target.value)}
                            className="w-full px-3 py-2 border rounded text-sm"
                          />
                          <input
                            type="url"
                            placeholder="链接URL"
                            value={newLinkUrl}
                            onChange={(e) => setNewLinkUrl(e.target.value)}
                            className="w-full px-3 py-2 border rounded text-sm"
                          />
                          <button
                            onClick={handleAddLink}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                          >
                            添加
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveLinks}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => {
                          setEditingLinks(false)
                          fetchTask()
                        }}
                        className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                      >
                        取消
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
