from typing import Annotated

from fastapi import Header, HTTPException, status

from app.schemas.domain import AuthenticatedUser, Role
from app.services.demo_data import get_demo_repository


def require_actor(
    x_lablink_role: Annotated[str, Header(alias="X-LabLink-Role")],
    x_user_id: Annotated[str, Header(alias="X-User-Id")],
) -> AuthenticatedUser:
    try:
        role = Role(x_lablink_role)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid role header.") from exc
    return get_demo_repository().get_authenticated_user(x_user_id, role)

