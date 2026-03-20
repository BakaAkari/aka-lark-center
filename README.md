# koishi-plugin-aka-lark-center

在 Koishi 中调用飞书 / Lark OpenAPI 的能力中心插件。

它现在不只是命令网关，也提供一层可以被其他插件复用的 service API，并内置可选的 ChatLuna 工具桥接，适合作为 ChatLuna、YesImBot 或其他 LLM 插件的飞书工具后端。

## Positioning

推荐把它理解成三层里的中间层：

- `aka-adapter-lark`: 飞书消息接入层，负责事件、会话、发收消息适配
- `aka-lark-center`: 飞书能力层，负责认证、OpenAPI 调用、工具封装，以及可选的 ChatLuna 工具桥接
- 其他 LLM 系统: 可以继续复用 `aka-lark-center` 暴露的 service API 或工具定义

也就是说，`aka-lark-center` 的目标不是替代 adapter，而是给所有 LLM 插件提供一套统一的飞书工具接口。

## Current Status

当前源码状态可以概括为：

- 已完成并对外可用：凭证校验、会话列表、消息发送/回复/reaction、文档创建/读取/追加、文档 owner 转移、文本类文件读取、raw OpenAPI 调用
- 已完成并可供插件复用：`ctx.larkCenter` service、按 domain 拆分的 `docs/drive/messages/files/bitable` 内部结构、稳定工具定义、可选 ChatLuna 工具桥接
- 已上线但范围有限：`files` 目前只保留文本类文件读取；额外格式和图片 OCR 的扩展因飞书内链、ChatLuna 与 LLM 通信链路问题暂时标记为待定；消息附件读取也只会在上下文唯一或显式指定来源时生效
- 已预留但未实现：`bitable` 一等 API 仍是骨架，暂不建议把它视为可用能力
- 当前阶段重点：优先推进资源搜索、知识空间 / wiki 查询、交互层优化，以及飞书项目接入方案设计

更细的开发现状和阶段记录见：

- [`docs/lark-center-doc/current-status.md`](../../docs/lark-center-doc/current-status.md)
- [`docs/lark-center-doc/phase-plan.md`](../../docs/lark-center-doc/phase-plan.md)

## Features

- 自动获取并缓存 `tenant_access_token`
- 支持创建、读取飞书文档并追加内容
- 支持创建后转移文档 owner，或单独执行 owner 转移
- 支持按 `fileToken` 读取飞书文本类文件内容
- 支持按“当前消息 / 引用消息”的上下文读取飞书文件附件内容
- 支持 `chat_id / open_id / user_id / union_id / email` 发送消息
- 支持回复指定消息和添加消息表情回复
- 内置 `raw` 命令，可调用任意已授权的飞书 OpenAPI
- 基于 Koishi authority 和白名单做权限控制
- 提供 `ctx.larkCenter` service，供其他插件直接调用
- 导出稳定的工具定义元数据，方便桥接到 LLM tool 系统
- 支持通过总开关控制 ChatLuna 工具注册与卸载
- 已内置文件读取域，可在 service 层下载并读取文本类文件

## Config

- `baseUrl`: 默认 `https://open.feishu.cn`
- `appId`: 飞书应用 App ID
- `appSecret`: 飞书应用 App Secret
- `timeout`: 请求超时，默认 `30000`
- `tokenRefreshBufferSeconds`: 提前刷新 token 的秒数，默认 `120`
- `commandName`: 主命令名，默认 `lark`
- `defaultReceiveIdType`: 默认消息目标类型，默认 `chat_id`
- `maxResponseLength`: 命令输出最大长度，默认 `4000`
- `autoTransferOwnershipToRequester`: 创建文档后是否自动把 owner 转给当前飞书用户，默认 `false`
- `retainedBotPermissionAfterOwnershipTransfer`: 转移 owner 后保留给 bot 的权限，默认 `edit`
- `transferOwnershipStayPut`: 转移 owner 后是否保留在原位置，默认 `false`
- `minAuthority`: 最小 authority，默认 `4`
- `allowedUsers`: 额外允许的用户列表，支持 `userId` 或 `platform:userId`
- `logApiFailures`: 是否输出 OpenAPI 失败日志，默认 `true`
- `chatlunaEnabled`: 是否启用内置 ChatLuna 工具桥接，默认 `false`

## Commands

```text
lark.ping
lark.chat.list
lark.doc.create <title> [content]
lark.doc.transfer-owner <documentId> [ownerOpenId]
lark.doc.read <documentId>
lark.doc.append <documentId> <content>
lark.file.read <fileToken>
lark.file.read-context [source]
lark.message.send <receiveId> <content>
lark.message.reply <messageId> <content>
lark.message.reaction.add <messageId> <emojiType>
lark.raw <method> <path> [payload]
lark.tool.list
```

## Service API

插件会向 Koishi Context 暴露 `ctx.larkCenter`。

目前 service 同时提供 domain 对象和兼容性的扁平方法。

domain 对象：

- `ctx.larkCenter.docs`
- `ctx.larkCenter.drive`
- `ctx.larkCenter.messages`
- `ctx.larkCenter.files`
- `ctx.larkCenter.bitable`

常用扁平方法：

