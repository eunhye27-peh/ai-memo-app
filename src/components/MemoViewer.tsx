'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Memo, MEMO_CATEGORIES, MemoCategory } from '@/types/memo'

const Markdown = dynamic(
  () => import('@uiw/react-markdown-preview').then(mod => mod.default),
  { ssr: false }
)

interface MemoViewerProps {
  memo: Memo | null
  isOpen: boolean
  onClose: () => void
  onEdit: (memo: Memo) => void
  onDelete: (id: string) => void
  onUpdateSummary?: (id: string, summary: string) => void
  onUpdateTags?: (id: string, tags: string[]) => void
}

export default function MemoViewer({
  memo,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onUpdateSummary,
  onUpdateTags,
}: MemoViewerProps) {
  const [summary, setSummary] = useState<string | null>(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [isLoadingTags, setIsLoadingTags] = useState(false)
  const [tagsError, setTagsError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  // 모달이 열릴 때 저장된 요약 조회 또는 상태 초기화
  useEffect(() => {
    if (isOpen && memo) {
      // 저장된 요약이 있으면 표시
      if (memo.summary) {
        setSummary(memo.summary)
      } else {
        setSummary(null)
      }
      setSummaryError(null)
      setIsLoadingSummary(false)
    }
  }, [isOpen, memo])

  const handleGenerateSummary = async () => {
    if (!memo) return

    setIsLoadingSummary(true)
    setSummaryError(null)

    try {
      const response = await fetch('/api/memo-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memoId: memo.id,
          title: memo.title,
          content: memo.content,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '요약 생성에 실패했습니다.')
      }

      const data = await response.json()
      const generatedSummary = data.summary
      setSummary(generatedSummary)

      // 요약 저장
      if (memo && onUpdateSummary) {
        try {
          await onUpdateSummary(memo.id, generatedSummary)
        } catch (error) {
          console.error('Failed to save summary:', error)
          // 요약은 생성되었지만 저장에 실패한 경우, 사용자에게 알리지 않고 계속 진행
        }
      }
    } catch (error) {
      console.error('요약 생성 오류:', error)
      setSummaryError(
        error instanceof Error ? error.message : '요약 생성 중 오류가 발생했습니다.'
      )
    } finally {
      setIsLoadingSummary(false)
    }
  }

  const handleGenerateTags = async () => {
    if (!memo) return

    setIsLoadingTags(true)
    setTagsError(null)

    try {
      const response = await fetch('/api/memo-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memoId: memo.id,
          title: memo.title,
          content: memo.content,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '태그 생성에 실패했습니다.')
      }

      const data = await response.json()
      const generatedTags = data.tags || []

      // 태그 저장
      if (memo && onUpdateTags) {
        try {
          await onUpdateTags(memo.id, generatedTags)
        } catch (error) {
          console.error('Failed to save tags:', error)
          // 태그는 생성되었지만 저장에 실패한 경우, 사용자에게 알리지 않고 계속 진행
        }
      }
    } catch (error) {
      console.error('태그 생성 오류:', error)
      setTagsError(
        error instanceof Error ? error.message : '태그 생성 중 오류가 발생했습니다.'
      )
    } finally {
      setIsLoadingTags(false)
    }
  }

  if (!isOpen || !memo) {
    return null
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleDelete = async () => {
    if (window.confirm('정말로 이 메모를 삭제하시겠습니까?')) {
      try {
        await onDelete(memo.id)
      } catch (error) {
        console.error('Failed to delete memo:', error)
        alert('메모 삭제에 실패했습니다.')
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div
        className="relative z-10 w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl border border-gray-200"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                {MEMO_CATEGORIES[memo.category as MemoCategory]}
              </span>
              <span className="text-sm text-gray-500">
                마지막 수정 {formatDate(memo.updatedAt)}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 break-words">
              {memo.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="닫기"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-500">내용</h3>
              {!memo.summary && (
                <button
                  onClick={handleGenerateSummary}
                  disabled={isLoadingSummary}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                {isLoadingSummary ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-3 w-3"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    요약 생성 중...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3 h-3 mr-1.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    LLM 요약
                  </>
                )}
                </button>
              )}
            </div>
            <div data-color-mode="light" className="text-gray-800">
              <Markdown source={memo.content} />
            </div>
          </div>

          {summary && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg
                  className="w-4 h-4 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <h3 className="text-sm font-semibold text-purple-700">AI 요약</h3>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
            </div>
          )}

          {summaryError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <svg
                  className="w-4 h-4 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="text-sm font-semibold text-red-700">오류</h3>
              </div>
              <p className="text-sm text-red-600">{summaryError}</p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-500">태그</h3>
              <button
                onClick={handleGenerateTags}
                disabled={isLoadingTags}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingTags ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-3 w-3"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    태그 생성 중...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3 h-3 mr-1.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                    LLM 태그 생성
                  </>
                )}
              </button>
            </div>
            {memo.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {memo.tags.map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">태그가 없습니다.</p>
            )}
            {tagsError && (
              <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <svg
                    className="w-4 h-4 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="text-sm font-semibold text-red-700">오류</h3>
                </div>
                <p className="text-sm text-red-600">{tagsError}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <span className="text-xs text-gray-500">
            생성일 {formatDate(memo.createdAt)}
          </span>
          <div className="flex gap-3">
            <button
              onClick={() => onEdit(memo)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              편집
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
              삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

