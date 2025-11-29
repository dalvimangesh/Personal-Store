import * as React from "react"
import { cn } from "@/lib/utils"

export interface HighlightedTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string
}

const HighlightedTextarea = React.forwardRef<HTMLTextAreaElement, HighlightedTextareaProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)
    const backdropRef = React.useRef<HTMLDivElement>(null)

    // Sync scroll
    const handleScroll = () => {
      if (backdropRef.current && textareaRef.current) {
        backdropRef.current.scrollTop = textareaRef.current.scrollTop
        backdropRef.current.scrollLeft = textareaRef.current.scrollLeft
      }
    }

    // Merge refs
    React.useImperativeHandle(ref, () => textareaRef.current!)

    // Render highlights
    const renderHighlights = (text: string) => {
      // Split by {{variable}} pattern
      const parts = text.split(/({{[^}]+}})/g)
      return parts.map((part, index) => {
        if (part.match(/^{{[^}]+}}$/)) {
            // Variable - highlight background, text transparent
            return (
              <span key={index} className="bg-yellow-500/30 text-transparent rounded-sm box-decoration-clone">
                {part}
              </span>
            )
        }
        // Regular text - purely transparent to show textarea text on top
        return <span key={index} className="text-transparent">{part}</span>
      })
    }

    return (
      <div className="relative w-full h-full isolate">
        <div
            ref={backdropRef}
            className={cn(
                "absolute inset-0 overflow-auto pointer-events-none font-mono text-sm leading-relaxed whitespace-pre-wrap break-words z-0",
                className
            )}
            aria-hidden="true"
        >
            {renderHighlights(value)}
            {/* Handle trailing newline for alignment */}
            {value.endsWith("\n") && <br />}
        </div>
        <textarea
            ref={textareaRef}
            value={value}
            onChange={onChange}
            onScroll={handleScroll}
            className={cn(
                "relative block w-full h-full bg-transparent font-mono text-sm leading-relaxed resize-none focus:outline-none z-10 text-foreground",
                className
            )}
            spellCheck={false}
            {...props}
        />
      </div>
    )
  }
)
HighlightedTextarea.displayName = "HighlightedTextarea"

export { HighlightedTextarea }


