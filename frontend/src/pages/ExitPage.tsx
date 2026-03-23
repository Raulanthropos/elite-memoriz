// import { useNavigate } from 'react-router-dom';

const ExitPage = () => {
  // const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-3xl shadow-xl p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">You exited the event gallery.</h1>
        <p className="text-gray-600 leading-relaxed mb-6">
          Scan the event QR code again to re-enter.
        </p>
      </div>
    </div>
  );
};

export default ExitPage;
