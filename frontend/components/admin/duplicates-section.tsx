import { Avatar, Button, Card, Chip, EmptyState } from "@/components/ui";
import { StatusPill } from "@/components/status-pill";
import type { DuplicateInstitutionGroup } from "@/lib/types";

import styles from "./admin.module.css";

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export function DuplicatesSection({
  groups,
  isLoading,
  onMerge,
}: {
  groups: DuplicateInstitutionGroup[];
  isLoading: boolean;
  onMerge(group: DuplicateInstitutionGroup): void;
}) {
  if (isLoading) {
    return <EmptyState variant="empty" title="Loading duplicate detection..." />;
  }

  if (groups.length === 0) {
    return <EmptyState variant="empty" title="No duplicate institutions detected." />;
  }

  return (
    <div className={styles.duplicates}>
      {groups.map((group, groupIndex) => (
        <Card key={groupIndex} as="article" className={styles.duplicateGroup}>
          <div className={styles.duplicateHead}>
            <h3 className={styles.duplicateName}>{group.institutions[0]?.name}</h3>
            <Chip>{group.institutions.length} matches</Chip>
          </div>
          <ul className={styles.duplicateList}>
            {group.institutions.map((inst) => (
              <li key={inst.id} className={styles.duplicateItem}>
                <Avatar initials={initialsFor(inst.name)} />
                <div className={styles.duplicateText}>
                  <span className={styles.rowTitle}>{inst.name}</span>
                  <span className={styles.duplicateMeta}>
                    {inst.type.replaceAll("_", " ")} · {inst.location}
                  </span>
                </div>
                <StatusPill status={inst.verification_status} />
              </li>
            ))}
          </ul>
          <div className={styles.duplicateFoot}>
            {group.institutions.length === 2 ? (
              <Button variant="ink" size="sm" onClick={() => onMerge(group)}>
                Merge
              </Button>
            ) : (
              <span className={styles.linkish}>Review ({group.institutions.length} matches)</span>
            )}
          </div>
        </Card>
      ))}
      <p className={styles.duplicatesFooter}>Showing {groups.length} duplicate group(s)</p>
    </div>
  );
}
