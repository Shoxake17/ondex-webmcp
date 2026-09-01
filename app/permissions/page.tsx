import { loadState } from "@/lib/server-state";
import PermissionToggles from "./toggles";

/**
 * Ruxsatlar — bu loyihaning asosiy g'oyasi.
 *
 * ┌─ NEGA BU SAHIFA MUHIM ─────────────────────────────────────────────┐
 * WebMCP sahifaning amallarini agentga ochadi. Odatiy yondashuvda
 * sahifa "mana hammasi" deydi va foydalanuvchi hech narsani
 * boshqarmaydi — agent nima qila olishini u bilmaydi ham.
 *
 * Bu yerda esa har bir imkoniyat — o'chirgich, tekshiruv SERVERDA, va
 * bajarilgan har amal jurnalda. Ya'ni odam agentga nima ishonganini
 * KO'RADI va istalgan payt qaytarib oladi.
 * └────────────────────────────────────────────────────────────────────┘
 */
export default async function PermissionsPage() {
  const { permissions: perms, activity: log } = await loadState();

  return (
    <>
      <h1 className="text-xl font-extrabold tracking-tight">
        What Shaddiy may do
      </h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-neutral-600">
        These switches control what your browser agent is allowed to do on this
        site. They are enforced on the server, so turning one off blocks the
        action even if the agent tries anyway.
      </p>

      <PermissionToggles initial={perms} />

      <h2 className="mb-3 mt-9 text-[15px] font-bold">Recent agent activity</h2>
      {log.length === 0 ? (
        <p className="text-[13.5px] text-neutral-500">
          Nothing yet. Ask your agent to find a dish.
        </p>
      ) : (
        <ol className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
          {log.slice(0, 15).map((a, i) => (
            <li key={i} className="flex items-baseline gap-3 px-4 py-2.5">
              <code className="shrink-0 text-[12px] font-semibold text-brand">
                {a.tool}
              </code>
              <span className="min-w-0 flex-1 truncate text-[13px] text-neutral-600">
                {a.detail}
              </span>
              <time className="shrink-0 text-[11.5px] text-neutral-400">
                {new Date(a.at).toLocaleTimeString()}
              </time>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
