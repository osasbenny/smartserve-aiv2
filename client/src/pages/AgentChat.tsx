import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { useState, useEffect, useRef } from "react";
import { Send, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function AgentChat() {
  const { agentId } = useParams<{ agentId: string }>();
  const [agent, setAgent] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [clientId, setClientId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch agent details
  const { data: agentData, isLoading: agentLoading } = trpc.agent.getById.useQuery({
    id: parseInt(agentId || "0"),
  });

  // Send message mutation
  const sendMessageMutation = trpc.chatData.sendMessage.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.assistantMessage,
          timestamp: new Date(),
        },
      ]);
      setInputValue("");
      setIsLoading(false);
    },
    onError: (error) => {
      alert(error.message || "Failed to send message");
      setIsLoading(false);
    },
  });

  useEffect(() => {
    if (agentData) {
      setAgent(agentData);
      // Add welcome message
      if (agentData.welcomeMessage) {
        setMessages([
          {
            role: "assistant",
            content: agentData.welcomeMessage,
            timestamp: new Date(),
          },
        ]);
      }
    }
  }, [agentData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !agent) return;

    // Create a temporary client if not exists
    if (!clientId) {
      // For demo purposes, use a fixed ID
      setClientId(1);
    }

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: inputValue,
        timestamp: new Date(),
      },
    ]);

    setIsLoading(true);

    await sendMessageMutation.mutateAsync({
      agentId: agent.id,
      clientId: clientId || 1,
      message: inputValue,
    });
  };

  if (agentLoading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">Loading chat...</div>
      </DashboardLayout>
    );
  }

  if (!agent) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">Agent not found</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-2xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Test Chat</h1>
          <p className="text-slate-600 mt-2">Chat with {agent.name}</p>
        </div>

        {/* Chat Container */}
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="border-b">
            <CardTitle>{agent.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    message.role === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-slate-100 text-slate-900 rounded-bl-none"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.role === "user"
                        ? "text-blue-100"
                        : "text-slate-500"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 text-slate-900 px-4 py-2 rounded-lg rounded-bl-none">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Input Area */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Type your message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chat Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>
              <span className="font-semibold">Agent:</span> {agent.name}
            </p>
            <p>
              <span className="font-semibold">Status:</span>{" "}
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                  agent.status === "active"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {agent.status}
              </span>
            </p>
            {agent.businessHoursEnabled && (
              <p>
                <span className="font-semibold">Business Hours:</span>{" "}
                {agent.businessHoursStart} - {agent.businessHoursEnd}{" "}
                {agent.businessHoursTimezone}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
