'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDateBeijing } from '@/lib/timezone'

interface RelatedLink {
  title: string
  url: string
}

interface Requirement {
  id: string
  title: string
  priority: number
  startDate: string | null
  endDate: string | null
  links: string | null
  remarks: string | null
  createdAt: string
  project: {
    id: string
    title: string
    startDate: string | null
    endDate: string | null
  } | null
  tasks: Array<{
    id: string
    title: string
    priority: number
    planStartDate: string
    planEndDate: string
    status: string
    user: {
      id: string
      name: string
      role: string
    }
  }>
  stages: Array<{
    id: string
    name: string
    order: number
    startDate: string | null
    endDate: string | null
    status: string
  }>
}

export default function RequirementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: requirementId } = React.use(params)
  const [requirement, setRequirement] = useState<Requirement | null>(null)
  const [loading, setLoading] = useState(true)
  const [linksExpanded, setLinksExpanded] = useState(true)
  const [editingLinks, setEditingLinks] = useState(false)
  const [links, setLinks] = useState<RelatedLink[]>([])
  const [newLinkTitle, setNewLinkTitle] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [editingRemarks, setEditingRemarks] = useState(false)
  const [remarksText, setRemarksText] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetchRequirement()
  }, [requirementId])

  const fetchRequirement = async () => {
    try {
      const response = await fetch(`/api/requirements/${requirementId}`)
      if (response.ok) {
        const data = await response.json()
        setRequirement(data)
        if (data.links) {
          try {
            const parsedLinks = JSON.parse(data.links)
            setLinks(Array.isArray(parsedLinks) ? parsedLinks : [])
          } catch (e) {
            setLinks([])
          }
        }
        setRemarksText(data.remarks || '')
      } else {
        alert('需求不存在')
        router.push('/projects')
      }
    } catch (error) {
      console.error('Failed to fetch requirement:', error)
      alert('加载失败')
      router.push('/projects')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '未设置'
    return formatDateBeijing(dateStr)
  }

  const statusLabels: Record<string, string> = {
    PENDING: '待开始',
    IN_PROGRESS: '进行中',
    DONE: '已完成',
    TODO: '待办',
    DOING: '进行中'
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
    if (!requirement) return
    try {
      const response = await fetch(`/api/requirements/${requirementId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: requirement.title,
          priority: requirement.priority,
          projectId: requirement.project?.id || null,
          startDate: requirement.startDate,
          endDate: requirement.endDate,
          links: JSON.stringify(links),
        })
      })
      if (response.ok) {
        alert('链接保存成功！')
        setEditingLinks(false)
        fetchRequirement()
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
    if (!requirement) return
    try {
      const response = await fetch(`/api/requirements/${requirementId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: requirement.title,
          priority: requirement.priority,
          projectId: requirement.project?.id || null,
          startDate: requirement.startDate,
          endDate: requirement.endDate,
          remarks: remarksText.trim() || null,
        })
      })
      if (response.ok) {
        alert('备注保存成功！')
        setEditingRemarks(false)
        fetchRequirement()
      } else {
        const error = await response.json()
        alert('保存失败：' + error.error)
      }
    } catch (error) {
      console.error('Failed to save remarks:', error)
      alert('保存失败')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    )
  }

  if (!requirement) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link
            href="/projects"
            className="text-blue-600 hover:underline"
          >
            ← 返回项目视图
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">需求详情</h1>

          {/* 所属项目 */}
          {requirement.project && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h2 className="text-lg font-semibold text-gray-700 mb-3">所属项目</h2>
              <div>
                <Link
                  href={`/project/${requirement.project.id}`}
                  className="text-blue-600 hover:underline font-medium text-lg"
                >
                  {requirement.project.title}
                </Link>
                {requirement.project.startDate && requirement.project.endDate && (
                  <span className="ml-2 text-sm text-gray-500">
                    ({formatDate(requirement.project.startDate)} - {formatDate(requirement.project.endDate)})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 需求基本信息 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">基本信息</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">需求名称</div>
                <div className="font-medium text-lg">{requirement.title}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">优先级</div>
                <div className="font-medium">
                  {requirement.priority} {requirement.priority === 0 && '(最高)'}
                </div>
              </div>
              {requirement.startDate && (
                <div>
                  <div className="text-sm text-gray-600">开始日期</div>
                  <div className="font-medium">{formatDate(requirement.startDate)}</div>
                </div>
              )}
              {requirement.endDate && (
                <div>
                  <div className="text-sm text-gray-600">结束日期</div>
                  <div className="font-medium">{formatDate(requirement.endDate)}</div>
                </div>
              )}
            </div>
          </div>

          {/* 备注 */}
          {(requirement.remarks || editingRemarks) && (
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
                    <button onClick={() => { setEditingRemarks(false); setRemarksText(requirement.remarks || '') }} className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm">取消</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-gray-700 whitespace-pre-wrap mb-2">{requirement.remarks}</div>
                  <button onClick={() => setEditingRemarks(true)} className="text-sm text-blue-600 hover:underline">编辑备注</button>
                </div>
              )}
            </div>
          )}
          {!requirement.remarks && !editingRemarks && (
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
                            <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{link.title}</a>
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={() => setEditingLinks(true)} className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm">编辑链接</button>
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
                          <button onClick={() => handleDeleteLink(index)} className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm">删除</button>
                        </div>
                      ))}
                    </div>
                    {links.length < 5 && (
                      <div className="p-3 bg-gray-50 rounded border">
                        <div className="text-sm font-medium mb-2">添加新链接</div>
                        <div className="space-y-2">
                          <input type="text" placeholder="链接标题" value={newLinkTitle} onChange={(e) => setNewLinkTitle(e.target.value)} className="w-full px-3 py-2 border rounded text-sm" />
                          <input type="url" placeholder="链接URL" value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} className="w-full px-3 py-2 border rounded text-sm" />
                          <button onClick={handleAddLink} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">添加</button>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={handleSaveLinks} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm">保存</button>
                      <button onClick={() => { setEditingLinks(false); fetchRequirement() }} className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm">取消</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 阶段信息 */}
          {requirement.stages.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-3">阶段</h2>
              <div className="space-y-2">
                {requirement.stages
                  .sort((a, b) => a.order - b.order)
                  .map((stage) => (
                    <div key={stage.id} className="p-3 bg-gray-50 rounded border">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{stage.name}</span>
                          {stage.startDate && stage.endDate && (
                            <span className="ml-2 text-sm text-gray-500">
                              ({formatDate(stage.startDate)} - {formatDate(stage.endDate)})
                            </span>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded text-sm ${
                          stage.status === 'DONE' ? 'bg-green-100 text-green-800' :
                          stage.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {statusLabels[stage.status] || stage.status}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 任务列表 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">相关任务</h2>
            {requirement.tasks.length === 0 ? (
              <div className="text-gray-500 text-center py-8">暂无任务</div>
            ) : (
              <div className="space-y-2">
                {requirement.tasks
                  .sort((a, b) => a.priority - b.priority)
                  .map((task) => (
                    <div key={task.id} className="p-3 bg-gray-50 rounded border hover:bg-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <Link
                            href={`/task/${task.id}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {task.title}
                          </Link>
                          <span className="ml-2 text-sm text-gray-500">
                            ({formatDate(task.planStartDate)} - {formatDate(task.planEndDate)})
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/person/${task.user.id}`}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {task.user.name}
                          </Link>
                          <span className={`px-2 py-1 rounded text-sm ${
                            task.status === 'DONE' ? 'bg-green-100 text-green-800' :
                            task.status === 'DOING' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {statusLabels[task.status] || task.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 mt-8">
            {requirement.project && (
              <Link
                href={`/project/${requirement.project.id}`}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                查看项目
              </Link>
            )}
            <Link
              href="/manage"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              添加任务
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
