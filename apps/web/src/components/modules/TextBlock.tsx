'use client';

interface TextBlockProps {
  content: string;
}

// Simple markdown renderer for health content
export function TextBlock({ content }: TextBlockProps) {
  const lines = content.split('\n');

  return (
    <div className="prose prose-slate max-w-none">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return <h2 key={i} className="text-xl font-bold text-slate-800 mt-6 mb-3">{line.slice(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={i} className="text-lg font-semibold text-slate-700 mt-4 mb-2">{line.slice(4)}</h3>;
        }
        if (line.startsWith('- ')) {
          return (
            <div key={i} className="flex items-start gap-3 my-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0" />
              <p className="text-slate-600 leading-relaxed">{line.slice(2)}</p>
            </div>
          );
        }
        if (line.trim() === '') {
          return <div key={i} className="h-3" />;
        }
        return <p key={i} className="text-slate-600 leading-relaxed text-base">{line}</p>;
      })}
    </div>
  );
}
