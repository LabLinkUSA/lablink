"use client";

import { useState } from "react";

import { StatusPill } from "@/components/status-pill";
import {
  Avatar, Button, ButtonLink, Card, DataTable, EmptyState, Eyebrow, Field, FieldGrid,
  Highlight, Input, Modal, Notice, PageHeader, Reveal, Select, StatRow, StatTile, Textarea,
} from "@/components/ui";

const LONG = "Ultra-low-temperature freezer with redundant compressor and an extraordinarily long model name that should wrap";

export function KitDemo() {
  const [open, setOpen] = useState(false);
  const [closeCount, setCloseCount] = useState(0);
  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "120px clamp(20px,5vw,72px)", display: "grid", gap: 40 }}>
      <PageHeader variant="public" eyebrow="Kit" title={<>Design <Highlight>kit</Highlight></>} lead={LONG} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <Button>Primary action</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ink" arrow>Ink</Button>
        <Button variant="danger">Danger</Button>
        <ButtonLink href="/" variant="ghost">Ghost link</ButtonLink>
        <Button onClick={() => setOpen(true)}>Open modal</Button>
      </div>
      <Eyebrow variant="badge">Yale-founded · Nonprofit</Eyebrow>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {["live", "admin_review", "matched_reserved", "rejected_cancelled", "removed_by_admin"].map((s) => <StatusPill key={s} status={s} />)}
      </div>
      <StatRow>
        <StatTile value="12" label="Pending approvals" sublabel="Across institutions" />
        <StatTile tone="ink" value="$40K" label="Total donations" />
        <StatTile tone="mint" value="3" label="Deliveries" />
      </StatRow>
      <Card><Avatar initials="DL" /> <strong>{LONG}</strong></Card>
      <FieldGrid>
        <Field label="Title" htmlFor="kit-title"><Input id="kit-title" /></Field>
        <Field label="Required" htmlFor="kit-error-input" error="This field is required."><Input id="kit-error-input" /></Field>
        <Field label="Category" htmlFor="kit-select"><Select id="kit-select"><option>Microscopy</option></Select></Field>
        <Field label="Notes" htmlFor="kit-notes" span="full"><Textarea id="kit-notes" /></Field>
      </FieldGrid>
      <Notice tone="warning">Editing material fields sends this listing back to review.</Notice>
      <DataTable head={["Equipment", "Status", "Action"]} isEmpty empty={<EmptyState variant="empty" title="Nothing here yet" />} />
      <div style={{ height: "120vh" }} />
      <Reveal data-testid="kit-reveal-below-fold"><Card tone="mint">Revealed content</Card></Reveal>
      <p data-testid="kit-modal-close-count">{closeCount}</p>
      <Modal open={open} onClose={() => {
          setOpen(false);
          setCloseCount((n) => n + 1);
        }} title="Kit modal" eyebrow="Review">
        <p>{LONG}</p>
      </Modal>
    </div>
  );
}