- `ctx.larkCenter.ping()`
- `ctx.larkCenter.listChats({ pageSize, pageToken })`
- `ctx.larkCenter.createDocument({ title, folderToken, content, contentType, ownerOpenId, transferOwnership })`
- `ctx.larkCenter.transferDocumentOwnership({ documentId, ownerOpenId, retainedBotPermission, stayPut })`
- `ctx.larkCenter.readDocumentContent({ documentId })`
- `ctx.larkCenter.appendDocumentContent({ documentId, content, contentType, parentBlockId, index })`
- `ctx.larkCenter.readFileContent({ fileToken, fileName, mimeType })`
- `ctx.larkCenter.readMessageAttachment({ messageId, fileKey, fileName, mimeType })`
- `ctx.larkCenter.readSessionAttachment({ session, target, fileName, mimeType })`
- `ctx.larkCenter.sendMessage({ receiveId, receiveIdType, messageType, content, json })`
- `ctx.larkCenter.replyMessage({ messageId, content, messageType, json, replyInThread })`
- `ctx.larkCenter.addMessageReaction({ messageId, emojiType })`
- `ctx.larkCenter.rawRequest({ method, path, payload, json })`
- `ctx.larkCenter.getDriveMeta({ token, type })`
- `ctx.larkCenter.batchGetDriveMetas({ resources })`
- `ctx.larkCenter.getCapabilities()`
- `ctx.larkCenter.getToolDefinitions()`
- `ctx.larkCenter.getPermissionError({ userId, platform, authority })`

当前还有一个“已挂到 service、但不算稳定公开能力”的域：

- `ctx.larkCenter.queryBitableRecords(...)`

其中 `readFileContent()` 目前只支持文本类文件；`queryBitableRecords()` 目前会直接报未实现。

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
- `lark_file_read_content`
- `lark_context_file_read`
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
- 文件阅读场景下使用 `lark_file_read_content`
- 如果用户说“读这个文件”或回复了一条文件消息，优先使用 `lark_context_file_read`
- 对聊天交互增强，优先使用 `lark_message_reply` 和 `lark_message_add_reaction`
- `lark_raw_api_request` 只在高级场景开放
- `transfer-owner` 和 `bitable` 相关能力目前还没有单独的 bridge tool 定义

## Built-in ChatLuna Bridge

当 `chatlunaEnabled` 为 `true` 时，插件会尝试在运行时对接 ChatLuna，并注册以下工具：

- `lark_list_chats`
- `lark_doc_create`
- `lark_doc_read_content`
- `lark_doc_append_content`
- `lark_file_read_content`
- `lark_context_file_read`
- `lark_send_message`
- `lark_message_reply`
- `lark_message_add_reaction`
- `lark_raw_api_request`

当 `chatlunaEnabled` 改为 `false` 时，插件会卸载自己注册的 ChatLuna 工具。

说明：

- 这里不需要给 `aka-lark-center` 新增 npm 依赖。
- 但运行环境里仍然需要已经安装并启用 ChatLuna，否则只会记录警告，不会影响插件主体工作。
- 这套桥接目前是内置的总开关控制，不需要额外新建一个插件包。
- 当前桥接注册的是文档/文件/消息/raw 相关工具，不包含 `transfer-owner` 或 `bitable` 专用工具。

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
lark.doc.create -o 工作记录
```

### 转移文档 owner

```text
lark.doc.transfer-owner doccnxxxx
lark.doc.transfer-owner -p view doccnxxxx ou_xxx
```

如果不显式传入 `ownerOpenId`，插件会优先尝试从当前飞书/Lark 会话中推导请求者的 `open_id`。

### 追加文档内容

```text
lark.doc.append doccnxxxx 这是追加的一段文本
lark.doc.append -c markdown doccnxxxx ## 新章节
```

### 读取文件内容

```text
lark.file.read filecnxxxx
lark.file.read -n notes.md filecnxxxx
lark.file.read -m text/plain filecnxxxx
```

当前 `files v1` 只支持文本类文件读取。`-n` 和 `-m` 主要用于在飞书元数据不足时辅助识别文件类型。

如果你是在飞书里直接回复一条文件消息后执行 `lark.file.read`，插件也会尝试把引用消息里的 `<file .../>` 识别成消息附件，而不是把它误当成 `fileToken`。

### 按消息上下文读取文件附件

```text
lark.file.read-context
lark.file.read-context current
lark.file.read-context quote
```

这条命令的选择规则是保守的：

- `auto`：只有当当前会话里恰好一个文件附件候选时才自动读取
- `current`：只读取当前消息本身携带的文件附件
- `quote`：只读取当前引用消息里的文件附件

如果当前消息和引用消息里都各有一个文件附件，插件不会猜，而是要求显式指定来源。

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
- `files v1` 当前只支持 UTF-8 文本类文件读取，不等同于完整的 `pdf/docx/xlsx` 抽取管线。
- 文件额外格式支持和图片 OCR 目前已降级为待定事项，恢复推进前需要先理清飞书内链与 ChatLuna / LLM 通信链路的问题。
- 消息附件读取默认不会跨历史自由搜索文件，只会读取当前消息或引用消息里能明确定位到的附件。
- `bitable` 仍在骨架阶段，建议继续通过 roadmap 和后续实现推进，不要在生产逻辑里默认依赖它。
- 当前更值得优先投入的方向是搜索、知识空间 / wiki 查询、交互层优化，以及飞书项目接入前的方案收敛。

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
