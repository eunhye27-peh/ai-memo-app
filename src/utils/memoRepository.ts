import { Memo } from '@/types/memo'
import { supabase } from '@/lib/supabaseClient'

export const memoRepository = {
  // 모든 메모 가져오기
  async getMemos(): Promise<Memo[]> {
    try {
      const { data, error } = await supabase
        .from('memos')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading memos from Supabase:', error)
        throw error
      }

      // Supabase 데이터를 Memo 타입으로 변환
      return (
        data?.map(memo => ({
          id: memo.id,
          title: memo.title,
          content: memo.content,
          category: memo.category,
          tags: memo.tags || [],
          summary: memo.summary || undefined,
          createdAt: memo.created_at,
          updatedAt: memo.updated_at,
        })) || []
      )
    } catch (error) {
      console.error('Error loading memos:', error)
      return []
    }
  },

  // 메모 추가
  async addMemo(memo: Memo): Promise<Memo> {
    try {
      const { data, error } = await supabase
        .from('memos')
        .insert({
          id: memo.id,
          title: memo.title,
          content: memo.content,
          category: memo.category,
          tags: memo.tags,
          summary: memo.summary || null,
          created_at: memo.createdAt,
          updated_at: memo.updatedAt,
        })
        .select()
        .single()

      if (error) {
        console.error('Error adding memo to Supabase:', error)
        throw error
      }

      return {
        id: data.id,
        title: data.title,
        content: data.content,
        category: data.category,
        tags: data.tags || [],
        summary: data.summary || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      }
    } catch (error) {
      console.error('Error adding memo:', error)
      throw error
    }
  },

  // 메모 업데이트
  async updateMemo(updatedMemo: Memo): Promise<Memo> {
    try {
      const { data, error } = await supabase
        .from('memos')
        .update({
          title: updatedMemo.title,
          content: updatedMemo.content,
          category: updatedMemo.category,
          tags: updatedMemo.tags,
          summary: updatedMemo.summary || null,
          updated_at: updatedMemo.updatedAt,
        })
        .eq('id', updatedMemo.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating memo in Supabase:', error)
        throw error
      }

      return {
        id: data.id,
        title: data.title,
        content: data.content,
        category: data.category,
        tags: data.tags || [],
        summary: data.summary || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      }
    } catch (error) {
      console.error('Error updating memo:', error)
      throw error
    }
  },

  // 메모 삭제
  async deleteMemo(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('memos').delete().eq('id', id)

      if (error) {
        console.error('Error deleting memo from Supabase:', error)
        throw error
      }
    } catch (error) {
      console.error('Error deleting memo:', error)
      throw error
    }
  },

  // 메모 검색
  async searchMemos(query: string): Promise<Memo[]> {
    try {
      const lowercaseQuery = query.toLowerCase()

      const { data, error } = await supabase
        .from('memos')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error searching memos:', error)
        throw error
      }

      // 클라이언트 사이드 필터링 (Supabase의 full-text search를 사용할 수도 있음)
      return (
        data
          ?.filter(
            memo =>
              memo.title.toLowerCase().includes(lowercaseQuery) ||
              memo.content.toLowerCase().includes(lowercaseQuery) ||
              (memo.tags &&
                Array.isArray(memo.tags) &&
                memo.tags.some((tag: string) =>
                  tag.toLowerCase().includes(lowercaseQuery)
                ))
          )
          .map(memo => ({
            id: memo.id,
            title: memo.title,
            content: memo.content,
            category: memo.category,
            tags: memo.tags || [],
            summary: memo.summary || undefined,
            createdAt: memo.created_at,
            updatedAt: memo.updated_at,
          })) || []
      )
    } catch (error) {
      console.error('Error searching memos:', error)
      return []
    }
  },

  // 카테고리별 메모 필터링
  async getMemosByCategory(category: string): Promise<Memo[]> {
    try {
      const query = supabase
        .from('memos')
        .select('*')
        .order('created_at', { ascending: false })

      if (category !== 'all') {
        query.eq('category', category)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error filtering memos by category:', error)
        throw error
      }

      return (
        data?.map(memo => ({
          id: memo.id,
          title: memo.title,
          content: memo.content,
          category: memo.category,
          tags: memo.tags || [],
          summary: memo.summary || undefined,
          createdAt: memo.created_at,
          updatedAt: memo.updated_at,
        })) || []
      )
    } catch (error) {
      console.error('Error filtering memos by category:', error)
      return []
    }
  },

  // 특정 메모 가져오기
  async getMemoById(id: string): Promise<Memo | null> {
    try {
      const { data, error } = await supabase
        .from('memos')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // 레코드를 찾을 수 없음
          return null
        }
        console.error('Error getting memo by id:', error)
        throw error
      }

      if (!data) return null

      return {
        id: data.id,
        title: data.title,
        content: data.content,
        category: data.category,
        tags: data.tags || [],
        summary: data.summary || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      }
    } catch (error) {
      console.error('Error getting memo by id:', error)
      return null
    }
  },

  // 요약 업데이트
  async updateMemoSummary(id: string, summary: string): Promise<Memo> {
    try {
      const { data, error } = await supabase
        .from('memos')
        .update({
          summary,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating memo summary:', error)
        throw error
      }

      return {
        id: data.id,
        title: data.title,
        content: data.content,
        category: data.category,
        tags: data.tags || [],
        summary: data.summary || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      }
    } catch (error) {
      console.error('Error updating memo summary:', error)
      throw error
    }
  },

  // 태그 업데이트
  async updateMemoTags(id: string, tags: string[]): Promise<Memo> {
    try {
      const { data, error } = await supabase
        .from('memos')
        .update({
          tags,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating memo tags:', error)
        throw error
      }

      return {
        id: data.id,
        title: data.title,
        content: data.content,
        category: data.category,
        tags: data.tags || [],
        summary: data.summary || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      }
    } catch (error) {
      console.error('Error updating memo tags:', error)
      throw error
    }
  },
}

