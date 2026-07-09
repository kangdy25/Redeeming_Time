import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';

type IdeaNote = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = 'redeeming-time.idea-notes';

function noteId() {
  return globalThis.crypto?.randomUUID?.() ?? `idea-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function starterNote(): IdeaNote {
  const now = new Date().toISOString();
  return {
    id: noteId(),
    title: '아이디어 보관함에 오신 것을 환영해요',
    content: `# 떠오른 생각을 붙잡아 두세요

아이디어가 완성될 필요는 없습니다. **지금의 단서**만 남겨도 충분해요.

## 이렇게 활용해 보세요

- 생각나는 즉시 기록하기
- [ ] 다음에 발전시킬 아이디어 표시
- [x] 검토한 항목 체크
> 좋은 아이디어는 자주, 조용히 찾아옵니다.

\`# 제목\`, \`- 목록\`, \`- [ ] 체크\`, \`> 인용\` 문법을 사용할 수 있어요.`,
    tags: ['시작하기'],
    isPinned: true,
    createdAt: now,
    updatedAt: now,
  };
}

function loadNotes(): IdeaNote[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [starterNote()];
    const parsed = JSON.parse(saved) as IdeaNote[];
    return Array.isArray(parsed) ? parsed : [starterNote()];
  } catch {
    return [starterNote()];
  }
}

function inlineMarkdown(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return <a href={link[2]} target="_blank" rel="noreferrer" key={index}>{link[1]}</a>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

function MarkdownPreview({ content }: { content: string }) {
  let inCodeBlock = false;
  const codeLines: string[] = [];
  const rendered: ReactNode[] = [];

  content.split('\n').forEach((line, index) => {
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        rendered.push(<pre key={`code-${index}`}><code>{codeLines.join('\n')}</code></pre>);
        codeLines.length = 0;
      }
      inCodeBlock = !inCodeBlock;
      return;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }
    if (line.startsWith('### ')) rendered.push(<h3 key={index}>{inlineMarkdown(line.slice(4))}</h3>);
    else if (line.startsWith('## ')) rendered.push(<h2 key={index}>{inlineMarkdown(line.slice(3))}</h2>);
    else if (line.startsWith('# ')) rendered.push(<h1 key={index}>{inlineMarkdown(line.slice(2))}</h1>);
    else if (/^- \[[ xX]\] /.test(line)) {
      const checked = /^- \[[xX]\]/.test(line);
      rendered.push(
        <label className="markdown-check" key={index}>
          <input type="checkbox" checked={checked} readOnly />
          <span>{inlineMarkdown(line.replace(/^- \[[ xX]\] /, ''))}</span>
        </label>,
      );
    } else if (line.startsWith('- ')) rendered.push(<div className="markdown-list-item" key={index}>• <span>{inlineMarkdown(line.slice(2))}</span></div>);
    else if (line.startsWith('> ')) rendered.push(<blockquote key={index}>{inlineMarkdown(line.slice(2))}</blockquote>);
    else if (/^---+$/.test(line.trim())) rendered.push(<hr key={index} />);
    else if (line.trim()) rendered.push(<p key={index}>{inlineMarkdown(line)}</p>);
    else rendered.push(<div className="markdown-spacer" key={index} />);
  });

  if (inCodeBlock && codeLines.length) rendered.push(<pre key="code-final"><code>{codeLines.join('\n')}</code></pre>);
  return <article className="markdown-preview">{rendered}</article>;
}

