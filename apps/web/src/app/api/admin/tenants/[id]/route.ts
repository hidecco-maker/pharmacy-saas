import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { systemDb } from '@/lib/system-db';

// テナント更新
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();
  const { id } = await params;
  const body = await request.json();
  const { slug, displayName, industry, lineChannelSecret, lineChannelAccessToken, isActive } = body;

  // slug（店舗ID）のバリデーション
  if (slug !== undefined) {
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: '店舗IDは半角英数字とハイフン（-）のみ使用できます。' },
        { status: 400 }
      );
    }
    // 重複チェック（自身を除く）
    const existing = await systemDb.tenant.findFirst({
      where: { slug, NOT: { id } },
    });
    if (existing) {
      return NextResponse.json(
        { error: `店舗ID「${slug}」は既に別の店舗で使用されています。` },
        { status: 409 }
      );
    }
  }

  try {
    const tenant = await systemDb.tenant.update({
      where: { id },
      data: {
        slug: slug ?? undefined,
        displayName: displayName ?? undefined,
        industry: industry ?? undefined,
        lineChannelSecret: lineChannelSecret !== undefined ? lineChannelSecret : undefined,
        lineChannelAccessToken: lineChannelAccessToken !== undefined ? lineChannelAccessToken : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });
    return NextResponse.json(tenant);
  } catch (error) {
    console.error('Update tenant error:', error);
    return NextResponse.json({ error: 'テナントの更新に失敗しました' }, { status: 500 });
  }
}

// テナント削除（DBファイルはコメントアウト済み、手動削除を推奨）
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();
  const { id } = await params;
  try {
    const tenant = await systemDb.tenant.findUnique({ where: { id } });
    if (!tenant) return NextResponse.json({ error: 'テナントが見つかりません' }, { status: 404 });

    await systemDb.tenant.delete({ where: { id } });
    return NextResponse.json({ success: true, message: `テナント「${tenant.displayName}」を削除しました。DBファイル (/data/tenants/${tenant.id}/) は手動で削除してください。` });
  } catch (error) {
    console.error('Delete tenant error:', error);
    return NextResponse.json({ error: 'テナントの削除に失敗しました' }, { status: 500 });
  }
}
