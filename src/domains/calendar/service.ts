import { LarkApiClient } from '../../client/request.js'
import { wrapDomainError } from '../../shared/errors.js'
import type {
  LarkCalendarCreateEventParams,
  LarkCalendarCreateEventResult,
  LarkCalendarEventSummary,
  LarkCalendarListEventsParams,
  LarkCalendarListEventsResult,
  LarkCalendarUpdateEventParams,
  LarkCalendarUpdateEventResult,
} from '../../shared/types.js'

// The primary calendar ID used when no calendarId is specified.
const PRIMARY_CALENDAR_ID = 'primary'

export class LarkCalendarService {
  constructor(private readonly client: LarkApiClient) {}

  async listEvents(params: LarkCalendarListEventsParams): Promise<LarkCalendarListEventsResult> {
    const calendarId = params.calendarId ?? PRIMARY_CALENDAR_ID
    const query: Record<string, string> = {}
    if (params.startTime) query.start_time = params.startTime
    if (params.endTime) query.end_time = params.endTime
    if (params.pageSize) query.page_size = String(Math.min(params.pageSize, 500))
    if (params.pageToken) query.page_token = params.pageToken

    try {
      const response = await this.client.requestOrThrow<Record<string, unknown>>(
        'GET',
        `/open-apis/calendar/v4/calendars/${calendarId}/events`,
        undefined,
        query,
      )
      const data = (response.data ?? {}) as Record<string, unknown>
      const rawItems = (data.items as Record<string, unknown>[] | undefined) ?? []
      return {
        items: rawItems.map(toEventSummary),
        hasMore: Boolean(data.has_more),
        nextPageToken: data.page_token as string | undefined,
        raw: response,
      }
    } catch (error) {
      throw wrapDomainError('列出日历日程失败', error)
    }
  }

  async createEvent(params: LarkCalendarCreateEventParams): Promise<LarkCalendarCreateEventResult> {
    const calendarId = params.calendarId ?? PRIMARY_CALENDAR_ID
    const body: Record<string, unknown> = {
      summary: params.summary,
      start_time: { timestamp: params.startTime },
      end_time: { timestamp: params.endTime },
    }
    if (params.description) body.description = params.description
    if (params.location) body.location = { name: params.location }
    if (typeof params.needNotification === 'boolean') body.need_notification = params.needNotification

    try {
      const response = await this.client.requestOrThrow<Record<string, unknown>>(
        'POST',
        `/open-apis/calendar/v4/calendars/${calendarId}/events`,
        body,
      )
      const data = (response.data ?? {}) as Record<string, unknown>
      const event = (data.event ?? {}) as Record<string, unknown>
      return {
        eventId: (event.event_id as string) ?? '',
        summary: event.summary as string | undefined,
        startTime: extractTimestamp(event.start_time),
        endTime: extractTimestamp(event.end_time),
        raw: response,
      }
    } catch (error) {
      throw wrapDomainError('创建日历日程失败', error)
    }
  }

  async updateEvent(params: LarkCalendarUpdateEventParams): Promise<LarkCalendarUpdateEventResult> {
    const calendarId = params.calendarId ?? PRIMARY_CALENDAR_ID
    const body: Record<string, unknown> = {}
    if (params.summary) body.summary = params.summary
    if (params.description) body.description = params.description
    if (params.startTime) body.start_time = { timestamp: params.startTime }
    if (params.endTime) body.end_time = { timestamp: params.endTime }
    if (params.location) body.location = { name: params.location }
    if (typeof params.needNotification === 'boolean') body.need_notification = params.needNotification

    try {
      const response = await this.client.requestOrThrow<Record<string, unknown>>(
        'PATCH',
        `/open-apis/calendar/v4/calendars/${calendarId}/events/${params.eventId}`,
        body,
      )
      const data = (response.data ?? {}) as Record<string, unknown>
      const event = (data.event ?? {}) as Record<string, unknown>
      return {
        eventId: (event.event_id as string) ?? params.eventId,
        summary: event.summary as string | undefined,
        startTime: extractTimestamp(event.start_time),
        endTime: extractTimestamp(event.end_time),
        raw: response,
      }
    } catch (error) {
      throw wrapDomainError('更新日历日程失败', error)
    }
  }
}

function toEventSummary(item: Record<string, unknown>): LarkCalendarEventSummary {
  return {
    eventId: (item.event_id as string) ?? '',
    summary: item.summary as string | undefined,
    description: item.description as string | undefined,
    startTime: extractTimestamp(item.start_time),
    endTime: extractTimestamp(item.end_time),
    status: item.status as string | undefined,
    location: extractLocationName(item.location),
  }
}

function extractTimestamp(timeObj: unknown): string | undefined {
  if (!timeObj || typeof timeObj !== 'object') return undefined
  const t = timeObj as Record<string, unknown>
  return (t.timestamp as string | undefined) ?? (t.date as string | undefined)
}

function extractLocationName(loc: unknown): string | undefined {
  if (!loc || typeof loc !== 'object') return undefined
  return ((loc as Record<string, unknown>).name as string | undefined)
}
