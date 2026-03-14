export type Role = "donor_lab" | "recipient_institution" | "admin";
export type VerificationStatus = "pending_verification" | "verified" | "rejected" | "suspended";
export type AccountStatus = "pending_verification" | "verified" | "restricted" | "suspended";
export type ListingStatus =
  | "draft"
  | "pending_admin_approval"
  | "live"
  | "under_review"
  | "matched_reserved"
  | "fulfilled"
  | "removed_expired";
export type RequestStatus =
  | "submitted"
  | "admin_review"
  | "awaiting_donor_confirmation"
  | "approved_matched"
  | "pickup_transfer_coordination"
  | "completed"
  | "rejected_cancelled";
export type ThreadStatus = "active" | "locked" | "closed";
export type BoardPostStatus = "open" | "match_in_progress" | "closed";

export interface Institution {
  id: string;
  name: string;
  type: Role;
  verification_status: VerificationStatus;
  location: string;
  description: string;
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  account_status: AccountStatus;
  institution_id: string;
}

export interface Listing {
  id: string;
  title: string;
  category: string;
  condition: string;
  quantity: number;
  location: string;
  availability_window: string;
  description: string;
  dimensions_weight: string;
  handling_requirements: string;
  working_status: string;
  documentation_included: string;
  special_handling_flags: string;
  delivery_mode: string;
  status: ListingStatus;
  photo_urls: string[];
  donor_institution_id: string;
  created_by_user_id: string;
  created_at: string;
  request_count: number;
}

export interface EquipmentRequest {
  id: string;
  listing_id: string;
  recipient_institution_id: string;
  submitted_by_user_id: string;
  intended_use: string;
  program_or_department: string;
  audience: string;
  needed_by: string;
  urgency_notes: string;
  delivery_constraints: string;
  storage_readiness: string;
  funding_or_logistics_notes: string;
  status: RequestStatus;
  submitted_at: string;
}

export interface MessageThread {
  id: string;
  listing_id: string;
  request_id?: string | null;
  status: ThreadStatus;
  opened_by_user_id: string;
}

export interface Message {
  id: string;
  thread_id: string;
  sender_user_id: string;
  sender_role: Role;
  body: string;
  created_at: string;
}

export interface RequestBoardPost {
  id: string;
  title: string;
  category: string;
  institution_id: string;
  created_by_user_id: string;
  description: string;
  needed_by: string;
  status: BoardPostStatus;
  created_at: string;
}

export interface AdminAction {
  id: string;
  action_type: string;
  actor_user_id: string;
  subject_id: string;
  notes: string;
  created_at: string;
}

export interface LabLinkSeed {
  institutions: Institution[];
  users: User[];
  listings: Listing[];
  equipment_requests: EquipmentRequest[];
  message_threads: MessageThread[];
  messages: Message[];
  request_board_posts: RequestBoardPost[];
  admin_actions: AdminAction[];
}

export interface ListingDetailResponse {
  listing: Listing;
  donor_institution: Institution;
  related_requests: EquipmentRequest[];
}

export interface DonorDashboardResponse {
  institution: Institution;
  listings: Listing[];
  active_requests: EquipmentRequest[];
  impact_summary: Record<string, number>;
}

export interface RecipientDashboardResponse {
  institution: Institution;
  requests: EquipmentRequest[];
  saved_listings: Listing[];
  threads: MessageThread[];
  request_board_posts: RequestBoardPost[];
}

export interface AdminDashboardResponse {
  pending_institutions: Institution[];
  listings_for_review: Listing[];
  requests_requiring_attention: EquipmentRequest[];
  active_threads: MessageThread[];
  recent_actions: AdminAction[];
}

export interface OnboardingCreate {
  full_name: string;
  role: Role;
  institution_name: string;
  institution_location: string;
  institution_description: string;
}

export interface OnboardingResponse {
  user: User;
  institution: Institution;
  created: boolean;
}

export interface AuthenticatedUser {
  user: User;
  institution: Institution;
}
