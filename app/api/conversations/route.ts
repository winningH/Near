import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/conversations - 获取所有会话
export async function GET() {
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        messages: {
          some: {}
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    return NextResponse.json(conversations);
  } catch (error) {
    console.error('获取会话列表失败:', error);
    return NextResponse.json(
      { error: '获取会话列表失败' },
      { status: 500 }
    );
  }
}

// POST /api/conversations - 创建新会话
export async function POST(request: NextRequest) {
  try {
    const conversation = await prisma.conversation.create({
      data: {
        title: '新的对话',
      }
    });

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error('创建会话失败:', error);
    return NextResponse.json(
      { error: '创建会话失败' },
      { status: 500 }
    );
  }
}
