import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Trash2, Mic, Volume2, VolumeX, Bot, Square, Loader2, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProject } from '@/lib/ProjectContext';
import robotMascot from '@/assets/scrapsmart-robot.png';

const SUGGESTED = [
  'How can I reduce waste?',
  'Why was this piece rotated?',
  'How much material am I saving?',
  'Can these pieces fit on one sheet?',
  'What does kerf mean?',
  'Which sheet size should I choose?',
  'Explain this layout.',
];

// code -> label + BCP-47 tag for the browser speech APIs.
// ElevenLabs (flash v2.5 / scribe) supports all of these.
const LANGUAGES = [
  { code: 'en', label: 'English', bcp47: 'en-US' },
  { code: 'es', label: 'Spanish', bcp47: 'es-ES' },
  { code: 'fr', label: 'French', bcp47: 'fr-FR' },
  { code: 'de', label: 'German', bcp47: 'de-DE' },
  { code: 'hi', label: 'Hindi', bcp47: 'hi-IN' },
  { code: 'pt', label: 'Portuguese', bcp47: 'pt-BR' },
  { code: 'it', label: 'Italian', bcp47: 'it-IT' },
  { code: 'ar', label: 'Arabic', bcp47: 'ar-SA' },
  { code: 'zh', label: 'Chinese', bcp47: 'zh-CN' },
  { code: 'ja', label: 'Japanese', bcp47: 'ja-JP' },
];
const bcp47 = (code) => LANGUAGES.find((l) => l.code === code)?.bcp47 || 'en-US';

const INITIAL_MESSAGES = [
  {
    role: 'assistant',
    text: "Hi! I'm ScrapSmart AI, your workshop copilot. Ask me about your layout, waste, kerf, or how to save material. Pick a language below and I'll answer in it. I can see your current project.",
  },
];

// Pull a readable message out of whatever the function call threw.
const errorText = (e) =>
  e?.response?.data?.error || e?.data?.error || e?.message || 'Unknown error';

