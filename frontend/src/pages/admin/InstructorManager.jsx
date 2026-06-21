import { useState } from 'react';
import axiosClient from '../../api/axiosClient';
import endpoints from '../../api/endpoints';

export default function InstructorManager() {
  const [form, setForm] = useState({ name: '', email: '', bio: '' });
  const [credentials, setCredentials] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const { data } = await axiosClient.post(endpoints.admin.instructors, form);
    setCredentials({ email: data.data.instructor.email, temporaryPassword: data.data.temporaryPassword });
    setForm({ name: '', email: '', bio: '' });
  }

  return (
    <section>
      <h1 className="mb-6 text-xl font-semibold">Appoint Instructor</h1>

      <form onSubmit={handleSubmit} className="max-w-md space-y-3">
        <input
          placeholder="Full name"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          type="email"
          placeholder="Email"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <textarea
          placeholder="Short bio"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
        />
        <button type="submit" className="rounded-md bg-ink px-4 py-2 text-sm text-white">
          Appoint instructor
        </button>
      </form>

      {credentials && (
        <div className="mt-6 rounded-md border border-accent/40 bg-accent/5 p-4 text-sm">
          <p>Share these one-time credentials securely with the instructor:</p>
          <p className="mt-2 font-mono">{credentials.email}</p>
          <p className="font-mono">{credentials.temporaryPassword}</p>
        </div>
      )}
    </section>
  );
}
