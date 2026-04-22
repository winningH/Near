import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function POST(request: NextRequest) {
  try {
    // 确保上传目录存在
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: '没有上传文件' },
        { status: 400 }
      );
    }

    const uploadedFiles = [];

    for (const file of files) {
      // 检查文件大小 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: `文件 ${file.name} 超过 10MB 限制` },
          { status: 400 }
        );
      }

      const ext = path.extname(file.name);
      const filename = `${uuidv4()}${ext}`;
      const filepath = path.join(UPLOAD_DIR, filename);

      const bytes = await file.arrayBuffer();
      await writeFile(filepath, Buffer.from(bytes));

      uploadedFiles.push({
        id: uuidv4(),
        name: file.name,
        url: `/uploads/${filename}`,
        size: file.size,
        type: file.type,
      });
    }

    return NextResponse.json(uploadedFiles);
  } catch (error) {
    console.error('上传文件失败:', error);
    return NextResponse.json(
      { error: '上传文件失败' },
      { status: 500 }
    );
  }
}
