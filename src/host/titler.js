/**
 * dsh-completion-notifier / titler
 * 模块化组件 2: 会话首轮智能标题提炼 (Smart Session Titler)
 * 职责:
 * 1. 拦截底层机械的 task ready 或长路径标题
 * 2. 在首轮对话完成后，根据用户真实需求和 AI 回复自动提炼 6~10 字高信息量中文标题
 * 3. 可在 DSH 内置插件管理中独立开启或停用
 */

export const name = 'notifier-smart-titler';
export const inject = [];

/**
 * 判断标题是否为无脑的默认标题或机械指令
 */
export function isDumbTitle(title) {
  if (!title || typeof title !== 'string') return true;
  const lower = title.toLowerCase().trim();
  return (
    lower.startsWith('task ready') ||
    lower.includes('task ready') ||
    lower.startsWith('untitled') ||
    lower.startsWith('新会话') ||
    lower.startsWith('/') ||
    lower.startsWith('~') ||
    lower.startsWith('./') ||
    lower.startsWith('../') ||
    lower.startsWith('[系统背景') ||
    lower.startsWith('[system') ||
    lower.startsWith('cd ') ||
    lower.startsWith('pnpm ') ||
    lower.startsWith('npm ') ||
    lower.startsWith('git ') ||
    lower.startsWith('ls ') ||
    lower.startsWith('cat ') ||
    lower.startsWith('node ') ||
    lower.startsWith('python ') ||
    lower === 'hello' ||
    lower === 'hi' ||
    lower === 'test'
  );
}

/**
 * 从用户提问与 AI 回复中智能提炼 6~12 字精炼中文会话标题
 */
export function extractSmartTitle(userPrompt, assistantSummary) {
  let cleanUser = (userPrompt || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^task ready.*$/gim, '')
    .trim();

  // 若用户提问包含路径（如 /Users/.../modern-web-guidance-plugin 是什么）
  const pathMatch = /([A-Za-z0-9_.-]+(?:plugin|sdk|api|tool|cli|[A-Za-z0-9_-]+))[\s\S]*?(是什么|怎么用|如何|干嘛|做什么)/i.exec(cleanUser);
  if (pathMatch) {
    const pkgName = pathMatch[1].replace(/\.js$|\.ts$/i, '');
    return `${pkgName} 介绍`;
  }

  // 剥离长路径前缀，只保留提问核心
  cleanUser = cleanUser.replace(/\/[A-Za-z0-9_.-]+\//g, '').replace(/^[#\s\-\*`]+/gm, '').trim();

  if (cleanUser && cleanUser.length > 2) {
    cleanUser = cleanUser
      .replace(/^(请问|帮我|如何|怎么|为什么|能不能|可以|我想|请解释|请实现|请编写|介绍一下)/g, '')
      .replace(/[？?\!！。，,]+$/g, '')
      .trim();

    if (cleanUser.length > 1) {
      if (cleanUser.length > 14) {
        return cleanUser.slice(0, 13) + '…';
      }
      return cleanUser;
    }
  }

  // 若用户提问全被过滤，结合 AI 答复提炼
  let cleanAssistant = (assistantSummary || '')
    .replace(/^(已为你|我已经|好的|没问题|通过|这是)/g, '')
    .replace(/[。，！!？?]+$/g, '')
    .trim();

  if (cleanAssistant && cleanAssistant.length > 2) {
    if (cleanAssistant.length > 14) {
      return cleanAssistant.slice(0, 13) + '…';
    }
    return cleanAssistant;
  }

  return '新对话任务';
}

export function cleanSummary(rawText) {
  if (!rawText || typeof rawText !== 'string') return '对话已完成，点击查看回复详情';

  let text = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  text = text.replace(/```[\s\S]*?```/g, '[代码块]');
  text = text.replace(/^#+\s+/gm, '');
  text = text.replace(/\*\*([^\*]+)\*\*/g, '$1');
  text = text.replace(/\*([^\*]+)\*/g, '$1');
  text = text.replace(/`([^`]+)`/g, '$1');
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  text = text.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

  if (!text) return '对话已完成，点击查看回复详情';

  if (text.length > 70) {
    return text.slice(0, 68) + '...';
  }
  return text;
}

export function apply(ctx, config = {}) {
  const lastUserTexts = new Map();
  const lastAssistantTexts = new Map();

  function smartRename(session, userPrompt, assistantSummary) {
    const title = extractSmartTitle(userPrompt, assistantSummary);
    if (!title) return;

    // 使用 microtask 避开 session.append 内部的重入锁
    queueMicrotask(() => {
      try {
        session.append('session/title', {
          title,
          messageSeqs: [],
          source: { kind: 'user' },
        });
        console.log(`[dsh-smart-titler] 会话 "${session.id}" 已智能命名为: 「${title}」`);
      } catch (e) {
        console.warn('[dsh-smart-titler] rename error:', e.message);
      }
    });
  }

  ctx.effect(() => {
    const disposeSessionEvents = ctx.on('session/event', (session, event) => {
      const sessionId = String(session.id || 'default');

      // 1. 拦截底层错误写入的无脑标题
      if (event.type === 'session/title') {
        const title = event.data?.title;
        const sourceKind = event.data?.source?.kind;
        if (sourceKind !== 'user' && isDumbTitle(title)) {
          const userPrompt = lastUserTexts.get(sessionId) || '';
          const asstText = lastAssistantTexts.get(sessionId) || '';
          smartRename(session, userPrompt, cleanSummary(asstText));
        }
      }

      // 2. 捕获用户首句提问
      if (event.type === 'user/message') {
        const content = event.data?.message?.content || [];
        const textPieces = [];
        for (const block of content) {
          if (block.type === 'text' && typeof block.text === 'string') {
            textPieces.push(block.text);
          }
        }
        if (textPieces.length > 0 && !lastUserTexts.get(sessionId)) {
          lastUserTexts.set(sessionId, textPieces.join('\n'));
        }
      }

      // 3. 收集回复并在首轮输出完毕后自动命名
      if (event.type === 'assistant/message') {
        const content = event.data?.message?.content || [];
        const textPieces = [];
        const toolCalls = [];

        for (const block of content) {
          if (block.type === 'text' && typeof block.text === 'string') {
            textPieces.push(block.text);
          } else if (block.type === 'tool-call') {
            toolCalls.push(block);
          }
        }

        if (textPieces.length > 0) {
          lastAssistantTexts.set(sessionId, textPieces.join('\n'));
        }

        if (toolCalls.length === 0 && textPieces.length > 0) {
          try {
            const events = session.snapshotEvents ? session.snapshotEvents() : [];
            const titleEvent = events.findLast(e => e.type === 'session/title');
            const currentTitle = titleEvent?.data?.title || '';
            if (isDumbTitle(currentTitle)) {
              const userPrompt = lastUserTexts.get(sessionId) || '';
              smartRename(session, userPrompt, cleanSummary(textPieces.join('\n')));
            }
          } catch (_) {}
        }
      }
    });

    return () => {
      disposeSessionEvents();
      lastUserTexts.clear();
      lastAssistantTexts.clear();
    };
  }, 'dsh-smart-titler: lifecycle');
}

export default { name, inject, apply };
