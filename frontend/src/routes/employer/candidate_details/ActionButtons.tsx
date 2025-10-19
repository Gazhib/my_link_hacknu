import { useState } from "react";
import { applicationService } from "../../../shared/api/applicationService";

interface ActionButtonsProps {
  applicationId: string;
  onStatusChange: () => void;
}

export default function ActionButtons({ applicationId, onStatusChange }: ActionButtonsProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAccept = async () => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      await applicationService.acceptApplication(applicationId);
      onStatusChange();
    } catch (error) {
      console.error("Failed to accept application:", error);
      alert("Не удалось одобрить заявку");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      await applicationService.rejectApplication(applicationId);
      onStatusChange();
    } catch (error) {
      console.error("Failed to reject application:", error);
      alert("Не удалось отклонить заявку");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Действия</h3>
      <div className="space-y-3">
        <button
          onClick={handleAccept}
          disabled={isProcessing}
          className="w-full bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors cursor-pointer disabled:bg-green-400 disabled:cursor-not-allowed"
        >
          ✓ Одобрить кандидата
        </button>
        <button
          onClick={handleReject}
          disabled={isProcessing}
          className="w-full bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors cursor-pointer disabled:bg-red-400 disabled:cursor-not-allowed"
        >
          ✗ Отклонить
        </button>
      </div>
    </div>
  );
}