from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.api.routes.dependencies import require_authenticated_supabase_user
from app.schemas.domain import AuthenticatedSupabaseUser, AuthenticatedUser, OnboardingCreate, OnboardingResponse
from app.services.supabase_profiles import get_supabase_profile_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=AuthenticatedUser)
def get_current_profile(
    auth_user: AuthenticatedSupabaseUser = Depends(require_authenticated_supabase_user),
) -> AuthenticatedUser:
    profile = get_supabase_profile_service().get_profile(auth_user)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App profile not found for this user.")
    return profile


@router.post("/onboarding", response_model=OnboardingResponse, status_code=status.HTTP_201_CREATED)
def onboard_authenticated_user(
    payload: OnboardingCreate,
    response: Response,
    auth_user: AuthenticatedSupabaseUser = Depends(require_authenticated_supabase_user),
) -> OnboardingResponse:
    onboarding = get_supabase_profile_service().onboard_user(auth_user, payload)
    if not onboarding.created:
        response.status_code = status.HTTP_200_OK
    return onboarding
