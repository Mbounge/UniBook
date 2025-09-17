'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent, Editor, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Link from '@tiptap/extension-link';
import { marked } from 'marked';
import { Toaster, toast } from 'react-hot-toast';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { Extension, InputRule } from '@tiptap/core';
import { Heading } from '@tiptap/extension-heading';
import { CellSelection } from 'prosemirror-tables';
import { 
  Upload, Sparkles, Bold, Italic, List, ListOrdered, Save, 
  Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, 
  AlignJustify, Undo, Redo, Code,
  Table as TableIcon, Trash2, Plus, Minus, Merge, Split, ChevronDown
} from 'lucide-react';

const PREDEFINED_SIZES: { [key: string]: string } = {
  p: '12pt',
  h1: '24pt',
  h2: '18pt',
  h3: '16pt',
};

type FontSizeOptions = { types: string[] };
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: { setFontSize: (size: string) => ReturnType; unsetFontSize: () => ReturnType; };
  }
}
export const FontSize = Extension.create<FontSizeOptions>({ name: 'fontSize', addOptions() { return { types: ['textStyle'] }; }, addGlobalAttributes() { return [{ types: this.options.types, attributes: { fontSize: { default: null, parseHTML: e => e.style.fontSize.replace(/['"]+/g, ''), renderHTML: attrs => (attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {}), }, }, }]; }, addCommands() { return { setFontSize: size => ({ chain }) => chain().setMark('textStyle', { fontSize: size }).run(), unsetFontSize: () => ({ chain }) => chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(), }; }, });
const ResetMarksOnEnter = Extension.create({ name: 'resetMarksOnEnter', addKeyboardShortcuts() { return { Enter: () => this.editor.isActive('heading') ? this.editor.commands.splitBlock({ keepMarks: false }) : false, }; }, });
const CustomHeading = Heading.extend({ addInputRules() { return this.options.levels.map(level => { return new InputRule({ find: new RegExp(`^(#{1,${level}})\\s$`), handler: ({ state, range }) => { const { tr } = state; const size = PREDEFINED_SIZES[`h${level}`]; tr.delete(range.from, range.to).setBlockType(range.from, range.from, this.type, { level }); if (size) { tr.addStoredMark(state.schema.marks.textStyle.create({ fontSize: size })); } }, }); }); }, });

type ToolbarButtonProps = { onClick: () => void; title: string; isActive?: boolean; disabled?: boolean; children: React.ReactNode; };
const ToolbarButton: React.FC<ToolbarButtonProps> = ({ onClick, title, isActive, disabled, children }) => ( <button onClick={onClick} title={title} disabled={disabled} className={`p-2 rounded-md transition-colors ${ isActive ? 'bg-gray-300' : 'hover:bg-gray-200' } disabled:opacity-40 disabled:cursor-not-allowed`} > {children} </button> );
type DropdownOption = { label: string; value: string };
type CustomDropdownProps = { options: DropdownOption[]; value: string; onChange: (value: string) => void; title: string; };
const CustomDropdown: React.FC<CustomDropdownProps> = React.memo(({ options, value, onChange, title }) => { const [isOpen, setIsOpen] = useState(false); const dropdownRef = useRef<HTMLDivElement>(null); const selectedLabel = options.find(opt => opt.value === value)?.label || value; useEffect(() => { const handleClickOutside = (event: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) { setIsOpen(false); } }; if (isOpen) { document.addEventListener('mousedown', handleClickOutside); } return () => { document.removeEventListener('mousedown', handleClickOutside); }; }, [isOpen]); return ( <div ref={dropdownRef} className="relative" title={title}> <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between w-32 p-2 border border-gray-300 bg-white rounded-md text-sm hover:bg-gray-50"> <span className="truncate">{selectedLabel}</span> <ChevronDown className="w-4 h-4 ml-2 text-gray-500" /> </button> {isOpen && ( <div className="absolute z-20 top-full mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200"> {options.map(option => ( <button key={option.value} onClick={() => { onChange(option.value); setIsOpen(false); }} className={`w-full text-left p-2 text-sm hover:bg-gray-100 ${ value === option.value ? 'font-bold bg-gray-100' : '' }`}> {option.label} </button> ))} </div> )} </div> ); });
CustomDropdown.displayName = 'CustomDropdown';
const TableCreationGrid: React.FC<{ editor: Editor; close: () => void }> = ({ editor, close }) => { const [hovered, setHovered] = useState({ rows: 0, cols: 0 }); const createTable = (rows: number, cols: number) => { editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run(); close(); }; return ( <div className="absolute z-10 bg-white shadow-lg border rounded-md p-2 mt-1"> {Array.from({ length: 5 }).map((_, rowIndex) => ( <div key={rowIndex} className="flex"> {Array.from({ length: 5 }).map((_, colIndex) => ( <div key={colIndex} onMouseOver={() => setHovered({ rows: rowIndex + 1, cols: colIndex + 1 })} onClick={() => createTable(rowIndex + 1, colIndex + 1)} className={`w-6 h-6 border border-gray-300 cursor-pointer ${ rowIndex < hovered.rows && colIndex < hovered.cols ? 'bg-blue-300' : 'bg-white' }`} /> ))} </div> ))} <div className="text-center text-sm mt-1">{hovered.rows} x {hovered.cols}</div> </div> ); };
const TableMenus: React.FC<{ editor: Editor }> = ({ editor }) => { const [isDropdownOpen, setDropdownOpen] = useState(false); const menuRef = useRef<HTMLDivElement>(null); type MenuItemProps = { onClick: () => void; disabled?: boolean; children: React.ReactNode; }; const MenuItem: React.FC<MenuItemProps> = ({ onClick, disabled, children }) => ( <button onClick={() => { onClick(); setDropdownOpen(false); }} disabled={disabled} className="flex items-center w-full text-left p-2 text-sm rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"> {children} </button> ); useEffect(() => { const handleClickOutside = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) { setDropdownOpen(false); } }; if (isDropdownOpen) { document.addEventListener('mousedown', handleClickOutside); } return () => { document.removeEventListener('mousedown', handleClickOutside); }; }, [isDropdownOpen]); return ( <> <BubbleMenu pluginKey="tableMain" editor={editor} shouldShow={({ editor }) => editor.isActive('table') && !(editor.state.selection instanceof CellSelection)} tippyOptions={{ getReferenceClientRect: () => { const { view } = editor; const { $anchor } = editor.state.selection; const element = view.domAtPos($anchor.pos).node as HTMLElement; const tableElement = element.closest('table'); if (!tableElement) { return new DOMRect(0, 0, 0, 0); } return tableElement.getBoundingClientRect(); }, placement: 'top-start', offset: [0, 8], }}> <div ref={menuRef} className="relative"> <button onClick={() => setDropdownOpen(!isDropdownOpen)} className="bg-white text-gray-700 p-1.5 rounded-md shadow-md border border-gray-300 hover:bg-gray-100" title="Table options"> <TableIcon className="w-4 h-4" /> </button> {isDropdownOpen && ( <div className="absolute z-10 top-full mt-2 bg-white text-black p-2 rounded-lg shadow-xl border border-gray-200 w-max"> <div className="flex divide-x divide-gray-200"> <div className="px-3 py-1"><div className="font-bold text-xs uppercase text-gray-500 pb-2">Row</div><MenuItem onClick={() => editor.chain().focus().addRowBefore().run()}><Plus className="w-4 h-4 mr-2" /> Add Above</MenuItem><MenuItem onClick={() => editor.chain().focus().addRowAfter().run()}><Plus className="w-4 h-4 mr-2" /> Add Below</MenuItem><MenuItem onClick={() => editor.chain().focus().deleteRow().run()}><Minus className="w-4 h-4 mr-2" /> Delete Row</MenuItem></div> <div className="px-3 py-1"><div className="font-bold text-xs uppercase text-gray-500 pb-2">Column</div><MenuItem onClick={() => editor.chain().focus().addColumnBefore().run()}><Plus className="w-4 h-4 mr-2" /> Add Left</MenuItem><MenuItem onClick={() => editor.chain().focus().addColumnAfter().run()}><Plus className="w-4 h-4 mr-2" /> Add Right</MenuItem><MenuItem onClick={() => editor.chain().focus().deleteColumn().run()}><Minus className="w-4 h-4 mr-2" /> Delete Column</MenuItem></div> </div> <hr className="my-2" /> <div className="px-1"><MenuItem onClick={() => editor.chain().focus().deleteTable().run()}><Trash2 className="w-4 h-4 mr-2 text-red-500" /><span className="text-red-500">Delete Table</span></MenuItem></div> </div> )} </div> </BubbleMenu> <BubbleMenu pluginKey="tableCellSelection" editor={editor} shouldShow={({ editor }) => editor.state.selection instanceof CellSelection} tippyOptions={{ placement: 'top' }} className="flex items-center space-x-1 bg-black text-white p-2 rounded-lg shadow-xl"> <button onClick={() => editor.chain().focus().mergeCells().run()} disabled={!editor.can().mergeCells()} className="p-1 rounded hover:bg-gray-700 disabled:opacity-40" title="Merge cells"><Merge className="w-4 h-4" /></button> <button onClick={() => editor.chain().focus().splitCell().run()} disabled={!editor.can().splitCell()} className="p-1 rounded hover:bg-gray-700 disabled:opacity-40" title="Split cell"><Split className="w-4 h-4" /></button> </BubbleMenu> </> ); };
const useToolbarState = (editor: Editor | null) => { const [state, setState] = useState({ currentStyle: 'p', currentFontSize: '12pt', isBold: false, isItalic: false, isUnderline: false, textAlign: 'left', isBulletList: false, isOrderedList: false, isCodeBlock: false, canUndo: false, canRedo: false, }); useEffect(() => { if (!editor) return; const updateState = () => { const newStyle = editor.isActive('heading', { level: 1 }) ? 'h1' : editor.isActive('heading', { level: 2 }) ? 'h2' : editor.isActive('heading', { level: 3 }) ? 'h3' : 'p'; setState({ currentStyle: newStyle, currentFontSize: editor.getAttributes('textStyle').fontSize || PREDEFINED_SIZES[newStyle], isBold: editor.isActive('bold'), isItalic: editor.isActive('italic'), isUnderline: editor.isActive('underline'), textAlign: editor.isActive({ textAlign: 'center' }) ? 'center' : editor.isActive({ textAlign: 'right' }) ? 'right' : editor.isActive({ textAlign: 'justify' }) ? 'justify' : 'left', isBulletList: editor.isActive('bulletList'), isOrderedList: editor.isActive('orderedList'), isCodeBlock: editor.isActive('codeBlock'), canUndo: editor.can().undo(), canRedo: editor.can().redo(), }); }; editor.on('transaction', updateState); editor.on('selectionUpdate', updateState); updateState(); return () => { editor.off('transaction', updateState); editor.off('selectionUpdate', updateState); }; }, [editor]); return state; };
const EditorToolbar: React.FC<{ editor: Editor | null }> = ({ editor }) => { const [isTableDropdownOpen, setTableDropdownOpen] = useState(false); const tableMenuRef = useRef<HTMLDivElement>(null); const toolbarState = useToolbarState(editor); useEffect(() => { const handleClickOutside = (event: MouseEvent) => { if (tableMenuRef.current && !tableMenuRef.current.contains(event.target as Node)) { setTableDropdownOpen(false); } }; if (isTableDropdownOpen) { document.addEventListener('mousedown', handleClickOutside); } return () => { document.removeEventListener('mousedown', handleClickOutside); }; }, [isTableDropdownOpen]); const handleStyleChange = useCallback((style: string) => { if (!editor) return; const defaultSize = PREDEFINED_SIZES[style]; const chain = editor.chain().focus(); if (style === 'p') { chain.setParagraph(); } else { chain.setHeading({ level: parseInt(style.replace('h', ''), 10) as 1 | 2 | 3 }); } chain.setFontSize(defaultSize).run(); }, [editor]); const handleFontSizeChange = useCallback((size: string) => { if (!editor) return; editor.chain().focus().setFontSize(size).run(); }, [editor]); if (!editor) return null; const styleOptions: DropdownOption[] = [ { label: 'Paragraph', value: 'p' }, { label: 'Heading 1', value: 'h1' }, { label: 'Heading 2', value: 'h2' }, { label: 'Heading 3', value: 'h3' }, ]; const fontSizeOptions: DropdownOption[] = [ { label: '10pt', value: '10pt' }, { label: '12pt', value: '12pt' }, { label: '14pt', value: '14pt' }, { label: '16pt', value: '16pt' }, { label: '18pt', value: '18pt' }, { label: '24pt', value: '24pt' }, { label: '30pt', value: '30pt' }, ]; return ( <div className="flex-shrink-0 bg-white border-b border-gray-200 p-2 flex items-center space-x-1 flex-wrap"> <div className="flex items-center space-x-1 border-r border-gray-300 pr-2 mr-2"> <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!toolbarState.canUndo} title="Undo"><Undo className="w-4 h-4" /></ToolbarButton> <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!toolbarState.canRedo} title="Redo"><Redo className="w-4 h-4" /></ToolbarButton> </div> <div className="flex items-center space-x-2 border-r border-gray-300 pr-2 mr-2"> <CustomDropdown options={styleOptions} value={toolbarState.currentStyle} onChange={handleStyleChange} title="Text Style" /> <CustomDropdown options={fontSizeOptions} value={toolbarState.currentFontSize} onChange={handleFontSizeChange} title="Font Size" /> </div> <div className="flex items-center space-x-1 border-r border-gray-300 pr-2 mr-2"> <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={toolbarState.isBold} title="Bold"><Bold className="w-4 h-4" /></ToolbarButton> <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={toolbarState.isItalic} title="Italic"><Italic className="w-4 h-4" /></ToolbarButton> <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={toolbarState.isUnderline} title="Underline"><UnderlineIcon className="w-4 h-4" /></ToolbarButton> </div> <div className="flex items-center space-x-1 border-r border-gray-300 pr-2 mr-2"> <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={toolbarState.textAlign === 'left'} title="Align Left"><AlignLeft className="w-4 h-4" /></ToolbarButton> <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={toolbarState.textAlign === 'center'} title="Align Center"><AlignCenter className="w-4 h-4" /></ToolbarButton> <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={toolbarState.textAlign === 'right'} title="Align Right"><AlignRight className="w-4 h-4" /></ToolbarButton> <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={toolbarState.textAlign === 'justify'} title="Justify"><AlignJustify className="w-4 h-4" /></ToolbarButton> </div> <div className="flex items-center space-x-1"> <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={toolbarState.isBulletList} title="Bulleted List"><List className="w-4 h-4" /></ToolbarButton> <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={toolbarState.isOrderedList} title="Numbered List"><ListOrdered className="w-4 h-4" /></ToolbarButton> <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={toolbarState.isCodeBlock} title="Code Block"><Code className="w-4 h-4" /></ToolbarButton> <div ref={tableMenuRef} className="relative"> <ToolbarButton onClick={() => setTableDropdownOpen(!isTableDropdownOpen)} title="Insert Table"><TableIcon className="w-4 h-4" /></ToolbarButton> {isTableDropdownOpen && <TableCreationGrid editor={editor} close={() => setTableDropdownOpen(false)} />} </div> </div> </div> ); };

const ScoutingPlatform: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [transcriptionText, setTranscriptionText] = useState<string>("");
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isEditorReady, setIsEditorReady] = useState(false);

  const setContentWithStyles = (editor: Editor, html: string) => {
    editor.commands.setContent(html, false);
    const { tr, doc } = editor.state;
    doc.descendants((node, pos) => {
      if (!node.isTextblock) return;
      let size = PREDEFINED_SIZES.p;
      if (node.type.name === 'heading') {
        const level = node.attrs.level;
        size = PREDEFINED_SIZES[`h${level}`] || size;
      } else if (node.type.name === 'paragraph') {
        const parent = doc.resolve(pos).parent;
        if (parent.type.name === 'listItem') {
          size = PREDEFINED_SIZES.p;
        }
      }
      const from = pos + 1;
      const to = from + node.content.size;
      let hasFontSize = false;
      doc.nodesBetween(from, to, (n) => {
        if (n.marks.some(m => m.type.name === 'textStyle' && m.attrs.fontSize)) {
          hasFontSize = true;
        }
      });
      if (!hasFontSize && size) {
        tr.addMark(from, to, editor.schema.marks.textStyle.create({ fontSize: size }));
      }
    });
    editor.view.dispatch(tr);
  };

  const editor = useEditor({
    extensions: [ StarterKit.configure({ heading: false, blockquote: false, }), CustomHeading.configure({ levels: [1, 2, 3] }), Underline, TextAlign.configure({ types: ['heading', 'paragraph'] }), TextStyle, FontSize, Link.configure({ openOnClick: false, autolink: true }), ResetMarksOnEnter, Table.configure({ resizable: true }), TableRow, TableHeader, TableCell, ],
    content: '',
    editorProps: {
      attributes: { class: 'prose max-w-none p-8 focus:outline-none' },
    },
    onUpdate: ({ editor }) => {
      const contentJson = editor.getJSON();
      sessionStorage.setItem('scouting-report-content', JSON.stringify(contentJson));
    },
  });

  useEffect(() => {
    if (editor && !isEditorReady) {
      const savedContent = sessionStorage.getItem('scouting-report-content');
      if (savedContent) {
        try {
          editor.commands.setContent(JSON.parse(savedContent), false);
        } catch (e) {
          console.error("Failed to parse saved content", e);
          const initialHtml = marked.parse("## Scouting Report\n\nStart by uploading an audio file.") as string;
          setContentWithStyles(editor, initialHtml);
        }
      } else {
        const initialHtml = marked.parse("## Scouting Report\n\nStart by uploading an audio file.") as string;
        setContentWithStyles(editor, initialHtml);
      }
      setIsEditorReady(true);
    }
  }, [editor, isEditorReady]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setTranscriptionText("");
      toast.success(`${file.name} selected!`);
    }
  };

  const handleProcessAudio = async () => {
    if (!selectedFile) {
      toast.error("Please select an audio file first.");
      return;
    }
    if (!editor) return;

    setIsTranscribing(true);
    toast.loading('Transcribing audio...', { id: 'transcribe-toast' });
    
    const formData = new FormData();
    formData.append('audio', selectedFile);

    let transcriptionResult = '';
    try {
      const transcribeResponse = await fetch('/api/audio', {
        method: 'POST',
        body: formData,
      });

      if (!transcribeResponse.ok) {
        throw new Error('Transcription failed.');
      }
      
      const data = await transcribeResponse.json();
      transcriptionResult = data.transcription;
      setTranscriptionText(transcriptionResult);
      toast.success('Transcription complete!', { id: 'transcribe-toast' });

    } catch (error) {
      console.error(error);
      toast.error('Could not transcribe audio.', { id: 'transcribe-toast' });
      setIsTranscribing(false);
      return;
    } finally {
      setIsTranscribing(false);
    }

    setIsGenerating(true);
    toast.loading('Generating scout report...', { id: 'generate-toast' });
    editor.commands.setContent('<p>Generating report from transcription...</p>');

    try {
      const generateResponse = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcription: transcriptionResult }),
      });

      if (!generateResponse.ok) {
        throw new Error('Report generation failed.');
      }

      const data = await generateResponse.json();
      const finalHtml = marked.parse(data.report) as string;
      setContentWithStyles(editor, finalHtml);
      editor.commands.focus('end');
      toast.success('Report generated!', { id: 'generate-toast' });

    } catch (error) {
      console.error(error);
      toast.error('Could not generate report.', { id: 'generate-toast' });
      editor.commands.setContent('<p>There was an error. Ready to try again.</p>');
    } finally {
      setIsGenerating(false);
    }
  };

  const isLoading = isTranscribing || isGenerating;
  const buttonText = isTranscribing ? 'Transcribing...' : isGenerating ? 'Generating...' : 'Generate from Audio';

  return (
    <div className="h-screen bg-gray-100 flex flex-col font-sans text-black">
      <Toaster position="top-center" />
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">AI Scout Assistant (MVP)</h1>
        <button className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Save className="w-4 h-4" />
          <span>Finalize Report</span>
        </button>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Upload Audio</h2>
            <label className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 hover:bg-gray-50 cursor-pointer transition-colors block">
              <input type="file" accept="audio/*" className="hidden" onChange={handleFileChange} />
              <Upload className="mx-auto w-10 h-10 text-gray-400 mb-2" />
              <p className="text-sm font-semibold text-blue-600">
                {selectedFile ? selectedFile.name : 'Click to upload audio file'}
              </p>
              <p className="text-xs text-gray-500">MP3, WAV, M4A, etc.</p>
            </label>
          </div>
          <div className="flex flex-col flex-1 min-h-0">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Review Transcription</h2>
            <textarea
              value={transcriptionText}
              onChange={(e) => setTranscriptionText(e.target.value)}
              className="flex-1 w-full p-4 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-800 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your audio transcription will appear here..."
            />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Generate Report</h2>
            <button
              onClick={handleProcessAudio}
              disabled={isLoading || !selectedFile}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-5 h-5" />
              <span>{buttonText}</span>
            </button>
          </div>
        </div>
        
        <div className="flex-1 bg-gray-50 flex flex-col">
          <EditorToolbar editor={editor} />
          {editor && <BubbleMenu editor={editor} tippyOptions={{ duration: 100, placement: 'top' }} shouldShow={({ editor }) => { const { selection } = editor.state; const { $from, empty } = selection; if (empty || $from.depth < 2) { return false; } return !editor.isActive('table'); }} className="flex items-center space-x-1 bg-black text-white p-2 rounded-lg shadow-xl"> <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1 ${editor.isActive('bold') ? 'bg-gray-700' : ''} rounded`}><Bold className="w-4 h-4" /></button> <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1 ${editor.isActive('italic') ? 'bg-gray-700' : ''} rounded`}><Italic className="w-4 h-4" /></button> </BubbleMenu>}
          {editor && <TableMenus editor={editor} />}
          <div className="flex-1 p-4 overflow-y-auto">
             <div className="bg-white h-full rounded-lg shadow-sm">
                <EditorContent editor={editor} />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoutingPlatform;
