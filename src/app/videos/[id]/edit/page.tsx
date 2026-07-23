"use client";

import { use } from "react";
import { VideoForm } from "@/components/VideoForm";

export default function EditVideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <VideoForm mode="edit" videoId={id} />;
}
