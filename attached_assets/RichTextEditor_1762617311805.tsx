import { useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { 
  Bold, 
  Italic, 
  Highlighter, 
  Type,
  Undo,
  Redo
} from 'lucide-react';
import { cn } from './ui/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder = 'Enter session content...' }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const executeCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const setTextColor = (color: string) => {
    executeCommand('foreColor', color);
  };

  const setBackgroundColor = (color: string) => {
    executeCommand('hiliteColor', color);
  };

  const colors = [
    { name: 'Black', value: '#000000' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Purple', value: '#A855F7' },
  ];

  const highlightColors = [
    { name: 'Yellow', value: '#FEF08A' },
    { name: 'Green', value: '#BBF7D0' },
    { name: 'Blue', value: '#BFDBFE' },
    { name: 'Pink', value: '#FBCFE8' },
    { name: 'Orange', value: '#FED7AA' },
    { name: 'None', value: 'transparent' },
  ];

  return (
    <div className="border rounded-lg bg-card overflow-hidden relative">
      {/* Toolbar */}
      <div className="border-b bg-muted/50 p-2 space-y-2">
        {/* Row 1: Basic formatting */}
        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => executeCommand('bold')}
            className="h-8 w-8 p-0"
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => executeCommand('italic')}
            className="h-8 w-8 p-0"
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => executeCommand('underline')}
            className="h-8 w-8 p-0"
            title="Underline"
          >
            <Type className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-border mx-1" />
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => executeCommand('undo')}
            className="h-8 w-8 p-0"
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => executeCommand('redo')}
            className="h-8 w-8 p-0"
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        {/* Row 2: Text colors */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-muted-foreground mr-2">Text:</span>
          {colors.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => setTextColor(color.value)}
              className={cn(
                "h-6 w-6 rounded border-2 border-border hover:border-foreground transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              )}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>

        {/* Row 3: Highlight colors */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-muted-foreground mr-2">Highlight:</span>
          {highlightColors.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => setBackgroundColor(color.value)}
              className={cn(
                "h-6 w-6 rounded border-2 transition-colors",
                color.value === 'transparent' 
                  ? "border-border hover:border-foreground bg-white dark:bg-gray-800" 
                  : "border-border hover:border-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              )}
              style={{ 
                backgroundColor: color.value === 'transparent' ? undefined : color.value 
              }}
              title={color.name}
            >
              {color.value === 'transparent' && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-4 h-0.5 bg-red-500 rotate-45" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Editor Container */}
      <div className="relative">
        {/* Placeholder */}
        {(!value || value === '<br>' || value === '') && (
          <div 
            className="absolute top-4 left-4 text-muted-foreground pointer-events-none text-sm"
            aria-hidden="true"
          >
            {placeholder}
          </div>
        )}
        
        {/* Editor */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          className="min-h-[400px] p-4 outline-none overflow-auto whitespace-pre-wrap font-sans text-sm focus:bg-muted/30 transition-colors"
          style={{ wordBreak: 'break-word' }}
          suppressContentEditableWarning
        />
      </div>
    </div>
  );
}
