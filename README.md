# koishi-plugin-aka-lark-center

在 Koishi 中调用飞书 / Lark OpenAPI 的能力中心插件。

它现在不只是命令网关，也提供一层可以被其他插件复用的 service API，并内置可选的 ChatLuna 工具桥接，适合作为 ChatLuna、YesImBot 或其他 LLM 插件的飞书工具后端。

## Positioning

推荐把它理解成三层里的中间层：

- `aka-adapter-lark`: 飞书消息接入层，负责事件、会话、发收消息适配
- `aka-lark-center`: 飞书能力层，负责认证、OpenAPI 调用、工具封装，以及可选的 ChatLuna 工具桥接
- 其他 LLM 系统: 可以继续复用 `aka-lark-center` 暴露的 service API 或工具定义

也就是说，`aka-lark-center` 的目标不是替代 adapter，而是给所有 LLM 插件提供一套统一的飞书工具接口。

## Features

- 自动获取并缓存 `tenant_access_token`
- 支持创建、读取飞书文档并追加内容
- 支持 `chat_id / open_id / user_id / union_id / email` 发送消息
- 支持回复指定消息和添加消息表情回复
- 内置 `raw` 命令，可调用任意已授权的飞书 OpenAPI
- 基于 Koishi authority 和白名单做权限控制
- 提供 `ctx.larkCenter` service，供其他插件直接调用
- 导出稳定的工具定义元数据，方便桥接到 LLM tool 系统
- 支持通过总开关控制 ChatLuna 工具注册与卸载

## Config

- `baseUrl`: 默认 `https://open.feishu.cn`
- `appId`: 飞书应用 App ID
- `appSecret`: 飞书应用 App Secret
- `timeout`: 请求超时，默认 `30000`
- `tokenRefreshBufferSeconds`: 提前刷新 token 的秒数，默认 `120`
- `commandName`: 主命令名，默认 `lark`
- `minAuthority`: 最小 authority，默认 `4`
- `allowedUsers`: 额外允许的用户列表，支持 `userId` 或 `platform:userId`
- `defaultReceiveIdType`: 默认消息目标类型，默认 `chat_id`
- `maxResponseLength`: 命令输出最大长度，默认 `4000`
- `logApiFailures`: 是否输出 OpenAPI 失败日志，默认 `true`
- `chatlunaEnabled`: 是否启用内置 ChatLuna 工具桥接，默认 `false`

## Commands

```text
lark.ping
lark.chat.list
lark.doc.create <title> [content]
lark.doc.read <documentId>
lark.doc.append <documentId> <content>
lark.message.send <receiveId> <content>
lark.message.reply <messageId> <content>
lark.message.reaction.add <messageId> <emojiType>
lark.raw <method> <path> [payload]
lark.tool.list
```

## Service API

插件会向 Koishi Context 暴露 `ctx.larkCenter`。

目前已经稳定下来的基础方法有：

- `ctx.larkCenter.ping()`
- `ctx.larkCenter.listChats({ pageSize, pageToken })`
- `ctx.larkCenter.createDocument({ title, folderToken, content, contentType })`
- `ctx.larkCenter.readDocumentContent({ documentId })`
- `ctx.larkCenter.appendDocumentContent({ documentId, content, contentType, parentBlockId, index })`
- `ctx.larkCenter.sendMessage({ receiveId, receiveIdType, messageType, content, json })`
- `ctx.larkCenter.replyMessage({ messageId, content, messageType, json, replyInThread })`
- `ctx.larkCenter.addMessageReaction({ messageId, emojiType })`
- `ctx.larkCenter.rawRequest({ method, path, payload, json })`
- `ctx.larkCenter.getToolDefinitions()`
- `ctx.larkCenter.getPermissionError({ userId, platform, authority })`

示例：

```ts
await ctx.larkCenter.sendMessage({
  receiveId: 'oc_xxx',
  receiveIdType: 'chat_id',
  content: 'hello from tool layer',
})
```

## Tool Definitions

插件导出了一组面向 LLM bridge 的工具定义：

- `lark_doc_create`
- `lark_doc_read_content`
- `lark_doc_append_content`
- `lark_list_chats`
- `lark_send_message`
- `lark_message_reply`
- `lark_message_add_reaction`
- `lark_raw_api_request`

