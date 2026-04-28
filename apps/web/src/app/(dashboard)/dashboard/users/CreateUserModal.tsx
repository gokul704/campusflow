"use client";

import { useEffect, useState } from "react";
import { authFetch, formatApiError } from "@/lib/api";
import { dash } from "@/lib/dashboardUi";

type Props = { onClose: () => void; onSuccess: () => void };

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Administrator" },
  { value: "CMD", label: "CMD (Managing Director)" },
  { value: "PRINCIPAL", label: "Principal" },
  { value: "ASSISTANT_PROFESSOR", label: "Assistant Professor" },
  { value: "PROFESSOR", label: "Professor" },
  { value: "CLINICAL_STAFF", label: "Clinical Staff" },
  { value: "GUEST_PROFESSOR", label: "Guest Professor" },
  { value: "OPERATIONS", label: "Operations" },
  { value: "ACCOUNTS", label: "Accounts" },
  { value: "IT_STAFF", label: "IT Staff" },
  { value: "STUDENT", label: "Student" },
  { value: "ALUMNI", label: "Alumni" },
  { value: "GUEST_STUDENT", label: "Guest student" },
] as const;

interface Dept {
  id: string;
  name: string;
  code: string;
}

export default function CreateUserModal({ onClose, onSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<string>("ASSISTANT_PROFESSOR");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [designation, setDesignation] = useState("");
  const [qualification, setQualification] = useState("");
  const [experience, setExperience] = useState("");
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authFetch("/api/departments")
      .then((r) => r.json())
      .then((d) => setDepartments(Array.isArray(d) ? d : []))
      .catch(() => setDepartments([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        email,
        firstName,
        lastName,
        role,
        phone: phone.trim() || null,
      };
      if (password.trim().length >= 8) body.password = password.trim();
      if (
        role === "ASSISTANT_PROFESSOR" ||
        role === "PROFESSOR" ||
        role === "CLINICAL_STAFF" ||
        role === "GUEST_PROFESSOR"
      ) {
        body.departmentId = departmentId;
        body.designation = designation.trim();
        if (qualification.trim()) body.qualification = qualification.trim();
        if (experience.trim()) body.experience = experience.trim();
      }
      const res = await authFetch("/api/users", { method: "POST", body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(formatApiError(data));
        return;
      }
      onSuccess();
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  }

  const showLecturerFields =
    role === "ASSISTANT_PROFESSOR" ||
    role === "PROFESSOR" ||
    role === "CLINICAL_STAFF" ||
    role === "GUEST_PROFESSOR";

  return (
    <div className={dash.modalOverlay}>
      <div className={`${dash.modalPanel} ${dash.modalScroll} max-w-lg`}>
        <h2 className={`${dash.sectionTitle} mb-4`}>Create user</h2>
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          Account is active immediately. Leave password blank to use{" "}
          <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">DEFAULT_NEW_USER_PASSWORD</code> from the API
          .env (min 8 characters).
        </p>
        {error && <div className={dash.errorBanner}>{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={dash.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={dash.input}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={dash.label}>First name</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required className={dash.input} />
            </div>
            <div>
              <label className={dash.label}>Last name</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} required className={dash.input} />
            </div>
          </div>
          <div>
            <label className={dash.label}>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className={dash.selectFull}>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          {showLecturerFields && (
            <>
              <div>
                <label className={dash.label}>Department</label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  required
                  className={dash.selectFull}
                >
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={dash.label}>Designation</label>
                <input value={designation} onChange={(e) => setDesignation(e.target.value)} required className={dash.input} />
              </div>
              <div>
                <label className={dash.label}>Qualification (optional)</label>
                <input value={qualification} onChange={(e) => setQualification(e.target.value)} className={dash.input} />
              </div>
              <div>
                <label className={dash.label}>Experience (optional)</label>
                <input value={experience} onChange={(e) => setExperience(e.target.value)} className={dash.input} />
              </div>
            </>
          )}
          <div>
            <label className={dash.label}>Phone (optional)</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={dash.input} />
          </div>
          <div>
            <label className={dash.label}>Password (optional)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 chars if set"
              autoComplete="new-password"
              className={dash.input}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className={`flex-1 ${dash.btnSecondary}`}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className={`flex-1 ${dash.btnPrimary}`}>
              {loading ? "Creating…" : "Create user"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
