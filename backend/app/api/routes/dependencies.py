from typing import Annotated

from fastapi import Header, HTTPException, status

from app.schemas.domain import AuthenticatedUser, Role
from app.services.demo_data import get_demo_repository
from app.services.supabase_auth import get_supabase_auth_service


def require_actor(
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    x_lablink_role: Annotated[str | None, Header(alias="X-LabLink-Role")] = None,
    x_user_id: Annotated[str | None, Header(alias="X-User-Id")] = None,
) -> AuthenticatedUser:
    if authorization:
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

    if not x_lablink_role or not x_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authentication headers.")

    try:
        role = Role(x_lablink_role)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid role header.") from exc
    return get_demo_repository().get_authenticated_user(x_user_id, role)
