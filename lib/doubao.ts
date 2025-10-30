/**
 * 豆包 API 客户端
 * 用于调用豆包聊天模型 API
 * 参考 dxjl-tool 项目的实现
 * 集成图片生成功能
 */

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
}

interface ChatCompletionRequest {
  messages: ChatMessage[]
  model?: string
  temperature?: number
  max_tokens?: number
  stream?: boolean
  thinking?: {
    type: 'enabled' | 'disabled'
  }
}

interface ChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: ChatMessage
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

class DoubaoClient {
  private apiKey: string
  private baseURL: string
  private defaultModel: string

  constructor() {
    this.apiKey = process.env.DOUBAO_API_KEY || ''
    this.baseURL = process.env.DOUBAO_API_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3'
    this.defaultModel = process.env.DOUBAO_MODEL || 'doubao-seed-1-6-flash-250615'

    if (!this.apiKey) {
      console.warn('豆包API key not configured. Please set DOUBAO_API_KEY in your environment variables.')
    }
  }

  /**
   * 发送聊天请求到豆包API
   */
  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (!this.apiKey) {
      throw new Error('豆包API key not configured')
    }

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: request.model || this.defaultModel,
          messages: request.messages,
          temperature: request.temperature || 0.7,
          max_tokens: request.max_tokens || 2000,
          stream: request.stream || false,
          thinking: request.thinking || { type: 'disabled' }
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('豆包API错误响应:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        })
        throw new Error(`豆包API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      return data as ChatCompletionResponse
    } catch (error) {
      console.error('Error calling 豆包API:', error)
      throw error
    }
  }

  /**
   * 流式聊天响应
   */
  async *chatCompletionStream(request: ChatCompletionRequest): AsyncGenerator<string> {
    if (!this.apiKey) {
      throw new Error('豆包API key not configured')
    }

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: request.model || this.defaultModel,
          messages: request.messages,
          temperature: request.temperature || 0.7,
          max_tokens: request.max_tokens || 2000,
          stream: true,
          thinking: request.thinking || { type: 'disabled' }
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('豆包API流式错误响应:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        })
        throw new Error(`豆包API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('Response body is not readable')
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              return
            }

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content
              if (content) {
                yield content
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in streaming chat completion:', error)
      throw error
    }
  }

  /**
   * 为减肥助手优化的聊天方法
   */
  async weightLossChat(userMessage: string, conversationHistory: ChatMessage[] = [], role: string = 'supportive_friend'): Promise<{ content: string; images?: string[] }> {
    // 根据角色设置系统提示
    const systemPrompts = {
      supportive_friend: `你是一个温暖、支持的朋友，正在帮助用户进行减肥之旅。你的特点是：
- 鼓励性和积极性
- 提供实用的减肥建议
- 关注健康而不是体重数字
- 给予情感支持
- 使用亲切、友善的语气
- 在适当的时候使用鼓励的表情符号`,

      nutritionist: `你是一名专业的营养师，专门帮助用户制定健康的饮食计划。你的特点是：
- 提供科学、准确的营养建议
- 制定合理的饮食计划
- 解释食物的营养价值
- 给出健康食谱建议
- 专业但不失亲和力`,

      fitness_trainer: `你是一名专业的健身教练，帮助用户制定运动计划。你的特点是：
- 提供专业的运动指导
- 制定适合的运动计划
- 解释动作要点和注意事项
- 鼓励用户坚持运动
- 关注运动安全和效果`
    }

    const systemPrompt = systemPrompts[role as keyof typeof systemPrompts] || systemPrompts.supportive_friend

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ]

    try {
      const response = await this.chatCompletion({
        messages,
        temperature: 0.8,
        max_tokens: 1500,
        thinking: { type: 'enabled' } // 启用深度思考功能
      })

      // 处理豆包API的响应格式
      if (response.choices && response.choices.length > 0) {
        const content = response.choices[0].message.content
        const textContent = typeof content === 'string' ? content : JSON.stringify(content)

        // 检测是否需要生成食物图片
        const foodDescription = doubaoImageClient.extractFoodDescription(userMessage)
        let images: string[] = []

        if (foodDescription && doubaoImageClient.detectFoodKeywords(userMessage)) {
          try {
            console.log('检测到食物相关内容，开始生成图片...')
            images = await doubaoImageClient.generateFoodImage(foodDescription)
            console.log('图片生成成功，数量:', images.length)
          } catch (imageError) {
            console.error('图片生成失败:', imageError)
            // 图片生成失败不影响聊天回复
          }
        }

        return {
          content: textContent,
          images: images.length > 0 ? images : undefined
        }
      }

      return { content: '抱歉，我现在无法回应。请稍后再试。' }
    } catch (error) {
      console.error('Error in weight loss chat:', error)

      // 详细的错误日志
      console.error('=== 豆包API错误信息 ===')
      if (error instanceof Error) {
        console.error('错误消息:', error.message)
      }
      console.error('用户消息:', userMessage)
      console.error('角色模式:', role)
      console.error('对话历史长度:', conversationHistory.length)
      console.error('========================')

      return { content: '抱歉，遇到了一些技术问题。请稍后再试，或者联系开发者获得帮助。' }
    }
  }

  /**
   * 获取API状态信息
   */
  getStatus() {
    return {
      configured: !!this.apiKey,
      baseURL: this.baseURL,
      model: this.defaultModel,
      hasKey: this.apiKey.length > 0
    }
  }
}

import { doubaoImageClient } from './doubao-image'

// 创建单例实例
export const doubaoClient = new DoubaoClient()

export type { ChatMessage, ChatCompletionRequest, ChatCompletionResponse }
export default DoubaoClient