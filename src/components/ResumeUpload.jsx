import { useRef } from "react";

export default function ResumeUpload({ onFile, loading }) {
  const fileInput = useRef();

  function handleChange(e) {
    if (e.target.files && e.target.files[0]) {
      onFile(e.target.files[0]);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFile(e.dataTransfer.files[0]);
    }
  }

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all duration-200 bg-gray-50 hover:bg-blue-50 cursor-pointer mb-6 ${
        loading ? "opacity-60 pointer-events-none" : ""
      }`}
      onClick={() => fileInput.current.click()}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <input
        ref={fileInput}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleChange}
        disabled={loading}
      />
      <svg
        className="w-10 h-10 text-blue-400 mb-2"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
      </svg>
      <span className="font-medium text-gray-700">
        Drag & drop or click to upload PDF
      </span>
    </div>
  );
}
