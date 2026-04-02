update public.equipment_requests
set status = 'approved_matched'
where status = 'pickup_transfer_coordination';

alter type public.request_status rename to request_status_old;

create type public.request_status as enum (
  'submitted',
  'admin_review',
  'approved_matched',
  'completed',
  'rejected_cancelled'
);

alter table public.equipment_requests
alter column status drop default;

alter table public.equipment_requests
alter column status
type public.request_status
using status::text::public.request_status;

alter table public.equipment_requests
alter column status set default 'submitted';

drop type public.request_status_old;
