import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { supabase } from '@/lib/supabaseClient'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { memoId, title, content } = body

    // 요청 본문 검증
    if (!memoId || !title || !content) {
      return NextResponse.json(
        { error: '메모 ID, 제목, 내용이 필요합니다.' },
        { status: 400 }
      )
    }

    // API 키 확인
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    // GoogleGenAI 클라이언트 초기화
    const ai = new GoogleGenAI({ apiKey })

    // 메모 요약 프롬프트 생성
    const prompt = `다음 메모를 간결하고 명확하게 요약해주세요. 핵심 내용만 2-3문장으로 정리해주세요.

제목: ${title}

내용:
${content}`

    // Gemini API 호출
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: prompt,
      config: {
        maxOutputTokens: 500,
        temperature: 0.7,
      },
    })

    const summary = response.text || '요약을 생성할 수 없습니다.'

    // DB에 요약 저장
    try {
      const { error: updateError } = await supabase
        .from('memos')
        .update({
          summary,
          updated_at: new Date().toISOString(),
        })
        .eq('id', memoId)

      if (updateError) {
        console.error('Failed to save summary to database:', updateError)
        // 요약 생성은 성공했지만 DB 저장에 실패한 경우에도 요약은 반환
      }
    } catch (dbError) {
      console.error('Database error while saving summary:', dbError)
      // 요약 생성은 성공했지만 DB 저장에 실패한 경우에도 요약은 반환
    }

    return NextResponse.json({ summary })
  } catch (error) {
    console.error('메모 요약 오류:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '메모 요약 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}

