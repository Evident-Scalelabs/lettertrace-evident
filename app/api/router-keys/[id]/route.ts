import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { humanError } from "@/lib/llm";
import { logDashboard } from "@/lib/activity";

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { error } = await supabase
      .from("router_keys")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: humanError(error) }, { status: 500 });
    }

    await logDashboard(user, request, {
      category: "router_key",
      action: "router_key.removed",
      summary: "Removed a router key",
      targetType: "router_key",
      targetId: params.id,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: humanError(e) }, { status: 500 });
  }
}
