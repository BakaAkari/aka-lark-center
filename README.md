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

- 已完成并对外可用：凭证校验、会话列表、消息发送/回复/reaction、文档创建/读取/追加、文档 owner 转移、文本类文件读取、文档搜索、知识空间 / wiki 基础查询、raw OpenAPI 调用
- 已新增第一批 discovery 能力：获取云空间根文件夹、列出文件夹下资源清单，可作为“受限版知识中心”的资源发现入口
- 已新增第一版高层知识检索能力：可按自然语言需求先搜索候选文档，再自动读取前几个可读 doc/docx/wiki 正文
- 已完成并可供插件复用：`ctx.larkCenter` service、按 domain 拆分的 `docs/drive/messages/files/search/wiki/resources/knowledge/bitable` 内部结构、稳定工具定义、可选 ChatLuna 工具桥接
- 已上线但范围有限：`files` 目前只保留文本类文件读取；额外格式和图片 OCR 的扩展因飞书内链、ChatLuna 与 LLM 通信链路问题暂时标记为待定；消息附件读取仍然只处理当前消息或当前引用消息里能明确定位到的附件
- 已新增首个 search/wiki 只读切片：支持搜索云文档、列知识空间、读取 wiki 节点元数据、列子节点；更深的搜索增强和知识库写操作仍在后续阶段
- 已新增首个 ChatLuna 上下文注入切片：在当前消息里识别单个 `wiki/doc/docx` 链接后，可自动读取并把文档内容注入当前轮模型上下文
- 已新增首个 ChatLuna 文件附件注入切片：当前消息本身是可读文本附件时，可在 `before-chat` 阶段自动读取并注入当前轮上下文；回复文件消息且文案明确要求“读这个文件 / 看看附件内容”时，也会优先尝试读取引用附件
- 已预留但未实现：`bitable` 一等 API 仍是骨架，暂不建议把它视为可用能力
- 当前阶段重点：继续优化 search/wiki 的交互层输出，完善面向 ChatLuna 的资源上下文注入链路，随后推进飞书项目接入方案设计

更细的开发现状和阶段记录见：

- [`docs/lark-center-doc/architecture.md`](../../docs/lark-center-doc/architecture.md)
- [`docs/lark-center-doc/context-injection.md`](../../docs/lark-center-doc/context-injection.md)
- [`docs/lark-center-doc/current-status.md`](../../docs/lark-center-doc/current-status.md)
- [`docs/lark-center-doc/knowledge-center-plan.md`](../../docs/lark-center-doc/knowledge-center-plan.md)
- [`docs/lark-center-doc/phase-plan.md`](../../docs/lark-center-doc/phase-plan.md)

## Features

- 自动获取并缓存 `tenant_access_token`
- 支持创建、读取飞书文档并追加内容
- 支持创建后转移文档 owner，或单独执行 owner 转移
- 支持按 `fileToken` 读取飞书文本类文件内容
- 支持按“当前消息 / 引用消息”的上下文读取飞书文件附件内容
- 支持在 ChatLuna 会话中自动读取当前消息携带的单个文本类附件，并把内容注入当前轮模型上下文
- 支持在 ChatLuna 会话中识别“回复文件消息并要求读取”的显式意图，并优先尝试读取引用附件
- 支持按关键词搜索飞书云文档资源
- 支持获取云空间根文件夹并列出文件夹资源清单
- 支持按自然语言问题执行“搜索候选文档 + 自动读取正文”的高层知识检索
- 支持列出知识空间、读取 wiki 节点信息、列出 wiki 子节点
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
- `chatlunaContextInjectionEnabled`: 是否在 ChatLuna 对话前自动识别飞书文档链接并注入上下文，默认 `true`
- `chatlunaContextMaxChars`: 自动注入到 ChatLuna 上下文中的飞书文档最大字符数，默认 `4000`

## Commands

统一命名规则：

- 命令入口：`lark.<action>.<resource>[.<detail>]`
- ChatLuna tool：`lark_<action>_<resource>[_detail]`
- 常见 action：`system` / `query` / `read` / `write` / `message`

```text
lark.system.ping
lark.query.chat.list
lark.query.drive.root
lark.query.drive.list [folderToken]
lark.query.docs.lookup <query>
lark.write.doc.create <title> [content]
lark.write.doc.transfer-owner <documentId> [ownerOpenId]
lark.read.doc <documentRef>
lark.read.file [fileToken]
lark.write.doc.append <documentId> <content>
lark.query.docs.search <searchKey>
lark.query.wiki.spaces
lark.query.wiki.node <token>
lark.query.wiki.children <spaceId> [parentNodeToken]
lark.message.send <receiveId> <content>
lark.message.reply <messageId> <content>
lark.message.reaction.add <messageId> <emojiType>
lark.system.raw <method> <path> [payload]
lark.system.tool.list
```

