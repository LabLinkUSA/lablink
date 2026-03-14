from __future__ import annotations

from functools import lru_cache
from typing import Any

import httpx
import jwt
from fastapi import HTTPException, status
from jwt import PyJWKClient

from app.core.config import get_settings
from app.schemas.domain import AuthenticatedUser, Institution, User


class SupabaseAuthService:
    def __init__(self, supabase_url: str, jwt_audience: str):
        self.supabase_url = supabase_url.rstrip("/")
        self.jwt_audience = jwt_audience
        self.jwks_client = PyJWKClient(f"{self.supabase_url}/auth/v1/.well-known/jwks.json")

    def authenticate(self, token: str) -> AuthenticatedUser:
        try:
            signing_key = self.jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience=self.jwt_audience,
                issuer=f"{self.supabase_url}/auth/v1",
            )
        except jwt.PyJWTError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token.") from exc

        auth_user_id = payload.get("sub")
        if not auth_user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token subject.")

        profile = self._fetch_app_user(auth_user_id)
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Authenticated user is missing an app profile.",
            )

        return AuthenticatedUser(
            user=User.model_validate(profile),
            institution=Institution.model_validate(profile["institution"]),
        )

    def _fetch_app_user(self, auth_user_id: str) -> dict[str, Any] | None:
        settings = get_settings()
        if not settings.supabase_service_role_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Backend Supabase service role key is not configured.",
            )

        headers = {
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
        }
        params = {
            "select": "id,full_name,email,role,account_status,institution_id,institution:institutions(id,name,type:role_type,verification_status,location,description)",
            "supabase_auth_user_id": f"eq.{auth_user_id}",
            "limit": "1",
        }

        with httpx.Client(timeout=10.0) as client:
            response = client.get(f"{self.supabase_url}/rest/v1/app_users", headers=headers, params=params)

        if response.status_code >= 400:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Could not fetch app user from Supabase.",
            )

        rows = response.json()
        return rows[0] if rows else None


@lru_cache
def get_supabase_auth_service() -> SupabaseAuthService | None:
    settings = get_settings()
    if not settings.supabase_url:
        return None
    return SupabaseAuthService(
        supabase_url=settings.supabase_url,
        jwt_audience=settings.supabase_jwt_audience,
    )
