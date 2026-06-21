import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import endpoints from '../../api/endpoints';
import useAuth from '../../hooks/useAuth';

const PERMISSION_LABELS = {
  manageCourses: 'Manage Courses',
  manageVideos: 'Manage Videos (YouTube/S3)',
  manageInstructors: 'Appoint Instructors',
  manageCoupons: 'Manage Coupons',
  manageUsers: 'Manage Users',
  viewAnalytics: 'View Analytics',
  manageCertificates: 'Manage Certificates',
  moderateChat: 'Moderate Chat',
  manageOrders: 'Manage Orders',
};

/**
 * Only reachable by the Super Admin (see Sidebar.jsx / RoleRoute). This is
 * the UI for "admin allows/gives permission so other admin-dashboard users
 * [see/do] only what they've been granted" - every other admin account on
 * the platform starts with all permissions false until set here.
 */
export default function StaffPermissions() {
  const { isSuperAdmin } = useAuth();
  const [staff, setStaff] = useState([]);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    axiosClient.get(endpoints.admin.staff).then(({ data }) => setStaff(data.data.staff));
  }, []);

  async function togglePermission(staffMember, key) {
    const nextValue = !staffMember.permissions?.[key];
    setSaving(staffMember._id);

    try {
      const { data } = await axiosClient.patch(endpoints.admin.staffPermissions(staffMember._id), {
        permissions: { [key]: nextValue },
      });
      setStaff((prev) => prev.map((s) => (s._id === staffMember._id ? data.data.staffUser : s)));
    } finally {
      setSaving(null);
    }
  }

  if (!isSuperAdmin) {
    return <p className="text-sm text-gray-500">Only the Super Admin can manage staff permissions.</p>;
  }

  return (
    <section>
      <h1 className="mb-2 text-xl font-semibold">Staff & Permissions</h1>
      <p className="mb-6 text-sm text-gray-500">
        Control exactly what each admin-dashboard account can see and do.
      </p>

      <div className="space-y-6">
        {staff.map((member) => (
          <div key={member._id} className="rounded-md border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{member.name}</p>
                <p className="text-xs text-gray-500">{member.email}</p>
              </div>
              {member.isSuperAdmin && (
                <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium">Super Admin</span>
              )}
            </div>

            {!member.isSuperAdmin && (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      disabled={saving === member._id}
                      checked={!!member.permissions?.[key]}
                      onChange={() => togglePermission(member, key)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