## Service API

插件会向 Koishi Context 暴露 `ctx.larkCenter`。

目前 service 同时提供 domain 对象和兼容性的扁平方法。

domain 对象：

- `ctx.larkCenter.docs`
- `ctx.larkCenter.drive`
- `ctx.larkCenter.messages`
- `ctx.larkCenter.files`
- `ctx.larkCenter.search`
- `ctx.larkCenter.wiki`
- `ctx.larkCenter.resources`
- `ctx.larkCenter.knowledge`
- `ctx.larkCenter.bitable`

常用扁平方法：

- `ctx.larkCenter.ping()`
- `ctx.larkCenter.listChats({ pageSize, pageToken })`
- `ctx.larkCenter.createDocument({ title, folderToken, content, contentType, ownerOpenId, transferOwnership })`
- `ctx.larkCenter.transferDocumentOwnership({ documentId, ownerOpenId, retainedBotPermission, stayPut })`
- `ctx.larkCenter.readDocumentContent({ documentId })`
- `ctx.larkCenter.readDocumentContext({ documentRef, maxContentLength })`
- `ctx.larkCenter.appendDocumentContent({ documentId, content, contentType, parentBlockId, index })`
- `ctx.larkCenter.readFileContent({ fileToken, fileName, mimeType })`
- `ctx.larkCenter.readMessageAttachment({ messageId, fileKey, fileName, mimeType })`
- `ctx.larkCenter.readSessionAttachment({ session, target, fileName, mimeType })`
- `ctx.larkCenter.searchDocs({ searchKey, count, offset, docsTypes, ownerIds, chatIds })`
- `ctx.larkCenter.listWikiSpaces({ pageSize, pageToken })`
- `ctx.larkCenter.getWikiNode({ token })`
- `ctx.larkCenter.listWikiNodes({ spaceId, parentNodeToken, pageSize, pageToken })`
- `ctx.larkCenter.sendMessage({ receiveId, receiveIdType, messageType, content, json })`
- `ctx.larkCenter.replyMessage({ messageId, content, messageType, json, replyInThread })`
- `ctx.larkCenter.addMessageReaction({ messageId, emojiType })`
- `ctx.larkCenter.rawRequest({ method, path, payload, json })`
- `ctx.larkCenter.getDriveMeta({ token, type })`
- `ctx.larkCenter.getDriveRootFolder()`
- `ctx.larkCenter.listDriveFiles({ folderToken, pageSize, pageToken })`
- `ctx.larkCenter.knowledgeLookup({ query, count, offset, docsTypes, ownerIds, chatIds, readTopK, maxContentLength })`
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

- `lark_write_doc_create`
- `lark_write_doc_transfer_owner`
- `lark_read_doc`
- `lark_write_doc_append`
- `lark_read_file`
- `lark_read_context_file`
- `lark_query_docs_search`
- `lark_query_drive_root`
- `lark_query_drive_list`
- `lark_query_docs_lookup`
- `lark_query_wiki_spaces`
- `lark_query_wiki_node`
- `lark_query_wiki_children`
- `lark_query_chat_list`
- `lark_message_send`
- `lark_message_reply`
- `lark_message_reaction_add`
- `lark_system_raw_api`

这些定义的目标是让桥接层不需要再手写飞书参数说明，而是可以直接读取：

- 工具名
- 描述
- 建议用法
- 风险等级
- 输入 schema

当前建议：

- 默认给 LLM 暴露 `lark_query_chat_list` 和 `lark_message_send`
- 文档场景下优先使用 `lark_write_doc_create`、`lark_read_doc`、`lark_write_doc_append` 和 `lark_write_doc_transfer_owner`
- 文件阅读场景下使用 `lark_read_file`
- 搜索文档时优先使用 `lark_query_docs_search`
- 需要从云空间结构发现资源时，优先使用 `lark_query_drive_root` 和 `lark_query_drive_list`
- 当用户直接问“哪份文档里提到了某个内容”或“根据可读文档回答这个问题”时，优先使用 `lark_query_docs_lookup`
- 进入知识空间浏览时优先使用 `lark_query_wiki_spaces`、`lark_query_wiki_node` 和 `lark_query_wiki_children`
- 如果用户说“读这个文件”或回复了一条文件消息，优先使用 `lark_read_context_file`
- 对聊天交互增强，优先使用 `lark_message_reply` 和 `lark_message_reaction_add`
- `lark_system_raw_api` 只在高级场景开放

