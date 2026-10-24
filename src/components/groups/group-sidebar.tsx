import Link from "next/link";
import { SidebarIcon } from "./sidebar-icon";
import { SPORTS_SIDEBAR, subgroupHref, type Group, type RelatedTag, type SidebarNode } from "@/lib/polymarket/groups";
import { cn } from "@/lib/utils";

const itemClass = "gap-3 rounded-field py-2.5 text-body font-medium";
const activeClass = "bg-base-300 text-base-content";
const idleClass = "text-base-content/80 hover:bg-base-200";

/**
 * Left sidebar of a group's subgroups (daisyUI menu), as on polymarket.com.
 * `activeSub` is the current subgroup slug; undefined means the group's "All" view.
 */
export function GroupSidebar({
  group,
  activeSub,
  related = [],
}: {
  group: Group;
  activeSub: string | undefined;
  related?: readonly RelatedTag[];
}) {
  return (
    <nav aria-label={`${group.label} subgroups`}>
      {group.sidebar === "sports" ? (
        <SportsMenu groupSlug={group.slug} activeSub={activeSub} />
      ) : (
        <ul className="menu w-full p-0">
          <MenuLink href={subgroupHref(group.slug)} active={activeSub === undefined} label="All" />
          {related.map((tag) => (
            <MenuLink key={tag.id} href={subgroupHref(group.slug, tag.slug)} active={activeSub === tag.slug} label={tag.label} />
          ))}
        </ul>
      )}
    </nav>
  );
}

function SportsMenu({ groupSlug, activeSub }: { groupSlug: string; activeSub: string | undefined }) {
  return (
    <>
      <ul className="menu w-full p-0">
        {SPORTS_SIDEBAR.top.map((node) => (
          <NodeLink key={node.slug} groupSlug={groupSlug} node={node} activeSub={activeSub} />
        ))}
      </ul>
      <div className="divider my-2" />
      <ul className="menu w-full p-0">
        <li className="menu-title px-3 text-caption font-medium uppercase tracking-widest text-base-content/60">All sports</li>
        {SPORTS_SIDEBAR.sports.map((node) =>
          node.children ? (
            <li key={node.slug}>
              <details open={node.children.some((c) => c.slug === activeSub)}>
                <summary className={cn(itemClass, idleClass)}>
                  <SidebarIcon node={node} />
                  {node.label}
                </summary>
                <ul>
                  {node.children.map((child) => (
                    <NodeLink key={child.slug} groupSlug={groupSlug} node={child} activeSub={activeSub} />
                  ))}
                </ul>
              </details>
            </li>
          ) : (
            <NodeLink key={node.slug} groupSlug={groupSlug} node={node} activeSub={activeSub} />
          ),
        )}
      </ul>
    </>
  );
}

function NodeLink({ groupSlug, node, activeSub }: { groupSlug: string; node: SidebarNode; activeSub: string | undefined }) {
  return (
    <MenuLink href={subgroupHref(groupSlug, node.slug)} active={activeSub === node.slug} label={node.label}>
      <SidebarIcon node={node} />
    </MenuLink>
  );
}

function MenuLink({
  href,
  active,
  label,
  children,
}: {
  href: string;
  active: boolean;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <li>
      <Link href={href} aria-current={active ? "page" : undefined} className={cn(itemClass, active ? activeClass : idleClass)}>
        {children}
        <span className="truncate">{label}</span>
      </Link>
    </li>
  );
}
