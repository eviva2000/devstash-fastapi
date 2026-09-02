"""HTTP routes for account registration and browser sessions."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from devstash.core.config import get_settings
from devstash.core.database import get_session
from devstash.schemas.auth import Credentials, SessionResponse, UserResponse
from devstash.services.auth import (
    AuthenticatedSession,
    AuthService,
    DuplicateAccount,
    InvalidCredentials,
    InvalidCsrf,
    InvalidSession,
    RateLimited,
)
from devstash.services.auth_security import PasswordManager, get_password_manager

SESSION_COOKIE = "devstash_session"
COOKIE_MAX_AGE = 30 * 24 * 60 * 60
router = APIRouter(tags=["authentication"])
SessionDependency = Annotated[AsyncSession, Depends(get_session)]
PasswordDependency = Annotated[PasswordManager, Depends(get_password_manager)]


def _require_trusted_origin(request: Request) -> None:
    origin = request.headers.get("origin")
    if origin not in get_settings().trusted_origins:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Request rejected"
        )


def _source_ip(request: Request) -> str:
    return request.client.host if request.client is not None else "unknown"


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        max_age=COOKIE_MAX_AGE,
        path="/",
        secure=get_settings().environment != "development",
        httponly=True,
        samesite="lax",
    )


def _clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=SESSION_COOKIE,
        path="/",
        secure=get_settings().environment != "development",
        httponly=True,
        samesite="lax",
    )


def _expired_cookie_header() -> str:
    response = Response()
    _clear_session_cookie(response)
    return response.headers["set-cookie"]


async def get_current_auth(
    request: Request,
    session: SessionDependency,
    passwords: PasswordDependency,
) -> AuthenticatedSession:
    """Resolve a trusted account from the opaque session cookie."""

    try:
        return await AuthService(session, passwords).authenticate(
            request.cookies.get(SESSION_COOKIE)
        )
    except InvalidSession as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"Set-Cookie": _expired_cookie_header()},
        ) from error


CurrentAuthDependency = Annotated[AuthenticatedSession, Depends(get_current_auth)]


async def require_current_csrf(
    request: Request,
    auth: CurrentAuthDependency,
    session: SessionDependency,
    passwords: PasswordDependency,
) -> AuthenticatedSession:
    """Require same-origin proof for an authenticated unsafe request."""

    _require_trusted_origin(request)
    try:
        AuthService(session, passwords).require_csrf(
            auth, request.headers.get("x-csrf-token")
        )
    except InvalidCsrf as error:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="CSRF validation failed"
        ) from error
    return auth


CsrfAuthDependency = Annotated[AuthenticatedSession, Depends(require_current_csrf)]


@router.post(
    "/api/users",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_user(
    payload: Credentials,
    request: Request,
    response: Response,
    session: SessionDependency,
    passwords: PasswordDependency,
) -> SessionResponse:
    """Create an account and its first browser session."""

    _require_trusted_origin(request)
    try:
        created = await AuthService(session, passwords).register(
            email=str(payload.email),
            password=payload.password.get_secret_value(),
            source_ip=_source_ip(request),
        )
    except DuplicateAccount as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Account could not be created",
        ) from error
    except RateLimited as error:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests",
            headers={"Retry-After": str(error.retry_after)},
        ) from error

    _set_session_cookie(response, created.session_token)
    response.headers["Location"] = "/api/session"
    response.headers["Cache-Control"] = "no-store"
    return SessionResponse(
        user=UserResponse.model_validate(created.user),
        csrf_token=created.csrf_token,
    )


@router.post("/api/sessions", response_model=SessionResponse)
async def create_session(
    payload: Credentials,
    request: Request,
    response: Response,
    session: SessionDependency,
    passwords: PasswordDependency,
) -> SessionResponse:
    """Authenticate credentials and rotate into a new browser session."""

    _require_trusted_origin(request)
    try:
        created = await AuthService(session, passwords).login(
            email=str(payload.email),
            password=payload.password.get_secret_value(),
            source_ip=_source_ip(request),
        )
    except InvalidCredentials as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        ) from error
    except RateLimited as error:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests",
            headers={"Retry-After": str(error.retry_after)},
        ) from error

    _set_session_cookie(response, created.session_token)
    response.headers["Cache-Control"] = "no-store"
    return SessionResponse(
        user=UserResponse.model_validate(created.user),
        csrf_token=created.csrf_token,
    )


@router.get("/api/session", response_model=SessionResponse)
async def read_session(
    response: Response,
    auth: CurrentAuthDependency,
    session: SessionDependency,
    passwords: PasswordDependency,
) -> SessionResponse:
    """Restore the current account and its per-session CSRF proof."""

    csrf_token = AuthService(session, passwords).current_csrf(auth)
    response.headers["Cache-Control"] = "no-store"
    return SessionResponse(
        user=UserResponse.model_validate(auth.user), csrf_token=csrf_token
    )


@router.delete("/api/session", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    request: Request,
    session: SessionDependency,
    passwords: PasswordDependency,
) -> Response:
    """Idempotently revoke and clear the current browser session."""

    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    response.headers["Cache-Control"] = "no-store"
    _clear_session_cookie(response)
    token = request.cookies.get(SESSION_COOKIE)
    if token is None:
        return response
    service = AuthService(session, passwords)
    try:
        auth = await service.authenticate(token)
    except InvalidSession:
        return response
    _require_trusted_origin(request)
    try:
        service.require_csrf(auth, request.headers.get("x-csrf-token"))
    except InvalidCsrf as error:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="CSRF validation failed"
        ) from error
    await service.logout(auth)
    return response
