import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Learn to code, properly.</h1>
      <p className="mt-4 text-gray-600">
        Focused, instructor-led courses in Programming and Computer Science - no ads, no fluff.
      </p>
      <Link to="/courses" className="mt-8 inline-block rounded-md bg-ink px-5 py-2.5 text-white">
        Browse courses
      </Link>
    </section>
  );
}