## Built-in ChatLuna Bridge

当 `chatlunaEnabled` 为 `true` 时，插件会尝试在运行时对接 ChatLuna，并注册以下工具：

- `lark_write_doc_create`
- `lark_write_doc_transfer_owner`
- `lark_read_doc`
- `lark_write_doc_append`
- `lark_read_file`
- `lark_read_context_file`
- `lark_query_docs_search`
- `lark_query_drive_root`
- `lark_query_drive_list`
- `lark_query_docs_lookup`
- `lark_query_wiki_spaces`
- `lark_query_wiki_node`
- `lark_query_wiki_children`
- `lark_query_chat_list`
- `lark_message_send`
- `lark_message_reply`
- `lark_message_reaction_add`
- `lark_system_raw_api`

当 `chatlunaEnabled` 改为 `false` 时，插件会卸载自己注册的 ChatLuna 工具。

说明：

- 这里不需要给 `aka-lark-center` 新增 npm 依赖。
- 但运行环境里仍然需要已经安装并启用 ChatLuna，否则只会记录警告，不会影响插件主体工作。
- 这套桥接目前是内置的总开关控制，不需要额外新建一个插件包。
- 当前桥接注册的是文档/文件/消息/raw 相关工具，并已包含 `transfer-owner` 专用工具；`bitable` 仍未进入 bridge。
- 当前桥接还会在 `chatluna/before-chat` 阶段自动识别消息里的飞书 `wiki/doc/docx` 链接，并把读取到的文档内容作为上下文块注入当前轮用户问题。
- 当前桥接还会在 `chatluna/before-chat` 阶段自动识别当前消息本身携带的可读文本附件，并把读取到的附件内容作为上下文块注入当前轮用户问题。
- 当前桥接也支持在“回复一条文件消息 + 文案明确要求读取附件”的场景下，优先尝试读取引用附件并注入当前轮上下文。
- 当前桥接也会在 `chatluna/before-chat` 阶段识别“查找/搜索飞书文档内容”这类知识检索意图，并先自动运行一轮 `lark_query_docs_lookup`，再把候选文档和已读取正文片段注入当前轮上下文。
- 自动注入目前主要负责“首次命中文档链接或当前明确可读附件时，把正文注入当前轮上下文”。
- 后续多轮追问默认交给 ChatLuna 自己的会话短期记忆处理，`aka-lark-center` 不再重复缓存并反复注入同一份文档内容。

## Commands Usage

### 验证凭证

```text
lark.system.ping
```

### 列出会话

```text
lark.query.chat.list
lark.query.chat.list -s 50
lark.query.chat.list -t <page_token>
```

### 获取根文件夹与列出资源

```text
lark.query.drive.root
lark.query.drive.list
lark.query.drive.list fldcnxxxx
lark.query.drive.list -s 50 fldcnxxxx
```

`lark.query.drive.root` 适合拿当前可访问的根文件夹 token。`lark.query.drive.list` 适合沿着文件夹继续浏览文档、文件夹、表格等资源清单，不传 `folderToken` 时默认先取根目录。

### 发送文本消息

```text
lark.message.send oc_xxx hello
lark.message.send -r open_id ou_xxx hello
```

默认发送 `text` 消息。

### 创建文档

```text
lark.write.doc.create 工作记录
lark.write.doc.create -c markdown 周报 # 本周总结
lark.write.doc.create -o 工作记录
```

### 转移文档 owner

```text
lark.write.doc.transfer-owner doccnxxxx
lark.write.doc.transfer-owner -p view doccnxxxx ou_xxx
```

如果不显式传入 `ownerOpenId`，插件会优先尝试从当前飞书/Lark 会话中推导请求者的 `open_id`。

### 追加文档内容

```text
lark.write.doc.append doccnxxxx 这是追加的一段文本
lark.write.doc.append -c markdown doccnxxxx ## 新章节
```

### 读取文件内容

```text
lark.read.file filecnxxxx
lark.read.file -n notes.md filecnxxxx
lark.read.file -m text/plain filecnxxxx
```

当前 `files v1` 只支持文本类文件读取。`-n` 和 `-m` 主要用于在飞书元数据不足时辅助识别文件类型。

如果你是在飞书里直接回复一条文件消息后执行 `lark.read.file`，插件也会尝试把引用消息里的 `<file .../>` 识别成消息附件，而不是把它误当成 `fileToken`。

如果运行环境启用了内置 ChatLuna bridge，那么当前轮还有一条更“自动”的路径：

