# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |
| < 1.0   | :x:                |

## Severity Classification

Security issues are classified into three levels. Please choose the appropriate
reporting channel based on the severity of the issue.

| Severity | Description                                                                                       | Reporting Channel                              |
| -------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Low**  | Minor issues with minimal impact (e.g., verbose error messages, non-sensitive information leaks)  | [Open a GitHub Issue](#low-severity-issues)    |
| **Medium** | Issues that could be exploited under specific conditions (e.g., improper input validation, DoS) | [GitHub Private Security Advisory](#medium--high-severity-issues) or [Email](#medium--high-severity-issues) |
| **High / Critical** | Issues that allow unauthorized access, RCE, privilege escalation, or data breaches      | [GitHub Private Security Advisory](#medium--high-severity-issues) or [Email](#medium--high-severity-issues) |

## Reporting a Vulnerability

### Low Severity Issues

For low-severity issues, please [open a GitHub Issue](https://github.com/dangaogit/bun-server/issues/new?template=bug_report.md)
and use the template below.

> **Note:** Do **not** include sensitive details such as exploitation steps or
> proof-of-concept code in a public issue.

<details>
<summary>Low Severity Issue Template</summary>

```markdown
## Summary

A brief description of the issue.

## Severity

Low

## Affected Component

<!-- e.g., Router, Middleware, DI Container -->

## Steps to Reproduce

1. …
2. …

## Expected Behavior

<!-- What should happen -->

## Actual Behavior

<!-- What actually happens -->

## Environment

- bun-server version:
- Bun version (`bun --version`):
- OS:

## Additional Context

<!-- Any other relevant information -->
```

</details>

---

### Medium / High Severity Issues

For medium and high/critical severity issues, please report them **privately**
using one of the following channels:

1. **GitHub Private Security Advisory (preferred)**:
   [Report a vulnerability](https://github.com/dangaogit/bun-server/security/advisories/new)
   — this keeps the report confidential until a fix is released.

2. **Email**: Send details to **dangaogm@gmail.com** with the subject line
   `[SECURITY] <short description>`.

We aim to acknowledge your report within **48 hours** and will work with you on
a coordinated disclosure timeline.

<details>
<summary>Medium / High Severity Report Template</summary>

```markdown
## Summary

A clear and concise description of the vulnerability.

## Severity

<!-- Low / Medium / High / Critical -->

## Affected Component

<!-- e.g., Router, Middleware, DI Container, Authentication -->

## Affected Versions

<!-- e.g., all versions <= 1.2.3 -->

## Steps to Reproduce

1. …
2. …
3. …

## Proof of Concept (PoC)

<!-- Optional but helpful. Provide only enough detail for the maintainers to
     reproduce — avoid publicly sharing full exploit code. -->

## Impact

<!-- Describe what an attacker could achieve by exploiting this issue. -->

## Suggested Fix

<!-- Optional: your recommended remediation approach. -->

## Environment

- bun-server version:
- Bun version (`bun --version`):
- OS:

## Additional Context

<!-- Any other relevant information, CVE references, related advisories, etc. -->
```

</details>

---

## Disclosure Policy

- Please give us a reasonable amount of time (typically **90 days**) to address
  the issue before public disclosure.
- We will credit reporters in the release notes unless you prefer to remain
  anonymous.
- We follow a **coordinated disclosure** model and will notify you when a fix is
  published.

## Contact

- **GitHub Security Advisory**: <https://github.com/dangaogit/bun-server/security/advisories/new>
- **Email**: dangaogm@gmail.com

---

_This policy is inspired by [GitHub's security best practices](https://docs.github.com/en/code-security/getting-started/adding-a-security-policy-to-your-repository)._

## Other Languages

- [中文版 (SECURITY_ZH.md)](./SECURITY_ZH.md)
