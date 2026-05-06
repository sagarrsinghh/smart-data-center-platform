import { useContext, useEffect, useState } from "react";

import { createUser, deleteUser, getUsers, updateUser, type UserRecord } from "../../api/users.api";
import MainLayout from "../../layouts/MainLayout";
import { AuthContext } from "../../context/AuthContext";
import { extractErrorMessage } from "../../utils/error";
import { getArrayPayload } from "../../utils/api";
import { ROLES } from "../../utils/roles";

const roleOptions = [ROLES.ADMIN, ROLES.VIEWER] as const;

export default function Users() {
  const auth = useContext(AuthContext);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: ROLES.VIEWER as UserRecord["role"],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await getUsers();
      setUsers(getArrayPayload<UserRecord>(res));
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to load users."));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) {
      setError("Name, email, and password are required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await createUser(form);
      setForm({
        name: "",
        email: "",
        password: "",
        role: ROLES.VIEWER,
      });
      await fetchUsers();
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to create user."));
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (userId: string, role: UserRecord["role"]) => {
    try {
      setError("");
      await updateUser(userId, { role });
      await fetchUsers();
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to update user role."));
    }
  };

  const handleDelete = async (user: UserRecord) => {
    try {
      setError("");
      await deleteUser(user.id);
      await fetchUsers();
    } catch (err: any) {
      setError(extractErrorMessage(err, `Failed to delete ${user.email}.`));
    }
  };

  return (
    <MainLayout>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <section
          className="rounded-2xl border border-white/[0.06] overflow-hidden"
          style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(16px)" }}
        >
          <div className="border-b border-white/[0.06] px-6 py-5">
            <h1 className="text-2xl font-bold text-white tracking-tight">Users Management</h1>
            <p className="mt-1 text-sm text-gray-400">
              Super admin can create admins and viewers, promote accounts, and remove old logins.
            </p>
          </div>

          {error && (
            <div className="mx-6 mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-gray-400">Loading users...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-400">User</th>
                    <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-400">Role</th>
                    <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-400">Created</th>
                    <th className="px-6 py-4 text-right text-xs uppercase tracking-wider text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {users.map((user) => {
                    const isCurrentUser = auth?.user?.id === user.id;
                    const isProtectedSuperAdmin = user.role === ROLES.SUPER_ADMIN;

                    return (
                      <tr key={user.id} className="hover:bg-white/[0.02]">
                        <td className="px-6 py-4">
                          <p className="font-medium text-white">{user.name || "Unnamed user"}</p>
                          <p className="mt-1 text-xs text-gray-400">{user.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          {isProtectedSuperAdmin ? (
                            <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs uppercase tracking-wider text-amber-300">
                              {user.role}
                            </span>
                          ) : (
                            <select
                              value={user.role}
                              onChange={(event) => void handleRoleChange(user.id, event.target.value as UserRecord["role"])}
                              className="rounded-xl border border-white/10 bg-[#020617] px-3 py-2 text-xs uppercase tracking-wider text-white"
                            >
                              {roleOptions.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-400">
                          {user.createdAt ? new Date(user.createdAt).toLocaleString() : "-"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => void handleDelete(user)}
                            disabled={isCurrentUser || isProtectedSuperAdmin}
                            className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside
          className="rounded-2xl border border-white/[0.06] p-6"
          style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(16px)" }}
        >
          <h2 className="text-base font-semibold text-white">Create User</h2>
          <p className="mt-1 text-sm text-gray-400">
            Create an operational `ADMIN` or a read-only `VIEWER`.
          </p>

          <div className="mt-6 space-y-4">
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Full name"
              className="w-full rounded-xl border border-white/10 bg-[#020617] px-4 py-3 text-sm text-white"
            />
            <input
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="Email address"
              type="email"
              className="w-full rounded-xl border border-white/10 bg-[#020617] px-4 py-3 text-sm text-white"
            />
            <input
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Temporary password"
              type="password"
              className="w-full rounded-xl border border-white/10 bg-[#020617] px-4 py-3 text-sm text-white"
            />
            <select
              value={form.role}
              onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as UserRecord["role"] }))}
              className="w-full rounded-xl border border-white/10 bg-[#020617] px-4 py-3 text-sm text-white"
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <button
              onClick={() => void handleCreate()}
              disabled={saving}
              className="w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-cyan-400 disabled:opacity-60"
            >
              {saving ? "Creating..." : "Create User"}
            </button>
          </div>

          <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-gray-300">
            <p className="font-medium text-white">Super admin notes</p>
            <p className="mt-2">`ADMIN` can manage uploads, alerts, reports, metrics writes, and servers.</p>
            <p className="mt-2">`VIEWER` stays read-only across the monitoring platform.</p>
            <p className="mt-2">The main `SUPER_ADMIN` role remains protected here to avoid accidental demotion.</p>
          </div>
        </aside>
      </div>
    </MainLayout>
  );
}
