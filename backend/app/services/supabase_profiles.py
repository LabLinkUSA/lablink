from __future__ import annotations

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
    OnboardingCreate,
    OnboardingResponse,
    User,
    VerificationStatus,
)


class SupabaseProfileService:
    def __init__(self, supabase_url: str, service_role_key: str):
        self.supabase_url = supabase_url.rstrip("/")
        self.service_role_key = service_role_key

    def get_profile(self, auth_user: AuthenticatedSupabaseUser) -> AuthenticatedUser | None:
        row = self._select_app_user(auth_user.auth_user_id)
        if not row:
            return None
        return self._to_authenticated_user(row)

    def onboard_user(self, auth_user: AuthenticatedSupabaseUser, payload: OnboardingCreate) -> OnboardingResponse:
        existing = self.get_profile(auth_user)
        if existing:
            return OnboardingResponse(user=existing.user, institution=existing.institution, created=False)

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

    def _insert_row(self, table: str, payload: dict[str, Any]) -> None:
        self._request("POST", table, json=payload, headers={"Prefer": "return=minimal"})

    def _delete_institution(self, institution_id: str) -> None:
        self._request("DELETE", "institutions", params={"id": f"eq.{institution_id}"})

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
