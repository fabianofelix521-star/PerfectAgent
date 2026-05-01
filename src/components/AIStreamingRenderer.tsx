import { memo, useEffect, useRef } from "react";

interface StreamingTextProps {
  text: string;
  isStreaming: boolean;
  className?: string;
}

export const StreamingText = memo(function StreamingText({
  text,
  isStreaming,
  className,
}: StreamingTextProps) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = text;
    }
  }, [text]);

  return (
    <p
      ref={ref}
      className={className}
      style={{
        opacity: isStreaming ? 1 : 0.8,
        transition: "opacity 0.2s ease",
      }}
    />
  );
});