function excerpt(note: IdeaNote) {
  return note.content
    .replace(/[#>*_`\-[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90) || '내용 없는 메모';
}

export default function IdeaInbox() {
  const [notes, setNotes] = useState<IdeaNote[]>(loadNotes);
  const [selectedId, setSelectedId] = useState(() => notes[0]?.id ?? '');
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<'write' | 'preview' | 'split'>('write');
  const [tagDraft, setTagDraft] = useState(() => notes[0]?.tags.join(', ') ?? '');
  const selectedNote = notes.find((note) => note.id === selectedId) ?? null;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    const note = notes.find((item) => item.id === selectedId);
    setTagDraft(note?.tags.join(', ') ?? '');
  }, [selectedId]);

  const filteredNotes = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase();
    return [...notes]
      .filter((note) => !keyword || `${note.title} ${note.content} ${note.tags.join(' ')}`.toLocaleLowerCase().includes(keyword))
      .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || b.updatedAt.localeCompare(a.updatedAt));
  }, [notes, search]);

  function createNote() {
    const now = new Date().toISOString();
    const note: IdeaNote = {
      id: noteId(),
      title: '제목 없는 아이디어',
      content: '',
      tags: [],
      isPinned: false,
      createdAt: now,
      updatedAt: now,
    };
    setNotes((current) => [note, ...current]);
    setSelectedId(note.id);
    setTagDraft('');
    setMode('write');
  }

  function updateNote(patch: Partial<IdeaNote>) {
    if (!selectedNote) return;
    setNotes((current) => current.map((note) => (
      note.id === selectedNote.id ? { ...note, ...patch, updatedAt: new Date().toISOString() } : note
    )));
  }

  function deleteNote() {
    if (!selectedNote || !window.confirm(`"${selectedNote.title}" 메모를 삭제할까요?`)) return;
    const remaining = notes.filter((note) => note.id !== selectedNote.id);
    setNotes(remaining);
    setSelectedId(remaining[0]?.id ?? '');
  }

  return (
    <section className="idea-inbox">
      <aside className="idea-note-rail">
        <header className="idea-rail-header">
          <div>
            <p className="eyebrow">Idea Inbox</p>
            <h2>아이디어 보관함</h2>
          </div>
          <button type="button" onClick={createNote} aria-label="새 아이디어">+</button>
        </header>
        <label className="idea-search">
          <span aria-hidden="true">⌕</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="아이디어 검색" />
        </label>
        <div className="idea-note-list">
          {filteredNotes.map((note) => (
            <button
              type="button"
              className={`idea-note-card ${note.id === selectedId ? 'active' : ''}`}
              onClick={() => setSelectedId(note.id)}
              key={note.id}
            >
              <span className="idea-card-heading">
                <strong>{note.title || '제목 없는 아이디어'}</strong>
                {note.isPinned && <span className="idea-card-pin" aria-label="고정된 메모">📌</span>}
              </span>
              <span className="idea-card-excerpt">{excerpt(note)}</span>
              <span className="idea-card-meta">
                {new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(new Date(note.updatedAt))}
                {note.tags.slice(0, 3).map((tag) => <em key={tag}>#{tag}</em>)}
              </span>
            </button>
          ))}
          {filteredNotes.length === 0 && <p className="idea-empty">검색 결과가 없습니다.</p>}
        </div>
      </aside>

      <main className="idea-editor-shell">
        {selectedNote ? (
          <>
            <header className="idea-editor-toolbar">
              <span className="idea-save-state">자동 저장됨</span>
              <div className="idea-view-switch">
                <button className={mode === 'write' ? 'active' : ''} onClick={() => setMode('write')}>편집</button>
                <button className={mode === 'split' ? 'active' : ''} onClick={() => setMode('split')}>나란히</button>
                <button className={mode === 'preview' ? 'active' : ''} onClick={() => setMode('preview')}>미리보기</button>
              </div>
              <button
                type="button"
                className={`idea-pin-button ${selectedNote.isPinned ? 'active' : ''}`}
                onClick={() => updateNote({ isPinned: !selectedNote.isPinned })}
              >
                {selectedNote.isPinned ? '고정됨' : '고정'}
              </button>
              <button type="button" className="idea-delete-button" onClick={deleteNote}>삭제</button>
            </header>
            <div className="idea-document-header">
              <input
                className="idea-title-input"
                aria-label="아이디어 제목"
                value={selectedNote.title}
                onChange={(event) => updateNote({ title: event.target.value })}
                placeholder="제목 없는 아이디어"
              />
              <input
                className="idea-tags-input"
                aria-label="아이디어 태그"
                value={tagDraft}
                onChange={(event) => {
                  const draft = event.target.value.split(',').slice(0, 3).join(',');
                  setTagDraft(draft);
                  updateNote({
                    tags: [...new Set(
                      draft
                      .split(',')
                      .map((tag) => tag.trim())
                      .filter(Boolean),
                    )].slice(0, 3),
                  });
                }}
                onBlur={() => setTagDraft(selectedNote.tags.join(', '))}
                placeholder="태그를 쉼표로 구분해 입력 (최대 3개)"
              />
            </div>
            <div className={`idea-editor-body mode-${mode}`}>
              {mode !== 'preview' && (
                <textarea
                  aria-label="마크다운 내용"
                  value={selectedNote.content}
                  onChange={(event) => updateNote({ content: event.target.value })}
                  placeholder="떠오른 생각을 마크다운으로 기록하세요..."
                  spellCheck
                />
              )}
              {mode !== 'write' && <MarkdownPreview content={selectedNote.content} />}
            </div>
          </>
        ) : (
          <div className="idea-blank-state">
            <span>✦</span>
            <h2>첫 아이디어를 기록해 보세요</h2>
            <p>완성되지 않은 생각도 괜찮습니다.</p>
            <button type="button" onClick={createNote}>새 아이디어 만들기</button>
          </div>
        )}
      </main>
    </section>
  );
}
