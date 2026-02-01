'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface RelatedLink {
  title: string
  url: string
}

interface Project {
  id: string
  title: string
  description: string | null
  priority: number
  startDate: string | null
  endDate: string | null
  links: string | null
  remarks: string | null
  createdAt: string
  requirements: Array<{
    id: string
    title: string
    priority: number
    startDate: string | null
    endDate: string | null
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
  }>
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = React.use(params)
  const [project, setProject] = useState<Project | null>(null)
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
    fetchProject()
  }, [projectId])

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data)
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
        alert('项目不存在')
        router.push('/projects')
      }
    } catch (error) {
      console.error('Failed to fetch project:', error)
      alert('加载失败')
      router.push('/projects')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '未设置'
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  const statusLabels: Record<string, string> = {
    TODO: '待办',
    DOING: '进行中',
    DONE: '已完成'
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
    if (!project) return
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: project.title,
          description: project.description,
          priority: project.priority,
          startDate: project.startDate,
          endDate: project.endDate,
          links: JSON.stringify(links),
        })
      })
      if (response.ok) {
        alert('链接保存成功！')
        setEditingLinks(false)
        fetchProject()
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
    if (!project) return
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: project.title,
          description: project.description,
          priority: project.priority,
          startDate: project.startDate,
          endDate: project.endDate,
          remarks: remarksText.trim() || null,
        })
      })
      if (response.ok) {
        alert('备注保存成功！')
        setEditingRemarks(false)
        fetchProject()
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

  if (!project) {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-6">项目详情</h1>

          {/* 项目基本信息 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">基本信息</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <div className="text-sm text-gray-600">项目名称</div>
                <div className="font-medium text-xl">{project.title}</div>
              </div>
              {project.description && (
                <div className="col-span-2">
                  <div className="text-sm text-gray-600">项目描述</div>
                  <div className="font-medium text-gray-700">{project.description}</div>
                </div>
              )}
              <div>
                <div className="text-sm text-gray-600">需求数量</div>
                <div className="font-medium">{project.requirements.length} 个</div>
              </div>
              {project.startDate && (
                <div>
                  <div className="text-sm text-gray-600">开始日期</div>
                  <div className="font-medium">{formatDate(project.startDate)}</div>
                </div>
              )}
              {project.endDate && (
                <div>
                  <div className="text-sm text-gray-600">结束日期</div>
                  <div className="font-medium">{formatDate(project.endDate)}</div>
                </div>
              )}
            </div>
          </div>

          {/* 备注 */}
          {(project.remarks || editingRemarks) && (
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
                    <button onClick={() => { setEditingRemarks(false); setRemarksText(project.remarks || '') }} className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm">取消</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-gray-700 whitespace-pre-wrap mb-2">{project.remarks}</div>
                  <button onClick={() => setEditingRemarks(true)} className="text-sm text-blue-600 hover:underline">编辑备注</button>
                </div>
              )}
            </div>
          )}
          {!project.remarks && !editingRemarks && (
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
                      <button onClick={() => { setEditingLinks(false); fetchProject() }} className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm">取消</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 需求列表 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">需求列表</h2>
            {project.requirements.length === 0 ? (
              <div className="text-gray-500 text-center py-8">暂无需求</div>
            ) : (
              <div className="space-y-4">
                {project.requirements
                  .sort((a, b) => {
                    if (!a.startDate && !b.startDate) return a.priority - b.priority
                    if (!a.startDate) return 1
                    if (!b.startDate) return -1
                    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
                  })
                  .map((requirement) => (
                    <div key={requirement.id} className="p-4 bg-gray-50 rounded-lg border">
                      <div className="mb-3">
                        <Link
                          href={`/requirement/${requirement.id}`}
                          className="font-medium text-lg text-blue-600 hover:underline"
                        >
                          {requirement.title}
                        </Link>
                        {requirement.startDate && requirement.endDate && (
                          <span className="ml-2 text-sm text-gray-500">
                            ({formatDate(requirement.startDate)} - {formatDate(requirement.endDate)})
                          </span>
                        )}
                      </div>

                      {requirement.tasks.length > 0 && (
                        <div className="ml-4 space-y-2">
                          {requirement.tasks
                            .sort((a, b) => a.priority - b.priority)
                            .map((task) => (
                              <div key={task.id} className="p-2 bg-white rounded border text-sm">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <Link href={`/task/${task.id}`} className="text-blue-600 hover:underline">{task.title}</Link>
                                    <span className="ml-2 text-gray-500">({formatDate(task.planStartDate)} - {formatDate(task.planEndDate)})</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Link href={`/person/${task.user.id}`} className="text-blue-600 hover:underline">{task.user.name}</Link>
                                    <span className={`px-2 py-1 rounded text-xs ${
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
                  ))}
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 mt-8">
            <Link
              href={`/requirement/new?projectId=${projectId}`}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              添加需求
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
