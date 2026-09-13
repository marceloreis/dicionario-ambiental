import Link from "next/link";
import { requireChatGPTUser, chatGPTSignOutPath } from "@/app/chatgpt-auth";
import EditorApp from "./editor-app";

export const dynamic = "force-dynamic";

export default async function EditorPage() {
  const user = await requireChatGPTUser("/editor");
  return (
    <div className="editor-shell">
      <header className="editor-header">
        <Link href="/" className="editor-brand">
          <span className="eyebrow">Ambiente protegido</span>
          <h1>Mesa editorial</h1>
        </Link>
        <div className="editor-user">
          <span>{user.displayName}</span>
          <a href={chatGPTSignOutPath("/")}>Sair</a>
        </div>
      </header>
      <EditorApp />
    </div>
  );
}
