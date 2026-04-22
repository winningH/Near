import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/conversations/:id - 获取单个会话详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: params.id },
      include: {
        messages: {
          orderBy: {
            timestamp: 'asc'
          },
          include: {
            attachments: true
          }
        }
      }
    });

    if (!conversation) {
      return NextResponse.json(
        { error: '会话不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('获取会话详情失败:', error);
    return NextResponse.json(
      { error: '获取会话详情失败' },
      { status: 500 }
    );
  }
}

// PATCH /api/conversations/:id - 更新会话（重命名）
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { title } = body;

    const conversation = await prisma.conversation.update({
      where: { id: params.id },
      data: { title }
    });

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('更新会话失败:', error);
    return NextResponse.json(
      { error: '更新会话失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations/:id - 删除会话
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.conversation.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除会话失败:', error);
    return NextResponse.json(
      { error: '删除会话失败' },
      { status: 500 }
    );
  }
}
