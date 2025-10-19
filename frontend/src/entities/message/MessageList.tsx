import type { Message } from "../chat/ChatWidget";

export default function MessageList({
  listRef,
  messages,
}: {
  listRef: React.RefObject<HTMLDivElement | null>;
  messages: Message[];
}) {
  return (
    <div
      ref={listRef}
      className="flex-1 overflow-y-auto p-2 gap-2 flex flex-col"
      aria-live="polite"
    >
      {messages.map((m) => (
        <div
          key={m.id}
          className={
            m.sender === "me"
              ? "self-end text-white px-3 py-2 rounded-[14px] max-w-[78%] text-[14px] shadow-[0_2px_6px_rgba(11,99,182,0.16)] bg-[linear-gradient(180deg,#1e90ff,#0b63b6)]"
              : "self-start bg-white text-slate-900 px-3 py-2 rounded-[14px] max-w-[78%] text-[14px] shadow-[0_1px_3px_rgba(2,6,23,0.06)]"
          }
        >
          {m.text}
        </div>
      ))}
    </div>
  );
}
