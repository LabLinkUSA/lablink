from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

import httpx
from fastapi import HTTPException, status

from app.core.config import get_settings
from app.schemas.domain import (
    AccountStatus,
    AuthenticatedSupabaseUser,
    AuthenticatedUser,
    Institution,
    Role,
    OnboardingCreate,
    OnboardingResponse,
    User,
    VerificationStatus,
)

ADMIN_INSTITUTION_ID = "inst_lablink_ops"


class SupabaseProfileService:
    def __init__(self, supabase_url: str, service_role_key: str):
        self.supabase_url = supabase_url.rstrip("/")
        self.service_role_key = service_role_key

    def get_profile(self, auth_user: AuthenticatedSupabaseUser) -> AuthenticatedUser | None:
        row = self._select_app_user(auth_user.auth_user_id)
        if not row and self._email_is_allowlisted(auth_user.email):
            self._provision_admin_user(auth_user)
            row = self._select_app_user(auth_user.auth_user_id)
        if not row:
            return None
        return self._to_authenticated_user(row)

    def onboard_user(self, auth_user: AuthenticatedSupabaseUser, payload: OnboardingCreate) -> OnboardingResponse:
        if payload.role == Role.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin accounts cannot be created through public onboarding.",
            )

        existing = self.get_profile(auth_user)
        if existing:
            return OnboardingResponse(user=existing.user, institution=existing.institution, created=False)

        existing_by_email = self._select_app_user_by_email(auth_user.email)
        if existing_by_email:
            self._request(
                "PATCH",
                "app_users",
                params={"id": f"eq.{existing_by_email['id']}"},
                json={
                    "supabase_auth_user_id": auth_user.auth_user_id,
                    "full_name": payload.full_name,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
                headers={"Prefer": "return=minimal"},
            )
            relinked = self.get_profile(auth_user)
            if not relinked:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Existing LabLink profile was found but could not be re-linked to this sign-in.",
                )
            return OnboardingResponse(user=relinked.user, institution=relinked.institution, created=False)

        institution_id = f"inst_{uuid4().hex[:12]}"
        user_id = f"user_{uuid4().hex[:12]}"

        institution_payload = {
            "id": institution_id,
            "name": payload.institution_name,
            "role_type": payload.role,
            "verification_status": VerificationStatus.PENDING_VERIFICATION,
            "location": payload.institution_location,
            "description": payload.institution_description,
        }
        user_payload = {
            "id": user_id,
            "supabase_auth_user_id": auth_user.auth_user_id,
            "institution_id": institution_id,
            "full_name": payload.full_name,
            "email": auth_user.email,
            "role": payload.role,
            "account_status": AccountStatus.PENDING_VERIFICATION,
        }

        self._insert_row("institutions", institution_payload)
        try:
            self._insert_row("app_users", user_payload)
        except HTTPException:
            self._delete_institution(institution_id)
            raise

        created = self.get_profile(auth_user)
        if not created:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Onboarding completed but the app profile could not be loaded.",
            )

        return OnboardingResponse(user=created.user, institution=created.institution, created=True)

    def app_account_exists_for_email(self, email: str) -> bool:
        normalized_email = email.strip().lower()
        if not normalized_email:
            return False

        rows = self._request(
            "GET",
            "app_users",
            params={
                "select": "id",
                "email": f"eq.{normalized_email}",
                "limit": "1",
            },
        )
        return bool(rows)

    def auth_account_exists_for_email(self, email: str) -> bool:
        normalized_email = email.strip().lower()
        if not normalized_email:
            return False

        headers = {
            "apikey": self.service_role_key,
            "Authorization": f"Bearer {self.service_role_key}",
        }

        with httpx.Client(timeout=10.0) as client:
            response = client.get(
                f"{self.supabase_url}/auth/v1/admin/users",
                params={"page": "1", "per_page": "1000"},
                headers=headers,
            )

        if response.status_code >= 400:
            detail = "Supabase auth lookup failed."
            try:
                body = response.json()
                detail = body.get("msg") or body.get("message") or body.get("error") or detail
            except ValueError:
                pass
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)

        body = response.json()
        users = body.get("users") if isinstance(body, dict) else None
        if not isinstance(users, list):
            return False

        for user in users:
            if not isinstance(user, dict):
                continue
            if str(user.get("email", "")).strip().lower() == normalized_email:
                return True

        return False

    def _select_app_user(self, auth_user_id: str) -> dict[str, Any] | None:
        rows = self._request(
            "GET",
            "app_users",
            params={
                "select": "id,full_name,email,role,account_status,institution_id,institution:institutions(id,name,type:role_type,verification_status,location,description)",
                "supabase_auth_user_id": f"eq.{auth_user_id}",
                "limit": "1",
            },
        )
        return rows[0] if rows else None

    def _select_app_user_by_email(self, email: str) -> dict[str, Any] | None:
        normalized_email = email.strip().lower()
        if not normalized_email:
            return None

        rows = self._request(
            "GET",
            "app_users",
            params={
                "select": "id,full_name,email,role,account_status,institution_id,institution:institutions(id,name,type:role_type,verification_status,location,description)",
                "email": f"eq.{normalized_email}",
                "limit": "1",
            },
        )
        return rows[0] if rows else None

    def _insert_row(self, table: str, payload: dict[str, Any]) -> None:
        self._request("POST", table, json=payload, headers={"Prefer": "return=minimal"})

    def _delete_institution(self, institution_id: str) -> None:
        self._request("DELETE", "institutions", params={"id": f"eq.{institution_id}"})

    def _email_is_allowlisted(self, email: str) -> bool:
        rows = self._request(
            "GET",
            "admin_email_allowlist",
            params={
                "select": "email",
                "email": f"eq.{email.strip().lower()}",
                "is_active": "eq.true",
                "limit": "1",
            },
        )
        return bool(rows)

    def _provision_admin_user(self, auth_user: AuthenticatedSupabaseUser) -> None:
        existing = self._select_app_user(auth_user.auth_user_id)
        if existing:
            return

        user_id = f"user_{uuid4().hex[:12]}"
        full_name = self._resolve_full_name(auth_user)
        normalized_email = auth_user.email.strip().lower()

        user_payload = {
            "id": user_id,
            "supabase_auth_user_id": auth_user.auth_user_id,
            "institution_id": ADMIN_INSTITUTION_ID,
            "full_name": full_name,
            "email": normalized_email,
            "role": Role.ADMIN,
            "account_status": AccountStatus.VERIFIED,
        }

        try:
            self._insert_row("app_users", user_payload)
        except HTTPException:
            if self._select_app_user(auth_user.auth_user_id):
                return
            raise

        self._insert_row(
            "admin_audit_logs",
            {
                "id": f"audit_{uuid4().hex[:12]}",
                "actor_user_id": user_id,
                "action_type": "admin_auto_provisioned",
                "subject_table": "app_users",
                "subject_id": user_id,
                "notes": f"Admin profile auto-provisioned from allowlist for {normalized_email}.",
            },
        )

    def _resolve_full_name(self, auth_user: AuthenticatedSupabaseUser) -> str:
        metadata = auth_user.metadata
        for key in ("full_name", "name"):
            value = metadata.get(key)
            if isinstance(value, str):
                cleaned = value.strip()
                if cleaned:
                    return cleaned

        return auth_user.email.split("@", 1)[0]

    def _to_authenticated_user(self, row: dict[str, Any]) -> AuthenticatedUser:
        institution = Institution.model_validate(row["institution"])
        user = User.model_validate(
            {
                "id": row["id"],
                "full_name": row["full_name"],
                "email": row["email"],
                "role": row["role"],
                "account_status": row["account_status"],
                "institution_id": row["institution_id"],
            }
        )
        return AuthenticatedUser(user=user, institution=institution)

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, str] | None = None,
        json: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> Any:
        request_headers = {
            "apikey": self.service_role_key,
            "Authorization": f"Bearer {self.service_role_key}",
            **(headers or {}),
        }
        with httpx.Client(timeout=10.0) as client:
            response = client.request(
                method,
                f"{self.supabase_url}/rest/v1/{path}",
                params=params,
                json=json,
                headers=request_headers,
            )

        if response.status_code >= 400:
            detail = "Supabase profile request failed."
            try:
                body = response.json()
                detail = body.get("message") or body.get("hint") or detail
            except ValueError:
                pass
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)

        if response.content:
            return response.json()
        return None


def get_supabase_profile_service() -> SupabaseProfileService:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase backend configuration is incomplete.",
        )
    return SupabaseProfileService(
        supabase_url=settings.supabase_url,
        service_role_key=settings.supabase_service_role_key,
    )
