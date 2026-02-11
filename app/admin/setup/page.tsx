
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";

export default function SetupPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            if (res.ok) {
                router.push("/admin/login");
            } else {
                const data = await res.json();
                setError(data.error || "Setup failed");
            }
        } catch {
            setError("An error occurred");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border-l-4 border-alma-orange">
                <div className="flex flex-col items-center mb-6">
                    <div className="bg-alma-orange text-white p-3 rounded-full mb-3">
                        <ShieldAlert className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">Initial Setup</h1>
                    <p className="text-gray-500 text-sm mt-1">Create your admin account</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Choose Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-alma-orange focus:border-alma-orange outline-none transition-all"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Choose Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-alma-orange focus:border-alma-orange outline-none transition-all"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-alma-orange text-white py-2 rounded-lg font-bold hover:bg-opacity-90 transition-colors shadow-md"
                    >
                        Create Admin Account
                    </button>
                </form>
            </div>
        </div>
    );
}
