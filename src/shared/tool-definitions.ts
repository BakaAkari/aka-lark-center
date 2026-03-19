import type { LarkToolDefinition } from './types.js'

export const LARK_TOOL_DEFINITIONS: LarkToolDefinition[] = [
  {
    name: 'lark_doc_create',
    description: 'Create a new Lark docx document, optionally with initial content.',
    usage: 'Use this when the user wants a new Feishu document. contentType defaults to plain_text. When content is provided, it is appended immediately after document creation. In a Lark user session, the tool can optionally transfer document ownership to the requester.',
    riskLevel: 'medium',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Document title.',
        },
        folderToken: {
          type: 'string',
          description: 'Optional folder token. If omitted, the document is created in the default allowed location.',
        },
        content: {
          type: 'string',
          description: 'Optional initial content to append after creation.',
        },
        contentType: {
          type: 'string',
          description: 'Initial content type.',
          enum: ['plain_text', 'markdown', 'html'],
        },
        transferOwnership: {
          type: 'boolean',
          description: 'Whether to transfer the new document owner to the current Lark requester. Defaults to the plugin config behavior.',
        },
        stayPut: {
          type: 'boolean',
          description: 'Whether the document should stay in place after ownership transfer.',
        },
        retainedBotPermission: {
          type: 'string',
          description: 'Permission retained for the bot after ownership transfer.',
          enum: ['view', 'edit', 'full_access'],
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'lark_doc_read_content',
    description: 'Read the plain text content of a Lark docx document.',
    usage: 'Use this when the user wants to inspect or summarize an existing Feishu document. Returns the document plain text content rendered by the Lark raw_content API.',
    riskLevel: 'low',
    inputSchema: {
      type: 'object',
      properties: {
        documentId: {
          type: 'string',
          description: 'Target document_id.',
        },
      },
      required: ['documentId'],
    },
  },
  {
    name: 'lark_doc_append_content',
    description: 'Append content to an existing Lark docx document.',
    usage: 'Use this to write or continue writing a document. plain_text is safest. markdown and html are supported through Feishu doc conversion.',
    riskLevel: 'medium',
    inputSchema: {
      type: 'object',
      properties: {
        documentId: {
          type: 'string',
          description: 'Target document_id.',
        },
        content: {
          type: 'string',
          description: 'Content to append.',
        },
        contentType: {
          type: 'string',
          description: 'Content type for conversion.',
          enum: ['plain_text', 'markdown', 'html'],
        },
        parentBlockId: {
          type: 'string',
          description: 'Optional parent block id. If omitted, content is appended to the document root page block.',
        },
        index: {
          type: 'number',
          description: 'Optional insertion index within the parent block children.',
        },
      },
      required: ['documentId', 'content'],
    },
  },
  {
    name: 'lark_list_chats',
    description: 'List chats and groups the current Lark app can access.',
    usage: 'Use this before sending a message when you need to discover a target chat_id.',
    riskLevel: 'low',
    inputSchema: {
      type: 'object',
      properties: {
        pageSize: {
          type: 'number',
          description: 'Optional page size from 1 to 100. Defaults to 20.',
        },
        pageToken: {
          type: 'string',
          description: 'Optional pagination token returned by a previous call.',
        },
      },
    },
  },
  {
    name: 'lark_send_message',
    description: 'Send a message to a Lark chat or user.',
    usage: 'For plain text, pass content as normal text. For post or interactive messages, set json=true and provide content as Lark message content JSON.',
    riskLevel: 'medium',
    inputSchema: {
      type: 'object',
      properties: {
        receiveId: {
          type: 'string',
          description: 'Target identifier such as chat_id, open_id, user_id, union_id, or email.',
        },
        receiveIdType: {
          type: 'string',
          description: 'Type of receiveId. Defaults to the plugin config value.',
          enum: ['chat_id', 'open_id', 'user_id', 'union_id', 'email'],
        },
        messageType: {
          type: 'string',
          description: 'Lark msg_type. Defaults to text.',
        },
        content: {
          type: 'string',
          description: 'Message content. Text for text messages, or Lark content JSON string when json=true.',
        },
        json: {
          type: 'boolean',
          description: 'Whether content should be treated as Lark content JSON.',
        },
      },
      required: ['receiveId', 'content'],
    },
  },
  {
    name: 'lark_message_reply',
    description: 'Reply to an existing Lark message.',
    usage: 'Use this when the user wants to respond to a specific message. For non-text replies, set json=true and provide Lark content JSON.',
    riskLevel: 'medium',
    inputSchema: {
      type: 'object',
      properties: {
        messageId: {
          type: 'string',
          description: 'Target open_message_id to reply to.',
        },
        content: {
          type: 'string',
          description: 'Reply content. Text for text replies, or Lark content JSON when json=true.',
        },
        messageType: {
          type: 'string',
          description: 'Lark msg_type. Defaults to text.',
        },
        json: {
          type: 'boolean',
          description: 'Whether content should be treated as Lark content JSON.',
        },
        replyInThread: {
          type: 'boolean',
          description: 'Whether to reply in thread when supported.',
        },
      },
      required: ['messageId', 'content'],
    },
  },
  {
    name: 'lark_message_add_reaction',
    description: 'Add an emoji reaction to a Lark message.',
    usage: 'Use this when the user wants to react to a message with a Feishu emoji type.',
    riskLevel: 'low',
    inputSchema: {
      type: 'object',
      properties: {
        messageId: {
          type: 'string',
          description: 'Target open_message_id.',
        },
        emojiType: {
          type: 'string',
          description: 'Feishu emoji type, for example OK, THUMBSUP, SMILE, JOY, HEART.',
        },
      },
      required: ['messageId', 'emojiType'],
    },
  },
  {
    name: 'lark_raw_api_request',
    description: 'Call any authorized Lark OpenAPI endpoint directly.',
    usage: 'Advanced tool. Prefer specialized tools when available. Paths may be written as /open-apis/... or module/version/resource.',
    riskLevel: 'high',
    inputSchema: {
      type: 'object',
      properties: {
        method: {
          type: 'string',
          description: 'HTTP method.',
          enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        },
        path: {
          type: 'string',
          description: 'OpenAPI path like /open-apis/im/v1/chats or docx/v1/documents/<id>.',
        },
        payload: {
          type: 'object',
          description: 'Optional request body. Pass an object directly, or a JSON string when json=true.',
        },
        json: {
          type: 'boolean',
          description: 'If payload is a string, parse it as JSON before sending.',
        },
      },
      required: ['method', 'path'],
    },
  },
]
