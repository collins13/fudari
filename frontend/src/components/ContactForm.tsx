'use client';

import { useState } from 'react';
import { PLATFORM_WHATSAPP_NUMBER, whatsappBotLink } from '@/lib/whatsapp';

const SUPPORT_EMAIL = 'info@fudari.co';

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [error, setError] = useState('');

  const buildBody = () =>
    `Hi FUDARI,\n\nName: ${form.name}\nEmail: ${form.email}\nSubject: ${form.subject}\n\n${form.message}`;

  const validate = () => {
    if (!form.name.trim() || !form.subject.trim() || !form.message.trim()) {
      setError('Please fill in your name, a subject and your message.');
      return false;
    }
    setError('');
    return true;
  };

  const sendOnWhatsApp = () => {
    if (!validate()) return;
    window.open(whatsappBotLink(buildBody()), '_blank', 'noopener,noreferrer');
  };

  const sendByEmail = () => {
    if (!validate()) return;
    const subject = encodeURIComponent(form.subject);
    const body = encodeURIComponent(buildBody());
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); sendOnWhatsApp(); }}>
      <div className="row g-3 mb-3">
        <div className="col-sm-6">
          <label className="form-label fw-medium small" htmlFor="contact-name">Full Name</label>
          <input
            type="text"
            id="contact-name"
            className="form-control"
            placeholder="Jane Doe"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="col-sm-6">
          <label className="form-label fw-medium small" htmlFor="contact-email">Email (optional)</label>
          <input
            type="email"
            id="contact-email"
            className="form-control"
            placeholder="jane@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label fw-medium small" htmlFor="contact-subject">Subject</label>
        <input
          type="text"
          id="contact-subject"
          className="form-control"
          placeholder="How can we help?"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          required
        />
      </div>

      <div className="mb-4">
        <label className="form-label fw-medium small" htmlFor="contact-message">Message</label>
        <textarea
          id="contact-message"
          className="form-control"
          rows={5}
          placeholder="Tell us more about your inquiry..."
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          required
        />
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-start gap-2" role="alert">
          <i className="fa-solid fa-circle-exclamation mt-1" aria-hidden="true"></i>
          <span>{error}</span>
        </div>
      )}

      <div className="d-flex flex-wrap gap-2">
        <button type="submit" className="btn btn-success rounded-5 px-4">
          <i className="fa-brands fa-whatsapp me-2" aria-hidden="true"></i>Send on WhatsApp
        </button>
        <button type="button" className="btn btn-outline-primary rounded-5 px-4" onClick={sendByEmail}>
          <i className="fa-solid fa-envelope me-2" aria-hidden="true"></i>Send by email
        </button>
      </div>

      <p className="text-muted small mt-3 mb-0">
        WhatsApp reaches us fastest on{' '}
        <a href={whatsappBotLink()} target="_blank" rel="noopener noreferrer" className="fw-medium">
          +{PLATFORM_WHATSAPP_NUMBER}
        </a>.
      </p>
    </form>
  );
}