- 用户直接发送一条可读的文本类文件消息时，桥接层会在 `chatluna/before-chat` 阶段自动读取当前附件并注入上下文
- 用户回复一条文件消息，并明确表达“读这个文件 / 看看附件内容 / 总结这个文件”等意图时，桥接层也会优先尝试读取引用附件

这条自动注入路径的目标是减少模型“明明能读附件，却没主动调工具”的情况。是否最终成功读取，仍然受文件格式、飞书权限和当前会话上下文完整度影响。

如果不直接传 `fileToken`，可以用 `-s` 指定消息上下文来源：

```text
lark.read.file
lark.read.file -s current
lark.read.file -s quote
```

选择规则是保守的：

- `auto`：只有当当前会话里恰好一个文件附件候选时才自动读取
- `current`：只读取当前消息本身携带的文件附件
- `quote`：只读取当前引用消息里的文件附件

如果当前消息和引用消息里都各有一个文件附件，插件不会猜，而是要求显式指定来源。

### 搜索文档

```text
lark.query.docs.search 项目周报
lark.query.docs.search -c 5 项目周报
lark.query.docs.search -t docx,wiki 项目周报
```

支持按关键词搜索飞书文档资源，第一版主要面向“先找到目标，再继续读”的场景。

### 高层知识检索

```text
lark.query.docs.lookup 鲨鱼湾地图玩法
lark.query.docs.lookup -r 2 鲨鱼湾地图玩法
lark.query.docs.lookup -t docx,wiki -m 3000 鲨鱼湾地图玩法
```

`lark.query.docs.lookup` 会先搜索候选文档，再自动读取前几个可读的 `doc/docx/wiki` 正文，把候选信息和已读取上下文一起返回。它更适合“根据用户需求先找文档，再继续回答”的知识中心场景。

### 列出知识空间

```text
lark.query.wiki.spaces
lark.query.wiki.spaces -s 50
```

### 获取 wiki 节点信息

```text
lark.query.wiki.node wikcnxxxx
```

返回的是节点元数据，包括 `space_id`、`node_token`、`obj_token` 和 `obj_type`，便于后续继续定位真实资源。

### 列出 wiki 子节点

```text
lark.query.wiki.children 7345678901234567890
lark.query.wiki.children 7345678901234567890 wikcnxxxx
```

如果不提供 `parentNodeToken`，默认列出该知识空间下的顶层节点。

### 统一读取文档内容

```text
lark.read.doc doccnxxxx
lark.read.doc https://ex9oqclny8.feishu.cn/docx/xxx
lark.read.doc https://ex9oqclny8.feishu.cn/wiki/xxx
lark.read.doc [飞书云文档](https://ex9oqclny8.feishu.cn/wiki/xxx)
```

`lark.read.doc` 会自动判断输入是 `doc/docx/wiki token`、飞书 URL 还是 Markdown 链接。

如果是 wiki 链接，插件会先解析出真实资源，再自动分流到对应的文档读取接口。

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
lark.system.raw GET /open-apis/im/v1/chats
lark.system.raw GET docx/v1/documents/<document_id>
lark.system.raw POST wiki/v2/spaces/get_node -j {"token":"wiki_token"}
```

### 查看工具定义

```text
lark.system.tool.list
```

## Notes

- 插件只负责 Koishi 到飞书 OpenAPI 的认证、转发和基础能力封装。
- 具体能操作哪些 Lark 内容，取决于你的飞书应用已经开通并审核通过的权限。
- 如果在飞书/Lark 用户会话中通过 ChatLuna 调用 `lark_write_doc_create`，并且插件开启了自动 owner 转交配置，创建后的文档会自动把 owner 转给当前请求者。
- 如果后续还要兼容非 ChatLuna 的 LLM 插件，优先复用 `ctx.larkCenter` 和工具定义，不要把飞书核心能力绑死在某一个 LLM 生态上。
- `files v1` 当前只支持 UTF-8 文本类文件读取，不等同于完整的 `pdf/docx/xlsx` 抽取管线。
- 文件额外格式支持和图片 OCR 目前已降级为待定事项，恢复推进前需要先理清飞书内链与 ChatLuna / LLM 通信链路的问题。
- 消息附件读取默认不会跨历史自由搜索文件，只会读取当前消息或当前引用消息里能明确定位到的附件。
- ChatLuna 自动附件注入当前只覆盖“当前消息本身是可读文本附件”以及“回复文件消息并表达明确读取意图”的场景，不会把任意历史文件当作隐式上下文。
- `search/wiki` 第一版目前是只读能力，重点在“找得到”和“拿到足够继续调用的元数据”，还不是完整的知识库内容编辑方案。
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
