'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getBeijingDateStr, getBeijingToday, formatDateBeijing } from '@/lib/timezone'
import { Button } from '@/components/ui'
import { Modal } from '@/components/ui'
import { PriorityBadge, CodeBadge, AssigneeAvatar } from '@/components/issue'

interface User {
  id: string
  name: string
  role: string
}

interface StageAssignment {
  user: User
}

interface Stage {
  id: string
  name: string
  order: number
  startDate: string | null
  endDate: string | null
  status: string
  description: string | null
  deliverables: string | null
  assignments: StageAssignment[]
}

interface Task {
  id: string
  code?: string
  status: string
  title?: string
  priority?: number
  planStartDate?: string
  planEndDate?: string
  user?: User
}

interface Requirement {
  id: string
  code?: string
  title: string
  priority: number
  projectId: string | null
  startDate: string | null
  endDate: string | null
  links: string | null
  stages: Stage[]
  tasks: Task[]
}

interface Project {
  id: string
  code?: string
  title: string
  description: string | null
  priority: number
  startDate: string | null
  endDate: string | null
  requirements: Requirement[]
}

interface StandaloneTask {
  id: string
  code?: string
  title: string
  priority: number
  requirementId: string | null
  planStartDate: string
  planEndDate: string
  forecastEndDate: string | null
  actualEndDate: string | null
  status: string
  user: User
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [tasks, setTasks] = useState<StandaloneTask[]>([])
  const [loading, setLoading] = useState(true)
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
  const [showRequirementForm, setShowRequirementForm] = useState<string | null>(null)
  const [newRequirement, setNewRequirement] = useState({
    title: '',
    priority: 0,
    startDate: getBeijingDateStr(),
    endDate: ''
  })
  const [reqLinks, setReqLinks] = useState<Array<{ title: string; url: string }>>([])
  const [newReqLinkTitle, setNewReqLinkTitle] = useState('')
  const [newReqLinkUrl, setNewReqLinkUrl] = useState('')
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [expandedRequirements, setExpandedRequirements] = useState<Set<string>>(new Set())
  const [collapsedSections, setCollapsedSections] = useState<{ projects: boolean; requirements: boolean; tasks: boolean }>({
    projects: false,
    requirements: false,
    tasks: false
  })

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
      const [projectsRes, requirementsRes, tasksRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/requirements'),
        fetch('/api/tasks')
      ])
      const projectsData = await projectsRes.json()
      const requirementsData = await requirementsRes.json()
      const tasksData = await tasksRes.json()

      setProjects(projectsData)
      setRequirements(requirementsData)
      setTasks(tasksData)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRequirement = async (e: React.FormEvent, projectId: string) => {
    e.preventDefault()
    if (!newRequirement.endDate) {
      alert('请填写结束日期')
      return
    }
    try {
      const response = await fetch('/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newRequirement,
          projectId,
          links: reqLinks.length > 0 ? JSON.stringify(reqLinks) : null
        })
      })
      if (response.ok) {
        setShowRequirementForm(null)
        setNewRequirement({
          title: '',
          priority: 0,
          startDate: getBeijingDateStr(),
          endDate: ''
        })
        setReqLinks([])
        fetchData()
        alert('需求创建成功！')
      } else {
        const error = await response.json()
        alert('创建失败：' + error.error)
      }
    } catch (error) {
      console.error('Failed to create requirement:', error)
      alert('创建失败，请重试')
    }
  }

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProject) return

    try {
      const response = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingProject.title,
          description: editingProject.description,
          priority: editingProject.priority,
          startDate: editingProject.startDate,
          endDate: editingProject.endDate
        })
      })
      if (response.ok) {
        setEditingProject(null)
        fetchData()
        alert('项目更新成功！')
      } else {
        const error = await response.json()
        alert('更新失败：' + error.error)
      }
    } catch (error) {
      console.error('Failed to update project:', error)
      alert('更新失败，请重试')
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    const reqCount = project?.requirements.length || 0
    const taskCount = project?.requirements.reduce((sum, req) => sum + req.tasks.length, 0) || 0

    let message = '确定要删除这个项目吗？'
    if (reqCount > 0 || taskCount > 0) {
      message += `\n\n警告：删除项目将同时删除：`
      if (reqCount > 0) message += `\n• ${reqCount} 个需求`
      if (taskCount > 0) message += `\n• ${taskCount} 个任务`
      message += `\n\n此操作不可撤销！`
    }

    if (!confirm(message)) return

    try {
      const response = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
      if (response.ok) {
        const result = await response.json()
        fetchData()
        if (result.deletedItems && (result.deletedItems.requirements > 0 || result.deletedItems.tasks > 0)) {
          alert(`项目删除成功！\n已删除 ${result.deletedItems.requirements} 个需求和 ${result.deletedItems.tasks} 个任务`)
        } else {
          alert('项目删除成功！')
        }
      } else {
        const error = await response.json()
        alert('删除失败：' + error.error)
      }
    } catch (error) {
      console.error('Failed to delete project:', error)
      alert('删除失败，请重试')
    }
  }

  const handleDeleteRequirement = async (requirementId: string) => {
    const requirement = requirements.find(r => r.id === requirementId)
    const taskCount = requirement?.tasks.length || 0

    let message = '确定要删除这个需求吗？'
    if (taskCount > 0) {
      message += `\n\n警告：删除需求将同时删除 ${taskCount} 个任务！`
      message += `\n\n此操作不可撤销！`
    }

    if (!confirm(message)) return

    try {
      const response = await fetch(`/api/requirements/${requirementId}`, { method: 'DELETE' })
      if (response.ok) {
        const result = await response.json()
        fetchData()
        if (result.deletedItems && result.deletedItems.tasks > 0) {
          alert(`需求删除成功！\n已删除 ${result.deletedItems.tasks} 个任务`)
        } else {
          alert('需求删除成功！')
        }
      } else {
        const error = await response.json()
        alert('删除失败：' + error.error)
      }
    } catch (error) {
      console.error('Failed to delete requirement:', error)
      alert('删除失败，请重试')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('确定要删除这个任务吗？')) return

    try {
      const response = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
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

  const getCurrentRequirement = (project: Project): Requirement | null => {
    return project.requirements.find(req =>
      req.stages.some(s => s.status === 'IN_PROGRESS')
    ) || null
  }

  const getNextRequirement = (project: Project): Requirement | null => {
    const pendingReqs = project.requirements
      .filter(req => req.stages.some(s => s.status === 'PENDING'))
      .sort((a, b) => a.priority - b.priority)
    return pendingReqs.length > 0 ? pendingReqs[0] : null
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return formatDateBeijing(date)
  }

  const sortedProjects = [...projects].sort((a, b) =>
    a.title.localeCompare(b.title, 'zh-CN')
  )

  const getStandaloneRequirements = (): Requirement[] => {
    return requirements
      .filter(req => !req.projectId)
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority
        return a.title.localeCompare(b.title, 'zh-CN')
      })
  }

  const getStandaloneInProgressTasks = () => {
    const today = getBeijingToday()
    return tasks
      .filter(task => {
        if (task.requirementId) return false
        const startDate = new Date(task.planStartDate)
        const endDate = new Date(task.planEndDate)
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(0, 0, 0, 0)
        return today >= startDate && today <= endDate
      })
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority
        return a.title.localeCompare(b.title, 'zh-CN')
      })
  }

  const standaloneRequirements = getStandaloneRequirements()
  const standaloneTasks = getStandaloneInProgressTasks()

  const showRequirementDetail = async (requirement: Requirement) => {
    try {
      const tasksRes = await fetch('/api/tasks')
      const allTasks = await tasksRes.json()
      const requirementTasks = allTasks.filter((t: StandaloneTask) => t.requirementId === requirement.id)

      const userMap = new Map()
      requirementTasks.forEach((task: StandaloneTask) => {
        if (!userMap.has(task.user.id)) {
          userMap.set(task.user.id, {
            userId: task.user.id,
            userName: task.user.name,
            userRole: task.user.role,
            currentTask: null,
            currentTaskPriority: Infinity
          })
        }

        const today = getBeijingToday()
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
      if (requirement.links) {
        try { parsedLinks = JSON.parse(requirement.links) } catch (e) { /* ignore */ }
      }

      setSelectedRequirement({
        id: requirement.id,
        title: requirement.title,
        startDate: requirement.startDate,
        endDate: requirement.endDate,
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

  const toggleProjectExpand = (projectId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev)
      if (newSet.has(projectId)) {
        newSet.delete(projectId)
      } else {
        newSet.add(projectId)
      }
      return newSet
    })
  }

  const toggleRequirementExpand = (requirementId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedRequirements(prev => {
      const newSet = new Set(prev)
      if (newSet.has(requirementId)) {
        newSet.delete(requirementId)
      } else {
        newSet.add(requirementId)
      }
      return newSet
    })
  }

  // 获取需求的状态
  const getRequirementStatus = (req: Requirement) => {
    const hasInProgress = req.stages.some(s => s.status === 'IN_PROGRESS')
    const hasPending = req.stages.some(s => s.status === 'PENDING')
    const allCompleted = req.stages.length > 0 && req.stages.every(s => s.status === 'COMPLETED')

    if (allCompleted) return { label: '已完成', color: 'var(--ds-status-success)', bg: 'var(--ds-status-success-bg)' }
    if (hasInProgress) return { label: '进行中', color: 'var(--ds-status-info)', bg: 'var(--ds-status-info-bg)' }
    if (hasPending) return { label: '待开始', color: 'var(--ds-text-secondary)', bg: 'var(--ds-bg-hover)' }
    return { label: '待规划', color: 'var(--ds-text-disabled)', bg: 'var(--ds-bg-page)' }
  }

  // 获取任务状态
  const getTaskStatus = (task: Task) => {
    if (task.status === 'COMPLETED') return { label: '已完成', color: 'var(--ds-status-success)', bg: 'var(--ds-status-success-bg)' }
    if (task.status === 'IN_PROGRESS') return { label: '进行中', color: 'var(--ds-status-info)', bg: 'var(--ds-status-info-bg)' }
    return { label: '待开始', color: 'var(--ds-text-secondary)', bg: 'var(--ds-bg-hover)' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--ds-text-secondary)]">加载中...</div>
      </div>
    )
  }

  return (
    <div>
      {/* 需求详情模态框 */}
      <Modal
        isOpen={!!selectedRequirement}
        onClose={() => setSelectedRequirement(null)}
        title={selectedRequirement ? `需求：${selectedRequirement.title}` : ''}
        size="lg"
      >
        {selectedRequirement && (
          <div>
            {selectedRequirement.startDate && selectedRequirement.endDate && (
              <p className="text-[var(--ds-text-secondary)] mb-4">
                {formatDate(selectedRequirement.startDate)} - {formatDate(selectedRequirement.endDate)}
              </p>
            )}

            {selectedRequirement.links.length > 0 && (
              <div className="mb-6">
                <h3 className="text-[var(--ds-font-size-md)] font-semibold mb-2">相关链接</h3>
                <div className="space-y-1">
                  {selectedRequirement.links.map((link, index) => (
                    <div key={index}>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-[var(--ds-text-link)] hover:underline text-[var(--ds-font-size-sm)]">{link.title}</a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-[var(--ds-font-size-md)] font-semibold mb-4">相关人员</h3>
              {roleOrder.map(role => {
                const rolePersonnel = selectedRequirement.personnel
                  .filter(p => p.userRole === role)
                  .sort((a, b) => a.userName.localeCompare(b.userName, 'zh-CN'))

                if (rolePersonnel.length === 0) return null

                return (
                  <div key={role} className="mb-4">
                    <div className="text-[var(--ds-font-size-sm)] font-semibold text-[var(--ds-text-secondary)] mb-2 bg-[var(--ds-bg-hover)] px-3 py-2 rounded-[var(--ds-radius-sm)]">
                      {roleLabels[role]}
                    </div>
                    <div className="space-y-2 pl-4">
                      {rolePersonnel.map(person => (
                        <div key={person.userId} className="flex items-center justify-between p-3 bg-[var(--ds-bg-page)] rounded-[var(--ds-radius-sm)]">
                          <Link
                            href={`/person/${person.userId}`}
                            className="text-[var(--ds-text-link)] hover:underline font-medium"
                          >
                            {person.userName}
                          </Link>
                          <div className="text-[var(--ds-font-size-sm)] text-[var(--ds-text-secondary)]">
                            正在做：{person.currentTask || <span className="text-[var(--ds-text-disabled)]">无</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              {selectedRequirement.personnel.length === 0 && (
                <div className="text-[var(--ds-text-disabled)] text-center py-8">
                  暂无相关人员
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* 页面头部 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[var(--ds-text-primary)]">项目视图</h1>
      </div>

      {/* 收起/展开按钮 */}
      <div className="flex gap-2 mb-4">
        <button
          className={`px-3 py-1.5 text-[var(--ds-font-size-sm)] rounded-[var(--ds-radius-md)] border transition-colors ${
            !collapsedSections.projects
              ? 'bg-[var(--ds-bg-card)] text-[var(--ds-text-primary)] border-[var(--ds-border-default)] shadow-sm'
              : 'bg-[var(--ds-bg-hover)] text-[var(--ds-text-secondary)] border-transparent hover:text-[var(--ds-text-primary)]'
          }`}
          onClick={() => setCollapsedSections(s => ({ ...s, projects: !s.projects }))}
        >
          {collapsedSections.projects ? '展开项目' : '收起项目'}
        </button>
        <button
          className={`px-3 py-1.5 text-[var(--ds-font-size-sm)] rounded-[var(--ds-radius-md)] border transition-colors ${
            !collapsedSections.requirements
              ? 'bg-[var(--ds-bg-card)] text-[var(--ds-text-primary)] border-[var(--ds-border-default)] shadow-sm'
              : 'bg-[var(--ds-bg-hover)] text-[var(--ds-text-secondary)] border-transparent hover:text-[var(--ds-text-primary)]'
          }`}
          onClick={() => setCollapsedSections(s => ({ ...s, requirements: !s.requirements }))}
        >
          {collapsedSections.requirements ? '展开独立需求' : '收起独立需求'}
        </button>
        <button
          className={`px-3 py-1.5 text-[var(--ds-font-size-sm)] rounded-[var(--ds-radius-md)] border transition-colors ${
            !collapsedSections.tasks
              ? 'bg-[var(--ds-bg-card)] text-[var(--ds-text-primary)] border-[var(--ds-border-default)] shadow-sm'
              : 'bg-[var(--ds-bg-hover)] text-[var(--ds-text-secondary)] border-transparent hover:text-[var(--ds-text-primary)]'
          }`}
          onClick={() => setCollapsedSections(s => ({ ...s, tasks: !s.tasks }))}
        >
          {collapsedSections.tasks ? '展开独立任务' : '收起独立任务'}
        </button>
      </div>

      {/* 项目列表 */}
      {!collapsedSections.projects && (
      <div className="bg-[var(--ds-bg-card)] rounded-[var(--ds-radius-lg)] shadow-[var(--ds-shadow-card)] overflow-hidden">
        {/* 表头 */}
        {sortedProjects.length > 0 && (
          <div className="grid grid-cols-12 gap-4 px-4 py-2.5 bg-[var(--ds-bg-hover)] border-b border-[var(--ds-border-default)] text-[var(--ds-font-size-xs)] font-semibold text-[var(--ds-text-secondary)] uppercase tracking-wide">
            <div className="col-span-5">项目名称</div>
            <div className="col-span-1 text-center">优先级</div>
            <div className="col-span-2">当前需求</div>
            <div className="col-span-2">计划时间</div>
            <div className="col-span-2 text-right">操作</div>
          </div>
        )}

        {sortedProjects.map(project => {
          const currentReq = getCurrentRequirement(project)
          const nextReq = getNextRequirement(project)
          const isExpanded = expandedProjects.has(project.id)

          return (
            <div key={project.id} className="border-b border-[var(--ds-border-default)] last:border-b-0">
              {/* 项目行 */}
              <div
                className="grid grid-cols-12 gap-4 px-4 py-3 cursor-pointer hover:bg-[var(--ds-bg-hover)] transition-colors items-center"
                onClick={() => toggleProjectExpand(project.id)}
              >
                {/* 项目名称区域 */}
                <div className="col-span-5 flex items-center gap-3">
                  {/* 展开图标 */}
                  <button className="w-5 h-5 flex items-center justify-center text-[var(--ds-text-secondary)] flex-shrink-0">
                    <svg
                      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>

                  {/* 项目图标 */}
                  <div className="w-6 h-6 rounded bg-[var(--ds-brand-primary)] flex items-center justify-center flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                    </svg>
                  </div>

                  {/* 编号 */}
                  {project.code && <CodeBadge code={project.code} type="project" size="sm" />}

                  {/* 标题 */}
                  <Link
                    href={`/project/${project.id}`}
                    className="font-medium text-[var(--ds-text-primary)] hover:text-[var(--ds-brand-primary)] truncate"
                    onClick={(e) => e.stopPropagation()}
                    title={project.title}
                  >
                    {project.title}
                  </Link>
                </div>

                {/* 优先级 */}
                <div className="col-span-1 flex justify-center">
                  <PriorityBadge priority={project.priority} size="sm" />
                </div>

                {/* 当前需求 */}
                <div className="col-span-2">
                  {currentReq ? (
                    <Link
                      href={`/requirement/${currentReq.id}`}
                      className="text-[var(--ds-font-size-sm)] text-[var(--ds-text-link)] hover:underline truncate block"
                      onClick={(e) => e.stopPropagation()}
                      title={currentReq.title}
                    >
                      {currentReq.title}
                    </Link>
                  ) : (
                    <span className="text-[var(--ds-font-size-sm)] text-[var(--ds-text-disabled)]">无进行中</span>
                  )}
                </div>

                {/* 日期 */}
                <div className="col-span-2 text-[var(--ds-font-size-sm)] text-[var(--ds-text-secondary)]">
                  {formatDate(project.startDate)} ~ {formatDate(project.endDate)}
                </div>

                {/* 操作按钮 */}
                <div className="col-span-2 flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setEditingProject(project)}
                    className="p-1.5 text-[var(--ds-text-secondary)] hover:text-[var(--ds-brand-primary)] hover:bg-[var(--ds-bg-selected)] rounded transition-colors"
                    title="编辑"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteProject(project.id)}
                    className="p-1.5 text-[var(--ds-text-secondary)] hover:text-[var(--ds-status-error)] hover:bg-[var(--ds-status-error-bg)] rounded transition-colors"
                    title="删除"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 展开内容 - Jira Backlog 样式 */}
              {isExpanded && editingProject?.id !== project.id && (
                <div className="bg-[var(--ds-bg-page)] border-t border-[var(--ds-border-default)]">
                  {project.description && (
                    <p className="text-[var(--ds-font-size-sm)] text-[var(--ds-text-secondary)] px-4 py-3 border-b border-[var(--ds-border-default)]">{project.description}</p>
                  )}

                  {/* 需求列表头部 */}
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-[var(--ds-bg-hover)] text-[var(--ds-font-size-xs)] font-semibold text-[var(--ds-text-secondary)] uppercase tracking-wide border-b border-[var(--ds-border-default)]">
                    <div className="col-span-5 pl-8">需求</div>
                    <div className="col-span-1 text-center">优先级</div>
                    <div className="col-span-2 text-center">状态</div>
                    <div className="col-span-2">日期</div>
                    <div className="col-span-2 text-right">任务数</div>
                  </div>

                  {/* 需求列表 */}
                  {project.requirements.length === 0 ? (
                    <div className="py-8 text-center text-[var(--ds-text-disabled)]">
                      暂无需求
                    </div>
                  ) : (
                    project.requirements
                      .sort((a, b) => a.priority - b.priority)
                      .map(req => {
                        const reqStatus = getRequirementStatus(req)
                        const isReqExpanded = expandedRequirements.has(req.id)

                        return (
                          <div key={req.id} className="border-b border-[var(--ds-border-default)] last:border-b-0">
                            {/* 需求行 */}
                            <div
                              className="grid grid-cols-12 gap-2 px-4 py-2.5 hover:bg-[var(--ds-bg-hover)] cursor-pointer transition-colors items-center"
                              onClick={(e) => toggleRequirementExpand(req.id, e)}
                            >
                              <div className="col-span-5 flex items-center gap-2">
                                {/* 展开图标 */}
                                <button className="w-5 h-5 flex items-center justify-center text-[var(--ds-text-secondary)] flex-shrink-0">
                                  <svg
                                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                    className={`transform transition-transform ${isReqExpanded ? 'rotate-90' : ''}`}
                                  >
                                    <polyline points="9 18 15 12 9 6" />
                                  </svg>
                                </button>

                                {/* 需求图标 */}
                                <div className="w-5 h-5 rounded bg-[var(--ds-status-success)] flex items-center justify-center flex-shrink-0">
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                                    <circle cx="12" cy="12" r="10" />
                                  </svg>
                                </div>

                                {/* 编号 */}
                                {req.code && <CodeBadge code={req.code} type="requirement" size="sm" />}

                                {/* 标题 */}
                                <Link
                                  href={`/requirement/${req.id}`}
                                  className="text-[var(--ds-font-size-sm)] text-[var(--ds-text-primary)] hover:text-[var(--ds-brand-primary)] truncate"
                                  onClick={(e) => e.stopPropagation()}
                                  title={req.title}
                                >
                                  {req.title}
                                </Link>
                              </div>

                              {/* 优先级 */}
                              <div className="col-span-1 flex justify-center">
                                <PriorityBadge priority={req.priority} size="sm" />
                              </div>

                              {/* 状态 */}
                              <div className="col-span-2 flex justify-center">
                                <span
                                  className="px-2 py-0.5 rounded text-[var(--ds-font-size-xs)] font-medium"
                                  style={{ backgroundColor: reqStatus.bg, color: reqStatus.color }}
                                >
                                  {reqStatus.label}
                                </span>
                              </div>

                              {/* 日期 */}
                              <div className="col-span-2 text-[var(--ds-font-size-xs)] text-[var(--ds-text-secondary)]">
                                {formatDate(req.startDate)} ~ {formatDate(req.endDate)}
                              </div>

                              {/* 任务数 */}
                              <div className="col-span-2 text-right">
                                <span className="text-[var(--ds-font-size-xs)] text-[var(--ds-text-secondary)]">
                                  {req.tasks.length} 个任务
                                </span>
                              </div>
                            </div>

                            {/* 任务列表 */}
                            {isReqExpanded && req.tasks.length > 0 && (
                              <div className="bg-[var(--ds-bg-card)] border-t border-[var(--ds-border-default)]">
                                {req.tasks.map(task => {
                                  const taskStatus = getTaskStatus(task)
                                  return (
                                    <div
                                      key={task.id}
                                      className="grid grid-cols-12 gap-2 px-4 py-2 hover:bg-[var(--ds-bg-hover)] transition-colors items-center border-b border-[var(--ds-border-default)] last:border-b-0"
                                    >
                                      <div className="col-span-5 flex items-center gap-2 pl-12">
                                        {/* 任务图标 */}
                                        <div className="w-4 h-4 rounded bg-[var(--ds-status-info)] flex items-center justify-center flex-shrink-0">
                                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                            <polyline points="20 6 9 17 4 12" />
                                          </svg>
                                        </div>

                                        {/* 编号 */}
                                        {task.code && <CodeBadge code={task.code} type="task" size="sm" />}

                                        {/* 标题 */}
                                        <Link
                                          href={`/task/${task.id}`}
                                          className="text-[var(--ds-font-size-sm)] text-[var(--ds-text-primary)] hover:text-[var(--ds-brand-primary)] truncate"
                                          title={task.title || ''}
                                        >
                                          {task.title || task.code || task.id}
                                        </Link>
                                      </div>

                                      {/* 优先级 */}
                                      <div className="col-span-1 flex justify-center">
                                        {task.priority !== undefined && <PriorityBadge priority={task.priority} size="sm" />}
                                      </div>

                                      {/* 状态 */}
                                      <div className="col-span-2 flex justify-center">
                                        <span
                                          className="px-2 py-0.5 rounded text-[var(--ds-font-size-xs)] font-medium"
                                          style={{ backgroundColor: taskStatus.bg, color: taskStatus.color }}
                                        >
                                          {taskStatus.label}
                                        </span>
                                      </div>

                                      {/* 日期 */}
                                      <div className="col-span-2 text-[var(--ds-font-size-xs)] text-[var(--ds-text-secondary)]">
                                        {task.planStartDate && task.planEndDate
                                          ? `${formatDate(task.planStartDate)} ~ ${formatDate(task.planEndDate)}`
                                          : '-'}
                                      </div>

                                      {/* 负责人 */}
                                      <div className="col-span-2 flex justify-end">
                                        {task.user && (
                                          <AssigneeAvatar users={[{ id: task.user.id, name: task.user.name }]} size="sm" />
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}

                            {/* 无任务提示 */}
                            {isReqExpanded && req.tasks.length === 0 && (
                              <div className="py-4 pl-16 text-[var(--ds-font-size-sm)] text-[var(--ds-text-disabled)] bg-[var(--ds-bg-card)] border-t border-[var(--ds-border-default)]">
                                暂无任务
                              </div>
                            )}
                          </div>
                        )
                      })
                  )}

                  {/* 添加需求按钮 */}
                  <div className="px-4 py-3 border-t border-[var(--ds-border-default)]">
                    {showRequirementForm === project.id ? (
                      <div className="bg-[var(--ds-bg-card)] rounded-[var(--ds-radius-md)] p-4 border border-[var(--ds-border-default)]">
                        <h3 className="font-semibold mb-3 text-[var(--ds-font-size-sm)]">为项目添加需求</h3>
                        <form onSubmit={(e) => handleCreateRequirement(e, project.id)} className="space-y-3">
                          <div>
                            <label className="block text-[var(--ds-font-size-sm)] font-medium mb-1">需求名称</label>
                            <input
                              type="text"
                              value={newRequirement.title}
                              onChange={(e) => setNewRequirement({ ...newRequirement, title: e.target.value })}
                              required
                              className="w-full px-3 py-2 border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] text-[var(--ds-font-size-sm)] focus:border-[var(--ds-border-focused)] focus:outline-none"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[var(--ds-font-size-sm)] font-medium mb-1">开始日期</label>
                              <input
                                type="date"
                                value={newRequirement.startDate}
                                onChange={(e) => setNewRequirement({ ...newRequirement, startDate: e.target.value })}
                                className="w-full px-3 py-2 border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] text-[var(--ds-font-size-sm)]"
                              />
                            </div>
                            <div>
                              <label className="block text-[var(--ds-font-size-sm)] font-medium mb-1">结束日期 *</label>
                              <input
                                type="date"
                                value={newRequirement.endDate}
                                onChange={(e) => setNewRequirement({ ...newRequirement, endDate: e.target.value })}
                                required
                                className="w-full px-3 py-2 border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] text-[var(--ds-font-size-sm)]"
                              />
                            </div>
                            <div>
                              <label className="block text-[var(--ds-font-size-sm)] font-medium mb-1">优先级</label>
                              <select
                                value={newRequirement.priority}
                                onChange={(e) => setNewRequirement({ ...newRequirement, priority: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] text-[var(--ds-font-size-sm)]"
                              >
                                <option value="0">P0 - 最高</option>
                                <option value="1">P1 - 高</option>
                                <option value="2">P2 - 中</option>
                                <option value="3">P3 - 低</option>
                                <option value="4">P4 - 较低</option>
                                <option value="5">P5 - 最低</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button type="submit" variant="primary" size="sm">创建需求</Button>
                            <Button type="button" variant="secondary" size="sm" onClick={() => setShowRequirementForm(null)}>取消</Button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowRequirementForm(project.id)}
                        className="flex items-center gap-2 text-[var(--ds-font-size-sm)] text-[var(--ds-text-link)] hover:text-[var(--ds-brand-primary)]"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        添加需求
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 编辑项目表单 */}
              {editingProject?.id === project.id && (
                <div className="p-4">
                  <form onSubmit={handleUpdateProject} className="space-y-4">
                    <div>
                      <label className="block text-[var(--ds-font-size-sm)] font-medium mb-1">项目名称</label>
                      <input
                        type="text"
                        value={editingProject.title}
                        onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--ds-font-size-sm)] font-medium mb-1">项目描述</label>
                      <textarea
                        value={editingProject.description || ''}
                        onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                        className="w-full px-3 py-2 border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)]"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[var(--ds-font-size-sm)] font-medium mb-1">开始日期</label>
                        <input
                          type="date"
                          value={editingProject.startDate || ''}
                          onChange={(e) => setEditingProject({ ...editingProject, startDate: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)]"
                        />
                      </div>
                      <div>
                        <label className="block text-[var(--ds-font-size-sm)] font-medium mb-1">结束日期</label>
                        <input
                          type="date"
                          value={editingProject.endDate || ''}
                          onChange={(e) => setEditingProject({ ...editingProject, endDate: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)]"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" variant="primary" size="sm">保存</Button>
                      <Button type="button" variant="secondary" size="sm" onClick={() => setEditingProject(null)}>取消</Button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )
        })}

        {/* 空状态 */}
        {sortedProjects.length === 0 && (
          <div className="text-center py-12 text-[var(--ds-text-disabled)]">
            暂无项目，点击上方"+ 添加项目"创建
          </div>
        )}
      </div>
      )}

      {/* 独立需求 */}
      {!collapsedSections.requirements && standaloneRequirements.length > 0 && (
        <div className="bg-[var(--ds-bg-card)] rounded-[var(--ds-radius-lg)] shadow-[var(--ds-shadow-card)] overflow-hidden mt-6">
          <div className="px-4 py-3 bg-[var(--ds-bg-hover)] border-b border-[var(--ds-border-default)]">
            <h2 className="text-[var(--ds-font-size-md)] font-semibold text-[var(--ds-text-primary)]">独立需求</h2>
          </div>
          {standaloneRequirements.map(req => (
            <div
              key={req.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-[var(--ds-border-default)] last:border-b-0 hover:bg-[var(--ds-bg-hover)] transition-colors"
            >
              <div className="w-5 h-5 rounded bg-[var(--ds-status-success)] flex items-center justify-center flex-shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </div>
              {req.code && <CodeBadge code={req.code} type="requirement" size="sm" />}
              <Link href={`/requirement/${req.id}`} className="flex-1 font-medium text-[var(--ds-text-primary)] hover:text-[var(--ds-brand-primary)] truncate">{req.title}</Link>
              <PriorityBadge priority={req.priority} size="sm" />
              <span className="text-[var(--ds-font-size-sm)] text-[var(--ds-text-secondary)] w-40">
                {formatDate(req.startDate)} ~ {formatDate(req.endDate)}
              </span>
              <button
                onClick={() => handleDeleteRequirement(req.id)}
                className="p-1.5 text-[var(--ds-text-secondary)] hover:text-[var(--ds-status-error)] hover:bg-[var(--ds-status-error-bg)] rounded transition-colors"
                title="删除"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 独立任务 */}
      {!collapsedSections.tasks && standaloneTasks.length > 0 && (
        <div className="bg-[var(--ds-bg-card)] rounded-[var(--ds-radius-lg)] shadow-[var(--ds-shadow-card)] overflow-hidden mt-6">
          <div className="px-4 py-3 bg-[var(--ds-bg-hover)] border-b border-[var(--ds-border-default)]">
            <h2 className="text-[var(--ds-font-size-md)] font-semibold text-[var(--ds-text-primary)]">独立任务（进行中）</h2>
          </div>
          {standaloneTasks.map(task => (
            <div
              key={task.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-[var(--ds-border-default)] last:border-b-0 hover:bg-[var(--ds-bg-hover)] transition-colors"
            >
              <div className="w-5 h-5 rounded bg-[var(--ds-status-info)] flex items-center justify-center flex-shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              {task.code && <CodeBadge code={task.code} type="task" size="sm" />}
              <Link href={`/task/${task.id}`} className="flex-1 font-medium text-[var(--ds-text-primary)] hover:text-[var(--ds-brand-primary)] truncate">{task.title}</Link>
              <PriorityBadge priority={task.priority} size="sm" />
              <span className="text-[var(--ds-font-size-sm)] text-[var(--ds-text-secondary)] w-40">
                {formatDate(task.planStartDate)} ~ {formatDate(task.planEndDate)}
              </span>
              <Link
                href={`/person/${task.user.id}`}
                className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[var(--ds-bg-hover)] border border-[var(--ds-border-default)] hover:bg-[var(--ds-bg-selected)] hover:border-[var(--ds-brand-primary)] transition-colors"
              >
                <AssigneeAvatar users={[{ id: task.user.id, name: task.user.name }]} size="sm" />
                <span className="text-[var(--ds-font-size-sm)] text-[var(--ds-text-primary)] font-medium pr-1">{task.user.name}</span>
              </Link>
              <button
                onClick={() => handleDeleteTask(task.id)}
                className="p-1.5 text-[var(--ds-text-secondary)] hover:text-[var(--ds-status-error)] hover:bg-[var(--ds-status-error-bg)] rounded transition-colors"
                title="删除"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
