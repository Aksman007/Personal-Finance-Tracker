"use client";

import Image from "next/image";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="md:hidden">
        <h1 className="text-lg font-bold text-gray-900">FinTrack</h1>
      </div>
      <div className="ml-auto flex items-center gap-4">
        {user && (
          <>
            <div className="flex items-center gap-2">
              {user.picture && (
                <Image
                  src={user.picture}
                  alt={user.name || ""}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full"
                  unoptimized
                />
              )}
              <span className="text-sm font-medium text-gray-700">
                {user.name || user.email}
              </span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </>
        )}
      </div>
    </header>
  );
}
