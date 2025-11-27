import React from "react";
import VideoEditor from "./VideoEditor";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-5xl mx-auto p-4">
        <header className="mb-4">
          <h1 className="text-2xl font-bold">Video Maker TT</h1>
          <p className="text-sm text-gray-300">PWA видеоредактор</p>
        </header>
        <VideoEditor />
      </div>
    </div>
  );
}