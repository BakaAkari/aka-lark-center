import type { LarkKnowledgeLookupParams } from '../../shared/types.js'

const KNOWLEDGE_LOOKUP_RESOURCE_WORD_RE = /(文档|云文档|飞书文档|知识库|wiki|资料|内容)/i
const KNOWLEDGE_LOOKUP_ACTION_WORD_RE = /(查找|搜索|检索|查询|哪些|提到|提及|找到|搜一下|搜一搜|看看|告诉我|查\b)/i
const KNOWLEDGE_SCOPE_STATEMENT_RE = /(你能查到|你能访问|可访问|权限范围|所有飞书文档|全部飞书文档|当前可读|当前可访问)/i

const KNOWLEDGE_QUERY_STOPWORDS = [
  '查找',
  '搜索',
  '检索',
  '查询',
  '文档',
  '飞书文档',
  '云文档',
  '知识库',
  '告诉我',
  '哪些',
  '提到了',
  '提到',
  '需要',
  '你能查到的',
  '你能访问的',
  '所有',
  '全部',
  '根据',
  '可读',
  '可访问',
  '权限范围',
  '范围',
  '内容',
]

export function looksLikeKnowledgeLookupQuestion(text: string) {
  const normalized = text.trim().toLowerCase()
  if (!normalized || normalized.startsWith('lark.') || normalized.startsWith('chatluna.')) {
    return false
  }

  return KNOWLEDGE_LOOKUP_RESOURCE_WORD_RE.test(text)
    && KNOWLEDGE_LOOKUP_ACTION_WORD_RE.test(text)
}

export function looksLikeKnowledgeScopeStatement(text: string) {
  return KNOWLEDGE_SCOPE_STATEMENT_RE.test(text)
}

export function buildKnowledgeSearchQuery(text: string) {
  const normalized = text
    .replace(/[，。！？、,.!?;；:：()[\]{}"'`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  let query = normalized
  for (const word of KNOWLEDGE_QUERY_STOPWORDS) {
    query = query.replaceAll(word, ' ')
  }

  const tokens = query
    .split(/\s+/)
    .map(item => item.trim())
    .filter(item => item.length >= 2)

  const unique = Array.from(new Set(tokens))
  if (unique.length) {
    return unique.join(' ')
  }

  return normalized
}

export function buildAutomaticKnowledgeLookupParams(
  text: string,
  maxContextChars: number,
): LarkKnowledgeLookupParams {
  return {
    query: buildKnowledgeSearchQuery(text),
    count: 8,
    readTopK: 3,
    maxContentLength: Math.min(maxContextChars, 2000),
  }
}
