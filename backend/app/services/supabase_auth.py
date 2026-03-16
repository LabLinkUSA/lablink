from __future__ import annotations

from functools import lru_cache
from typing import Any

import httpx
from fastapi import HTTPException, status

from app.core.config import get_settings
from app.schemas.domain import AuthenticatedSupabaseUser, AuthenticatedUser
from app.services.supabase_profiles import get_supabase_profile_service


class SupabaseAuthService:
    def __init__(self, supabase_url: str, service_role_key: str, jwt_audience: str):
        self.supabase_url = supabase_url.rstrip("/")
        self.service_role_key = service_role_key
        self.jwt_audience = jwt_audience

    def authenticate(self, token: str) -> AuthenticatedUser:
        auth_user = self.authenticate_supabase_user(token)
        profile = get_supabase_profile_service().get_profile(auth_user)
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Authenticated user is missing an app profile.",
            )

        return profile

    def authenticate_supabase_user(self, token: str) -> AuthenticatedSupabaseUser:
        payload = self._decode_token(token)
        auth_user_id = payload.get("id") or payload.get("sub")
        email = payload.get("email")
        if not auth_user_id or not email:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token is missing required claims.")

        metadata = payload.get("user_metadata") or payload.get("app_metadata")
        return AuthenticatedSupabaseUser(
            auth_user_id=auth_user_id,
            email=email,
            metadata=metadata if isinstance(metadata, dict) else {},
        )

    def _decode_token(self, token: str) -> dict[str, Any]:
        headers = {
            "apikey": self.service_role_key,
            "Authorization": f"Bearer {token}",
        }
        with httpx.Client(timeout=10.0) as client:
            response = client.get(f"{self.supabase_url}/auth/v1/user", headers=headers)

        if response.status_code >= 400:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token.")

        payload = response.json()
        if not isinstance(payload, dict):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token payload.")
        return payload


@lru_cache
def get_supabase_auth_service() -> SupabaseAuthService | None:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return None
    return SupabaseAuthService(
        supabase_url=settings.supabase_url,
        service_role_key=settings.supabase_service_role_key,
        jwt_audience=settings.supabase_jwt_audience,
    )
