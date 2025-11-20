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

    // 태그 생성 프롬프트 생성
    const prompt = `다음 메모의 내용을 분석하여 적절한 태그를 생성해주세요. 태그는 메모의 핵심 주제와 내용을 잘 나타내는 단어나 구문이어야 합니다.

제목: ${title}

내용:
${content}

위 메모에 적합한 태그를 3-5개 생성해주세요. 태그는 JSON 배열 형식으로 반환해주세요. 예: ["태그1", "태그2", "태그3"]
태그는 한글이나 영어로 작성할 수 있으며, 각 태그는 간결하고 명확해야 합니다.`

    // Gemini API 호출
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: prompt,
      config: {
        maxOutputTokens: 200,
        temperature: 0.7,
      },
    })

    const responseText = response.text || '[]'

    // JSON 배열 파싱 시도
    let tags: string[] = []
    try {
      // 응답에서 JSON 배열 추출 시도
      const jsonMatch = responseText.match(/\[.*?\]/s)
      if (jsonMatch) {
        tags = JSON.parse(jsonMatch[0])
      } else {
        // JSON 형식이 아닌 경우 줄바꿈이나 쉼표로 분리 시도
        const lines = responseText
          .split(/[,\n]/)
          .map(line => line.trim().replace(/^["'`]|["'`]$/g, ''))
          .filter(line => line.length > 0)
        tags = lines.slice(0, 5) // 최대 5개
      }
    } catch (parseError) {
      console.error('태그 파싱 오류:', parseError)
      // 파싱 실패 시 빈 배열 반환
      tags = []
    }

    // 태그가 배열이 아니거나 비어있는 경우 기본값 설정
    if (!Array.isArray(tags) || tags.length === 0) {
      tags = []
    }

    // DB에 태그 저장
    try {
      const { error: updateError } = await supabase
        .from('memos')
        .update({
          tags,
          updated_at: new Date().toISOString(),
        })
        .eq('id', memoId)

      if (updateError) {
        console.error('Failed to save tags to database:', updateError)
        // 태그 생성은 성공했지만 DB 저장에 실패한 경우에도 태그는 반환
      }
    } catch (dbError) {
      console.error('Database error while saving tags:', dbError)
      // 태그 생성은 성공했지만 DB 저장에 실패한 경우에도 태그는 반환
    }

    return NextResponse.json({ tags })
  } catch (error) {
    console.error('메모 태그 생성 오류:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '메모 태그 생성 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}

