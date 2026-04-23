from pydantic import BaseModel


class AdminOverview(BaseModel):
    total_users: int
    active_users: int
    suspended_users: int
    total_posts: int
    public_posts: int
    private_posts: int


class SetUserRoleRequest(BaseModel):
    role: str


class SetUserStatusRequest(BaseModel):
    status: str

