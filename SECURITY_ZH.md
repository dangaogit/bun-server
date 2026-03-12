# 安全政策

## 支持版本

| 版本    | 是否维护           |
| ------- | ------------------ |
| latest  | :white_check_mark: |
| < 1.0   | :x:                |

## 安全问题分级

安全问题按严重程度分为三级，请根据问题的实际影响选择对应的报告渠道。

| 等级 | 说明 | 报告渠道 |
| ---- | ---- | -------- |
| **低危** | 影响较小的问题（如详细错误信息暴露、非敏感信息泄露等） | [提交 GitHub Issue](#低危问题) |
| **中危** | 特定条件下可被利用的问题（如输入验证不当、DoS 攻击面等） | [GitHub 私密安全公告](#中危--高危问题) 或 [邮件](#中危--高危问题) |
| **高危 / 严重** | 允许未授权访问、远程代码执行、权限提升或数据泄露的问题 | [GitHub 私密安全公告](#中危--高危问题) 或 [邮件](#中危--高危问题) |

## 如何报告漏洞

### 低危问题

对于低危问题，请[提交 GitHub Issue](https://github.com/dangaogit/bun-server/issues/new?template=bug_report.md)，并使用以下模板。

> **注意**：请勿在公开 Issue 中包含敏感信息，如利用步骤或完整的漏洞验证（PoC）代码。

<details>
<summary>低危问题报告模板</summary>

```markdown
## 问题概述

简要描述该问题。

## 严重等级

低危

## 受影响的组件

<!-- 例如：Router、Middleware、DI 容器 -->

## 复现步骤

1. …
2. …

## 预期行为

<!-- 应当发生什么 -->

## 实际行为

<!-- 实际发生了什么 -->

## 环境信息

- bun-server 版本：
- Bun 版本（`bun --version`）：
- 操作系统：

## 补充说明

<!-- 其他相关信息 -->
```

</details>

---

### 中危 / 高危问题

对于中危及以上的安全问题，请通过以下任一**私密渠道**进行报告，以避免漏洞被公开利用：

1. **GitHub 私密安全公告（推荐）**：
   [报告漏洞](https://github.com/dangaogit/bun-server/security/advisories/new)
   — 该渠道保密，直到修复发布前不会公开。

2. **邮件**：发送至 **dangaogm@gmail.com**，邮件主题格式为
   `[SECURITY] <问题简述>`。

我们承诺在收到报告后 **48 小时**内进行确认，并与您协商披露时间线。

<details>
<summary>中危 / 高危问题报告模板</summary>

```markdown
## 问题概述

清晰简洁地描述该漏洞。

## 严重等级

<!-- 低危 / 中危 / 高危 / 严重 -->

## 受影响的组件

<!-- 例如：Router、Middleware、DI 容器、身份验证模块 -->

## 受影响的版本

<!-- 例如：所有版本 <= 1.2.3 -->

## 复现步骤

1. …
2. …
3. …

## 漏洞验证（PoC）

<!-- 可选，但有助于复现。仅提供足以让维护者复现问题的信息，请勿公开完整的攻击代码。 -->

## 影响范围

<!-- 描述攻击者利用该漏洞可实现的目标。 -->

## 建议修复方案

<!-- 可选：您建议的修复思路。 -->

## 环境信息

- bun-server 版本：
- Bun 版本（`bun --version`）：
- 操作系统：

## 补充说明

<!-- 其他相关信息、CVE 编号、相关公告等。 -->
```

</details>

---

## 披露政策

- 请给予我们合理的时间（通常为 **90 天**）来修复问题，之后再进行公开披露。
- 修复发布后，我们将在发布说明中感谢报告者（如您希望匿名，请在报告时注明）。
- 我们采用**协调披露**模式，修复发布时将及时通知您。

## 联系方式

- **GitHub 安全公告**：<https://github.com/dangaogit/bun-server/security/advisories/new>
- **邮箱**：dangaogm@gmail.com

---

_本政策参考 [GitHub 安全最佳实践](https://docs.github.com/zh/code-security/getting-started/adding-a-security-policy-to-your-repository)。_

## 其他语言

- [English (SECURITY.md)](./SECURITY.md)
