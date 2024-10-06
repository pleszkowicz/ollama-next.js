'use client'

import { FormEvent, useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, AlertCircle, User, Bot } from "lucide-react"

enum UserRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}
type Message = {
  role: UserRole;
  content: string;
}

export function OllamaChat() {
  const [prompt, setPrompt] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setIsLoading(true)
    setError(null)

    const newMessages = [...messages, { role: UserRole.USER, content: prompt }]
    setMessages(newMessages)
    setPrompt('')

    try {
      const res = await fetch('/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt, messages: newMessages }),
      })

      if (!res.ok) {
        throw new Error('Request failed')
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let done = false
      let accumulatedResponse = ''

      while (!done) {
        const { value, done: streamDone } = await reader!.read()
        done = streamDone
        if (value) {
          accumulatedResponse += decoder.decode(value, { stream: true })
          setMessages([...newMessages, { role: UserRole.ASSISTANT, content: accumulatedResponse }])
        }
      }
    } catch (err) {
      console.log(err)
      setError('Failed to fetch data')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Ollama Chat</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] w-full pr-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex items-start space-x-2 mb-4 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <Bot className="w-6 h-6 mt-0.5 text-blue-500" />
                )}
                <div
                  className={`rounded-lg p-2 max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm" dangerouslySetInnerHTML={{ __html: message.content }}></p>
                </div>
                {message.role === 'user' && (
                  <User className="w-6 h-6 mt-0.5 text-green-500" />
                )}
              </div>
            ))}
          </ScrollArea>
        </CardContent>
        <CardFooter className="flex flex-col items-start">
          {error && (
            <Alert variant="destructive" className="mb-4 w-full">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4 w-full">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  handleSubmit(event)
                }
              }}
              placeholder="Enter a prompt"
              className="min-h-[100px]"
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Send'
              )}
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
