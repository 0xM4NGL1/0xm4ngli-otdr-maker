'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { listOfficialFiles, listSrProjects, listSrFiles, createSrProject, deleteSrProject, renameSrProject, addToSrProject, deleteSrProjectFile, openFolder, createOfficialMeterFile } from './lib/actions';

type SorFileItem = { id: string; name: string; folder: string; relativePath: string; sizeBytes: number; meters: number };
type SrFileEntry = { name: string; source: string };

export default function HomePage() {
  const [files, setFiles] = useState<SorFileItem[]>([]);
  const [search, setSearch] = useState('');
  const [srSearch, setSrSearch] = useState('');
  const [srProjects, setSrProjects] = useState<string[]>([]);
  const [activeSr, setActiveSr] = useState('');
  const [srFiles, setSrFiles] = useState<SrFileEntry[]>([]);
  const [newSrName, setNewSrName] = useState('');
  const [newMeter, setNewMeter] = useState('');
  const [dropOver, setDropOver] = useState(false);
  const [showSrFiles, setShowSrFiles] = useState(false);
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [pendingItem, setPendingItem] = useState<SorFileItem | null>(null);
  const [renamingSr, setRenamingSr] = useState<string | null>(null);
  const [projectRenameValue, setProjectRenameValue] = useState('');
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pendingItem && pendingItem.id) {
      const isRename = Boolean((pendingItem as any)._edit);
      setRenameValue(prev => ({
        ...prev,
        [pendingItem.id]: isRename
          ? (pendingItem.name.replace(/\.sor$/i, '') || '').toUpperCase()
          : '',
      }));
    }
  }, [pendingItem]);

  const refreshFiles = useCallback(async (q?: string) => {
    const res = await listOfficialFiles(q);
    const sorted = [...res].sort((a, b) => {
      const numA = parseInt(a.name.replace('.sor',''), 10) || 0;
      const numB = parseInt(b.name.replace('.sor',''), 10) || 0;
      return numA - numB;
    });
    setFiles(sorted);
  }, []);

  const refreshSrProjects = useCallback(async () => {
    const m = await listSrProjects();
    setSrProjects(m);
  }, []);

  useEffect(() => {
    refreshFiles();
    refreshSrProjects();
  }, [refreshFiles, refreshSrProjects]);

  useEffect(() => {
    if (activeSr) {
      listSrFiles(activeSr).then(setSrFiles);
      setRenameValue({});
    } else {
      setSrFiles([]);
    }
  }, [activeSr]);

  const handleSearch = async (val: string) => {
    setSearch(val);
  };

  const handleAddMeter = async () => {
    const raw = newMeter.trim();
    if (!raw) return;
    const meter = Number(raw);
    if (!Number.isInteger(meter) || meter < 1) {
      setMessage('Enter a valid meter number');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    try {
      const res = await createOfficialMeterFile(meter);
      setNewMeter('');
      await refreshFiles(search);
      setMessage('Meter ' + meter + '.sor created');
      setTimeout(() => setMessage(''), 2000);
      return res;
    } catch (e: any) {
      setMessage('Error: ' + (e?.message || String(e)));
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleCreateSr = async () => {
    const name = newSrName.trim();
    if (!name) return;
    await createSrProject(name);
    setNewSrName('');
    await refreshSrProjects();
    setActiveSr(name);
    setMessage('Meter folder created: ' + name);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDeleteSr = async (name: string) => {
    if (!confirm('Delete SR project "' + name + '" and all its files?')) return;
    await deleteSrProject(name);
    if (activeSr === name) setActiveSr('');
    await refreshSrProjects();
    setMessage('Meter deleted: ' + name);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleRenameSr = async () => {
    if (!renamingSr) return;
    const next = projectRenameValue.trim();
    if (!next) {
      setMessage('Enter a folder name');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    try {
      const res = await renameSrProject(renamingSr, next);
      const renamed = res.name;
      setMessage('SR folder renamed to ' + renamed);
      setRenamingSr(null);
      if (activeSr === renamingSr) setActiveSr(renamed);
      await refreshSrProjects();
    } catch (e: any) {
      setMessage('Error: ' + (e?.message || String(e)));
    }
    setTimeout(() => setMessage(''), 800);
  };

  const handleDropFile = async (item: SorFileItem) => {
    if (!activeSr) {
      setMessage('Select or create a SR project first');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    const rename = renameValue[item.id] || item.name.replace('.sor', '');
    let targetName = rename.trim();
    if (!targetName.endsWith('.sor')) targetName += '.sor';
    const res = await addToSrProject(item.relativePath, activeSr, targetName);
    setMessage('Copied to ' + activeSr + '/' + res.targetName);
    setSrFiles(await listSrFiles(activeSr));
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', 'file:' + id);
    e.dataTransfer.effectAllowed = 'copy';
    setDragItem(id);
  };
  const handleDragEnd = () => setDragItem(null);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDropOver(false);
    try {
      const text = e.dataTransfer.getData('text/plain');
      if (text && text.startsWith('file:')) {
        const item = files.find(f => f.id === text.replace('file:', ''));
        if (item) setPendingItem(item);
      }
    } catch {
      // ignore
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDropOver(true);
  };

  const handleDragLeave = () => setDropOver(false);

  const handleConfirm = async () => {
    if (!pendingItem) return;
    try {
      if (!activeSr && !(pendingItem as any)._new) {
        if (!newSrName.trim()) { setMessage('Select or create an SR project'); setTimeout(() => setMessage(''), 3000); return; }
      }
      const target = activeSr || newSrName.trim();
      if (!target) { setMessage('No target SR project'); setTimeout(() => setMessage(''), 3000); return; }
      const renameRaw = (renameValue[pendingItem.id] || (pendingItem.name || '').replace('.sor', '')).trim();
      const rename = renameRaw ? renameRaw.toUpperCase() : (pendingItem.name || '').replace('.sor', '').toUpperCase();
      if (!rename) { setMessage('Enter a measurement name'); setTimeout(() => setMessage(''), 3000); return; }

      const isEdit = Boolean((pendingItem as any)._edit);
      if (isEdit) {
        const res = await fetch('/api/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ srName: target, oldName: pendingItem.name, newName: rename }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        const oldName = pendingItem.name;
        const newName = data.targetName;
        const source = data.source;
        setSrFiles(prev => prev
          .map(f => f.name === oldName ? { name: newName, source } : f)
          .sort((a, b) => a.name.localeCompare(b.name)));
        setMessage('Renamed to ' + newName);
        setPendingItem(null);
      } else {
        const res = await fetch('/api/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourcePath: pendingItem.relativePath, target, rename }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        setMessage('Copied to ' + target + '/' + data.targetName);
        setPendingItem(null);
        setActiveSr(target);
        const newFile = data.targetName || (rename.trim().endsWith('.sor') ? rename.trim() : rename.trim() + '.sor');
        const newSource = data.source || pendingItem.name;
        setSrFiles(prev => {
          const updated = prev.filter(f => f.name !== newFile);
          updated.push({ name: newFile, source: newSource });
          updated.sort((a, b) => a.name.localeCompare(b.name));
          return updated;
        });
      }
    } catch (e: any) {
      setMessage('Error: ' + (e?.message || String(e)));
    }
    setTimeout(() => setMessage(''), 800);
  };

  return (
    <main className="min-h-screen bg-void text-[#e8e8f8] relative overflow-x-hidden">
      <div className="fixed top-[-20%] left-[-15%] w-[900px] h-[900px] rounded-full bg-[rgba(168,85,247,0.12)] blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] right-[-15%] w-[900px] h-[900px] rounded-full bg-[rgba(59,130,246,0.10)] blur-[140px] pointer-events-none z-0" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[600px] rounded-full bg-[rgba(168,85,247,0.08)] blur-[160px] pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] right-[-15%] w-[900px] h-[900px] rounded-full bg-[rgba(59,130,246,0.10)] blur-[140px] pointer-events-none z-0" />
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        <header className="text-center mb-10">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter neon-text mb-2">OTDR <span className="text-neon-blue">MAKER</span></h1>
          <p className="text-lg md:text-xl text-purple-200/70 tracking-wide font-light">CREATE YOUR OTDR MEASUREMENT</p>
        </header>


        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: official files */}
          <section className="glass-card rounded-3xl p-6 flex flex-col min-h-[60vh] max-h-[70vh]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-neon-purple shadow-[0_0_10px_rgba(168,85,247,0.8)] pulse-glow" />
              <h2 className="text-xl font-extrabold tracking-tight">Official .sor Files</h2>
              <span className="ml-auto text-xs font-mono text-purple-300/60 bg-deep-blue px-2 py-0.5 rounded-md">{files.length} items</span>
            </div>
            <p className="text-sm text-purple-200/60 mb-3">Drag any file to the right, or click <strong>Drop In</strong> to copy into the focused SR project.</p>
            <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)} placeholder="Search files..." className="w-full mb-3 bg-deep-blue/60 border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-purple-300/40 focus:outline-none focus:border-neon-purple/60" />
            <div className="mb-3 flex gap-2">
              <input type="text" inputMode="numeric" value={newMeter} onChange={e => setNewMeter(e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={e => { if (e.key === 'Enter') handleAddMeter(); }} placeholder="Add missing meter (e.g. 1)" className="flex-1 bg-deep-blue/60 border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-purple-300/40 focus:outline-none focus:border-neon-purple/60" />
              <button onClick={handleAddMeter} className="flex items-center justify-center bg-gradient-to-r from-neon-purple to-neon-blue hover:brightness-110 text-white font-bold w-9 h-9 rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.3)] transition shrink-0 cursor-pointer" aria-label="Create meter .sor" title="Create meter .sor"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
            </div>
            <div className="overflow-y-auto max-h-[50vh] flex flex-wrap gap-3 content-start custom-scrollbar pr-2">
              {(search.trim() ? files.filter((f) => f.name.replace('.sor','').includes(search.trim())) : files).map((f) => (
                <button key={f.id} draggable onDragStart={(e) => handleDragStart(e, f.id)} onDragEnd={handleDragEnd} onClick={() => setPendingItem(f)} className={`group relative w-24 h-28 rounded-2xl bg-deep-blue/60 border-[3px] border-blue-500/30 hover:border-neon-blue transition p-3 flex flex-col items-center justify-center gap-2 select-none cursor-grab active:cursor-grabbing overflow-hidden shadow-[0_0_15px_rgba(59,130,246,0.5),inset_0_0_12px_rgba(168,85,247,0.15)] hover:shadow-[0_0_25px_rgba(59,130,246,0.7),inset_0_0_18px_rgba(168,85,247,0.25)] ${dragItem === f.id ? 'ring-2 ring-neon-purple shadow-[0_0_30px_rgba(168,85,247,0.5)]' : ''}`} title="Add to focused SR project">
                  <span className="text-xl font-mono font-extrabold text-neon-blue drop-shadow-[0_0_8px_rgba(59,130,246,0.9)]">{f.name.replace('.sor','')}</span>
                </button>
              ))}
              {files.length === 0 && <div className="text-center py-10 text-purple-300/40">No results</div>}
            </div>
          </section>

          {/* Right: Focused SR project */}
          <section ref={dropRef as React.Ref<HTMLDivElement>} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} className={`glass-card rounded-3xl p-6 flex flex-col min-h-[60vh] max-h-[70vh] transition ${dropOver ? 'drag-active' : ''} ${!activeSr ? 'opacity-70' : ''}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)] ${dropOver ? 'bg-neon-blue animate-pulse' : 'bg-neon-blue'}`} />
              <h2 className="text-xl font-extrabold tracking-tight">SR Projects</h2>
              <span className="ml-auto text-xs font-mono text-blue-300/60 bg-deep-blue px-2 py-0.5 rounded-md">{srFiles.length} files</span>
            </div>
            <div className="mb-3 flex gap-2">
              <input type="text" value={newSrName} onChange={(e) => setNewSrName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleCreateSr(); }} placeholder="New SR name..." className="flex-1 bg-deep-blue/60 border border-blue-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-blue-300/40 focus:outline-none focus:border-neon-blue/60" />
              <button onClick={handleCreateSr} className="flex items-center justify-center bg-gradient-to-r from-neon-purple to-neon-blue hover:brightness-110 text-white font-bold w-9 h-9 rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.3)] transition shrink-0 cursor-pointer" aria-label="Create SR" title="Create SR"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {srProjects.map(m => (
                <button key={m} onClick={() => setActiveSr(m)} className={`text-xs font-semibold px-3 py-1 rounded-full border transition cursor-pointer ${activeSr === m ? 'bg-neon-purple/20 border-neon-purple text-purple-100 shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'bg-deep-blue/40 border-purple-500/20 text-purple-200/80 hover:border-purple-400/50 hover:text-white'}`}>{m}</button>
              ))}
            </div>

            {/* Focused meter display */}
            <div onClick={() => setShowSrFiles(!showSrFiles)} className={`rounded-2xl border-2 px-4 py-3 mb-2 text-center transition cursor-pointer select-none ${activeSr ? 'border-neon-purple bg-purple-950/20 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'border-blue-500/20 bg-deep-blue/30'}`}>
              <div className="text-xs text-blue-300/60 uppercase tracking-widest font-bold mb-1">SR Folder</div>
              <div className={`relative text-xl font-extrabold tracking-tight ${activeSr ? 'text-purple-100' : 'text-blue-300/40'}`}>
                <span className="block truncate px-16">{activeSr || 'none selected'}</span>
                {activeSr && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      onClick={e => { e.stopPropagation(); setRenamingSr(activeSr); setProjectRenameValue(activeSr); }}
                      className="p-1.5 rounded-lg bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 border border-purple-500/30 transition cursor-pointer"
                      title="Rename SR folder"
                      aria-label="Rename SR folder"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteSr(activeSr); }}
                      className="p-1.5 rounded-lg bg-red-900/40 hover:bg-red-800/60 text-red-200 border border-red-500/30 transition cursor-pointer"
                      title="Delete SR folder"
                      aria-label="Delete SR folder"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                    </button>
                  </div>
                )}
              </div>
              {!activeSr && <div className="text-xs text-blue-300/40 mt-1">Click to select or create</div>}
            </div>

             {activeSr && (
                (typeof window !== 'undefined' && window.location?.hostname === 'localhost' ? (
                  <button onClick={() => openFolder(activeSr)} className="w-full mb-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-blue-400 text-white shadow-[0_0_8px_rgba(59,130,246,0.3)] hover:brightness-110 transition cursor-pointer">Open folder</button>
                ) : (
                  <a href={`/api/download/${encodeURIComponent(activeSr)}`} download={`${activeSr}.zip`} className="w-full mb-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-blue-400 text-white shadow-[0_0_8px_rgba(59,130,246,0.3)] hover:brightness-110 transition text-center inline-block">Download zip</a>
                ))
              )}

            {/* Drop zone */}
            <input type="text" value={srSearch} onChange={(e) => setSrSearch(e.target.value)} placeholder="Search SR projects..." className="w-full mb-3 bg-deep-blue/60 border border-blue-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-blue-300/40 focus:outline-none focus:border-neon-blue/60" />
            <div className={`rounded-2xl border-2 border-dashed ${dropOver ? 'border-neon-purple bg-purple-950/20' : 'border-blue-500/20 bg-deep-blue/30'} transition p-6 mb-4 text-center`}>
              <div className="text-3xl mb-2">📥</div>
              <div className="text-sm font-medium text-blue-200">Drag an official file here</div>
              <div className="text-xs text-blue-300/50 mt-1">It copies into <strong>{activeSr || 'focused SR project'}</strong></div>
            </div>

            {/* Files inside meter */}
            <div className="overflow-y-auto pr-2 space-y-2 flex-1 custom-scrollbar">
              {srFiles.map(({ name: fname, source }) => (
                <div key={fname} className="group rounded-2xl bg-deep-blue/40 border border-blue-500/10 hover:border-neon-blue/40 p-3 transition overflow-hidden">
                  <div className="min-w-0 mb-1">
                    <div className="font-bold text-white truncate">{fname.replace(/\.sor$/i, '')}</div>
                    <div className="text-xs text-blue-300/50 font-mono">meter: {source}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setPendingItem({ id: fname, name: fname, folder: activeSr || '', relativePath: 'projects/' + activeSr + '/' + fname, sizeBytes: 0, meters: 0, _edit: true } as any); }} className="text-[10px] bg-blue-900/30 hover:bg-blue-900/60 text-blue-200 border border-blue-500/30 px-2 py-0.5 rounded transition cursor-pointer" title="Rename">Rename</button>
                    <button onClick={() => { if (activeSr) { fetch('/api/delete', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ srName: activeSr, fileName: fname }) }).then(r => r.json()).then(() => { listSrFiles(activeSr).then(setSrFiles); setMessage('Removed'); setTimeout(() => setMessage(''), 800); }); } }} className="text-[10px] bg-red-900/30 hover:bg-red-900/60 text-red-200 border border-red-500/30 px-2 py-0.5 rounded transition cursor-pointer" title="Delete">Delete</button>
                    <button onClick={async () => { if (!activeSr) return; try { const dupName = fname.replace(/\.sor$/i, '').toUpperCase() + '-DUP'; const res = await fetch('/api/confirm', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ sourcePath: 'projects/' + activeSr + '/' + fname, target: activeSr, rename: dupName }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Failed'); setMessage('Duplicated'); setTimeout(() => setMessage(''), 800); setTimeout(() => listSrFiles(activeSr).then(setSrFiles), 100); } catch (e:any) { setMessage('Error: ' + (e?.message || String(e))); setTimeout(() => setMessage(''), 800); } }} className="text-[10px] bg-green-900/30 hover:bg-green-900/60 text-green-200 border border-green-500/30 px-2 py-0.5 rounded transition cursor-pointer" title="Duplicate">Dup</button>
                  </div>
                </div>
              ))}
              {srFiles.length === 0 && (
                <div className="text-center py-10 text-blue-300/40 text-sm">No files yet. Drop from left or click Drop In.</div>
              )}
            </div>

            {/* Delete meter */}
            {activeSr && (
              <div className="mt-3 flex justify-end">
                <button onClick={() => handleDeleteSr(activeSr)} className="text-xs bg-red-900/20 hover:bg-red-900/40 text-red-200 border border-red-500/30 px-3 py-1.5 rounded-lg transition">Delete this SR project</button>
              </div>
            )}
          </section>
        </div>

        <footer className="mt-12 text-center text-xs text-purple-300/30 font-mono">OTDR Maker — Focused SR projects. Original .sor files preserved; only copies live inside /projects.</footer>

        {renamingSr && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6" onClick={() => setRenamingSr(null)}>
            <div className="glass-card rounded-3xl p-6 max-w-sm w-full shadow-[0_0_30px_rgba(168,85,247,0.25)]" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-extrabold tracking-tight mb-1">Rename SR folder</h3>
              <p className="text-xs text-purple-300/60 mb-3">For {renamingSr}</p>
              <input autoFocus type="text" value={projectRenameValue} onChange={e => setProjectRenameValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleRenameSr(); } }} placeholder="SR folder name" className="w-full bg-deep-blue/60 border border-purple-500/30 rounded-xl px-3 py-2 text-sm text-white placeholder-purple-300/40 focus:outline-none focus:border-neon-purple mb-3" />
              <div className="flex gap-2">
                <button onClick={() => setRenamingSr(null)} className="flex-1 py-2 rounded-xl text-xs font-bold bg-deep-blue/40 text-purple-200 hover:bg-deep-blue">Cancel</button>
                <button onClick={handleRenameSr} className="flex-1 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-neon-purple to-neon-blue text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]">Rename</button>
              </div>
            </div>
          </div>
        )}

        {pendingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6" onClick={() => setPendingItem(null)}>
            <div className="glass-card rounded-3xl p-6 max-w-sm w-full shadow-[0_0_30px_rgba(168,85,247,0.25)]" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-extrabold tracking-tight mb-1">Name measurement</h3>
              <p className="text-xs text-purple-300/60 mb-3">For {pendingItem.name}</p>
              <input type="text" value={renameValue[pendingItem.id] ?? ((pendingItem as any)._edit ? pendingItem.name.replace(/\.sor$/i, '').toUpperCase() : '')} onChange={e => setRenameValue({...renameValue, [pendingItem.id]: e.target.value.toUpperCase()})} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); } }} placeholder="Measurement name" className="w-full bg-deep-blue/60 border border-purple-500/30 rounded-xl px-3 py-2 text-sm text-white placeholder-purple-300/40 focus:outline-none focus:border-neon-purple mb-3" />

              <div className="flex gap-2">
                <button onClick={() => setPendingItem(null)} className="flex-1 py-2 rounded-xl text-xs font-bold bg-deep-blue/40 text-purple-200 hover:bg-deep-blue">Cancel</button>
                <button onClick={handleConfirm} className="flex-1 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-neon-purple to-neon-blue text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]">Confirm</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
