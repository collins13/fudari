'use client';
import { useState, useEffect } from 'react';
import { paymentsAPI, artisanJobsAPI } from '@/lib/api';

interface PaymentRecord {
  jobId: number;
  bookingCode: string;
  customerName: string;
  amountReceived: number;
  paymentMethod: 'MPESA' | 'CASH' | 'BANK_TRANSFER';
  transactionId: string | null;
  completedAt: string;
  paymentRecorded: boolean;
}

function formatKES(amount: number): string {
  return `KES ${amount.toLocaleString('en-KE')}`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function PaymentMethodBadge({ method }: { method: string }) {
  const map: Record<string, { cls: string; icon: string; label: string }> = {
    MPESA: { cls: 'success', icon: 'fa-mobile-screen', label: 'M-Pesa' },
    CASH: { cls: 'warning', icon: 'fa-money-bill', label: 'Cash' },
    BANK_TRANSFER: { cls: 'info', icon: 'fa-building-columns', label: 'Bank' },
  };
  const entry = map[method] || { cls: 'secondary', icon: 'fa-circle-question', label: method };
  return (
    <span className={`badge text-bg-${entry.cls}`}>
      <i className={`fa-solid ${entry.icon} me-1`}></i>{entry.label}
    </span>
  );
}

export default function WalletPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [withdrawDone, setWithdrawDone] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const res = await artisanJobsAPI.getPayments();
        setPayments(res.data || []);
      } catch {
        setError('Failed to load payment history.');
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  // Compute balances from real data
  const totalEarnings = payments.reduce((sum, p) => sum + (p.amountReceived || 0), 0);
  const pendingPayments = payments.filter((p) => !p.paymentRecorded).reduce((sum, p) => sum + (p.amountReceived || 0), 0);
  const confirmedEarnings = totalEarnings - pendingPayments;

  // Group earnings by month for chart
  const monthlyMap = new Map<string, number>();
  payments.forEach((p) => {
    if (p.completedAt) {
      const d = new Date(p.completedAt);
      const key = d.toLocaleDateString('en-KE', { month: 'short', year: '2-digit' });
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + (p.amountReceived || 0));
    }
  });
  const monthlyEarnings = Array.from(monthlyMap.entries())
    .slice(-6)
    .map(([month, amount]) => ({ month, amount }));
  const maxEarning = Math.max(...monthlyEarnings.map((m) => m.amount), 1);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError('');
    setWithdrawLoading(true);
    try {
      await paymentsAPI.initiatePayment({
        amount: Number(withdrawAmount),
        phoneNumber: withdrawPhone,
        accountReference: 'TUFIXIT_WITHDRAWAL',
      });
      setWithdrawDone(true);
      setTimeout(() => {
        setShowWithdraw(false);
        setWithdrawDone(false);
        setWithdrawAmount('');
        setWithdrawPhone('');
      }, 3000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setWithdrawError(e?.response?.data?.message || 'Failed to initiate withdrawal. Please try again.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  return (
    <>
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="fw-bold mb-1">Wallet</h4>
          <p className="text-muted mb-0">Manage your earnings and withdrawals</p>
        </div>
        <button
          className="btn btn-success rounded-5"
          onClick={() => setShowWithdraw(true)}
        >
          <i className="fa-solid fa-mobile-screen me-2"></i>Withdraw via M-Pesa
        </button>
      </div>

      {/* Balance Cards */}
      <div className="row g-3 mb-4">
        {loading ? (
          <div className="col-12 text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : error ? (
          <div className="col-12">
            <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>{error}</span>
            </div>
          </div>
        ) : (
          <>
            {[
              { label: 'Total Earnings', value: formatKES(totalEarnings), icon: 'fa-wallet', color: '#0d6efd', bg: '#f0f7ff', sub: `From ${payments.length} completed jobs` },
              { label: 'Confirmed', value: formatKES(confirmedEarnings), icon: 'fa-circle-check', color: '#198754', bg: '#f0fdf4', sub: 'Payment confirmed' },
              { label: 'Pending Clearance', value: formatKES(pendingPayments), icon: 'fa-clock', color: '#ffc107', bg: '#fffdf0', sub: 'Awaiting confirmation' },
              { label: 'Transactions', value: String(payments.length), icon: 'fa-arrow-trend-up', color: '#F84525', bg: '#fff5f3', sub: 'Total payment records' },
            ].map((s, i) => (
          <div key={i} className="col-sm-6 col-xl-3">
            <div className="card border-0 shadow-sm p-4" style={{ background: s.bg }}>
              <div className="d-flex align-items-center gap-3 mb-2">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: 44, height: 44, background: s.color + '20' }}
                >
                  <i className={`fa-solid ${s.icon}`} style={{ color: s.color, fontSize: 18 }}></i>
                </div>
                <div className="text-muted small">{s.label}</div>
              </div>
              <h4 className="fw-bold mb-1">{s.value}</h4>
              <div className="text-muted small">{s.sub}</div>
            </div>
          </div>
        ))}
          </>
        )}
      </div>

      <div className="row g-4">
        {/* Earnings Chart */}
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 py-3">
              <h6 className="mb-0 fw-semibold">Monthly Earnings (KES)</h6>
            </div>
            <div className="card-body">
              {monthlyEarnings.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <i className="fa-solid fa-chart-bar d-block fs-1 mb-2 opacity-50"></i>
                  No earnings data yet
                </div>
              ) : (
                <div className="d-flex align-items-end gap-2 justify-content-between" style={{ height: 180 }}>
                  {monthlyEarnings.map((m, i) => {
                    const height = Math.round((m.amount / maxEarning) * 150);
                    const isLast = i === monthlyEarnings.length - 1;
                    return (
                      <div
                        key={m.month}
                        className="d-flex flex-column align-items-center flex-grow-1"
                      >
                        <span className="text-muted mb-1" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>
                          {(m.amount / 1000).toFixed(0)}K
                        </span>
                        <div
                          className="rounded-top w-100"
                          style={{
                            height,
                            background: isLast
                              ? 'linear-gradient(180deg, #F84525, #ff6b4a)'
                              : '#dee2e6',
                            transition: 'height 0.3s ease',
                            minWidth: 24,
                          }}
                          title={formatKES(m.amount)}
                        ></div>
                        <span className="text-muted mt-1" style={{ fontSize: 11 }}>
                          {m.month}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment History */}
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center py-3">
              <h6 className="mb-0 fw-semibold">Payment History</h6>
              <span className="badge text-bg-secondary">{payments.length} records</span>
            </div>
            <div className="card-body p-0">
              {payments.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <i className="fa-solid fa-inbox d-block fs-1 mb-2 opacity-50"></i>
                  No payment records yet
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-4">Date</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.jobId}>
                          <td className="ps-4 text-muted small">{p.completedAt ? formatDate(p.completedAt) : '—'}</td>
                          <td>
                            <span className="small">{p.customerName || `Job #${p.bookingCode}`}</span>
                          </td>
                          <td className="fw-medium text-success">+{formatKES(p.amountReceived || 0)}</td>
                          <td><PaymentMethodBadge method={p.paymentMethod} /></td>
                          <td>
                            <span className={`badge text-bg-${p.paymentRecorded ? 'success' : 'warning'}`}>
                              {p.paymentRecorded ? 'Confirmed' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Withdrawal Modal */}
      {showWithdraw && (
        <div
          className="modal d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">
                  <i className="fa-solid fa-mobile-screen me-2 text-success"></i>Withdraw via M-Pesa
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowWithdraw(false);
                    setWithdrawDone(false);
                  }}
                ></button>
              </div>
              {withdrawDone ? (
                <div className="modal-body text-center py-5">
                  <div
                    className="rounded-circle bg-success d-flex align-items-center justify-content-center mx-auto mb-3"
                    style={{ width: 64, height: 64 }}
                  >
                    <i className="fa-solid fa-check text-white" style={{ fontSize: 28 }}></i>
                  </div>
                  <h6 className="fw-bold mb-1">Withdrawal Initiated!</h6>
                  <p className="text-muted small">
                    You will receive an M-Pesa prompt shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleWithdraw}>
                  <div className="modal-body">
                    <div className="alert alert-info small" role="alert">
                      <i className="fa-solid fa-circle-info me-2"></i>
                      Confirmed earnings: <strong>{formatKES(confirmedEarnings)}</strong>
                    </div>
                    {withdrawError && (
                      <div className="alert alert-danger small py-2">{withdrawError}</div>
                    )}
                    <div className="mb-3">
                      <label htmlFor="mpesaNumber" className="form-label fw-medium">
                        M-Pesa Number
                      </label>
                      <input
                        type="tel"
                        id="mpesaNumber"
                        className="form-control"
                        placeholder="e.g. 0712345678"
                        value={withdrawPhone}
                        onChange={(e) => setWithdrawPhone(e.target.value)}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="withdrawAmount" className="form-label fw-medium">
                        Amount (KES)
                      </label>
                      <div className="input-group">
                        <span className="input-group-text">KES</span>
                        <input
                          type="number"
                          id="withdrawAmount"
                          className="form-control"
                          placeholder="Minimum KES 200"
                          min="200"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <p className="text-muted small mb-0">
                      Withdrawals are processed within 1-2 minutes. A fee of KES 30 applies.
                    </p>
                  </div>
                  <div className="modal-footer border-0">
                    <button
                      type="button"
                      className="btn btn-secondary rounded-5"
                      onClick={() => setShowWithdraw(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-success rounded-5" disabled={withdrawLoading}>
                      {withdrawLoading
                        ? <><span className="spinner-border spinner-border-sm me-2"></span>Processing...</>
                        : <><i className="fa-solid fa-mobile-screen me-2"></i>Withdraw Now</>}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
