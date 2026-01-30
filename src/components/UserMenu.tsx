/**
 * ユーザーメニューコンポーネント
 *
 * ユーザーアイコンとドロップダウンメニューを表示します。
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface UserMenuProps {
  name: string;
  email: string;
  onSignOut: () => void;
}

export function UserMenu({ name, email, onSignOut }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 外側クリックでメニューを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 名前の頭文字を取得
  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* ユーザーアイコン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
        aria-label="ユーザーメニュー"
      >
        {getInitials(name)}
      </button>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-2 z-50">
          {/* ユーザー情報 */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center text-lg">
                {getInitials(name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-800 dark:text-white truncate">
                  {name}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {email}
                </div>
              </div>
            </div>
          </div>

          {/* メニュー項目 */}
          <div className="py-1">
            <Link
              href="/history"
              className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
              onClick={() => setIsOpen(false)}
            >
              予想履歴
            </Link>
            <Link
              href="/ranking"
              className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
              onClick={() => setIsOpen(false)}
            >
              ランキング
            </Link>
          </div>

          {/* ログアウト */}
          <div className="border-t border-gray-100 dark:border-slate-700 pt-1">
            <button
              onClick={() => {
                setIsOpen(false);
                onSignOut();
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              ログアウト
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
