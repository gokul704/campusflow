"use client";

import { useState } from "react";
import { authFetch } from "@/lib/api";
import { dash } from "@/lib/dashboardUi";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function InviteModal({ onClose, onSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await authFetch("/api/users/invite", {
        method: "POST",
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to send invite"); return; }
      onSuccess();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={dash.modalOverlay}>
      <div className={`${dash.modalPanel} max-w-md`}>
        <h2 className={`${dash.sectionTitle} mb-4`}>Invite User</h2>

        {error && (
          <div className={dash.errorBanner}>{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div>
            <label className={dash.label}>Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={dash.selectFull}
            >
              <option value="STUDENT">Student</option>
              <option value="FACULTY">Faculty</option>
              <option value="HOD">HOD</option>
              <option value="PARENT">Parent</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className={`flex-1 ${dash.btnSecondary}`}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className={`flex-1 ${dash.btnPrimary}`}>
              {loading ? "Sending..." : "Send Invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
