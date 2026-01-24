import { redirect } from "next/navigation";

export default function Home() {
  // Dev bypass - skip sign-in
  if (process.env.NODE_ENV === 'development') {
    redirect("/admin");
  }
  redirect("/sign-in");
}
