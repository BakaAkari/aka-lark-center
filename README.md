# koishi-plugin-aka-lark-center

在 Koishi 中调用飞书 / Lark OpenAPI 的网关插件。

它提供两层能力：

- 常用封装：验证凭证、列出会话、发送消息
- 通用网关：直接转发任意飞书 OpenAPI 请求，让 Koishi 侧命令可以操作 Lark 内的消息、文档、知识库、Bitable 等内容

## Features

- 自动获取并缓存 `tenant_access_token`
- 支持 `chat_id / open_id / user_id / union_id / email` 发送消息
- 内置 `raw` 命令，可调用任意已授权的飞书 OpenAPI
- 基于 Koishi authority 和白名单做权限控制

## Config

- `baseUrl`: 默认 `https://open.feishu.cn`
- `appId`: 飞书应用 App ID
- `appSecret`: 飞书应用 App Secret
- `commandName`: 主命令名，默认 `lark`
- `minAuthority`: 最小 authority，默认 `4`
- `allowedUsers`: 额外允许的用户列表，支持 `userId` 或 `platform:userId`
- `defaultReceiveIdType`: 默认消息目标类型，默认 `chat_id`
- `maxResponseLength`: 命令输出最大长度，默认 `4000`

## Commands

```text
lark.ping
lark.chat.list
lark.message.send <receiveId> <content>
lark.raw <method> <path> [payload]
```

### 1. 验证凭证

```text
lark.ping
```

### 2. 列出会话

```text
lark.chat.list
lark.chat.list -s 50
lark.chat.list -t <page_token>
```

### 3. 发送文本消息

```text
lark.message.send oc_xxx hello
lark.message.send -r open_id ou_xxx hello
```

默认发送 `text` 消息。

### 4. 发送非 text 消息

对于 `post`、`interactive` 等非文本消息，使用 `-j` 传入 Lark 要求的 `content` JSON：

```text
lark.message.send -r chat_id -m post -j oc_xxx {"zh_cn":{"title":"标题","content":[[{"tag":"text","text":"内容"}]]}}
```

### 5. 原始 OpenAPI 调用

直接调用任何飞书开放接口。路径支持两种写法：

- `/open-apis/im/v1/chats`
- `im/v1/chats`

示例：

```text
lark.raw GET /open-apis/im/v1/chats
lark.raw GET docx/v1/documents/<document_id>
lark.raw POST wiki/v2/spaces/get_node -j {"token":"wiki_token"}
```

如果传 `-j`，`payload` 会按 JSON 解析后发送。

## Notes

- 插件只负责 Koishi 到飞书 OpenAPI 的认证、转发和基础命令封装。
- 具体能操作哪些 Lark 内容，取决于你的飞书应用已经开通并审核通过的权限。
- 如果你后续需要文档、知识库、Bitable、审批等专用命令，可以继续在这个插件上扩展，不需要重做认证层。

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
