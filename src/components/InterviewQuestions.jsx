export default function InterviewQuestions({ questions }) {
  if (!questions || questions.length === 0) return null;
  return (
    <div className="bg-white rounded-xl shadow p-6 mt-6">
      <div className="font-semibold text-blue-600 mb-2">
        Interview Questions
      </div>
      <ol className="list-decimal ml-6 text-gray-700 space-y-1">
        {questions.map((q, i) => (
          <li key={i}>{q}</li>
        ))}
      </ol>
    </div>
  );
}
