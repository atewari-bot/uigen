"use client";

import dynamic from "next/dynamic";

const MainContent = dynamic(
  () => import("./main-content").then((mod) => mod.MainContent),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen w-screen flex items-center justify-center bg-neutral-50">
        <div className="text-neutral-500">Loading...</div>
      </div>
    ),
  }
);

interface MainContentWrapperProps {
  user?: {
    id: string;
    email: string;
  } | null;
  project?: {
    id: string;
    name: string;
    messages: any[];
    data: any;
    createdAt: Date;
    updatedAt: Date;
  };
}

export function MainContentWrapper({ user, project }: MainContentWrapperProps) {
  return <MainContent user={user} project={project} />;
}
