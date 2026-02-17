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
  onUpdateName?: (name: string) => Promise<{ error: string | null }>;
}

export function UserMenu({ name, email, onSignOut, onUpdateName }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 外側クリックでメニューを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsEditing(false);
        setEditError(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 編集モードになったらinputにフォーカス
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // 名前の頭文字を取得
  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const handleStartEdit = () => {
    setEditName(name);
    setEditError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName(name);
    setEditError(null);
  };

  const handleSaveName = async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError('名前を入力してください');
      return;
    }
    if (trimmed === name) {
      setIsEditing(false);
      return;
    }
    if (!onUpdateName) return;

    setSaving(true);
    setEditError(null);
    const { error } = await onUpdateName(trimmed);
    setSaving(false);

    if (error) {
      setEditError(error);
    } else {
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
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
                {isEditing ? (
                  <div>
                    <input
                      ref={inputRef}
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={saving}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      maxLength={30}
                    />
                    {editError && (
                      <div className="text-xs text-red-500 mt-1">{editError}</div>
                    )}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleSaveName}
                        disabled={saving}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? '保存中...' : '保存'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={saving}
                        className="px-3 py-1 text-xs bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-slate-500"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <div className="font-semibold text-gray-800 dark:text-white truncate">
                      {name}
                    </div>
                    {onUpdateName && (
                      <button
                        onClick={handleStartEdit}
                        className="flex-shrink-0 p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        aria-label="名前を編集"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
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
