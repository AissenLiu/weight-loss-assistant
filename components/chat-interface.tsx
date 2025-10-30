"use client"

import { useState, useRef, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, Crown, Send, Loader2, Image as ImageIcon, RefreshCw } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
  images?: string[]
}

type RoleMessages = {
  [key: string]: Message[]
}

const quickReplies = [
  "I got stuck in work",
  "I skipped lunch",
  "Haven't eaten all day",
  "I feel stressed today",
  "I want to eat junk food",
  "I didn't exercise today"
]

const roleOptions = {
  supportive_friend: "Supportive Friend",
  nutritionist: "Nutritionist",
  fitness_trainer: "Fitness Trainer"
}

const roleWelcomeMessages = {
  supportive_friend: "Hi! I'm here to support you on your weight loss journey. How are you feeling today? Remember, every small step counts! 💪",
  nutritionist: "Hello! I'm your nutritionist, ready to help you create a healthy eating plan. What would you like to know about nutrition today? 🥗",
  fitness_trainer: "Hey there! I'm your fitness trainer, here to help you reach your fitness goals safely. What's your workout plan today? 💪"
}

export function ChatInterface() {
  const [allRoleMessages, setAllRoleMessages] = useState<RoleMessages>(() => {
    const initialMessages: RoleMessages = {}
    Object.keys(roleOptions).forEach((roleKey) => {
      initialMessages[roleKey] = [{
        id: `${roleKey}-welcome`,
        role: "assistant",
        content: roleWelcomeMessages[roleKey as keyof typeof roleWelcomeMessages],
        timestamp: new Date().toISOString()
      }]
    })
    return initialMessages
  })

  const [currentRole, setCurrentRole] = useState<"supportive_friend" | "nutritionist" | "fitness_trainer">("supportive_friend")
  const [messages, setMessages] = useState<Message[]>(allRoleMessages[currentRole])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [backgroundImage, setBackgroundImage] = useState<string>("/weight-loss-motivation-before-after-mirror.jpg")
  const [backgroundLoaded, setBackgroundLoaded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 确保默认背景图片加载
  useEffect(() => {
    const img = new Image()
    img.onload = () => setBackgroundLoaded(true)
    img.onerror = () => {
      console.warn('默认背景图片加载失败')
      setBackgroundLoaded(true) // 即使失败也设置为已加载，避免无限加载状态
    }
    img.src = backgroundImage
  }, []) // 只在组件挂载时执行一次

  // 角色切换时更新显示的消息
  useEffect(() => {
    setMessages(allRoleMessages[currentRole])
  }, [currentRole, allRoleMessages])

  // 切换角色的处理函数
  const handleRoleChange = (newRole: "supportive_friend" | "nutritionist" | "fitness_trainer") => {
    setCurrentRole(newRole)
  }

  // 重置背景图片
  const resetBackground = () => {
    setBackgroundLoaded(false) // 重置加载状态
    setBackgroundImage("/weight-loss-motivation-before-after-mirror.jpg")
    toast({
      title: "背景已重置",
      description: "背景图片已恢复为默认图片",
    })
  }

  // 设置最新的食物图片为背景
  const setLatestFoodImageAsBackground = () => {
    // 查找最新的包含图片的消息
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i]
      if (message.images && message.images.length > 0) {
        setBackgroundLoaded(false) // 重置加载状态
        setBackgroundImage(message.images[0])
        toast({
          title: "背景已更新",
          description: "已将最新的食物图片设置为背景",
        })
        return
      }
    }

    toast({
      title: "没有找到食物图片",
      description: "请先发送包含食物的消息来生成图片",
      variant: "destructive",
    })
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const timestamp = new Date().toISOString()
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input,
      timestamp,
    }

    // 更新当前角色的消息历史
    setAllRoleMessages(prev => ({
      ...prev,
      [currentRole]: [...prev[currentRole], userMessage]
    }))

    setInput("")
    setIsLoading(true)

    try {
      // 准备发送给API的对话历史（排除欢迎消息）
      const conversationHistory = allRoleMessages[currentRole]
        .filter(msg => !msg.id.includes('welcome'))
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          conversationHistory,
          role: currentRole
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      if (data.success && data.response) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.response,
          timestamp: new Date().toISOString(),
          images: data.images || undefined
        }

        // 更新当前角色的消息历史
        setAllRoleMessages(prev => ({
          ...prev,
          [currentRole]: [...prev[currentRole], assistantMessage]
        }))

        // 如果生成了图片，将第一张图片设置为背景
        if (data.images && data.images.length > 0) {
          setBackgroundLoaded(false) // 重置加载状态
          setBackgroundImage(data.images[0])
        }
      } else {
        throw new Error('Invalid response format')
      }

    } catch (error) {
      console.error('Error sending message:', error)

      // 显示错误提示
      toast({
        title: "发送失败",
        description: "无法连接到AI助手，请稍后再试。",
        variant: "destructive",
      })

      // 添加错误消息
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "抱歉，我现在无法回应。请检查网络连接或稍后再试。如果问题持续存在，请联系开发者。",
        timestamp: new Date().toISOString(),
      }

      // 更新当前角色的消息历史
      setAllRoleMessages(prev => ({
        ...prev,
        [currentRole]: [...prev[currentRole], errorMessage]
      }))
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickReply = (reply: string) => {
    setInput(reply)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shadow-md">
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/90">
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <div className="flex items-center gap-2">
          <Select value={currentRole} onValueChange={(value) => handleRoleChange(value as "supportive_friend" | "nutritionist" | "fitness_trainer")}>
            <SelectTrigger className="w-[140px] bg-primary-foreground/20 border-0 text-primary-foreground font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="supportive_friend">Supportive Friend</SelectItem>
              <SelectItem value="nutritionist">Nutritionist</SelectItem>
              <SelectItem value="fitness_trainer">Fitness Trainer</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-primary-foreground/80">Mode</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary/90"
            onClick={setLatestFoodImageAsBackground}
            title="使用最新的食物图片作为背景"
          >
            <ImageIcon className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary/90"
            onClick={resetBackground}
            title="重置为默认背景"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/90">
            <Crown className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4 relative"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* 轻微遮罩以确保内容可读性 */}
        <div className="absolute inset-0 bg-black/20" />

        {/* Mode indicator */}
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mb-6">
          <span>Me in crush's eyes</span>
          <span className="font-bold">VS</span>
          <span>I thought I am</span>
        </div>

        {messages.map((message) => (
          <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            {message.role === "assistant" && (
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {currentRole === 'supportive_friend' ? '👫' : currentRole === 'nutritionist' ? '🥗' : '💪'}
                </AvatarFallback>
              </Avatar>
            )}

            <div className={`flex flex-col max-w-[75%] ${message.role === "user" ? "items-end" : "items-start"}`}>
              <div
                className={`rounded-2xl px-4 py-3 backdrop-blur-md ${
                  message.role === "user"
                    ? "bg-primary/90 text-primary-foreground shadow-lg border border-primary/20"
                    : "bg-card/95 text-card-foreground shadow-lg border border-border/50"
                }`}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>
              </div>

              {/* 显示生成的图片 */}
              {message.images && message.images.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground/80 px-2 bg-background/50 backdrop-blur-sm rounded-full w-fit py-1">
                    <ImageIcon className="h-3 w-3" />
                    <span>生成的食物图片</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {message.images.map((imageUrl, index) => (
                      <div key={index} className="relative group">
                        <div className="rounded-lg border border-border/50 overflow-hidden shadow-lg backdrop-blur-sm bg-background/20">
                          <img
                            src={imageUrl}
                            alt={`生成的食物图片 ${index + 1}`}
                            className="w-full max-w-[300px] cursor-pointer hover:scale-105 transition-transform duration-300"
                            onClick={() => window.open(imageUrl, '_blank')}
                          />
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                          <div className="bg-background/90 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ImageIcon className="h-4 w-4 text-foreground" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {message.role === "assistant" && (
                <p className="text-xs text-muted-foreground mt-1 px-2">{roleOptions[currentRole]} Mode</p>
              )}
            </div>

            {message.role === "user" && (
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src="/diverse-user-avatars.png" />
                <AvatarFallback className="bg-secondary text-secondary-foreground">ME</AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t bg-card px-4 py-2 space-y-2">
        {/* Quick Replies */}
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Why you feel (xxx eg. guilty) today?</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {quickReplies.map((reply, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleQuickReply(reply)}
                className="whitespace-nowrap rounded-full border-2 hover:border-primary hover:bg-primary/5 text-xs h-8"
              >
                {reply}
              </Button>
            ))}
          </div>
        </div>

        {/* Input Field */}
        <div className="flex gap-2 items-center">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 rounded-full bg-secondary border-0 focus-visible:ring-primary h-10"
          />
          <Button
            onClick={handleSend}
            size="icon"
            disabled={isLoading}
            className="rounded-full h-10 w-10 bg-primary hover:bg-primary/90 flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
