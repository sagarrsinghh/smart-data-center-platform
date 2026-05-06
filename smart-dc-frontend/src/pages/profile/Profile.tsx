import { useContext, useEffect, useState } from "react";

import { updateProfileApi } from "../../api/auth.api";
import { AuthContext } from "../../context/AuthContext";
import MainLayout from "../../layouts/MainLayout";
import { extractErrorMessage } from "../../utils/error";

export default function Profile() {
  const auth = useContext(AuthContext);
  const [form, setForm] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!auth?.user) {
      return;
    }

    setForm((current) => ({
      ...current,
      name: auth.user?.name || "",
      email: auth.user?.email || "",
    }));
  }, [auth?.user]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        currentPassword: form.currentPassword || undefined,
        newPassword: form.newPassword || undefined,
      };

      await updateProfileApi(payload);
      await auth?.refreshUser();

      setForm((current) => ({
        ...current,
        currentPassword: "",
        newPassword: "",
      }));

      setSuccess("Profile updated successfully.");
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to update profile."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white">My Profile</h1>
          <p className="mt-1 text-sm text-gray-400">
            Update your account details here. Role changes stay controlled by the super admin.
          </p>
        </div>

	      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.7fr]">
          <section
            className="rounded-2xl border border-white/[0.06] p-6"
            style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(16px)" }}
          >
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-400">
                  Full Name
                </label>
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-[#020617] px-4 py-3 text-sm text-white"
                />
              </div>

	              <div>
	                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-400">
	                  Email Address
	                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
	                  className="w-full rounded-xl border border-white/10 bg-[#020617] px-4 py-3 text-sm text-white"
	                />
	              </div>

	              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <h2 className="text-sm font-semibold text-white">Change Password</h2>
                <p className="mt-1 text-xs text-gray-400">
                  Leave these blank if you only want to update name or email.
                </p>

                <div className="mt-4 space-y-4">
                  <input
                    type="password"
                    value={form.currentPassword}
                    onChange={(event) => setForm((current) => ({ ...current, currentPassword: event.target.value }))}
                    placeholder="Current password"
                    className="w-full rounded-xl border border-white/10 bg-[#020617] px-4 py-3 text-sm text-white"
                  />
                  <input
                    type="password"
                    value={form.newPassword}
                    onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))}
                    placeholder="New password"
                    className="w-full rounded-xl border border-white/10 bg-[#020617] px-4 py-3 text-sm text-white"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  {success}
                </div>
              )}

              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="rounded-xl bg-cyan-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-cyan-400 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </section>

	          <aside
	            className="rounded-2xl border border-white/[0.06] p-6"
	            style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(16px)" }}
	          >
	            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-[linear-gradient(135deg,#2b4676,#172846)] text-xl font-semibold text-cyan-100">
	              {(auth?.user?.name || auth?.user?.email || "U").slice(0, 2).toUpperCase()}
	            </div>

	            <h2 className="mt-4 text-lg font-semibold text-white">{auth?.user?.name || "Unnamed user"}</h2>
            <p className="mt-1 text-sm text-gray-400">{auth?.user?.email}</p>

            <div className="mt-6 space-y-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">Role</p>
                <p className="mt-1 text-white">{auth?.user?.role?.replaceAll("_", " ")}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">Access</p>
                <p className="mt-1 text-gray-300">
                  {auth?.user?.role === "SUPER_ADMIN"
                    ? "Full platform control"
                    : auth?.user?.role === "ADMIN"
                      ? "Operational management access"
                      : "Read-only monitoring access"}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </MainLayout>
  );
}
