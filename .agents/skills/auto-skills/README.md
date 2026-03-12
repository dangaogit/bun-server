# auto-skills

Priority-based skill recommender to improve skill hit rate.

## Purpose

`auto-skills` is a meta skill that helps users quickly find the most suitable skills
with high precision and multilingual matching support.

## What It Enforces

- Strict lookup order: project -> user -> find-skills
- Top 3 precise recommendations only
- Chinese/English cross-language keyword matching
- Install-scope prompt in supported tools (session/project/user)

## Files

- `SKILL.md`: main skill logic and behavior contract

## Typical Use Cases

- "推荐一个技能帮我做 X"
- "这个需求该用哪个 skill"
- "中文提问也想命中英文技能"
- "帮我从已安装技能里挑最合适的"
