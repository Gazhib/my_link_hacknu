import { useEffect, useRef, useState } from "react";
import MessageList from "../message/MessageList";
import { messageService } from "../../shared/api/messageService";

export type Message = { id: number; text: string; sender: "me" | "them" };

interface ChatWidgetProps {
  applicationId: string;
  chatToken?: string;
}

export default function ChatWidget({ applicationId, chatToken }: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [closed, setClosed] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isChatEnded, setIsChatEnded] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messageIdCounter = useRef(0);
  const reconnectAttempts = useRef(0);
  const shouldReconnect = useRef(true);

  const connectWebSocket = async () => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';
    let wsUrl = API_BASE_URL.replace(/^http/, 'ws') + `/ws/applications/${applicationId}`;
    
    if (chatToken) {
      wsUrl += `?token=${chatToken}`;
    }
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      setIsLoading(false);
      setStatusMessage("");
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket message:", data);

        switch (data.type) {
          case "welcome":
            console.log("Session ID:", data.session_id);
            break;

          case "keepalive":
            console.log("Received keepalive");
            break;

          case "pong":
            break;

          case "analysis_status":
            setStatusMessage(data.message);
            break;

          case "bot_typing":
            setIsBotTyping(data.value);
            break;

          case "question":
            setIsBotTyping(false);
            setStatusMessage("");
            const questionMsg: Message = {
              id: ++messageIdCounter.current,
              text: data.text,
              sender: "them",
            };
            setMessages((prev) => [...prev, questionMsg]);
            break;

          case "analysis_update":
            const ackMsg: Message = {
              id: ++messageIdCounter.current,
              text: data.message,
              sender: "them",
            };
            setMessages((prev) => [...prev, ackMsg]);
            break;

          case "final_summary":
            setIsBotTyping(false);
            const summaryMsg: Message = {
              id: ++messageIdCounter.current,
              text: data.message,
              sender: "them",
            };
            setMessages((prev) => [...prev, summaryMsg]);
            shouldReconnect.current = false;
            break;

          case "error":
            console.error("WebSocket error:", data.message);
            setStatusMessage(`Ошибка: ${data.message}`);
            break;

          default:
            console.log("Unknown message type:", data.type);
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setStatusMessage("Ошибка соединения");
      setIsConnected(false);
    };

    ws.onclose = (event) => {
      console.log("WebSocket disconnected", event.code, event.reason);
      setIsConnected(false);
      setIsBotTyping(false);

      if (
        shouldReconnect.current &&
        event.code !== 1000 &&
        reconnectAttempts.current < 5
      ) {
        reconnectAttempts.current++;
        setStatusMessage(
          `Переподключение... (попытка ${reconnectAttempts.current})`
        );
      } else if (reconnectAttempts.current >= 5) {
        setStatusMessage(
          "Не удалось восстановить соединение. Обновите страницу."
        );
      }
    };
  };

  useEffect(() => {
    const loadMessageHistory = async () => {
      if (!applicationId) return;

      try {
        setIsLoadingHistory(true);
        
        const appId = Number(applicationId);
        const sessionResponse = await messageService.getChatSession(appId);
        if (sessionResponse.state === "closed") {
          setIsChatEnded(true);
          setStatusMessage("Чат завершен");
        }

        const response = await messageService.getMessages(appId);

        console.log("Message history response:", response);

        const historyMessages: Message[] = response.map(
          (msg: any, index: number) => ({
            id: index + 1,
            text: msg.body,
            sender: msg.userId ? "me" : "them",
          })
        );

        console.log("Mapped history messages:", historyMessages);

        setMessages(historyMessages);
        messageIdCounter.current = historyMessages.length;
      } catch (error) {
        console.error("Failed to load message history:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadMessageHistory();
  }, [applicationId]);

  useEffect(() => {
    if (!applicationId || isChatEnded) return;

    shouldReconnect.current = true;
    setIsLoading(true);
    connectWebSocket();

    return () => {
      shouldReconnect.current = false;

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, "Component unmounting");
      }
    };
  }, [applicationId, isChatEnded]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isBotTyping, statusMessage]);

  const send = () => {
    const text = input.trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)
      return;

    const userMsg: Message = {
      id: ++messageIdCounter.current,
      text,
      sender: "me",
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    wsRef.current.send(
      JSON.stringify({
        type: "answer",
        text: text,
      })
    );

  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleResize = () => {
    setClosed((prev) => !prev);
  };

  return (
    <aside
      aria-label="Chat widget"
      className="fixed w-[360px] max-w-full max-h-[500px] flex flex-col rounded-[12px] shadow-[0_6px_20px_rgba(2,6,23,0.12)] overflow-hidden font-sans bottom-4 right-4 bg-white z-50"
    >
      <header className="bg-gradient-to-r from-sky-500 to-sky-700 text-white py-3 px-4 flex items-center gap-3">
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            isConnected ? "bg-green-400" : "bg-red-400"
          } opacity-90`}
          title={isConnected ? "Подключено" : "Не подключено"}
        />
        <div className="text-[16px] font-semibold flex-1">ИИ Ассистент</div>
        <button
          className="text-xs font-semibold cursor-pointer text-white underline hover:no-underline"
          onClick={handleResize}
        >
          {!closed ? "Закрыть" : "Открыть"}
        </button>
      </header>

      {!closed && (
        <>
          <section className="bg-slate-50 p-3 flex flex-col flex-1 min-h-0">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                Загрузка истории сообщений...
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                Подключение...
              </div>
            ) : (
              <>
                <MessageList listRef={listRef} messages={messages} />
                {statusMessage && (
                  <div className="mt-2 text-xs text-gray-500 italic text-center">
                    {statusMessage}
                  </div>
                )}
                {isBotTyping && (
                  <div className="self-start bg-white text-slate-900 px-3 py-2 rounded-[14px] max-w-[78%] text-[14px] shadow-[0_1px_3px_rgba(2,6,23,0.06)] mt-2">
                    <div className="flex gap-1">
                      <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></span>
                      <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></span>
                      <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></span>
                    </div>
                  </div>
                )}
                {!isConnected && (
                  <div className="flex items-center justify-center h-full text-red-500 text-sm text-center px-4">
                    {statusMessage || "Чат с ИИ закончен"}
                  </div>
                )}
              </>
            )}
          </section>

          <footer className="p-3 flex gap-2 bg-white items-center border-t border-gray-200">
            <input
              aria-label="Type a message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={
                isConnected ? "Напишите сообщение..." : "Нет соединения"
              }
              disabled={!isConnected || isBotTyping}
              className="flex-1 px-3 py-2 rounded-[10px] border border-[#e6eef6] outline-none text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              aria-label="Send message"
              onClick={send}
              disabled={!input.trim() || !isConnected || isBotTyping}
              className="bg-[#0b63b6] text-white px-3 py-2 rounded-[10px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#0a5599] transition-colors"
            >
              Send
            </button>
          </footer>
        </>
      )}
    </aside>
  );
}
