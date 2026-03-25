import { LarkApiClient } from '../../client/request.js'
import { wrapDomainError } from '../../shared/errors.js'
import type {
  LarkTaskCreateParams,
  LarkTaskCreateResult,
  LarkTaskListParams,
  LarkTaskListResult,
  LarkTaskSummary,
  LarkTaskUpdateParams,
  LarkTaskUpdateResult,
} from '../../shared/types.js'

export class LarkTasksService {
  constructor(private readonly client: LarkApiClient) {}

  async createTask(params: LarkTaskCreateParams): Promise<LarkTaskCreateResult> {
    const body: Record<string, unknown> = {
      summary: params.summary,
    }
    if (params.description) body.description = params.description
    if (params.dueTime) {
      body.due = { timestamp: params.dueTime }
    }
    if (params.assigneeOpenIds && params.assigneeOpenIds.length > 0) {
      body.members = params.assigneeOpenIds.map(openId => ({
        id: openId,
        type: 'user',
        role: 'assignee',
      }))
    }

    try {
      const response = await this.client.requestOrThrow<Record<string, unknown>>(
        'POST',
        '/open-apis/task/v2/tasks',
        body,
      )
      const data = (response.data ?? {}) as Record<string, unknown>
      const task = (data.task ?? {}) as Record<string, unknown>
      return {
        taskGuid: (task.guid as string) ?? '',
        summary: (task.summary as string) ?? params.summary,
        raw: response,
      }
    } catch (error) {
      throw wrapDomainError('创建任务失败', error)
    }
  }

  async listTasks(params: LarkTaskListParams): Promise<LarkTaskListResult> {
    const query: Record<string, string> = {}
    if (params.pageSize) query.page_size = String(Math.min(params.pageSize, 100))
    if (params.pageToken) query.page_token = params.pageToken
    if (typeof params.completed === 'boolean') {
      query.completed = params.completed ? 'true' : 'false'
    }

    try {
      const response = await this.client.requestOrThrow<Record<string, unknown>>(
        'GET',
        '/open-apis/task/v2/tasks',
        undefined,
        query,
      )
      const data = (response.data ?? {}) as Record<string, unknown>
      const rawItems = (data.items as Record<string, unknown>[] | undefined) ?? []
      return {
        items: rawItems.map(toTaskSummary),
        hasMore: Boolean(data.has_more),
        nextPageToken: data.page_token as string | undefined,
        raw: response,
      }
    } catch (error) {
      throw wrapDomainError('列出任务失败', error)
    }
  }

  async updateTask(params: LarkTaskUpdateParams): Promise<LarkTaskUpdateResult> {
    const taskData: Record<string, unknown> = {}
    const updateFields: string[] = []

    if (params.summary !== undefined) {
      taskData.summary = params.summary
      updateFields.push('summary')
    }
    if (params.description !== undefined) {
      taskData.description = params.description
      updateFields.push('description')
    }
    if (params.dueTime !== undefined) {
      taskData.due = { timestamp: params.dueTime }
      updateFields.push('due')
    }
    if (params.completed !== undefined) {
      taskData.completed_at = params.completed ? String(Date.now()) : '0'
      updateFields.push('completed_at')
    }

    try {
      const response = await this.client.requestOrThrow<Record<string, unknown>>(
        'PATCH',
        `/open-apis/task/v2/tasks/${params.taskGuid}`,
        { task: taskData, update_fields: updateFields },
      )
      const data = (response.data ?? {}) as Record<string, unknown>
      const task = (data.task ?? {}) as Record<string, unknown>
      return {
        taskGuid: (task.guid as string) ?? params.taskGuid,
        summary: task.summary as string | undefined,
        raw: response,
      }
    } catch (error) {
      throw wrapDomainError('更新任务失败', error)
    }
  }
}

function toTaskSummary(item: Record<string, unknown>): LarkTaskSummary {
  const due = item.due as Record<string, unknown> | undefined
  return {
    taskGuid: (item.guid as string) ?? '',
    summary: (item.summary as string) ?? '',
    description: item.description as string | undefined,
    dueTime: due?.timestamp as string | undefined,
    completedAt: item.completed_at as string | undefined,
    status: item.completed_at ? 'completed' : 'todo',
  }
}
