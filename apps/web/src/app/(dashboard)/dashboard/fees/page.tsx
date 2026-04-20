"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authFetch } from "@/lib/api";
import { dash } from "@/lib/dashboardUi";

interface FeeStructure {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  isRecurring: boolean;
  isAdmissionFee?: boolean;
  _count: { payments: number };
}

interface FeePayment {
  id: string;
  amount: number;
  status: string;
  paidAt?: string;
  createdAt: string;
  student: { rollNumber: string; user: { firstName: string; lastName: string; email: string } } | null;
  applicantUser: { firstName: string; lastName: string; email: string } | null;
  feeStructure: { name: string; amount: number };
}

interface StudentOption {
  id: string;
  userId: string;
  rollNumber: string;
  user: { firstName: string; lastName: string };
}

interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PAID: "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300",
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
  REFUNDED: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
};

export default function FeesPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"structures" | "payments">("structures");

  // Fee structures
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [loadingStructures, setLoadingStructures] = useState(true);
  const [showStructureForm, setShowStructureForm] = useState(false);
  const [structureForm, setStructureForm] = useState({ name: "", amount: "", dueDate: "", isRecurring: false, isAdmissionFee: false });
  const [structureFormError, setStructureFormError] = useState("");
  const [structureFormLoading, setStructureFormLoading] = useState(false);

  // Payments
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [filterFeeStructureId, setFilterFeeStructureId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterStudentSearch, setFilterStudentSearch] = useState("");

  // Record payment modal
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [paymentForm, setPaymentForm] = useState({
    studentId: "",
    applicantUserId: "",
    feeStructureId: "",
    payer: "student" as "student" | "applicant",
  });
  const [applicantUsers, setApplicantUsers] = useState<UserOption[]>([]);
  const [paymentFormError, setPaymentFormError] = useState("");
  const [paymentFormLoading, setPaymentFormLoading] = useState(false);

  async function fetchStructures() {
    setLoadingStructures(true);
    const res = await authFetch("/api/fees/structures");
    const data = await res.json();
    setStructures(Array.isArray(data) ? data : data.structures ?? []);
    setLoadingStructures(false);
  }

  async function fetchPayments() {
    setLoadingPayments(true);
    const p = new URLSearchParams();
    if (filterFeeStructureId) p.set("feeStructureId", filterFeeStructureId);
    if (filterStatus) p.set("status", filterStatus);
    const res = await authFetch(`/api/fees/payments?${p}`);
    const data = await res.json();
    setPayments(Array.isArray(data) ? data : data.payments ?? []);
    setLoadingPayments(false);
  }

  useEffect(() => { fetchStructures(); }, []);

  useEffect(() => {
    const tab = searchParams.get("tab");
    const status = searchParams.get("status");
    if (tab === "payments") setActiveTab("payments");
    if (status) setFilterStatus(status);
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === "payments") fetchPayments();
  }, [activeTab, filterFeeStructureId, filterStatus]);

  async function handleCreateStructure(e: React.FormEvent) {
    e.preventDefault();
    setStructureFormError("");
    setStructureFormLoading(true);
    try {
      const body = {
        name: structureForm.name,
        amount: Number(structureForm.amount),
        dueDate: structureForm.dueDate,
        isRecurring: structureForm.isRecurring,
        isAdmissionFee: structureForm.isAdmissionFee,
      };
      const res = await authFetch("/api/fees/structures", { method: "POST", body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setStructureFormError(data.error ?? "Failed to create"); return; }
      setShowStructureForm(false);
      setStructureForm({ name: "", amount: "", dueDate: "", isRecurring: false, isAdmissionFee: false });
      fetchStructures();
    } catch { setStructureFormError("Something went wrong"); }
    finally { setStructureFormLoading(false); }
  }

  async function handleDeleteStructure(s: FeeStructure) {
    if (!confirm(`Delete fee structure "${s.name}"?`)) return;
    const res = await authFetch(`/api/fees/structures/${s.id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); alert(d.error ?? "Failed to delete"); return; }
    fetchStructures();
  }

  async function openPaymentForm() {
    setPaymentForm({ studentId: "", applicantUserId: "", feeStructureId: "", payer: "student" });
    setPaymentFormError("");
    const [stRes, uRes] = await Promise.all([
      authFetch("/api/students?limit=200"),
      authFetch("/api/users?role=PRESENT_STUDENT&limit=200"),
    ]);
    const stData = await stRes.json();
    const uData = await uRes.json();
    const stList: StudentOption[] = Array.isArray(stData) ? stData : stData.students ?? [];
    const usersRaw: UserOption[] = Array.isArray(uData) ? uData : uData.users ?? [];
    const enrolledIds = new Set(stList.map((s) => s.userId));
    setStudents(stList);
    setApplicantUsers(usersRaw.filter((u) => !enrolledIds.has(u.id)));
    setShowPaymentForm(true);
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    setPaymentFormError("");
    setPaymentFormLoading(true);
    try {
      const body =
        paymentForm.payer === "applicant"
          ? { applicantUserId: paymentForm.applicantUserId, feeStructureId: paymentForm.feeStructureId }
          : { studentId: paymentForm.studentId, feeStructureId: paymentForm.feeStructureId };
      const res = await authFetch("/api/fees/payments", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setPaymentFormError(data.error ?? "Failed to record payment"); return; }
      setShowPaymentForm(false);
      fetchPayments();
    } catch { setPaymentFormError("Something went wrong"); }
    finally { setPaymentFormLoading(false); }
  }

  async function markPaid(payment: FeePayment) {
    const who = payment.student
      ? `${payment.student.user.firstName} ${payment.student.user.lastName}`
      : `${payment.applicantUser?.firstName ?? ""} ${payment.applicantUser?.lastName ?? ""}`.trim() || "Applicant";
    if (!confirm(`Mark payment for "${who}" as PAID?`)) return;
    const res = await authFetch(`/api/fees/payments/${payment.id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status: "PAID", paidAt: new Date().toISOString() }),
    });
    if (!res.ok) { const d = await res.json(); alert(d.error ?? "Failed to update"); return; }
    fetchPayments();
  }

  // Client-side student search filter
  const filteredPayments = filterStudentSearch
    ? payments.filter(p => {
        const q = filterStudentSearch.toLowerCase();
        const name = p.student
          ? `${p.student.user.firstName} ${p.student.user.lastName}`.toLowerCase()
          : `${p.applicantUser?.firstName ?? ""} ${p.applicantUser?.lastName ?? ""}`.toLowerCase();
        const roll = p.student?.rollNumber?.toLowerCase() ?? "";
        return name.includes(q) || roll.includes(q) || (p.applicantUser?.email?.toLowerCase().includes(q) ?? false);
      })
    : payments;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className={dash.pageTitle}>Fee Management</h1>
        {activeTab === "structures" && (
          <button
            type="button"
            onClick={() => { setStructureForm({ name: "", amount: "", dueDate: "", isRecurring: false, isAdmissionFee: false }); setStructureFormError(""); setShowStructureForm(true); }}
            className={dash.btnPrimary}
          >
            + Create Fee Structure
          </button>
        )}
        {activeTab === "payments" && (
          <button type="button" onClick={openPaymentForm} className={dash.btnPrimary}>
            + Record Payment
          </button>
        )}
      </div>

      <div className="mb-6 flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("structures")}
          className={activeTab === "structures" ? dash.tabActive : dash.tabInactive}
        >
          Fee Structures
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("payments")}
          className={activeTab === "payments" ? dash.tabActive : dash.tabInactive}
        >
          Payments
        </button>
      </div>

      {activeTab === "structures" && (
        <div className={dash.tableWrap}>
          <table className="w-full text-sm">
            <thead className={dash.thead}>
              <tr>
                <th className={dash.th}>Name</th>
                <th className={dash.th}>Amount</th>
                <th className={dash.th}>Due Date</th>
                <th className={dash.th}>Recurring</th>
                <th className={dash.th}>Admission</th>
                <th className={dash.th}>Payments</th>
                <th className={dash.th}>Actions</th>
              </tr>
            </thead>
            <tbody className={dash.tbodyDivide}>
              {loadingStructures ? (
                <tr><td colSpan={7} className={dash.emptyCell}>Loading...</td></tr>
              ) : structures.length === 0 ? (
                <tr><td colSpan={7} className={dash.emptyCell}>No fee structures found</td></tr>
              ) : structures.map(s => (
                <tr key={s.id} className={dash.rowHover}>
                  <td className={`px-4 py-3 ${dash.cellStrong}`}>{s.name}</td>
                  <td className={`px-4 py-3 ${dash.cellStrong}`}>₹{s.amount.toLocaleString()}</td>
                  <td className={`px-4 py-3 ${dash.cellMuted}`}>{new Date(s.dueDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${s.isRecurring ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300" : `${dash.badge}`}`}>
                      {s.isRecurring ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${s.isAdmissionFee ? "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300" : `${dash.badge}`}`}>
                      {s.isAdmissionFee ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className={`px-4 py-3 ${dash.cellMuted}`}>{s._count.payments}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => handleDeleteStructure(s)} className={dash.btnDanger}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "payments" && (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Search student..."
              value={filterStudentSearch}
              onChange={e => setFilterStudentSearch(e.target.value)}
              className={`${dash.inputSearch} w-52 sm:w-52`}
            />
            <select
              value={filterFeeStructureId}
              onChange={e => setFilterFeeStructureId(e.target.value)}
              className={dash.select}
            >
              <option value="">All Structures</option>
              {structures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className={dash.select}
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          <div className={dash.tableWrap}>
            <table className="w-full text-sm">
              <thead className={dash.thead}>
                <tr>
                <th className={dash.th}>Payer</th>
                <th className={dash.th}>Roll No</th>
                  <th className={dash.th}>Fee Name</th>
                  <th className={dash.th}>Amount</th>
                  <th className={dash.th}>Status</th>
                  <th className={dash.th}>Paid At</th>
                  <th className={dash.th}>Actions</th>
                </tr>
              </thead>
              <tbody className={dash.tbodyDivide}>
                {loadingPayments ? (
                  <tr><td colSpan={7} className={dash.emptyCell}>Loading...</td></tr>
                ) : filteredPayments.length === 0 ? (
                  <tr><td colSpan={7} className={dash.emptyCell}>No payments found</td></tr>
                ) : filteredPayments.map(p => (
                  <tr key={p.id} className={dash.rowHover}>
                    <td className={`px-4 py-3 ${dash.cellStrong}`}>
                      {p.student
                        ? <>{p.student.user.firstName} {p.student.user.lastName}</>
                        : <span className="text-amber-700 dark:text-amber-300">Applicant: {p.applicantUser?.firstName} {p.applicantUser?.lastName}</span>}
                    </td>
                    <td className={`px-4 py-3 ${dash.cellMono}`}>{p.student?.rollNumber ?? <span className={dash.emDash}>—</span>}</td>
                    <td className={`px-4 py-3 ${dash.cellMuted}`}>{p.feeStructure.name}</td>
                    <td className={`px-4 py-3 ${dash.cellStrong}`}>₹{p.amount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${PAYMENT_STATUS_COLORS[p.status] ?? dash.badge}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className={`px-4 py-3 ${dash.cellMuted}`}>
                      {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : <span className={dash.emDash}>—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {p.status !== "PAID" && (
                        <button type="button" onClick={() => markPaid(p)} className="text-xs text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300">
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Create Fee Structure Modal */}
      {showStructureForm && (
        <div className={dash.modalOverlay}>
          <div className={`${dash.modalPanel} w-full max-w-lg`}>
            <h2 className={`${dash.sectionTitle} mb-4`}>Create Fee Structure</h2>
            {structureFormError && <div className={dash.errorBanner}>{structureFormError}</div>}
            <form onSubmit={handleCreateStructure} className="space-y-3">
              <div>
                <label className={dash.label}>Name</label>
                <input
                  type="text"
                  value={structureForm.name}
                  onChange={e => setStructureForm(f => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="e.g. Tuition Fee Q1"
                  className={dash.input}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={dash.label}>Amount (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={structureForm.amount}
                    onChange={e => setStructureForm(f => ({ ...f, amount: e.target.value }))}
                    required
                    className={dash.input}
                  />
                </div>
                <div>
                  <label className={dash.label}>Due Date</label>
                  <input
                    type="date"
                    value={structureForm.dueDate}
                    onChange={e => setStructureForm(f => ({ ...f, dueDate: e.target.value }))}
                    required
                    className={dash.input}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={structureForm.isRecurring}
                    onChange={e => setStructureForm(f => ({ ...f, isRecurring: e.target.checked }))}
                    className="accent-blue-600"
                  />
                  <label htmlFor="isRecurring" className="text-sm text-gray-700 dark:text-gray-300">Is recurring</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isAdmissionFee"
                    checked={structureForm.isAdmissionFee}
                    onChange={e => setStructureForm(f => ({ ...f, isAdmissionFee: e.target.checked }))}
                    className="accent-blue-600"
                  />
                  <label htmlFor="isAdmissionFee" className="text-sm text-gray-700 dark:text-gray-300">
                    Admission fee (paid before student profile is created)
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowStructureForm(false)} className={`flex-1 ${dash.btnSecondary}`}>
                  Cancel
                </button>
                <button type="submit" disabled={structureFormLoading} className={`flex-1 ${dash.btnPrimary}`}>
                  {structureFormLoading ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentForm && (
        <div className={dash.modalOverlay}>
          <div className={`${dash.modalPanel} w-full max-w-lg`}>
            <h2 className={`${dash.sectionTitle} mb-4`}>Record Payment</h2>
            {paymentFormError && <div className={dash.errorBanner}>{paymentFormError}</div>}
            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="payer"
                    checked={paymentForm.payer === "student"}
                    onChange={() => setPaymentForm(f => ({ ...f, payer: "student" }))}
                  />
                  Enrolled student
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="payer"
                    checked={paymentForm.payer === "applicant"}
                    onChange={() => setPaymentForm(f => ({ ...f, payer: "applicant" }))}
                  />
                  Applicant (no profile yet)
                </label>
              </div>
              {paymentForm.payer === "student" ? (
                <div>
                  <label className={dash.label}>Student</label>
                  <select
                    value={paymentForm.studentId}
                    onChange={e => setPaymentForm(f => ({ ...f, studentId: e.target.value }))}
                    required={paymentForm.payer === "student"}
                    className={dash.selectFull}
                  >
                    <option value="">Select student</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.user.firstName} {s.user.lastName} ({s.rollNumber})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className={dash.label}>Applicant user</label>
                  <select
                    value={paymentForm.applicantUserId}
                    onChange={e => setPaymentForm(f => ({ ...f, applicantUserId: e.target.value }))}
                    required={paymentForm.payer === "applicant"}
                    className={dash.selectFull}
                  >
                    <option value="">Select applicant</option>
                    {applicantUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.firstName} {u.lastName} — {u.email}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className={dash.label}>Fee Structure</label>
                <select
                  value={paymentForm.feeStructureId}
                  onChange={e => setPaymentForm(f => ({ ...f, feeStructureId: e.target.value }))}
                  required
                  className={dash.selectFull}
                >
                  <option value="">Select fee structure</option>
                  {structures.map(s => <option key={s.id} value={s.id}>{s.name} — ₹{s.amount.toLocaleString()}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPaymentForm(false)} className={`flex-1 ${dash.btnSecondary}`}>
                  Cancel
                </button>
                <button type="submit" disabled={paymentFormLoading} className={`flex-1 ${dash.btnPrimary}`}>
                  {paymentFormLoading ? "Recording..." : "Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
