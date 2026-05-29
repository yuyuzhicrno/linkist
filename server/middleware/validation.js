import { z } from 'zod';

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source];
    try {
      const result = schema.parse(data);
      req[source] = result;
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors = err.issues.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }));
        res.status(400).json({ 
          error: '输入验证失败', 
          details: errors 
        });
      } else {
        next(err);
      }
    }
  };
}

export const schemas = {
  register: z.object({
    username: z.string()
      .min(2, '用户名至少2个字符')
      .max(20, '用户名最多20个字符')
      .regex(/^[\w\u4e00-\u9fa5]+$/, '用户名只能包含字母、数字、下划线和中文'),
    email: z.string()
      .email('邮箱格式不正确')
      .max(100, '邮箱最多100个字符'),
    password: z.string()
      .min(6, '密码至少6个字符')
      .max(100, '密码最多100个字符'),
    bio: z.string().max(200, '简介最多200个字符').optional()
  }),

  login: z.object({
    email: z.string().email('邮箱格式不正确'),
    password: z.string().min(1, '密码不能为空')
  }),

  updateUser: z.object({
    username: z.string()
      .min(2, '用户名至少2个字符')
      .max(20, '用户名最多20个字符')
      .regex(/^[\w\u4e00-\u9fa5]+$/, '用户名只能包含字母、数字、下划线和中文')
      .optional(),
    bio: z.string().max(200, '简介最多200个字符').optional(),
    theme: z.enum(['dark', 'light', 'system']).optional(),
    accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, '颜色格式不正确').optional()
  }),

  createPost: z.object({
    title: z.string()
      .min(1, '标题不能为空')
      .max(200, '标题最多200个字符'),
    content: z.string()
      .min(1, '内容不能为空')
      .max(50000, '内容最多50000个字符'),
    channelId: z.string().uuid('频道ID格式不正确').optional(),
    tags: z.array(z.string().max(30, '标签最多30个字符')).max(10, '最多10个标签').optional()
  }),

  updatePost: z.object({
    title: z.string()
      .min(1, '标题不能为空')
      .max(200, '标题最多200个字符')
      .optional(),
    content: z.string()
      .min(1, '内容不能为空')
      .max(50000, '内容最多50000个字符')
      .optional()
  }),

  createChannel: z.object({
    name: z.string()
      .min(1, '频道名称不能为空')
      .max(50, '频道名称最多50个字符'),
    description: z.string().max(500, '描述最多500个字符').optional(),
    icon: z.string().max(10, '图标最多10个字符').optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, '颜色格式不正确').optional(),
    isPublic: z.boolean().optional()
  }),

  createComment: z.object({
    content: z.string()
      .min(1, '评论内容不能为空')
      .max(5000, '评论最多5000个字符')
  }),

  createReply: z.object({
    content: z.string()
      .min(1, '回复内容不能为空')
      .max(2000, '回复最多2000个字符')
  }),

  sendMessage: z.object({
    content: z.string()
      .min(1, '消息内容不能为空')
      .max(5000, '消息最多5000个字符')
  }),

  reactMessage: z.object({
    emoji: z.string()
      .min(1, '表情不能为空')
      .max(10, '表情最多10个字符')
  }),

  vote: z.object({
    type: z.enum(['up', 'down'], '投票类型只能是 up 或 down')
  }),

  friendRequest: z.object({
    userId: z.string().uuid('用户ID格式不正确')
  }),

  createColumn: z.object({
    title: z.string()
      .min(1, '专栏标题不能为空')
      .max(100, '专栏标题最多100个字符'),
    description: z.string().max(1000, '描述最多1000个字符').optional()
  }),

  createTag: z.object({
    name: z.string()
      .min(1, '标签名称不能为空')
      .max(30, '标签名称最多30个字符'),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, '颜色格式不正确').optional()
  }),

  createPoll: z.object({
    title: z.string()
      .min(1, '投票标题不能为空')
      .max(200, '投票标题最多200个字符'),
    options: z.array(
      z.object({
        text: z.string().min(1, '选项内容不能为空').max(100, '选项最多100个字符')
      })
    ).min(2, '至少需要2个选项').max(10, '最多10个选项'),
    expiresAt: z.string().datetime('过期时间格式不正确').optional(),
    channelId: z.string().uuid('频道ID格式不正确').optional()
  }),

  votePoll: z.object({
    optionId: z.string().uuid('选项ID格式不正确')
  }),

  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  })
};

export function sanitizeInput(str) {
  if (!str) return str;
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '');
}

export function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}