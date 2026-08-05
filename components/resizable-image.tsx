"use client"

import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react"
import Image from "@tiptap/extension-image"
import React, { useState, useRef, useCallback } from "react"

const ImageComponent = ({
  node,
  updateAttributes,
  selected,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  node: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateAttributes: (attrs: any) => void
  selected: boolean
}) => {
  const [isResizing, setIsResizing] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsResizing(true)
      const startX = e.clientX
      const startWidth = imgRef.current ? imgRef.current.clientWidth : 300

      const onMouseMove = (moveEvent: MouseEvent) => {
        const currentX = moveEvent.clientX
        const diffX = currentX - startX
        const newWidth = Math.max(100, startWidth + diffX)
        updateAttributes({ width: `${newWidth}px` })
      }

      const onMouseUp = () => {
        setIsResizing(false)
        window.removeEventListener("mousemove", onMouseMove)
        window.removeEventListener("mouseup", onMouseUp)
      }

      window.addEventListener("mousemove", onMouseMove)
      window.addEventListener("mouseup", onMouseUp)
    },
    [updateAttributes]
  )

  return (
    <NodeViewWrapper className="relative inline-block my-2 group select-none">
      <div
        className={`relative inline-block ${
          selected || isResizing ? "ring-2 ring-primary rounded-md" : ""
        }`}
      >
        <img
          ref={imgRef}
          src={node.attrs.src}
          alt={node.attrs.alt || ""}
          style={{ width: node.attrs.width || "100%", height: "auto" }}
          className="rounded-md max-w-full block"
        />
        {(selected || isResizing) && (
          <div
            onMouseDown={startResize}
            className="absolute bottom-2 right-2 w-4 h-4 bg-primary rounded-full cursor-se-resize shadow-md flex items-center justify-center hover:scale-110 transition-transform"
            title="Arraste para redimensionar"
          />
        )}
      </div>
    </NodeViewWrapper>
  )
}

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) =>
          element.style.width || element.getAttribute("width"),
        renderHTML: (attributes) => {
          if (!attributes.width) {
            return {}
          }
          return {
            style: `width: ${attributes.width};`,
            width: attributes.width,
          }
        },
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageComponent)
  },
})
