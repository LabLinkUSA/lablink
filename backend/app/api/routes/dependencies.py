from typing import Annotated

from fastapi import Header, HTTPException, status

from app.schemas.domain import AuthenticatedSupabaseUser, AuthenticatedUser
from app.services.supabase_auth import get_supabase_auth_service
from app.services.supabase_profiles import get_supabase_profile_service


def require_actor(
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
) -> AuthenticatedUser:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authentication headers.")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header.")

    auth_service = get_supabase_auth_service()
    if not auth_service:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase auth is not configured on the backend.",
        )
    return auth_service.authenticate(token)


def require_authenticated_supabase_user(
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
) -> AuthenticatedSupabaseUser:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization header.")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header.")

    auth_service = get_supabase_auth_service()
    if not auth_service:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase auth is not configured on the backend.",
        )
    return auth_service.authenticate_supabase_user(token)