这些定义的目标是让桥接层不需要再手写飞书参数说明，而是可以直接读取：

- 工具名
- 描述
- 建议用法
- 风险等级
- 输入 schema

当前建议：

- 默认给 LLM 暴露 `lark_list_chats` 和 `lark_send_message`
- 文档场景下优先使用 `lark_doc_create`、`lark_doc_read_content` 和 `lark_doc_append_content`
- 对聊天交互增强，优先使用 `lark_message_reply` 和 `lark_message_add_reaction`
- `lark_raw_api_request` 只在高级场景开放
- 文档、知识库、Bitable、emoji、reaction 之类能力，后续逐步补成专用工具，不建议长期只靠 raw API

## Built-in ChatLuna Bridge

当 `chatlunaEnabled` 为 `true` 时，插件会尝试在运行时对接 ChatLuna，并注册以下工具：

- `lark_list_chats`
- `lark_doc_create`
- `lark_doc_read_content`
- `lark_doc_append_content`
- `lark_send_message`
- `lark_message_reply`
- `lark_message_add_reaction`
- `lark_raw_api_request`

当 `chatlunaEnabled` 改为 `false` 时，插件会卸载自己注册的 ChatLuna 工具。

说明：

- 这里不需要给 `aka-lark-center` 新增 npm 依赖。
- 但运行环境里仍然需要已经安装并启用 ChatLuna，否则只会记录警告，不会影响插件主体工作。
- 这套桥接目前是内置的总开关控制，不需要额外新建一个插件包。

## Commands Usage

### 验证凭证

```text
lark.ping
```

### 列出会话

```text
lark.chat.list
lark.chat.list -s 50
lark.chat.list -t <page_token>
```

### 发送文本消息

```text
lark.message.send oc_xxx hello
lark.message.send -r open_id ou_xxx hello
```

默认发送 `text` 消息。

### 创建文档

```text
lark.doc.create 工作记录
lark.doc.create -c markdown 周报 # 本周总结
```

### 追加文档内容

```text
lark.doc.append doccnxxxx 这是追加的一段文本
lark.doc.append -c markdown doccnxxxx ## 新章节
```

### 读取文档内容

```text
lark.doc.read doccnxxxx
```

返回的是飞书 `raw_content` 接口提供的纯文本内容，适合给 LLM 做阅读、总结和继续编辑前的上下文获取。

### 回复消息

```text
lark.message.reply om_xxx 收到
lark.message.reply -t om_xxx 我会在线程里继续回复
```

### 添加消息表情回复

```text
lark.message.reaction.add om_xxx THUMBSUP
lark.message.reaction.add om_xxx OK
```

### 发送非 text 消息

对于 `post`、`interactive` 等非文本消息，使用 `-j` 传入 Lark 要求的 `content` JSON：

```text
lark.message.send -r chat_id -m post -j oc_xxx {"zh_cn":{"title":"标题","content":[[{"tag":"text","text":"内容"}]]}}
```

### 原始 OpenAPI 调用

路径支持两种写法：

- `/open-apis/im/v1/chats`
- `im/v1/chats`

示例：

```text
lark.raw GET /open-apis/im/v1/chats
lark.raw GET docx/v1/documents/<document_id>
lark.raw POST wiki/v2/spaces/get_node -j {"token":"wiki_token"}
```

### 查看工具定义

```text
lark.tool.list
```

## Notes

- 插件只负责 Koishi 到飞书 OpenAPI 的认证、转发和基础能力封装。
- 具体能操作哪些 Lark 内容，取决于你的飞书应用已经开通并审核通过的权限。
- 如果在飞书/Lark 用户会话中通过 ChatLuna 调用 `lark_doc_create`，并且插件开启了自动 owner 转交配置，创建后的文档会自动把 owner 转给当前请求者。
- 如果后续还要兼容非 ChatLuna 的 LLM 插件，优先复用 `ctx.larkCenter` 和工具定义，不要把飞书核心能力绑死在某一个 LLM 生态上。

## Scripts

```sh
pnpm build
pnpm typecheck
```

## Publish

```sh
pnpm run prepublishOnly
npm publish
```
