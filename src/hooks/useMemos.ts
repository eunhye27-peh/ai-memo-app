'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Memo, MemoFormData } from '@/types/memo'
import { memoRepository } from '@/utils/memoRepository'

export const useMemos = () => {
  const [memos, setMemos] = useState<Memo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // 메모 로드
  useEffect(() => {
    const loadMemos = async () => {
      setLoading(true)
      setError(null)
      try {
        const loadedMemos = await memoRepository.getMemos()
        setMemos(loadedMemos)
      } catch (err) {
        console.error('Failed to load memos:', err)
        setError('메모를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadMemos()
  }, [])

  // 메모 생성
  const createMemo = useCallback(
    async (formData: MemoFormData): Promise<Memo> => {
      const newMemo: Memo = {
        id: uuidv4(),
        ...formData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      try {
        const createdMemo = await memoRepository.addMemo(newMemo)
        setMemos(prev => [createdMemo, ...prev])
        return createdMemo
      } catch (err) {
        console.error('Failed to create memo:', err)
        throw err
      }
    },
    []
  )

  // 메모 업데이트
  const updateMemo = useCallback(
    async (id: string, formData: MemoFormData): Promise<void> => {
      const existingMemo = memos.find(memo => memo.id === id)
      if (!existingMemo) return

      const updatedMemo: Memo = {
        ...existingMemo,
        ...formData,
        updatedAt: new Date().toISOString(),
      }

      try {
        const savedMemo = await memoRepository.updateMemo(updatedMemo)
        setMemos(prev =>
          prev.map(memo => (memo.id === id ? savedMemo : memo))
        )
      } catch (err) {
        console.error('Failed to update memo:', err)
        throw err
      }
    },
    [memos]
  )

  // 메모 삭제
  const deleteMemo = useCallback(async (id: string): Promise<void> => {
    try {
      await memoRepository.deleteMemo(id)
      setMemos(prev => prev.filter(memo => memo.id !== id))
    } catch (err) {
      console.error('Failed to delete memo:', err)
      throw err
    }
  }, [])

  // 메모 요약 업데이트
  const updateMemoSummary = useCallback(
    async (id: string, summary: string): Promise<void> => {
      try {
        const updatedMemo = await memoRepository.updateMemoSummary(id, summary)
        setMemos(prev =>
          prev.map(memo => (memo.id === id ? updatedMemo : memo))
        )
      } catch (err) {
        console.error('Failed to update memo summary:', err)
        throw err
      }
    },
    []
  )

  // 메모 태그 업데이트
  const updateMemoTags = useCallback(
    async (id: string, tags: string[]): Promise<void> => {
      try {
        const updatedMemo = await memoRepository.updateMemoTags(id, tags)
        setMemos(prev =>
          prev.map(memo => (memo.id === id ? updatedMemo : memo))
        )
      } catch (err) {
        console.error('Failed to update memo tags:', err)
        throw err
      }
    },
    []
  )

  // 메모 검색
  const searchMemos = useCallback((query: string): void => {
    setSearchQuery(query)
  }, [])

  // 카테고리 필터링
  const filterByCategory = useCallback((category: string): void => {
    setSelectedCategory(category)
  }, [])

  // 특정 메모 가져오기
  const getMemoById = useCallback(
    (id: string): Memo | undefined => {
      return memos.find(memo => memo.id === id)
    },
    [memos]
  )

  // 필터링된 메모 목록
  const filteredMemos = useMemo(() => {
    let filtered = memos

    // 카테고리 필터링
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(memo => memo.category === selectedCategory)
    }

    // 검색 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        memo =>
          memo.title.toLowerCase().includes(query) ||
          memo.content.toLowerCase().includes(query) ||
          memo.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [memos, selectedCategory, searchQuery])

  // 모든 메모 삭제
  const clearAllMemos = useCallback(async (): Promise<void> => {
    try {
      // 모든 메모를 순차적으로 삭제
      const deletePromises = memos.map(memo => memoRepository.deleteMemo(memo.id))
      await Promise.all(deletePromises)
      setMemos([])
      setSearchQuery('')
      setSelectedCategory('all')
    } catch (err) {
      console.error('Failed to clear all memos:', err)
      throw err
    }
  }, [memos])

  // 통계 정보
  const stats = useMemo(() => {
    const totalMemos = memos.length
    const categoryCounts = memos.reduce(
      (acc, memo) => {
        acc[memo.category] = (acc[memo.category] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return {
      total: totalMemos,
      byCategory: categoryCounts,
      filtered: filteredMemos.length,
    }
  }, [memos, filteredMemos])

  return {
    // 상태
    memos: filteredMemos,
    allMemos: memos,
    loading,
    error,
    searchQuery,
    selectedCategory,
    stats,

    // 메모 CRUD
    createMemo,
    updateMemo,
    deleteMemo,
    getMemoById,
    updateMemoSummary,
    updateMemoTags,

    // 필터링 & 검색
    searchMemos,
    filterByCategory,

    // 유틸리티
    clearAllMemos,
  }
}
