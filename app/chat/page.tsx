import { ChatInterface } from "@/components/chat-interface"
import { BottomNav } from "@/components/bottom-nav"

export default function ChatPage() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatInterface />
      <BottomNav />
    </div>
  )
}