export default function AIAssistant({ open, onToggle, showLauncher = true }) {
  const { material, pieces, layout, baseline, selectedInstanceId, matDef } = useProject();

  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [muted, setMuted] = useState(false);
  const [lang, setLang] = useState('en');
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const recogRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const speakIdRef = useRef(0); // lets us ignore stale TTS responses
  const sendRef = useRef(null); // always points at the latest send()
  const loadingRef = useRef(false);

  useEffect(() => { loadingRef.current = loading; }, [loading]);

  useEffect(() => {
    if (!showLauncher) return undefined;
    const timeout = window.setTimeout(() => setShowGreeting(false), 5000);
    return () => window.clearTimeout(timeout);
  }, [showLauncher]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, transcribing]);

  // Focus the input when the panel opens, close on Escape
  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e) => { if (e.key === 'Escape') onToggle?.(); };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [open, onToggle]);

  const buildContext = useCallback(() => {
    let selectedPiece = null;
    if (selectedInstanceId && layout?.sheets) {
      for (const s of layout.sheets) {
        const p = s.placements.find((pl) => pl.instanceId === selectedInstanceId);
        if (p) { selectedPiece = { ...p, sheet: s.index + 1 }; break; }
      }
    }
    return {
      material: { ...material, name: matDef?.name },
      pieces: (pieces || []).map((p) => ({
        name: p.name, width: p.width, height: p.height,
        quantity: p.quantity, rotationAllowed: p.rotationAllowed,
      })),
      stats: layout?.stats || null,
      baselineStats: baseline?.stats || null,
      selectedPiece,
    };
  }, [material, pieces, layout, baseline, selectedInstanceId, matDef]);

  /* ───────────── Voice output (ElevenLabs, browser fallback) ───────────── */

  const stopSpeaking = useCallback(() => {
    speakIdRef.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback((text, language) => {
    if (muted || !text) return;
    stopSpeaking();
    const id = speakIdRef.current;

    const speakWithBrowser = () => {
      if (id !== speakIdRef.current || !('speechSynthesis' in window)) { setSpeaking(false); return; }
      const u = new SpeechSynthesisUtterance(text.slice(0, 500));
      u.lang = bcp47(language);
      u.onend = () => id === speakIdRef.current && setSpeaking(false);
      u.onerror = () => id === speakIdRef.current && setSpeaking(false);
      setSpeaking(true);
      speechSynthesis.speak(u);
    };

    base44.functions
      .invoke('scrapsmartChat', { action: 'speak', text: text.slice(0, 1000), language })
      .then((res) => {
        if (id !== speakIdRef.current) return; // user muted / sent something newer
        const audio = res?.data?.audio;
        if (!audio) { speakWithBrowser(); return; }
        const el = new Audio(`data:${res.data.mimeType || 'audio/mpeg'};base64,${audio}`);
        el.onended = () => id === speakIdRef.current && setSpeaking(false);
        el.onerror = () => speakWithBrowser();
        audioRef.current = el;
        setSpeaking(true);
        el.play().catch(speakWithBrowser);
      })
      .catch(speakWithBrowser);
  }, [muted, stopSpeaking]);

  const toggleMute = () => {
    setMuted((m) => {
      if (!m) stopSpeaking(); // muting also silences current playback
      return !m;
    });
  };

  /* ───────────── Sending ───────────── */

  const send = async (text, language = lang) => {
    const msg = (text ?? input).trim();
    if (!msg || loadingRef.current) return;
    stopSpeaking();
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      // Recent conversation (skip the greeting and error bubbles) so replies have memory
      const history = messages
        .slice(1)
        .filter((m) => !m.error)
        .slice(-8)
        .map((m) => ({ role: m.role, text: m.text.slice(0, 500) }));
      const res = await base44.functions.invoke('scrapsmartChat', {
        message: msg,
        language,
        history,
        context: buildContext(),
      });
      const isErr = !res?.data?.reply;
      const reply = res?.data?.reply || res?.data?.error || "I couldn't get an answer right now. Please try again.";
      setMessages((m) => [...m, { role: 'assistant', text: reply, error: isErr }]);
      if (!isErr) speak(reply, language);
    } catch (e) {
      console.error('[ScrapSmart AI] chat failed:', e);
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: `I couldn't reach the AI service (${errorText(e)}). Check that the scrapsmartChat function is deployed and try again.`, error: true },
      ]);
    } finally {
      setLoading(false);
    }
  };
  sendRef.current = send;

  /* ───────────── Voice input ───────────── */

  const releaseMic = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startBrowserRecognition = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setListening(false);
      setMessages((c) => [...c, { role: 'assistant', text: 'Voice input is not available in this browser. You can still type your question.', error: true }]);
      return;
    }
    const r = new SR();
    r.lang = bcp47(lang);
    r.interimResults = false;
    r.onresult = (e) => {
      const t = e.results?.[0]?.[0]?.transcript;
      if (t) sendRef.current?.(t, lang);
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    recogRef.current = r;
    try { r.start(); setListening(true); } catch { setListening(false); }
  };

  const transcribeBlob = async (blob) => {
    setTranscribing(true);
    try {
      const audio = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const result = await base44.functions.invoke('scrapsmartChat', {
        action: 'transcribe', audio, mimeType: blob.type, language: lang,
      });
      const transcript = result?.data?.text?.trim();
      if (!transcript) throw new Error('No transcript returned');
      setTranscribing(false);
      sendRef.current?.(transcript, lang);
    } catch (e) {
      console.error('[ScrapSmart AI] transcription failed:', e);
      setTranscribing(false);
      setMessages((c) => [...c, { role: 'assistant', text: `Voice transcription failed (${errorText(e)}). Switching to your browser's voice input. Speak again after the mic turns red.`, error: true }]);
      startBrowserRecognition();
    }
  };

  const toggleMic = async () => {
    // Stop whatever is running
    if (listening) {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      else recogRef.current?.stop();
      setListening(false);
      return;
    }
    stopSpeaking();

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      startBrowserRecognition();
      return;
    }

    try {
      const status = await base44.functions.invoke('scrapsmartChat', { action: 'voiceStatus' });
      if (!status?.data?.transcriptionAvailable) { startBrowserRecognition(); return; }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = (ev) => { if (ev.data.size) chunks.push(ev.data); };
      recorder.onstop = () => {
        releaseMic();
        setListening(false);
        if (!chunks.length) return;
        transcribeBlob(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
      };
      recorder.start();
      setListening(true);
    } catch (e) {
      console.warn('[ScrapSmart AI] mic setup failed, using browser recognition:', e);
      releaseMic();
      startBrowserRecognition();
    }
  };

  // Cleanup on unmount
  useEffect(() => () => {
    recogRef.current?.stop();
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    releaseMic();
    audioRef.current?.pause();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }, []);

  // Stop mic/audio when the panel closes
  useEffect(() => {
    if (open) return;
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.onstop = releaseMic; // discard the clip
      recorderRef.current.stop();
    }
    recogRef.current?.stop();
    setListening(false);
    stopSpeaking();
  }, [open, stopSpeaking]);

  const micBusy = loading || transcribing;

  return (
    <>
      {/* Floating launcher at the lower-left */}
      {!open && showLauncher && (
        <div className="fixed bottom-4 left-4 sm:bottom-5 sm:left-5 z-50 flex items-center gap-2">
          <button
            onClick={onToggle}
            aria-label="Open AI assistant"
            aria-expanded={false}
            className="w-14 h-14 shrink-0 rounded-full border border-[#DCE8DE] bg-white p-1 shadow-xl transition hover:scale-105 hover:bg-[#F4F8F4] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#16A34A]"
          >
            <img src={robotMascot} alt="" className="w-full h-full object-contain" />
          </button>
          {showGreeting && (
            <div role="status" className="relative max-w-[min(15rem,calc(100vw-6.5rem))] rounded-2xl border border-[#CFE0D5] bg-white px-3.5 py-2.5 text-xs font-medium leading-snug text-[#244B33] shadow-lg animate-in fade-in slide-in-from-left-2 duration-300 sm:text-sm">
              <span className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-b border-l border-[#CFE0D5] bg-white" />
              <span className="relative">Hey, I&apos;m your AI assistant. Need any help? Just ask me!</span>
            </div>
          )}
        </div>
      )}

      {/* Panel: full-screen sheet on phones, anchored card from sm up */}
      {open && (
        <div
          role="dialog"
          aria-label="ScrapSmart AI chat"
          className="fixed z-50 inset-0 sm:inset-auto sm:bottom-5 sm:left-5 sm:w-[26rem] sm:h-[min(42rem,calc(100dvh-2.5rem))] bg-[#FCFEFC] sm:rounded-[1.25rem] sm:border border-[#CFE0D5] shadow-[0_24px_80px_-20px_rgba(18,61,38,0.42)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          {/* Header */}
          <div className="relative overflow-hidden bg-[linear-gradient(110deg,#123D26_0%,#155E36_62%,#168344_100%)] text-white px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))] flex items-center gap-3 shrink-0">
            <div className="absolute inset-y-0 right-0 w-28 opacity-[0.12]" style={{ backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 9px, #D9F99D 9px 10px)' }} />
            <div className="relative w-12 h-12 shrink-0">
              <img src={robotMascot} alt="" className="w-full h-full object-contain drop-shadow-[0_4px_4px_rgba(0,0,0,0.3)]" />
            </div>
            <div className="relative flex-1 min-w-0">
              <div className="font-display font-bold text-base leading-tight">ScrapSmart AI</div>
              <div className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-100/90">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D9F99D] shadow-[0_0_8px_#D9F99D]" />
                Workshop copilot · project aware
              </div>
            </div>
            <button
              onClick={() => { stopSpeaking(); setMessages(INITIAL_MESSAGES); }}
              className="relative p-2 rounded-lg text-white/75 hover:text-white hover:bg-white/10 transition-colors" title="Clear chat" aria-label="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={onToggle} className="relative p-2 rounded-lg text-white/75 hover:text-white hover:bg-white/10 transition-colors" title="Close chat" aria-label="Close chat">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-5 space-y-4 bg-[#F4F8F4]" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role !== 'user' && (
                  <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center ${m.error ? 'bg-amber-100 text-amber-700' : 'bg-[#DCEFE1] text-[#176238]'}`}>
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div className={`max-w-[84%] px-3.5 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${m.role === 'user' ? 'bg-[#176B3A] text-white rounded-br-sm shadow-sm' : m.error ? 'bg-amber-50 text-amber-900 border border-amber-200 rounded-bl-sm' : 'bg-white text-[#172B21] border border-[#E0EAE2] rounded-bl-sm shadow-[0_2px_8px_rgba(23,43,33,0.04)]'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {(loading || transcribing) && (
              <div className="flex items-end gap-2">
                <div className="w-7 h-7 shrink-0 rounded-lg bg-[#DCEFE1] text-[#176238] flex items-center justify-center"><Bot className="w-4 h-4" /></div>
                <div className="bg-white border border-[#E0EAE2] rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2 shadow-[0_2px_8px_rgba(23,43,33,0.04)]">
                  {transcribing && <span className="text-xs text-[#64748B]">Transcribing</span>}
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Suggested prompts */}
          {messages.length <= 1 && (
            <div className="px-4 pb-3 pt-1 bg-[#F4F8F4] max-h-32 overflow-y-auto shrink-0">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#718278]"><Sparkles className="w-3 h-3 text-[#168344]" /> Try asking</div>
              <div className="flex flex-wrap gap-1.5">
              {SUGGESTED.map((s) => (
                <button key={s} onClick={() => send(s)} className="text-[11px] px-2.5 py-1.5 rounded-lg border border-[#DCE8DE] bg-white text-[#176238] hover:border-[#9CCBA8] hover:bg-[#EAF5EC] transition text-left">
                  {s}
                </button>
              ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-[#E0EAE2] bg-white shrink-0">
            <div className="flex items-center gap-1.5 mb-2.5">
              <button
                onClick={toggleMic}
                disabled={micBusy}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition disabled:opacity-40 ${listening ? 'bg-red-100 text-[#DC2626] animate-pulse' : 'text-[#647A6D] hover:bg-[#F1F6F2]'}`}
                title={listening ? 'Stop and send' : 'Speak your question'}
                aria-label={listening ? 'Stop voice input' : 'Start voice input'}
                aria-pressed={listening}
              >
                {transcribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                onClick={toggleMute}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${muted ? 'text-[#94A3B8] hover:bg-[#F1F6F2]' : 'text-[#176238] bg-[#E4F3E7]'}`}
                title={muted ? 'Turn on spoken replies' : 'Turn off spoken replies'}
                aria-label={muted ? 'Turn on spoken replies' : 'Turn off spoken replies'}
                aria-pressed={!muted}
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {speaking && (
                <button
                  onClick={stopSpeaking}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#DC2626] hover:bg-red-50 transition"
                  title="Stop speaking" aria-label="Stop speaking"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              )}

              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                aria-label="Chat language"
                title="Language for questions and answers"
                className="ml-auto text-xs border border-[#E0EAE2] rounded-lg px-2.5 py-1.5 text-[#506458] bg-[#F8FAF8] focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30"
              >
                {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#F4F8F4] border border-[#DCE8DE] focus-within:border-[#8DBF99] focus-within:ring-2 focus-within:ring-[#16A34A]/10 transition">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={listening ? 'Listening…' : 'Ask about your cut plan…'}
                aria-label="Ask ScrapSmart AI"
                className="flex-1 min-w-0 px-2 py-2.5 bg-transparent text-base sm:text-sm text-[#172B21] placeholder:text-[#85958A] focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send message"
                className="w-10 h-10 shrink-0 rounded-xl bg-[#176B3A] text-white flex items-center justify-center hover:bg-[#123D26] disabled:opacity-40 transition-colors shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}