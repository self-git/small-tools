module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新功能
        'fix',      // 修复bug
        'docs',     // 文档更新
        'style',    // 代码格式（不影响功能）
        'refactor', // 重构
        'perf',     // 性能优化
        'test',     // 测试
        'chore',    // 构建/工具/辅助
        'revert',   // 回滚
        'ci',       // CI/CD
      ],
    ],
    'subject-case': [0], // 不限制subject大小写
    'subject-max-length': [2, 'always', 100], // subject最大100字符
    'body-max-line-length': [0], // body不限制行长度
  },
}
