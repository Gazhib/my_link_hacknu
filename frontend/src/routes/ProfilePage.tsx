import { useState, useEffect } from "react";
import { userService } from "../shared/api/userService";
import { authService } from "../shared/api/authService";
import { useNavigate } from "react-router-dom";

export default function ProfilePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [cvUrl, setCvUrl] = useState<string>("");
  const [isCvLoading, setIsCvLoading] = useState(false);

  useEffect(() => {
    userService
      .getMe()
      .then((userData) => {
        setUser(userData);
        if (userData.cvUrl) {
          // Fetch CV URL if user has a CV
          setIsCvLoading(true);
          userService.getCVUrl()
            .then((signedUrl) => {
              setCvUrl(signedUrl);
            })
            .catch((err) => {
              console.error("Failed to fetch CV URL:", err);
            })
            .finally(() => {
              setIsCvLoading(false);
            });
        }
      })
      .catch((err) => {
        console.error("Failed to fetch user:", err);
      });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        setMessage("Пожалуйста, выберите PDF файл.");
        setSelectedFile(null);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setMessage("Размер файла не должен превышать 5 МБ.");
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setMessage("");
    }
  };

  const handleCvUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const updatedUser = await userService.updateCV(selectedFile);
      setUser(updatedUser);
      setSelectedFile(null);

      // Fetch new CV URL
      const signedUrl = await userService.getCVUrl();
      setCvUrl(signedUrl);
      setMessage("Резюме успешно загружено!");
    } catch (err: any) {
      console.error("Failed to upload CV:", err);
      setMessage(err.response?.data?.detail || "Не удалось загрузить резюме");
    } finally {
      setIsUploading(false);
    }
  };

  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authService.logout();
      setUser(null);
      navigate("/auth?mode=login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="mx-auto mt-10 max-w-xl p-5">
      <h1 className="mb-2 text-2xl font-semibold">Профиль</h1>
      {user && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm">
            <strong>Имя пользователя:</strong> {user.username}
          </p>
          <p className="text-sm">
            <strong>Роль:</strong> {user.role}
          </p>
          <p className="text-sm">
            <strong>Дата регистрации:</strong>{" "}
            {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>
      )}
      <p className="text-gray-600">
        Загрузите ваше резюме в формате PDF (максимум 5 МБ).
      </p>

      <form onSubmit={handleCvUpload} className="mt-5 flex flex-col gap-3">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Резюме (PDF)</span>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>

        {selectedFile && (
          <div className="text-sm text-gray-800">
            Выбранный файл:{" "}
            <span className="font-medium">{selectedFile.name}</span> (
            {(selectedFile.size / 1024).toFixed(2)} КБ)
          </div>
        )}

        {user?.cvUrl && !selectedFile && (
          <div className="text-sm text-gray-800">
            {isCvLoading ? (
              <span>Загрузка ссылки на резюме...</span>
            ) : cvUrl ? (
              <>
                Текущее резюме:{" "}
                <a
                  href={cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Скачать PDF
                </a>
              </>
            ) : (
              <span>Резюме загружено</span>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={isUploading || !selectedFile}
          className="w-40 rounded-md bg-gray-900 px-4 py-2 text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading ? "Сохранение..." : "Загрузить"}
        </button>

        {message && (
          <div
            className={`text-sm ${
              message.includes("успешно") ? "text-green-600" : "text-red-600"
            }`}
          >
            {message}
          </div>
        )}
      </form>

      <button
        type="button"
        onClick={handleLogout}
        className="px-[20px] py-[10px] my-10 rounded-[8px] bg-red-500 text-white text-[14px] font-bold hover:bg-red-600"
      >
        Выйти
      </button>
    </div>
  );
}
