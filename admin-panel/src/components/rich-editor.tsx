"use client"

import { useState, useRef, useCallback } from "react"
import { 
  Bold, Italic, Underline, List, ListOrdered, Link2, Image, 
  AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, Heading3,
  Code, Quote, Undo, Redo, Eye, Code2, Upload, Strikethrough,
  Minus, Type, Palette, Loader2, RemoveFormatting
} from "lucide-react"
import { cn } from "@/lib/utils"
import DOMPurify from "isomorphic-dompurify"

interface RichEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: string
}

const ToolButton = ({ 
  icon: Icon, 
  onClick, 
  active, 
  title,
  disabled,
  className: extraClass
}: { 
  icon: React.ElementType
  onClick: () => void
  active?: boolean
  title: string
  disabled?: boolean
  className?: string
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    disabled={disabled}
    className={cn(
      "p-1.5 rounded hover:bg-gray-200 transition-colors",
      active && "bg-blue-100 text-blue-600",
      disabled && "opacity-40 cursor-not-allowed",
      extraClass
    )}
  >
    <Icon className="w-4 h-4" />
  </button>
)

export function RichEditor({ value, onChange, placeholder, minHeight = "300px" }: RichEditorProps) {
  const [showHtml, setShowHtml] = useState(false)
  const [uploading, setUploading] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const execCommand = (command: string, value?: string) => {
    editorRef.current?.focus()
    document.execCommand(command, false, value)
    // Sync content after command
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const handleEditorInput = (e: React.FormEvent<HTMLDivElement>) => {
    onChange(e.currentTarget.innerHTML)
  }

  const insertLink = () => {
    const url = prompt("URL:")
    if (url) execCommand("createLink", url)
  }

  const insertImageUrl = () => {
    const url = prompt("URL imagine:")
    if (url) execCommand("insertImage", url)
  }

  const handleImageUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/app/api/upload', { method: 'POST', body: formData })
        const data = await res.json()
        if (data.url) {
          editorRef.current?.focus()
          document.execCommand('insertImage', false, data.url)
          if (editorRef.current) onChange(editorRef.current.innerHTML)
        }
      }
    } catch (err) {
      console.error('Image upload error:', err)
      alert('Eroare la încărcarea imaginii')
    } finally {
      setUploading(false)
    }
  }, [onChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) handleImageUpload(files)
  }, [handleImageUpload])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) handleImageUpload(new DataTransfer().files.length === 0 ? (() => { const dt = new DataTransfer(); dt.items.add(file); return dt.files })() : null)
        return
      }
    }
  }, [handleImageUpload])

  const setFontSize = (size: string) => {
    execCommand('fontSize', size)
  }

  const setTextColor = () => {
    const color = prompt("Cod culoare (ex: #ff0000, red):", "#000000")
    if (color) execCommand('foreColor', color)
  }

  const insertHR = () => {
    execCommand('insertHorizontalRule')
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => { handleImageUpload(e.target.files); e.target.value = '' }}
      />
      
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-gray-200 bg-gray-50">
        <ToolButton icon={Undo} onClick={() => execCommand("undo")} title="Undo (Ctrl+Z)" />
        <ToolButton icon={Redo} onClick={() => execCommand("redo")} title="Redo (Ctrl+Y)" />
        <div className="w-px h-5 bg-gray-300 mx-0.5" />
        
        <ToolButton icon={Bold} onClick={() => execCommand("bold")} title="Bold (Ctrl+B)" />
        <ToolButton icon={Italic} onClick={() => execCommand("italic")} title="Italic (Ctrl+I)" />
        <ToolButton icon={Underline} onClick={() => execCommand("underline")} title="Subliniat (Ctrl+U)" />
        <ToolButton icon={Strikethrough} onClick={() => execCommand("strikeThrough")} title="Tăiat" />
        <ToolButton icon={RemoveFormatting} onClick={() => execCommand("removeFormat")} title="Șterge formatare" />
        <div className="w-px h-5 bg-gray-300 mx-0.5" />
        
        <select
          onChange={e => { if (e.target.value) execCommand("formatBlock", e.target.value); e.target.value = "" }}
          defaultValue=""
          className="h-7 px-1 text-xs border border-gray-300 rounded bg-white cursor-pointer"
          title="Tip paragraf"
        >
          <option value="" disabled>Paragraf</option>
          <option value="p">Normal</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
          <option value="pre">Cod</option>
        </select>

        <select
          onChange={e => { if (e.target.value) setFontSize(e.target.value); e.target.value = "" }}
          defaultValue=""
          className="h-7 px-1 text-xs border border-gray-300 rounded bg-white cursor-pointer"
          title="Dimensiune text"
        >
          <option value="" disabled>Mărime</option>
          <option value="1">Mic</option>
          <option value="3">Normal</option>
          <option value="4">Mediu</option>
          <option value="5">Mare</option>
          <option value="6">Foarte mare</option>
          <option value="7">Titlu</option>
        </select>
        <div className="w-px h-5 bg-gray-300 mx-0.5" />
        
        <ToolButton icon={AlignLeft} onClick={() => execCommand("justifyLeft")} title="Aliniere stânga" />
        <ToolButton icon={AlignCenter} onClick={() => execCommand("justifyCenter")} title="Centrare" />
        <ToolButton icon={AlignRight} onClick={() => execCommand("justifyRight")} title="Aliniere dreapta" />
        <div className="w-px h-5 bg-gray-300 mx-0.5" />
        
        <ToolButton icon={List} onClick={() => execCommand("insertUnorderedList")} title="Listă" />
        <ToolButton icon={ListOrdered} onClick={() => execCommand("insertOrderedList")} title="Listă numerotată" />
        <ToolButton icon={Quote} onClick={() => execCommand("formatBlock", "blockquote")} title="Citat" />
        <ToolButton icon={Minus} onClick={insertHR} title="Linie separare" />
        <div className="w-px h-5 bg-gray-300 mx-0.5" />
        
        <ToolButton icon={Link2} onClick={insertLink} title="Inserează link" />
        <ToolButton icon={Palette} onClick={setTextColor} title="Culoare text" />
        <div className="w-px h-5 bg-gray-300 mx-0.5" />

        <ToolButton icon={Image} onClick={insertImageUrl} title="Imagine din URL" />
        <ToolButton 
          icon={uploading ? Loader2 : Upload} 
          onClick={() => fileInputRef.current?.click()} 
          title="Încarcă imagine" 
          disabled={uploading}
          className={uploading ? "animate-spin" : ""}
        />
        
        <div className="flex-1" />
        <ToolButton 
          icon={showHtml ? Eye : Code2} 
          onClick={() => setShowHtml(!showHtml)} 
          active={showHtml}
          title={showHtml ? "Vizualizare" : "Cod HTML"} 
        />
      </div>

      {/* Editor */}
      {showHtml ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full p-4 font-mono text-sm focus:outline-none resize-y"
          style={{ minHeight }}
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleEditorInput}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onPaste={handlePaste}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value, { ADD_TAGS: ['img'], ADD_ATTR: ['src', 'alt', 'style', 'class', 'width', 'height'], ALLOW_DATA_ATTR: false }) }}
          className="p-4 focus:outline-none prose prose-sm max-w-none [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-2"
          style={{ minHeight }}
          data-placeholder={placeholder}
        />
      )}

      {uploading && (
        <div className="px-4 py-2 bg-blue-50 border-t text-xs text-blue-600 flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin" /> Se încarcă imaginea...
        </div>
      )}
    </div>
  )
}

interface SimpleEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}

export function SimpleEditor({ value, onChange, placeholder, rows = 4 }: SimpleEditorProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
    />
  )
}
