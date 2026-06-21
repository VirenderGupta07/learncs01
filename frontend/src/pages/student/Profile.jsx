import useAuth from '../../hooks/useAuth';

export default function Profile() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <section>
      <h1 className="mb-6 text-xl font-semibold">Profile</h1>
      <div className="max-w-md space-y-4">
        <div>
          <label className="text-sm text-gray-500">Name</label>
          <p className="font-medium">{user.name}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Email</label>
          <p className="font-medium">{user.email}</p>
        </div>
      </div>
    </section>
  );
}
