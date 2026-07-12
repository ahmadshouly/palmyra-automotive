import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatMoney, getSettings } from "@/lib/settings";
import { getLocale, getT } from "@/lib/i18n";
import { timeAgo } from "@/lib/utils";
import { sendMessageAction } from "@/app/actions/engagement";

export async function generateMetadata() {
  return { title: getT()("meta.conversation") };
}
export const dynamic = "force-dynamic";

export default async function ConversationPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const settings = await getSettings();
  const locale = getLocale();
  const t = getT();

  const conversation = await db.conversation.findUnique({
    where: { id: params.id },
    include: {
      listing: { include: { seller: true } },
      buyer: true,
      messages: { include: { sender: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!conversation) notFound();

  const isParticipant = conversation.buyerId === user.id || conversation.listing.sellerId === user.id;
  if (!isParticipant) notFound();

  const other = conversation.buyerId === user.id ? conversation.listing.seller : conversation.buyer;

  return (
    <div className="container-page max-w-3xl py-10">
      <Link href="/dashboard" className="text-sm font-semibold text-brand-600 hover:underline">
        {t("msg.back")}
      </Link>

      <div className="card mt-4 flex items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="font-bold text-emerald-950">{other.name}</p>
          <Link href={`/listings/${conversation.listingId}`} className="truncate text-sm text-brand-600 hover:underline">
            {conversation.listing.title}
          </Link>
        </div>
        <p className="shrink-0 text-lg font-black">
          {formatMoney(conversation.listing.price, settings.currency)}
        </p>
      </div>

      <div className="card mt-4 flex max-h-[55vh] flex-col gap-3 overflow-y-auto p-5">
        {conversation.messages.map((m) => {
          const mine = m.senderId === user.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                mine ? "rounded-br-sm bg-brand-600 text-white" : "rounded-bl-sm bg-emerald-100 text-emerald-900"
              }`}>
                <p className="whitespace-pre-line">{m.body}</p>
                <p className={`mt-1 text-[10px] ${mine ? "text-brand-200" : "text-emerald-600"}`}>
                  {m.sender.name.split(" ")[0]} · {timeAgo(m.createdAt, locale)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <form action={sendMessageAction.bind(null, conversation.id)} className="mt-4 flex gap-2">
        <input name="body" required maxLength={2000} className="input" placeholder={t("msg.writePh")} autoComplete="off" />
        <button className="btn-primary shrink-0">{t("msg.send")}</button>
      </form>
    </div>
  );
}
