
import React, { useRef, useEffect } from 'react';
import { Icons } from './Icon.tsx';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, className }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  // Initialize content once or when value significantly changes externally
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
        // Only update if the content is truly different (avoids cursor jumping)
        // Simple check: if empty and value provided, or if strictly different logic needed
        if(value === '' && editorRef.current.innerHTML === '<br>') return;
        editorRef.current.innerHTML = value;
    }
  }, []); // Run once on mount to set initial value. Updating on every render causes cursor issues.

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html === '<br>' ? '' : html);
    }
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
        editorRef.current.focus();
    }
    handleInput(); // Trigger change after button click
  };

  const toolbarBtnClass = "p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors";

  return (
    <div className={`border border-gray-200 rounded-xl overflow-hidden bg-white focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent transition-all ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-100 bg-gray-50/50 flex-wrap">
        <button 
            type="button" // Important to prevent form submit
            onClick={() => execCommand('bold')} 
            className={toolbarBtnClass} 
            title="Negrita"
        >
          <Icons.Bold size={16} />
        </button>
        <button 
            type="button" 
            onClick={() => execCommand('italic')} 
            className={toolbarBtnClass} 
            title="Cursiva"
        >
          <Icons.Italic size={16} />
        </button>
        <button 
            type="button" 
            onClick={() => execCommand('underline')} 
            className={toolbarBtnClass} 
            title="Subrayado"
        >
          <Icons.Underline size={16} />
        </button>
        
        <div className="w-px h-5 bg-gray-300 mx-1"></div>
        
        <button 
            type="button" 
            onClick={() => execCommand('insertUnorderedList')} 
            className={toolbarBtnClass} 
            title="Lista con viñetas"
        >
          <Icons.ListBulleted size={16} />
        </button>
        <button 
            type="button" 
            onClick={() => execCommand('insertOrderedList')} 
            className={toolbarBtnClass} 
            title="Lista numerada"
        >
          <Icons.ListOrdered size={16} />
        </button>
      </div>

      {/* Editable Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="w-full p-4 min-h-[120px] max-h-[300px] overflow-y-auto focus:outline-none text-sm text-gray-700 leading-relaxed
        [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-2
        [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-2
        [&>li]:mb-1
        empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 cursor-text"
        data-placeholder={placeholder || 'Escribe aquí...'}
      />
    </div>
  );
};
