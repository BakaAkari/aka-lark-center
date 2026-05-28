# koishi-plugin-aka-lark-center

## Positioning

Koishi 插件，通过自管理的 `lark-cli` 二进制将飞书 / Lark 的全部 CLI 能力暴露为 Koishi 命令和 ChatLuna LLM 工具。

## Current Status

v0.6.0-beta —— 破坏性重构中，基于自管理 `lark-cli` 二进制完全重写。

## Features

- **自管理 lark-cli 二进制**：插件启动时自动下载对应平台的官方 CLI 二进制到 Koishi data 目录，不依赖 npm postinstall 或宿主机 curl
- 多租户用户身份隔离：每个 Koishi 用户可绑定自己的飞书身份
- Device Flow 扫码绑定，首次使用个人功能时自动触发
- 黑名单安全模型：默认暴露几乎全部 CLI 能力，仅禁止事件流和高风险 shell 操作
- ChatLuna 桥接：自动将 lark-cli 命令注册为 LLM Tools
- 风险分级：read / write / destructive / admin

## Config

| 字段 | 说明 |
|------|------|
| `appId` | 飞书应用 App ID |
| `appSecret` | 飞书应用 App Secret |
| `baseUrl` | OpenAPI 基础地址 |
| `commandName` | 主命令名，默认 `lark` |
| `larkCliConfigDir` | CLI 配置持久化目录 |
| `chatlunaEnabled` | 是否启用 ChatLuna 桥接 |
| `chatlunaRiskLevel` | ChatLuna 工具风险等级 |

## Commands

### 系统命令

- `lark.system.ping` —— 验证 CLI 可用性并查看版本/路径
- `lark.system.cli.install` —— 手动触发 lark-cli 二进制下载安装
- `lark.system.cli.version` —— 查看当前捆绑的 lark-cli 版本

### 身份管理命令

- `lark.auth.status` —— 查看当前用户绑定状态
- `lark.auth.bind` —— 绑定个人飞书身份（Device Flow）
- `lark.auth.confirm <deviceCode>` —— 确认 Device Flow 绑定
- `lark.auth.unbind` —— 解绑个人飞书身份

## Notes

- **无需 curl**：插件内部使用 Node.js `https` 模块下载 CLI 二进制，兼容无 curl 的 Docker 环境
- 用户风险自担：开启 destructive / admin 风险等级后，LLM 可能执行删除、转移等不可逆操作
- 配置持久化：确保 Koishi Docker 的 `baseDir` 映射到持久化卷，否则用户绑定状态会丢失
