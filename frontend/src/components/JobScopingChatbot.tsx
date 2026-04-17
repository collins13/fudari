'use client';

import { useState, useRef, useEffect } from 'react';
import { aiAPI } from '@/lib/api';

interface ScopingMessage {
  role: string;
  content: string;
}

interface JobSpec {
  suggestedSkillType: string;
  enhancedDescription: string;
  urgency: string;
  estimatedDurationHours: number;
  estimatedMinPrice: number;
  estimatedMaxPrice: number;
  likelyMaterials: string[];
  summary: string;
}

interface Props {
  onJobSpecReady?: (spec: JobSpec) => void;
  onClose?: () => void;
}

export default function JobScopingChatbot({ onJobSpecReady, onClose }: Props) {
  const [messages, setMessages] = useState<ScopingMessage[]>([
    { role: 'assistant', content: 'Hi! 👋 I\'m your TUFIXIT assistant. Tell me what needs fixing and I\'ll help you create the perfect job request.\n\nFor example: "My kitchen sink is leaking" or "I need my house painted"' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [jobSpec, setJobSpec] = useState<JobSpec | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ScopingMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      // Build history without the initial greeting
      const history = updatedMessages
        .slice(1) // skip initial bot greeting
        .map(m => ({ role: m.role, content: m.content }));

      const res = await aiAPI.jobScoping({
        message: text,
        sessionId,
        history: history.slice(0, -1), // exclude current message (it's sent as 'message')
      });

      const data = res.data;
      setSessionId(data.sessionId);

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);

      if (data.isComplete && data.jobSpec) {
        setJobSpec(data.jobSpec);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I had trouble processing that. Could you try describing the problem again?'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const applySpec = () => {
    if (jobSpec && onJobSpecReady) {
      onJobSpecReady(jobSpec);
    }
  };

  const skillLabel = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="card border-0 shadow-lg rounded-4 overflow-hidden" style={{ maxWidth: 420, width: '100%' }}>
      {/* Header */}
      <div className="p-3 text-white d-flex align-items-center justify-content-between"
        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
        <div className="d-flex align-items-center gap-2">
          <div className="rounded-circle bg-white bg-opacity-25 d-flex align-items-center justify-content-center"
            style={{ width: 36, height: 36 }}>
            <i className="fa-solid fa-robot" />
          </div>
          <div>
            <div className="fw-semibold" style={{ fontSize: '0.95rem' }}>AI Job Assistant</div>
            <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>Describe your problem, I&apos;ll handle the rest</div>
          </div>
        </div>
        {onClose && (
          <button className="btn btn-sm text-white" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark fa-lg" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="p-3" style={{ height: 340, overflowY: 'auto', background: '#f8f9fa' }}>
        {messages.map((msg, i) => (
          <div key={i} className={`d-flex mb-3 ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
            <div className={`rounded-3 px-3 py-2 ${msg.role === 'user'
              ? 'bg-primary text-white' : 'bg-white border'}`}
              style={{ maxWidth: '85%', fontSize: '0.88rem', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="d-flex justify-content-start mb-3">
            <div className="bg-white border rounded-3 px-3 py-2">
              <span className="spinner-border spinner-border-sm me-2" style={{ width: 14, height: 14 }} />
              <span className="text-muted small">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Job Spec Result */}
      {jobSpec && (
        <div className="border-top p-3" style={{ background: 'rgba(99,102,241,0.05)' }}>
          <div className="d-flex align-items-center gap-2 mb-2">
            <i className="fa-solid fa-clipboard-check text-success" />
            <span className="fw-semibold small">Job Specification Ready</span>
          </div>
          <div className="small text-muted mb-2">
            <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill me-1">
              {skillLabel(jobSpec.suggestedSkillType)}
            </span>
            <span className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill me-1">
              ~{jobSpec.estimatedDurationHours}h
            </span>
            <span className="badge bg-success bg-opacity-10 text-success rounded-pill">
              KES {jobSpec.estimatedMinPrice.toLocaleString()}–{jobSpec.estimatedMaxPrice.toLocaleString()}
            </span>
          </div>
          {jobSpec.likelyMaterials.length > 0 && (
            <div className="small text-muted mb-2">
              <strong>Materials:</strong> {jobSpec.likelyMaterials.join(', ')}
            </div>
          )}
          <button className="btn btn-sm btn-primary rounded-pill w-100" onClick={applySpec}>
            <i className="fa-solid fa-check me-1" />Use This Job Spec
          </button>
        </div>
      )}

      {/* Input */}
      {!jobSpec && (
        <div className="border-top p-3 d-flex gap-2">
          <input
            type="text"
            className="form-control form-control-sm rounded-pill"
            placeholder="Describe your problem..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button
            className="btn btn-primary btn-sm rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
            style={{ width: 36, height: 36 }}
            onClick={sendMessage}
            disabled={loading || !input.trim()}
          >
            <i className="fa-solid fa-paper-plane" />
          </button>
        </div>
      )}
    </div>
  );
}
