import { notFound } from "next/navigation";

import { KitDemo } from "./kit-demo";

export default function KitPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <KitDemo />;
}
