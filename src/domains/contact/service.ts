import { LarkApiClient } from '../../client/request.js'
import { wrapDomainError } from '../../shared/errors.js'
import type {
  LarkContactGetUserParams,
  LarkContactGetUserResult,
  LarkContactSearchUserParams,
  LarkContactSearchUserResult,
  LarkUserProfile,
} from '../../shared/types.js'

export class LarkContactService {
  constructor(private readonly client: LarkApiClient) {}

  async getUser(params: LarkContactGetUserParams): Promise<LarkContactGetUserResult> {
    try {
      const response = await this.client.requestOrThrow<Record<string, unknown>>(
        'GET',
        `/open-apis/contact/v3/users/${params.openId}`,
        undefined,
        { user_id_type: 'open_id' },
      )
      const data = (response.data ?? {}) as Record<string, unknown>
      const user = (data.user ?? {}) as Record<string, unknown>
      return {
        user: toUserProfile(user),
        raw: response,
      }
    } catch (error) {
      throw wrapDomainError('获取用户信息失败', error)
    }
  }

  async searchUser(params: LarkContactSearchUserParams): Promise<LarkContactSearchUserResult> {
    // find_by_department lists users under a department; root department ID is '0'
    const departmentId = params.departmentId ?? '0'
    const query: Record<string, string> = {
      department_id: departmentId,
      user_id_type: 'open_id',
    }
    if (params.pageSize) query.page_size = String(Math.min(params.pageSize, 200))
    if (params.pageToken) query.page_token = params.pageToken

    try {
      const response = await this.client.requestOrThrow<Record<string, unknown>>(
        'GET',
        '/open-apis/contact/v3/users/find_by_department',
        undefined,
        query,
      )
      const data = (response.data ?? {}) as Record<string, unknown>
      const rawItems = (data.items as Record<string, unknown>[] | undefined) ?? []
      return {
        items: rawItems.map(toUserProfile),
        hasMore: Boolean(data.has_more),
        nextPageToken: data.page_token as string | undefined,
        raw: response,
      }
    } catch (error) {
      throw wrapDomainError('搜索用户失败', error)
    }
  }
}

function toUserProfile(user: Record<string, unknown>): LarkUserProfile {
  const avatar = user.avatar as Record<string, unknown> | undefined
  const deptIds = user.department_ids as string[] | undefined
  return {
    openId: user.open_id as string | undefined,
    userId: user.user_id as string | undefined,
    name: user.name as string | undefined,
    enName: user.en_name as string | undefined,
    email: user.email as string | undefined,
    mobile: user.mobile as string | undefined,
    department: deptIds?.[0],
    jobTitle: user.job_title as string | undefined,
    avatar: avatar?.avatar_72 as string | undefined,
  }
}
