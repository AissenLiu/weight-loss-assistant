import { NextRequest, NextResponse } from 'next/server'
import { doubaoClient, ChatMessage } from '@/lib/doubao'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, conversationHistory = [], role = 'supportive_friend' } = body

    // 验证请求参数
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid message parameter' },
        { status: 400 }
      )
    }

    if (!Array.isArray(conversationHistory)) {
      return NextResponse.json(
        { error: 'Invalid conversationHistory parameter' },
        { status: 400 }
      )
    }

    // 调用豆包API
    const response = await doubaoClient.weightLossChat(
      message,
      conversationHistory as ChatMessage[],
      role
    )

    return NextResponse.json({
      success: true,
      response: response.content,
      images: response.images,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Chat API error:', error)

    // 返回友好的错误消息
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process chat request',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}

// 健康检查端点
export async function GET() {
  const apiStatus = doubaoClient.getStatus()

  return NextResponse.json({
    status: 'healthy',
    service: 'weight-loss-assistant-chat-api',
    api: 'doubao',
    apiConfigured: apiStatus.configured,
    apiModel: apiStatus.model,
    timestamp: new Date().toISOString()
  })
}