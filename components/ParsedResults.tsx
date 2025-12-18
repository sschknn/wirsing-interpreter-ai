
import React from 'react';
import { ParsedData, Priority, Task } from '../types';
import { CheckIcon, CopyIcon, DownloadIcon } from './Icons';

interface ParsedResultsProps {
  data: ParsedData;
  onToggleTask: (taskId: string) => void;
}

const PriorityBadge: React.FC<{ priority: Priority }> = ({ priority }) => {
  const styles = {
    [Priority.HIGH]: "bg-red-100 text-red-700 border-red-200",
    [Priority.MEDIUM]: "bg-amber-100 text-amber-700 border-amber-200",
    [Priority.LOW]: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${styles[priority]}`}>
      {priority}
    </span>
  );
};

const ParsedResults: React.FC<ParsedResultsProps> = ({ data, onToggleTask }) => {
  const copyAsMarkdown = () => {
    let md = `# Thought Summary: ${data.summary}\n\n`;
    
    if (data.tasks.length > 0) {
      md += `## Aufgaben\n`;
      data.tasks.forEach(t => {
        md += `- [${t.completed ? 'x' : ' '}] ${t.title} (${t.priority}) # ${t.category}\n`;
      });
      md += `\n`;
    }
    
    data.lists.forEach(l => {
      md += `## ${l.title} (${l.type})\n`;
      l.items.forEach(item => md += `- ${item}\n`);
      md += `\n`;
    });

    navigator.clipboard.writeText(md);
    alert('Als Markdown kopiert!');
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thoughts-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-3xl border border-gray-100 shadow-sm gap-4">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
          Analyse-Ergebnis
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={copyAsMarkdown} 
            className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-xl transition-all border border-gray-100 text-xs font-bold"
          >
            <CopyIcon className="w-4 h-4" /> Markdown
          </button>
          <button 
            onClick={downloadJson} 
            className="p-2 bg-gray-50 hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 rounded-xl transition-all border border-gray-100"
            title="JSON Download"
          >
            <DownloadIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-[32px] shadow-2xl shadow-indigo-200 text-white relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
          <CheckIcon className="w-48 h-48" />
        </div>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-3">Die Essenz</h3>
        <p className="text-2xl font-semibold leading-snug tracking-tight italic">"{data.summary}"</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tasks Section */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-2">
            <CheckIcon className="text-emerald-500 w-4 h-4" /> Action Items
          </h3>
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden">
            <ul className="divide-y divide-gray-50">
              {data.tasks.map((task) => (
                <li 
                  key={task.id} 
                  className={`group flex items-start gap-4 p-5 hover:bg-gray-50/50 transition-all ${task.completed ? 'opacity-50' : ''}`}
                >
                  <button 
                    onClick={() => onToggleTask(task.id)}
                    className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                      task.completed 
                      ? 'bg-emerald-500 border-emerald-500 text-white' 
                      : 'border-gray-200 group-hover:border-indigo-400'
                    }`}
                  >
                    {task.completed && <CheckIcon className="w-4 h-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className={`text-base font-bold text-gray-800 transition-all ${task.completed ? 'line-through text-gray-400' : ''}`}>
                        {task.title}
                      </p>
                      <PriorityBadge priority={task.priority} />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className="text-[10px] font-bold text-indigo-500 px-2 py-0.5 bg-indigo-50 rounded-full uppercase">
                        {task.category}
                      </span>
                      {task.deadline && (
                        <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                          📅 {task.deadline}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
              {data.tasks.length === 0 && (
                <li className="p-12 text-center text-gray-400 italic text-sm">Keine Aufgaben gefunden.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Projects & Lists Sidebar */}
        <div className="lg:col-span-5 space-y-6">
          {data.projects.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-2">
                Strukturierte Projekte
              </h3>
              {data.projects.map((proj, idx) => (
                <div key={idx} className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <h4 className="font-black text-indigo-600 text-sm mb-4 uppercase tracking-tight">{proj.name}</h4>
                  <div className="space-y-2">
                    {proj.subtasks.map((sub, sIdx) => (
                      <div key={sIdx} className="text-sm text-gray-600 flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-200"></div>
                        {sub}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}

          {data.lists.map((list, idx) => (
            <div key={idx} className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
              <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-50 pb-3">
                {list.title}
              </h3>
              <ul className="space-y-3">
                {list.items.map((item, iIdx) => (
                  <li key={iIdx} className="text-sm text-gray-600 flex items-start gap-3">
                    <span className="text-indigo-400 font-bold">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ParsedResults;
