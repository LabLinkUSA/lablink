update public.equipment_requests
set status = 'pickup_transfer_coordination'
where status = 'awaiting_donor_confirmation';

alter type public.request_status rename to request_status_old;

create type public.request_status as enum (
  'submitted',
  'admin_review',
  'approved_matched',
  'pickup_transfer_coordination',
  'completed',
  'rejected_cancelled'
);

alter table public.equipment_requests
alter column status
type public.request_status
using status::text::public.request_status;

drop type public.request_status_old;
