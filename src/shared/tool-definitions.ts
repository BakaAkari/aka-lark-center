import type { LarkToolDefinition } from './types.js'

export const LARK_TOOL_DEFINITIONS: LarkToolDefinition[] = [
  {
    name: 'lark_write_doc_create',
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
    name: 'lark_write_doc_transfer_owner',
    description: 'Transfer a Lark document owner to a target user.',
    usage: 'Use this when the user explicitly wants to transfer a document owner. In a Lark user session, ownerOpenId may be omitted to default to the current requester.',
    riskLevel: 'medium',
    inputSchema: {
      type: 'object',
      properties: {
        documentId: {
          type: 'string',
          description: 'Target document_id.',
        },
        ownerOpenId: {
          type: 'string',
          description: 'Target owner open_id. If omitted, the current Lark requester is used when available.',
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
      required: ['documentId'],
    },
  },
  {
    name: 'lark_read_doc',
    description: 'Read the plain text content of a Lark docx document.',
    usage: 'Use this when the user wants to inspect or summarize an existing Feishu document. The input may be a document token, a Feishu doc/docx URL, or a wiki URL that resolves to a doc/docx resource.',
    riskLevel: 'low',
    inputSchema: {
      type: 'object',
      properties: {
        documentId: {
          type: 'string',
          description: 'Target document token, document URL, wiki URL, or markdown link wrapping one of those URLs.',
        },
      },
      required: ['documentId'],
    },
  },
  {
    name: 'lark_write_doc_append',
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
    name: 'lark_read_file',
    description: 'Read the extracted text content of a Lark drive file.',
    usage: 'Use this when the user wants to inspect an uploaded text-like file from Feishu/Lark. This v1 capability currently supports text-like files only, such as txt, md, json, csv, ts, js, and other UTF-8 text content.',
    riskLevel: 'low',
    inputSchema: {
      type: 'object',
      properties: {
        fileToken: {
          type: 'string',
          description: 'Target file token.',
        },
        fileName: {
          type: 'string',
          description: 'Optional file name used to help infer the extension.',
        },
        mimeType: {
          type: 'string',
          description: 'Optional MIME type used to help infer whether the file is text-like.',
        },
      },
      required: ['fileToken'],
    },
  },
  {
    name: 'lark_read_context_file',
    description: 'Read a file attachment from the current message context or quoted message context.',
    usage: 'Use this when the user says things like "read this file" or replies to a file message. The tool inspects the current session context and only auto-selects the file when there is exactly one attachment candidate. If both current and quoted messages contain files, set source explicitly to current or quote.',
    riskLevel: 'low',
    inputSchema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'Which message context to inspect.',
          enum: ['auto', 'current', 'quote'],
        },
        fileName: {
          type: 'string',
          description: 'Optional file name hint for type detection.',
        },
        mimeType: {
          type: 'string',
          description: 'Optional MIME type hint for type detection.',
        },
      },
    },
  },
  {
    name: 'lark_query_docs_search',
    description: 'Search Feishu drive documents by keyword.',
    usage: 'Use this when the user asks to find a document, sheet, or related resource by name. Leave docsTypes, ownerIds, and chatIds unset unless the user explicitly wants those filters. When provided, they should be comma-separated strings.',
    riskLevel: 'low',
    inputSchema: {
      type: 'object',
      properties: {
        searchKey: {
          type: 'string',
          description: 'Search keyword.',
        },
        count: {
          type: 'number',
          description: 'Maximum number of results to return. Defaults to 10.',
        },
        offset: {
          type: 'number',
          description: 'Search offset for pagination. Defaults to 0.',
        },
        docsTypes: {
          type: 'string',
          description: 'Optional comma-separated document types such as docx,sheet,bitable,file,wiki.',
        },
        ownerIds: {
          type: 'string',
          description: 'Optional comma-separated owner IDs.',
        },
        chatIds: {
          type: 'string',
          description: 'Optional comma-separated chat IDs.',
        },
      },
      required: ['searchKey'],
    },
  },
  {
    name: 'lark_query_drive_root',
    description: 'Get the current accessible root folder in Feishu drive.',
    usage: 'Use this before folder browsing when you need a starting folder token for drive discovery.',
    riskLevel: 'low',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'lark_query_drive_list',
    description: 'List files and folders under a Feishu drive folder.',
    usage: 'Use this to browse the current accessible drive tree. If folderToken is omitted, the tool lists the current root folder contents.',
    riskLevel: 'low',
    inputSchema: {
      type: 'object',
      properties: {
        folderToken: {
          type: 'string',
          description: 'Optional target folder token. If omitted, the current root folder is used.',
        },
        pageSize: {
          type: 'number',
          description: 'Optional page size from 1 to 200. Defaults to 20.',
        },
        pageToken: {
          type: 'string',
          description: 'Optional pagination token returned by a previous call.',
        },
      },
    },
  },
  {
    name: 'lark_query_docs_lookup',
    description: 'Search Feishu documents in the current authorized scope and automatically read the top readable candidates.',
    usage: 'Use this when the user asks a natural-language question about content that may exist in accessible Feishu documents. The tool searches first, then automatically reads the top doc/docx/wiki candidates and returns both candidate metadata and readable context. Leave docsTypes unset unless the user explicitly asks to limit document types.',
    riskLevel: 'low',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural-language query or search phrase.',
        },
        count: {
          type: 'number',
          description: 'Maximum number of search candidates to return. Defaults to 10.',
        },
        offset: {
          type: 'number',
          description: 'Search offset for pagination. Defaults to 0.',
        },
        docsTypes: {
          type: 'string',
          description: 'Optional comma-separated document types such as docx,wiki,sheet,file.',
        },
        ownerIds: {
          type: 'string',
          description: 'Optional comma-separated owner IDs.',
        },
        chatIds: {
          type: 'string',
          description: 'Optional comma-separated chat IDs.',
        },
        readTopK: {
          type: 'number',
          description: 'How many readable doc/docx/wiki candidates to auto-read. Defaults to 1.',
        },
        maxContentLength: {
          type: 'number',
          description: 'Maximum characters to keep for each auto-read document context.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'lark_query_wiki_spaces',
    description: 'List wiki or knowledge spaces accessible to the current app.',
    usage: 'Use this before deeper wiki traversal when you need to discover a target space_id.',
    riskLevel: 'low',
    inputSchema: {
      type: 'object',
      properties: {
        pageSize: {
          type: 'number',
          description: 'Optional page size from 1 to 50. Defaults to 20.',
        },
        pageToken: {
          type: 'string',
          description: 'Optional pagination token returned by a previous call.',
        },
      },
    },
  },
  {
    name: 'lark_query_wiki_node',
    description: 'Get metadata for a wiki node by token.',
    usage: 'Use this when you already have a wiki token and want to inspect the mapped object token, object type, or parent/space relationships.',
    riskLevel: 'low',
    inputSchema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'Wiki node token.',
        },
      },
      required: ['token'],
    },
  },
  {
    name: 'lark_query_wiki_children',
    description: 'List child nodes under a wiki space or a specific parent node.',
    usage: 'Use this to browse wiki structure. If parentNodeToken is omitted, the tool lists top-level nodes for the space.',
    riskLevel: 'low',
    inputSchema: {
      type: 'object',
      properties: {
        spaceId: {
          type: 'string',
          description: 'Target wiki space ID.',
        },
        parentNodeToken: {
          type: 'string',
          description: 'Optional parent node token.',
        },
        pageSize: {
          type: 'number',
          description: 'Optional page size from 1 to 50. Defaults to 20.',
        },
        pageToken: {
          type: 'string',
          description: 'Optional pagination token returned by a previous call.',
        },
      },
      required: ['spaceId'],
    },
  },
  {
    name: 'lark_query_chat_list',
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
    name: 'lark_message_send',
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
    name: 'lark_message_reaction_add',
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
    name: 'lark_system_raw_api',
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
  {
    name: 'lark_read_doc_blocks',
    description: 'List the block structure of a Lark docx document, including block IDs, types, parent relationships, and extracted text.',
    usage: 'Use this before editing or deleting specific paragraphs in a document. The result provides blockId and the index position of each block within its parent, which are required by lark_write_doc_delete_blocks and lark_write_doc_append. Paginate with pageToken when hasMore is true.',
    riskLevel: 'low',
    inputSchema: {
      type: 'object',
      properties: {
        documentId: {
          type: 'string',
          description: 'Target document_id.',
        },
        pageSize: {
          type: 'number',
          description: 'Optional page size from 1 to 200. Defaults to 50.',
        },
        pageToken: {
          type: 'string',
          description: 'Optional pagination token returned by a previous call.',
        },
      },
      required: ['documentId'],
    },
  },
  {
    name: 'lark_message_update',
    description: 'Edit the content of an existing Lark message. Only text and post message types are supported by the Feishu API.',
    usage: 'Use this when the user wants to correct or update a previously sent message. The message must have been sent by the current bot. Only text and post types can be edited; interactive card messages must use lark_system_raw_api with the patch endpoint instead.',
    riskLevel: 'medium',
    inputSchema: {
      type: 'object',
      properties: {
        messageId: {
          type: 'string',
          description: 'Target open_message_id to edit.',
        },
        content: {
          type: 'string',
          description: 'New message content. Plain text for text messages, or Lark content JSON when json=true.',
        },
        messageType: {
          type: 'string',
          description: 'Lark msg_type. Defaults to text. Only text and post are supported.',
        },
        json: {
          type: 'boolean',
          description: 'Whether content should be treated as Lark content JSON.',
        },
      },
      required: ['messageId', 'content'],
    },
  },
  {
    name: 'lark_message_delete',
    description: 'Recall (delete) a Lark message sent by the current bot.',
    usage: 'Use this when the user wants to withdraw or delete a previously sent message. Only messages sent by the current bot can be recalled.',
    riskLevel: 'high',
    inputSchema: {
      type: 'object',
      properties: {
        messageId: {
          type: 'string',
          description: 'Target open_message_id to recall.',
        },
      },
      required: ['messageId'],
    },
  },
  {
    name: 'lark_write_doc_delete_blocks',
    description: 'Delete a range of child blocks from a parent block in a Lark docx document.',
    usage: 'Use this to remove content blocks from a document. startIndex and endIndex are zero-based positions within the parent block children array. The range is [startIndex, endIndex), i.e. endIndex is exclusive. Use lark_write_doc_append result childBlockIds or lark_read_doc to identify the target parentBlockId first.',
    riskLevel: 'high',
    inputSchema: {
      type: 'object',
      properties: {
        documentId: {
          type: 'string',
          description: 'Target document_id.',
        },
        parentBlockId: {
          type: 'string',
          description: 'The parent block whose children will be deleted.',
        },
        startIndex: {
          type: 'number',
          description: 'Zero-based start index of the child range to delete (inclusive).',
        },
        endIndex: {
          type: 'number',
          description: 'Zero-based end index of the child range to delete (exclusive).',
        },
      },
      required: ['documentId', 'parentBlockId', 'startIndex', 'endIndex'],
    },
  },
  {
    name: 'lark_write_wiki_delete_node',
    description: 'Delete a wiki node (page) from a Feishu knowledge space.',
    usage: 'Use this when the user explicitly wants to remove a wiki page. Both spaceId and nodeToken are required. Use lark_query_wiki_spaces and lark_query_wiki_children to discover them first.',
    riskLevel: 'high',
    inputSchema: {
      type: 'object',
      properties: {
        spaceId: {
          type: 'string',
          description: 'Target wiki space ID.',
        },
        nodeToken: {
          type: 'string',
          description: 'Target wiki node token to delete.',
        },
      },
      required: ['spaceId', 'nodeToken'],
    },
  },
  // ── Bitable ────────────────────────────────────────────────────────────────
  {
    name: 'lark_bitable_list_tables',
    description: 'List all data tables in a Feishu Bitable (multi-dimensional spreadsheet) app.',
    usage: 'Use this to discover available tables in a Bitable app before querying or writing records. appToken is the Bitable app token from the URL.',
    riskLevel: 'low',
    inputSchema: {
      type: 'object',
      properties: {
        appToken: {
          type: 'string',
          description: 'Bitable app token.',
        },
        pageSize: {
          type: 'number',
          description: 'Number of tables per page (max 100).',
        },
        pageToken: {
          type: 'string',
          description: 'Pagination token from a previous response.',
        },
      },
      required: ['appToken'],
    },
  },
  {
    name: 'lark_bitable_query_records',
    description: 'Query records from a Feishu Bitable table with optional filter.',
    usage: 'Use this to read data from a Bitable table. Use lark_bitable_list_tables first to get the tableId. The filter parameter uses Bitable filter syntax.',
    riskLevel: 'low',
    inputSchema: {
      type: 'object',
      properties: {
        appToken: {
          type: 'string',
          description: 'Bitable app token.',
        },
        tableId: {
          type: 'string',
          description: 'Target table ID.',
        },
        pageSize: {
          type: 'number',
          description: 'Number of records per page (max 500).',
        },
        pageToken: {
          type: 'string',
          description: 'Pagination token from a previous response.',
        },
        filter: {
          type: 'string',
          description: 'Optional filter expression in Bitable filter syntax.',
        },
      },
      required: ['appToken', 'tableId'],
    },
  },
  {
    name: 'lark_bitable_create_record',
    description: 'Create a new record in a Feishu Bitable table.',
    usage: 'Use this to insert a new row into a Bitable table. fields is a JSON object mapping field names to values.',
    riskLevel: 'medium',
    inputSchema: {
      type: 'object',
      properties: {
        appToken: {
          type: 'string',
          description: 'Bitable app token.',
        },
        tableId: {
          type: 'string',
          description: 'Target table ID.',
        },
        fields: {
          type: 'object',
          description: 'Field values as a JSON object mapping field names to values.',
        },
      },
      required: ['appToken', 'tableId', 'fields'],
    },
  },
  {
    name: 'lark_bitable_update_record',
    description: 'Update an existing record in a Feishu Bitable table.',
    usage: 'Use this to modify an existing row in a Bitable table. recordId identifies the row to update. fields contains only the fields to change.',
    riskLevel: 'medium',
    inputSchema: {
      type: 'object',
      properties: {
        appToken: {
          type: 'string',
          description: 'Bitable app token.',
        },
        tableId: {
          type: 'string',
          description: 'Target table ID.',
        },
        recordId: {
          type: 'string',
          description: 'Record ID to update.',
        },
        fields: {
          type: 'object',
          description: 'Field values to update as a JSON object.',
        },
      },
      required: ['appToken', 'tableId', 'recordId', 'fields'],
    },
  },
  // ── Calendar ───────────────────────────────────────────────────────────────
  {
    name: 'lark_calendar_list_events',
    description: 'List calendar events from a Feishu calendar.',
    usage: 'Use this to read upcoming or past events. calendarId defaults to the primary calendar. startTime and endTime are Unix timestamps (seconds) as strings.',
    riskLevel: 'low',
    inputSchema: {
      type: 'object',
      properties: {
        calendarId: {
          type: 'string',
          description: 'Calendar ID. Defaults to the primary calendar if omitted.',
        },
        startTime: {
          type: 'string',
          description: 'Start of time range as Unix timestamp string (seconds).',
        },
        endTime: {
          type: 'string',
          description: 'End of time range as Unix timestamp string (seconds).',
        },
        pageSize: {
          type: 'number',
          description: 'Number of events per page.',
        },
        pageToken: {
          type: 'string',
          description: 'Pagination token from a previous response.',
        },
      },
      required: [],
    },
  },
  {
    name: 'lark_calendar_create_event',
    description: 'Create a new event in a Feishu calendar.',
    usage: 'Use this to schedule a meeting or event. startTime and endTime are Unix timestamps (seconds) as strings. calendarId defaults to the primary calendar.',
    riskLevel: 'medium',
    inputSchema: {
      type: 'object',
      properties: {
        calendarId: {
          type: 'string',
          description: 'Calendar ID. Defaults to the primary calendar if omitted.',
        },
        summary: {
          type: 'string',
          description: 'Event title.',
        },
        description: {
          type: 'string',
          description: 'Event description.',
        },
        startTime: {
          type: 'string',
          description: 'Event start time as Unix timestamp string (seconds).',
        },
        endTime: {
          type: 'string',
          description: 'Event end time as Unix timestamp string (seconds).',
        },
        location: {
          type: 'string',
          description: 'Event location name.',
        },
        needNotification: {
          type: 'boolean',
          description: 'Whether to send notification to attendees.',
        },
      },
      required: ['summary', 'startTime', 'endTime'],
    },
  },
  {
    name: 'lark_calendar_update_event',
    description: 'Update an existing event in a Feishu calendar.',
    usage: 'Use this to modify an existing calendar event. eventId is required. Only provide the fields you want to change.',
    riskLevel: 'medium',
    inputSchema: {
      type: 'object',
      properties: {
        calendarId: {
          type: 'string',
          description: 'Calendar ID. Defaults to the primary calendar if omitted.',
        },
        eventId: {
          type: 'string',
          description: 'Event ID to update.',
        },
        summary: {
          type: 'string',
          description: 'New event title.',
        },
        description: {
          type: 'string',
          description: 'New event description.',
        },
        startTime: {
          type: 'string',
          description: 'New start time as Unix timestamp string (seconds).',
        },
        endTime: {
          type: 'string',
          description: 'New end time as Unix timestamp string (seconds).',
        },
        location: {
          type: 'string',
          description: 'New event location name.',
        },
        needNotification: {
          type: 'boolean',
          description: 'Whether to send notification to attendees.',
        },
      },
      required: ['eventId'],
    },
  },
  // ── Task ───────────────────────────────────────────────────────────────────
  {
    name: 'lark_task_create',
    description: 'Create a new task in Feishu Tasks.',
    usage: 'Use this to create a to-do or task item. dueTime is a Unix timestamp in milliseconds as a string. assigneeOpenIds is a list of open_ids of assignees.',
    riskLevel: 'medium',
    inputSchema: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'Task title.',
        },
        description: {
          type: 'string',
          description: 'Task description.',
        },
        dueTime: {
          type: 'string',
          description: 'Due time as Unix timestamp string (milliseconds).',
        },
        assigneeOpenIds: {
          type: 'string',
          description: 'Comma-separated list of assignee open_ids.',
        },
      },
      required: ['summary'],
    },
  },
  {
    name: 'lark_task_list',
    description: 'List tasks from Feishu Tasks.',
    usage: 'Use this to retrieve the current user\'s task list. Set completed=true to list completed tasks.',
    riskLevel: 'low',
    inputSchema: {
      type: 'object',
      properties: {
        pageSize: {
          type: 'number',
          description: 'Number of tasks per page (max 100).',
        },
        pageToken: {
          type: 'string',
          description: 'Pagination token from a previous response.',
        },
        completed: {
          type: 'boolean',
          description: 'If true, list completed tasks. If false or omitted, list incomplete tasks.',
        },
      },
      required: [],
    },
  },
  {
    name: 'lark_task_update',
    description: 'Update an existing task in Feishu Tasks.',
    usage: 'Use this to modify a task. taskGuid is required. Set completed=true to mark the task as done.',
    riskLevel: 'medium',
    inputSchema: {
      type: 'object',
      properties: {
        taskGuid: {
          type: 'string',
          description: 'Task GUID to update.',
        },
        summary: {
          type: 'string',
          description: 'New task title.',
        },
        description: {
          type: 'string',
          description: 'New task description.',
        },
        dueTime: {
          type: 'string',
          description: 'New due time as Unix timestamp string (milliseconds).',
        },
        completed: {
          type: 'boolean',
          description: 'Set to true to mark the task as completed.',
        },
      },
      required: ['taskGuid'],
    },
  },
  // ── IM additions ──────────────────────────────────────────────────────────
  {
    name: 'lark_message_list',
    description: 'List messages in a Feishu chat.',
    usage: 'Use this to read message history from a chat. chatId is the group or P2P chat ID. startTime and endTime are Unix timestamps (seconds) as strings.',
    riskLevel: 'low',
    inputSchema: {
      type: 'object',
      properties: {
        chatId: {
          type: 'string',
          description: 'Chat ID (group or P2P).',
        },
        startTime: {
          type: 'string',
          description: 'Start of time range as Unix timestamp string (seconds).',
        },
        endTime: {
          type: 'string',
          description: 'End of time range as Unix timestamp string (seconds).',
        },
        sortType: {
          type: 'string',
          description: 'Sort order: ByCreateTimeAsc or ByCreateTimeDesc.',
          enum: ['ByCreateTimeAsc', 'ByCreateTimeDesc'],
        },
        pageSize: {
          type: 'number',
          description: 'Number of messages per page (max 50).',
        },
        pageToken: {
          type: 'string',
          description: 'Pagination token from a previous response.',
        },
      },
      required: ['chatId'],
    },
  },
  {
    name: 'lark_message_reaction_delete',
    description: 'Delete a reaction (emoji) from a Feishu message.',
    usage: 'Use this to remove a specific emoji reaction from a message. Both messageId and reactionId are required. Use lark_message_reaction_add response to get the reactionId.',
    riskLevel: 'medium',
    inputSchema: {
      type: 'object',
      properties: {
        messageId: {
          type: 'string',
          description: 'Target message ID.',
        },
        reactionId: {
          type: 'string',
          description: 'Reaction ID to delete.',
        },
      },
      required: ['messageId', 'reactionId'],
    },
  },
  // ── Contact ────────────────────────────────────────────────────────────────
  {
    name: 'lark_contact_get_user',
    description: 'Get detailed profile information for a Feishu user by open_id.',
    usage: 'Use this to look up a specific user\'s name, email, department, and other profile fields. openId is the user\'s open_id.',
    riskLevel: 'low',
    inputSchema: {
      type: 'object',
      properties: {
        openId: {
          type: 'string',
          description: 'User open_id.',
        },
      },
      required: ['openId'],
    },
  },
  {
    name: 'lark_contact_search_user',
    description: 'Search for Feishu users by keyword.',
    usage: 'Use this to find users by name or other attributes. Returns a paginated list of matching user profiles.',
    riskLevel: 'low',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search keyword (name, email, etc.).',
        },
        pageSize: {
          type: 'number',
          description: 'Number of results per page (max 200).',
        },
        pageToken: {
          type: 'string',
          description: 'Pagination token from a previous response.',
        },
      },
      required: ['query'],
    },
  },
  // ── Wiki additions ─────────────────────────────────────────────────────────
  {
    name: 'lark_write_wiki_create_node',
    description: 'Create a new wiki node (page) in a Feishu knowledge space.',
    usage: 'Use this to add a new page to a wiki space. spaceId and title are required. parentNodeToken places the page under a specific parent; omit to create at the root. objType defaults to docx.',
    riskLevel: 'medium',
    inputSchema: {
      type: 'object',
      properties: {
        spaceId: {
          type: 'string',
          description: 'Target wiki space ID.',
        },
        parentNodeToken: {
          type: 'string',
          description: 'Parent node token. Omit to create at the space root.',
        },
        title: {
          type: 'string',
          description: 'Page title.',
        },
        objType: {
          type: 'string',
          description: 'Document type for the new node.',
          enum: ['doc', 'docx', 'sheet', 'mindnote', 'bitable', 'file'],
        },
      },
      required: ['spaceId', 'title'],
    },
  },
]
