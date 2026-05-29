# Changelog

## 0.6.0-beta.4 (2026-05-29)

### Fixed

- 修复首次执行 `lark.auth.bind` 时用户独立 HOME 尚未初始化，导致 `auth login --no-wait --json` 返回 `not configured` 的问题。
- 在个人绑定流程前自动执行 `lark-cli config init --app-id ... --app-secret-stdin --brand feishu`，并通过 stdin 传入 App Secret，避免 secret 进入 argv。
- 为 CLI 执行器新增 stdin 支持，用于安全调用需要标准输入的 lark-cli 命令。

## 0.6.0-beta.3 (2026-05-28)

### Fixed

- 修复 `checksums.txt` 在 tsup 打包后运行时路径丢失导致的校验跳过问题。
- 将 SHA256 校验值直接嵌入 `src/shared/constants.ts`（`CLI_CHECKSUMS`），安装时优先使用嵌入值，不再依赖文件系统上的 `checksums.txt`。

## 0.6.0-beta.2 (2026-05-28)

### Fixed

- 修复 Koishi 4.18+ / Cordis scope 隔离导致的 `ctx.larkCenter is not registered` 错误。
- 将命令注册和 ChatLuna bridge 注册从 `index.ts` 的 `apply` 函数移到 `LarkCenter.start()` 内，确保与 Service 在同一个 scope。

## 0.6.0-beta.1 (2026-05-27)

### Breaking Changes

- 完全移除旧自研 OpenAPI client 和 domain service，底层能力全面转向 `lark-cli` 二进制。
- `@larksuite/cli` npm 包从 `dependencies` 中移除，改为插件内部自管理二进制下载。

### Added

- 新增 `src/cli/installer.ts`：使用 Node.js 内置 `https` 模块下载 `lark-cli` 官方二进制，支持 GitHub releases 和 npmmirror 双源回退，SHA256 校验。
- 新增 `src/cli/checksums.txt`：打包官方 release 的 SHA256 校验值，用于安装时完整性验证。
- 新增 Koishi 命令：
  - `lark.system.cli.install` —— 手动触发 lark-cli 二进制下载安装
  - `lark.system.cli.version` —— 查看当前捆绑的 lark-cli 版本
- 启动时自动检测二进制是否存在，缺失则自动触发下载安装。

### Fixed

- 解决 Unraid Koishi Docker 无 `curl` 导致 `@larksuite/cli` npm 包 postinstall 失败的问题。插件不再依赖 curl，纯 Node.js 实现下载。

### Changed

- `package.json` 版本号更新为 `0.6.0-beta.1`。
- `package.json` `files` 增加 `src/cli/checksums.txt` 以打包校验文件。
- `README.md` 更新为描述自管理二进制的新架构。

## 0.6.0-beta.0 (2026-05-27)

### Breaking Changes

- 初始 beta 版本，破坏性重写开始。旧代码已全部删除，新骨架建立。
